document.addEventListener('DOMContentLoaded', () => {
  fetch('header.html')
    .then(res => res.text())
    .then(html => {
      document.getElementById('header__nav').innerHTML = html

      
      setTimeout(() => {
        const carritoIcono = document.getElementById('cart-icon')

        carritoIcono.addEventListener('click', () => {
          window.location.href = 'carrito.html'
        })
      }, 0)
    })
    .catch(err => console.error('Error al cargar el header:', err))
})