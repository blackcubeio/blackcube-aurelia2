import { DI, resolve, ILogger, IPlatform, IEventAggregator, customAttribute, bindable, INode } from 'aurelia';

const ITransitionConfiguration = DI.createInterface('ITransitionConfiguration', x => x.singleton(TransitionConfigure));
class TransitionConfigure {
    constructor() {
        this._config = {};
    }
    configure(incoming = null) {
        if (incoming) {
            Object.assign(this._config, incoming);
        }
        return this;
    }
    getOptions() {
        return this._config;
    }
    options(obj) {
        Object.assign(this._config, obj);
    }
    get(key) {
        return this._config[key];
    }
    set(key, val) {
        this._config[key] = val;
        return this._config[key];
    }
}

var TransitionChannels;
(function (TransitionChannels) {
    TransitionChannels["main"] = "transition:main";
    TransitionChannels["ended"] = "transition:ended";
    TransitionChannels["progress"] = "transition:progress";
})(TransitionChannels || (TransitionChannels = {}));
var TransitionModes;
(function (TransitionModes) {
    TransitionModes["enter"] = "enter";
    TransitionModes["leave"] = "leave";
})(TransitionModes || (TransitionModes = {}));
var TransitionStatus;
(function (TransitionStatus) {
    TransitionStatus[TransitionStatus["ENTERING"] = 0] = "ENTERING";
    TransitionStatus[TransitionStatus["ENTERED"] = 1] = "ENTERED";
    TransitionStatus[TransitionStatus["LEAVING"] = 2] = "LEAVING";
    TransitionStatus[TransitionStatus["LEFT"] = 3] = "LEFT";
})(TransitionStatus || (TransitionStatus = {}));

const ITransitionService = DI.createInterface('ITransitionService', (x) => x.singleton(TransitionService));
/**
 * TransitionService use dataset attributes to handle transitions on an element
 *      * data-transition-from : initial state of the element when entering / final state when leaving
 *      * data-transition-to : final state of the element when entering / initial state when leaving
 *      * data-transition-transition : transition to apply when entering / leaving (if data-transition-transition-leaving is not set)
 *      * data-transition-transition-leaving : transition to apply when leaving
 *      * data-transition-show : `display` value to apply before entering
 *      * data-transition-hide : `display` value to apply after leaving
 * example:
 * <div bc-transition="myTransition"
 *      data-transition-from="transform opacity-0 scale-95"
 *      data-transition-to="transform opacity-100 scale-100"
 *      data-transition-transition="transition ease-out duration-100"
 *      data-transition-transition-leaving="transition ease-in duration-75"
 *      data-transition-show="inherit"
 *      data-transition-hide="none"
 * >
 * </div>
 */
class TransitionService {
    constructor(logger = resolve(ILogger).scopeTo('TransitionService'), platform = resolve(IPlatform), ea = resolve(IEventAggregator)) {
        this.logger = logger;
        this.platform = platform;
        this.ea = ea;
        this.logger.trace('Constructing');
    }
    enter(element, transition, eventName = undefined, noTransition = false, timeout = 500) {
        if (!element) {
            return Promise.reject('Element/Event not defined');
        }
        transition = this.rebuildTransition(element, transition);
        if (noTransition) {
            return this.enterWithoutTransition(element, transition, eventName);
        }
        else {
            return this.enterWithTransition(element, transition, eventName, timeout);
        }
    }
    leave(element, transition, eventName = undefined, noTransition = false, timeout = 500) {
        if (!element) {
            return Promise.reject('Element/Event not defined');
        }
        transition = this.rebuildTransition(element, transition);
        if (noTransition) {
            return this.leaveWithoutTransition(element, transition, eventName);
        }
        else {
            return this.leaveWithTransition(element, transition, eventName, timeout);
        }
    }
    enterWithTransition(element, transition, eventName = undefined, timeout = 500) {
        if (eventName) {
            this.ea.publish(TransitionChannels.progress, {
                name: eventName,
                status: TransitionStatus.ENTERING
            });
        }
        let transitionRunningTimeout;
        let transitionFinished = false;
        const onTransitionEnterRun = (evt) => {
            if (evt.target === element) {
                evt.stopPropagation();
                element.removeEventListener('transitionrun', onTransitionEnterRun);
                if (transitionRunningTimeout) {
                    this.platform.clearTimeout(transitionRunningTimeout);
                    transitionRunningTimeout = undefined;
                }
                return Promise.resolve();
            }
        };
        const onTransitionEnterEnd = (evt) => {
            if (evt.target === element) {
                evt.stopPropagation();
                element.removeEventListener('transitionend', onTransitionEnterEnd);
                element.removeEventListener('transitioncancel', onTransitionEnterEnd);
                transition.transition.split(/\s+/)
                    .filter((className) => className.length > 0)
                    .forEach((className) => element.classList.remove(className));
                transitionFinished = true;
                return Promise.resolve();
            }
        };
        element.addEventListener('transitionend', onTransitionEnterEnd);
        element.addEventListener('transitioncancel', onTransitionEnterEnd);
        element.addEventListener('transitionrun', onTransitionEnterRun);
        return this.cleanupTransition(element, transition)
            .then(() => {
            if (transition.show) {
                element.style.display = transition.show;
                return this.waitAnimationFrame();
            }
            else {
                return Promise.resolve();
            }
        })
            .then(() => {
            transition.transition.split(/\s+/)
                .filter((className) => className.length > 0)
                .forEach((className) => element.classList.add(className));
            return Promise.resolve();
        })
            .then(() => {
            return this.waitAnimationFrame();
        })
            .then(() => {
            transitionRunningTimeout = this.platform.setTimeout(() => {
                this.logger.warn('Transition timeout - Detach events handler and cleanup');
                element.removeEventListener('transitionend', onTransitionEnterEnd);
                element.removeEventListener('transitioncancel', onTransitionEnterEnd);
                element.removeEventListener('transitionrun', onTransitionEnterRun);
                this.cleanupTransition(element, transition);
            }, timeout);
            transition.from.split(/\s+/)
                .filter((className) => className.length > 0)
                .forEach((className) => element.classList.remove(className));
            transition.to.split(/\s+/)
                .filter((className) => className.length > 0)
                .forEach((className) => element.classList.add(className));
            return Promise.resolve();
        })
            .then(() => {
            return new Promise((resolve, reject) => {
                let t = this.platform.setInterval(() => {
                    if (transitionFinished) {
                        this.platform.clearInterval(t);
                        if (eventName) {
                            this.ea.publish(TransitionChannels.progress, {
                                name: eventName,
                                status: TransitionStatus.ENTERED
                            });
                            this.ea.publish(TransitionChannels.ended, {
                                name: eventName,
                                status: TransitionStatus.ENTERED
                            });
                        }
                        resolve(void 0);
                    }
                }, 100);
            });
        });
    }
    enterWithoutTransition(element, transition, eventName = undefined) {
        if (eventName) {
            this.ea.publish(TransitionChannels.progress, {
                name: eventName,
                status: TransitionStatus.ENTERING
            });
        }
        return this.cleanupTransition(element, transition)
            .then(() => {
            transition.from.split(/\s+/)
                .filter((className) => className.length > 0)
                .forEach((className) => element.classList.remove(className));
            transition.to.split(/\s+/)
                .filter((className) => className.length > 0)
                .forEach((className) => element.classList.add(className));
            if (transition.show) {
                element.style.display = transition.show;
            }
            if (eventName) {
                this.ea.publish(TransitionChannels.progress, {
                    name: eventName,
                    status: TransitionStatus.ENTERED
                });
                this.ea.publish(TransitionChannels.ended, {
                    name: eventName,
                    status: TransitionStatus.ENTERED
                });
            }
            return this.waitAnimationFrame();
        });
    }
    leaveWithTransition(element, transition, eventName = undefined, timeout = 500) {
        if (eventName) {
            this.ea.publish(TransitionChannels.progress, {
                name: eventName,
                status: TransitionStatus.LEAVING
            });
        }
        let transitionRunningTimeout;
        let transitionFinished = false;
        const onTransitionLeaveRun = (evt) => {
            if (evt.target === element) {
                evt.stopPropagation();
                element.removeEventListener('transitionrun', onTransitionLeaveRun);
                if (transitionRunningTimeout) {
                    this.platform.clearTimeout(transitionRunningTimeout);
                    transitionRunningTimeout = undefined;
                }
                return Promise.resolve();
            }
        };
        const onTransitionLeaveEnd = (evt) => {
            if (evt.target === element) {
                evt.stopPropagation();
                element.removeEventListener('transitionend', onTransitionLeaveEnd);
                element.removeEventListener('transitioncancel', onTransitionLeaveEnd);
                this.cleanupTransition(element, transition);
                if (transition.hide) {
                    element.style.display = transition.hide;
                    // wait next frame
                    transitionFinished = true;
                    return this.waitAnimationFrame();
                }
                else {
                    transitionFinished = true;
                    return Promise.resolve();
                }
            }
        };
        element.addEventListener('transitionend', onTransitionLeaveEnd);
        element.addEventListener('transitioncancel', onTransitionLeaveEnd);
        element.addEventListener('transitionrun', onTransitionLeaveRun);
        return this.cleanupTransition(element, transition)
            .then(() => {
            const t = transition.transitionLeaving || transition.transition;
            t.split(/\s+/)
                .filter((className) => className.length > 0)
                .forEach((className) => element.classList.add(className));
            return Promise.resolve();
        })
            .then(() => {
            return this.waitAnimationFrame();
        })
            .then(() => {
            transitionRunningTimeout = this.platform.setTimeout(() => {
                this.logger.warn('Transition timeout - Detach events handler and cleanup');
                element.removeEventListener('transitionend', onTransitionLeaveEnd);
                element.removeEventListener('transitioncancel', onTransitionLeaveEnd);
                element.removeEventListener('transitionrun', onTransitionLeaveRun);
                this.cleanupTransition(element, transition);
            }, timeout);
            transition.to.split(/\s+/)
                .filter((className) => className.length > 0)
                .forEach((className) => element.classList.remove(className));
            transition.from.split(/\s+/)
                .filter((className) => className.length > 0)
                .forEach((className) => element.classList.add(className));
            return Promise.resolve();
        })
            .then(() => {
            return new Promise((resolve, reject) => {
                let t = this.platform.setInterval(() => {
                    if (transitionFinished) {
                        this.platform.clearInterval(t);
                        if (eventName) {
                            this.ea.publish(TransitionChannels.progress, {
                                name: eventName,
                                status: TransitionStatus.LEFT
                            });
                            this.ea.publish(TransitionChannels.ended, {
                                name: eventName,
                                status: TransitionStatus.LEFT
                            });
                        }
                        resolve(void 0);
                    }
                }, 100);
            });
        });
    }
    leaveWithoutTransition(element, transition, eventName = undefined) {
        if (eventName) {
            this.ea.publish(TransitionChannels.progress, {
                name: eventName,
                status: TransitionStatus.LEAVING
            });
        }
        return this.cleanupTransition(element, transition)
            .then(() => {
            transition.to.split(/\s+/)
                .filter((className) => className.length > 0)
                .forEach((className) => element.classList.remove(className));
            transition.from.split(/\s+/)
                .filter((className) => className.length > 0)
                .forEach((className) => element.classList.add(className));
            if (transition.hide) {
                element.style.display = transition.hide;
            }
            if (eventName) {
                this.ea.publish(TransitionChannels.progress, {
                    name: eventName,
                    status: TransitionStatus.LEFT
                });
                this.ea.publish(TransitionChannels.ended, {
                    name: eventName,
                    status: TransitionStatus.LEFT
                });
            }
            return this.waitAnimationFrame();
        });
    }
    cleanupTransition(element, transition) {
        transition.transition.split(/\s+/)
            .filter((className) => className.length > 0)
            .forEach((className) => {
            element.classList.remove(className);
        });
        if (transition.transitionLeaving) {
            transition.transitionLeaving.split(/\s+/)
                .filter((className) => className.length > 0)
                .forEach((className) => {
                element.classList.remove(className);
            });
        }
        return Promise.resolve();
    }
    waitAnimationFrame() {
        return new Promise((resolve) => {
            this.platform.requestAnimationFrame(() => {
                resolve(void 0);
            });
        });
    }
    rebuildTransition(element, transition = undefined) {
        let inlineTransition = undefined;
        if (element.dataset.transitionFrom && element.dataset.transitionTo && element.dataset.transitionTransition) {
            inlineTransition = {
                from: element.dataset.transitionFrom || '',
                to: element.dataset.transitionTo || '',
                transition: element.dataset.transitionTransition || ''
            };
            if (element.dataset.transitionTransitionLeaving) {
                inlineTransition.transitionLeaving = element.dataset.transitionTransitionLeaving;
            }
            if (element.dataset.transitionShow) {
                inlineTransition.show = element.dataset.transitionShow;
            }
            if (element.dataset.transitionHide) {
                inlineTransition.hide = element.dataset.transitionHide;
            }
        }
        if (inlineTransition) {
            return inlineTransition;
        }
        else if (transition) {
            return transition;
        }
        else {
            throw new Error('No transition defined');
        }
    }
}

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
/* global Reflect, Promise, SuppressedError, Symbol, Iterator */


function __esDecorate(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
}
function __runInitializers(thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
}
function __setFunctionName(f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
}
typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

let Transition = (() => {
    let _classDecorators = [customAttribute('bc-transition')];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _name_decorators;
    let _name_initializers = [];
    let _name_extraInitializers = [];
    _classThis = class {
        /**
         * Attribute used to handle transitions on an element runned when a message is received on the TransitionChannels.main channel
         * example:
         * <div bc-transition="myTransition"
         *      data-transition-from="transform opacity-0 scale-95"
         *      data-transition-to="transform opacity-100 scale-100"
         *      data-transition-transition="transition ease-out duration-100"
         *      data-transition-transition-leaving="transition ease-in duration-75"
         *      data-transition-show="inherit"
         *      data-transition-hide="none"
         * >
         * </div>
         */
        constructor(logger = resolve(ILogger).scopeTo('Transition'), ea = resolve(IEventAggregator), platform = resolve(IPlatform), transitionService = resolve(ITransitionService), element = resolve(INode)) {
            this.logger = logger;
            this.ea = ea;
            this.platform = platform;
            this.transitionService = transitionService;
            this.element = element;
            this.name = __runInitializers(this, _name_initializers, void 0);
            this.disposable = __runInitializers(this, _name_extraInitializers);
            this.onTransition = (data) => {
                if (data.name == this.name) {
                    this.logger.trace('onTransition');
                    if (data.mode === TransitionModes.enter) {
                        this.transitionService.enter(this.element, undefined, this.name);
                    }
                    else if (data.mode === TransitionModes.leave) {
                        this.transitionService.leave(this.element, undefined, this.name);
                    }
                }
            };
            this.logger = logger.scopeTo('Transition');
            this.logger.trace('constructor');
        }
        attaching() {
            this.logger.trace('attaching');
        }
        attached() {
            this.logger.trace('attached');
            this.disposable = this.ea.subscribe(TransitionChannels.main, this.onTransition);
        }
        dispose() {
            var _a;
            this.logger.trace('dispose');
            (_a = this.disposable) === null || _a === void 0 ? void 0 : _a.dispose();
        }
    };
    __setFunctionName(_classThis, "Transition");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _name_decorators = [bindable({ primary: true })];
        __esDecorate(null, null, _name_decorators, { kind: "field", name: "name", static: false, private: false, access: { has: obj => "name" in obj, get: obj => obj.name, set: (obj, value) => { obj.name = value; } }, metadata: _metadata }, _name_initializers, _name_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return _classThis;
})();

const DefaultComponents = [
    Transition,
];
function createTransitionConfiguration(options) {
    return {
        register(container) {
            const configClass = container.get(ITransitionConfiguration);
            // @ts-ignore
            configClass.options(options);
            return container.register(...DefaultComponents);
        },
        configure(options) {
            return createTransitionConfiguration(options);
        }
    };
}
const TransitionConfiguration = createTransitionConfiguration({});

export { ITransitionConfiguration, ITransitionService, TransitionChannels, TransitionConfiguration, TransitionModes, TransitionService, TransitionStatus };
//# sourceMappingURL=index.es.js.map
