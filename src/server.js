const http = require('http')
const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')

const { runScan, listRuns, getRunData, deleteRun } = require('./scan')

const PORT = 4321
const PUBLIC_DIR = path.join(__dirname, '..', 'public')

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8'
}

let currentScan = null // { lines: [], subscribers: Set<res>, finished: boolean }

function broadcast(event, data) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
    for (const res of currentScan.subscribers) {
        res.write(payload)
    }
}

function addSubscriber(res) {
    currentScan.subscribers.add(res)
    res.on('close', () => currentScan?.subscribers.delete(res))
}

function sendJson(res, status, data) {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify(data))
}

function serveStatic(req, res, urlPath) {
    const relative = urlPath === '/' ? 'index.html' : urlPath.slice(1)
    const filePath = path.normalize(path.join(PUBLIC_DIR, relative))
    if (!filePath.startsWith(PUBLIC_DIR)) {
        res.writeHead(403)
        res.end('Forbidden')
        return
    }
    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
            res.end('Nenalezeno')
            return
        }
        const ext = path.extname(filePath)
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' })
        res.end(content)
    })
}

function handleStartScan(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive'
    })

    if (currentScan && !currentScan.finished) {
        res.write(`event: error\ndata: ${JSON.stringify({ message: 'Scan už probíhá, počkej na dokončení.' })}\n\n`)
        res.end()
        return
    }

    const includeSystem = new URL(req.url, `http://localhost:${PORT}`).searchParams.get('all') === 'true'
    currentScan = { lines: [], subscribers: new Set(), finished: false }
    addSubscriber(res)

    const onProgress = (msg) => {
        currentScan.lines.push(msg)
        broadcast('progress', { message: msg })
    }

    runScan({ includeSystem, onProgress })
        .then((result) => {
            currentScan.finished = true
            broadcast('done', result)
        })
        .catch((err) => {
            currentScan.finished = true
            broadcast('error', { message: err.message })
        })
        .finally(() => {
            for (const subscriber of currentScan.subscribers) subscriber.end()
            currentScan.subscribers.clear()
        })
}

function handleScanStatus(req, res) {
    sendJson(res, 200, { running: !!(currentScan && !currentScan.finished) })
}

function handleJoinScan(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive'
    })

    if (!currentScan || currentScan.finished) {
        res.end()
        return
    }

    for (const line of currentScan.lines) {
        res.write(`event: progress\ndata: ${JSON.stringify({ message: line })}\n\n`)
    }
    addSubscriber(res)
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
