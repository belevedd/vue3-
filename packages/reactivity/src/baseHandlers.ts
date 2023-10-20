import { track, trigger } from './effect'

const get = createGetter()

// 返回一个闭包 get 方法
function createGetter() {
  return function get(target: object, key: string | symbol, receiver: object) {
    /**
     * Reflect 是一个内置的对象，它提供拦截 JavaScript 操作的方法。
     * Reflect.get(target, key[, receiver]) 获取对象身上某个属性的值，类似于 target[key]。
     *  -target: 需要取值的目标对象;
     *  -key: 需要获取的值的键值;
     *  -receiver: 如果 target 对象中指定了 getter, receiver 则为 getter 调用时的 this 值。
     */
    const res = Reflect.get(target, key, receiver)

    // 在触发 get 的时候进行依赖收集
    track(target, key)

    return res
  }
}

const set = createSetter()

// 返回一个闭包 set 方法
function createSetter() {
  return function set(
    target: object,
    key: string | symbol,
    value: unknown,
    receiver: object
  ) {
    /**
     * Reflect.set(target, key, value[, receiver]) 将值分配给属性的函数, 类似于 target[key] = value。
     *  -target: 设置属性的目标对象;
     *  -key: 设置的属性的名称;
     *  -value: 设置的值;
     *  -receiver: 如果 target 对象中指定 setter, receiver则为 setter 调用时的 this 值。
     *  -返回一个Boolean，如果更新成功，则返回true。
     */
    const result = Reflect.set(target, key, value, receiver)

    // 在触发 set 的时候进行触发依赖
    trigger(target, key, value)

    return result
  }
}

/**
 * 响应性的 handler
 * 执行 get 或 set 方法
 */
export const mutableHandlers: ProxyHandler<object> = {
  get,
  set
}
