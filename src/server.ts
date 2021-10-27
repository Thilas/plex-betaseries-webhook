import { Container, inject } from "inversify"
import { InversifyExpressServer } from "inversify-express-utils"
import { BetaSeriesAuthProvider } from "./betaseries/authentication"
import { Configuration } from "./configuration"
import { ids, provideSingleton } from "./decorators"
import { ILogger } from "./logger"
import { getErrorHandler } from "./middlewares/error"

@provideSingleton(Server)
export class Server {
  constructor(
    readonly container: Container,
    @inject(ids.logger) readonly logger: ILogger,
    readonly configuration: Configuration,
  ) {}

  listen() {
    new InversifyExpressServer(this.container, null, null, null, BetaSeriesAuthProvider)
      .setErrorConfig((app) => app.use(getErrorHandler(this.logger)))
      .build()
      .listen(this.configuration.server.port)
      .on("listening", () => {
        this.logger.info(`Server running at ${this.configuration.server.url}`)
      })
  }
}
