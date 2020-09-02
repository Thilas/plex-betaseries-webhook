import express, { NextFunction, Request, Response } from "express"
import { Server } from "http"
import { BetaSeries } from "./betaseries/betaseries"
import { usePlexWebhook } from "./plex/plex"

type ServerConfig = {
  readonly url?: string
  readonly port?: number
  readonly temp?: string
}

export function initializeServer(betaSeries: BetaSeries, serverConfig?: ServerConfig, listen = false) {
  const app = express()

  const port = serverConfig?.port ? `:${serverConfig?.port}` : ""
  const url = serverConfig?.url ?? `http://localhost${port}/`
  usePlexWebhook(app, url, { dest: serverConfig?.temp }, betaSeries)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err)
    res.status(400).send(err.message ?? err)
  })

  const server = listen
    ? new Promise<Server>((resolve) => {
        const result = app.listen(serverConfig?.port ?? 80)
        result.on("listening", () => {
          console.log(`Express app running at ${url}`)
          resolve(result)
        })
      })
    : undefined

  return { app, server }
}
