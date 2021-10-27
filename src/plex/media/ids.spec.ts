import "reflect-metadata"
import { getLoggerMock } from "../../../test/logger"
import { Times } from "../../../test/moq"
import { PayloadGuid } from "../../middlewares/payload"
import { formatMediaIds, getMediaIds, ImdbId, TmdbId, TvdbId } from "./ids"

describe("getMediaIds", () => {
  const fakeLogger = getLoggerMock().object()

  it("fails with no guids", () => {
    // act
    const lambda = () => getMediaIds(fakeLogger, undefined)
    // assert
    expect(lambda).toThrow("No guids")
  })

  it("succeeds with empty guids", () => {
    // act
    const result = getMediaIds(fakeLogger, [])
    // assert
    expect(result).toEqual([])
  })

  it("detects empty guids", () => {
    // arrange
    const loggerMock = getLoggerMock()
    // act
    const result = getMediaIds(loggerMock.object(), [{} as PayloadGuid, { id: "" }])
    // assert
    expect(result).toEqual([])
    loggerMock.verify((e) => e.warn("Empty guid"), Times.Exactly(2))
  })

  it("detects invalid guids", () => {
    // arrange
    const fakeGuid = { id: "invalid guid" }
    const loggerMock = getLoggerMock()
    // act
    const result = getMediaIds(loggerMock.object(), [fakeGuid])
    // assert
    expect(result).toEqual([])
    loggerMock.verify((e) => e.warn(`Invalid guid: ${fakeGuid.id}`), Times.Once())
  })

  it("detects unknown agents", () => {
    // arrange
    const fakeGuid = { id: "unknown://guid" }
    const loggerMock = getLoggerMock()
    // act
    const result = getMediaIds(loggerMock.object(), [fakeGuid])
    // assert
    expect(result).toEqual([])
    loggerMock.verify((e) => e.warn(`Unknown Plex agent: ${fakeGuid.id}`), Times.Once())
  })

  it("supports TVDB agent", () => {
    // arrange
    const fakeGuid = "guid"
    // act
    const result = getMediaIds(fakeLogger, [{ id: `tvdb://${fakeGuid}` }])
    // assert
    expect(result).toEqual([new TvdbId(fakeGuid)])
  })

  it("supports IMDB agent", () => {
    // arrange
    const fakeGuid = "guid"
    // act
    const result = getMediaIds(fakeLogger, [{ id: `imdb://${fakeGuid}` }])
    // assert
    expect(result).toEqual([new ImdbId(fakeGuid)])
  })

  it("supports TMDB agent", () => {
    // arrange
    const fakeGuid = "guid"
    // act
    const result = getMediaIds(fakeLogger, [{ id: `tmdb://${fakeGuid}` }])
    // assert
    expect(result).toEqual([new TmdbId(fakeGuid)])
  })
})

describe("formatMediaIds", () => {
  it("succeeds with empty ids", () => {
    // act
    const result = formatMediaIds([])
    // assert
    expect(result).toEqual("")
  })

  it("succeeds with one id", () => {
    // arrange
    const a = new TvdbId("a")
    // act
    const result = formatMediaIds([a])
    // assert
    expect(result).toEqual("a@tvdb")
  })

  it("succeeds with multiple ids", () => {
    // arrange
    const a = new ImdbId("a")
    const b = new TmdbId("b")
    // act
    const result = formatMediaIds([a, b, a])
    // assert
    expect(result).toEqual("a@imdb, b@tmdb, a@imdb")
  })
})
