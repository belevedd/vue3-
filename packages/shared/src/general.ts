export const isArray = Array.isArray

export const isObject = (val: unknown) =>
  val !== null && typeof val === 'object'

/**
 * 对比两个数据是否发生改变
 */
export const hasChanged = (value: any, oldValue: any): boolean =>
  // Object.is 判断两个值是否相同
  !Object.is(value, oldValue)

export const isFunction = (val: unknown): val is Function =>
  typeof val === 'function'

export const isString = (val: unknown): val is string => typeof val === 'string'

// Object.assign() 静态方法将一个或者多个源对象中所有可枚举的自有属性复制到目标对象，并返回修改后的目标对象。
export const extend = Object.assign

export const EMPTY_OBJ: { readonly [key: string]: any } = {}
