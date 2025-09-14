import { provide } from "inversify-binding-decorators"
import { ids } from "../decorators"
import { delay } from "../utils"
import { IHealthCheck } from "./health-check"
import { HealthComponent } from "./models"

@provide(ids.healthCheck)
export class CpuUsageHealthCheck implements IHealthCheck {
  get name() {
    return "cpu:utilization"
  }

  async invoke(): Promise<HealthComponent> {
    const startCpuUsage = process.cpuUsage()
    const start = Date.now()
    await delay(10)
    const cpuUsage = process.cpuUsage(startCpuUsage)
    const end = Date.now()

    return {
      componentType: "system",
      observedValue: ((cpuUsage.user + cpuUsage.system) / (end - start) / 1000) * 100,
      observedUnit: "%",
      status: "pass",
      time: new Date(),
    }
  }
}
