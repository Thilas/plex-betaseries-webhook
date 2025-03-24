import axios, { AxiosResponse } from "axios"
import { inject } from "inversify"
import { Configuration } from "../configuration"
import { HealthCheckPath } from "../controllers/health-check"
import { ids, provideSingleton } from "../decorators"
import { ILogger } from "../logger"
import { IProcess } from "../process"
import { HealthResponse } from "./models"

enum HealthStatus {
  success = 0,
  unhealthy = 1,
}

@provideSingleton(HealthCheckClient)
export class HealthCheckClient implements IProcess {
  constructor(@inject(ids.logger) readonly logger: ILogger, readonly configuration: Configuration) {}

  public async start() {
    try {
      const response = await this.getHealthCheck()
      if (response.data.status === "fail") {
        this.logger.error("Service is unhealthy", response.data)
        process.exitCode = HealthStatus.unhealthy
      } else {
        if (response.data.status === "warn") {
          this.logger.warn("Service is healthy", response.data)
        } else {
          this.logger.info("Service is healthy", response.data)
        }
        process.exitCode = HealthStatus.success
      }
    } catch (error) {
      this.logger.error("Unexpected error", error)
      process.exitCode = HealthStatus.unhealthy
    }
  }

  private async getHealthCheck() {
    const url = `http://localhost:${this.configuration.server.port}/`
    const client = axios.create({ baseURL: url })
    const start = Date.now()
    try {
      const response: AxiosResponse<HealthResponse> = await client.get(HealthCheckPath, { validateStatus: () => true })
      return response
    } finally {
      this.logger.debug(`Response time: ${Date.now() - start}ms`)
    }
  }
}
