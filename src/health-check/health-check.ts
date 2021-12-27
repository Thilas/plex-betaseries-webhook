import { inject, multiInject } from "inversify"
import { ids, provideSingleton } from "../decorators"
import { ILogger } from "../logger"
import { hasMember } from "../utils"

// See https://inadarei.github.io/rfc-healthcheck/

@provideSingleton(HealthCheck)
export class HealthCheck {
  constructor(
    @inject(ids.logger) readonly logger: ILogger,
    @multiInject(ids.healthCheckProvider) readonly healthCheckProviders: IHealthCheckProvider[],
  ) {}

  async get() {
    try {
      return await this.getResponse()
    } catch (error) {
      this.logger.error("Unable to check health:", error)
      return this.createResponse({ status: "fail", output: this.getOutput(error) })
    }
  }

  private async getResponse() {
    const healthCheckPromises = this.healthCheckProviders.map(async (provider) => {
      return { name: provider.name, component: await this.getComponent(provider) }
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

  private async getComponent(provider: IHealthCheckProvider) {
    try {
      return await provider.get()
    } catch (error) {
      this.logger.error(`Unable to check "${provider.name}":`, error)
      return {
        componentType: "system",
        output: this.getOutput(error),
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

  private getOutput(error: unknown) {
    return `${hasMember(error, "message") ? error.message : error}`
  }
}

export interface IHealthCheckProvider {
  get name(): string
  get(): Promise<HealthComponent>
}

export type HealthResponse = {
  status: HealthStatus
  version?: string
  releaseID?: string
  notes?: string[]
  output?: string
  serviceID?: string
  description?: string
  checks?: HealthMeasurements
  links?: HealthLinks
}

export type HealthMeasurements = Record<string, HealthComponent[]>

export type HealthComponent = {
  componentId?: string
  componentType?: "component" | "datastore" | "system"
  observedValue?: unknown
  observedUnit?: string
  status?: HealthStatus
  affectedEndpoints?: string[]
  time?: Date
  output?: string
  links?: HealthLinks
}

export type HealthStatus = "pass" | "fail" | "warn"

export type HealthLinks = Record<string, string>
