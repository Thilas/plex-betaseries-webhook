import { container } from "../container"
import { NextFunction, Response } from "express"
import { Mock, Times } from "../../test/moq"
import { AuthenticationMiddleware } from "./authentication"
import { BetaSeries, BetaSeriesPrincipal } from "../betaseries/betaseries"
import { WebhookRequest } from "../controllers/webhook"

const fakePrincipal = {} as BetaSeriesPrincipal

describe("AuthenticationMiddleware", () => {
  //#region Container
  beforeEach(() => {
    container.snapshot()
    container.unbind(BetaSeries)
  })
  afterEach(() => {
    container.restore()
  })
  //#endregion

  const fakeRes = new Mock<Response>().object()

  it("returns an unauthenticated principal if no plex account", async () => {
    // arrange
    const fakeBetaseries = new Mock<BetaSeries>()
      .setup((e) => e.getPrincipal(undefined, undefined))
      .returnsAsync(fakePrincipal)
      .object()
    container.bind(BetaSeries).toConstantValue(fakeBetaseries)
    const fakeReq = new Mock<WebhookRequest>()
      .setup((e) => e.query["plexAccount"])
      .returns(undefined)
      .setup((e) => { e.principal = fakePrincipal })
      .returns()
      .object()
    const nextMock = new Mock<NextFunction>().setup((e) => e()).returns()
    const middleware = container.get(AuthenticationMiddleware)
    // act
    await middleware.execute(fakeReq, fakeRes, nextMock.object())
    // assert
    nextMock.verify((e) => e(), Times.Once())
  })

  it("returns an unauthenticated principal if no access token", async () => {
    // arrange
    const fakePlexAccount = "fakePlexAccount"
    const fakeBetaseries = new Mock<BetaSeries>()
      .setup((e) => e.getPrincipal(fakePlexAccount, undefined))
      .returnsAsync(fakePrincipal)
      .object()
    container.bind(BetaSeries).toConstantValue(fakeBetaseries)
    const fakeReq = new Mock<WebhookRequest>()
      .setup((e) => e.query["plexAccount"])
      .returns(fakePlexAccount)
      .setup((e) => e.query["accessToken"])
      .returns(undefined)
      .setup((e) => { e.principal = fakePrincipal })
      .returns()
      .object()
    const nextMock = new Mock<NextFunction>().setup((e) => e()).returns()
    const middleware = container.get(AuthenticationMiddleware)
    // act
    await middleware.execute(fakeReq, fakeRes, nextMock.object())
    // assert
    nextMock.verify((e) => e(), Times.Once())
  })

  it("returns an unauthenticated principal if invalid access token", async () => {
    // arrange
    const fakePlexAccount = "fakePlexAccount"
    const fakeBetaseries = new Mock<BetaSeries>()
      .setup((e) => e.getPrincipal(fakePlexAccount, undefined))
      .returnsAsync(fakePrincipal)
      .object()
    container.bind(BetaSeries).toConstantValue(fakeBetaseries)
    const fakeReq = new Mock<WebhookRequest>()
      .setup((e) => e.query["plexAccount"])
      .returns(fakePlexAccount)
      .setup((e) => e.query["accessToken"])
      .returns(["invalid"])
      .setup((e) => { e.principal = fakePrincipal })
      .returns()
      .object()
    const nextMock = new Mock<NextFunction>().setup((e) => e()).returns()
    const middleware = container.get(AuthenticationMiddleware)
    // act
    await middleware.execute(fakeReq, fakeRes, nextMock.object())
    // assert
    nextMock.verify((e) => e(), Times.Once())
  })

  it("returns an authenticated principal if valid access token", async () => {
    // arrange
    const fakePlexAccount = "fakePlexAccount"
    const fakeAccessToken = "valid"
    const fakePrincipal = new BetaSeriesPrincipal(
      {
        plexAccount: fakePlexAccount,
        clientId: "fakeClientId",
        clientSecret: "fakeClientSecret",
      },
      {
        accessToken: fakeAccessToken,
        login: "fakeLogin",
      },
    )
    const fakeBetaseries = new Mock<BetaSeries>()
      .setup((e) => e.getPrincipal(fakePlexAccount, fakeAccessToken))
      .returnsAsync(fakePrincipal)
      .object()
    container.bind(BetaSeries).toConstantValue(fakeBetaseries)
    const fakeReq = new Mock<WebhookRequest>()
      .setup((e) => e.query["plexAccount"])
      .returns(fakePlexAccount)
      .setup((e) => e.query["accessToken"])
      .returns(fakeAccessToken)
      .setup((e) => { e.principal = fakePrincipal })
      .returns()
      .object()
    const nextMock = new Mock<NextFunction>().setup((e) => e()).returns()
    const middleware = container.get(AuthenticationMiddleware)
    // act
    await middleware.execute(fakeReq, fakeRes, nextMock.object())
    // assert
    nextMock.verify((e) => e(), Times.Once())
  })
})
