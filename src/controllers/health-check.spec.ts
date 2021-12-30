import { container } from "../container"
import { interfaces, JsonContent, results, TYPE } from "inversify-express-utils"
import { Mock, MockBuilder } from "../../test/moq"
import { HealthCheckManager } from "../health-check/health-check"
import { HealthResponse } from "../health-check/models"
import { HealthCheckController } from "./health-check"

function setup(args: { healthCheckManagerBuilder?: MockBuilder<HealthCheckManager> }) {
  const healthCheckManagerMock = new Mock<HealthCheckManager>({ builder: args.healthCheckManagerBuilder })
  const httpContextMock = new Mock<interfaces.HttpContext>()
  container.unbind(HealthCheckManager)
  container.bind(HealthCheckManager).toConstantValue(healthCheckManagerMock.object())
  container.bind<interfaces.HttpContext>(TYPE.HttpContext).toConstantValue(httpContextMock.object())
  container.bind(HealthCheckController).to(HealthCheckController)
  const controller = container.get(HealthCheckController)
  return controller
}

describe("HealthCheckController", () => {
  //#region Container
  beforeEach(() => {
    container.snapshot()
  })
  afterEach(() => {
    container.restore()
  })
  //#endregion

  describe("get", () => {
    it("returns a 200 status when healthcheck passes", async () => {
      // arrange
      const response = { status: "pass" } as HealthResponse
      const controller = setup({
        healthCheckManagerBuilder: (mock) => {
          mock.setup((e) => e.getHealthCheck()).returnsAsync(response)
        },
      })
      // act
      const result = await controller.get()
      // assert
      expect(result).toBeInstanceOf(results.ResponseMessageResult)
      const message = await result.executeAsync()
      expect(message.statusCode).toBe(200)
      expect(message.content).toBeInstanceOf(JsonContent)
      expect(message.content.headers).toMatchObject({
        "content-type": "application/health+json",
        "cache-control": "max-age=3600",
      })
      const content = message.content as JsonContent
      await expect(content.readAsStringAsync()).resolves.toBe(JSON.stringify(response))
    })

    it("returns a 299 status when healthcheck warns", async () => {
      // arrange
      const controller = setup({
        healthCheckManagerBuilder: (mock) => {
          mock.setup((e) => e.getHealthCheck()).returnsAsync({ status: "warn" })
        },
      })
      // act
      const result = await controller.get()
      // assert
      expect(result).toBeInstanceOf(results.ResponseMessageResult)
      const message = await result.executeAsync()
      expect(message.statusCode).toBe(299)
    })

    it("returns a 503 status when healthcheck fails", async () => {
      // arrange
      const controller = setup({
        healthCheckManagerBuilder: (mock) => {
          mock.setup((e) => e.getHealthCheck()).returnsAsync({ status: "fail" })
        },
      })
      // act
      const result = await controller.get()
      // assert
      expect(result).toBeInstanceOf(results.ResponseMessageResult)
      const message = await result.executeAsync()
      expect(message.statusCode).toBe(503)
    })
  })
})
