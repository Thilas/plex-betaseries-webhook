import {
  EqualMatchingInjectorConfig,
  GetPropertyInteraction,
  IMock,
  IMockOptions as IMoqOptions,
  InOperatorInteraction,
  Interaction,
  It,
  MethodInteraction,
  Mock as Moq,
  NamedMethodInteraction,
  NewOperatorInteraction,
  SetPropertyInteraction,
} from "moq.ts"

export { IMock, It, Times } from "moq.ts"

export interface IMockOptions<T> extends IMoqOptions<T> {
  loose?: boolean
  builder?: MockBuilder<T>
}

export type MockBuilder<T> = (mock: IMock<T>) => void

export class Mock<T> extends Moq<T> {
  constructor(options?: IMockOptions<T>) {
    if (!options?.injectorConfig) {
      options = { ...options, injectorConfig: new EqualMatchingInjectorConfig() }
    }
    super(options)
    if (!options?.loose) {
      this.setup(() => It.IsAny()).callback((i) => {
        const message = getInteractionErrorMessage(i)
        throw new Error(message)
      })

      // Need to explicitely setup `then` property to avoid issues when a mocked object is return as a promise
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.setup((e: any) => e.then).returns(undefined)
    }
    if (options?.builder) {
      options.builder(this)
    }
  }
}

function getInteractionErrorMessage(interaction: Interaction) {
  if (interaction instanceof NewOperatorInteraction) {
    return `Setup is missing for new T(${formatArgs(interaction)})`
  }
  if (interaction instanceof NamedMethodInteraction) {
    return `Setup is missing for T.${formatName(interaction)}(${formatArgs(interaction)})`
  }
  if (interaction instanceof GetPropertyInteraction) {
    return `Setup is missing: T.${formatName(interaction)}`
  }
  if (interaction instanceof SetPropertyInteraction) {
    return `Setup is missing: T.${formatName(interaction)} = ${formatValue(interaction.value)}`
  }
  if (interaction instanceof InOperatorInteraction) {
    return `Setup is missing: ${formatName(interaction)} in T`
  }
  if (interaction instanceof MethodInteraction) {
    return `Setup is missing: T(${formatArgs(interaction)})`
  }
  throw new Error("Unknown interaction type.")
}

function formatName(interaction: Interaction) {
  return formatValue(interaction.name)
}

function formatArgs(interaction: Interaction) {
  return interaction.args?.map(formatValue).join(", ") ?? ""
}

function formatValue<T>(value: T) {
  switch (typeof value) {
    case "string":
      return `"${value}"`
    case "symbol":
      return `[${value.description}]`
    default:
      return `${value}`
  }
}
