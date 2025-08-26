async function cotizarEnvioRapidAPI(destinoCP, provinciaDestino) {
  const cpOrigen = 1653;
  const peso = 1;
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

// === IR A MP (igual, pero acepta metodoPago por si lo necesitás en el backend) ===
async function pagarConMP(carrito, numOrden, metodoPago) {
  const resp = await fetch("http://localhost:3000/crear-preferencia", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ carrito, numOrden, metodoPago })
  });
  const data = await resp.json();
  if (resp.ok && data.init_point) {
    window.location.href = data.init_point;
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
  const volverBtn = document.getElementById('button-back-checkout');

  volverBtn.addEventListener("click", () => {
    window.history.back();
  });

  function mostrarDireccion() {
    if (entregaSelect.value === "correo") {
      direccionSection.style.display = "flex";
    } else {
      direccionSection.style.display = "none";
    }
  }
  entregaSelect.addEventListener('change', mostrarDireccion);
  mostrarDireccion();

  const provinciaDestino = "AR-B";
  codigoPostalInput.addEventListener("blur", async () => {
    const cp = codigoPostalInput.value.trim();

    if (cp.length >= 4 && cp.length <= 5) {
      costoEnvioDOM.innerText = "Calculando envío...";
      const resultado = await cotizarEnvioRapidAPI(cp, provinciaDestino);
      console.log("Resultado RapidAPI:", resultado);
      if (resultado.sucursal !== null && resultado.domicilio !== null) {
        costoEnvioDOM.innerText =
          `Envío a sucursal: $${resultado.sucursal.toFixed(2)}\n` +
          `Envío a domicilio: $${resultado.domicilio.toFixed(2)}`;
      } else {
        costoEnvioDOM.innerText = "No se pudo calcular el costo de envío.";
      }
    } else {
      costoEnvioDOM.innerText = '';
    }
  });

  function getRandomInt() {
    let min = Math.ceil(0);
    let max = Math.floor(1000);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // === RAMIFICACIÓN POR MÉTODO DE PAGO ===
  confirmarBtn.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    const codigoPostal = codigoPostalInput.value.trim();
    const metodoPago = metodoPagoInput.value; // "mp" | "efectivo"
    const entrega = entregaSelect.value;
    const carrito = JSON.parse(localStorage.getItem("carrito")) || [];
    const numOrden = getRandomInt();

    if (!email || !carrito.length) {
      alert("Por favor completá todos los campos y agregá productos al carrito.");
      return;
    }

    try {
      confirmarBtn.disabled = true;
      confirmarBtn.textContent = "Procesando...";

      // 1) Siempre registramos la orden y enviamos mail/WA desde el backend
      const resCompra = await fetch("http://localhost:3000/comprar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, codigoPostal, metodoPago, carrito, entrega, numOrden })
      });
      const dataCompra = await resCompra.json();

      if (!resCompra.ok) {
        console.error("Error /comprar:", dataCompra);
        alert("No pudimos registrar tu pedido.");
        return;
      }

      // 2) Si es EFECTIVO: NO vamos a MP → redirigimos a WhatsApp
      if (metodoPago === "efectivo") {
        if (dataCompra.waLink) {
          window.location.href = dataCompra.waLink;
        } else {
          alert("Pedido registrado. Te contactamos para coordinar el pago en efectivo.");
        }
        return; // No llamar a MP
      }

      // 3) Si es MP: crear preferencia y redirigir al checkout de Mercado Pago
      await pagarConMP(carrito, numOrden, metodoPago);

    } catch (err) {
      console.error("Error en checkout:", err);
      alert("Ocurrió un error iniciando la compra.");
    } finally {
      confirmarBtn.disabled = false;
      confirmarBtn.textContent = "Confirmar compra";
    }
  });
});