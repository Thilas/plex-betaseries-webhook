import { Payload } from "../payload"
import { formatMediaIds, getMediaIds, getSupportedMediaId, TvdbId } from "./ids"

export class PlexEpisode {
  static create(payload: Payload) {
    const ids = getMediaIds(payload.Metadata?.Guid)
    const id = getSupportedMediaId(ids, TvdbId)
    const title = payload.Metadata?.grandparentTitle
    const season = payload.Metadata?.parentIndex
    const episode = payload.Metadata?.index
    if (!id) {
      throw new Error(`Unsupported episode id for ${title} ${formatEpisode(season, episode)}: ${formatMediaIds(ids)}`)
    }
    if (!title || !season || !episode) {
      throw new Error(`Invalid episode: ${title} ${formatEpisode(season, episode)} (${id})`)
    }
    return new PlexEpisode(id, title, season, episode)
  }

  private constructor(readonly id: TvdbId, readonly title: string, readonly season: number, readonly episode: number) {}

  toString() {
    return `${this.title} ${formatEpisode(this.season, this.episode)} (${this.id})`
  }
}

function formatEpisode(season?: number, episode?: number) {
  const pad = (n?: number) => n?.toString().padStart(2, "0") ?? "??"
  return `S${pad(season)}E${pad(episode)}`
}
