document.addEventListener("DOMContentLoaded",()=>{
    const contenedor=document.getElementById("cart-container");
    const totalDOM = document.getElementById("cart-total") 
    const iniciarBtn = document.getElementById('iniciar-compra') 
    const volverBtn=document.getElementById('button-back-carrito')
    
    volverBtn.addEventListener("click",()=>{
        window.history.back()
    })

    function renderCarrito() {
    let carrito = JSON.parse(localStorage.getItem('carrito')) || []
    
    carrito=carrito.filter(p=>p.cantidad>0);
    localStorage.setItem("carrito",JSON.stringify(carrito))

    contenedor.innerHTML = ''
    let total = 0
    
    if (carrito.length === 0) {
        contenedor.innerHTML = '<p>El carrito está vacío.</p>'
        totalDOM.remove()
        iniciarBtn.remove()
        return
    }

    carrito.forEach(producto => {
        const item=document.createElement("div");
        item.className="cart-item";
        item.innerHTML=`
            <div class="cart-product-left">
                <div class="cart-product-img">
                    <img src="${producto.image}" alt="${producto.name}" class="cart-item-image">
                </div>
                <div class="cart-product-info">
                    <span>${producto.name}</span>
                    <div class="cart-product-quantity" data-id="${producto.id}">
                        <button class="btn btn-decrement">-</button>
                        <input class="cart-quantity-input" type="number" id="cantidad" value="${producto.cantidad}" min="1" readonly>
                        <button class="btn btn-increment">+</button>
                    </div>
                </div>
            </div>
                <div class="cart-product-right">
                    <button class="eliminar-btn" data-id="${producto.id}"><i class="bi bi-trash"></i></button>
                    <span>${producto.price*producto.cantidad}</span>
                </div>
            </div>
        `
        contenedor.appendChild(item);
        total+=producto.price*producto.cantidad;
    });
    
    totalDOM.textContent=`Total: $${total}`;
    

    document.querySelectorAll(".btn-decrement").forEach(btn=>{
        btn.addEventListener("click",()=>{
        const id=parseInt(btn.parentElement.dataset.id);

        let carrito = JSON.parse(localStorage.getItem('carrito')) || []
        const producto = carrito.find(p => p.id === id)
        if (producto && producto.cantidad > 0) {
            producto.cantidad -= 1
            localStorage.setItem('carrito', JSON.stringify(carrito))
            renderCarrito()
        }
        })
    })
    document.querySelectorAll(".btn-increment").forEach(btn=>{
        btn.addEventListener("click",()=>{
        const id=parseInt(btn.parentElement.dataset.id);

        let carrito = JSON.parse(localStorage.getItem('carrito')) || []
        const producto = carrito.find(p => p.id === id)
        if (producto) {
            producto.cantidad += 1
            localStorage.setItem('carrito', JSON.stringify(carrito))
            renderCarrito()
        }
        })
    })

    document.querySelectorAll('.eliminar-btn').forEach(btn => {
        btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id)
        eliminarProducto(id)
        })
    })
    }
    function eliminarProducto(id){
        let carrito = JSON.parse(localStorage.getItem('carrito')) || []
        carrito= carrito.filter(p=>p.id!==id);
        localStorage.setItem('carrito', JSON.stringify(carrito))
        renderCarrito()
    }
    iniciarBtn.addEventListener('click', () => {
        const carrito = JSON.parse(localStorage.getItem('carrito')) || []
        window.location.href = 'checkout.html'
        renderCarrito()
    })
    renderCarrito();
})
window.addEventListener('pageshow', (e) => {
  if (e.persisted) {
    // la página vino del cache del navegador
    renderCarrito();
  }
});