/* ==========================================================
   GVM Subnav — fixed-on-scroll positioning + dropdown behavior.
   Vanilla JS (no jQuery dependency confirmed on this theme).
   ========================================================== */

document.addEventListener('DOMContentLoaded', function () {
  /* --- Only one dropdown open at a time ---
     Native <details> elements don't do this on their own -- close
     every other open dropdown whenever one is opened. */
  var dropdowns = document.querySelectorAll('.gvm-subnav__dropdown');
  dropdowns.forEach(function (dropdown) {
    dropdown.addEventListener('toggle', function () {
      if (dropdown.open) {
        dropdowns.forEach(function (other) {
          if (other !== dropdown) other.open = false;
        });
      }
    });
  });

  /* --- Open on hover, real pointer devices only ---
     A pure-CSS hover trick doesn't work here: closed <details>
     content gets `content-visibility: hidden` applied internally by
     the browser (part of the HTML spec's rendering for <details>,
     not just display:none), which a CSS `display` override can't
     undo. Actually toggling the `open` property on hover sidesteps
     that entirely, since it uses the real native open state instead
     of trying to fake it visually while staying closed underneath.

     matchMedia gate keeps this off touch devices, where mouseenter
     can fire on tap and cause confusing sticky-hover behavior --
     those keep the native tap-to-toggle behavior instead. */
  if (window.matchMedia('(hover: hover)').matches) {
    dropdowns.forEach(function (dropdown) {
      dropdown.addEventListener('mouseenter', function () {
        dropdown.open = true;
      });
      dropdown.addEventListener('mouseleave', function () {
        dropdown.open = false;
      });
    });
  }

  /* --- Fixed-nav-on-scroll ---
     Same mechanism as gvm-tabs.js on the Silverado template,
     reused directly: this theme's .site-wrapper has
     overflow: clip, which silently breaks position:sticky, so
     this switches to position:fixed once scrolled to its natural
     position, computed against the header's live height/pinned
     state rather than a hardcoded number.

     With the header's own sticky setting currently turned off
     (per the plan to make only this subnav sticky for now), this
     already resolves to "fix right at the top" automatically --
     no special-casing needed for that. */
  var bar = document.querySelector('.gvm-subnav__bar');
  var placeholder = document.querySelector('.gvm-subnav__placeholder');

  if (bar && placeholder) {
    var naturalTop = null;

    function measureNaturalTop() {
      if (!bar.classList.contains('is-fixed')) {
        naturalTop = bar.getBoundingClientRect().top + window.pageYOffset;
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

      if (shouldBeFixed && !bar.classList.contains('is-fixed')) {
        placeholder.style.height = bar.offsetHeight + 'px';
        placeholder.classList.add('is-active');
        bar.classList.add('is-fixed');
        bar.style.top = headerHeight + 'px';
        // Published for gvm-tabs.js (or anything else) to stack below
        // this bar when it's fixed, instead of guessing a number.
        document.documentElement.style.setProperty('--gvm-subnav-height', bar.offsetHeight + 'px');
      } else if (!shouldBeFixed && bar.classList.contains('is-fixed')) {
        bar.classList.remove('is-fixed');
        bar.style.top = '';
        placeholder.classList.remove('is-active');
        placeholder.style.height = '0px';
        document.documentElement.style.setProperty('--gvm-subnav-height', '0px');
        measureNaturalTop();
      } else if (shouldBeFixed) {
        bar.style.top = headerHeight + 'px';
        document.documentElement.style.setProperty('--gvm-subnav-height', bar.offsetHeight + 'px');
      }

      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        window.requestAnimationFrame(updateFixedState);
        ticking = true;
      }
    });

    updateFixedState();
  }
});