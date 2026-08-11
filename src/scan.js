const fs = require('fs')
const path = require('path')

const { isAndroidConnected, listAndroidApps, getAndroidDeviceName } = require('./android')
const { isIosConnected, listIosApps, getIosDeviceName } = require('./ios')
const { fetchPlayStoreInfo } = require('./playStore')
const { fetchAppStoreInfo } = require('./appStore')

const OUTPUT_DIR = path.join(__dirname, '..', 'output')
const DELAY_MS = 300
const UNCATEGORIZED = 'Nezarazeno'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function enrichAndroid(apps, onProgress) {
    const results = []
    for (const [i, app] of apps.entries()) {
        const info = await fetchPlayStoreInfo(app.packageId)
        onProgress(`  [Android ${i + 1}/${apps.length}] ${app.packageId} ... ${info.found ? 'OK' : 'nenalezeno'}`)
        results.push({
            platform: 'android',
            packageId: app.packageId,
            name: info.name || app.packageId,
            description: info.description || null,
            genre: info.genre || null,
            foundInStore: info.found
        })
        await sleep(DELAY_MS)
    }
    return results
}

async function enrichIos(apps, onProgress) {
    const results = []
    for (const [i, app] of apps.entries()) {
        const info = await fetchAppStoreInfo(app.packageId)
        onProgress(`  [iOS ${i + 1}/${apps.length}] ${app.packageId} ... ${info.found ? 'OK' : 'nenalezeno'}`)
        results.push({
            platform: 'ios',
            packageId: app.packageId,
            name: info.name || app.deviceName || app.packageId,
            description: info.description || null,
            genre: info.genre || null,
            foundInStore: info.found
        })
        await sleep(DELAY_MS)
    }
    return results
}

function groupByCategory(apps) {
    const groups = new Map()
    for (const app of apps) {
        const category = app.genre || UNCATEGORIZED
        if (!groups.has(category)) groups.set(category, [])
        groups.get(category).push(app)
    }
    for (const list of groups.values()) {
        list.sort((a, b) => a.name.localeCompare(b.name))
    }
    return new Map(
        [...groups.entries()].sort(([a], [b]) => {
            if (a === UNCATEGORIZED) return 1
            if (b === UNCATEGORIZED) return -1
            return a.localeCompare(b)
        })
    )
}

function sanitizeForFilename(name) {
    return name.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '-')
}

function formatTimestamp(date) {
    const pad = (n) => String(n).padStart(2, '0')
    const ddmmyyyy = `${pad(date.getDate())}${pad(date.getMonth() + 1)}${date.getFullYear()}`
    const hhmmss = `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
    return `${ddmmyyyy}_${hhmmss}`
}

function writeOutputs(apps, deviceLabel) {
    const runId = `${sanitizeForFilename(deviceLabel)}_${formatTimestamp(new Date())}`
    const runDir = path.join(OUTPUT_DIR, runId)
    fs.mkdirSync(runDir, { recursive: true })

    const grouped = groupByCategory(apps)
    const categoriesJson = {}
    for (const [category, list] of grouped) categoriesJson[category] = list

    const data = { device: deviceLabel, generatedAt: new Date().toISOString(), totalApps: apps.length, categories: categoriesJson }

    const jsonPath = path.join(runDir, 'data.json')
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8')

    const sections = [...grouped].map(([category, list]) => {
        const lines = list.map((app) => {
            const desc = app.description ? app.description.replace(/\s+/g, ' ').trim() : '(popis nenalezen)'
            return `[${app.platform}] ${app.name} (${app.packageId})\n  ${desc}`
        })
        return `=== ${category} (${list.length}) ===\n\n${lines.join('\n\n')}`
    })
    const txtPath = path.join(runDir, 'data.txt')
    fs.writeFileSync(txtPath, `Zarizeni: ${deviceLabel}\n\n${sections.join('\n\n\n')}`, 'utf8')

    return { runId, runDir, jsonPath, txtPath, data }
}

async function runScan({ includeSystem = false, onProgress = () => {} } = {}) {
    const logLines = []
    const log = (msg) => {
        logLines.push(msg)
        onProgress(msg)
    }

    log('Hledam pripojene zarizeni...')
    const [androidReady, iosReady] = await Promise.all([isAndroidConnected(), isIosConnected()])

    if (!androidReady && !iosReady) {
        return { success: false, reason: 'no-device' }
    }

    const allApps = []
    const deviceNames = []

    if (androidReady) {
        deviceNames.push(await getAndroidDeviceName())
        log('Android zarizeni nalezeno, ctu seznam aplikaci...')
        const apps = await listAndroidApps({ includeSystem })
        log(`Nalezeno ${apps.length} aplikaci, stahuji popisy z Google Play...`)
        allApps.push(...(await enrichAndroid(apps, log)))
    }

    if (iosReady) {
        deviceNames.push(await getIosDeviceName())
        log('iOS zarizeni nalezeno, ctu seznam aplikaci...')
        const apps = await listIosApps({ includeSystem })
        log(`Nalezeno ${apps.length} aplikaci, stahuji popisy z App Store...`)
        allApps.push(...(await enrichIos(apps, log)))
    }

    const deviceLabel = deviceNames.join('+') || 'unknown'
    log(`Hotovo. Ulozeno ${allApps.length} aplikaci.`)
    const { runId, runDir, jsonPath, txtPath } = writeOutputs(allApps, deviceLabel)

    const processPath = path.join(runDir, 'process.json')
    fs.writeFileSync(processPath, JSON.stringify({ generatedAt: new Date().toISOString(), lines: logLines }, null, 2), 'utf8')

    return { success: true, runId, totalApps: allApps.length, jsonPath, txtPath, processPath }
}

function listRuns() {
    if (!fs.existsSync(OUTPUT_DIR)) return []
    return fs
        .readdirSync(OUTPUT_DIR, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => {
            const dataPath = path.join(OUTPUT_DIR, entry.name, 'data.json')
            if (!fs.existsSync(dataPath)) return null
            try {
                const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
                return {
                    id: entry.name,
                    device: data.device,
                    generatedAt: data.generatedAt,
                    totalApps: data.totalApps,
                    categoryCount: Object.keys(data.categories || {}).length,
                    hasProcessLog: fs.existsSync(path.join(OUTPUT_DIR, entry.name, 'process.json'))
                }
            } catch {
                return null
            }
        })
        .filter(Boolean)
        .sort((a, b) => new Date(b.generatedAt) - new Date(a.generatedAt))
}

function resolveRunDir(runId) {
    if (!/^[A-Za-z0-9_.-]+$/.test(runId)) return null
    const runDir = path.join(OUTPUT_DIR, runId)
    if (!runDir.startsWith(OUTPUT_DIR)) return null
    return runDir
}

function getRunData(runId) {
    const runDir = resolveRunDir(runId)
    if (!runDir) return null
    const dataPath = path.join(runDir, 'data.json')
    if (!fs.existsSync(dataPath)) return null

    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'))

    const processPath = path.join(runDir, 'process.json')
    data.processLog = fs.existsSync(processPath) ? JSON.parse(fs.readFileSync(processPath, 'utf8')) : null

    return data
}

function deleteRun(runId) {
    const runDir = resolveRunDir(runId)
    if (!runDir || !fs.existsSync(runDir)) return false
    fs.rmSync(runDir, { recursive: true, force: true })
    return true
}

module.exports = { runScan, listRuns, getRunData, deleteRun, OUTPUT_DIR }
