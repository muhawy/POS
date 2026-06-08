import { createReadStream, existsSync } from 'node:fs'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'node:http'
import { dirname } from 'node:path'
import { databasePath, seedDatabase } from './db.js'
import { seedData } from './seedData.js'
import {
  adjustProductStock,
  checkoutSale,
  createProduct,
  deleteProduct,
  getAllData,
  resetDemoDatabase,
  updateSettings,
} from './repository.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')
const distDir = join(rootDir, 'dist')
const port = Number(process.env.PORT) || 4173

seedDatabase(seedData)

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  })
  response.end(JSON.stringify(payload))
}

async function readBody(request) {
  let body = ''
  for await (const chunk of request) {
    body += chunk
  }
  return body ? JSON.parse(body) : {}
}

function serveStatic(request, response) {
  const requestedPath = new URL(request.url, `http://${request.headers.host}`).pathname
  const filePath = requestedPath === '/' ? join(distDir, 'index.html') : join(distDir, requestedPath)
  const targetPath = existsSync(filePath) ? filePath : join(distDir, 'index.html')

  if (!existsSync(targetPath)) {
    response.writeHead(404, { 'Content-Type': 'text/plain' })
    response.end('Build the frontend first with npm run build.')
    return
  }

  response.writeHead(200, { 'Content-Type': mimeTypes[extname(targetPath)] || 'application/octet-stream' })
  createReadStream(targetPath).pipe(response)
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`)

  if (request.method === 'OPTIONS') {
    sendJson(response, 204, {})
    return
  }

  try {
    if (url.pathname === '/api/health') {
      sendJson(response, 200, { ok: true })
      return
    }

    if (url.pathname === '/api/data' && request.method === 'GET') {
      sendJson(response, 200, getAllData())
      return
    }

    if (url.pathname === '/api/products' && request.method === 'POST') {
      const product = createProduct(await readBody(request))
      sendJson(response, 201, { product, data: getAllData() })
      return
    }

    const stockMatch = url.pathname.match(/^\/api\/products\/([^/]+)\/stock$/)
    if (stockMatch && request.method === 'PATCH') {
      const body = await readBody(request)
      const product = adjustProductStock(stockMatch[1], Number(body.amount))
      sendJson(response, 200, { product, data: getAllData() })
      return
    }

    const productMatch = url.pathname.match(/^\/api\/products\/([^/]+)$/)
    if (productMatch && request.method === 'DELETE') {
      deleteProduct(productMatch[1])
      sendJson(response, 200, { data: getAllData() })
      return
    }

    if (url.pathname === '/api/sales/checkout' && request.method === 'POST') {
      const sale = checkoutSale(await readBody(request))
      sendJson(response, 201, { sale, data: getAllData() })
      return
    }

    if (url.pathname === '/api/settings' && request.method === 'PATCH') {
      sendJson(response, 200, updateSettings(await readBody(request)))
      return
    }

    if (url.pathname === '/api/reset' && request.method === 'POST') {
      sendJson(response, 200, resetDemoDatabase())
      return
    }

    if (url.pathname.startsWith('/api/')) {
      sendJson(response, 404, { error: 'API route not found.' })
      return
    }

    serveStatic(request, response)
  } catch (error) {
    sendJson(response, 400, { error: error.message })
  }
})

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use.`)
    console.error('Stop the existing server or start this app with another port, for example: PORT=4174 npm start')
    process.exit(1)
  }

  throw error
})

server.listen(port, () => {
  console.log(`POS server running on http://localhost:${port}`)
  console.log(`SQLite database: ${databasePath}`)
})
