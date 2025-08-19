const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
require("dotenv").config();


const app = express();
app.use(cors());
app.use(express.json());

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});
const formatARS = n =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n);

function buildWhatsAppLink(phone, text) {
  const base = `https://wa.me/${phone}`;
  return `${base}?text=${encodeURIComponent(text)}`;
}

app.post("/comprar", async (req, res) => {
  try {
    const { email, codigoPostal, metodoPago, carrito, entrega,numOrden } = req.body;

    if (!email || !Array.isArray(carrito) || carrito.length === 0) {
      return res.status(400).json({ error: "Email y carrito son obligatorios" });
    }

    const total = carrito.reduce(
      (acum, p) => acum + Number(p.price) * Number(p.cantidad),
      0
    );


    const formatARS = n =>
      new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n);
    const lineas = carrito.map((p, i) =>
      `${i + 1}. ${p.name} x${p.cantidad} - ${formatARS(Number(p.price) * Number(p.cantidad))}`
    ).join("\n");

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
      entrega ? `\nEntrega: ${entrega}` : ""
    ].join("\n");

    const phone = process.env.WHATSAPP_PHONE;
    if (!phone) return res.status(500).json({ error: "Falta configurar WHATSAPP_PHONE" });

    const isMobile = /Android|iPhone|iPad|iPod/i.test(
  req.headers["user-agent"] || ""
);

  const waBase = isMobile
    ? "https://api.whatsapp.com/send/"
    : "https://web.whatsapp.com/send";


  const waLink = `${waBase}?phone=${phone}&text=${encodeURIComponent(mensaje)}&app_absent=0`;

    res.status(200).json({ success: true, waLink, total });

    const lista = carrito.map(p =>
      `<li><img src="${p.image}" width="60" /> ${p.name} x${p.cantidad} - $${p.price}</li>`
    ).join("");

    const mailOptions = {
      from: `"Tienda" <${process.env.EMAIL_USER}>`,
      to: [process.env.DESTINO, email],
      subject: "Confirmación de compra",
      html: `
        <h2>Gracias por tu compra</h2><span>Numero de orden: ${numOrden}</span>
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
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ API escuchando en http://localhost:${PORT}`);
});
const { MercadoPagoConfig, Preference } = require('mercadopago');

const mercadopago = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN
});

app.post("/crear-preferencia", async (req, res) => {
  const { carrito } = req.body;

  console.log("🛒 Carrito recibido:", carrito);

  try {

    if (!Array.isArray(carrito) || carrito.length === 0) {
      console.warn("⚠️ Carrito vacío o inválido");
      return res.status(400).json({ error: "Carrito vacío" });
    }

    const preference = new Preference(mercadopago);

    const response = await preference.create({
      body: {
        items: carrito.map(p => ({
          title: p.name,
          unit_price: Number(p.price),
          quantity: Number(p.cantidad),
          currency_id: "ARS"
        })
      ),
        back_urls: {
          success: "https://pagina-atria-accesorios.vercel.app/gracias.html",
          failure: "https://pagina-atria-accesorios.vercel.app/error.html",
          pending: "https://pagina-atria-accesorios.vercel.app/pending.html"
        },
        auto_return: "approved"
      }
    });

    res.json({ id: response.id, init_point: response.init_point });
  } catch (error) {
    console.error("Error al crear preferencia:", error);
    res.status(500).json({ error: "Error al generar la preferencia" });
  }
});
