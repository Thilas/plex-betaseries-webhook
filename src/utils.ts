export function getFirstSupportedOrDefault<T, C extends Constructor<T>>(values: T[], types: C[]) {
  for (const type of types) {
    for (const value of values) {
      if (value instanceof type) return value as InstanceType<C>
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Constructor<T, TArgs extends any[] = any[]> = new (...args: TArgs) => T

export type NewReturnType<T, TNew> = T extends (...args: infer TArgs) => unknown ? (...args: TArgs) => TNew : never
