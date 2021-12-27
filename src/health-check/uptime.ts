import { provide } from "inversify-binding-decorators"
import { ids } from "../decorators"
import { HealthComponent, IHealthCheckProvider } from "./health-check"

@provide(ids.healthCheckProvider)
export class UptimeHealthCheckProvider implements IHealthCheckProvider {
  get name() {
    return "uptime"
  }

  async get(): Promise<HealthComponent> {
    return {
      componentType: "system",
      observedValue: process.uptime(),
      observedUnit: "s",
      status: "pass",
      time: new Date(),
    }
  }
}
