import { formatDate } from './format.js'
import { confirmDialog } from './confirmDialog.js'
import { fetchRuns, fetchRun, deleteRunRequest } from './api.js'

function buildRunRowContent(run) {
    const row = document.createElement('div')
    row.className = 'run-row'

    const left = document.createElement('div')
    const device = document.createElement('div')
    device.className = 'device'
    device.textContent = run.device
    const meta = document.createElement('div')
    meta.className = 'meta'
    meta.textContent =
        run.totalApps > 0
            ? `${formatDate(run.generatedAt)} — ${run.totalApps} aplikací, ${run.categoryCount} kategorií`
            : `${formatDate(run.generatedAt)} — žádná data`
    left.appendChild(device)
    left.appendChild(meta)

    const arrow = document.createElement('div')
    arrow.textContent = run.totalApps > 0 ? '→' : ''

    row.appendChild(left)
    row.appendChild(arrow)
    return row
}

function buildRunEntry(run, container) {
    const entry = document.createElement('div')
    entry.className = 'run-entry'

    const line = document.createElement('div')
    line.className = 'run-row-line'

    if (run.totalApps > 0) {
        const link = document.createElement('a')
        link.className = 'run-link'
        link.href = `/detail.html?run=${encodeURIComponent(run.id)}`
        link.appendChild(buildRunRowContent(run))
        line.appendChild(link)
    } else {
        const row = buildRunRowContent(run)
        row.classList.add('disabled')
        row.style.flex = '1'
        line.appendChild(row)
    }

    let panel = null

    if (run.hasProcessLog) {
        const toggle = document.createElement('button')
        toggle.type = 'button'
        toggle.className = 'run-log-toggle'
        toggle.setAttribute('aria-label', 'Zobrazit průběh scanu')
        toggle.setAttribute('aria-expanded', 'false')
        const chevron = document.createElement('span')
        chevron.className = 'chevron'
        chevron.textContent = '▾'
        toggle.appendChild(chevron)
        line.appendChild(toggle)

        panel = document.createElement('div')
        panel.className = 'run-log-panel'
        const panelInner = document.createElement('div')
        panelInner.className = 'run-log-panel-inner'
        const box = document.createElement('div')
        box.className = 'run-log-box'
        panelInner.appendChild(box)
        panel.appendChild(panelInner)

        let loaded = false
        toggle.addEventListener('click', async () => {
            const open = entry.classList.toggle('log-open')
            toggle.setAttribute('aria-expanded', String(open))
            if (open && !loaded) {
                loaded = true
                const text = document.createElement('div')
                text.className = 'process-log-text'
                text.textContent = 'Načítám…'
                box.appendChild(text)
                try {
                    const data = await fetchRun(run.id)
                    text.textContent =
                        data && data.processLog && data.processLog.lines
                            ? data.processLog.lines.join('\n')
                            : '(žádný záznam průběhu)'
                } catch {
                    text.textContent = 'Chyba při načítání průběhu.'
                }
            }
        })
    }

    const deleteBtn = document.createElement('button')
    deleteBtn.type = 'button'
    deleteBtn.className = 'run-delete'
    deleteBtn.setAttribute('aria-label', 'Smazat běh')
    deleteBtn.textContent = '🗑'
    deleteBtn.addEventListener('click', async () => {
        const label = run.totalApps > 0 ? `${run.device} — ${formatDate(run.generatedAt)}` : run.device
        const ok = await confirmDialog(`Opravdu smazat běh "${label}" a celou jeho složku? Tuto akci nelze vrátit zpět.`)
        if (!ok) return
        deleteBtn.disabled = true
        const success = await deleteRunRequest(run.id)
        if (success) {
            entry.remove()
            if (container.children.length === 0) loadRuns(container)
        } else {
            alert('Smazání běhu selhalo.')
            deleteBtn.disabled = false
        }
    })
    line.appendChild(deleteBtn)

    entry.appendChild(line)
    if (panel) entry.appendChild(panel)

    return entry
}

export async function loadRuns(container) {
    const runs = await fetchRuns()

    container.textContent = ''

    if (runs.length === 0) {
        const empty = document.createElement('div')
        empty.className = 'empty'
        empty.textContent = 'Zatím žádný běh. Spusť scan tlačítkem nahoře.'
        container.appendChild(empty)
        return
    }

    for (const run of runs) {
        container.appendChild(buildRunEntry(run, container))
    }
}
