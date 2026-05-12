import { container } from "../container"
import { Mock, MockBuilder } from "../../test/moq"
import { HealthCheckManager } from "../health-check/health-check"
import { HealthResponse } from "../health-check/models"
import { HealthCheckController } from "./health-check"

function setup(args: { healthCheckManagerBuilder?: MockBuilder<HealthCheckManager> }) {
  const healthCheckManagerMock = new Mock<HealthCheckManager>({ builder: args.healthCheckManagerBuilder })
  container.unbind(HealthCheckManager)
  container.bind(HealthCheckManager).toConstantValue(healthCheckManagerMock.object())
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
      expect(result.statusCode).toBe(200)
      expect(result.headers).toMatchObject({
        "content-type": "application/health+json",
        "cache-control": "max-age=3600",
      })
      expect(result.body).toBe(response)
    })

    it("returns a 202 status when healthcheck warns", async () => {
      // arrange
      const controller = setup({
        healthCheckManagerBuilder: (mock) => {
          mock.setup((e) => e.getHealthCheck()).returnsAsync({ status: "warn" })
        },
      })
      // act
      const result = await controller.get()
      // assert
      expect(result.statusCode).toBe(202)
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
      expect(result.statusCode).toBe(503)
    })
  })
})
