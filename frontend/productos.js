// productos.js

// normalizar la página actual para que " / " cuente como "index.html"
const paginaActual = (() => {
  let p = window.location.pathname.split('/').pop();
  // casos típicos de home
  if (!p || p === '' || p === 'index' || p === 'index.htm') return 'index.html';
  return p;
})();

// mapeo de página -> json
const mapeoCategorias = {
  'collares.html': 'collares.json',
  'pulseras.html': 'pulseras.json',
  'index.html': 'destacados.json'
};

// fallback por si estás en otra página no mapeada
const jsonArchivo = mapeoCategorias[paginaActual] || 'destacados.json';

// derivar categoría de forma segura
const categoria = jsonArchivo.replace(/\.json$/i, '');

// helpers
function crearProducto(producto) {
  const div = document.createElement('div');
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
  if (!contenedor) return; // si no existe ese contenedor en esta página, salimos

  // limpiar por si recargas o re-llamás
  contenedor.innerHTML = '';

  (productos || []).forEach(p => contenedor.appendChild(crearProducto(p)));
}

async function cargarProductos() {
  const url = `${jsonArchivo}?t=${Date.now()}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} al pedir ${url}`);

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const sample = (await res.text()).slice(0, 120);
      throw new Error(`contenido no JSON (${contentType}). muestra: ${sample}...`);
    }

    const data = await res.json();
    const productos = data?.products ?? data ?? [];

    // si estoy en home, renderizo destacados; en otras páginas, el listado normal
    if (paginaActual === 'index.html') {
      renderizarProductos(productos, 'products-destacados');
    } else {
      renderizarProductos(productos, 'products');
    }
  } catch (err) {
    console.error('Error cargando productos:', err);
  }
}

document.addEventListener('DOMContentLoaded', cargarProductos);
