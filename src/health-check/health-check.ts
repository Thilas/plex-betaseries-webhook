import { inject, multiInject } from "inversify"
import { ids, provideSingleton } from "../decorators"
import { ILogger, toLoggerError } from "../logger"
import { HealthComponent, HealthMeasurements, HealthResponse } from "./models"

@provideSingleton(HealthCheckManager)
export class HealthCheckManager {
  constructor(
    @inject(ids.logger) readonly logger: ILogger,
    @multiInject(ids.healthCheck) readonly healthChecks: IHealthCheck[],
  ) { }

  async getHealthCheck() {
    try {
      return await this.getResponse()
    } catch (error) {
      const loggerError = toLoggerError(error)
      this.logger.error("Unable to check health:", loggerError)
      return this.createResponse({ status: "fail", output: loggerError.message })
    }
  }

  private async getResponse() {
    const healthCheckPromises = this.healthChecks.map(async (healthCheck) => {
      return { name: healthCheck.name, component: await this.getComponent(healthCheck) }
    })
    const healthChecks = await Promise.all(healthCheckPromises)

    const status = this.getStatus(...healthChecks.map((healthCheck) => healthCheck.component))
    const checks = healthChecks.reduce((previousValue, currentValue) => {
      previousValue[currentValue.name] = [currentValue.component]
      return previousValue
    }, {} as HealthMeasurements)

    return this.createResponse({ status, checks })
  }

  private createResponse(args: HealthResponse) {
    return {
      version: "1",
      releaseID: process.env.npm_package_version,
      ...args,
    } as HealthResponse
  }

  private async getComponent(healthCheck: IHealthCheck) {
    try {
      return await healthCheck.invoke()
    } catch (error) {
      const loggerError = toLoggerError(error)
      this.logger.error(`Unable to check "${healthCheck.name}":`, loggerError)
      return {
        componentType: "system",
        output: loggerError.message,
        status: "fail",
        time: new Date(),
      } as HealthComponent
    }
  }

  private getStatus(...components: HealthComponent[]) {
    if (components.some((component) => component.status === "fail")) return "fail"
    if (components.some((component) => component.status === "warn")) return "warn"
    return "pass"
  }
}

export interface IHealthCheck {
  get name(): string
  invoke(): Promise<HealthComponent>
}
