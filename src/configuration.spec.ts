import "reflect-metadata"
import { IConfig } from "config"
import { Mock } from "../test/moq"
import { Configuration } from "./configuration"

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
