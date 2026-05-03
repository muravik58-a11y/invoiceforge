// Phusion Passenger startup file for Namecheap Node.js hosting
// Passenger sets PORT automatically — Next.js must listen on it.

const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')

const port = parseInt(process.env.PORT, 10) || 3000
const app = next({ dev: false, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  createServer((req, res) => {
    handle(req, res, parse(req.url, true))
  }).listen(port, () => {
    console.log(`> InvoiceForge UK ready on port ${port}`)
  })
})
