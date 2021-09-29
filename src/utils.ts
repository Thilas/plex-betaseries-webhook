// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Args = any[]
type Constructor<T> = new (...args: Args) => T

export function getFirstSupportedOrDefault<T, C extends Constructor<T>>(values: T[], types: C[]) {
  for (const type of types) {
    for (const value of values) {
      if (value instanceof type) return value as InstanceType<C>
    }
  }
}
