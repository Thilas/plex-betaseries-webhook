import "reflect-metadata"
import { getLoggerMock } from "../../../test/logger"
import { Payload } from "../../middlewares/payload"
import { PlexMovieFactory } from "./movie"

const fakeLogger = getLoggerMock().object()
const fakeAgent = "imdb"
const fakeGuid = "guid"

const factory = new PlexMovieFactory(fakeLogger)

describe("PlexMovieFactory", () => {
  it("fails if no supported guids", () => {
    // arrange
    const fakeAgent = "tvdb"
    const fakePayload = {
      Metadata: {
        Guid: [{ id: `${fakeAgent}://${fakeGuid}` }],
        title: "fakeTitle",
      },
    }
    // act
    const lambda = () => factory.create(fakePayload as Payload)
    // assert
    expect(lambda).toThrow(`Unsupported movie id for ${fakePayload.Metadata.title}: ${fakeGuid}@${fakeAgent}`)
  })

  it("fails if no title", () => {
    // arrange
    const fakePayload = {
      Metadata: {
        Guid: [{ id: `${fakeAgent}://${fakeGuid}` }],
      },
    }
    // act
    const lambda = () => factory.create(fakePayload as Payload)
    // assert
    expect(lambda).toThrow(`Invalid movie: <unknown title> (${fakeGuid}@${fakeAgent})`)
  })

  it("returns the movie", () => {
    // arrange
    const fakePayload = {
      Metadata: {
        Guid: [{ id: `${fakeAgent}://${fakeGuid}` }],
        title: "fakeTitle",
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
      title: fakePayload.Metadata.title,
    })
  })
})

describe("PlexMovie", () => {
  describe("toString", () => {
    it("fails if no supported guids", () => {
      // arrange
      const fakePayload = {
        Metadata: {
          Guid: [{ id: `${fakeAgent}://${fakeGuid}` }],
          title: "fakeTitle",
        },
      }
      const movie = factory.create(fakePayload as Payload)
      // act
      const result = movie.toString()
      // assert
      expect(result).toEqual(`${fakePayload.Metadata.title} (${fakeGuid}@${fakeAgent})`)
    })
  })
})
