import { isArray, isObject } from '@vue/shared'
import { VNode, createVNode, isVNode } from './vnode'

/**
 * 创建 h 函数
 * 通过判断参数的长度, 对 createVNode 函数传入不同的参数
 */
export function h(type: any, propsOrChildren?: any, children?: any): VNode {
  const l = arguments.length

  if (l === 2) {
    if (isObject(propsOrChildren) && !isArray(propsOrChildren)) {
      if (isVNode(propsOrChildren)) {
        return createVNode(type, null, [propsOrChildren])
      }
      return createVNode(type, propsOrChildren)
    } else {
      return createVNode(type, null, propsOrChildren)
    }
  } else {
    if (l > 3) {
      children = Array.prototype.slice.call(arguments, 2)
    } else if (l === 3 && isVNode(children)) {
      children = [children]
    }

    return createVNode(type, propsOrChildren, children)
  }
}
