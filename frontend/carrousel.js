const contenedor = document.getElementById('products-destacados')
const btnLeft = document.querySelector('.buttons.left')
const btnRight = document.querySelector('.buttons.right')


function obtenerScrollPorProducto() {
  const product = contenedor.querySelector('.producto')
  return product ? product.offsetWidth + 20 : 200
}

btnLeft.addEventListener('click', () => {
  contenedor.scrollBy({ left: -obtenerScrollPorProducto(), behavior: 'smooth' })
})

btnRight.addEventListener('click', () => {
  contenedor.scrollBy({ left: obtenerScrollPorProducto(), behavior: 'smooth' })
})