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
});
