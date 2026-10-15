/* ==========================================================
   GVM Kit Request Form -- Tab 4
   Plain kit/variant dropdowns; selecting a kit populates a live
   preview card (image, title, short description) alongside the
   form, then add-to-cart with VIN/date properties and redirect
   to checkout, where the company's native "Submit all orders as
   drafts for review" setting takes over automatically.
   ========================================================== */

document.addEventListener('DOMContentLoaded', function () {
  var form = document.getElementById('gvm-kit-request-form');
  if (!form) return;

  var kitData = JSON.parse(document.getElementById('gvm-kit-data').textContent);
  var kitSelect = document.getElementById('gvm-kit-select');
  var variantSelect = document.getElementById('gvm-variant-select');
  var variantIdInput = document.getElementById('gvm-variant-id');
  var priceWrap = document.getElementById('gvm-kit-price');
  var priceValue = document.getElementById('gvm-kit-price-value');
  var submitBtn = document.getElementById('gvm-kit-submit');

  var previewPlaceholder = document.getElementById('gvm-kit-preview-placeholder');
  var previewContent = document.getElementById('gvm-kit-preview-content');
  var previewImage = document.getElementById('gvm-kit-preview-image');
  var previewTitle = document.getElementById('gvm-kit-preview-title');
  var previewDescription = document.getElementById('gvm-kit-preview-description');

  function resetVariantSelect() {
    variantSelect.innerHTML = '<option value="" disabled selected>Choose a kit above first&hellip;</option>';
    variantSelect.disabled = true;
    variantIdInput.value = '';
    priceWrap.hidden = true;
    submitBtn.disabled = true;
  }

  function resetPreview() {
    previewPlaceholder.hidden = false;
    previewContent.hidden = true;
  }

  function updatePreview(product) {
    previewImage.src = product.image || '';
    previewImage.alt = product.title;
    previewTitle.textContent = product.title;
    previewDescription.textContent = product.description;
    previewPlaceholder.hidden = true;
    previewContent.hidden = false;
  }

  kitSelect.addEventListener('change', function () {
    var product = kitData[kitSelect.value];
    if (!product) {
      resetVariantSelect();
      resetPreview();
      return;
    }

    updatePreview(product);

    variantSelect.innerHTML = '<option value="" disabled selected>Choose a variant&hellip;</option>';
    product.variants.forEach(function (variant) {
      var option = document.createElement('option');
      option.value = variant.id;
      option.textContent = variant.title + (variant.available ? '' : ' (Out of stock)');
      option.disabled = !variant.available;
      option.dataset.price = variant.price;
      variantSelect.appendChild(option);
    });
    variantSelect.disabled = false;
    priceWrap.hidden = true;
    submitBtn.disabled = true;
    variantIdInput.value = '';
  });

  variantSelect.addEventListener('change', function () {
    var selected = variantSelect.options[variantSelect.selectedIndex];
    if (!selected || !selected.value) {
      priceWrap.hidden = true;
      submitBtn.disabled = true;
      return;
    }
    variantIdInput.value = selected.value;
    priceValue.textContent = selected.dataset.price;
    priceWrap.hidden = false;
    submitBtn.disabled = false;
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting…';

    var formData = new FormData(form);

    fetch('/cart/add.js', {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: formData
    })
      .then(function (response) {
        if (!response.ok) {
          throw new Error('Add to cart failed');
        }
        return response.json();
      })
      .then(function () {
        window.location.href = '/checkout';
      })
      .catch(function (error) {
        console.error('GVM kit request error:', error);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Request Kit';
        alert('Something went wrong submitting your request. Please try again.');
      });
  });

  /* --- "Request this kit" buttons on the pricing tab ---
     Those buttons ship hidden and are revealed here, so they only ever
     appear when this form is actually on the page and knows that product.
     Clicking one switches to whichever tab holds this form and preselects
     the kit, rather than making the shopper find Tab 4 and re-pick the
     product they were just looking at. */

  // Which tab is this form in? Read it off the panel class rather than
  // assuming tab-4, so this survives the form being moved or the template
  // being cloned for another vehicle with a different tab order.
  function formTabTarget() {
    var panel = form.closest('.gvm-tab-panel');
    if (!panel) return null;
    var match = /gvm-tab-panel--([A-Za-z0-9_-]+)/.exec(panel.className);
    return match ? 'tab-' + match[1] : null;
  }

  // Total height of anything fixed to the top of the viewport right now,
  // so the form doesn't end up hidden behind the header/subnav/tab bar.
  function fixedOffset() {
    var styles = getComputedStyle(document.documentElement);
    var offset = 0;

    if (document.body.classList.contains('header-pinned')) {
      offset += parseFloat(styles.getPropertyValue('--f-header-height')) || 0;
    }
    offset += parseFloat(styles.getPropertyValue('--gvm-subnav-height')) || 0;

    var tabNav = document.querySelector('.gvm-tab-nav.is-fixed');
    if (tabNav) offset += tabNav.offsetHeight;

    return offset + 16;
  }

  function requestKit(productId) {
    var product = kitData[productId];
    if (!product) return;

    var target = formTabTarget();
    if (target) {
      var navBtn = document.querySelector('.gvm-tab-nav__btn[data-tab-target="' + target + '"]');
      // Clicking the real button reuses gvm-tabs.js's own switching logic,
      // including its active-state handling, instead of duplicating it.
      if (navBtn) navBtn.click();
    }

    kitSelect.value = String(productId);
    kitSelect.dispatchEvent(new Event('change', { bubbles: true }));

    // With a single variant there is nothing to choose, so pick it for them
    // and leave the form ready to fill in.
    if (product.variants.length === 1 && product.variants[0].available) {
      variantSelect.value = String(product.variants[0].id);
      variantSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Wait for the tab to actually render before measuring where it landed.
    window.requestAnimationFrame(function () {
      var top = form.getBoundingClientRect().top + window.pageYOffset - fixedOffset();
      window.scrollTo({ top: top, behavior: 'smooth' });

      var focusTarget = variantSelect.disabled ? kitSelect : variantSelect;
      focusTarget.focus({ preventScroll: true });
    });
  }

  document.querySelectorAll('[data-gvm-request-kit]').forEach(function (btn) {
    if (!kitData[btn.getAttribute('data-gvm-request-kit')]) return;
    btn.hidden = false;
    btn.addEventListener('click', function () {
      requestKit(btn.getAttribute('data-gvm-request-kit'));
    });
  });
});
