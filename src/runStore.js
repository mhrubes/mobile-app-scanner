const fs = require('fs')
const path = require('path')

const { groupByCategory } = require('./categorize')
const { sanitizeForFilename, formatTimestamp } = require('./filenames')

const OUTPUT_DIR = path.join(__dirname, '..', 'output')

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

function writeProcessLog(runDir, lines) {
    const processPath = path.join(runDir, 'process.json')
    fs.writeFileSync(processPath, JSON.stringify({ generatedAt: new Date().toISOString(), lines }, null, 2), 'utf8')
    return processPath
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

module.exports = { OUTPUT_DIR, writeOutputs, writeProcessLog, listRuns, getRunData, deleteRun }
