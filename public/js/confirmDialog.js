export function confirmDialog(message) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div')
        overlay.className = 'modal-overlay'

        const box = document.createElement('div')
        box.className = 'modal-box'

        const text = document.createElement('p')
        text.textContent = message
        box.appendChild(text)

        const actions = document.createElement('div')
        actions.className = 'modal-actions'

        const cancelBtn = document.createElement('button')
        cancelBtn.type = 'button'
        cancelBtn.className = 'secondary'
        cancelBtn.textContent = 'Zrušit'

        const confirmBtn = document.createElement('button')
        confirmBtn.type = 'button'
        confirmBtn.className = 'btn-danger'
        confirmBtn.textContent = 'Smazat'

        actions.appendChild(cancelBtn)
        actions.appendChild(confirmBtn)
        box.appendChild(actions)
        overlay.appendChild(box)
        document.body.appendChild(overlay)

        function close(result) {
            document.removeEventListener('keydown', onKeydown)
            overlay.remove()
            resolve(result)
        }

        function onKeydown(e) {
            if (e.key === 'Escape') close(false)
        }

        cancelBtn.addEventListener('click', () => close(false))
        confirmBtn.addEventListener('click', () => close(true))
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) close(false)
        })
        document.addEventListener('keydown', onKeydown)
        confirmBtn.focus()
    })
}
