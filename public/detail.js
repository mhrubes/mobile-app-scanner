import { formatDate } from './js/format.js'
import { renderCards, buildProcessLogCard, setAllCollapsed } from './js/detailCards.js'
import { wireSearch } from './js/search.js'
import { fetchRun } from './js/api.js'

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

expandAllBtn.addEventListener('click', () => setAllCollapsed(cardsEl, false))
collapseAllBtn.addEventListener('click', () => setAllCollapsed(cardsEl, true))

wireSearch({ cardsEl, searchInput, searchBtn, searchClearBtn, searchEmptyEl })

async function load() {
    if (!runId) {
        summaryEl.textContent = 'Chybí parametr běh v URL.'
        return
    }
    const data = await fetchRun(runId)
    if (!data) {
        summaryEl.textContent = 'Běh nenalezen.'
        return
    }
    renderSummary(data)

    processLogContainer.textContent = ''
    if (data.processLog && data.processLog.lines && data.processLog.lines.length > 0) {
        processLogContainer.appendChild(buildProcessLogCard(data.processLog))
    }

    renderCards(cardsEl, data.categories)
}

load()
