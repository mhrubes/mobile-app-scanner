const fs = require('fs')
const path = require('path')

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8'
}

function createStaticServer(publicDir) {
    return function serveStatic(req, res, urlPath) {
        const relative = urlPath === '/' ? 'index.html' : urlPath.slice(1)
        const filePath = path.normalize(path.join(publicDir, relative))
        if (!filePath.startsWith(publicDir)) {
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
}

module.exports = { createStaticServer }
