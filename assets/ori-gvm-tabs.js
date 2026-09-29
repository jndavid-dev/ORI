/* ==========================================================
   ORI redesign — GVM hub tabs + stage switcher
   Used by sections/ori-gvm-tabs.liquid and sections/ori-gvm-stages.liquid
   (both include this file; it only runs once).

   MAIN TABS
   Sections join a tab through their Custom Class ("ori-panel
   ori-panel--N"); tab N shows that group. The bar is fixed by JS once
   it reaches the top, because .site-wrapper's overflow:clip rules out
   position:sticky. Its top offset is the pinned header plus the GVM
   subnav, read from the same CSS variables header.js / gvm-subnav.js
   publish.
   At ≤767px the bar hides and an accordion header is inserted above
   each group instead.

   SCROLLING (the part that used to feel clunky)
   - Desktop: switching tabs while reading further down the page brings
     the new tab's first content up to just under the bar, with its own
     top padding intact. If the bar hasn't reached the top yet, nothing
     moves — the content is already where the reader is looking.
   - Accordion: opening a header always lines it up under the
     header/subnav, since the header above it may just have collapsed.
   - Stage switcher: the same rules, measured under the fixed bar.

   Also handled: #tab-N / #stage-N links and deep links, arrow keys, and
   the theme editor (selecting a section or stage block opens it).
   ========================================================== */

(function () {
  if (window.ORIGVM && window.ORIGVM.tabsLoaded) return;
  var ORIGVM = (window.ORIGVM = window.ORIGVM || {});
  ORIGVM.tabsLoaded = true;

  var mobile = window.matchMedia('(max-width: 767px)');
  var still = window.matchMedia('(prefers-reduced-motion: reduce)');
  var main = null;
  var stageGroups = [];

  function onMediaChange(mq, fn) {
    if (mq.addEventListener) mq.addEventListener('change', fn);
    else if (mq.addListener) mq.addListener(fn);
  }

  /* Height of everything fixed to the top of the viewport above the bar.
     The subnav is measured directly rather than through the
     --gvm-subnav-height variable: gvm-subnav.js only updates that in its
     own scroll frame, which can run after ours, leaving the bar a frame
     behind (or, after a single jump-scroll, sitting under the subnav).
     A subnav whose top has reached the header line is — or is about to
     be — fixed there, so its height counts. */
  var subnavBar = null;
  function topOffset() {
    var offset = 0;
    if (document.body.classList.contains('header-pinned')) {
      offset += parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--f-header-height')) || 0;
    }
    if (!subnavBar || !subnavBar.isConnected) subnavBar = document.querySelector('.gvm-subnav__bar');
    if (subnavBar && subnavBar.offsetHeight && subnavBar.getBoundingClientRect().top <= offset + 1) {
      offset += subnavBar.offsetHeight;
    }
    return offset;
  }

  function barHeight() {
    return main && !mobile.matches ? main.bar.offsetHeight : 0;
  }

  function scrollByDelta(dy, instant) {
    if (Math.abs(dy) < 2) return;
    window.scrollTo({
      top: Math.max(0, Math.round(window.pageYOffset + dy)),
      behavior: instant || still.matches ? 'auto' : 'smooth'
    });
  }

  function setHash(id) {
    if (window.history && history.replaceState) history.replaceState(null, '', '#' + id);
  }

  /* ---------------- Main tabs ---------------- */
  function initMain() {
    var root = document.querySelector('[data-ori-tabs]');
    if (!root) return;

    var bar = root.querySelector('.ori-tabs__bar');
    var spacer = root.querySelector('.ori-tabs__spacer');
    var tabs = Array.prototype.slice.call(root.querySelectorAll('.ori-tab'));
    var keys = tabs.map(function (t) { return t.getAttribute('data-tab'); });

    // Accordion headers: one above the first section of each group.
    // Rebuilt from scratch so a theme-editor re-render never duplicates them.
    document.querySelectorAll('.ori-acc').forEach(function (el) { el.remove(); });
    var accs = keys.map(function (key, i) {
      var first = document.querySelector('.ori-panel--' + key);
      if (!first || !first.parentNode) return null;
      var acc = document.createElement('button');
      acc.type = 'button';
      acc.className = 'ori-acc';
      acc.setAttribute('data-tab', key);
      acc.setAttribute('aria-expanded', 'false');
      acc.innerHTML = tabs[i].innerHTML;
      acc.addEventListener('click', function () { select(key); });
      first.parentNode.insertBefore(acc, first);
      return acc;
    });

    var current = keys[0];

    function set(key) {
      current = key;
      document.querySelectorAll('.ori-panel').forEach(function (panel) {
        panel.classList.toggle('is-open', !!key && panel.classList.contains('ori-panel--' + key));
      });
      tabs.forEach(function (tab) {
        var on = tab.getAttribute('data-tab') === key;
        tab.setAttribute('aria-selected', on ? 'true' : 'false');
        tab.tabIndex = on ? 0 : -1;
      });
      accs.forEach(function (acc) {
        if (acc) acc.setAttribute('aria-expanded', acc.getAttribute('data-tab') === key ? 'true' : 'false');
      });
      updateFixed();
    }

    function accFor(key) {
      return accs[keys.indexOf(key)];
    }

    // Line the start of the open tab up with the bottom of whatever is fixed
    // at the top. Desktop measures the bar's own slot (the spacer keeps it in
    // the flow while the bar is fixed); mobile measures the accordion header.
    function reveal(force, instant) {
      if (mobile.matches) {
        var acc = accFor(current);
        if (acc) scrollByDelta(acc.getBoundingClientRect().top - topOffset() - 12, instant);
        return;
      }
      var dy = root.getBoundingClientRect().top - topOffset();
      if (force || dy < 0) scrollByDelta(dy, instant);
    }

    function select(key, opts) {
      opts = opts || {};
      if (keys.indexOf(key) === -1) return;

      // Tapping the open accordion header closes it.
      if (mobile.matches && key === current && !opts.keepOpen) {
        set(null);
        var acc = accFor(key);
        if (acc) {
          var dy = acc.getBoundingClientRect().top - topOffset() - 12;
          if (dy < 0) scrollByDelta(dy);
        }
        return;
      }

      set(key);
      if (!opts.silent) setHash('tab-' + key);
      if (opts.scroll !== false) reveal(opts.force, opts.instant);
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { select(keys[i]); });
      tab.addEventListener('keydown', function (event) {
        var step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
        if (event.key === 'Home') step = -i;
        if (event.key === 'End') step = tabs.length - 1 - i;
        if (step === undefined) return;
        event.preventDefault();
        var next = (i + step + tabs.length) % tabs.length;
        select(keys[next], { scroll: false });
        tabs[next].focus();
      });
    });

    /* Fixed bar. The spacer takes the bar's height while it is fixed so the
       page doesn't jump; the bar hides again once the last open section has
       scrolled past, so it doesn't ride over the footer. */
    var fixed = false;

    function unfix() {
      if (!fixed) return;
      fixed = false;
      bar.classList.remove('is-fixed');
      bar.style.top = '';
      bar.style.visibility = '';
      spacer.style.height = '';
    }

    function updateFixed() {
      if (mobile.matches) {
        unfix();
        return;
      }
      var offset = topOffset();
      if (root.getBoundingClientRect().top > offset) {
        unfix();
        return;
      }
      if (!fixed) {
        spacer.style.height = bar.offsetHeight + 'px';
        bar.classList.add('is-fixed');
        fixed = true;
      }
      bar.style.top = offset + 'px';

      var end = 0;
      document.querySelectorAll('.ori-panel.is-open').forEach(function (panel) {
        end = Math.max(end, panel.getBoundingClientRect().bottom);
      });
      bar.style.visibility = end && end < offset + bar.offsetHeight ? 'hidden' : '';
    }

    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        ticking = false;
        updateFixed();
      });
    }

    if (!main) {
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll);
      onMediaChange(mobile, function () {
        if (!main) return;
        if (!mobile.matches && !main.current()) main.set(main.keys[0]);
        main.updateFixed();
      });
    }

    main = {
      root: root,
      bar: bar,
      keys: keys,
      set: set,
      select: select,
      updateFixed: updateFixed,
      current: function () { return current; }
    };

    document.documentElement.classList.add('ori-tabs-ready');
    set(current);
  }

  /* Which main tab (if any) holds this element. */
  function tabKeyFor(el) {
    var panel = el && el.closest ? el.closest('.ori-panel') : null;
    if (!panel) return null;
    var match = /(?:^|\s)ori-panel--([A-Za-z0-9_-]+)/.exec(panel.className);
    return match ? match[1] : null;
  }

  /* ---------------- Stage switcher ---------------- */
  function initStages(root) {
    var tabs = Array.prototype.slice.call(root.querySelectorAll('.ori-stage-tab'));
    var panels = Array.prototype.slice.call(root.querySelectorAll('.ori-stage-panel'));
    var accs = panels.map(function (p) { return p.querySelector('.ori-stage-acc'); });
    var bodies = panels.map(function (p) { return p.querySelector('.ori-stage__body'); });
    var list = root.querySelector('.ori-stages__list');
    var current = 0;

    function set(i) {
      current = i;
      panels.forEach(function (_, j) {
        var on = j === i;
        bodies[j].hidden = !on;
        accs[j].setAttribute('aria-expanded', on ? 'true' : 'false');
        if (tabs[j]) {
          tabs[j].setAttribute('aria-selected', on ? 'true' : 'false');
          tabs[j].tabIndex = on ? 0 : -1;
        }
      });
      if (main) main.updateFixed();
    }

    function reveal(force, instant) {
      if (mobile.matches) {
        if (accs[current]) scrollByDelta(accs[current].getBoundingClientRect().top - topOffset() - 12, instant);
        return;
      }
      var dy = list.getBoundingClientRect().top - (topOffset() + barHeight() + 16);
      if (force || dy < 0) scrollByDelta(dy, instant);
    }

    function select(i, opts) {
      opts = opts || {};
      if (mobile.matches && i === current && !bodies[i].hidden && !opts.keepOpen) {
        set(-1);
        var dy = accs[i].getBoundingClientRect().top - topOffset() - 12;
        if (dy < 0) scrollByDelta(dy);
        return;
      }
      set(i);
      if (!opts.silent) setHash(panels[i].id);
      if (opts.scroll !== false) reveal(opts.force, opts.instant);
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { select(i); });
      tab.addEventListener('keydown', function (event) {
        var step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
        if (step === undefined) return;
        event.preventDefault();
        var next = (i + step + tabs.length) % tabs.length;
        select(next, { scroll: false });
        tabs[next].focus();
      });
    });
    accs.forEach(function (acc, i) {
      acc.addEventListener('click', function () { select(i); });
    });

    onMediaChange(mobile, function () {
      if (!mobile.matches && current < 0) set(0);
    });

    // Lightbox for the stage images.
    var box = root.parentNode.querySelector('[data-ori-lightbox]');
    if (box && box.showModal) {
      var boxImg = box.querySelector('img');
      root.addEventListener('click', function (event) {
        var trigger = event.target.closest('.ori-stage__img');
        if (!trigger) return;
        var img = trigger.querySelector('img');
        boxImg.src = trigger.getAttribute('data-full');
        boxImg.alt = img ? img.alt : '';
        box.showModal();
      });
      box.addEventListener('click', function (event) {
        if (event.target !== boxImg) box.close();
      });
    }

    var group = { root: root, panels: panels, select: select };
    stageGroups.push(group);
    return group;
  }

  /* ---------------- Deep links ---------------- */
  // Opens #tab-N, or #stage-N together with the tab that contains it.
  function go(id, instant) {
    if (!id) return false;

    var tabMatch = /^tab-(.+)$/.exec(id);
    if (tabMatch && main && main.keys.indexOf(tabMatch[1]) !== -1) {
      main.select(tabMatch[1], { force: true, keepOpen: true, instant: instant });
      return true;
    }

    var target = document.getElementById(id);
    if (!target || !target.classList.contains('ori-stage-panel')) return false;
    var key = tabKeyFor(target);
    if (key && main) main.select(key, { scroll: false, keepOpen: true, silent: true });
    for (var g = 0; g < stageGroups.length; g++) {
      var index = stageGroups[g].panels.indexOf(target);
      if (index !== -1) {
        stageGroups[g].select(index, { force: true, keepOpen: true, instant: instant });
        return true;
      }
    }
    return false;
  }

  ORIGVM.go = go;
  ORIGVM.tabKeyFor = tabKeyFor;
  ORIGVM.openTabFor = function (el) {
    var key = tabKeyFor(el);
    if (key && main) main.select(key, { scroll: false, keepOpen: true });
  };
  ORIGVM.topOffset = function () {
    return topOffset() + barHeight();
  };

  function init() {
    initMain();
    stageGroups = [];
    document.querySelectorAll('[data-ori-stages]').forEach(initStages);
  }

  function start() {
    init();

    document.addEventListener('click', function (event) {
      var link = event.target.closest('a[href^="#"]');
      if (!link) return;
      if (go(link.getAttribute('href').slice(1))) event.preventDefault();
    });

    if (location.hash) {
      var id = location.hash.slice(1);
      // After images have their size, or the measured position is wrong.
      if (document.readyState === 'complete') go(id, true);
      else window.addEventListener('load', function () { go(id, true); }, { once: true });
    }

    /* Theme editor: rebuild after a section re-renders, and open whichever
       tab/stage holds the section or block being edited. */
    if (window.Shopify && Shopify.designMode) {
      document.addEventListener('shopify:section:load', init);
      document.addEventListener('shopify:section:select', function (event) {
        ORIGVM.openTabFor(event.target.querySelector('.ori-panel') || event.target);
      });
      document.addEventListener('shopify:block:select', function (event) {
        if (event.target.classList.contains('ori-stage-panel')) go(event.target.id, true);
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
