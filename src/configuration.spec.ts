import "./container"
import { Mock } from "../test/moq"
import {
  BetaSeriesConfiguration,
  ClientConfiguration,
  Configuration,
  getClientConfiguration,
  IConfig,
} from "./configuration"

describe("Configuration", () => {
  it("uses default url", () => {
    // arrange
    const fakeConfig = new Mock<IConfig>()
      .setup((e) => e.get("server"))
      .returns({})
      .setup((e) => e.get("betaseries"))
      .returns({})
      .object()
    // act
    const configuration = new Configuration(fakeConfig)
    // assert
    expect(configuration.server).toEqual({
      url: "http://localhost:12000/",
      port: 12000,
    })
  })

  it("uses default url with specified port", () => {
    // arrange
    const fakeConfig = new Mock<IConfig>()
      .setup((e) => e.get("server"))
      .returns({ port: 1234 })
      .setup((e) => e.get("betaseries"))
      .returns({})
      .object()
    // act
    const configuration = new Configuration(fakeConfig)
    // assert
    expect(configuration.server).toEqual({
      url: "http://localhost:1234/",
      port: 1234,
    })
  })

  it("uses specified url", () => {
    // arrange
    const fakeServerConfig = {
      url: "http://fake.url",
      port: 80,
    }
    const fakeConfig = new Mock<IConfig>()
      .setup((e) => e.get("server"))
      .returns(fakeServerConfig)
      .setup((e) => e.get("betaseries"))
      .returns({})
      .object()
    // act
    const configuration = new Configuration(fakeConfig)
    // assert9
    expect(configuration.server).toEqual(fakeServerConfig)
  })

  it("uses port 80", () => {
    // arrange
    const fakeConfig = new Mock<IConfig>()
      .setup((e) => e.get("server"))
      .returns({ port: 80 })
      .setup((e) => e.get("betaseries"))
      .returns({})
      .object()
    // act
    const configuration = new Configuration(fakeConfig)
    // assert
    expect(configuration.server).toEqual({
      url: "http://localhost/",
      port: 80,
    })
  })
})

describe("ClientConfiguration", () => {
  const fakePlexAccount = "fakePlexAccount"
  const fakeClientConfiguration = { plexAccount: fakePlexAccount, clientId: "1" } as ClientConfiguration
  const similarClientConfiguration = { plexAccount: fakePlexAccount, clientId: "2" } as ClientConfiguration
  const otherClientConfiguration = { plexAccount: "other" } as ClientConfiguration

  it("returns from client (clients not defined)", () => {
    // arrange
    const fakeBetaSeries = new Mock<BetaSeriesConfiguration>()
      .setup((e) => e.client)
      .returns(fakeClientConfiguration)
      .setup((e) => e.clients)
      .returns(undefined)
      .object()
    // act
    const clientConfiguration = getClientConfiguration(fakeBetaSeries, fakePlexAccount)
    // assert
    expect(clientConfiguration).toEqual(fakeClientConfiguration)
  })

  it("returns from client (clients defined)", () => {
    // arrange
    const fakeBetaSeries = new Mock<BetaSeriesConfiguration>()
      .setup((e) => e.client)
      .returns(fakeClientConfiguration)
      .setup((e) => e.clients)
      .returns({ fakePlexAccount: similarClientConfiguration })
      .object()
    // act
    const clientConfiguration = getClientConfiguration(fakeBetaSeries, fakePlexAccount)
    // assert
    expect(clientConfiguration).toEqual(fakeClientConfiguration)
  })

  it("returns from clients (client not defined)", () => {
    // arrange
    const fakeBetaSeries = new Mock<BetaSeriesConfiguration>()
      .setup((e) => e.client)
      .returns(undefined)
      .setup((e) => e.clients)
      .returns({ fakePlexAccount: fakeClientConfiguration })
      .object()
    // act
    const clientConfiguration = getClientConfiguration(fakeBetaSeries, fakePlexAccount)
    // assert
    expect(clientConfiguration).toEqual(fakeClientConfiguration)
  })

  it("returns from clients (client defined)", () => {
    // arrange
    const fakeBetaSeries = new Mock<BetaSeriesConfiguration>()
      .setup((e) => e.client)
      .returns(otherClientConfiguration)
      .setup((e) => e.clients)
      .returns({ fakePlexAccount: fakeClientConfiguration })
      .object()
    // act
    const clientConfiguration = getClientConfiguration(fakeBetaSeries, fakePlexAccount)
    // assert
    expect(clientConfiguration).toEqual(fakeClientConfiguration)
  })

  it("returns nothing (client and clients not defined)", () => {
    // arrange
    const fakeBetaSeries = new Mock<BetaSeriesConfiguration>()
      .setup((e) => e.client)
      .returns(undefined)
      .setup((e) => e.clients)
      .returns(undefined)
      .object()
    // act
    const clientConfiguration = getClientConfiguration(fakeBetaSeries, fakePlexAccount)
    // assert
    expect(clientConfiguration).toBeUndefined()
  })

  it("returns nothing (client and clients defined)", () => {
    // arrange
    const fakeBetaSeries = new Mock<BetaSeriesConfiguration>()
      .setup((e) => e.client)
      .returns(otherClientConfiguration)
      .setup((e) => e.clients)
      .returns({ other: otherClientConfiguration })
      .object()
    // act
    const clientConfiguration = getClientConfiguration(fakeBetaSeries, fakePlexAccount)
    // assert
    expect(clientConfiguration).toBeUndefined()
  })
})
