import "../container"
import { getLoggerMock } from "../../test/logger"
import { It, Mock } from "../../test/moq"
import { HealthCheckManager, IHealthCheck } from "./health-check"
import { HealthComponent } from "./models"

function setupHealthCheck(name: string, component: HealthComponent) {
  const healthCheck = new Mock<IHealthCheck>()
    .setup((e) => e.name)
    .returns(name)
    .setup((e) => e.invoke())
    .returnsAsync(component)
    .object()
  return { healthCheck, name, component }
}

function setupThrowingHealthCheck(name: string, message: string) {
  const component = { status: "fail", output: message } as HealthComponent
  const healthCheck = new Mock<IHealthCheck>()
    .setup((e) => e.name)
    .returns(name)
    .setup((e) => e.invoke())
    .throwsAsync(new Error(message))
    .object()
  return { healthCheck, name, component }
}

describe("HealthCheckManager", () => {
  describe("getHealthCheck", () => {
    const logger = getLoggerMock().object()
    const version = (process.env.npm_package_version = "1.2.3")

    it("returns a failing response when there are no health check providers", async () => {
      // arrange
      const error = "fakeError"
      const healthChecks = new Mock<Array<IHealthCheck>>()
        .setup(() => It.IsAny())
        .throws(error)
        .object()
      const logger = getLoggerMock({
        builder: (mock, logger) => mock.setup((e) => e.error("Unable to check health:", It.IsAny())).returns(logger),
      }).object()
      const manager = new HealthCheckManager(logger, healthChecks)
      // act
      const response = await manager.getHealthCheck()
      // assert
      expect(response).toMatchObject({
        status: "fail",
        version: "1",
        releaseID: version,
        output: error,
      })
    })

    it("returns a passing response when there are no health check providers", async () => {
      // arrange
      const manager = new HealthCheckManager(logger, [])
      // act
      const response = await manager.getHealthCheck()
      // assert
      expect(response).toMatchObject({
        status: "pass",
        version: "1",
        releaseID: version,
      })
    })

    it("returns a passing response when there are health check providers", async () => {
      // arrange
      const hc1 = setupHealthCheck("fakeName1", { componentId: "fakeComponent1" })
      const hc2 = setupHealthCheck("fakeName2", { componentId: "fakeComponent2" })
      const manager = new HealthCheckManager(logger, [hc1.healthCheck, hc2.healthCheck])
      // act
      const response = await manager.getHealthCheck()
      // assert
      expect(response).toMatchObject({
        status: "pass",
        version: "1",
        releaseID: version,
      })
      expect(response.checks).toHaveProperty(hc1.name)
      expect(response.checks ? response.checks[hc1.name] : undefined).toMatchObject([hc1.component])
      expect(response.checks).toHaveProperty(hc2.name)
      expect(response.checks ? response.checks[hc2.name] : undefined).toMatchObject([hc2.component])
    })

    it("returns a warning response when one health check provider warns", async () => {
      // arrange
      const hc1 = setupHealthCheck("fakeName1", { componentId: "fakeComponent1" })
      const hc2 = setupHealthCheck("fakeName2", {
        status: "warn",
        componentId: "fakeComponent2",
      })
      const manager = new HealthCheckManager(logger, [hc1.healthCheck, hc2.healthCheck])
      // act
      const response = await manager.getHealthCheck()
      // assert
      expect(response).toMatchObject({
        status: "warn",
        version: "1",
        releaseID: version,
      })
    })

    it("returns a failing response when one health check provider fails", async () => {
      // arrange
      const hc1 = setupHealthCheck("fakeName1", {
        status: "warn",
        componentId: "fakeComponent1",
      })
      const hc2 = setupHealthCheck("fakeName2", {
        status: "fail",
        componentId: "fakeComponent2",
      })
      const manager = new HealthCheckManager(logger, [hc1.healthCheck, hc2.healthCheck])
      // act
      const response = await manager.getHealthCheck()
      // assert
      expect(response).toMatchObject({
        status: "fail",
        version: "1",
        releaseID: version,
      })
    })

    it("returns a failing response when one health check provider throws", async () => {
      // arrange
      const hc1 = setupThrowingHealthCheck("fakeName1", "fakeError")
      const hc2 = setupHealthCheck("fakeName2", { componentId: "fakeComponent2" })
      const logger = getLoggerMock({
        builder: (mock, logger) =>
          mock.setup((e) => e.error(`Unable to check "${hc1.name}":`, It.IsAny())).returns(logger),
      }).object()
      const manager = new HealthCheckManager(logger, [hc1.healthCheck, hc2.healthCheck])
      // act
      const response = await manager.getHealthCheck()
      // assert
      expect(response).toMatchObject({
        status: "fail",
        version: "1",
        releaseID: version,
      })
      expect(response.checks).toHaveProperty(hc1.name)
      expect(response.checks ? response.checks[hc1.name] : undefined).toMatchObject([hc1.component])
      expect(response.checks).toHaveProperty(hc2.name)
      expect(response.checks ? response.checks[hc2.name] : undefined).toMatchObject([hc2.component])
    })
  })
})
