import { provide } from "inversify-binding-decorators"
import { ids } from "../decorators"
import { IHealthCheck } from "./health-check"
import { HealthComponent } from "./models"

@provide(ids.healthCheck)
export class UptimeHealthCheck implements IHealthCheck {
  get name() {
    return "uptime"
  }

  async invoke(): Promise<HealthComponent> {
    return {
      componentType: "system",
      observedValue: process.uptime(),
      observedUnit: "s",
      status: "pass",
      time: new Date(),
    }
  }
}
