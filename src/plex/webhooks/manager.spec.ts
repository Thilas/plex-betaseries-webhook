/* eslint-disable jest/expect-expect */
import "../../container"
import { It, Mock, MockBuilder, Times } from "../../../test/moq"
import { BetaSeries, BetaSeriesMember } from "../../betaseries/betaseries"
import { ILogger } from "../../logger"
import { Payload } from "../../middlewares/payload"
import { MediaId } from "../media/ids"
import { IMedia, IMediaFactory, IWebhook, MediaFactoryProvider, WebhookManager, WebhookProvider } from "./manager"

const fakePayload = { event: "fakeEvent", Metadata: { type: "fakeType" } } as Payload
const fakeMedia = "fakeMedia"
const fakeBetaSeriesUser = { accessToken: "fakeAccessToken", login: "fakeLogin" }
const fakeBetaSeriesMember = { login: fakeBetaSeriesUser.login } as BetaSeriesMember

function setup(args: {
  payload?: Payload
  media?: string
  anyLogs?: boolean
  anyWebhook?: boolean
  anyMediaFactory?: boolean
  betaSeriesBuilder?: MockBuilder<BetaSeries>
}) {
  const payload = args.payload ?? fakePayload
  const payloadType = payload.Metadata?.type
  const media = args.media ?? fakeMedia

  const loggerMock = new Mock<ILogger>()
  const webhookProviderMock = new Mock<WebhookProvider>()
  const mediaFactoryProviderMock = new Mock<MediaFactoryProvider>()
  const betaSeriesMock = new Mock({ builder: args.betaSeriesBuilder })

  if (args.anyLogs) {
    loggerMock.setup((e) => e.info(It.IsAny())).returns(loggerMock.object())
  }
  if (payloadType) {
    const getWebhook = () => {
      if (!args.anyWebhook) {
        return
      }
      betaSeriesMock.setup((e) => e.getMember(fakeBetaSeriesUser)).returnsAsync(fakeBetaSeriesMember)
      return (
        new Mock<IWebhook>()
          .setup((e) => e.process(payload, fakeBetaSeriesMember, It.IsAny()))
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          .callback(async ({ args: [_payload, _member, info] }) => {
            info(media)
          })
          .object()
      )
    }
    const getMediaFactory = () => {
      if (!args.anyMediaFactory) {
        return
      }
      const media = args.media
        ? new Mock<IMedia<MediaId>>()
            .setup((e) => e.toString())
            .returns(args.media)
            .object()
        : undefined
      return new Mock<IMediaFactory<MediaId>>()
        .setup((e) => e.create(payload))
        .returns(media)
        .object()
    }
    webhookProviderMock.setup((e) => e(payloadType, payload.event)).returnsAsync(getWebhook())
    mediaFactoryProviderMock.setup((e) => e(payloadType)).returnsAsync(getMediaFactory())
  }

  const webhookManager = new WebhookManager(
    loggerMock.object(),
    webhookProviderMock.object(),
    mediaFactoryProviderMock.object(),
    betaSeriesMock.object(),
  )

  const player = payload.Player?.title ?? "<unknown player>"
  const account = payload.Account?.title ?? "<unknown account>"
  const server = payload.Server?.title ?? "<unknown server>"
  const expectedLog = `Got ${payload.event} event for ${media} on ${player} from ${account}@${server}`

  return { webhookManager, loggerMock, expectedLog }
}

describe("Webhook", () => {
  it("does nothing if payload has no type", async () => {
    // arrange
    const fakePayload = {} as Payload
    const { webhookManager } = setup({ payload: fakePayload })
    // act
    await webhookManager.process(fakePayload, fakeBetaSeriesUser)
  })

  it("logs the event if payload type is unknown", async () => {
    // arrange
    const { webhookManager, loggerMock, expectedLog } = setup({ media: "<unknown type>", anyLogs: true })
    // act
    await webhookManager.process(fakePayload, fakeBetaSeriesUser)
    // assert
    loggerMock.verify((e) => e.info(expectedLog), Times.Once())
  })

  it("logs nothing if payload type is skipped", async () => {
    // arrange
    const { webhookManager } = setup({ anyMediaFactory: true })
    // act
    await webhookManager.process(fakePayload, fakeBetaSeriesUser)
  })

  it("logs something if there is no webhook", async () => {
    // arrange
    const { webhookManager, loggerMock, expectedLog } = setup({
      media: fakeMedia,
      anyLogs: true,
      anyMediaFactory: true,
    })
    // act
    await webhookManager.process(fakePayload, fakeBetaSeriesUser)
    // assert
    loggerMock.verify((e) => e.info(expectedLog), Times.Once())
  })

  it("process expected webhook", async () => {
    // arrange
    const { webhookManager, loggerMock, expectedLog } = setup({ anyLogs: true, anyWebhook: true })
    // act
    await webhookManager.process(fakePayload, fakeBetaSeriesUser)
    // assert
    loggerMock.verify((e) => e.info(expectedLog), Times.Once())
  })
})
