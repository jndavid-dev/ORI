/* ORI redesign — home page widgets.
   - [data-ori-finder]  static Year / Make / Model finder (sections/ori-finder.liquid)
   - [data-ori-tabs]    vehicle tabs in sections/ori-home-gvm.liquid
   Each widget initialises once, so the file can be included by several
   sections. Re-initialises when a section is reloaded in the theme editor. */
(() => {
  const initFinder = (form) => {
    if (form.dataset.ready) return;
    form.dataset.ready = '1';
    let data = [];
    try {
      data = JSON.parse(form.querySelector('[data-finder-data]').textContent);
    } catch (e) {
      return;
    }
    const yr = form.querySelector('[data-finder-year]');
    const mk = form.querySelector('[data-finder-make]');
    const md = form.querySelector('[data-finder-model]');
    const q = form.querySelector('[data-finder-q]');
    const btn = form.querySelector('[data-finder-btn]');
    const label = btn.dataset.label || btn.textContent;

    const reset = (select) => {
      select.length = 1;
      select.disabled = true;
    };

    yr.addEventListener('change', () => {
      mk.value = '';
      mk.disabled = !yr.value;
      reset(md);
      btn.textContent = label;
    });

    mk.addEventListener('change', () => {
      reset(md);
      const make = data[mk.value];
      if (make) {
        make.models.forEach((m, i) => md.add(new Option(m.name, i)));
        md.disabled = false;
      }
      btn.textContent = label;
    });

    md.addEventListener('change', () => {
      const make = data[mk.value];
      const model = make && make.models[md.value];
      btn.textContent = model ? `Show ${model.name} parts` : label;
    });

    form.addEventListener('submit', (event) => {
      const make = data[mk.value];
      const model = make && make.models[md.value];
      if (model && model.url) {
        event.preventDefault();
        window.location.href = model.url;
        return;
      }
      q.value = [yr.value, make && make.name, model && model.name].filter(Boolean).join(' ');
      if (!q.value) event.preventDefault();
    });
  };

  const initTabs = (root) => {
    if (root.dataset.ready) return;
    root.dataset.ready = '1';
    const tabs = [...root.querySelectorAll('[role="tab"]')];
    if (!tabs.length) return;

    const select = (tab, focus) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute('aria-selected', on);
        t.tabIndex = on ? 0 : -1;
        const panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = !on;
      });
      if (focus) tab.focus();
    };

    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => select(tab));
      tab.addEventListener('keydown', (event) => {
        const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
        if (event.key === 'Home') select(tabs[0], true);
        else if (event.key === 'End') select(tabs[tabs.length - 1], true);
        else if (step) select(tabs[(i + step + tabs.length) % tabs.length], true);
        else return;
        event.preventDefault();
      });
    });
  };

  const init = (scope = document) => {
    scope.querySelectorAll('[data-ori-finder]').forEach(initFinder);
    scope.querySelectorAll('[data-ori-tabs]').forEach(initTabs);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init());
  else init();
  document.addEventListener('shopify:section:load', (event) => init(event.target));
})();
