import { BindingConstraints, ServiceIdentifier } from "inversify"
import { provide } from "@inversifyjs/binding-decorators"

export function provideSingleton<T>(serviceIdentifier: ServiceIdentifier<T>) {
  return provide(serviceIdentifier, (bind) => bind
    .inSingletonScope()
  )
}

export function getWebhookDefinition(type: string, event: string) {
  return `${type}/${event}`
}

export function provideWebhook(type: string, event: string) {
  return provide(ids.webhook, (bind) => bind
    .inSingletonScope()
    .when(whenTargetNamedConstraint(getWebhookDefinition(type, event)))
  )
}

export function provideMediaFactory(type: string) {
  return provide(ids.mediaFactory, (bind) => bind
    .inSingletonScope()
    .when(whenTargetNamedConstraint(type))
  )
}

export function whenTargetNamedConstraint(name: string) {
  return (metadata: BindingConstraints) => metadata.name === name
}

export const ids = {
  config: Symbol.for("Config"),
  logger: Symbol.for("Logger"),
  faviconHandler: Symbol.for("FaviconHandler"),
  multerFactory: Symbol.for("MulterFactory"),

  webhook: Symbol.for("Webhook"),
  webhookProvider: Symbol.for("WebhookProvider"),

  mediaFactory: Symbol.for("MediaFactory"),
  mediaFactoryProvider: Symbol.for("MediaFactoryProvider"),

  healthCheck: Symbol.for("HealthCheck"),
}
