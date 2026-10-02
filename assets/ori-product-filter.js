/* ==========================================================
   ORI redesign — vehicle filter pills for sections/ori-product-grid.liquid
   Every vehicle's grid is already rendered in the page; the pills only
   show one panel and hide the rest, so there is no fetch and B2B prices
   stay the viewer's own.
   - Arrow keys move between pills.
   - #vehicle-<pill label> in the URL (or a link to it) opens that vehicle.
   - Theme editor: selecting a Vehicle block opens its panel.
   ========================================================== */

(function () {
  if (window.ORIFilterLoaded) return;
  window.ORIFilterLoaded = true;

  function init(root) {
    var pills = Array.prototype.slice.call(root.querySelectorAll('.ori-vpill'));
    var panels = pills.map(function (pill) {
      return document.getElementById(pill.getAttribute('aria-controls'));
    });

    function show(index, focus) {
      pills.forEach(function (pill, i) {
        var on = i === index;
        pill.setAttribute('aria-selected', on ? 'true' : 'false');
        pill.tabIndex = on ? 0 : -1;
        if (panels[i]) panels[i].hidden = !on;
      });
      if (focus) pills[index].focus();
      // Keep the chosen pill in view when the row scrolls sideways (mobile).
      if (pills[index].scrollIntoView) {
        pills[index].scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    }

    pills.forEach(function (pill, i) {
      pill.addEventListener('click', function () {
        show(i);
        if (panels[i] && window.history && history.replaceState) {
          history.replaceState(null, '', '#' + panels[i].id);
        }
      });
      pill.addEventListener('keydown', function (event) {
        var step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
        if (step === undefined) return;
        event.preventDefault();
        show((i + step + pills.length) % pills.length, true);
      });
    });

    root._show = function (panel) {
      var i = panels.indexOf(panel);
      if (i !== -1) show(i);
      return i !== -1;
    };
  }

  // Height of what is fixed to the top once scrolled: the pinned header
  // (if any) plus the GVM subnav, which fixes itself on scroll.
  function topOffset() {
    var offset = 0;
    if (document.body.classList.contains('header-pinned')) {
      offset += parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--f-header-height')) || 0;
    }
    var subnav = document.querySelector('.gvm-subnav__bar');
    if (subnav) offset += subnav.offsetHeight;
    return offset;
  }

  // Open the vehicle a #vehicle-… hash points at, then bring the pills up
  // to just under the fixed bars. Done here rather than by the browser's own
  // anchor jump, which fires while the panel is still hidden.
  function openFromHash(hash, instant) {
    if (!hash || hash.indexOf('#vehicle-') !== 0) return false;
    var panel = document.getElementById(decodeURIComponent(hash.slice(1)));
    var root = panel && panel.closest('[data-ori-vfilter]');
    if (!root || !root._show || !root._show(panel)) return false;
    var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({
      top: Math.max(0, root.getBoundingClientRect().top + window.pageYOffset - topOffset() - 16),
      behavior: instant || still ? 'auto' : 'smooth'
    });
    return true;
  }

  function start() {
    document.querySelectorAll('[data-ori-vfilter]').forEach(init);
    if (location.hash.indexOf('#vehicle-') === 0) {
      // Open it straight away, then correct the position once images have
      // their size (measuring before that lands in the wrong place).
      openFromHash(location.hash, true);
      if (document.readyState !== 'complete') {
        window.addEventListener('load', function () { openFromHash(location.hash, true); }, { once: true });
      }
    }

    document.addEventListener('click', function (event) {
      var link = event.target.closest('a[href*="#vehicle-"]');
      if (!link) return;
      var url = new URL(link.href, location.href);
      if (url.pathname !== location.pathname) return;
      if (openFromHash(url.hash, false)) {
        event.preventDefault();
        if (window.history && history.replaceState) history.replaceState(null, '', url.hash);
      }
    });

    if (window.Shopify && Shopify.designMode) {
      document.addEventListener('shopify:section:load', function (event) {
        event.target.querySelectorAll('[data-ori-vfilter]').forEach(init);
      });
      document.addEventListener('shopify:block:select', function (event) {
        var pill = event.target.closest('.ori-vpill');
        if (pill) pill.click();
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
