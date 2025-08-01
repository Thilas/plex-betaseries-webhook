import { container } from "../container"
import { interfaces, results, TYPE } from "inversify-express-utils"
import { Mock, MockBuilder, Times } from "../../test/moq"
import { BetaSeries, BetaSeriesPrincipal, BetaSeriesUser } from "../betaseries/betaseries"
import { ClientConfiguration, Configuration } from "../configuration"
import { ids } from "../decorators"
import { Payload, PayloadProvider } from "../middlewares/payload"
import { WebhookManager } from "../plex/webhooks/manager"
import { WebhookController } from "./webhook"

const fakeConfiguration = {
  server: {
    url: "http://fake.self.url",
  },
  betaseries: {
    url: "http://fake.url",
  },
} as Configuration
const fakeClientConfiguration = {} as ClientConfiguration
const fakePayload = {} as Payload
const fakeUser = { accessToken: "fakeAccessToken", login: "fakeLogin" } as BetaSeriesUser

function setup(args: {
  clientConfiguration: boolean
  authenticated: boolean
  betaSeriesBuilder?: MockBuilder<BetaSeries>
  webhookManagerBuilder?: MockBuilder<WebhookManager>
}) {
  const betaseriesMock = new Mock<BetaSeries>({ builder: args.betaSeriesBuilder })
  const webhookManagerMock = new Mock<WebhookManager>({ builder: args.webhookManagerBuilder })
  const principal = new Mock<BetaSeriesPrincipal>()
    .setup((e) => e.clientConfiguration)
    .returns(args.clientConfiguration ? fakeClientConfiguration : undefined)
    .setup((e) => e.details)
    .returns(args.authenticated ? fakeUser : undefined)
    .object()
  const httpContextMock = new Mock<interfaces.HttpContext>().setup((e) => e.user).returns(principal)
  container.unbind(Configuration)
  container.bind(Configuration).toConstantValue(fakeConfiguration)
  container.unbind(BetaSeries)
  container.bind(BetaSeries).toConstantValue(betaseriesMock.object())
  container.unbind(ids.payloadProvider)
  container.bind<PayloadProvider>(ids.payloadProvider).toProvider(() => {
    return () => Promise.resolve(fakePayload)
  })
  container.unbind(WebhookManager)
  container.bind(WebhookManager).toConstantValue(webhookManagerMock.object())
  container.bind<interfaces.HttpContext>(TYPE.HttpContext).toConstantValue(httpContextMock.object())
  container.bind(WebhookController).to(WebhookController)
  const controller = container.get(WebhookController)
  return { controller, betaseriesMock }
}

describe("WebhookController", () => {
  //#region Container
  beforeEach(() => {
    container.snapshot()
  })
  afterEach(() => {
    container.restore()
  })
  //#endregion

  describe("get", () => {
    it("fails if the client configuration is missing", async () => {
      // arrange
      const { controller } = setup({
        clientConfiguration: false,
        authenticated: false,
      })
      // act
      const result = await controller.get()
      // assert
      expect(result).toBeInstanceOf(results.StatusCodeResult)
    })

    it("redirects to BetaSeries if the user is not authenticated and no code is provided", async () => {
      // arrange
      const { controller, betaseriesMock } = setup({
        clientConfiguration: true,
        authenticated: false,
        betaSeriesBuilder: (mock) =>
          mock.setup((e) => e.getAuthenticationUrl(fakeClientConfiguration)).returns(fakeConfiguration.betaseries.url),
      })
      // act
      const result = await controller.get()
      // assert
      expect(result).toBeInstanceOf(results.RedirectResult)
      betaseriesMock.verify((e) => e.getAuthenticationUrl(fakeClientConfiguration), Times.Once())
    })

    it("validates the code if the user is not authenticated", async () => {
      // arrange
      const fakeCode = "fakeCode"
      const { controller, betaseriesMock } = setup({
        clientConfiguration: true,
        authenticated: false,
        betaSeriesBuilder: (mock) =>
          mock.setup((e) => e.getUser(fakeClientConfiguration, fakeCode)).returnsAsync(fakeUser),
      })
      // act
      const result = await controller.get(fakeCode)
      // assert
      expect(result).toBeInstanceOf(results.RedirectResult)
      betaseriesMock.verify((e) => e.getUser(fakeClientConfiguration, fakeCode), Times.Once())
    })

    it("returns basic informations  if the user is authenticated", async () => {
      // arrange
      const { controller } = setup({
        clientConfiguration: true,
        authenticated: true,
      })
      // act
      const result = await controller.get()
      // assert
      expect(result).toBeInstanceOf(results.ResponseMessageResult)
    })
  })

  describe("post", () => {
    it("fails if the client configuration is missing", async () => {
      // arrange
      const { controller } = setup({
        clientConfiguration: false,
        authenticated: false,
      })
      // act
      const result = await controller.post()
      // assert
      expect(result).toBeInstanceOf(results.StatusCodeResult)
    })

    it("fails if the user is not authenticated", async () => {
      // arrange
      const { controller } = setup({
        clientConfiguration: true,
        authenticated: false,
      })
      // act
      const result = await controller.post()
      // assert
      expect(result).toBeInstanceOf(results.StatusCodeResult)
    })

    it("process the webhook if the user is authenticated", async () => {
      // arrange
      const { controller } = setup({
        clientConfiguration: true,
        authenticated: true,
        webhookManagerBuilder: (mock) =>
          mock.setup((e) => e.process(fakeClientConfiguration, fakePayload, fakeUser)).returnsAsync(),
      })
      // act
      const result = await controller.post()
      // assert
      expect(result).toBeUndefined()
    })
  })
})
