import { Container, ContainerModule } from "inversify"
import { buildProviderModule } from "inversify-binding-decorators"
import "./betaseries/betaseries"
import { getConfig, IConfig } from "./configuration"
import "./controllers/webhook"
import { getWebhookDefinition, ids } from "./decorators"
import { getLogger, ILogger } from "./logger"
import { getMulterFactory, IMulterFactory } from "./middlewares/multer"
import { PayloadProvider } from "./middlewares/payload"
import { MediaId } from "./plex/media/ids"
import "./plex/webhooks/episode"
import "./plex/webhooks/movie"
import { IMediaFactory, IWebhook, MediaFactoryProvider, WebhookProvider } from "./plex/webhooks/manager"
import "./server"

const containerModule = new ContainerModule((bind) => {
  bind<IConfig>(ids.config).toDynamicValue(getConfig).inSingletonScope()
  bind<ILogger>(ids.logger).toDynamicValue(getLogger).inSingletonScope()
  bind<IMulterFactory>(ids.multerFactory).toDynamicValue(getMulterFactory).inSingletonScope()

  bind<PayloadProvider>(ids.payloadProvider).toProvider(() => {
    return () => Promise.reject("No payload in this context.")
  })

  bind<WebhookProvider>(ids.webhookProvider).toProvider((context) => {
    return (type: string, event: string) => {
      const definition = getWebhookDefinition(type, event)
      const value = context.container.isBoundNamed(ids.webhook, definition)
        ? context.container.getNamed<IWebhook>(ids.webhook, definition)
        : undefined
      return Promise.resolve(value)
    }
  })

  bind<MediaFactoryProvider>(ids.mediaFactoryProvider).toProvider((context) => {
    return (type: string) => {
      const value = context.container.isBoundNamed(ids.mediaFactory, type)
        ? context.container.getNamed<IMediaFactory<MediaId>>(ids.mediaFactory, type)
        : undefined
      return Promise.resolve(value)
    }
  })
})

export const container = new Container()
container.load(buildProviderModule(), containerModule)
container.bind(Container).toConstantValue(container)
