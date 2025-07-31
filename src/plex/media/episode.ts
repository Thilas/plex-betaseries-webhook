import { inject } from "inversify"
import { EpisodeMediaId } from "../../betaseries/betaseries"
import { ids, provideMediaFactory, provideSingleton } from "../../decorators"
import { ILogger } from "../../logger"
import { Payload } from "../../middlewares/payload"
import { getFirstSupportedOrDefault } from "../../utils"
import { IMedia, IMediaFactory } from "../webhooks/manager"
import { formatMediaIds, getMediaIds, TvdbId } from "./ids"

export const PlexEpisodeType = "episode"

@provideSingleton(PlexEpisodeFactory)
@provideMediaFactory(PlexEpisodeType)
export class PlexEpisodeFactory implements IMediaFactory<EpisodeMediaId> {
  constructor(@inject(ids.logger) readonly logger: ILogger) {}

  create(payload: Payload): IMedia<EpisodeMediaId> {
    const allIds = getMediaIds(this.logger, payload.Metadata?.Guid)
    const id = getFirstSupportedOrDefault(allIds, [TvdbId])
    const title = payload.Metadata?.grandparentTitle
    const season = payload.Metadata?.parentIndex
    const episode = payload.Metadata?.index
    if (!id) {
      throw new Error(
        `Unsupported episode id for ${title} ${formatEpisode(season, episode)}: ${formatMediaIds(allIds)}.`,
      )
    }
    if (!title || typeof season === "undefined" || typeof episode === "undefined") {
      throw new Error(
        `Invalid episode: ${title ?? "<unknown title>"} ${formatEpisode(season, episode)} (${id.toString()}).`,
      )
    }
    return new PlexEpisode(id, title, season, episode)
  }
}

class PlexEpisode implements IMedia<EpisodeMediaId> {
  constructor(readonly id: EpisodeMediaId, readonly title: string, readonly season: number, readonly episode: number) {}

  toString() {
    return `${this.title} ${formatEpisode(this.season, this.episode)} (${this.id.toString()})`
  }
}

function formatEpisode(season?: number, episode?: number) {
  const pad = (n?: number) => n?.toString().padStart(2, "0") ?? "??"
  return `S${pad(season)}E${pad(episode)}`
}
