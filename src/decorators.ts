import { interfaces } from "inversify"
import { fluentProvide } from "inversify-binding-decorators"

export function provideSingleton<T>(serviceIdentifier: interfaces.ServiceIdentifier<T>) {
  return fluentProvide(serviceIdentifier).inSingletonScope().done(true)
}

export function getWebhookDefinition(type: string, event: string) {
  return `${type}/${event}`
}

export function provideWebhook(type: string, event: string) {
  return fluentProvide(ids.webhook).inSingletonScope().whenTargetNamed(getWebhookDefinition(type, event)).done(true)
}

export function provideMediaFactory(type: string) {
  return fluentProvide(ids.mediaFactory).inSingletonScope().whenTargetNamed(type).done(true)
}

export const ids = {
  config: Symbol.for("Config"),
  logger: Symbol.for("Logger"),
  multerFactory: Symbol.for("MulterFactory"),

  payloadProvider: Symbol.for("PayloadProvider"),

  webhook: Symbol.for("Webhook"),
  webhookProvider: Symbol.for("WebhookProvider"),

  mediaFactory: Symbol.for("MediaFactory"),
  mediaFactoryProvider: Symbol.for("MediaFactoryProvider"),

  healthCheckProvider: Symbol.for("HealthCheckProvider"),
}
