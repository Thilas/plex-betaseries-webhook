import { Payload } from "../payload"
import { getMediaId, isSupportedMediaId, TvdbId } from "./ids"

export class PlexEpisode {
  static create(payload: Payload) {
    const id = getMediaId(payload.Metadata?.guid)
    const title = payload.Metadata?.grandparentTitle
    const season = payload.Metadata?.parentIndex
    const episode = payload.Metadata?.index
    if (!title || !season || !episode) {
      throw `Invalid episode: ${title} (${id}) ${formatEpisode(season, episode)}`
    }
    if (!isSupportedMediaId(id, TvdbId)) {
      throw `Unsupported episode id for ${title} ${formatEpisode(season, episode)}: ${id}`
    }
    return new PlexEpisode(id, title, season, episode)
  }

  private constructor(readonly id: TvdbId, readonly title: string, readonly season: number, readonly episode: number) {}

  toString() {
    return `${this.title} (${this.id}) ${formatEpisode(this.season, this.episode)}`
  }
}

function formatEpisode(season?: number, episode?: number) {
  const pad = (n?: number) => n?.toString().padStart(2, "0") ?? "??"
  return `S${pad(season)}E${pad(episode)}`
}
