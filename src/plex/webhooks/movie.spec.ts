import "../../container"
import { getLoggerMock } from "../../../test/logger"
import { It, Mock } from "../../../test/moq"
import { BetaSeriesMember, MovieMediaId } from "../../betaseries/betaseries"
import { BetaSeriesMovie, BetaSeriesMovieStatus } from "../../betaseries/models"
import { Payload } from "../../middlewares/payload"
import { ImdbId } from "../media/ids"
import { PlexMovieFactory } from "../media/movie"
import { IMedia } from "./manager"
import { MovieScrobbleWebhook } from "./movie"

const fakeLogger = getLoggerMock().object()
const fakePayload = {} as Payload
const fakeMediaName = "fakeMedia"
const fakeMediaId = {} as ImdbId
const fakeMedia = new Mock<IMedia<MovieMediaId>>()
  .setup((e) => e.id)
  .returns(fakeMediaId)
  .setup((e) => e.toString())
  .returns(fakeMediaName)
  .object()
const fakeMediaFactory = new Mock<PlexMovieFactory>()
  .setup((e) => e.create(fakePayload))
  .returns(fakeMedia)
  .object()
const fakeSeenMovie = { id: 123, user: { status: BetaSeriesMovieStatus.seen } } as BetaSeriesMovie
const fakeUnseenMovie = { id: 456, user: { status: BetaSeriesMovieStatus.none } } as BetaSeriesMovie

type GetParameters = Parameters<BetaSeriesMember["getMovie"]>["0"]
type UpdateParameters = Parameters<BetaSeriesMember["updateMovie"]>["0"]

describe("MovieScrobbleWebhook", () => {
  const webhook = new MovieScrobbleWebhook(fakeLogger, fakeMediaFactory)

  it("fails if movie is not found", async () => {
    // arrange
    const fakeMember = new Mock<BetaSeriesMember>()
      .setup((e) => e.getMovie(It.Is<GetParameters>((p) => p.id === fakeMediaId)))
      .returnsAsync(undefined)
      .object()
    // act
    const promise = () => webhook.process(fakePayload, fakeMember, fakeLogger.info)
    // assert
    await expect(promise).rejects.toEqual(new Error(`No movie found for: ${fakeMediaName}`))
  })

  // eslint-disable-next-line jest/expect-expect
  it("does nothing if movie has already been scrobbled", async () => {
    // arrange
    const fakeMember = new Mock<BetaSeriesMember>()
      .setup((e) => e.getMovie(It.Is<GetParameters>((p) => p.id === fakeMediaId)))
      .returnsAsync(fakeSeenMovie)
      .object()
    // act
    await webhook.process(fakePayload, fakeMember, fakeLogger.info)
  })

  it("fails if scrobbled movie is not found", async () => {
    // arrange
    const fakeMember = new Mock<BetaSeriesMember>()
      .setup((e) => e.getMovie(It.Is<GetParameters>((p) => p.id === fakeMediaId)))
      .returnsAsync(fakeUnseenMovie)
      .setup((e) =>
        e.updateMovie(
          It.Is<UpdateParameters>((p) => {
            return p.id === fakeUnseenMovie.id && p.state === BetaSeriesMovieStatus.seen
          }),
        ),
      )
      .returnsAsync(undefined)
      .object()
    // act
    const promise = () => webhook.process(fakePayload, fakeMember, fakeLogger.info)
    // assert
    await expect(promise).rejects.toEqual(new Error(`No movie found for: ${fakeMediaName}`))
  })

  it("fails if movie is not scrobbled", async () => {
    // arrange
    const fakeMember = new Mock<BetaSeriesMember>()
      .setup((e) => e.getMovie(It.Is<GetParameters>((p) => p.id === fakeMediaId)))
      .returnsAsync(fakeUnseenMovie)
      .setup((e) =>
        e.updateMovie(
          It.Is<UpdateParameters>((p) => {
            return p.id === fakeUnseenMovie.id && p.state === BetaSeriesMovieStatus.seen
          }),
        ),
      )
      .returnsAsync(fakeUnseenMovie)
      .object()
    // act
    const promise = () => webhook.process(fakePayload, fakeMember, fakeLogger.info)
    // assert
    await expect(promise).rejects.toEqual(new Error(`Movie not marked as watched for: ${fakeMediaName}`))
  })

  // eslint-disable-next-line jest/expect-expect
  it("succeeds if movie is scrobbled", async () => {
    // arrange
    const fakeMember = new Mock<BetaSeriesMember>()
      .setup((e) => e.getMovie(It.Is<GetParameters>((p) => p.id === fakeMediaId)))
      .returnsAsync(fakeUnseenMovie)
      .setup((e) =>
        e.updateMovie(
          It.Is<UpdateParameters>((p) => {
            return p.id === fakeUnseenMovie.id && p.state === BetaSeriesMovieStatus.seen
          }),
        ),
      )
      .returnsAsync(fakeSeenMovie)
      .object()
    // act
    await webhook.process(fakePayload, fakeMember, fakeLogger.info)
  })
})
