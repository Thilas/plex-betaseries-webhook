import { provide } from "inversify-binding-decorators"
import { ids } from "../decorators"
import { HealthComponent, IHealthCheckProvider } from "../health-check/health-check"

@provide(ids.healthCheckProvider)
export class MemoryUsageHealthCheckProvider implements IHealthCheckProvider {
  get name() {
    return "memory:utilization"
  }

  async get(): Promise<HealthComponent> {
    return {
      componentType: "system",
      observedValue: process.memoryUsage.rss(),
      observedUnit: "B",
      status: "pass",
      time: new Date(),
    }
  }
}
