import axios from "axios"

export type ClientConfig = {
  url: string
  apiVersion: string
  timeoutInSeconds: number
  clientId: string
  clientSecret: string
}

type BetaSeriesError = {
  code: number
  text: string
}

export async function getAccessToken(config: ClientConfig, selfUrl: string, code: string) {
  const client = getClient(config)
  const res = await client.post("oauth/access_token", {
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: selfUrl,
    code: code,
  })
  const accessToken = res.data.access_token as string
  console.log("Checking new access token...")
  const { login } = await initializeClientUsingAccessToken(config, accessToken)
  return { accessToken, login }
}

export async function initializeClient(config: ClientConfig, accessToken?: string) {
  console.log("Checking access token...")
  return await initializeClientUsingAccessToken(config, accessToken)
}

async function initializeClientUsingAccessToken(config: ClientConfig, accessToken?: string) {
  if (!accessToken) {
    throw "Empty access token"
  }
  const client = getClient(config, accessToken)
  const res = await client.get("members/infos")
  return { client, login: res.data.member.login as string }
}

function getClient(config: ClientConfig, accessToken?: string) {
  const client = axios.create({
    baseURL: config.url,
    timeout: config.timeoutInSeconds * 1000,
    headers: getHeaders(config, accessToken),
  })
  // Intercept errors to display the actual BetaSeries errors (if applicable)
  client.interceptors.response.use(undefined, (error) => {
    const errors: Partial<BetaSeriesError>[] = error?.response?.data?.errors ?? []
    const texts = errors
      .filter((e): e is BetaSeriesError => typeof e.code === "number" && typeof e.text === "string")
      .map((e) => `- [${e.code}] ${e.text}`)
    if (texts.length) {
      return Promise.reject({
        ...error,
        message: [error.message, ...texts].join("\n"),
      })
    }
    return Promise.reject(error)
  })
  return client
}

function getHeaders(config: ClientConfig, accessToken?: string) {
  const headers = {
    "X-BetaSeries-Version": config.apiVersion,
    "X-BetaSeries-Key": config.clientId,
  }
  return accessToken
    ? {
        ...headers,
        Authorization: `Bearer ${accessToken}`,
      }
    : headers
}
