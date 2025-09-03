
const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
require("dotenv").config();

const { MercadoPagoConfig, Preference, Payment } = require("mercadopago");

const app = express();
app.use(cors());
app.use(express.json());

app.use((req, _res, next) => {
  console.log(`[REQ] ${req.method} ${req.url}`);
  next();
});
const formatARS = n =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n);

function buildWhatsAppLink(phone, text) {
  const base = `https://wa.me/${phone}`;
  return `${base}?text=${encodeURIComponent(text)}`;
}


const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});


const mp = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });

app.post("/crear-preferencia", async (req, res) => {
  try {
    const { carrito, numOrden } = req.body;

    if (!Array.isArray(carrito) || carrito.length === 0) {
      return res.status(400).json({ error: "Carrito vacío" });
    }

    const preference = new Preference(mp);

    const body = {
      items: carrito.map(p => ({
        title: p.name,
        unit_price: Number(p.price),
        quantity: Number(p.cantidad),
        currency_id: "ARS"
      })),
      back_urls: {
        success: `${process.env.PUBLIC_URL}/success`,
        failure: `${process.env.PUBLIC_URL}/failure`,
        pending: `${process.env.PUBLIC_URL}/pending`
      },
      auto_return: "approved",
      notification_url: `${process.env.PUBLIC_URL}/webhook`,
      metadata: { numOrden }
    };

    const response = await preference.create({ body });

    return res.json({
      id: response.id,
      init_point: response.init_point
    });
  } catch (error) {
    console.error("Error al crear preferencia:", error?.message || error);
    return res.status(500).json({ error: "Error al generar la preferencia" });
  }
});

app.post("/webhook", async (req, res) => {
  try {
    res.sendStatus(200);

    const type = req.query.type || req.body?.type;
    const paymentId = req.query["data.id"] || req.body?.data?.id;
    if (type !== "payment" || !paymentId) return;

    const payment = await new Payment(mp).get({ id: String(paymentId) });

    if (payment.status === "approved") {
      const email = payment.payer?.email || process.env.DESTINO;
      const numOrden = payment.metadata?.numOrden;

      // armá tu HTML como quieras
      const html = `
        <h2>Pago aprobado</h2>
        ${numOrden ? `<p><strong>N° de orden:</strong> ${numOrden}</p>` : ""}
        <p><strong>Total:</strong> ${formatARS(payment.transaction_amount)}</p>
        <p><strong>Email comprador:</strong> ${email}</p>
      `;

      await transporter.sendMail({
        from: `"Tienda" <${process.env.EMAIL_USER}>`,
        to: [process.env.DESTINO, email],
        subject: `Pago aprobado ${numOrden ? `#${numOrden}` : ""}`,
        html
      });

      console.log("📧 Mail de pago aprobado enviado");
    }
  } catch (err) {
    console.error("Error en webhook:", err?.message || err);
  }
});

app.get("/success", async (req, res) => {
  try {
    
    // MP suele mandar payment_id o collection_id según el flujo
    const paymentId = req.query.payment_id || req.query.collection_id;

    // Armamos un texto para WhatsApp con algunos datos útiles
    let waText = "¡Hola! Ya realicé el pago y quiero coordinar mi pedido 🙌";
    if (paymentId) waText += `\nPago MP: ${paymentId}`;

    // Si querés más info real (importe, email, etc.), consultamos el pago:
    try {
      if (paymentId) {
        const p = await new Payment(mp).get({ id: String(paymentId) });
        const total = p?.transaction_amount;
        const email = p?.payer?.email;
        const numOrden = p?.metadata?.numOrden;
        waText += numOrden ? `\nN° de orden: ${numOrden}` : "";
        waText += total ? `\nTotal: $${total}` : "";
        waText += email ? `\nEmail: ${email}` : "";
      }
    } catch (e) {
      // si falla la consulta no rompemos la redirección
      console.error("No se pudo consultar el pago en /success:", e?.message || e);
    }

    const phone = process.env.WHATSAPP_PHONE; // ej: 54911XXXXXXXX
    if (!phone) {
      return res.status(500).send("<h1>Falta configurar WHATSAPP_PHONE en el servidor</h1>");
    }

    // Link universal de WhatsApp
    const waLink = `https://wa.me/${phone}?text=${encodeURIComponent(waText)}`;

    // Página intermedia: avisa y redirige en N segundos
    const segundos = 3; // cambialo si querés más/menos tiempo

    return res.send(`
      <!doctype html>
      <html lang="es">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Pago aprobado</title>
        <meta http-equiv="refresh" content="${segundos};url=${waLink}">
        <style>
          body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; 
                 display: grid; place-items: center; min-height: 100dvh; background:#fafafa; margin:0; }
          .card { background:#fff; padding:24px; border-radius:16px; box-shadow:0 10px 30px rgba(0,0,0,.08); max-width:520px; }
          h1 { margin:0 0 8px; font-size:26px; }
          p { margin:8px 0; line-height:1.5; color:#333; }
          .btn { display:inline-block; margin-top:16px; padding:12px 16px; border-radius:10px; 
                 text-decoration:none; background:#25D366; color:white; font-weight:600; }
          .muted { color:#666; font-size:14px; }
        </style>
      </head>
      <body>
        <main class="card">
          <h1>✅ Pago aprobado</h1>
          <p>Te vamos a dirigir al <strong>WhatsApp de la marca</strong> para coordinar tu entrega.</p>
          <p class="muted">Si no te redirige automáticamente en ${segundos} segundos, hacé clic en el botón:</p>
          <a class="btn" href="${waLink}">Ir ahora a WhatsApp</a>
        </main>
        <script>
          // Fallback JS por si el meta refresh es bloqueado
          try { localStorage.removeItem('carrito'); } catch (e) {}
          setTimeout(function(){ window.location.replace(${JSON.stringify(waLink)}); }, ${segundos * 1000});
        </script>
      </body>
      </html>
    `);
  } catch (e) {
    console.error("Error en /success:", e?.message || e);
    return res.status(500).send("<h1>Ocurrió un problema al procesar la redirección</h1>");
  }
});

app.get("/failure", (req, res) => {
  return res.send("<h1>Pago fallido</h1><p>Lo sentimos, tu pago no se pudo procesar.</p>");
});

app.get("/pending", (req, res) => {
  return res.send("<h1>Pago pendiente</h1><p>Estamos esperando la confirmación.</p>");
});

// ====== ENDPOINT: tu /comprar existente (lo dejo como lo tenías, con mínimos ajustes) ======
app.post("/comprar", async (req, res) => {
  try {
    const { email, codigoPostal, metodoPago, carrito, entrega, numOrden } = req.body;

    if (!email || !Array.isArray(carrito) || carrito.length === 0) {
      return res.status(400).json({ error: "Email y carrito son obligatorios" });
    }

    const total = carrito.reduce(
      (acum, p) => acum + Number(p.price) * Number(p.cantidad),
      0
    );

    const lineas = carrito
      .map((p, i) => `${i + 1}. ${p.name} x${p.cantidad} - ${formatARS(Number(p.price) * Number(p.cantidad))}`)
      .join("\n");

    const mensaje = [
      "¡Hola! Vengo del checkout y quiero confirmar mi compra 🙌",
      "",
      "🧾 Resumen del pedido:",
      lineas,
      `Total: ${formatARS(total)}`,
      "",
      "💳 Método de pago:",
      metodoPago || "No especificado",
      "",
      "📧 Contacto:",
      email,
      codigoPostal ? `\nCP: ${codigoPostal}` : "",
      entrega ? `\nEntrega: ${entrega}` : "",
      numOrden ? `\nN° Orden: ${numOrden}` : ""
    ].join("\n");

    const phone = process.env.WHATSAPP_PHONE;
    if (!phone) return res.status(500).json({ error: "Falta configurar WHATSAPP_PHONE" });

    const isMobile = /Android|iPhone|iPad|iPod/i.test(req.headers["user-agent"] || "");
    const waBase = isMobile ? "https://api.whatsapp.com/send/" : "https://web.whatsapp.com/send";
    const waLink = `${waBase}?phone=${phone}&text=${encodeURIComponent(mensaje)}&app_absent=0`;

    // responder al frontend
    res.status(200).json({ success: true, waLink, total });

    // mail (no bloqueante)
    const lista = carrito
      .map(p => `<li><img src="${p.image}" width="60" /> ${p.name} x${p.cantidad} - ${formatARS(Number(p.price) * Number(p.cantidad))}</li>`)
      .join("");

    const mailOptions = {
      from: `"Tienda" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Confirmación de compra ${numOrden ? `#${numOrden}` : ""}`,
      html: `
        <h2>Gracias por tu compra</h2>
        ${numOrden ? `<p><strong>N° de orden:</strong> ${numOrden}</p>` : ""}
        <p><strong>Método de pago:</strong> ${metodoPago || "-"}</p>
        <p><strong>Código Postal:</strong> ${codigoPostal || "-"}</p>
        <ul>${lista}</ul>
        <p><strong>Total:</strong> ${formatARS(total)}</p>
      `
    };

    transporter.sendMail(mailOptions).catch(err => {
      console.error("Error al enviar mail (no se interrumpe la compra):", err);
    });
  } catch (e) {
    console.error("Error /comprar:", e);
    res.status(500).json({ error: "Error interno al procesar la compra" });
  }
});

// ====== server listen ======
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ API escuchando en http://localhost:${PORT}`);
});

app.get("/mp/last", async (req, res) => {
  try {
    // Busca los últimos 10 pagos (más recientes primero)
    const paymentClient = new Payment(mp);
    const search = await paymentClient.search({
      qs: {
        sort: "date_created",
        criteria: "desc",
        limit: 10
      }
    });

    const items = (search?.results || []).map(r => ({
      id: r.id,
      date_created: r.date_created,
      status: r.status,
      status_detail: r.status_detail,
      amount: r.transaction_amount,
      payer_email: r.payer?.email,
      description: r.description,
    }));

    console.log("🔎 MP last payments:", items);
    return res.send(`<pre>${JSON.stringify(items, null, 2)}</pre>`);
  } catch (e) {
    console.error("Error /mp/last:", e?.message || e);
    return res.status(500).send("No se pudo listar pagos");
  }
});