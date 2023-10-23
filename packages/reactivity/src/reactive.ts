import { isObject } from '@vue/shared'
import { mutableHandlers } from './baseHandlers'

/**
 * 响应性 Map 缓存对象
 * WeakMap 对象是一组键/值对的集合, 其中的键是弱引用的。其键必须是对象, 而值可以是任意的。
 *  -弱引用: 不会影像垃圾回收机制。即: WeakMap 的 key 不再存在任何引用时, 会被直接回收。
 *  -强引用: 会影像垃圾回收机制。存在强引用的对象永远不会被回收。
 *  -使用 WeakMap 为了优化性能, 减少内存占用。
 * Map 对象保存键/值对, 并且能够记住键的原始插入顺序。任何值都可以作为一个键或一个值。
 * key: target
 * val: proxy
 */
export const reactiveMap = new WeakMap<object, any>()

export const enum ReactiveFlags {
  IS_REACTIVE = '__v_isReactive'
}

/**
 * 为复杂数据类型, 创建响应性对象
 * @param target 被代理对象
 * @returns 代理对象
 */
export function reactive(target: object) {
  return createReactiveObject(target, mutableHandlers, reactiveMap)
}

/**
 * 创建响应性对象
 * @param target 被代理对象
 * @param baseHandlers handler
 * @param proxyMap WeakMap
 * @returns proxy
 */
function createReactiveObject(
  target: object,
  baseHandlers: ProxyHandler<any>,
  proxyMap: WeakMap<object, any>
) {
  // 如果该实例已经被代理, 则直接读取即可
  // WeakMap.get(key) 返回 WeakMap 中与 key 相关联的值, 如果 key 不存在则返回 undefined。
  // 如果存在返回 target 对象的 proxy 代理对象
  const existingProxy = proxyMap.get(target)
  if (existingProxy) {
    return existingProxy
  }

  // 未被代理则生成 proxy 实例
  const proxy = new Proxy(target, baseHandlers)
  proxy[ReactiveFlags.IS_REACTIVE] = true

  // 缓存代理对象
  // WeakMap.set(key, value) 给 WeakMap 中的 key 设置一个 value。该方法返回一个 WeakMap 对象。
  // 给 proxyMap 中的 target 设置一个 value: proxy 的代理对象
  // 当调用多个 reactive 方法时, target 会相应添加进 proxyMap 数组中
  // eg:[{key: target, value: proxy}, {key: target, value: proxy} ...]
  proxyMap.set(target, proxy)
  return proxy
}

export const toReactive = <T extends unknown>(value: T): T =>
  isObject(value) ? reactive(value as object) : value

export function isReactive(value): boolean {
  return !!(value && value[ReactiveFlags.IS_REACTIVE])
}
