import "reflect-metadata"
import { getLoggerMock } from "../../test/logger"
import { It, Mock } from "../../test/moq"
import { HealthCheck, HealthComponent, IHealthCheckProvider } from "./health-check"

function setupProvider(name: string, component: HealthComponent) {
  const provider = new Mock<IHealthCheckProvider>()
    .setup((e) => e.name)
    .returns(name)
    .setup((e) => e.get())
    .returnsAsync(component)
    .object()
  return [provider, name, component] as [IHealthCheckProvider, string, HealthComponent]
}

function setupThrowingProvider(name: string, message: string) {
  const component = { status: "fail", output: message } as HealthComponent
  const provider = new Mock<IHealthCheckProvider>()
    .setup((e) => e.name)
    .returns(name)
    .setup((e) => e.get())
    .throwsAsync(new Error(message))
    .object()
  return [provider, name, component] as [IHealthCheckProvider, string, HealthComponent]
}

describe("HealthCheck", () => {
  describe("get", () => {
    const logger = getLoggerMock().object()
    const version = (process.env.npm_package_version = "1.2.3")

    it("returns a failing response when there are no health check providers", async () => {
      // arrange
      const error = "fakeError"
      const providers = new Mock<Array<IHealthCheckProvider>>()
        .setup(() => It.IsAny())
        .throws(error)
        .object()
      const logger = getLoggerMock({
        builder: (mock, logger) => mock.setup((e) => e.error("Unable to check health:", It.IsAny())).returns(logger),
      }).object()
      const healthCheck = new HealthCheck(logger, providers)
      // act
      const result = await healthCheck.get()
      // assert
      expect(result).toMatchObject({
        status: "fail",
        version: "1",
        releaseID: version,
        output: error,
      })
    })

    it("returns a passing response when there are no health check providers", async () => {
      // arrange
      const healthCheck = new HealthCheck(logger, [])
      // act
      const result = await healthCheck.get()
      // assert
      expect(result).toMatchObject({
        status: "pass",
        version: "1",
        releaseID: version,
      })
    })

    it("returns a passing response when there are health check providers", async () => {
      // arrange
      const [provider1, name1, component1] = setupProvider("fakeName1", { componentId: "fakeComponent1" })
      const [provider2, name2, component2] = setupProvider("fakeName2", { componentId: "fakeComponent2" })
      const healthCheck = new HealthCheck(logger, [provider1, provider2])
      // act
      const result = await healthCheck.get()
      // assert
      expect(result).toMatchObject({
        status: "pass",
        version: "1",
        releaseID: version,
      })
      expect(result.checks).toHaveProperty(name1)
      expect(result.checks ? result.checks[name1] : undefined).toMatchObject([component1])
      expect(result.checks).toHaveProperty(name2)
      expect(result.checks ? result.checks[name2] : undefined).toMatchObject([component2])
    })

    it("returns a warning response when one health check provider warns", async () => {
      // arrange
      const [provider1] = setupProvider("fakeName1", { componentId: "fakeComponent1" })
      const [provider2] = setupProvider("fakeName2", {
        status: "warn",
        componentId: "fakeComponent2",
      })
      const healthCheck = new HealthCheck(logger, [provider1, provider2])
      // act
      const result = await healthCheck.get()
      // assert
      expect(result).toMatchObject({
        status: "warn",
        version: "1",
        releaseID: version,
      })
    })

    it("returns a failing response when one health check provider fails", async () => {
      // arrange
      const [provider1] = setupProvider("fakeName1", {
        status: "warn",
        componentId: "fakeComponent1",
      })
      const [provider2] = setupProvider("fakeName2", {
        status: "fail",
        componentId: "fakeComponent2",
      })
      const healthCheck = new HealthCheck(logger, [provider1, provider2])
      // act
      const result = await healthCheck.get()
      // assert
      expect(result).toMatchObject({
        status: "fail",
        version: "1",
        releaseID: version,
      })
    })

    it("returns a failing response when one health check provider throws", async () => {
      // arrange
      const [provider1, name1, component1] = setupThrowingProvider("fakeName1", "fakeError")
      const [provider2, name2, component2] = setupProvider("fakeName2", { componentId: "fakeComponent2" })
      const logger = getLoggerMock({
        builder: (mock, logger) =>
          mock.setup((e) => e.error(`Unable to check "${name1}":`, It.IsAny())).returns(logger),
      }).object()
      const healthCheck = new HealthCheck(logger, [provider1, provider2])
      // act
      const result = await healthCheck.get()
      // assert
      expect(result).toMatchObject({
        status: "fail",
        version: "1",
        releaseID: version,
      })
      expect(result.checks).toHaveProperty(name1)
      expect(result.checks ? result.checks[name1] : undefined).toMatchObject([component1])
      expect(result.checks).toHaveProperty(name2)
      expect(result.checks ? result.checks[name2] : undefined).toMatchObject([component2])
    })
  })
})
