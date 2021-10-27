import { getFirstSupportedOrDefault } from "./utils"

describe("getFirstSupportedOrDefault", () => {
  abstract class Base {
    abstract readonly type: string
  }
  class A extends Base {
    readonly type = "a"
  }
  class B extends Base {
    readonly type = "b"
  }
  class C extends Base {
    readonly type = "c"
  }

  it("returns undefined when empty list", () => {
    // act
    const result = getFirstSupportedOrDefault([] as Base[], [A])
    // assert
    expect(result).toBeUndefined()
  })

  it("returns undefined when empty supported types", () => {
    // act
    const result = getFirstSupportedOrDefault([new A()] as Base[], [])
    // assert
    expect(result).toBeUndefined()
  })

  it("returns undefined when no supported types", () => {
    // act
    const result = getFirstSupportedOrDefault([new A()] as Base[], [B, C])
    // assert
    expect(result).toBeUndefined()
  })

  it("returns item of first supported type", () => {
    // act
    const result = getFirstSupportedOrDefault([new A(), new C(), new B()] as Base[], [B, C])
    // assert
    expect(result).toEqual(new B())
  })
})
