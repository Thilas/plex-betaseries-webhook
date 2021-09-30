import express, { NextFunction, Request, Response } from "express"
import { Server } from "http"
import { BetaSeries } from "./betaseries/betaseries"
import { logger } from "./logger"
import { usePlexWebhook } from "./plex/plex"

type ServerConfig = {
  readonly url?: string
  readonly port?: number
  readonly temp?: string
}

export function initializeServer(betaSeries: BetaSeries, serverConfig?: ServerConfig, listen = false) {
  const app = express()

  const port = serverConfig?.port ?? 12000
  const urlPort = port === 80 ? "" : `:${port}`
  const url = serverConfig?.url ?? `http://localhost${urlPort}/`
  usePlexWebhook(app, url, { dest: serverConfig?.temp }, betaSeries)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    // Handle errors
    logger.error("Unexpected error:", err)
    logger.debug(`${req.method} ${req.originalUrl}`)
    logger.debug("Headers", req.headers)
    logger.debug("Body", req.params)
    res.status(500).send(err.message ?? err)
  })

  const server = listen
    ? new Promise<Server>((resolve) => {
      const result = app.listen(port)
      result.on("listening", () => {
        logger.info(`Express app running at ${url}`)
        resolve(result)
      })
    })
    : undefined

  return { app, server }
}
