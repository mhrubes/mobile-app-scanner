export function wireSearch({ cardsEl, searchInput, searchBtn, searchClearBtn, searchEmptyEl }) {
    function runSearch() {
        const term = searchInput.value.trim().toLowerCase()
        const cards = cardsEl.querySelectorAll('.card')

        if (!term) {
            for (const card of cards) {
                card.classList.remove('search-hidden')
                for (const li of card.querySelectorAll('li')) li.classList.remove('search-hidden')
            }
            searchEmptyEl.hidden = true
            return
        }

        let visibleCount = 0
        for (const card of cards) {
            const categoryMatch = (card.dataset.category || '').includes(term)
            let anyMatch = categoryMatch

            for (const li of card.querySelectorAll('li')) {
                const match = categoryMatch || li.dataset.search.includes(term)
                li.classList.toggle('search-hidden', !match)
                if (match) anyMatch = true
            }

            card.classList.toggle('search-hidden', !anyMatch)
            if (anyMatch) {
                card.classList.remove('collapsed')
                card.querySelector('.card-header').setAttribute('aria-expanded', 'true')
                visibleCount++
            }
        }

        searchEmptyEl.hidden = visibleCount > 0
    }

    searchBtn.addEventListener('click', runSearch)
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') runSearch()
    })
    searchInput.addEventListener('input', () => {
        const hasValue = searchInput.value.length > 0
        searchClearBtn.hidden = !hasValue
        searchBtn.disabled = !hasValue
    })
    searchClearBtn.addEventListener('click', () => {
        searchInput.value = ''
        searchClearBtn.hidden = true
        searchBtn.disabled = true
        runSearch()
        searchInput.focus()
    })
}
