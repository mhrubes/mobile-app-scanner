import { fetchScanStatus, startScanSource, joinScanSource } from './api.js'

export function initScanClient({ scanBtn, includeSystemBox, logEl, logTextEl, logCloseBtn, onScanFinished }) {
    logCloseBtn.addEventListener('click', () => {
        logEl.classList.remove('visible')
    })

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
            onScanFinished()
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
        watchScan(startScanSource(includeSystemBox.checked))
    })

    async function resumeScanIfRunning() {
        try {
            const status = await fetchScanStatus()
            if (status.running) {
                logTextEl.textContent = ''
                logEl.classList.add('visible')
                watchScan(joinScanSource())
            }
        } catch {
            // server nedostupny, ignorovat - beh nelze obnovit
        }
    }

    resumeScanIfRunning()
}
