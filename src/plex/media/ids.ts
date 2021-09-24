import { Constructor } from "../../utils"
import { PayloadGuid } from "../payload"

type NonMediaId = UnknownId | undefined
export type MediaId = Exclude<ReturnType<typeof getMediaId>, NonMediaId>

export function getMediaIds(guids?: PayloadGuid[]) {
  if (!guids) {
    throw `No guids`
  }
  const result = guids.map(guid => getMediaId(guid?.id))
  return result
}

function getMediaId(guid?: string) {
  if (!guid) {
    throw `Empty guid`
  }
  const match = /^(?<agent>\w+):\/\/(?<id>\w+)\b/.exec(guid)
  if (!match?.groups) {
    throw `Invalid guid: ${guid}`
  }
  switch (match.groups.agent) {
    case "tvdb":
      return new TvdbId(match.groups.id)
    case "imdb":
      return new ImdbId(match.groups.id)
    case "tmdb":
      return new TmdbId(match.groups.id)
    default:
      console.warn(`Unknown Plex agent: ${match.groups.agent}`)
      return new UnknownId(guid)
  }
}

export function getSupportedMediaId<T extends MediaId>(values: (MediaId | NonMediaId)[], type: Constructor<T>): T | undefined {
  for (const value of values) {
    if (value instanceof type) return value
  }
  return undefined
}

export function formatMediaIds(values: (MediaId | NonMediaId)[]) {
  return values.join(", ")
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
