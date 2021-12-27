import { provide } from "inversify-binding-decorators"
import { ids } from "../decorators"
import { delay } from "../utils"
import { HealthComponent, IHealthCheckProvider } from "./health-check"

@provide(ids.healthCheckProvider)
export class CpuUsageHealthCheckProvider implements IHealthCheckProvider {
  get name() {
    return "cpu:utilization"
  }

  async get(): Promise<HealthComponent> {
    const startCpuUsage = process.cpuUsage()
    const start = Date.now()
    await delay(500)
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
