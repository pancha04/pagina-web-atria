document.addEventListener('DOMContentLoaded', () => {
    fetch("footer.html")
    .then(res=> res.text())
    .then(html=>{
        document.getElementById("footer").innerHTML=html;
    })
    .catch(err => console.error('Error al cargar el header:', err))
})
