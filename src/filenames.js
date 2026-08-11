function sanitizeForFilename(name) {
    return name.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '-')
}

function formatTimestamp(date) {
    const pad = (n) => String(n).padStart(2, '0')
    const ddmmyyyy = `${pad(date.getDate())}${pad(date.getMonth() + 1)}${date.getFullYear()}`
    const hhmmss = `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
    return `${ddmmyyyy}_${hhmmss}`
}

module.exports = { sanitizeForFilename, formatTimestamp }
