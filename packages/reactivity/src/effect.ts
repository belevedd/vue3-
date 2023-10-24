import { extend, isArray } from '@vue/shared'
import { Dep, createDep } from './dep'
import { ComputedRefImpl } from './computed'

export type EffectScheduler = (...args: any[]) => any

type KeyToDepMap = Map<any, Dep>
/**
 * 收集所有依赖的 WeakMap 实例:
 * targetMap: {
 *   key(响应性对象): targetObj,
 *   value(Map 对象): {
 *     key(响应性对象的指定属性): targetObj.key,
 *     value(指定对象的指定属性的 执行函数合集 Set 对象): [ReactiveEffect, ReactiveEffect, ...]
 *   }
 * }
 */
const targetMap = new WeakMap<any, KeyToDepMap>()

export interface ReactiveEffectOptions {
  lazy?: boolean
  scheduler?: EffectScheduler
}

/**
 * 给函数注册响应式更新
 * 给定的函数将立即运行一次。
 * 每当在其中访问的任何响应性属性被更新时，该函数将再次运行。
 * @param fn 响应式更新的函数
 */
export function effect<T = any>(fn: () => T, options?: ReactiveEffectOptions) {
  const _effect = new ReactiveEffect(fn)

  // 将 options 的属性复制给 _effect
  // 控制 scheduler 的执行顺序
  if (options) {
    extend(_effect, options)
  }

  if (!options || !options.lazy) {
    _effect.run()
  }
}

// 记录当前活跃的 响应函数
export let activeEffect: ReactiveEffect | undefined

export class ReactiveEffect<T = any> {
  computed?: ComputedRefImpl<T>

  constructor(
    public fn: () => T,
    public scheduler: EffectScheduler | null = null
  ) {}

  run() {
    // this = {fn: () => {...}}
    activeEffect = this

    return this.fn()
  }

  stop() {}
}

/**
 * 在触发 get 的时候进行依赖收集
 * @param target 持有响应性属性的对象
 * @param key 要跟踪的响应属性的标识符
 */
export function track(target: object, key: unknown) {
  // 如果当前不存在执行函数, 则直接 return
  if (!activeEffect) return

  // 尝试从 targetMap 中, 根据 target 获取 map
  let depsMap = targetMap.get(target)
  // 如果获取到的 map 不存在, 则生成新的 map 对象, 并把该对象赋值给对应的 value
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()))
  }

  // 尝试从 depsMap 中, 根据 key 获取 Set
  let dep = depsMap.get(key)
  // 如果获取到的 Set 不存在, 则生成新的 Set 对象, 并把该 Set 对象赋值给对应的 value
  if (!dep) {
    depsMap.set(key, (dep = createDep()))
  }

  trackEffects(dep)
}

/**
 * 利用 dep 依次跟踪指定 key 的所有 effect
 */
export function trackEffects(dep: Dep) {
  /**
   * Set.add()
   * 如果 Set 中尚不存在具有相同值的元素，则在 Set 对象中插入一个新的具有指定值的元素。
   * activeEffect! '!'的作用: 非空断言, 认为 activeEffect 一定存在。
   */
  dep.add(activeEffect!)
}

/**
 * 在触发 set 的时候进行触发依赖
 * @param target reactive 对象
 * @param key reactive 对象中的属性值
 * @param newValue 设置的新值
 */
export function trigger(target: object, key: unknown, newValue: unknown) {
  // 根据 target 获取存储的 map 实例
  const depsMap = targetMap.get(target)
  // 如果 map 不存在，则直接 return
  if (!depsMap) return

  // 根据 key 获取存储的 dep (Set 对象)
  const dep: Dep | undefined = depsMap.get(key)

  // 如果 dep 不存在，则直接 return
  if (!dep) return

  triggerEffects(dep)
}

export function triggerEffects(dep: Dep) {
  const effects = isArray(dep) ? dep : [...dep]

  // 依次触发依赖 防止多次调用 computed 发生调用 effect.scheduler() 方法变成死循环
  // 控制先执行 computed 的 effect
  for (const effect of effects) {
    if (effect.computed) {
      triggerEffect(effect)
    }
  }

  for (const effect of effects) {
    if (!effect.computed) {
      triggerEffect(effect)
    }
  }
}

/**
 * 触发指定依赖
 */
export function triggerEffect(effect: ReactiveEffect) {
  // computed 会传入 scheduler 参数
  // 如果存在执行，不存在执行 run 函数
  if (effect.scheduler) {
    effect.scheduler()
  } else {
    effect.run()
  }
}
