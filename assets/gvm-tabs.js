/* ==========================================================
   GVM Vehicle Hub — Tabs (desktop) / Accordion (mobile)
   Vanilla JS (no jQuery dependency confirmed on this theme —
   this works whether or not jQuery ever loads).

   HOW GROUPING WORKS:
   Each tab's sections are marked with a shared custom class
   (set in the section's "Custom Class" field in the theme
   editor / template JSON) — e.g. every Tab 1 section gets
   "gvm-tab-panel gvm-tab-panel--1". A nav button targeting
   "tab-1" shows that group and hides the rest.

   Nothing here is vehicle-specific or template-specific: the
   tab list comes from whatever nav buttons exist. Clone the
   template for another vehicle, or add a fifth tab, and this
   keeps working with no edits.

   MOBILE (<=767px):
   A row of tabs is wrong on a phone — it either scrolls
   sideways or squeezes the labels unreadably. Below 767px each
   nav button is physically moved to sit directly above its own
   panel group, turning the page into an accordion: one section
   open at a time, headers stacked full width. Opening a section
   scrolls its header to the top of the viewport (under the
   header/subnav), so a long panel like Instructions doesn't
   leave the reader stranded mid-page. Resizing back to desktop
   moves the buttons home and restores tab behaviour.
   ========================================================== */

document.addEventListener('DOMContentLoaded', function () {
  var navBar = document.querySelector('.gvm-tab-nav');
  var navButtons = Array.prototype.slice.call(
    document.querySelectorAll('.gvm-tab-nav__btn')
  );
  if (!navButtons.length) return;

  var mobileMq = window.matchMedia('(max-width: 767px)');
  var isAccordion = false;
  var currentTab = navButtons[0].getAttribute('data-tab-target');
  var openTab = null; // accordion only: null means everything collapsed

  // "tab-2" -> ".gvm-tab-panel--2". Anything after "tab-" is used as-is,
  // so ids like "tab-pricing" work too, as long as the sections carry
  // the matching gvm-tab-panel--pricing class.
  function panelSelector(targetId) {
    if (!targetId) return null;
    return '.gvm-tab-panel--' + String(targetId).replace(/^tab-/, '');
  }

  function hideAllPanels() {
    document.querySelectorAll('.gvm-tab-panel').forEach(function (el) {
      el.style.display = 'none';
    });
  }

  function showPanels(targetId) {
    var selector = panelSelector(targetId);
    if (!selector) return;
    document.querySelectorAll(selector).forEach(function (el) {
      el.style.display = 'block';
    });
  }

  function markButtons(activeId) {
    navButtons.forEach(function (btn) {
      var isActive = btn.getAttribute('data-tab-target') === activeId;
      btn.classList.toggle('is-active', isActive);
      if (isAccordion) {
        btn.setAttribute('aria-expanded', isActive ? 'true' : 'false');
        btn.removeAttribute('aria-selected');
      } else {
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
        btn.removeAttribute('aria-expanded');
      }
    });
  }

  function showTab(targetId) {
    hideAllPanels();
    showPanels(targetId);
    markButtons(targetId);
    currentTab = targetId;
  }

  /* --- Offset of anything currently fixed to the top of the viewport,
     so an opened accordion header isn't scrolled underneath it. --- */
  function fixedOffset() {
    var styles = getComputedStyle(document.documentElement);
    var offset = 0;

    if (document.body.classList.contains('header-pinned')) {
      offset += parseFloat(styles.getPropertyValue('--f-header-height')) || 0;
    }
    offset += parseFloat(styles.getPropertyValue('--gvm-subnav-height')) || 0;

    return offset + 8;
  }

  function scrollToButton(btn) {
    // Wait for the panel to render before measuring where the header landed.
    window.requestAnimationFrame(function () {
      var top = btn.getBoundingClientRect().top + window.pageYOffset - fixedOffset();
      window.scrollTo({ top: top > 0 ? top : 0, behavior: 'smooth' });
    });
  }

  function openAccordionSection(targetId, doScroll) {
    hideAllPanels();
    showPanels(targetId);
    markButtons(targetId);
    openTab = targetId;
    currentTab = targetId;

    if (doScroll) {
      var btn = navButtons.filter(function (b) {
        return b.getAttribute('data-tab-target') === targetId;
      })[0];
      if (btn) scrollToButton(btn);
    }
  }

  function collapseAccordion() {
    hideAllPanels();
    markButtons(null);
    openTab = null;
  }

  function enterAccordion() {
    if (isAccordion) return;
    isAccordion = true;
    if (navBar) navBar.classList.add('is-accordion');

    navButtons.forEach(function (btn) {
      var selector = panelSelector(btn.getAttribute('data-tab-target'));
      var firstPanel = selector ? document.querySelector(selector) : null;
      // A tab whose sections are missing (or a hub built without that
      // tab) simply keeps its button in the bar rather than erroring.
      if (!firstPanel || !firstPanel.parentNode) return;
      btn.classList.add('gvm-tab-nav__btn--accordion');
      firstPanel.parentNode.insertBefore(btn, firstPanel);
    });

    // Everything starts collapsed on mobile, unlike the desktop tabs
    // where the first tab is always open: on a phone an open first
    // section pushes the other headers off-screen, so the reader can't
    // see what else is there without scrolling past a long panel.
    collapseAccordion();
  }

  function exitAccordion() {
    if (!isAccordion) return;
    isAccordion = false;
    if (navBar) navBar.classList.remove('is-accordion');

    // Back into the bar, in their original order.
    navButtons.forEach(function (btn) {
      btn.classList.remove('gvm-tab-nav__btn--accordion');
      if (navBar) navBar.appendChild(btn);
    });

    showTab(currentTab || navButtons[0].getAttribute('data-tab-target'));
  }

  navButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var target = btn.getAttribute('data-tab-target');

      if (!isAccordion) {
        showTab(target);
        return;
      }

      // Tapping the open header closes it; no scroll, since the reader
      // is already looking at it.
      if (openTab === target) {
        collapseAccordion();
      } else {
        openAccordionSection(target, true);
      }
    });
  });

  function applyMode() {
    if (mobileMq.matches) {
      enterAccordion();
    } else {
      exitAccordion();
    }
  }

  // addEventListener on a MediaQueryList isn't in older Safari, hence the
  // addListener fallback.
  if (mobileMq.addEventListener) {
    mobileMq.addEventListener('change', applyMode);
  } else if (mobileMq.addListener) {
    mobileMq.addListener(applyMode);
  }

  applyMode();

  /* --- Fixed-nav-on-scroll (desktop only) ---
     This theme wraps every page in .site-wrapper, which has
     `overflow: clip` (assets/base.css). That silently breaks
     position:sticky on any descendant -- a real CSS behavior, not
     a bug -- which is why the nav can't just use sticky. The
     site's own header works around this the same way: it uses
     position:fixed (assets/header.css), driven by JS that toggles
     body.header-pinned. We do the same thing here, computing the
     exact live header height each time rather than guessing a
     fixed number, so this stays correct even if the header's
     height ever changes (announcement bar, responsive, etc.).

     Skipped entirely in accordion mode, where the bar is empty
     and hidden and the headers scroll with the content. */
  var tabNav = document.querySelector('.gvm-tab-nav');
  var placeholder = document.querySelector('.gvm-tab-nav__placeholder');

  if (tabNav && placeholder) {
    var naturalTop = null;

    function measureNaturalTop() {
      // Only measure while in normal flow, so we capture where the
      // nav actually sits on the page, not its fixed position.
      if (!tabNav.classList.contains('is-fixed')) {
        naturalTop = tabNav.getBoundingClientRect().top + window.pageYOffset;
      }
    }
    measureNaturalTop();
    window.addEventListener('resize', measureNaturalTop);

    var ticking = false;

    function clearFixedState() {
      tabNav.classList.remove('is-fixed');
      tabNav.style.top = '';
      placeholder.classList.remove('is-active');
      placeholder.style.height = '0px';
    }

    function updateFixedState() {
      ticking = false;

      if (isAccordion) {
        if (tabNav.classList.contains('is-fixed')) clearFixedState();
        return;
      }

      var headerPinned = document.body.classList.contains('header-pinned');
      var headerHeight = headerPinned
        ? parseFloat(
            getComputedStyle(document.documentElement).getPropertyValue('--f-header-height')
          ) || 80
        : 0;

      // gvm-subnav.js publishes this while its own bar is fixed, so
      // this tab-nav stacks directly below it instead of both
      // landing on top: 0 and overlapping. 0 if the subnav isn't
      // fixed (or isn't present at all -- fine either way).
      var subnavHeight =
        parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue('--gvm-subnav-height')
        ) || 0;

      var totalOffset = headerHeight + subnavHeight;
      var shouldBeFixed = window.pageYOffset + totalOffset >= naturalTop;

      if (shouldBeFixed && !tabNav.classList.contains('is-fixed')) {
        placeholder.style.height = tabNav.offsetHeight + 'px';
        placeholder.classList.add('is-active');
        tabNav.classList.add('is-fixed');
        tabNav.style.top = totalOffset + 'px';
      } else if (!shouldBeFixed && tabNav.classList.contains('is-fixed')) {
        clearFixedState();
        measureNaturalTop(); // back in flow -- refresh its natural position
      } else if (shouldBeFixed) {
        // Still fixed, but the header's pinned state, its height, or
        // the subnav's height may have changed since the last frame.
        tabNav.style.top = totalOffset + 'px';
      }
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        window.requestAnimationFrame(updateFixedState);
        ticking = true;
      }
    });

    updateFixedState(); // handle the case of loading already scrolled down
  }
});
