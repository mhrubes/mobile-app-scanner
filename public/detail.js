const summaryEl = document.getElementById('summary')
const cardsEl = document.getElementById('cards')
const processLogContainer = document.getElementById('processLogContainer')
const expandAllBtn = document.getElementById('expandAllBtn')
const collapseAllBtn = document.getElementById('collapseAllBtn')
const searchInput = document.getElementById('searchInput')
const searchBtn = document.getElementById('searchBtn')
const searchClearBtn = document.getElementById('searchClearBtn')
const searchEmptyEl = document.getElementById('searchEmpty')

const runId = new URLSearchParams(window.location.search).get('run')

function formatDate(iso) {
    return new Date(iso).toLocaleString('cs-CZ')
}

function renderSummary(data) {
    summaryEl.textContent = ''
    const title = document.createElement('div')
    title.className = 'device'
    title.textContent = data.device
    const meta = document.createElement('div')
    meta.className = 'meta'
    meta.textContent = `${formatDate(data.generatedAt)} — ${data.totalApps} aplikací celkem`
    summaryEl.appendChild(title)
    summaryEl.appendChild(meta)
}

function buildCollapsibleCard(titleText, countText, contentEl, { collapsed = false, extraClass } = {}) {
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

function buildProcessLogCard(processLog) {
    const text = document.createElement('div')
    text.className = 'process-log-text'
    text.textContent = processLog.lines.join('\n')
    return buildCollapsibleCard('Průběh scanu', `${processLog.lines.length} řádků — ${formatDate(processLog.generatedAt)}`, text, {
        collapsed: true,
        extraClass: 'process-log'
    })
}

function renderCards(categories) {
    cardsEl.textContent = ''
    const entries = Object.entries(categories || {})

    if (entries.length === 0) {
        const empty = document.createElement('div')
        empty.className = 'empty'
        empty.textContent = 'V tomto běhu nejsou žádná data.'
        cardsEl.appendChild(empty)
        return
    }

    for (const [category, apps] of entries) {
        cardsEl.appendChild(buildCard(category, apps))
    }
}

function setAllCollapsed(collapsed) {
    for (const card of cardsEl.querySelectorAll('.card')) {
        card.classList.toggle('collapsed', collapsed)
        card.querySelector('.card-header').setAttribute('aria-expanded', String(!collapsed))
    }
}

expandAllBtn.addEventListener('click', () => setAllCollapsed(false))
collapseAllBtn.addEventListener('click', () => setAllCollapsed(true))

function runSearch() {
    const term = searchInput.value.trim().toLowerCase()
    const cards = cardsEl.querySelectorAll('.card')

    if (!term) {
        for (const card of cards) {
            card.classList.remove('search-hidden')
            for (const li of card.querySelectorAll('li')) li.classList.remove('search-hidden')
        }
        searchEmptyEl.hidden = true
        return
    }

    let visibleCount = 0
    for (const card of cards) {
        const categoryMatch = (card.dataset.category || '').includes(term)
        let anyMatch = categoryMatch

        for (const li of card.querySelectorAll('li')) {
            const match = categoryMatch || li.dataset.search.includes(term)
            li.classList.toggle('search-hidden', !match)
            if (match) anyMatch = true
        }

        card.classList.toggle('search-hidden', !anyMatch)
        if (anyMatch) {
            card.classList.remove('collapsed')
            card.querySelector('.card-header').setAttribute('aria-expanded', 'true')
            visibleCount++
        }
    }

    searchEmptyEl.hidden = visibleCount > 0
}

searchBtn.addEventListener('click', runSearch)
searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') runSearch()
})
searchInput.addEventListener('input', () => {
    const hasValue = searchInput.value.length > 0
    searchClearBtn.hidden = !hasValue
    searchBtn.disabled = !hasValue
})
searchClearBtn.addEventListener('click', () => {
    searchInput.value = ''
    searchClearBtn.hidden = true
    searchBtn.disabled = true
    runSearch()
    searchInput.focus()
})

async function load() {
    if (!runId) {
        summaryEl.textContent = 'Chybí parametr běh v URL.'
        return
    }
    const res = await fetch(`/api/runs/${encodeURIComponent(runId)}`)
    if (!res.ok) {
        summaryEl.textContent = 'Běh nenalezen.'
        return
    }
    const data = await res.json()
    renderSummary(data)

    processLogContainer.textContent = ''
    if (data.processLog && data.processLog.lines && data.processLog.lines.length > 0) {
        processLogContainer.appendChild(buildProcessLogCard(data.processLog))
    }

    renderCards(data.categories)
}

load()
