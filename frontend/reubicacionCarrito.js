// relocateCartIcon.js
(function () {
  function qs(sel) { return document.querySelector(sel); }

  function getTargets() {
    return {
      cart: qs('#cart-icon'),
      header: qs('#header__nav .header__nav') || qs('header .header__nav'),
      sidebarMenuUL: qs('#sidebar__wrapper .side-menu ul')
    };
  }

  function ensureSidebarCartLI() {
    let li = document.getElementById('sidebar-cart-li');
    if (!li) {
      li = document.createElement('li');
      li.id = 'sidebar-cart-li';
      li.className = 'sidebar__cart';
    }
    return li;
  }

  function moveCart(to) {
    const { cart, header, sidebarMenuUL } = getTargets();
    if (!cart) return;

    if (to === 'sidebar' && sidebarMenuUL) {
      const li = ensureSidebarCartLI();
      li.innerHTML = '';
      li.appendChild(cart);
      // 👉 ahora lo mando al final de la lista
      sidebarMenuUL.appendChild(li);
    } else if (to === 'header' && header) {
      header.appendChild(cart);
      const li = document.getElementById('sidebar-cart-li');
      if (li && li.childElementCount === 0) li.remove();
    }
  }

  function relocate() {
    const { cart, header, sidebarMenuUL } = getTargets();
    if (!cart || !header || !sidebarMenuUL) return;

    const isDesktop = window.matchMedia('(min-width: 1024px)').matches;

    if (isDesktop) {
      if (!sidebarMenuUL.contains(cart)) moveCart('sidebar');
    } else {
      if (!header.contains(cart)) moveCart('header');
    }
  }

  const observer = new MutationObserver(relocate);
  observer.observe(document.body, { childList: true, subtree: true });

  window.addEventListener('resize', relocate);
  window.addEventListener('DOMContentLoaded', relocate);
  window.addEventListener('load', relocate);
})();
