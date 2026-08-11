const http = require('http')
const path = require('path')
const { exec } = require('child_process')

const { runScan, listRuns, getRunData, deleteRun } = require('./scan')
const { ScanSession } = require('./scanSession')
const { createStaticServer } = require('./staticServer')

const PORT = 4321
const PUBLIC_DIR = path.join(__dirname, '..', 'public')

const serveStatic = createStaticServer(PUBLIC_DIR)

let session = null // ScanSession | null

function sendJson(res, status, data) {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify(data))
}

function openSseResponse(res) {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive'
    })
}

function handleStartScan(req, res) {
    openSseResponse(res)

    if (session && !session.finished) {
        res.write(`event: error\ndata: ${JSON.stringify({ message: 'Scan už probíhá, počkej na dokončení.' })}\n\n`)
        res.end()
        return
    }

    const includeSystem = new URL(req.url, `http://localhost:${PORT}`).searchParams.get('all') === 'true'
    session = new ScanSession()
    session.addSubscriber(res)

    runScan({ includeSystem, onProgress: (msg) => session.logProgress(msg) })
        .then((result) => session.finish('done', result))
        .catch((err) => session.finish('error', { message: err.message }))
}

function handleScanStatus(req, res) {
    sendJson(res, 200, { running: !!(session && !session.finished) })
}

function handleJoinScan(req, res) {
    openSseResponse(res)

    if (!session || session.finished) {
        res.end()
        return
    }

    for (const line of session.lines) {
        res.write(`event: progress\ndata: ${JSON.stringify({ message: line })}\n\n`)
    }
    session.addSubscriber(res)
}

const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`)

    if (url.pathname === '/api/runs' && req.method === 'GET') {
        sendJson(res, 200, listRuns())
        return
    }

    if (url.pathname.startsWith('/api/runs/') && req.method === 'GET') {
        const runId = decodeURIComponent(url.pathname.slice('/api/runs/'.length))
        const data = getRunData(runId)
        if (!data) {
            sendJson(res, 404, { error: 'Běh nenalezen' })
            return
        }
        sendJson(res, 200, data)
        return
    }

    if (url.pathname.startsWith('/api/runs/') && req.method === 'DELETE') {
        const runId = decodeURIComponent(url.pathname.slice('/api/runs/'.length))
        const deleted = deleteRun(runId)
        if (!deleted) {
            sendJson(res, 404, { error: 'Běh nenalezen' })
            return
        }
        sendJson(res, 200, { deleted: true })
        return
    }

    if (url.pathname === '/api/scan' && req.method === 'GET') {
        handleStartScan(req, res)
        return
    }

    if (url.pathname === '/api/scan/status' && req.method === 'GET') {
        handleScanStatus(req, res)
        return
    }

    if (url.pathname === '/api/scan/stream' && req.method === 'GET') {
        handleJoinScan(req, res)
        return
    }

    serveStatic(req, res, url.pathname)
})

server.listen(PORT, () => {
    const url = `http://localhost:${PORT}`
    console.log(`Server bezi na ${url}`)
    if (process.platform === 'win32') {
        exec(`start "" "${url}"`)
    }
})
