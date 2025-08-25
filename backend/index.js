// ====== imports & setup ======
const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
require("dotenv").config();

const { MercadoPagoConfig, Preference, Payment } = require("mercadopago");

const app = express();
app.use(cors());
app.use(express.json());

// ====== utils ======
const formatARS = n =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n);

function buildWhatsAppLink(phone, text) {
  const base = `https://wa.me/${phone}`;
  return `${base}?text=${encodeURIComponent(text)}`;
}

// ====== mailer ======
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

// ====== MP SDK ======
const mp = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });

// ====== ENDPOINT: crear preferencia ======
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
      // 🔔 importantísimo: tu webhook (debe ser público)
      notification_url: `${process.env.PUBLIC_URL}/webhook`,
      // datos extra opcionales
      metadata: { numOrden }
    };

    const response = await preference.create({ body });

    // Devolvés el init_point para redirigir desde el frontend
    return res.json({
      id: response.id,
      init_point: response.init_point
    });
  } catch (error) {
    console.error("Error al crear preferencia:", error?.message || error);
    return res.status(500).json({ error: "Error al generar la preferencia" });
  }
});

// ====== ENDPOINT: webhook (notificaciones de pago) ======
// Mercado Pago envía POST con querys como ?type=payment&data.id=123
app.post("/webhook", async (req, res) => {
  try {
    // Aceptar rápido para evitar reintentos excesivos
    res.sendStatus(200);

    const type = req.query.type || req.body?.type;
    const paymentId = req.query["data.id"] || req.body?.data?.id;

    if (type !== "payment" || !paymentId) {
      return;
    }

    // Consultar el pago
    const payment = await new Payment(mp).get({ id: paymentId.toString() });

    // Estados posibles: approved, pending, rejected, in_process, etc.
    const status = payment.status; // "approved", "rejected", "pending", ...
    const orderTotal = payment.transaction_amount;
    const payerEmail = payment.payer?.email;
    const preferenceId = payment.additional_info?.items?.[0]?.id || payment.preference_id;
    const externalMetadata = payment.metadata; // { numOrden: ... } si lo mandaste

    console.log("💳 Webhook pago:", {
      paymentId,
      status,
      orderTotal,
      payerEmail,
      preferenceId,
      externalMetadata
    });

    // TODO: acá actualizá tu orden en DB: set estado según "status"
    // if (status === "approved") { /* marcar pagado, descontar stock, etc. */ }

    // (Opcional) enviar mail de confirmación
    // await transporter.sendMail({ ... });

  } catch (err) {
    console.error("Error en webhook:", err?.message || err);
  }
});

// ====== ENDPOINT: redirecciones (opcional) ======
app.get("/success", (req, res) => {
  // MP agrega querys: payment_id, status, merchant_order_id, preference_id, collection_id, etc.
  const { payment_id, status, preference_id } = req.query;
  return res.send(
    ` <h1>¡Pago recibido!</h1>
      <p>Estado: ${status}</p>
      <p>Payment ID: ${payment_id}</p>
      <p>Preference ID: ${preference_id}</p>`
  );
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
      to: [process.env.DESTINO, email],
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