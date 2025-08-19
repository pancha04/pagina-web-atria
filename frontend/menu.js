document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ DOM completamente cargado')

    const menuToggle = document.getElementById('menu-toggle')
    const sideMenu = document.getElementById('side-menu')
    const overlay = document.getElementById('overlay')

    if (menuToggle && sideMenu && overlay) {
    menuToggle.addEventListener('click', () => {
        console.log('🔥 BOTÓN CLICKEADO')
        sideMenu.classList.toggle('open')
        overlay.classList.toggle('show')
    })

    overlay.addEventListener('click', () => {
        sideMenu.classList.remove('open')
        overlay.classList.remove('show')
    })
    } else {
    console.warn('❌ Faltan elementos del DOM')
    }
})