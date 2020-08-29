import { It, Mock } from "moq.ts"
import request from "supertest"
import { BetaSeries, IBetaSeriesMember } from "./betaseries/betaseries"
import { BetaSeriesEpisode, BetaSeriesMovie, BetaSeriesMovieStatus } from "./betaseries/models"
import * as plex from "./plex/plex"
import { initializeServer } from "./server"

describe("server", () => {
  //#region Console mock
  const backup = {
    error: console.error,
    warn: console.warn,
    log: console.log,
  }
  beforeAll(() => {
    console.error = jest.fn()
    console.log = jest.fn()
  })
  afterAll(() => {
    console.error = backup.error
    console.log = backup.log
  })
  afterEach(() => {
    console.warn = backup.warn
  })
  //#endregion

  const selfUrl = "http://localhost/"

  describe("configuration", () => {
    //#region Webhook mock
    let initialized: ReturnType<typeof initializeServer>
    beforeEach(() => {
      jest.spyOn(plex, "usePlexWebhook")
    })
    afterEach((done) => {
      jest.restoreAllMocks()
      initialized.server?.then((server) => {
        server.close()
        done()
      })
    })
    //#endregion

    const betaSeries = new Mock<BetaSeries>().object()

    it("uses default url", () => {
      // act
      initialized = initializeServer(betaSeries, undefined, true)
      // assert
      expect(plex.usePlexWebhook).toHaveBeenCalledTimes(1)
      expect(plex.usePlexWebhook).toHaveBeenCalledWith(initialized.app, selfUrl, expect.anything(), betaSeries)
    })

    it("uses default url with specified port", () => {
      // act
      initialized = initializeServer(betaSeries, { port: 123 }, true)
      // assert
      expect(plex.usePlexWebhook).toHaveBeenCalledTimes(1)
      expect(plex.usePlexWebhook).toHaveBeenCalledWith(
        initialized.app,
        "http://localhost:123/",
        expect.anything(),
        betaSeries,
      )
    })

    it("uses specified url", () => {
      // act
      initialized = initializeServer(betaSeries, { url: "fakeUrl", port: 123 }, true)
      // assert
      expect(plex.usePlexWebhook).toHaveBeenCalledTimes(1)
      expect(plex.usePlexWebhook).toHaveBeenCalledWith(initialized.app, "fakeUrl", expect.anything(), betaSeries)
    })
  })

  describe("betaseries authentication", () => {
    // eslint-disable-next-line jest/expect-expect
    it("redirects if no code", async () => {
      // arrange
      const bsMock = new Mock<BetaSeries>().setup((i) => i.redirectForUserCode(It.IsAny(), It.IsAny())).returns()
      const { app } = initializeServer(bsMock.object())
      // act
      await request(app).get("")
      // assert
      bsMock.verify((i) => i.redirectForUserCode(It.IsAny(), selfUrl))
    })

    // eslint-disable-next-line jest/expect-expect
    it("displays access token if code", async () => {
      // arrange
      const bsMock = new Mock<BetaSeries>()
        .setup((i) => i.displayAccessToken(It.IsAny(), It.IsAny(), It.IsAny(), It.IsAny()))
        .returns(Promise.resolve())
      const { app } = initializeServer(bsMock.object())
      // act
      await request(app).get("?code=fakeCode")
      // assert
      bsMock.verify((i) => i.displayAccessToken(It.IsAny(), selfUrl, "fakeCode", It.IsAny()))
    })
  })

  describe("plex webhook", () => {
    const initialize = () => {
      const mbMock = new Mock<IBetaSeriesMember>()
      const bsMock = new Mock<BetaSeries>()
        .setup((bs) => bs.getMember(It.IsAny()))
        .returns(Promise.resolve(mbMock.object()))
      const { app } = initializeServer(bsMock.object())
      return { app, bsMock, mbMock }
    }

    describe("payload", () => {
      it("fails if missing", async () => {
        // arrange
        const { app } = initialize()
        // act
        const res = await request(app).post("").send("data")
        // assert
        expect(res.status).toEqual(400)
        expect(res.text).toEqual("Missing payload")
      })
    })

    describe("access token", () => {
      it("fails if missing", async () => {
        // arrange
        const { app } = initialize()
        // act
        const res = await request(app)
          .post("")
          .field({ payload: JSON.stringify({ fakeKey: "fakeValue" }) })
        // assert
        expect(res.status).toEqual(400)
        expect(res.text).toEqual("A single accessToken query parameter is required")
      })
    })

    const url = "?accessToken=fakeToken"

    describe("metadata type", () => {
      it("warns if missing", async () => {
        // arrange
        const { app } = initialize()
        console.warn = jest.fn()
        // act
        await request(app)
          .post(url)
          .field({ payload: JSON.stringify({ fakeKey: "fakeValue" }) })
        // assert
        expect(console.warn).toHaveBeenCalledTimes(1)
        expect(console.warn).toHaveBeenCalledWith("Unknown Plex metadata type: undefined")
      })

      it("warns if unknown", async () => {
        // arrange
        const { app } = initialize()
        console.warn = jest.fn()
        // act
        await request(app)
          .post(url)
          .field({ payload: JSON.stringify({ Metadata: { type: "fakeType" } }) })
        // assert
        expect(console.warn).toHaveBeenCalledTimes(1)
        expect(console.warn).toHaveBeenCalledWith("Unknown Plex metadata type: fakeType")
      })
    })

    describe("media id", () => {
      it("fails if missing", async () => {
        // arrange
        const { app } = initialize()
        // act
        const res = await request(app)
          .post(url)
          .field({ payload: JSON.stringify({ event: "media.scrobble", Metadata: { type: "episode" } }) })
        // assert
        expect(res.status).toEqual(400)
        expect(res.text).toEqual("Empty guid")
      })

      it("fails if invalid", async () => {
        // arrange
        const { app } = initialize()
        // act
        const res = await request(app)
          .post(url)
          .field({
            payload: JSON.stringify({ event: "media.scrobble", Metadata: { type: "episode", guid: "fakeGuid" } }),
          })
        // assert
        expect(res.status).toEqual(400)
        expect(res.text).toEqual("Invalid guid: fakeGuid")
      })

      it("warns if unknown", async () => {
        // arrange
        const { app } = initialize()
        console.warn = jest.fn()
        // act
        await request(app)
          .post(url)
          .field({
            payload: JSON.stringify({
              event: "media.scrobble",
              Metadata: { type: "episode", guid: "com.plexapp.agents.fakeAgent://fakeId\b" },
            }),
          })
        // assert
        expect(console.warn).toHaveBeenCalledTimes(1)
        expect(console.warn).toHaveBeenCalledWith("Unknown Plex agent: fakeAgent")
      })
    })

    describe("event", () => {
      describe("scrobble", () => {
        describe("episode", () => {
          it("fails if missing title", async () => {
            // arrange
            const { app } = initialize()
            // act
            const res = await request(app)
              .post(url)
              .field({
                payload: JSON.stringify({
                  event: "media.scrobble",
                  Metadata: {
                    type: "episode",
                    guid: "com.plexapp.agents.thetvdb://fakeId\b",
                    parentIndex: 1,
                    index: 2,
                  },
                }),
              })
            // assert
            expect(res.status).toEqual(400)
            expect(res.text).toEqual("Invalid episode: undefined (fakeId@tvdb) S01E02")
          })

          it("fails if missing season", async () => {
            // arrange
            const { app } = initialize()
            // act
            const res = await request(app)
              .post(url)
              .field({
                payload: JSON.stringify({
                  event: "media.scrobble",
                  Metadata: {
                    type: "episode",
                    guid: "com.plexapp.agents.thetvdb://fakeId\b",
                    grandparentTitle: "fakeTitle",
                    index: 2,
                  },
                }),
              })
            // assert
            expect(res.status).toEqual(400)
            expect(res.text).toEqual("Invalid episode: fakeTitle (fakeId@tvdb) S??E02")
          })

          it("fails if missing episode", async () => {
            // arrange
            const { app } = initialize()
            // act
            const res = await request(app)
              .post(url)
              .field({
                payload: JSON.stringify({
                  event: "media.scrobble",
                  Metadata: {
                    type: "episode",
                    guid: "com.plexapp.agents.thetvdb://fakeId\b",
                    grandparentTitle: "fakeTitle",
                    parentIndex: 1,
                  },
                }),
              })
            // assert
            expect(res.status).toEqual(400)
            expect(res.text).toEqual("Invalid episode: fakeTitle (fakeId@tvdb) S01E??")
          })

          it("fails if unsupported id", async () => {
            // arrange
            const { app } = initialize()
            // act
            const res = await request(app)
              .post(url)
              .field({
                payload: JSON.stringify({
                  event: "media.scrobble",
                  Metadata: {
                    type: "episode",
                    guid: "com.plexapp.agents.imdb://fakeId\b",
                    grandparentTitle: "fakeTitle",
                    parentIndex: 1,
                    index: 2,
                  },
                }),
              })
            // assert
            expect(res.status).toEqual(400)
            expect(res.text).toEqual("Unsupported episode id for fakeTitle S01E02: fakeId@imdb")
          })

          const payload = {
            payload: JSON.stringify({
              event: "media.scrobble",
              Metadata: {
                type: "episode",
                guid: "com.plexapp.agents.thetvdb://fakeId\b",
                grandparentTitle: "fakeTitle",
                parentIndex: 1,
                index: 2,
              },
            }),
          }

          it("fails if not found", async () => {
            // arrange
            const { app, mbMock } = initialize()
            mbMock.setup((i) => i.getEpisodes(It.IsAny())).returns(Promise.resolve([]))
            // act
            const res = await request(app).post(url).field(payload)
            // assert
            expect(res.status).toEqual(400)
            expect(res.text).toEqual("No episode found for: fakeTitle (fakeId@tvdb) S01E02")
          })

          it("fails if found multiple times", async () => {
            // arrange
            const { app, mbMock } = initialize()
            mbMock
              .setup((i) => i.getEpisodes(It.IsAny()))
              .returns(Promise.resolve([{} as BetaSeriesEpisode, {} as BetaSeriesEpisode]))
            // act
            const res = await request(app).post(url).field(payload)
            // assert
            expect(res.status).toEqual(400)
            expect(res.text).toEqual("Multiple episodes found for: fakeTitle (fakeId@tvdb) S01E02")
          })

          it("succeeds if already scrobbled", async () => {
            // arrange
            const { app, mbMock } = initialize()
            mbMock
              .setup((i) => i.getEpisodes(It.IsAny()))
              .returns(Promise.resolve([{ user: { seen: true } } as BetaSeriesEpisode]))
            // act
            const res = await request(app).post(url).field(payload)
            // assert
            expect(res.status).toEqual(200)
          })

          const betaSeriesEpisode = {
            id: 1,
            user: { seen: false },
          } as BetaSeriesEpisode

          it("fails if unable to scrobble", async () => {
            // arrange
            const { app, mbMock } = initialize()
            mbMock.setup((i) => i.getEpisodes(It.IsAny())).returns(Promise.resolve([betaSeriesEpisode]))
            mbMock
              .setup((i) => i.markEpisodeAsWatched(It.IsAny()))
              .returns(Promise.resolve({ user: { seen: false } } as BetaSeriesEpisode))
            // act
            const res = await request(app).post(url).field(payload)
            // assert
            expect(res.status).toEqual(400)
            expect(res.text).toEqual("Episode not marked as watched for: fakeTitle (fakeId@tvdb) S01E02")
          })

          it("succeeds if not already scrobbled", async () => {
            // arrange
            const { app, mbMock } = initialize()
            mbMock.setup((i) => i.getEpisodes(It.IsAny())).returns(Promise.resolve([betaSeriesEpisode]))
            mbMock
              .setup((i) => i.markEpisodeAsWatched(It.IsAny()))
              .returns(Promise.resolve({ user: { seen: true } } as BetaSeriesEpisode))
            // act
            const res = await request(app).post(url).field(payload)
            // assert
            expect(res.status).toEqual(200)
          })
        })

        describe("movie", () => {
          it("fails if missing title", async () => {
            // arrange
            const { app } = initialize()
            // act
            const res = await request(app)
              .post(url)
              .field({
                payload: JSON.stringify({
                  event: "media.scrobble",
                  Metadata: {
                    type: "movie",
                    guid: "com.plexapp.agents.imdb://fakeId\b",
                  },
                }),
              })
            // assert
            expect(res.status).toEqual(400)
            expect(res.text).toEqual("Invalid movie: undefined (fakeId@imdb)")
          })

          it("fails if unsupported id", async () => {
            // arrange
            const { app } = initialize()
            // act
            const res = await request(app)
              .post(url)
              .field({
                payload: JSON.stringify({
                  event: "media.scrobble",
                  Metadata: {
                    type: "movie",
                    guid: "com.plexapp.agents.thetvdb://fakeId\b",
                    title: "fakeTitle",
                  },
                }),
              })
            // assert
            expect(res.status).toEqual(400)
            expect(res.text).toEqual("Unsupported movie id for fakeTitle: fakeId@tvdb")
          })

          const payload = {
            payload: JSON.stringify({
              event: "media.scrobble",
              Metadata: {
                type: "movie",
                guid: "com.plexapp.agents.imdb://fakeId\b",
                title: "fakeTitle",
              },
            }),
          }

          it("fails if not found", async () => {
            // arrange
            const { app, mbMock } = initialize()
            mbMock.setup((i) => i.getMovie(It.IsAny())).returns(Promise.resolve(undefined))
            // act
            const res = await request(app).post(url).field(payload)
            // assert
            expect(res.status).toEqual(400)
            expect(res.text).toEqual("No movie found for: fakeTitle (fakeId@imdb)")
          })

          it("succeeds if already scrobbled", async () => {
            // arrange
            const { app, mbMock } = initialize()
            mbMock
              .setup((i) => i.getMovie(It.IsAny()))
              .returns(Promise.resolve({ user: { status: BetaSeriesMovieStatus.seen } } as BetaSeriesMovie))
            // act
            const res = await request(app).post(url).field(payload)
            // assert
            expect(res.status).toEqual(200)
          })

          const betaSeriesMovie = {
            id: 1,
            user: { status: BetaSeriesMovieStatus.none },
          } as BetaSeriesMovie

          it("fails if unable to scrobble", async () => {
            // arrange
            const { app, mbMock } = initialize()
            mbMock.setup((i) => i.getMovie(It.IsAny())).returns(Promise.resolve(betaSeriesMovie))
            mbMock
              .setup((i) => i.updateMovie(It.IsAny()))
              .returns(Promise.resolve({ user: { status: BetaSeriesMovieStatus.none } } as BetaSeriesMovie))
            // act
            const res = await request(app).post(url).field(payload)
            // assert
            expect(res.status).toEqual(400)
            expect(res.text).toEqual("Movie not marked as watched for: fakeTitle (fakeId@imdb)")
          })

          it("succeeds if not already scrobbled", async () => {
            // arrange
            const { app, mbMock } = initialize()
            mbMock.setup((i) => i.getMovie(It.IsAny())).returns(Promise.resolve(betaSeriesMovie))
            mbMock
              .setup((i) => i.updateMovie(It.IsAny()))
              .returns(Promise.resolve({ user: { status: BetaSeriesMovieStatus.seen } } as BetaSeriesMovie))
            // act
            const res = await request(app).post(url).field(payload)
            // assert
            expect(res.status).toEqual(200)
          })
        })
      })
    })
  })
})
