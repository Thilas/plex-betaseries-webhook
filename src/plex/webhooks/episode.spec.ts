import "reflect-metadata"
import { getLoggerMock } from "../../../test/logger"
import { It, Mock } from "../../../test/moq"
import { BetaSeriesMember, EpisodeMediaId } from "../../betaseries/betaseries"
import { BetaSeriesEpisode } from "../../betaseries/models"
import { Payload } from "../../middlewares/payload"
import { PlexEpisodeFactory } from "../media/episode"
import { TvdbId } from "../media/ids"
import { EpisodeScrobbleWebhook } from "./episode"
import { IMedia } from "./manager"

const fakeLogger = getLoggerMock().object()
const fakePayload = {} as Payload
const fakeMediaName = "fakeMedia"
const fakeMediaId = {} as TvdbId
const fakeMedia = new Mock<IMedia<EpisodeMediaId>>()
  .setup((e) => e.id)
  .returns(fakeMediaId)
  .setup((e) => e.toString())
  .returns(fakeMediaName)
  .object()
const fakeMediaFactory = new Mock<PlexEpisodeFactory>()
  .setup((e) => e.create(fakePayload))
  .returns(fakeMedia)
  .object()
const fakeSeenEpisode = { id: 123, user: { seen: true } } as BetaSeriesEpisode
const fakeUnseenEpisode = { id: 456, user: { seen: false } } as BetaSeriesEpisode

type GetParameters = Parameters<BetaSeriesMember["getEpisode"]>["0"]
type UpdateParameters = Parameters<BetaSeriesMember["markEpisodeAsWatched"]>["0"]

describe("EpisodeScrobbleWebhook", () => {
  const webhook = new EpisodeScrobbleWebhook(fakeLogger, fakeMediaFactory)

  it("fails if episode is not found", async () => {
    // arrange
    const fakeMember = new Mock<BetaSeriesMember>()
      .setup((e) => e.getEpisode(It.Is<GetParameters>((p) => p.id === fakeMediaId)))
      .returnsAsync(undefined)
      .object()
    // act
    const promise = () => webhook.process(fakePayload, fakeMember, fakeLogger.info)
    // assert
    await expect(promise).rejects.toEqual(new Error(`No episode found for: ${fakeMediaName}`))
  })

  // eslint-disable-next-line jest/expect-expect
  it("does nothing if episode has already been scrobbled", async () => {
    // arrange
    const fakeMember = new Mock<BetaSeriesMember>()
      .setup((e) => e.getEpisode(It.Is<GetParameters>((p) => p.id === fakeMediaId)))
      .returnsAsync(fakeSeenEpisode)
      .object()
    // act
    await webhook.process(fakePayload, fakeMember, fakeLogger.info)
  })

  it("fails if scrobbled episode is not found", async () => {
    // arrange
    const fakeMember = new Mock<BetaSeriesMember>()
      .setup((e) => e.getEpisode(It.Is<GetParameters>((p) => p.id === fakeMediaId)))
      .returnsAsync(fakeUnseenEpisode)
      .setup((e) =>
        e.markEpisodeAsWatched(
          It.Is<UpdateParameters>((p) => {
            return p.id === fakeUnseenEpisode.id && p.bulk === false
          }),
        ),
      )
      .returnsAsync(undefined)
      .object()
    // act
    const promise = () => webhook.process(fakePayload, fakeMember, fakeLogger.info)
    // assert
    await expect(promise).rejects.toEqual(new Error(`No episode found for: ${fakeMediaName}`))
  })

  it("fails if episode is not scrobbled", async () => {
    // arrange
    const fakeMember = new Mock<BetaSeriesMember>()
      .setup((e) => e.getEpisode(It.Is<GetParameters>((p) => p.id === fakeMediaId)))
      .returnsAsync(fakeUnseenEpisode)
      .setup((e) =>
        e.markEpisodeAsWatched(
          It.Is<UpdateParameters>((p) => {
            return p.id === fakeUnseenEpisode.id && p.bulk === false
          }),
        ),
      )
      .returnsAsync(fakeUnseenEpisode)
      .object()
    // act
    const promise = () => webhook.process(fakePayload, fakeMember, fakeLogger.info)
    // assert
    await expect(promise).rejects.toEqual(new Error(`Episode not marked as watched for: ${fakeMediaName}`))
  })

  // eslint-disable-next-line jest/expect-expect
  it("succeeds if episode is scrobbled", async () => {
    // arrange
    const fakeMember = new Mock<BetaSeriesMember>()
      .setup((e) => e.getEpisode(It.Is<GetParameters>((p) => p.id === fakeMediaId)))
      .returnsAsync(fakeUnseenEpisode)
      .setup((e) =>
        e.markEpisodeAsWatched(
          It.Is<UpdateParameters>((p) => {
            return p.id === fakeUnseenEpisode.id && p.bulk === false
          }),
        ),
      )
      .returnsAsync(fakeSeenEpisode)
      .object()
    // act
    await webhook.process(fakePayload, fakeMember, fakeLogger.info)
  })
})
