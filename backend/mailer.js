const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
    }
});

async function enviarMail(cliente, carrito) {
    const lista = carrito.map(p => `<li>${p.image} ${p.name} x${p.cantidad} - $${p.price}</li>`).join("")
    const total=carrito.reduce((acum,p)=>acum+p.price*p.cantidad,0)

    const mailOptions = {
    from: `"Tienda" <${process.env.EMAIL_USER}>`,
    to: cliente.email,
    subject: `Nueva compra de ${cliente.nombre}`,
    html: `
        <h3>Detalles del pedido</h3>
        <p>Cliente: ${cliente.nombre} (${cliente.email})</p>
        <ul>${lista}</ul>
        <p><strong>Total:</strong> $${total}</p>
    `
    };
    await transporter.sendMail(mailOptions);
}
module.exports = enviarMail;