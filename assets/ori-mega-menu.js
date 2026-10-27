/* ORI mega menu (sections/ori-mega-vehicles.liquid, ori-mega-tiles.liquid).
   Desktop: hovering, focusing or clicking a make in the rail shows its pane;
   compact tiles panels are centred on their menu item.
   Mobile drawer (clone made by assets/header.js): each make heading toggles
   its own pane, accordion style.
   Delegated from document, so it keeps working after header.js moves the
   panel into the nav and after the drawer clone is created. */
(function () {
  if (window.__oriMegaMenu) return;
  window.__oriMegaMenu = true;

  function selectMake(button) {
    const root = button.closest('.ori-mmv');
    if (!root || button.getAttribute('aria-selected') === 'true') return;
    const makes = Array.from(root.querySelectorAll('.ori-mmv__make'));
    const panes = Array.from(root.querySelectorAll('.ori-mmv__pane'));
    const index = makes.indexOf(button);
    makes.forEach((make, i) => make.setAttribute('aria-selected', i === index ? 'true' : 'false'));
    panes.forEach((pane, i) => pane.classList.toggle('is-active', i === index));
  }

  function isDrawer(el) {
    return !!el.closest('.mega-menu-container--mobile');
  }

  // Compact tiles panel (sections/ori-mega-tiles.liquid): it shares the
  // full-width panels' containing block, so it sits flush under the header;
  // centre it on its menu item, kept 16px inside the edges.
  function placeCompact(item) {
    const panel = item.querySelector(':scope > .ori-mm--compact, :scope details > .ori-mm--compact');
    if (!panel || !panel.offsetParent) return;
    const box = panel.offsetParent.getBoundingClientRect();
    const itemBox = item.getBoundingClientRect();
    const width = panel.offsetWidth;
    const centre = itemBox.left + itemBox.width / 2 - box.left;
    const left = Math.max(16, Math.min(centre - width / 2, box.width - width - 16));
    panel.style.setProperty('--ori-mm-left', Math.round(left) + 'px');
  }

  function onEnter(event) {
    const button = event.target.closest('.ori-mmv__make');
    if (button && !isDrawer(button)) selectMake(button);
    const item = event.target.closest('.f-site-nav__item');
    if (item) placeCompact(item);
  }

  document.addEventListener('mouseover', onEnter);
  document.addEventListener('focusin', onEnter);

  document.addEventListener('click', (event) => {
    const button = event.target.closest('.ori-mmv__make');
    if (button && !isDrawer(button)) {
      selectMake(button);
      return;
    }

    // Drawer: the make title toggles that make's links
    const title = event.target.closest('.mega-menu-container--mobile .ori-mmv__head .ori-mm__title');
    if (!title) return;
    const pane = title.closest('.ori-mmv__pane');
    const open = !pane.classList.contains('is-open');
    pane.classList.toggle('is-open', open);
    title.setAttribute('aria-expanded', open ? 'true' : 'false');

    // The theme's collapsible gave the drawer dropdown a fixed px height
    // when it opened; grow or shrink it with the make that just toggled.
    const dropdown = title.closest('.f-mobile-nav__dropdown[data-content]');
    if (dropdown && dropdown.style.height && dropdown.style.height !== '0px') {
      dropdown.style.height = dropdown.scrollHeight + 'px';
    }
  });

  // Drawer clone: make titles behave as buttons, all makes start closed
  function prepareDrawer() {
    document.querySelectorAll('.mega-menu-container--mobile .ori-mmv__pane').forEach((pane) => {
      const title = pane.querySelector('.ori-mmv__head .ori-mm__title');
      if (!title || title.hasAttribute('role')) return;
      pane.classList.remove('is-active');
      title.setAttribute('role', 'button');
      title.setAttribute('tabindex', '0');
      title.setAttribute('aria-expanded', 'false');
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const title = event.target.closest('.mega-menu-container--mobile .ori-mmv__head .ori-mm__title');
    if (!title) return;
    event.preventDefault();
    title.click();
  });

  prepareDrawer();
  document.addEventListener('DOMContentLoaded', prepareDrawer);
  setTimeout(prepareDrawer, 400);
  const drawer = document.querySelector('#Drawer-MobileNav') || document.querySelector('.f-drawer-mobile-nav');
  if (drawer) new MutationObserver(prepareDrawer).observe(drawer, { childList: true, subtree: true });
})();
