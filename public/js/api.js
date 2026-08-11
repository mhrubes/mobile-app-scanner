export async function fetchRuns() {
    const res = await fetch('/api/runs')
    return res.json()
}

export async function fetchRun(runId) {
    const res = await fetch(`/api/runs/${encodeURIComponent(runId)}`)
    if (!res.ok) return null
    return res.json()
}

export async function deleteRunRequest(runId) {
    const res = await fetch(`/api/runs/${encodeURIComponent(runId)}`, { method: 'DELETE' })
    return res.ok
}

export async function fetchScanStatus() {
    const res = await fetch('/api/scan/status')
    return res.json()
}

export function startScanSource(includeSystem) {
    const params = includeSystem ? '?all=true' : ''
    return new EventSource(`/api/scan${params}`)
}

export function joinScanSource() {
    return new EventSource('/api/scan/stream')
}
