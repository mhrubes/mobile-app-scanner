import { loadRuns } from './js/runList.js'
import { initScanClient } from './js/scanClient.js'

const scanBtn = document.getElementById('scanBtn')
const includeSystemBox = document.getElementById('includeSystem')
const logEl = document.getElementById('log')
const logTextEl = document.getElementById('logText')
const logCloseBtn = document.getElementById('logCloseBtn')
const runListEl = document.getElementById('runList')

loadRuns(runListEl)

initScanClient({
    scanBtn,
    includeSystemBox,
    logEl,
    logTextEl,
    logCloseBtn,
    onScanFinished: () => loadRuns(runListEl)
})
