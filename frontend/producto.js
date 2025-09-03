// producto.js

function getParam(name) {
  const usp = new URLSearchParams(window.location.search);
  return usp.get(name);
}

// 1) resolver categoría de forma robusta: param -> referrer -> fallback
function getCategorySafe() {
  // desde la URL actual
  const cat = (getParam('cat') || '').toLowerCase();
  if (cat) return cat;

  // intentar extraer de la página de origen (si existe)
  try {
    if (document.referrer) {
      const u = new URL(document.referrer);
      const refCat = (new URLSearchParams(u.search).get('cat') || '').toLowerCase();
      if (refCat) return refCat;
    }
  } catch (_) {}

  // último recurso: destacados
  return 'destacados';
}

// 2) mapear categoría -> archivo json
const mapCatToJson = {
  collares: 'collares.json',
  pulseras: 'pulseras.json',
  destacados: 'destacados.json'
};

const id = getParam('id');
const category = getCategorySafe();
const jsonFile = mapCatToJson[category] || 'destacados.json';
const url = `${jsonFile}?t=${Date.now()}`;

async function fetchJsonChecked(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} al pedir ${url}`);
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    const sample = (await res.text()).slice(0, 120);
    throw new Error(`Contenido no JSON (${ct}). Muestra: ${sample}...`);
  }
  return res.json();
}

fetchJsonChecked(url)
  .then(data => {
    const productos = data?.products || [];
    const producto = productos.find(p => String(p.id) === String(id));

    const contenedor = document.getElementById('producto-seccion');
    if (!contenedor) {
      console.warn('⚠️ No se encontró el contenedor con ID "producto-seccion".');
      return;
    }

    if (!producto) {
      contenedor.textContent = 'Producto no encontrado.';
      return;
    }

    // filtrar imágenes por si image2 no existe
    const imagenes = [producto.image, producto.image2].filter(Boolean);

    contenedor.innerHTML = `
      <div class="producto-seccion-container">
        <div class="producto-seccion-imagenes">
          <button class="carousel-btn left">&#10094;</button>
          <div class="carousel-track">
            ${imagenes.map(src => `<img src="${src}" alt="${producto.name}">`).join('')}
          </div>
          <button class="carousel-btn right">&#10095;</button>
        </div>
        <div class="producto-info">
          <div class="producto-info-top">
            <h1>${producto.name}</h1>
            <span>$ ${producto.price}</span>
          </div>
          <div class="producto-info-bottom">
            <div class="producto-cantidad">
              <label for="cantidad">Cantidad</label>
              <div class="producto-cantidad-agregar">
                <input type="number" id="cantidad" value="1" min="1">
                <button class="btn-agregar">AGREGAR AL CARRITO</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // carrusel
    let currentIndex = 0;
    const track = document.querySelector('.carousel-track');
    const leftBtn = document.querySelector('.carousel-btn.left');
    const rightBtn = document.querySelector('.carousel-btn.right');
    const imgs = track.querySelectorAll('img');

    const goTo = (i) => { track.style.transform = `translateX(-${i * 100}%)`; };

    leftBtn?.addEventListener('click', () => {
      currentIndex = (currentIndex - 1 + imgs.length) % imgs.length;
      goTo(currentIndex);
    });

    rightBtn?.addEventListener('click', () => {
      currentIndex = (currentIndex + 1) % imgs.length;
      goTo(currentIndex);
    });

    // carrito
    const btnAgregar = document.querySelector('.btn-agregar');
    btnAgregar?.addEventListener('click', () => {
      const cantidad = parseInt(document.getElementById('cantidad').value, 10) || 1;

      const productoCarrito = {
        id: producto.id,
        name: producto.name,
        price: producto.price,
        image: producto.image,
        cantidad
      };

      let carrito = JSON.parse(localStorage.getItem('carrito')) || [];
      const existente = carrito.find(item => item.id === producto.id);

      if (existente) {
        existente.cantidad += cantidad;
      } else {
        carrito.push(productoCarrito);
      }

      localStorage.setItem('carrito', JSON.stringify(carrito));
      alert('🛒 Producto agregado al carrito');
    });
  })
  .catch(err => {
    console.error('Error al cargar el JSON:', err);
    const contenedor = document.getElementById('producto-seccion');
    if (contenedor) contenedor.textContent = 'Error al cargar el producto.';
  });

// ⚠️ si tenés tarjetas .producto en esta página, asegurate de incluir cat en la navegación
document.querySelectorAll('.producto').forEach(prod => {
  prod.addEventListener('click', () => {
    const id = prod.dataset.id;
    // incluir SIEMPRE cat
    window.location.href = `producto.html?id=${id}&cat=${category}`;
  });
});
