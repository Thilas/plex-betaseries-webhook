import { Constructor } from "../../utils"

type NonMediaId = UnknownId | undefined
export type MediaId = Exclude<ReturnType<typeof getMediaId>, NonMediaId>

export function getMediaId(guid?: string) {
  if (!guid) {
    throw `Empty guid`
  }
  const match = /^com\.plexapp\.agents\.(?<agent>\w+):\/\/(?<id>\w+)\b/.exec(guid)
  if (!match?.groups) {
    throw `Invalid guid: ${guid}`
  }
  switch (match.groups.agent) {
    case "thetvdb":
      return new TvdbId(match.groups.id)
    case "imdb":
      return new ImdbId(match.groups.id)
    case "themoviedb":
      return new TmdbId(match.groups.id)
    default:
      console.warn(`Unknown Plex agent: ${match.groups.agent}`)
      return new UnknownId(guid)
  }
}

export function isSupportedMediaId<T extends MediaId>(value: MediaId | NonMediaId, type: Constructor<T>): value is T {
  return value instanceof type
}

abstract class BaseId<T> {
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

class UnknownId extends BaseId<"unknown"> {
  constructor(value: string) {
    super("unknown", value)
  }
  toString() {
    return this.value
  }
}
