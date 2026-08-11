const UNCATEGORIZED = 'Nezarazeno'

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

module.exports = { groupByCategory, UNCATEGORIZED }
