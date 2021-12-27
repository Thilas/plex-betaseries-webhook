import { inject } from "inversify"
import { BaseHttpController, controller, httpGet, HttpResponseMessage, JsonContent } from "inversify-express-utils"
import { HealthCheck, HealthResponse } from "../health-check/health-check"

@controller("/health")
export class HealthCheckController extends BaseHttpController {
  constructor(@inject(HealthCheck) readonly healthCheck: HealthCheck) {
    super()
  }

  @httpGet("/")
  async get() {
    const response = await this.healthCheck.get()
    const statusCode = this.getStatusCode(response)
    const message = new HttpResponseMessage(statusCode)
    message.content = new JsonContent(response)
    message.content.headers["content-type"] = "application/health+json"
    message.content.headers["cache-control"] = "max-age=3600"
    return this.responseMessage(message)
  }

  private getStatusCode(response: HealthResponse): number {
    switch (response.status) {
      case "fail":
        return 503
      case "warn":
        return 299
      case "pass":
        return 200
    }
  }
}
