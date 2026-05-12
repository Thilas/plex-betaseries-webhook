import { container } from "./container"
import { injectable } from "inversify"
import { getWebhookDefinition, ids, whenTargetNamedConstraint } from "./decorators"
import { MediaId } from "./plex/media/ids"
import { IMedia, IMediaFactory, IWebhook, MediaFactoryProvider, WebhookProvider } from "./plex/webhooks/manager"

describe("container", () => {
  //#region Container
  beforeEach(() => {
    container.snapshot()
  })
  afterEach(() => {
    container.restore()
  })
  //#endregion

  describe("WebhookProvider", () => {
    @injectable()
    class TestWebhook implements IWebhook {
      process(): Promise<void> {
        throw new Error("Method not implemented.")
      }
    }

    it("returns the expected webhook", async () => {
      // arrange
      const fakeType = "fakeType"
      const fakeEvent = "fakeEvent"
      container
        .bind(ids.webhook)
        .to(TestWebhook)
        .inSingletonScope()
        .when(whenTargetNamedConstraint(getWebhookDefinition(fakeType, fakeEvent)))
      const getWebhook = container.get<WebhookProvider>(ids.webhookProvider)
      // act
      const webhook = await getWebhook(fakeType, fakeEvent)
      // assert
      expect(webhook).toBeInstanceOf(TestWebhook)
    })

    it("returns nothing if webhook does not exist", async () => {
      // arrange
      const fakeType = "fakeType"
      const fakeEvent = "fakeEvent"
      const getWebhook = container.get<WebhookProvider>(ids.webhookProvider)
      // act
      const webhook = await getWebhook(fakeType, fakeEvent)
      // assert
      expect(webhook).toBeUndefined()
    })
  })

  describe("MediaFactoryProvider", () => {
    @injectable()
    class TestMediaFactory implements IMediaFactory<MediaId> {
      create(): IMedia<MediaId> | undefined {
        throw new Error("Method not implemented.")
      }
    }

    it("returns the expected webhook", async () => {
      // arrange
      const fakeType = "fakeType"
      container.bind(ids.mediaFactory)
        .to(TestMediaFactory)
        .inSingletonScope()
        .when(whenTargetNamedConstraint(fakeType))
      const getMediaFactory = container.get<MediaFactoryProvider>(ids.mediaFactoryProvider)
      // act
      const mediaFactory = await getMediaFactory(fakeType)
      // assert
      expect(mediaFactory).toBeInstanceOf(TestMediaFactory)
    })

    it("returns nothing if webhook does not exist", async () => {
      // arrange
      const fakeType = "fakeType"
      const getMediaFactory = container.get<MediaFactoryProvider>(ids.mediaFactoryProvider)
      // act
      const mediaFactory = await getMediaFactory(fakeType)
      // assert
      expect(mediaFactory).toBeUndefined()
    })
  })
})
