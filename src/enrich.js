const { fetchPlayStoreInfo } = require('./playStore')
const { fetchAppStoreInfo } = require('./appStore')

const DELAY_MS = 300
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

module.exports = { enrichAndroid, enrichIos }
