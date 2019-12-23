import path from 'path'
import express, { Router } from 'express'
import bodyParser from 'body-parser'
import open from 'open'
import qs from 'querystring'
import fs from 'fs'
import { Dree } from 'dree'

export function initServer (config: {
  root: string
  dirTree?: Dree
  filename?: string
  port: number
  open?: boolean
  edit?: boolean
}) {
  const app = express()

  try {
    app.use(require('cors')())
  } catch (e) {}

  const apiRouter = Router()
  apiRouter.use(bodyParser.json())

  apiRouter.get('/', (req, res) => {
    res.json(config)
  })

  apiRouter.get('/data', (req, res) => {
    const { filename } = req.query
    try {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
      res.sendFile(resolveFilename(filename, config))
    } catch (e) {
      console.error(e)
      res.sendStatus(404)
    }
  })

  apiRouter.put('/data', (req, res) => {
    const { filename, content } = req.body
    fs.writeFileSync(resolveFilename(filename, config), content)
    res.sendStatus(201)
  })

  app.use('/api', apiRouter)
  app.use(express.static(path.join(__dirname, '../dist/web')))
  app.use('/reveal', express.static(path.resolve(require.resolve('reveal.js'), '../..')))
  app.use('/reveal-md', express.static(path.resolve(require.resolve('@reveal-quiz/reveal'), '..')))

  app.listen(config.port, () => {
    console.log(`Server running at http://localhost:${config.port}`)

    if (config.open) {
      if (!config.filename || config.edit) {
        open(`http://localhost:${config.port}/`)
      } else {
        open(`http://localhost:${config.port}/reveal/?${qs.stringify({
          filename: config.filename,
        })}`)
      }
    }
  })
}

function resolveFilename (q: string, config: {
  root: string
  filename?: string
}) {
  if (q.startsWith('~/') || !config.filename) {
    return path.resolve(config.root, q.replace(/^~\//, ''))
  } else {
    return path.resolve(config.filename, '..', q)
  }
}
