import { ReactiveEffect } from './effect'

export type Dep = Set<ReactiveEffect>

/**
 * 创建并返回一个 Set 合集
 */
export const createDep = (effects?: ReactiveEffect[]): Dep => {
  /**
   * Set 对象允许存储任何类型（无论是原始值还是对象引用）的唯一值。
   */
  const dep = new Set<ReactiveEffect>(effects) as Dep

  return dep
}
