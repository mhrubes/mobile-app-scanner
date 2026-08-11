import { formatDate } from './format.js'
import { buildCollapsibleCard } from './collapsible.js'

function buildCard(category, apps) {
    const ul = document.createElement('ul')
    for (const app of apps) {
        const li = document.createElement('li')
        li.dataset.search = `${app.name} ${app.description || ''}`.toLowerCase()
        const name = document.createElement('div')
        name.className = 'name'
        name.textContent = app.name
        const desc = document.createElement('div')
        desc.className = 'desc'
        desc.textContent = app.description || '(popis nenalezen)'
        li.appendChild(name)
        li.appendChild(desc)
        ul.appendChild(li)
    }
    const card = buildCollapsibleCard(category, `${apps.length} aplikací`, ul)
    card.dataset.category = category.toLowerCase()
    return card
}

export function buildProcessLogCard(processLog) {
    const text = document.createElement('div')
    text.className = 'process-log-text'
    text.textContent = processLog.lines.join('\n')
    return buildCollapsibleCard('Průběh scanu', `${processLog.lines.length} řádků — ${formatDate(processLog.generatedAt)}`, text, {
        collapsed: true,
        extraClass: 'process-log'
    })
}

export function renderCards(container, categories) {
    container.textContent = ''
    const entries = Object.entries(categories || {})

    if (entries.length === 0) {
        const empty = document.createElement('div')
        empty.className = 'empty'
        empty.textContent = 'V tomto běhu nejsou žádná data.'
        container.appendChild(empty)
        return
    }

    for (const [category, apps] of entries) {
        container.appendChild(buildCard(category, apps))
    }
}

export function setAllCollapsed(container, collapsed) {
    for (const card of container.querySelectorAll('.card')) {
        card.classList.toggle('collapsed', collapsed)
        card.querySelector('.card-header').setAttribute('aria-expanded', String(!collapsed))
    }
}
