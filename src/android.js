const { execFile } = require('child_process')
const { promisify } = require('util')

const run = promisify(execFile)

async function isAndroidConnected() {
    try {
        const { stdout } = await run('adb', ['devices'])
        return stdout
            .split('\n')
            .slice(1)
            .some((line) => line.trim().endsWith('device'))
    } catch {
        return false
    }
}

async function listAndroidApps({ includeSystem = false } = {}) {
    const args = includeSystem ? ['shell', 'pm', 'list', 'packages'] : ['shell', 'pm', 'list', 'packages', '-3']
    const { stdout } = await run('adb', args)
    return stdout
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.startsWith('package:'))
        .map((line) => ({
            platform: 'android',
            packageId: line.replace('package:', '').trim()
        }))
}

async function getAndroidDeviceName() {
    try {
        const { stdout } = await run('adb', ['shell', 'getprop', 'ro.product.model'])
        const name = stdout.trim()
        if (name) return name
    } catch {
        // fall through to serial fallback
    }
    try {
        const { stdout } = await run('adb', ['devices'])
        const line = stdout.split('\n').slice(1).find((l) => l.trim().endsWith('device'))
        return line ? line.split('\t')[0].trim() : 'android'
    } catch {
        return 'android'
    }
}

module.exports = { isAndroidConnected, listAndroidApps, getAndroidDeviceName }
