export interface Payload {
  event: string
  user: boolean
  owner: boolean
  Account?: PayloadAccount
  Server?: PayloadServer
  Player?: PayloadPlayer
  Metadata?: PayloadMetadata
}

export interface PayloadAccount {
  id: string
  thumb: string
  title: string
}

export interface PayloadServer {
  title: string
  uuid: string
}

export interface PayloadPlayer {
  local: boolean
  publicAddress: string
  title: string
  uuid: string
}

export interface PayloadMetadata {
  guid: string
  type: string
  title: string
  grandparentTitle: string
  index: number
  parentIndex: number
}
