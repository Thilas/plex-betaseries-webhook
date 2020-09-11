import { Payload } from "../payload"
import { getMediaId, ImdbId, isSupportedMediaId, TmdbId } from "./ids"

export class PlexMovie {
  static create(payload: Payload) {
    const id = getMediaId(payload.Metadata?.guid)
    const title = payload.Metadata?.title
    if (!title) {
      throw `Invalid movie: ${title} (${id})`
    }
    if (!isSupportedMediaId(id, ImdbId) && !isSupportedMediaId(id, TmdbId)) {
      throw `Unsupported movie id for ${title}: ${id}`
    }
    return new PlexMovie(id, title)
  }

  private constructor(readonly id: ImdbId | TmdbId, readonly title: string) {}

  toString() {
    return `${this.title} (${this.id})`
  }
}
