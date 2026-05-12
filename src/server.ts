import { Container, inject } from "inversify"
import { InversifyExpressHttpAdapter } from "@inversifyjs/http-express"
import { Configuration } from "./configuration"
import { ids, provideSingleton } from "./decorators"
import { ILogger } from "./logger"
import { GlobalErrorFilter } from "./middlewares/error"
import { IProcess } from "./process"

@provideSingleton(Server)
export class Server implements IProcess {
  constructor(
    @inject(Container) readonly container: Container,
    @inject(ids.logger) readonly logger: ILogger,
    @inject(Configuration) readonly configuration: Configuration,
  ) { }

  async start() {
    const adapter = new InversifyExpressHttpAdapter(
      this.container,
      {
        logger: true,
        useJson: true,
      },
    )
    adapter.useGlobalFilters(GlobalErrorFilter)
    const app = await adapter.build()
    return new Promise<void>((resolve) => {
      app
        .listen(this.configuration.server.port,)
        .on("listening", () => this.logger.info(`Server running at ${this.configuration.server.url}`))
        .on("close", () => resolve())
    })
  }
}
