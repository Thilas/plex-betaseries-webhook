import { Payload } from "../payload"
import { formatMediaIds, getMediaIds, getSupportedMediaId, ImdbId, TmdbId } from "./ids"

export class PlexMovie {
  static create(payload: Payload) {
    const ids = getMediaIds(payload.Metadata?.Guid)
    const id = getSupportedMediaId(ids, ImdbId) ?? getSupportedMediaId(ids, TmdbId)
    const title = payload.Metadata?.title
    if (!id) {
      throw new Error(`Unsupported movie id for ${title}: ${formatMediaIds(ids)}`)
    }
    if (!title) {
      throw new Error(`Invalid movie: ${title} (${id})`)
    }
    return new PlexMovie(id, title)
  }

  private constructor(readonly id: ImdbId | TmdbId, readonly title: string) {}

  toString() {
    return `${this.title} (${this.id})`
  }
}
