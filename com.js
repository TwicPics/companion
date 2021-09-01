"use strict";

const DEFER = Symbol(`defer`);
const FLUSH = Symbol(`flush`);

const com = ({ expose, port }) => {
    const actualExpose = expose || {};
    const callable = new Map();
    const doExpose = (name, value) => {
        if (name === `then`) {
            throw new Error(`cannot expose a method called 'then'`);
        }
        const existing = callable.get(name);
        let flush = existing && existing[FLUSH];
        if (value === DEFER) {
            if (!flush) {
                const promise = new Promise(resolve => (flush = resolve));
                const delay = (...args) => promise.then(action => action(...args));
                delay[FLUSH] = flush;
                callable.set(name, delay);
            }
        } else {
            const actualValue = typeof value === `function` ? value : () => value;
            callable.set(name, actualValue);
            if (flush) {
                flush(actualValue);
            }
        }
    };
    Object.entries(actualExpose).forEach(([name, value]) => doExpose(name, value));
    const pending = new Map();
    port.onMessage.addListener(async message => {
        const { args, data, error, id, type } = message;
        if (args) {
            const response = {
                id,
            };
            const handler = callable.get(type);
            if (handler) {
                try {
                    response.data = await handler(...args);
                } catch (e) {
                    response.error = e.message;
                }
            } else {
                response.error = `unknown method '${type}'`;
            }
            port.postMessage(response);
        } else {
            const promise = pending.get(id);
            if (promise) {
                pending.delete(id);
                if (error === undefined) {
                    promise.resolve(data);
                } else {
                    promise.reject(error);
                }
            }
        }
    });
    let lastCall = 0;
    const callFactory = type => (...args) => new Promise((resolve, reject) => {
        const id = lastCall++;
        pending.set(id, {
            resolve,
            reject,
        });
        port.postMessage({
            args,
            id,
            "type": type === undefined ? null : type,
        });
    });
    return {
        "access": new Proxy({}, {
            "get": (target, name) => {
                // protect against promise unwraping
                if (name === `then`) {
                    return undefined;
                }
                if (!target.hasOwnProperty(name)) {
                    // eslint-disable-next-line no-param-reassign
                    target[name] = callFactory(name);
                }
                return target[name];
            },
        }),
        "expose": doExpose,
    };
};

com.DELAY = DEFER;

module.exports = com;