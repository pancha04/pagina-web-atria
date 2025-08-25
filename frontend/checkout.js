async function cotizarEnvioRapidAPI(destinoCP,provinciaDestino) {
    const cpOrigen=1653;
    const peso=1;
    const provinciaOrigen = "AR-B"; 

    const options = {
        method: 'GET',
        headers: {
            'X-RapidAPI-Key': '5357cc441cmshe3c91c7f5589060p111d3bjsn6291cc7b9724',
            'X-RapidAPI-Host': 'correo-argentino1.p.rapidapi.com'
        }
    };

    const url = `https://correo-argentino1.p.rapidapi.com/calcularPrecio?cpOrigen=${cpOrigen}&cpDestino=${destinoCP}&provinciaOrigen=${provinciaOrigen}&provinciaDestino=${provinciaDestino}&peso=${peso}`;
    try {
        const response = await fetch(url, options);
        const data = await response.json();
        console.log("Respuesta RapidAPI:", data);

        return {
            sucursal: data.paqarClasico?.aSucursal ?? null,
            domicilio: data.paqarClasico?.aDomicilio ?? null
        };
    } catch (error) {
        console.error("Error al cotizar envío:", error);
        return { sucursal: null, domicilio: null };
    }
}
async function pagarConMP(carrito, numOrden) {
    const resp = await fetch("http://localhost:3000/crear-preferencia", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ carrito, numOrden })
    });
    const data = await resp.json();
    if (resp.ok && data.init_point) {
    window.location.href = data.init_point; // redirige al Checkout de MP
    } else {
    alert("No se pudo iniciar el pago");
    console.error("crear-preferencia error:", data);
    }
}


document.addEventListener("DOMContentLoaded", () => {
    const emailInput = document.getElementById("email");
    const codigoPostalInput = document.getElementById("codigoPostal");
    const metodoPagoInput = document.getElementById("metodoPago");
    const costoEnvioDOM = document.getElementById("costoEnvio");
    const confirmarBtn = document.getElementById("confirmarCompra");
    const entregaSelect = document.getElementById('entrega');
    const direccionSection = document.getElementById('direccionSection');
    const volverBtn=document.getElementById('button-back-checkout')

    volverBtn.addEventListener("click",()=>{
        window.history.back()
    })
    
    function mostrarDireccion(){
        if(entregaSelect.value==="correo"){
            direccionSection.style.display="flex"
        }else{
            direccionSection.style.display="none"
        }
    }
    entregaSelect.addEventListener('change', mostrarDireccion);
    mostrarDireccion(); 

    const provinciaDestino = "AR-B"; 
    codigoPostalInput.addEventListener("blur", async () => {
    const cp = codigoPostalInput.value.trim();

    if (cp.length >= 4 && cp.length <= 5) {
        costoEnvioDOM.innerText = "Calculando envío...";
        const resultado  = await cotizarEnvioRapidAPI(cp, provinciaDestino);
        console.log("Resultado RapidAPI:", resultado);
        if (resultado.sucursal !== null && resultado.domicilio !== null) {
    costoEnvioDOM.innerText = `
        Envío a sucursal: $${resultado.sucursal.toFixed(2)}\n
        Envío a domicilio: $${resultado.domicilio.toFixed(2)}
        `;
        } else {
            costoEnvioDOM.innerText = "No se pudo calcular el costo de envío.";
        }
    } else {
        costoEnvioDOM.innerText = '';
    }
});
function getRandomInt() {
    let min = Math.ceil(0)
    let max = Math.floor(1000)
    return Math.floor(Math.random() * (max - min + 1)) + min
}

confirmarBtn.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    const codigoPostal = codigoPostalInput.value.trim();
    const metodoPago = metodoPagoInput.value;
    const entrega = entregaSelect.value;
    const carrito = JSON.parse(localStorage.getItem("carrito")) || [];
    const numOrden = getRandomInt();

    if (!email || !carrito.length) {
    alert("Por favor completá todos los campos y agregá productos al carrito.");
    return;
    }

    try {
    confirmarBtn.disabled = true;
    confirmarBtn.textContent = "Redirigiendo a pago...";
    await pagarConMP(carrito, numOrden);
    } catch (err) {
    console.error("Error al crear preferencia:", err);
    alert("No se pudo conectar con el servidor.");
    } finally {
    confirmarBtn.disabled = false;
    confirmarBtn.textContent = "Confirmar compra";
    }
});
});