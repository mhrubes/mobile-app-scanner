class ScanSession {
    constructor() {
        this.lines = []
        this.subscribers = new Set()
        this.finished = false
    }

    addSubscriber(res) {
        this.subscribers.add(res)
        res.on('close', () => this.subscribers.delete(res))
    }

    broadcast(event, data) {
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
        for (const res of this.subscribers) res.write(payload)
    }

    logProgress(msg) {
        this.lines.push(msg)
        this.broadcast('progress', { message: msg })
    }

    finish(event, data) {
        this.finished = true
        this.broadcast(event, data)
        for (const res of this.subscribers) res.end()
        this.subscribers.clear()
    }
}

module.exports = { ScanSession }
