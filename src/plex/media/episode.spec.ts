import "../../container"
import { getLoggerMock } from "../../../test/logger"
import { Payload } from "../../middlewares/payload"
import { PlexEpisodeFactory } from "./episode"

const fakeLogger = getLoggerMock().object()
const fakeAgent = "tvdb"
const fakeGuid = "guid"

const factory = new PlexEpisodeFactory(fakeLogger)

describe("PlexEpisodeFactory", () => {
  it("fails if no supported guids", () => {
    // arrange
    const fakeAgent = "imdb"
    const fakePayload = {
      Metadata: {
        Guid: [{ id: `${fakeAgent}://${fakeGuid}` }],
        grandparentTitle: "fakeTitle",
        parentIndex: 1,
        index: 2,
      },
    }
    // act
    const lambda = () => factory.create(fakePayload as Payload)
    // assert
    expect(lambda).toThrow(
      `Unsupported episode id for ${fakePayload.Metadata.grandparentTitle} S0${fakePayload.Metadata.parentIndex}E0${fakePayload.Metadata.index}: ${fakeGuid}@${fakeAgent}`,
    )
  })

  it("fails if no title", () => {
    // arrange
    const fakePayload = {
      Metadata: {
        Guid: [{ id: `${fakeAgent}://${fakeGuid}` }],
        parentIndex: 1,
        index: 2,
      },
    }
    // act
    const lambda = () => factory.create(fakePayload as Payload)
    // assert
    expect(lambda).toThrow(
      `Invalid episode: <unknown title> S0${fakePayload.Metadata.parentIndex}E0${fakePayload.Metadata.index} (${fakeGuid}@${fakeAgent})`,
    )
  })

  it("fails if no season #", () => {
    // arrange
    const fakePayload = {
      Metadata: {
        Guid: [{ id: `${fakeAgent}://${fakeGuid}` }],
        grandparentTitle: "fakeTitle",
        index: 2,
      },
    }
    // act
    const lambda = () => factory.create(fakePayload as Payload)
    // assert
    expect(lambda).toThrow(
      `Invalid episode: ${fakePayload.Metadata.grandparentTitle} S??E0${fakePayload.Metadata.index} (${fakeGuid}@${fakeAgent})`,
    )
  })

  it("fails if no episode #", () => {
    // arrange
    const fakePayload = {
      Metadata: {
        Guid: [{ id: `${fakeAgent}://${fakeGuid}` }],
        grandparentTitle: "fakeTitle",
        parentIndex: 1,
      },
    }
    // act
    const lambda = () => factory.create(fakePayload as Payload)
    // assert
    expect(lambda).toThrow(
      `Invalid episode: ${fakePayload.Metadata.grandparentTitle} S0${fakePayload.Metadata.parentIndex}E?? (${fakeGuid}@${fakeAgent})`,
    )
  })

  it("returns the episode", () => {
    // arrange
    const fakePayload = {
      Metadata: {
        Guid: [{ id: `${fakeAgent}://${fakeGuid}` }],
        grandparentTitle: "fakeTitle",
        parentIndex: 1,
        index: 2,
      },
    }
    // act
    const result = factory.create(fakePayload as Payload)
    // assert
    expect(result).toEqual({
      id: {
        kind: fakeAgent,
        value: fakeGuid,
      },
      title: fakePayload.Metadata.grandparentTitle,
      season: fakePayload.Metadata.parentIndex,
      episode: fakePayload.Metadata.index,
    })
  })
})

describe("PlexEpisode", () => {
  describe("toString", () => {
    it("fails if no supported guids", () => {
      // arrange
      const fakePayload = {
        Metadata: {
          Guid: [{ id: `${fakeAgent}://${fakeGuid}` }],
          grandparentTitle: "fakeTitle",
          parentIndex: 1,
          index: 2,
        },
      }
      const episode = factory.create(fakePayload as Payload)
      // act
      const result = episode.toString()
      // assert
      expect(result).toBe(
        `${fakePayload.Metadata.grandparentTitle} S0${fakePayload.Metadata.parentIndex}E0${fakePayload.Metadata.index} (${fakeGuid}@${fakeAgent})`,
      )
    })
  })
})
