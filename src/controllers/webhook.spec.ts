import { container } from "../container"
import { BadRequestHttpResponse, SuccessHttpResponse, UnauthorizedHttpResponse } from "@inversifyjs/http-core"
import { Mock, MockBuilder, Times } from "../../test/moq"
import { BetaSeries, BetaSeriesPrincipal, BetaSeriesUser } from "../betaseries/betaseries"
import { ClientConfiguration, Configuration } from "../configuration"
import { Payload } from "../middlewares/payload"
import { WebhookManager } from "../plex/webhooks/manager"
import { WebhookController, WebhookRequest } from "./webhook"

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
  payload: boolean
  betaSeriesBuilder?: MockBuilder<BetaSeries>
  webhookManagerBuilder?: MockBuilder<WebhookManager>
}) {
  const betaseriesMock = new Mock<BetaSeries>({ builder: args.betaSeriesBuilder })
  const webhookManagerMock = new Mock<WebhookManager>({ builder: args.webhookManagerBuilder })
  const principal = new Mock<BetaSeriesPrincipal>()
    .setup((e) => e.clientConfiguration)
    .returns(args.clientConfiguration ? fakeClientConfiguration : undefined)
    .setup((e) => e.user)
    .returns(args.authenticated ? fakeUser : undefined)
    .object()
  const webhookRequest = new Mock<WebhookRequest>()
    .setup((e) => e.principal)
    .returns(principal)
    .setup((e) => e.payload)
    .returns(args.payload ? fakePayload : undefined)
    .object()
  container.unbind(Configuration)
  container.bind(Configuration).toConstantValue(fakeConfiguration)
  container.unbind(BetaSeries)
  container.bind(BetaSeries).toConstantValue(betaseriesMock.object())
  container.unbind(WebhookManager)
  container.bind(WebhookManager).toConstantValue(webhookManagerMock.object())
  container.bind(WebhookController).to(WebhookController)
  const controller = container.get(WebhookController)
  return { webhookRequest, controller, betaseriesMock }
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
      const { webhookRequest, controller } = setup({
        clientConfiguration: false,
        authenticated: false,
        payload: false,
      })
      // act
      const result = await controller.get(webhookRequest)
      // assert
      expect(result).toBeInstanceOf(UnauthorizedHttpResponse)
    })

    it("redirects to BetaSeries if the user is not authenticated and no code is provided", async () => {
      // arrange
      const { webhookRequest, controller, betaseriesMock } = setup({
        clientConfiguration: true,
        authenticated: false,
        payload: false,
        betaSeriesBuilder: (mock) =>
          mock.setup((e) => e.getAuthenticationUrl(fakeClientConfiguration)).returns(fakeConfiguration.betaseries.url),
      })
      // act
      const result = await controller.get(webhookRequest)
      // assert
      expect(result).toBeInstanceOf(SuccessHttpResponse)
      betaseriesMock.verify((e) => e.getAuthenticationUrl(fakeClientConfiguration), Times.Once())
    })

    it("validates the code if the user is not authenticated", async () => {
      // arrange
      const fakeCode = "fakeCode"
      const { webhookRequest, controller, betaseriesMock } = setup({
        clientConfiguration: true,
        authenticated: false,
        payload: false,
        betaSeriesBuilder: (mock) =>
          mock.setup((e) => e.getUser(fakeClientConfiguration, fakeCode)).returnsAsync(fakeUser),
      })
      // act
      const result = await controller.get(webhookRequest, fakeCode)
      // assert
      expect(result).toBeInstanceOf(SuccessHttpResponse)
      betaseriesMock.verify((e) => e.getUser(fakeClientConfiguration, fakeCode), Times.Once())
    })

    it("returns basic informations  if the user is authenticated", async () => {
      // arrange
      const { webhookRequest, controller } = setup({
        clientConfiguration: true,
        authenticated: true,
        payload: false,
      })
      // act
      const result = await controller.get(webhookRequest)
      // assert
      expect(result).toBeInstanceOf(SuccessHttpResponse)
    })
  })

  describe("post", () => {
    it("fails if the client configuration is missing", async () => {
      // arrange
      const { webhookRequest, controller } = setup({
        clientConfiguration: false,
        authenticated: false,
        payload: false,
      })
      // act
      const result = await controller.post(webhookRequest)
      // assert
      expect(result).toBeInstanceOf(UnauthorizedHttpResponse)
    })

    it("fails if the user is not authenticated", async () => {
      // arrange
      const { webhookRequest, controller } = setup({
        clientConfiguration: true,
        authenticated: false,
        payload: false,
      })
      // act
      const result = await controller.post(webhookRequest)
      // assert
      expect(result).toBeInstanceOf(UnauthorizedHttpResponse)
    })

    it("fails if no payload is provided", async () => {
      // arrange
      const { webhookRequest, controller } = setup({
        clientConfiguration: true,
        authenticated: true,
        payload: false,
      })
      // act
      const result = await controller.post(webhookRequest)
      // assert
      expect(result).toBeInstanceOf(BadRequestHttpResponse)
    })

    it("processes the webhook if the user is authenticated", async () => {
      // arrange
      const { webhookRequest, controller } = setup({
        clientConfiguration: true,
        authenticated: true,
        payload: true,
        webhookManagerBuilder: (mock) =>
          mock.setup((e) => e.process(fakeClientConfiguration, fakePayload, fakeUser)).returnsAsync(),
      })
      // act
      const result = await controller.post(webhookRequest)
      // assert
      expect(result).toBeUndefined()
    })
  })
})
