const scanBtn = document.getElementById('scanBtn')
const includeSystemBox = document.getElementById('includeSystem')
const logEl = document.getElementById('log')
const logTextEl = document.getElementById('logText')
const logCloseBtn = document.getElementById('logCloseBtn')
const runListEl = document.getElementById('runList')

logCloseBtn.addEventListener('click', () => {
    logEl.classList.remove('visible')
})

function formatDate(iso) {
    return new Date(iso).toLocaleString('cs-CZ')
}

function confirmDialog(message) {
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

function buildRunEntry(run) {
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
                    const res = await fetch(`/api/runs/${encodeURIComponent(run.id)}`)
                    const data = await res.json()
                    text.textContent =
                        data.processLog && data.processLog.lines
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
        try {
            const res = await fetch(`/api/runs/${encodeURIComponent(run.id)}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('smazani selhalo')
            entry.remove()
            if (runListEl.children.length === 0) loadRuns()
        } catch {
            alert('Smazání běhu selhalo.')
            deleteBtn.disabled = false
        }
    })
    line.appendChild(deleteBtn)

    entry.appendChild(line)
    if (panel) entry.appendChild(panel)

    return entry
}

async function loadRuns() {
    const res = await fetch('/api/runs')
    const runs = await res.json()

    runListEl.textContent = ''

    if (runs.length === 0) {
        const empty = document.createElement('div')
        empty.className = 'empty'
        empty.textContent = 'Zatím žádný běh. Spusť scan tlačítkem nahoře.'
        runListEl.appendChild(empty)
        return
    }

    for (const run of runs) {
        runListEl.appendChild(buildRunEntry(run))
    }
}

function appendLog(line) {
    logEl.classList.add('visible')
    logTextEl.textContent += line + '\n'
    logEl.scrollTop = logEl.scrollHeight
}

function watchScan(source) {
    scanBtn.disabled = true
    logCloseBtn.hidden = true

    source.addEventListener('progress', (e) => {
        appendLog(JSON.parse(e.data).message)
    })

    source.addEventListener('done', (e) => {
        const result = JSON.parse(e.data)
        if (result.success) {
            appendLog(`Hotovo, uloženo jako běh: ${result.runId}`)
        } else {
            appendLog('Nenalezeno žádné připojené zařízení. Zkontroluj USB debugging / Trust This Computer.')
        }
        scanBtn.disabled = false
        logCloseBtn.hidden = false
        source.close()
        loadRuns()
    })

    source.addEventListener('error', (e) => {
        if (e.data) appendLog('Chyba: ' + JSON.parse(e.data).message)
        scanBtn.disabled = false
        logCloseBtn.hidden = false
        source.close()
    })
}

scanBtn.addEventListener('click', () => {
    logTextEl.textContent = ''
    logEl.classList.add('visible')
    const params = includeSystemBox.checked ? '?all=true' : ''
    watchScan(new EventSource(`/api/scan${params}`))
})

async function resumeScanIfRunning() {
    try {
        const res = await fetch('/api/scan/status')
        const status = await res.json()
        if (status.running) {
            logTextEl.textContent = ''
            logEl.classList.add('visible')
            watchScan(new EventSource('/api/scan/stream'))
        }
    } catch {
        // server nedostupny, ignorovat - beh nelze obnovit
    }
}

loadRuns()
resumeScanIfRunning()
