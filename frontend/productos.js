// productos.js

// normalizar: si la URL termina con "/" tomarlo como index.html
const paginaActual = (() => {
  const p = window.location.pathname;
  if (p.endsWith('/') || p === '') return 'index.html';
  const last = p.split('/').pop();
  // cubrir variantes comunes
  if (!last || last === 'index' || last === 'index.htm') return 'index.html';
  return last;
})();

// mapeo de página -> json (agrego '' por si acaso)
const mapeoCategorias = {
  '': 'destacados.json',
  'index.html': 'destacados.json',
  'collares.html': 'collares.json',
  'pulseras.html': 'pulseras.json'
};

// Fallback SIEMPRE, así jamás queda null/undefined
const jsonArchivo = mapeoCategorias[paginaActual] ?? 'destacados.json';

// si por alguna razón jsonArchivo queda raro, abortar antes de romper
if (!jsonArchivo || typeof jsonArchivo !== 'string') {
  console.error('jsonArchivo inválido para', { paginaActual, jsonArchivo });
  // salimos para evitar /null.json
} else {
  const categoria = jsonArchivo.replace(/\.json$/i, '');

  function crearProducto(producto){
    const div= document.createElement('div');
    div.className = 'producto';
    div.dataset.id = producto.id;
    div.innerHTML = `
      <div class="product-img">
        <img src="${producto.image}" alt="${producto.name || ''}">
      </div>
      <span class="product-name">${producto.name || ''}</span>
      <span class="product-price">$${producto.price ?? ''}</span>
    `;
    div.addEventListener('click', () => {
      window.location.href = `producto.html?id=${producto.id}&cat=${categoria}`;
    });
    return div;
  }

  function renderizarProductos(productos, IDcontenedor) {
    const contenedor = document.getElementById(IDcontenedor);
    if (!contenedor) return;
    contenedor.innerHTML = '';
    (productos || []).forEach(p => contenedor.appendChild(crearProducto(p)));
  }

  async function cargar() {
    const url = `${jsonArchivo}?t=${Date.now()}`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status} al pedir ${url}`);
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        const sample = (await res.text()).slice(0, 120);
        throw new Error(`contenido no JSON (${ct}). muestra: ${sample}...`);
      }
      const data = await res.json();
      const productos = data?.products ?? data ?? [];

      // home -> destacados; otras páginas -> listado normal
      if (paginaActual === 'index.html') {
        renderizarProductos(productos, 'products-destacados');
      } else {
        renderizarProductos(productos, 'products');
      }
    } catch (e) {
      console.error('Error cargando productos:', e);
    }
  }

  document.addEventListener('DOMContentLoaded', cargar);
}

