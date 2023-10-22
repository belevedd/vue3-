import { isFunction } from '@vue/shared'
import { Dep } from './dep'
import { ReactiveEffect } from './effect'
import { trackRefValue, triggerRefValue } from './ref'

export type ComputedGetter<T> = (...args: any[]) => T
export type ComputedSetter<T> = (v: T) => void

export interface WritableComputedOptions<T> {
  get: ComputedGetter<T>
  set: ComputedSetter<T>
}

/**
 * 创建 computed 类
 */
export class ComputedRefImpl<T> {
  public dep?: Dep = undefined
  private _value!: T
  public readonly effect: ReactiveEffect<T>
  public readonly __v_isRef = true
  public _dirty = true // 控制是否执行触发依赖, 实现 computed 当数据发生改变才会重新执行内部函数的原因。

  constructor(getter: ComputedGetter<T>) {
    this.effect = new ReactiveEffect(getter, () => {
      // 传入的 scheduler 方法
      if (!this._dirty) {
        this._dirty = true
        // 触发依赖
        triggerRefValue(this)
      }
    })
    this.effect.computed = this
  }

  get value() {
    // 执行 ref 的依赖收集
    trackRefValue(this)
    // 执行 computed 的 getter 参数方法, 并将返回值返回
    if (this._dirty) {
      this._dirty = false
      this._value = this.effect.run()
    }
    return this._value
  }
}

/**
 * 创建 computed
 * @param getterOrOptions computed 定义的内部函数或对象
 * @returns ComputedRefImpl 实例
 */
export function computed<T>(
  getterOrOptions: ComputedGetter<T> | WritableComputedOptions<T>
) {
  let getter: ComputedGetter<T>

  // 如果 getterOrOptions 是函数返沪 true
  const onlyGetter = isFunction(getterOrOptions)

  // 如果 getterOrOptions 是函数, 将 getterOrOptions 直接赋值 getter
  // 如果 getterOrOptions 不是函数, 将 getterOrOptions 的 get 属性赋值给 getter
  if (onlyGetter) {
    getter = getterOrOptions
  } else {
    getter = getterOrOptions.get
  }

  // 执行 ComputedRefImpl 实例
  const cRef = new ComputedRefImpl(getter)

  return cRef as any
}
