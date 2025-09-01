document.addEventListener("DOMContentLoaded", ()=>{
    fetch('sidebar.html')
    .then(res => res.text())
    .then(html => {
    document.getElementById('sidebar__wrapper').innerHTML = html

    const waitForToggle = () => {
        const toggle = document.getElementById('menu-toggle')
        const menu = document.getElementById('side-menu')
        const overlay = document.getElementById('overlay')
        const menuPulseras=document.getElementById("menu-pulseras")
        const pulseras=document.getElementById("pulseras")
        const menuCollares=document.getElementById("menu-collares")
        const collares=document.getElementById("collares")
        const menuCapsulas=document.getElementById("menu-capsulas")
        const capsulas=document.getElementById("capsulas")

        if (toggle && menu && overlay) {
            console.log('✅ Elementos encontrados')

            toggle.addEventListener('click', () => {
                menu.classList.toggle('open')
                overlay.classList.toggle('show')
            })
            menuCapsulas.addEventListener("click", ()=>{
                capsulas.classList.toggle("open")
            })
            menuPulseras.addEventListener('click', () => {
                pulseras.classList.toggle('open')
            })
            menuCollares.addEventListener('click', () => {
                collares.classList.toggle('open')
            })
            overlay.addEventListener('click', () => {
                menu.classList.remove('open')
                overlay.classList.remove('show')
            })
            document.querySelectorAll('.side-menu a').forEach(link => {
                link.addEventListener('click', () => {
                menu.classList.remove('open')
                overlay.classList.remove('show')
            })
        })
        } else {
        console.warn('⏳ Esperando elementos...')
        setTimeout(waitForToggle, 50)
        }
    }

    waitForToggle()
    })
    .catch(err => console.error('❌ Error cargando sidebar:', err))
})