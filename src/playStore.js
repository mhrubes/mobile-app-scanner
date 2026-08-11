let gplayPromise

async function getGplay() {
    if (!gplayPromise) {
        gplayPromise = import('google-play-scraper').then((mod) => mod.default || mod)
    }
    return gplayPromise
}

async function fetchPlayStoreInfo(packageId) {
    const gplay = await getGplay()
    try {
        const data = await gplay.app({ appId: packageId, lang: 'cs', country: 'cz' })
        return {
            name: data.title,
            description: data.summary || data.description,
            genre: data.genre,
            found: true
        }
    } catch (err) {
        return { name: null, description: null, genre: null, found: false, error: err.message }
    }
}

module.exports = { fetchPlayStoreInfo }
