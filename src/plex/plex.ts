import buildUrl from "build-url"
import express, { Response } from "express"
import multer from "multer"
import { BetaSeries, IBetaSeriesMember } from "../betaseries/betaseries"
import { Payload } from "./payload"
import { EpisodeWebhook } from "./webhooks/episode"
import { MovieWebhook } from "./webhooks/movie"

export function usePlexWebhook(
  app: express.Express,
  selfUrl: string,
  uploadOptions: multer.Options,
  betaSeries: BetaSeries,
) {
  // BetaSeries authentication
  app.route("/").get(async (req, res, next) => {
    try {
      const code = getCode(req.query)
      if (code) {
        const { accessToken, login } = await betaSeries.getAccessToken(selfUrl, code)
        displayAccessToken(res, selfUrl, accessToken, login)
        return
      }
      const authenticationUrl = betaSeries.getAuthenticationUrl(selfUrl)
      res.redirect(authenticationUrl)
    } catch (error) {
      next(error)
    }
  })

  // Plex webhook
  app
    .route("/token/:accessToken")
    .get(async (req, res, next) => {
      try {
        const member = await getBetaSeriesMember(betaSeries, req.params.accessToken)
        displayAccessToken(res, selfUrl, req.params.accessToken, member.login)
      } catch (error) {
        next(error)
      }
    })
    .post(multer(uploadOptions).any(), async (req, res, next) => {
      try {
        const payload = getPayload(req.body?.payload)
        if (payload.user) {
          const member = await getBetaSeriesMember(betaSeries, req.params.accessToken)
          const webhook = getWebhook(payload, member)
          await webhook?.processEvent(payload.event)
        }
        res.sendStatus(200)
      } catch (error) {
        next(error)
      }
    })

  return app
}

function getCode(query: express.Request["query"]) {
  const code = query[BetaSeries.codeKey]
  if (typeof code !== "string") {
    return
  }
  return code
}

function displayAccessToken(res: Response, selfUrl: string, accessToken: string, login: string) {
  const url = buildUrl(selfUrl, {
    path: `token/${accessToken}`,
  })
  res.send(`Plex webhook for ${login}: ${url.link(url)}`)
}

function getPayload(data?: string): Payload {
  if (!data) {
    throw "Missing payload"
  }
  return JSON.parse(data)
}

function getBetaSeriesMember(betaSeries: BetaSeries, accessToken?: string) {
  if (!accessToken) {
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
