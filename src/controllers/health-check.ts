import { inject } from "inversify"
import { Controller, Get, HttpStatusCode, SuccessHttpResponse } from "@inversifyjs/http-core"
import { HealthCheckManager } from "../health-check/health-check"
import { HealthResponse } from "../health-check/models"

export const HealthCheckPath = "/health"

@Controller(HealthCheckPath)
export class HealthCheckController {
  constructor(@inject(HealthCheckManager) readonly healthCheckManager: HealthCheckManager) { }

  @Get()
  async get() {
    const response = await this.healthCheckManager.getHealthCheck()
    const statusCode = this.getStatusCode(response)
    const httpResponse = new SuccessHttpResponse(statusCode, response, {
      "content-type": "application/health+json",
      "cache-control": "max-age=3600",
    })
    return httpResponse
  }

  private getStatusCode(response: HealthResponse): HttpStatusCode {
    switch (response.status) {
      case "fail":
        return HttpStatusCode.SERVICE_UNAVAILABLE
      case "warn":
        return HttpStatusCode.ACCEPTED
      case "pass":
        return HttpStatusCode.OK
    }
  }
}
