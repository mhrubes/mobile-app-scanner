export function buildCollapsibleCard(titleText, countText, contentEl, { collapsed = false, extraClass } = {}) {
    const card = document.createElement('div')
    card.className = extraClass ? `card ${extraClass}` : 'card'
    if (collapsed) card.classList.add('collapsed')

    const header = document.createElement('button')
    header.className = 'card-header'
    header.type = 'button'
    header.setAttribute('aria-expanded', String(!collapsed))

    const title = document.createElement('div')
    title.className = 'title'
    const h3 = document.createElement('h3')
    h3.textContent = titleText
    const count = document.createElement('div')
    count.className = 'count'
    count.textContent = countText
    title.appendChild(h3)
    title.appendChild(count)

    const chevron = document.createElement('span')
    chevron.className = 'chevron'
    chevron.textContent = '▾'

    header.appendChild(title)
    header.appendChild(chevron)

    const collapsible = document.createElement('div')
    collapsible.className = 'collapsible'
    const inner = document.createElement('div')
    inner.className = 'collapsible-inner'
    inner.appendChild(contentEl)
    collapsible.appendChild(inner)

    header.addEventListener('click', () => {
        const nowCollapsed = card.classList.toggle('collapsed')
        header.setAttribute('aria-expanded', String(!nowCollapsed))
    })

    card.appendChild(header)
    card.appendChild(collapsible)
    return card
}
