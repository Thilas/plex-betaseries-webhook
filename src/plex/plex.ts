import buildUrl from "build-url"
import express from "express"
import multer from "multer"
import { BetaSeries, IBetaSeriesMember } from "../betaseries/betaseries"
import { Payload } from "./payload"
import { EpisodeWebhook } from "./webhooks/episode"
import { MovieWebhook } from "./webhooks/movie"

export function usePlexWebhook(
  app: express.Express,
  url: string,
  uploadOptions: multer.Options,
  betaSeries: BetaSeries,
) {
  // BetaSeries authentication
  app.get("", async (req, res, next) => {
    try {
      const code = getBetaSeriesCode(req.query)
      if (code) {
        await betaSeries.displayAccessToken(res, url, code, getWebhookUrl(url))
      } else {
        betaSeries.redirectForUserCode(res, url)
      }
      res.end()
    } catch (error) {
      next(error)
    }
  })

  // Actual Plex webhook
  const upload = multer(uploadOptions)
  app.post("", upload.any(), async (req, res, next) => {
    try {
      const payload = getPayload(req.body?.payload)
      const member = await getBetaSeriesMember(req.query, betaSeries)
      const webhook = getWebhook(payload, member)
      await webhook?.processEvent(payload.event)
      res.sendStatus(200)
    } catch (error) {
      next(error)
    }
  })

  return app
}

function getBetaSeriesCode(query: express.Request["query"]) {
  const accessToken = query?.code
  if (typeof accessToken !== "string") {
    return
  }
  return accessToken
}

function getWebhookUrl(url: string) {
  return (accessToken: string) =>
    buildUrl(url, {
      queryParams: {
        accessToken: accessToken,
      },
    })
}

function getPayload(data?: string): Payload {
  if (!data) {
    throw "Missing payload"
  }
  return JSON.parse(data)
}

function getBetaSeriesMember(query: express.Request["query"], betaSeries: BetaSeries) {
  const accessToken = query?.accessToken
  if (typeof accessToken !== "string") {
    throw "A single accessToken query parameter is required"
  }
  return betaSeries.getMember(accessToken)
}

function getWebhook(payload: Payload, member: IBetaSeriesMember) {
  switch (payload.Metadata?.type) {
    case "episode":
      return new EpisodeWebhook(payload, member)
    case "movie":
      return new MovieWebhook(payload, member)
    default:
      console.warn(`Unknown Plex metadata type: ${payload.Metadata?.type}`)
  }
}
