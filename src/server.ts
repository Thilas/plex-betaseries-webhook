import { Container, inject } from "inversify"
import { InversifyExpressServer } from "inversify-express-utils"
import favicon from "serve-favicon"
import { BetaSeriesAuthProvider } from "./betaseries/authentication"
import { Configuration } from "./configuration"
import { ids, provideSingleton } from "./decorators"
import { ILogger } from "./logger"
import { getErrorHandler } from "./middlewares/error"
import { IProcess } from "./process"
import path from "path"

@provideSingleton(Server)
export class Server implements IProcess {
  constructor(
    readonly container: Container,
    @inject(ids.logger) readonly logger: ILogger,
    readonly configuration: Configuration,
  ) {}

  start() {
    new InversifyExpressServer(this.container, null, null, null, BetaSeriesAuthProvider)
      .setErrorConfig((app) => app.use(getErrorHandler(this.logger)))
      .setConfig((app) => app.use(favicon(path.join(__dirname, "..", "images", "favicon.png"))))
      .build()
      .listen(this.configuration.server.port)
      .on("listening", () => {
        this.logger.info(`Server running at ${this.configuration.server.url}`)
      })
  }
}
