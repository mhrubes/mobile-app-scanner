function initThemeToggle(button) {
    const knob = document.createElement('span')
    knob.className = 'knob'
    knob.textContent = document.documentElement.dataset.theme === 'dark' ? '\u{1F319}' : '☀️'
    button.appendChild(knob)

    button.addEventListener('click', () => {
        const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'
        document.documentElement.dataset.theme = next
        localStorage.setItem('theme', next)
        knob.textContent = next === 'dark' ? '\u{1F319}' : '☀️'
    })
}

document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('themeToggle')
    if (toggle) initThemeToggle(toggle)
})
