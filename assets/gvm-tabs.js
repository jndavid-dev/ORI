/* ==========================================================
   GVM Vehicle Hub — Tab Switching
   Vanilla JS (no jQuery dependency confirmed on this theme —
   this works whether or not jQuery ever loads).

   HOW GROUPING WORKS:
   Each tab's sections are marked with a shared custom class
   (set in the section's "Custom Class" field in the theme
   editor / template JSON) — e.g. every Tab 1 section gets
   "gvm-tab-panel gvm-tab-panel--1". Clicking a nav button shows
   the matching group and hides the rest.

   EXCEPTION: the gvm-comparison section type has no Custom
   Class field in its schema, so it's targeted directly by its
   Shopify section ID below instead of a class. If you swap out
   which section holds Tab 2's pricing table later, update the
   ID here (and in gvm-tabs.css) to match.
   ========================================================== */

document.addEventListener('DOMContentLoaded', function () {
  var tabGroups = {
    'tab-1': ['.gvm-tab-panel--1'],
    'tab-2': ['.gvm-tab-panel--2', '[id$="gvm_comparison_FfmTMw"]'],
    'tab-3': ['.gvm-tab-panel--3'],
    'tab-4': ['.gvm-tab-panel--4']
  };

  var navButtons = document.querySelectorAll('.gvm-tab-nav__btn');

  function showTab(targetId) {
    // Hide every panel in every group first
    Object.keys(tabGroups).forEach(function (tabId) {
      tabGroups[tabId].forEach(function (selector) {
        document.querySelectorAll(selector).forEach(function (el) {
          el.style.display = 'none';
        });
      });
    });

    // Show only the panels belonging to the clicked tab
    (tabGroups[targetId] || []).forEach(function (selector) {
      document.querySelectorAll(selector).forEach(function (el) {
        el.style.display = 'block';
      });
    });

    // Update active state on the nav buttons themselves
    navButtons.forEach(function (btn) {
      var isActive = btn.getAttribute('data-tab-target') === targetId;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
  }

  navButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      showTab(btn.getAttribute('data-tab-target'));
    });
  });

  /* --- Fixed-nav-on-scroll ---
     This theme wraps every page in .site-wrapper, which has
     `overflow: clip` (assets/base.css). That silently breaks
     position:sticky on any descendant -- a real CSS behavior, not
     a bug -- which is why the nav can't just use sticky. The
     site's own header works around this the same way: it uses
     position:fixed (assets/header.css), driven by JS that toggles
     body.header-pinned. We do the same thing here, computing the
     exact live header height each time rather than guessing a
     fixed number, so this stays correct even if the header's
     height ever changes (announcement bar, responsive, etc.). */
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

    function updateFixedState() {
      var headerPinned = document.body.classList.contains('header-pinned');
      var headerHeight = headerPinned
        ? parseFloat(
            getComputedStyle(document.documentElement).getPropertyValue('--f-header-height')
          ) || 80
        : 0;

      var shouldBeFixed = window.pageYOffset + headerHeight >= naturalTop;

      if (shouldBeFixed && !tabNav.classList.contains('is-fixed')) {
        placeholder.style.height = tabNav.offsetHeight + 'px';
        placeholder.classList.add('is-active');
        tabNav.classList.add('is-fixed');
        tabNav.style.top = headerHeight + 'px';
      } else if (!shouldBeFixed && tabNav.classList.contains('is-fixed')) {
        tabNav.classList.remove('is-fixed');
        tabNav.style.top = '';
        placeholder.classList.remove('is-active');
        placeholder.style.height = '0px';
        measureNaturalTop(); // back in flow -- refresh its natural position
      } else if (shouldBeFixed) {
        // Still fixed, but the header's pinned state or height may
        // have changed since the last frame -- keep top in sync.
        tabNav.style.top = headerHeight + 'px';
      }

      ticking = false;
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
