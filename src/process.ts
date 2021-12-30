import { container } from "./container"
import { Constructor } from "./utils"

export interface IProcess {
  start(): void
}

export function startProcess(type: Constructor<IProcess>) {
  const process = container.get<IProcess>(type)
  process.start()
}
