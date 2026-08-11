const { execFile } = require('child_process')
const { promisify } = require('util')

const run = promisify(execFile)

async function isIosConnected() {
    try {
        const { stdout } = await run('idevice_id', ['-l'])
        return stdout.trim().length > 0
    } catch {
        return false
    }
}

function parseLine(line) {
    const match = line.match(/^([^,]+),\s*"([^"]*)",\s*"([^"]*)"/)
    if (!match) return null
    return {
        platform: 'ios',
        packageId: match[1].trim(),
        deviceName: match[3].trim()
    }
}

async function listIosApps({ includeSystem = false } = {}) {
    const args = includeSystem ? ['-l'] : ['-l', '-o', 'list_user']
    const { stdout } = await run('ideviceinstaller', args)
    return stdout
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map(parseLine)
        .filter(Boolean)
}

async function getIosDeviceName() {
    try {
        const { stdout } = await run('idevicename', [])
        const name = stdout.trim()
        if (name) return name
    } catch {
        // fall through to udid fallback
    }
    try {
        const { stdout } = await run('idevice_id', ['-l'])
        return stdout.trim().split('\n')[0] || 'ios'
    } catch {
        return 'ios'
    }
}

module.exports = { isIosConnected, listIosApps, getIosDeviceName }
