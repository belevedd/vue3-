var Vue = (function (exports) {
    'use strict';

    var isArray = Array.isArray;
    var isObject = function (val) {
        return val !== null && typeof val === 'object';
    };
    /**
     * 对比两个数据是否发生改变
     */
    var hasChanged = function (value, oldValue) {
        // Object.is 判断两个值是否相同
        return !Object.is(value, oldValue);
    };
    var isFunction = function (val) {
        return typeof val === 'function';
    };
    var isString = function (val) { return typeof val === 'string'; };
    // Object.assign() 静态方法将一个或者多个源对象中所有可枚举的自有属性复制到目标对象，并返回修改后的目标对象。
    var extend = Object.assign;
    var EMPTY_OBJ = {};

    /******************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */

    function __values(o) {
        var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
        if (m) return m.call(o);
        if (o && typeof o.length === "number") return {
            next: function () {
                if (o && i >= o.length) o = void 0;
                return { value: o && o[i++], done: !o };
            }
        };
        throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
    }

    function __read(o, n) {
        var m = typeof Symbol === "function" && o[Symbol.iterator];
        if (!m) return o;
        var i = m.call(o), r, ar = [], e;
        try {
            while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
        }
        catch (error) { e = { error: error }; }
        finally {
            try {
                if (r && !r.done && (m = i["return"])) m.call(i);
            }
            finally { if (e) throw e.error; }
        }
        return ar;
    }

    function __spreadArray(to, from, pack) {
        if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
            if (ar || !(i in from)) {
                if (!ar) ar = Array.prototype.slice.call(from, 0, i);
                ar[i] = from[i];
            }
        }
        return to.concat(ar || Array.prototype.slice.call(from));
    }

    /**
     * 创建并返回一个 Set 合集
     */
    var createDep = function (effects) {
        /**
         * Set 对象允许存储任何类型（无论是原始值还是对象引用）的唯一值。
         */
        var dep = new Set(effects);
        return dep;
    };

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
    var targetMap = new WeakMap();
    /**
     * 给函数注册响应式更新
     * 给定的函数将立即运行一次。
     * 每当在其中访问的任何响应性属性被更新时，该函数将再次运行。
     * @param fn 响应式更新的函数
     */
    function effect(fn, options) {
        var _effect = new ReactiveEffect(fn);
        // 将 options 的属性复制给 _effect
        // 控制 scheduler 的执行顺序
        if (options) {
            extend(_effect, options);
        }
        if (!options || !options.lazy) {
            _effect.run();
        }
    }
    // 记录当前活跃的 响应函数
    var activeEffect;
    var ReactiveEffect = /** @class */ (function () {
        function ReactiveEffect(fn, scheduler) {
            if (scheduler === void 0) { scheduler = null; }
            this.fn = fn;
            this.scheduler = scheduler;
        }
        ReactiveEffect.prototype.run = function () {
            // this = {fn: () => {...}}
            activeEffect = this;
            return this.fn();
        };
        ReactiveEffect.prototype.stop = function () { };
        return ReactiveEffect;
    }());
    /**
     * 在触发 get 的时候进行依赖收集
     * @param target 持有响应性属性的对象
     * @param key 要跟踪的响应属性的标识符
     */
    function track(target, key) {
        // 如果当前不存在执行函数, 则直接 return
        if (!activeEffect)
            return;
        // 尝试从 targetMap 中, 根据 target 获取 map
        var depsMap = targetMap.get(target);
        // 如果获取到的 map 不存在, 则生成新的 map 对象, 并把该对象赋值给对应的 value
        if (!depsMap) {
            targetMap.set(target, (depsMap = new Map()));
        }
        // 尝试从 depsMap 中, 根据 key 获取 Set
        var dep = depsMap.get(key);
        // 如果获取到的 Set 不存在, 则生成新的 Set 对象, 并把该 Set 对象赋值给对应的 value
        if (!dep) {
            depsMap.set(key, (dep = createDep()));
        }
        trackEffects(dep);
    }
    /**
     * 利用 dep 依次跟踪指定 key 的所有 effect
     */
    function trackEffects(dep) {
        /**
         * Set.add()
         * 如果 Set 中尚不存在具有相同值的元素，则在 Set 对象中插入一个新的具有指定值的元素。
         * activeEffect! '!'的作用: 非空断言, 认为 activeEffect 一定存在。
         */
        dep.add(activeEffect);
    }
    /**
     * 在触发 set 的时候进行触发依赖
     * @param target reactive 对象
     * @param key reactive 对象中的属性值
     * @param newValue 设置的新值
     */
    function trigger(target, key, newValue) {
        // 根据 target 获取存储的 map 实例
        var depsMap = targetMap.get(target);
        // 如果 map 不存在，则直接 return
        if (!depsMap)
            return;
        // 根据 key 获取存储的 dep (Set 对象)
        var dep = depsMap.get(key);
        // 如果 dep 不存在，则直接 return
        if (!dep)
            return;
        triggerEffects(dep);
    }
    function triggerEffects(dep) {
        var e_1, _a, e_2, _b;
        var effects = isArray(dep) ? dep : __spreadArray([], __read(dep), false);
        try {
            // 依次触发依赖 防止多次调用 computed 发生调用 effect.scheduler() 方法变成死循环
            // 控制先执行 computed 的 effect
            for (var effects_1 = __values(effects), effects_1_1 = effects_1.next(); !effects_1_1.done; effects_1_1 = effects_1.next()) {
                var effect_1 = effects_1_1.value;
                if (effect_1.computed) {
                    triggerEffect(effect_1);
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (effects_1_1 && !effects_1_1.done && (_a = effects_1.return)) _a.call(effects_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        try {
            for (var effects_2 = __values(effects), effects_2_1 = effects_2.next(); !effects_2_1.done; effects_2_1 = effects_2.next()) {
                var effect_2 = effects_2_1.value;
                if (!effect_2.computed) {
                    triggerEffect(effect_2);
                }
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (effects_2_1 && !effects_2_1.done && (_b = effects_2.return)) _b.call(effects_2);
            }
            finally { if (e_2) throw e_2.error; }
        }
    }
    /**
     * 触发指定依赖
     */
    function triggerEffect(effect) {
        // computed 会传入 scheduler 参数
        // 如果存在执行，不存在执行 run 函数
        if (effect.scheduler) {
            effect.scheduler();
        }
        else {
            effect.run();
        }
    }

    var get = createGetter();
    // 返回一个闭包 get 方法
    function createGetter() {
        return function get(target, key, receiver) {
            /**
             * Reflect 是一个内置的对象，它提供拦截 JavaScript 操作的方法。
             * Reflect.get(target, key[, receiver]) 获取对象身上某个属性的值，类似于 target[key]。
             *  -target: 需要取值的目标对象;
             *  -key: 需要获取的值的键值;
             *  -receiver: 如果 target 对象中指定了 getter, receiver 则为 getter 调用时的 this 值。
             */
            var res = Reflect.get(target, key, receiver);
            // 在触发 get 的时候进行依赖收集
            track(target, key);
            return res;
        };
    }
    var set = createSetter();
    // 返回一个闭包 set 方法
    function createSetter() {
        return function set(target, key, value, receiver) {
            /**
             * Reflect.set(target, key, value[, receiver]) 将值分配给属性的函数, 类似于 target[key] = value。
             *  -target: 设置属性的目标对象;
             *  -key: 设置的属性的名称;
             *  -value: 设置的值;
             *  -receiver: 如果 target 对象中指定 setter, receiver则为 setter 调用时的 this 值。
             *  -返回一个Boolean，如果更新成功，则返回true。
             */
            var result = Reflect.set(target, key, value, receiver);
            // 在触发 set 的时候进行触发依赖
            trigger(target, key);
            return result;
        };
    }
    /**
     * 响应性的 handler
     * 执行 get 或 set 方法
     */
    var mutableHandlers = {
        get: get,
        set: set
    };

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
    var reactiveMap = new WeakMap();
    /**
     * 为复杂数据类型, 创建响应性对象
     * @param target 被代理对象
     * @returns 代理对象
     */
    function reactive(target) {
        return createReactiveObject(target, mutableHandlers, reactiveMap);
    }
    /**
     * 创建响应性对象
     * @param target 被代理对象
     * @param baseHandlers handler
     * @param proxyMap WeakMap
     * @returns proxy
     */
    function createReactiveObject(target, baseHandlers, proxyMap) {
        // 如果该实例已经被代理, 则直接读取即可
        // WeakMap.get(key) 返回 WeakMap 中与 key 相关联的值, 如果 key 不存在则返回 undefined。
        // 如果存在返回 target 对象的 proxy 代理对象
        var existingProxy = proxyMap.get(target);
        if (existingProxy) {
            return existingProxy;
        }
        // 未被代理则生成 proxy 实例
        var proxy = new Proxy(target, baseHandlers);
        proxy["__v_isReactive" /* ReactiveFlags.IS_REACTIVE */] = true;
        // 缓存代理对象
        // WeakMap.set(key, value) 给 WeakMap 中的 key 设置一个 value。该方法返回一个 WeakMap 对象。
        // 给 proxyMap 中的 target 设置一个 value: proxy 的代理对象
        // 当调用多个 reactive 方法时, target 会相应添加进 proxyMap 数组中
        // eg:[{key: target, value: proxy}, {key: target, value: proxy} ...]
        proxyMap.set(target, proxy);
        return proxy;
    }
    var toReactive = function (value) {
        return isObject(value) ? reactive(value) : value;
    };
    function isReactive(value) {
        return !!(value && value["__v_isReactive" /* ReactiveFlags.IS_REACTIVE */]);
    }

    /**
     * 获取一个内部值, 并返回一个响应的 ref 对象。
     * 它只有一个属性 .value 指向内部值。
     * @param value 在 ref 中包装的对象
     * @returns ref 对象
     */
    function ref(value) {
        return createRef(value, false);
    }
    /**
     * 创建响应性 ref
     */
    function createRef(rawValue, shallow) {
        // 如果传入的 rawValue 为 ref 对象, 则直接返回 rawValue
        if (isRef(rawValue)) {
            return rawValue;
        }
        // 如果传入的 rawValue 不是 ref 对象, 返回 ref 类
        return new RefImpl(rawValue, shallow);
    }
    /**
     * 创建 ref 类, 包含get/set value 方法。
     * 当执行 ref.value 时会执行 get 方法;
     *  -当执行 ref.value.property = xxx 时,
     *    --先执行 ref.value 触发 ref 的 get value 方法;
     *    --再执行 reactive{ref.value}.property = xxx 触发 reactive 的 set 方法。
     * 当执行 ref.value = xxx 时会执行 set 方法。
     */
    var RefImpl = /** @class */ (function () {
        function RefImpl(value, __v_isShallow) {
            this.__v_isShallow = __v_isShallow;
            this.dep = undefined;
            this.__v_isRef = true;
            /**
             * 如果传入的 __v_isShallow 为 true 返回 value;
             * 如果传入的 __v_isShallow 为 false 判断 value 的类型:
             *  -当 value 为对象类型时, 执行 reactive(value) 变为 Proxy(value);
             *  -当 value 不为对象类型时, 直接返回 value。
             */
            this._rawValue = value;
            this._value = __v_isShallow ? value : toReactive(value);
        }
        Object.defineProperty(RefImpl.prototype, "value", {
            // 执行 ref.value 时调用的 get value 方法
            get: function () {
                // 收集依赖
                trackRefValue(this);
                return this._value;
            },
            // 执行 ref.value = xxx 时调用的 set value 方法
            set: function (newVal) {
                // 如果新值发生改变
                if (hasChanged(newVal, this._rawValue)) {
                    // 将原先的值赋值为 newVal
                    this._rawValue = newVal;
                    // 对当前 _value 重新赋值:
                    // -如果新值是对象类型, 返回reactive(newVal);
                    // -如果新值不是对象类型, 直接返回。
                    this._value = toReactive(newVal);
                    // 触发依赖
                    triggerRefValue(this);
                }
            },
            enumerable: false,
            configurable: true
        });
        return RefImpl;
    }());
    /**
     * 触发 get value 的时候进行依赖收集
     */
    function trackRefValue(ref) {
        if (activeEffect) {
            trackEffects(ref.dep || (ref.dep = createDep()));
        }
    }
    /**
     * 触发 set value 的时候进行触发依赖
     */
    function triggerRefValue(ref) {
        if (ref.dep) {
            // 触发所有 ref.dep 中的 effect 函数
            triggerEffects(ref.dep);
        }
    }
    /**
     * 是否为 ref
     */
    function isRef(r) {
        return !!(r && r.__v_isRef === true);
    }

    /**
     * 创建 computed 类
     */
    var ComputedRefImpl = /** @class */ (function () {
        function ComputedRefImpl(getter) {
            var _this = this;
            this.dep = undefined;
            this.__v_isRef = true;
            this._dirty = true; // 控制是否执行触发依赖, 实现 computed 当数据发生改变才会重新执行内部函数的原因。
            this.effect = new ReactiveEffect(getter, function () {
                // 传入的 scheduler 方法
                if (!_this._dirty) {
                    _this._dirty = true;
                    // 触发依赖
                    triggerRefValue(_this);
                }
            });
            this.effect.computed = this;
        }
        Object.defineProperty(ComputedRefImpl.prototype, "value", {
            get: function () {
                // 执行 ref 的依赖收集
                trackRefValue(this);
                // 执行 computed 的 getter 参数方法, 并将返回值返回
                if (this._dirty) {
                    this._dirty = false;
                    this._value = this.effect.run();
                }
                return this._value;
            },
            enumerable: false,
            configurable: true
        });
        return ComputedRefImpl;
    }());
    /**
     * 创建 computed
     * @param getterOrOptions computed 定义的内部函数或对象
     * @returns ComputedRefImpl 实例
     */
    function computed(getterOrOptions) {
        var getter;
        // 如果 getterOrOptions 是函数返沪 true
        var onlyGetter = isFunction(getterOrOptions);
        // 如果 getterOrOptions 是函数, 将 getterOrOptions 直接赋值 getter
        // 如果 getterOrOptions 不是函数, 将 getterOrOptions 的 get 属性赋值给 getter
        if (onlyGetter) {
            getter = getterOrOptions;
        }
        else {
            getter = getterOrOptions.get;
        }
        // 执行 ComputedRefImpl 实例
        var cRef = new ComputedRefImpl(getter);
        return cRef;
    }

    var isFlushPending = false;
    var resolvePromise = Promise.resolve();
    var pendingPreFlushCbs = [];
    function queuePreFlushCb(cb) {
        queueCb(cb, pendingPreFlushCbs);
    }
    function queueCb(cb, pendingQueue) {
        pendingQueue.push(cb);
        queueFlush();
    }
    function queueFlush() {
        if (!isFlushPending) {
            isFlushPending = true;
            resolvePromise.then(flushJobs);
        }
    }
    function flushJobs() {
        isFlushPending = false;
        flushPreFlushCbs();
    }
    function flushPreFlushCbs() {
        if (pendingPreFlushCbs.length) {
            var activePreFlushCbs = __spreadArray([], __read(new Set(pendingPreFlushCbs)), false);
            pendingPreFlushCbs.length = 0;
            for (var i = 0; i < activePreFlushCbs.length; i++) {
                activePreFlushCbs[i]();
            }
        }
    }

    /**
     * 创建 watch 方法
     * @param source 监听对象
     * @param cb 监听对象修改后执行的函数
     * @param options 立即执行/深度监听选项
     */
    function watch(source, cb, options) {
        return doWatch(source, cb, options);
    }
    function doWatch(source, cb, _a) {
        var _b = _a === void 0 ? EMPTY_OBJ : _a, immediate = _b.immediate, deep = _b.deep;
        var getter;
        if (isReactive(source)) {
            getter = function () { return source; };
            deep = true;
        }
        else {
            getter = function () { };
        }
        if (cb && deep) {
            var baseGetter_1 = getter;
            // traverse() 将对象进行依次调用 执行 reactive 的 getter 方法收集依赖
            getter = function () { return traverse(baseGetter_1()); };
        }
        var oldValue = {};
        // 获取新值 如果数据发生改变 执行 cb 函数
        var job = function () {
            if (cb) {
                var newValue = effect.run();
                if (deep || hasChanged(newValue, oldValue)) {
                    cb(newValue, oldValue);
                    oldValue = newValue;
                }
            }
        };
        var scheduler = function () { return queuePreFlushCb(job); };
        var effect = new ReactiveEffect(getter, scheduler);
        if (cb) {
            if (immediate) {
                job();
            }
            else {
                oldValue = effect.run();
            }
        }
        else {
            effect.run();
        }
        return function () {
            effect.stop();
        };
    }
    // 递归调用执行对象的每一个 getter 方法
    function traverse(value) {
        if (!isObject(value)) {
            return value;
        }
        for (var key in value) {
            traverse(value[key]);
        }
        return value;
    }

    // 处理 class 的增强写法
    function normalizeClass(value) {
        var res = '';
        if (isString(value)) {
            res = value;
        }
        else if (isArray(value)) {
            for (var i = 0; i < value.length; i++) {
                var normalized = normalizeClass(value[i]);
                if (normalized) {
                    res += normalized + ' ';
                }
            }
        }
        else if (isObject(value)) {
            for (var name_1 in value) {
                if (value[name_1]) {
                    res += name_1 + ' ';
                }
            }
        }
        return res.trim();
    }

    var Fragment = Symbol('Fragement');
    var Text = Symbol('Text');
    var Comment = Symbol('Comment');
    // 判断是否为 vnode
    function isVNode(value) {
        return value ? value.__v_isVNode === true : false;
    }
    // 创建 vnode 函数
    function createVNode(type, props, children) {
        // class 和 style 的增强写法
        if (props) {
            var klass = props.class; props.style;
            if (klass && !isString(klass)) {
                props.class = normalizeClass(klass);
            }
        }
        var shapeFlag = isString(type)
            ? 1 /* ShapeFlags.ELEMENT */
            : isObject(type)
                ? 4 /* ShapeFlags.STATEFUL_COMPONENT */
                : 0;
        return createBaseVNode(type, props, children, shapeFlag);
    }
    function createBaseVNode(type, props, children, shapeFlag) {
        var vnode = {
            __v_isVNode: true,
            type: type,
            props: props,
            shapeFlag: shapeFlag
        };
        normalizeChildren(vnode, children);
        return vnode;
    }
    function normalizeChildren(vnode, children) {
        var type = 0;
        if (children == null) {
            children = null;
        }
        else if (isArray(children)) {
            type = 16 /* ShapeFlags.ARRAY_CHILDREN */;
        }
        else if (isObject(children)) ;
        else if (isFunction(children)) ;
        else {
            children = String(children);
            type = 8 /* ShapeFlags.TEXT_CHILDREN */;
        }
        vnode.children = children;
        // |= 位运算 OR
        vnode.shapeFlag |= type;
    }

    /**
     * 创建 h 函数
     * 通过判断参数的长度, 对 createVNode 函数传入不同的参数
     */
    function h(type, propsOrChildren, children) {
        var l = arguments.length;
        if (l === 2) {
            if (isObject(propsOrChildren) && !isArray(propsOrChildren)) {
                if (isVNode(propsOrChildren)) {
                    return createVNode(type, null, [propsOrChildren]);
                }
                return createVNode(type, propsOrChildren);
            }
            else {
                return createVNode(type, null, propsOrChildren);
            }
        }
        else {
            if (l > 3) {
                children = Array.prototype.slice.call(arguments, 2);
            }
            else if (l === 3 && isVNode(children)) {
                children = [children];
            }
            return createVNode(type, propsOrChildren, children);
        }
    }

    exports.Comment = Comment;
    exports.Fragment = Fragment;
    exports.Text = Text;
    exports.computed = computed;
    exports.effect = effect;
    exports.h = h;
    exports.queuePreFlushCb = queuePreFlushCb;
    exports.reactive = reactive;
    exports.ref = ref;
    exports.watch = watch;

    Object.defineProperty(exports, '__esModule', { value: true });

    return exports;

})({});
//# sourceMappingURL=vue.js.map
