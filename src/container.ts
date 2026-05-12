import "reflect-metadata"
import { Container, ContainerModule } from "inversify"
import { buildProviderModule } from "@inversifyjs/binding-decorators"
import "./betaseries/betaseries"
import { getConfig, Config } from "./configuration"
import { FaviconHandler, getFaviconHandler } from "./controllers/favicon"
import "./controllers/health-check"
import "./controllers/webhook"
import { getWebhookDefinition, ids } from "./decorators"
import "./health-check/client"
import "./health-check/cpu-usage"
import "./health-check/memory-usage"
import "./health-check/uptime"
import { getLogger, ILogger } from "./logger"
import { getMulterFactory, IMulterFactory } from "./middlewares/multer"
import { MediaId } from "./plex/media/ids"
import "./plex/webhooks/episode"
import { IMediaFactory, IWebhook, MediaFactoryProvider, WebhookProvider } from "./plex/webhooks/manager"
import "./plex/webhooks/movie"
import "./server"

const containerModule = new ContainerModule((options) => {
  options.bind<Config>(ids.config).toDynamicValue(getConfig).inSingletonScope()
  options.bind<ILogger>(ids.logger).toDynamicValue(getLogger).inSingletonScope()
  options.bind<FaviconHandler>(ids.faviconHandler).toDynamicValue(getFaviconHandler).inSingletonScope()
  options.bind<IMulterFactory>(ids.multerFactory).toDynamicValue(getMulterFactory).inSingletonScope()

  options.bind<WebhookProvider>(ids.webhookProvider).toFactory((context) => {
    return (type: string, event: string) => {
      const definition = getWebhookDefinition(type, event)
      const value = context.get<IWebhook>(ids.webhook, { name: definition, optional: true })
      return Promise.resolve(value)
    }
  })

  options.bind<MediaFactoryProvider>(ids.mediaFactoryProvider).toFactory((context) => {
    return (type: string) => {
      const value = context.get<IMediaFactory<MediaId>>(ids.mediaFactory, { name: type, optional: true })
      return Promise.resolve(value)
    }
  })
})

export const container = new Container({ autobind: true })
container.load(buildProviderModule(), containerModule)
container.bind(Container).toConstantValue(container)
