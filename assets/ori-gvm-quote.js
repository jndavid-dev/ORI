/* ORI GVM quote request (sections/ori-gvm-quote.liquid).

   - Steps: one fieldset at a time, each checked before moving on.
   - Kit and variant: on a product page the variant follows the page's own
     variant buttons; on a collection page a kit select fills the variant
     select. Either way the hidden Product / Variant / SKU / URL fields are
     kept in step. Product cards with data-ori-quote-kit="<product id>"
     (ORI product grid, button "Request quote") link to the product; when a quote
     popup lists that kit they open it instead, with the kit chosen.
   - Submit: posts to Shopify's contact endpoint in the background so the
     popup stays open. Shopify redirects a successful post to a URL carrying
     contact_posted=true; anything else (validation errors, the spam-check
     challenge page) falls back to a normal post so Shopify can handle it.

   The section can appear twice on a page (popup + in the page), so every
   [data-ori-quote] root is set up on its own. */
(function () {
  if (window.oriGvmQuoteLoaded) return;
  window.oriGvmQuoteLoaded = true;

  function urlVariant() {
    try { return new URL(window.location.href).searchParams.get('variant'); } catch (e) { return null; }
  }

  function setup(root) {
    var form = root.querySelector('[data-ori-quote-form]');
    if (!form) return;

    var steps = Array.prototype.slice.call(form.querySelectorAll('[data-ori-quote-step]'));
    var progress = form.querySelectorAll('[data-ori-quote-progress] li');
    var btnBack = form.querySelector('[data-ori-quote-back]');
    var btnNext = form.querySelector('[data-ori-quote-next]');
    var btnSubmit = form.querySelector('[data-ori-quote-submit]');
    var errorBox = form.querySelector('[data-ori-quote-error]');
    var done = form.querySelector('[data-ori-quote-done]');
    var useSteps = !!btnNext && steps.length > 1;
    var current = 0;

    /* --- Steps --- */
    function show(i) {
      current = i;
      steps.forEach(function (s, n) { s.hidden = useSteps && n !== i; });
      for (var n = 0; n < progress.length; n++) {
        progress[n].classList.toggle('is-active', n === i);
        progress[n].classList.toggle('is-done', n < i);
      }
      if (!useSteps) return;
      var last = i === steps.length - 1;
      btnBack.hidden = i === 0;
      btnNext.hidden = last;
      btnSubmit.hidden = !last;
    }

    function stepValid(step) {
      var fields = step.querySelectorAll('input, select, textarea');
      for (var n = 0; n < fields.length; n++) {
        if (!fields[n].checkValidity()) {
          fields[n].reportValidity();
          return false;
        }
      }
      return true;
    }

    if (useSteps) {
      btnNext.addEventListener('click', function () {
        if (!stepValid(steps[current])) return;
        show(current + 1);
        var first = steps[current].querySelector('input, select, textarea');
        if (first) first.focus();
      });
      btnBack.addEventListener('click', function () { show(current - 1); });
      // Enter in a text field moves to the next step instead of submitting early.
      form.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' || e.target.tagName === 'TEXTAREA') return;
        if (current < steps.length - 1) {
          e.preventDefault();
          btnNext.click();
        }
      });
    }
    show(0);

    /* --- Kit and variant --- */
    // Product pages embed one kit (the product), collection pages one per
    // product. A kit select only exists on collection pages.
    var KITS = {};
    var kitsEl = form.querySelector('[data-ori-quote-kits]');
    if (kitsEl) {
      try { KITS = JSON.parse(kitsEl.textContent) || {}; } catch (e) { KITS = {}; }
    }
    var kitIds = Object.keys(KITS);
    var kitSelect = form.querySelector('[data-ori-quote-kit-select]');
    var select = form.querySelector('[data-ori-quote-variant]');
    var variantField = form.querySelector('[data-ori-quote-variant-field]');
    var card = form.querySelector('[data-ori-quote-card]');
    var h = {
      product: form.querySelector('[data-ori-quote-h="product"]'),
      variant: form.querySelector('[data-ori-quote-h="variant"]'),
      sku: form.querySelector('[data-ori-quote-h="sku"]'),
      url: form.querySelector('[data-ori-quote-h="url"]')
    };
    var img = form.querySelector('[data-ori-quote-img]');
    var titleEl = form.querySelector('[data-ori-quote-title]');
    var skuLine = form.querySelector('[data-ori-quote-sku]');
    var notSure = h.product ? h.product.value : '';
    var kitId = kitSelect ? '' : kitIds[0] || '';

    function setVal(el, v) { if (el) el.value = v || ''; }

    function applyVariant(id) {
      var kit = KITS[kitId];
      if (!kit) return;
      var v = null;
      for (var n = 0; n < kit.variants.length; n++) {
        if (String(kit.variants[n].id) === String(id)) v = kit.variants[n];
      }
      if (!v) v = kit.variants[0];
      if (!v) return;
      if (select) select.value = String(v.id);
      // A single default variant is just "Default Title" — leave it out.
      setVal(h.variant, kit.variants.length > 1 ? v.title : '');
      setVal(h.sku, v.sku);
      if (h.url) {
        var base = kitSelect ? window.location.origin + kit.url : h.url.value.split('?')[0];
        h.url.value = base + '?variant=' + v.id;
      }
      if (img) {
        var src = v.image || kit.image;
        img.hidden = !src;
        if (src) img.src = src;
      }
      if (skuLine) {
        skuLine.hidden = !v.sku;
        var span = skuLine.querySelector('span');
        if (span) span.textContent = v.sku || '';
      }
    }

    function setKit(id, variantId) {
      if (!kitSelect) return;
      kitId = KITS[id] ? String(id) : '';
      kitSelect.value = kitId;
      var kit = KITS[kitId];
      if (card) card.hidden = !kit;
      if (!kit) {
        setVal(h.product, notSure);
        setVal(h.variant, '');
        setVal(h.sku, '');
        setVal(h.url, '');
        if (variantField) variantField.hidden = true;
        return;
      }
      setVal(h.product, kit.title);
      if (titleEl) titleEl.textContent = kit.title;
      if (select) {
        select.innerHTML = '';
        kit.variants.forEach(function (v) {
          var o = document.createElement('option');
          o.value = v.id;
          o.textContent = v.title;
          select.appendChild(o);
        });
      }
      if (variantField) variantField.hidden = kit.variants.length < 2;
      applyVariant(variantId);
    }

    if (kitSelect) {
      kitSelect.addEventListener('change', function () { setKit(kitSelect.value); });
    }
    if (select) {
      select.addEventListener('change', function () { applyVariant(select.value); });
    }

    if (!kitSelect) {
      // Product page: follow the page's variant (ORI GVM Product writes
      // ?variant= and its buttons carry data-gvm-step="<variant id>").
      applyVariant(urlVariant());
      document.addEventListener('click', function (e) {
        var btn = e.target.closest && e.target.closest('[data-gvm-step]');
        if (btn) applyVariant(btn.getAttribute('data-gvm-step'));
      });
      if (root.hasAttribute('data-ori-quote-popup')) {
        root.addEventListener('open', function () { applyVariant(urlVariant()); });
      }
    }

    // Lets product-card buttons pick a kit before opening the popup.
    root.oriQuote = { setKit: setKit, hasKit: function (id) { return !!KITS[id]; } };

    /* --- Submit --- */
    function finish() {
      steps.forEach(function (s) { s.hidden = true; });
      Array.prototype.forEach.call(
        form.querySelectorAll('.ori-quote__progress, .ori-quote__actions, .ori-quote__note'),
        function (el) { el.hidden = true; }
      );
      if (errorBox) errorBox.hidden = true;
      done.hidden = false;
      done.focus();

      var detail = {
        product: h.product ? h.product.value : '',
        variant: h.variant ? h.variant.value : '',
        sku: h.sku ? h.sku.value : ''
      };
      root.dispatchEvent(new CustomEvent('ori:quote-submitted', { bubbles: true, detail: detail }));
      try {
        if (window.Shopify && Shopify.analytics && Shopify.analytics.publish) {
          Shopify.analytics.publish('gvm_quote_submitted', detail);
        }
        if (window.dataLayer) window.dataLayer.push({ event: 'gvm_quote_submitted', gvm_quote: detail });
      } catch (e) {}
    }

    // requestSubmit fires the submit event again, which lets Shopify's own
    // spam-check listener run; the flag stops this handler catching it.
    function nativeSubmit() {
      form.dataset.oriNative = 'true';
      if (form.requestSubmit) form.requestSubmit();
      else HTMLFormElement.prototype.submit.call(form);
    }

    form.addEventListener('submit', function (e) {
      if (form.dataset.oriNative === 'true') return;
      e.preventDefault();
      for (var n = 0; n < steps.length; n++) {
        if (useSteps && steps[n].hidden) show(n);
        if (!stepValid(steps[n])) return;
      }
      if (useSteps) show(steps.length - 1);

      btnSubmit.disabled = true;
      btnSubmit.setAttribute('aria-busy', 'true');
      if (errorBox) errorBox.hidden = true;

      fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'text/html' },
        credentials: 'same-origin'
      })
        .then(function (res) {
          if (res.url && res.url.indexOf('contact_posted=true') !== -1) {
            finish();
          } else {
            nativeSubmit();
          }
        })
        .catch(function () {
          btnSubmit.disabled = false;
          btnSubmit.removeAttribute('aria-busy');
          if (errorBox) {
            errorBox.textContent = 'Something went wrong sending your enquiry. Please check your connection and try again.';
            errorBox.hidden = false;
          }
        });
    });

    /* --- Back from a normal post --- */
    // The section flags data-ori-quote-reopen when the page was rendered
    // with this form's success or errors. Shopify adds #<form id> to the
    // redirect, so a hash naming another form means it wasn't this one.
    if (root.hasAttribute('data-ori-quote-reopen') && typeof root.show === 'function') {
      var hash = window.location.hash;
      if (!hash || hash === '#' + root.getAttribute('data-form-id')) root.show();
    }
  }

  function init() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-ori-quote]'), function (root) {
      if (root.dataset.oriQuoteReady) return;
      root.dataset.oriQuoteReady = 'true';
      setup(root);
    });
    initCardButtons();
  }

  // "Request quote" on ORI product cards is a link to the product. When a
  // quote popup on the page lists that kit, it opens the popup instead.
  function initCardButtons() {
    var popup = document.querySelector('[data-ori-quote-popup]');
    var api = popup && popup.oriQuote;
    Array.prototype.forEach.call(document.querySelectorAll('[data-ori-quote-kit]'), function (btn) {
      var id = btn.getAttribute('data-ori-quote-kit');
      if (!api || !api.hasKit(id) || btn.dataset.oriQuoteBound) return;
      btn.dataset.oriQuoteBound = 'true';
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        api.setKit(id);
        if (typeof popup.show === 'function') popup.show(btn);
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  // Theme editor re-renders a section in place.
  document.addEventListener('shopify:section:load', init);
})();
