const params = new URLSearchParams(window.location.search)
const id = params.get("id")
const categoria_url = params.get("cat");

fetch(`${categoria_url}.json?timestamp=${Date.now()}`)
  .then(res => res.json())
  .then(data => {
    const productos = data.products
    const producto = productos.find(p => String(p.id) === String(id))

    const contenedor = document.getElementById("producto-seccion")
    if (!contenedor) {
      console.warn('⚠️ No se encontró el contenedor con ID "producto-seccion".')
      return
    }

    if (!producto) {
      contenedor.textContent = 'Producto no encontrado.'
      return
    }

    contenedor.innerHTML = `
      <div class="producto-seccion-container">
        <div class="producto-seccion-imagenes">
          <button class="carousel-btn left">&#10094;</button>
          <div class="carousel-track">
            <img src="${producto.image}" alt="${producto.name}">
            <img src="${producto.image2}" alt="${producto.name}">
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
    `

    let currentIndex = 0
    const track = document.querySelector('.carousel-track')
    const leftBtn = document.querySelector('.carousel-btn.left')
    const rightBtn = document.querySelector('.carousel-btn.right')
    const images = track.querySelectorAll('img')

    leftBtn.addEventListener('click', () => {
      currentIndex = (currentIndex - 1 + images.length) % images.length
      track.style.transform = `translateX(-${currentIndex * 100}%)`
    })

    rightBtn.addEventListener('click', () => {
      currentIndex = (currentIndex + 1) % images.length
      track.style.transform = `translateX(-${currentIndex * 100}%)`
    })

    const btnAgregar = document.querySelector('.btn-agregar')
    btnAgregar.addEventListener('click', () => {
    const cantidad = parseInt(document.getElementById('cantidad').value) || 1

    const productoCarrito = {
      id: producto.id,
      name: producto.name,
      price: producto.price,
      image: producto.image,
      cantidad
    }

    let carrito = JSON.parse(localStorage.getItem('carrito')) || []

    const existente = carrito.find(item => item.id === producto.id)

    if (existente) {
      existente.cantidad += cantidad
    } else {
      carrito.push(productoCarrito)
    }

    localStorage.setItem('carrito', JSON.stringify(carrito))
    alert('🛒 Producto agregado al carrito')
})
  })
  .catch(err => {
    console.error('Error al cargar el JSON:', err)
    const contenedor = document.getElementById('producto-seccion')
    if (contenedor) {
      contenedor.textContent = 'Error al cargar el producto.'
    }
  })

document.querySelectorAll('.producto').forEach(prod => {
  prod.addEventListener('click', () => {
    const id = prod.dataset.id
    window.location.href = `producto.html?id=${id}`
  })
})