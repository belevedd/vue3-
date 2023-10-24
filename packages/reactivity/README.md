# reactivity —— 响应性核心

## 1.Reactive 响应式原理

- 在执行以下代码时：

```javascript
const obj = reactive({
  name: '张三'
})
```

### 1.1. 执行 reactive 函数

1. 首先执行 reactive 函数：

```typescript
// reactive.ts
/**
 * @param target {name: '张三'}
 */
function reactive(target: object) {
  return createReactiveObject(target, mutableHandlers, reactiveMap)
}
```

在此函数中，返回一个 createReactiveObject 函数。此函数传入三个参数：

```
target: {name: '张三'}
mutableHandlers: 在 baseHandlers.ts 中定义的响应数据处理器, 存在 get/set 方法
reactiveMap: 在 reactive.ts 中定义的 WeakMap 对象数组
```

2. 执行返回的 createReactiveObject 函数：

```typescript
// reactive.ts
function createReactiveObject(
  target: object,
  baseHandlers: ProxyHandler<any>,
  proxyMap: WeakMap<object, any>
) {
  const existingProxy = proxyMap.get(target)
  if (existingProxy) {
    return existingProxy
  }

  const proxy = new Proxy(target, baseHandlers)

  proxyMap.set(target, proxy)
  return proxy
}
```

在此函数中，将 target 对象进行 Proxy 代理，绑定对应的处理操作。

3. mutableHandlers 响应拦截对象：

```typescript
// baseHandlers.ts
const get = createGetter()
const set = createSetter()
const mutableHandlers: ProxyHandler<object> = {
  get,
  set
}
```

```typescript
// baseHandlers.ts
function createGetter() {
  return function get(target: object, key: string | symbol, receiver: object) {
    const res = Reflect.get(target, key, receiver)
    track(target, key)
    return res
  }
}
```

createGetter 函数主要返回 target[key] 内容，并执行 track 依赖收集函数。

```typescript
// baseHandlers.ts
function createSetter() {
  return function set(
    target: object,
    key: string | symbol,
    value: unknown,
    receiver: object
  ) {
    const result = Reflect.set(target, key, value, receiver)
    trigger(target, key, value)
    return result
  }
}
```

createSetter 函数主要将 target[key] = value，并执行 trigger 触发依赖函数。

- 再执行以下赋值代码：

```javascript
effect(() => {
  document.querySelector('#app').innerText = obj.name
})
```

### 1.2. 执行 effect 函数

1. 首先执行 effect 函数：

```typescript
// effect.ts
/**
 * @param fn () => { document.querySelector('#app').innerText = obj.name }
 */
function effect<T = any>(fn: () => T) {
  const _effect = new ReactiveEffect(fn)
  _effect.run()
}
```

创建 ReactiveEffect 类，并直接执行 fn 函数，先进行赋值。

2. ReactiveEffect 类：

```typescript
// effect.ts
class ReactiveEffect<T = any> {
  constructor(public fn: () => T) {}
  run() {
    // this = {fn: () => {...}}
    activeEffect = this
    return this.fn()
  }
}
```

3. 在获取 obj.name 时，触发 mutableHandlers 的 get 方法，执行 track 函数收集依赖

```typescript
// dep.ts
type Dep = Set<ReactiveEffect>
```

```typescript
// effect.ts
type KeyToDepMap = Map<any, Dep>
const targetMap = new WeakMap<any, KeyToDepMap>()
function track(target: object, key: unknown) {
  if (!activeEffect) return

  let depsMap = targetMap.get(target)
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()))
  }

  let dep = depsMap.get(key)
  if (!dep) {
    depsMap.set(key, (dep = createDep()))
  }

  trackEffects(dep)
}
function trackEffects(dep: Dep) {
  dep.add(activeEffect!)
}
```

- targetMap 的主要结构为：

```
targetMap: {
  key(响应性对象): targetObj,
  value(Map 对象): {
    key(响应性对象的指定属性): targetObj.key,
    value(指定对象的指定属性的 执行函数合集 Set 对象): [ReactiveEffect, ReactiveEffect, ...]
  }
}
```

### 1.3. 当对象中的值发生改变时

1. 当对象中的值发生改变时：

```javascript
obj.name = '李四'
```

2. 触发 mutableHandlers 的 set 方法，执行 trigger 函数触发依赖

```typescript
// dep.ts
const createDep = (effects?: ReactiveEffect[]): Dep => {
  const dep = new Set<ReactiveEffect>(effects) as Dep
  return dep
}
```

```typescript
// effect.ts
function trigger(target: object, key: unknown, newValue: unknown) {
  const depsMap = targetMap.get(target)
  if (!depsMap) return

  const dep: Dep | undefined = depsMap.get(key)
  if (!dep) return

  triggerEffects(dep)
}
function triggerEffects(dep: Dep) {
  const effects = isArray(dep) ? dep : [...dep]

  for (const effect of effects) {
    triggerEffect(effect)
  }
}
function triggerEffect(effect: ReactiveEffect) {
  effect.run()
}
```

当执行 trigger 函数时，会执行 get 方法中收集到该触发属性的每一个 fn 函数，将 dom 中的值进行修改。
在执行 fn 函数又会调用 get 方法。

### 1.4. 为什么 reactive 只能是对 object 进行响应？

因为使用的 Proxy 语句 new Proxy(target, handler)，target 只能是任何类型的对象，包括原生数组、函数、甚至另一个代理。

## 2.Ref 响应式原理

- 在执行以下代码时：

```javascript
const obj = ref({
  name: '张三'
})
// 或
const name = ref('张三')
```

### 2.1.执行 ref 函数

1. 首先执行 ref 函数：

```typescript
// ref.ts
function ref(value?: unknown) {
  return createRef(value, false)
}
```

在此函数中，返回一个 createRef 函数。

2. 执行返回的 createRef 函数：

```typescript
// ref.ts
function createRef(rawValue: unknown, shallow: boolean) {
  if (isRef(rawValue)) {
    return rawValue
  }

  return new RefImpl(rawValue, shallow)
}
```

```typescript
// ref.ts
class RefImpl<T> {
  private _value: T
  private _rawValue: T
  public dep?: Dep = undefined
  public readonly __v_isRef = true

  constructor(value: T, public readonly __v_isShallow: boolean) {
    this._rawValue = value
    this._value = __v_isShallow ? value : toReactive(value)
  }

  get value() {
    trackRefValue(this)
    return this._value
  }

  set value(newVal) {
    if (hasChanged(newVal, this._rawValue)) {
      this._rawValue = newVal
      this._value = toReactive(newVal)
      triggerRefValue(this)
    }
  }
}
```

### 2.2.ref 响应性

1. 如果 ref 内部是一个对象类型时：
   1. 首先在执行 ref.value 时，触发 ref 的 get value 方法，将 ref.value 返回为 reactive(ref.value)。
   2. 执行 ref.value.property 时，相当于 reactive(ref.value).property 触发 reactive 的 setter 方法；
   3. 执行 ref.value.property = xxx 时，相当于 reactive(ref.value).property = xxx 触发 reactive 的 getter 方法；
   4. 所以 ref 的对象类型的响应性，其实是就是 reactive 的响应性。
2. 如果 ref 内部是一个基本类型时：
   1. 首先在执行 ref.value 时，触发 ref 的 get value 方法，将 effect 函数存储在 ref.dep 中；
   2. 执行 ref.value = xxx 时，触发 ref 的 set value 方法，将 ref.dep 中的所有 effect 函数循环调用，实现数据的响应式修改。

### 2.3.为什么 ref 的调用要使用 .value 的方式？

因为对于基本类型来说，并没有通过任何方式将数据绑定成响应式数据，ref 实现基本类型数据的响应性，是通过主动调用 RefImpl 类中的 get value 或 set value 方法来实现的。

所以 ref 在调用的时候需要使用 ref.value 的方式。

## 3.computed 响应式原理

- 计算属性的实例，本质上是一个 ComputedRefImpl 的实例；
- ComputedRefImpl 中通过 dirty 变量来控制 run 的执行和 triggerRefValue 的触发；
- 想要访问计算属性的值，必须通过 .value，因为他内部和 ref 一样时通过 get value 来进行实现的；
- 每次 .value 时都会触发 trackRefValue 即：依赖收集；
- 在依赖触发时，需要谨记，先触发 computed 的 effect，再触发非 computed 的 effect，以免发生死循环的情况。
