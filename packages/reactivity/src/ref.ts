import { hasChanged } from '@vue/shared'
import { Dep, createDep } from './dep'
import { activeEffect, trackEffects, triggerEffects } from './effect'
import { toReactive } from './reactive'

export interface Ref<T = any> {
  value: T
}

/**
 * 获取一个内部值, 并返回一个响应的 ref 对象。
 * 它只有一个属性 .value 指向内部值。
 * @param value 在 ref 中包装的对象
 * @returns ref 对象
 */
export function ref(value?: unknown) {
  return createRef(value, false)
}

/**
 * 创建响应性 ref
 */
function createRef(rawValue: unknown, shallow: boolean) {
  // 如果传入的 rawValue 为 ref 对象, 则直接返回 rawValue
  if (isRef(rawValue)) {
    return rawValue
  }

  // 如果传入的 rawValue 不是 ref 对象, 返回 ref 类
  return new RefImpl(rawValue, shallow)
}

/**
 * 创建 ref 类, 包含get/set value 方法。
 * 当执行 ref.value 时会执行 get 方法;
 *  -当执行 ref.value.property = xxx 时,
 *    --先执行 ref.value 触发 ref 的 get value 方法;
 *    --再执行 reactive{ref.value}.property = xxx 触发 reactive 的 set 方法。
 * 当执行 ref.value = xxx 时会执行 set 方法。
 */
class RefImpl<T> {
  private _value: T
  private _rawValue: T
  public dep?: Dep = undefined
  public readonly __v_isRef = true

  constructor(value: T, public readonly __v_isShallow: boolean) {
    /**
     * 如果传入的 __v_isShallow 为 true 返回 value;
     * 如果传入的 __v_isShallow 为 false 判断 value 的类型:
     *  -当 value 为对象类型时, 执行 reactive(value) 变为 Proxy(value);
     *  -当 value 不为对象类型时, 直接返回 value。
     */
    this._rawValue = value
    this._value = __v_isShallow ? value : toReactive(value)
  }

  // 执行 ref.value 时调用的 get value 方法
  get value() {
    // 收集依赖
    trackRefValue(this)
    return this._value
  }

  // 执行 ref.value = xxx 时调用的 set value 方法
  set value(newVal) {
    // 如果新值发生改变
    if (hasChanged(newVal, this._rawValue)) {
      // 将原先的值赋值为 newVal
      this._rawValue = newVal
      // 对当前 _value 重新赋值:
      // -如果新值是对象类型, 返回reactive(newVal);
      // -如果新值不是对象类型, 直接返回。
      this._value = toReactive(newVal)
      // 触发依赖
      triggerRefValue(this)
    }
  }
}

type RefBase<T> = {
  dep?: Dep
  value: T
}

/**
 * 触发 get value 的时候进行依赖收集
 */
export function trackRefValue(ref: RefBase<any>) {
  if (activeEffect) {
    trackEffects(ref.dep || (ref.dep = createDep()))
  }
}

/**
 * 触发 set value 的时候进行触发依赖
 */
export function triggerRefValue(ref: RefBase<any>) {
  if (ref.dep) {
    // 触发所有 ref.dep 中的 effect 函数
    triggerEffects(ref.dep)
  }
}

/**
 * 是否为 ref
 */
export function isRef(r: any): r is Ref {
  return !!(r && r.__v_isRef === true)
}
