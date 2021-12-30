import { provide } from "inversify-binding-decorators"
import { ids } from "../decorators"
import { IHealthCheck } from "../health-check/health-check"
import { HealthComponent } from "./models"

@provide(ids.healthCheck)
export class MemoryUsageHealthCheck implements IHealthCheck {
  get name() {
    return "memory:utilization"
  }

  async invoke(): Promise<HealthComponent> {
    return {
      componentType: "system",
      observedValue: process.memoryUsage.rss(),
      observedUnit: "B",
      status: "pass",
      time: new Date(),
    }
  }
}
