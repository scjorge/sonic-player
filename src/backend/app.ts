import 'reflect-metadata'
import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'

import routes from './routes'
import { AppDataSource } from './utils/db'

const app = express()
app.use(cors())
app.use(express.json())

app.use('/api', routes)

// ===== frontend (produção) =====
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

//const frontendPath = path.join(__dirname, 'public')
const frontendPath = '/dist'
console.log('Serving frontend from:', frontendPath)
app.use(express.static(frontendPath))

app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'))
})

const PORT = process.env.PORT || 3001

AppDataSource.initialize()
  .then(() => {
    console.log('Database initialized')
    app.listen(PORT, () => {
      console.log(`Server listening on ${PORT}`)
    })
  })
  .catch((err) => {
    console.error('Failed to initialize database', err)
    process.exit(1)
  })
