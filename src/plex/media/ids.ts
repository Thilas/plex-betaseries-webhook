import { logger } from "../../logger"
import { PayloadGuid } from "../payload"

export type MediaId = NonNullable<ReturnType<typeof getMediaId>>

export function getMediaIds(guids?: PayloadGuid[]) {
  if (!guids) {
    throw new Error(`No guids`)
  }
  return guids
    .map(guid => getMediaId(guid?.id))
    .filter((id): id is MediaId => !!id)
}

function getMediaId(guid?: string) {
  if (!guid) {
    logger.warn(`Empty guid`)
    return
  }
  const match = /^(?<agent>\w+):\/\/(?<id>\w+)\b/.exec(guid)
  if (!match?.groups) {
    logger.warn(`Invalid guid: ${guid}`)
    return
  }
  switch (match.groups.agent) {
    case "tvdb":
      return new TvdbId(match.groups.id)
    case "imdb":
      return new ImdbId(match.groups.id)
    case "tmdb":
      return new TmdbId(match.groups.id)
    default:
      logger.warn(`Unknown Plex agent: ${guid}`)
      return
  }
}

export function formatMediaIds(values: MediaId[]) {
  return values.join(", ")
}

abstract class BaseId<T extends string> {
  protected constructor(readonly kind: T, readonly value: string) {}
  toString() {
    return `${this.value}@${this.kind}`
  }
}

export class TvdbId extends BaseId<"tvdb"> {
  constructor(value: string) {
    super("tvdb", value)
  }
}

export class ImdbId extends BaseId<"imdb"> {
  constructor(value: string) {
    super("imdb", value)
  }
}

export class TmdbId extends BaseId<"tmdb"> {
  constructor(value: string) {
    super("tmdb", value)
  }
}
