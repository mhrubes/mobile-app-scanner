const { isAndroidConnected, listAndroidApps, getAndroidDeviceName } = require('./android')
const { isIosConnected, listIosApps, getIosDeviceName } = require('./ios')
const { enrichAndroid, enrichIos } = require('./enrich')
const { writeOutputs, writeProcessLog, listRuns, getRunData, deleteRun, OUTPUT_DIR } = require('./runStore')

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
    const processPath = writeProcessLog(runDir, logLines)

    return { success: true, runId, totalApps: allApps.length, jsonPath, txtPath, processPath }
}

module.exports = { runScan, listRuns, getRunData, deleteRun, OUTPUT_DIR }
