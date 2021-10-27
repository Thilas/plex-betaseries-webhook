import { provideMediaFactory } from "../../decorators"
import { IMediaFactory } from "../webhooks/manager"
import { MediaId } from "./ids"

@provideMediaFactory("show")
@provideMediaFactory("track")
export class PlexSkippedMediaFactory implements IMediaFactory<MediaId> {
  create() {
    return undefined
  }
}
