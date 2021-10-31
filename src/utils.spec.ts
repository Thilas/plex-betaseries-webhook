import { getFirstSupportedOrDefault, hasMember } from "./utils"

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

describe("hasMember", () => {
  const expectedValue = "value"
  const sut = { a: expectedValue } as unknown

  it("returns false if the object doesn't have a specific member", () => {
    // act
    const result = hasMember(sut, "b")
    // assert
    expect(result).toBeFalsy()
    expect(result ? sut.b : expectedValue).toEqual(expectedValue)
  })

  it("returns true if the object has a specific member", () => {
    // act
    const result = hasMember(sut, "a")
    // assert
    expect(result).toBeTruthy()
    expect(result ? sut.a : undefined).toEqual(expectedValue)
  })
})
