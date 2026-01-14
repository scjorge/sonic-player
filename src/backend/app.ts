import 'reflect-metadata'
import express from 'express'
import cors from 'cors'
import path from 'path'

import routes from './routes'
import { AppDataSource } from './utils/db'

const PORT = process.env.PORT || 3001
const frontendPath = process.env.FRONTEND_BUILD_PATH || '/app/dist'


const app = express()
app.use(cors())
app.use(express.json())
app.use('/api', routes)
app.use(express.static(frontendPath))

app.get('*', (_req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'))
})

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
