import { container } from "./container"
import { Constructor } from "./utils"

export interface IProcess {
  start(): Promise<void>
}

export function startProcess(type: Constructor<IProcess>) {
  const process = container.get<IProcess>(type)
  return process.start()
}
