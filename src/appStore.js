async function fetchAppStoreInfo(bundleId) {
    try {
        const url = `https://itunes.apple.com/lookup?bundleId=${encodeURIComponent(bundleId)}&country=cz`
        const res = await fetch(url)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        const result = data.results && data.results[0]
        if (!result) return { name: null, description: null, genre: null, found: false }
        return {
            name: result.trackName,
            description: result.description,
            genre: result.primaryGenreName,
            found: true
        }
    } catch (err) {
        return { name: null, description: null, genre: null, found: false, error: err.message }
    }
}

module.exports = { fetchAppStoreInfo }
