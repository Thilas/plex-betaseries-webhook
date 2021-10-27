import "reflect-metadata"
import { PlexSkippedMediaFactory } from "./skipped-media"

describe("PlexSkippedMediaFactory", () => {
  it("returns no media", () => {
    // arrange
    const factory = new PlexSkippedMediaFactory()
    // act
    const media = factory.create()
    // assert
    expect(media).toBeUndefined()
  })
})
