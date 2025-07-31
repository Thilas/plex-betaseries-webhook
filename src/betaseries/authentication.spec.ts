import { container } from "../container"
import { Request } from "express"
import { interfaces } from "inversify-express-utils"
import { Mock } from "../../test/moq"
import { BetaSeriesAuthProvider } from "./authentication"
import { BetaSeries, BetaSeriesPrincipal } from "./betaseries"

describe("BetaSeriesAuthProvider", () => {
  //#region Container
  beforeEach(() => {
    container.snapshot()
    container.unbind(BetaSeries)
    container.bind<interfaces.AuthProvider>(BetaSeriesAuthProvider).toSelf()
  })
  afterEach(() => {
    container.restore()
  })
  //#endregion

  it("returns an unauthenticated principal if no plex account", async () => {
    // arrange
    const fakeBetaseries = new Mock<BetaSeries>()
      .setup((e) => e.getPrincipal())
      .returnsAsync(new BetaSeriesPrincipal())
      .object()
    container.bind(BetaSeries).toConstantValue(fakeBetaseries)
    const fakeReq = new Mock<Request>()
      .setup((e) => e.query["plexAccount"])
      .returns(undefined)
      .object()
    const authProvider = container.get(BetaSeriesAuthProvider)
    // act
    const user = await authProvider.getUser(fakeReq)
    // assert
    expect(await user.isAuthenticated()).toBeFalsy()
  })

  it("returns an unauthenticated principal if no access token", async () => {
    // arrange
    const fakePlexAccount = "fakePlexAccount"
    const fakeBetaseries = new Mock<BetaSeries>()
      .setup((e) => e.getPrincipal(fakePlexAccount))
      .returnsAsync(new BetaSeriesPrincipal())
      .object()
    container.bind(BetaSeries).toConstantValue(fakeBetaseries)
    const fakeReq = new Mock<Request>()
      .setup((e) => e.query["plexAccount"])
      .returns(fakePlexAccount)
      .setup((e) => e.query["accessToken"])
      .returns(undefined)
      .object()
    const authProvider = container.get(BetaSeriesAuthProvider)
    // act
    const user = await authProvider.getUser(fakeReq)
    // assert
    expect(await user.isAuthenticated()).toBeFalsy()
  })

  it("returns an unauthenticated principal if invalid access token", async () => {
    // arrange
    const fakePlexAccount = "fakePlexAccount"
    const fakeBetaseries = new Mock<BetaSeries>()
      .setup((e) => e.getPrincipal(fakePlexAccount))
      .returnsAsync(new BetaSeriesPrincipal())
      .object()
    container.bind(BetaSeries).toConstantValue(fakeBetaseries)
    const fakeReq = new Mock<Request>()
      .setup((e) => e.query["plexAccount"])
      .returns(fakePlexAccount)
      .setup((e) => e.query["accessToken"])
      .returns(["invalid"])
      .object()
    const authProvider = container.get(BetaSeriesAuthProvider)
    // act
    const user = await authProvider.getUser(fakeReq)
    // assert
    expect(await user.isAuthenticated()).toBeFalsy()
  })

  it("returns an authenticated principal if valid access token", async () => {
    // arrange
    const fakePlexAccount = "fakePlexAccount"
    const fakeAccessToken = "valid"
    const fakeBetaseries = new Mock<BetaSeries>()
      .setup((e) => e.getPrincipal(fakePlexAccount, fakeAccessToken))
      .returnsAsync(
        new BetaSeriesPrincipal(
          {
            plexAccount: fakePlexAccount,
            clientId: "fakeClientId",
            clientSecret: "fakeClientSecret",
          },
          {
            accessToken: fakeAccessToken,
            login: "fakeLogin",
          },
        ),
      )
      .object()
    container.bind(BetaSeries).toConstantValue(fakeBetaseries)
    const fakeReq = new Mock<Request>()
      .setup((e) => e.query["plexAccount"])
      .returns(fakePlexAccount)
      .setup((e) => e.query["accessToken"])
      .returns(fakeAccessToken)
      .object()
    const authProvider = container.get(BetaSeriesAuthProvider)
    // act
    const user = await authProvider.getUser(fakeReq)
    // assert
    expect(await user.isAuthenticated()).toBeTruthy()
  })
})
