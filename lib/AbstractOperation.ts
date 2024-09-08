import AbstractHandler from 'event-handler-ts/Handler/AbstractHandler';
import Listener from 'event-handler-ts/Listener/Listener';
import AutoDisposeListener from 'event-handler-ts/Listener/AutoDisposeListener';
import { Event } from 'event-handler-ts/Handler/types';
import { isCallback } from 'event-handler-ts/Listener/guards';
import { Target, Callback, AutoDisposeCallback, ListenerInterface } from 'event-handler-ts/Listener/types';
import { ManagerInterface, OperationInterface } from './types';

const EVENT: Readonly<Record<string, Event>> = {
    /* The operation has been accepted and is about to be launched.
     The operation has also been added to the operations set. */
    ACCEPT: Symbol('ACCEPT'),
    /* The operation has been refused. */
    REFUSE: Symbol('REFUSE'),
    /* The operation has been started.
     It's fired when an accepted operation triggers RUN event. */
    RUN: Symbol('RUN'),
    /* The operation is done.
     It's fired when an accepted operation triggers DONE event. */
    DONE: Symbol('DONE'),
    /* The operation has been removed from the operation set. */
    RELEASE: Symbol('RELEASE')
};

const STATUS: Readonly<Record<string, symbol>> = {
    IDLE: Symbol('IDLE'),
    RUNNING: Symbol('RUNNING'),
    DONE: Symbol('DONE')
};


abstract class AbstractOperation<T extends Event> extends AbstractHandler<Event> implements OperationInterface<Event>
{
    readonly manager: ManagerInterface;
    readonly result?: any = undefined;
    protected _status: symbol = STATUS.IDLE;

    get status(): string
    {
        switch (this._status) {
            case STATUS.RUNNING:
                return 'running';
            case STATUS.DONE:
                return 'done';
        }
        return 'idle';
    }

    get isIdle(): boolean
    {
        return this._status === STATUS.IDLE;
    }

    get isRunning(): boolean
    {
        return this._status === STATUS.RUNNING;
    }

    get isDone(): boolean
    {
        return this._status === STATUS.DONE;
    }

    constructor(manager: ManagerInterface, events?: T[])
    {
        super([ ...Object.values(EVENT), ...(events ?? []) ]);

        const listeners: ListenerInterface<Event>[] = [
            manager.onAccept(this, (operation: OperationInterface<T>) => {
                if (operation !== this) {
                    return;
                }
                listeners.forEach((listener: ListenerInterface<Event>) => listener.dispose());
                manager.onRelease(this, (operation: OperationInterface<T>): void => {
                    if (operation !== this) {
                        return;
                    }
                    manager.off(this);
                    this._trigger(EVENT.RELEASE);
                });
                this._trigger(EVENT.ACCEPT);
                this._run();
            }),
            manager.onRefuse(this, (operation: OperationInterface<T>, reason: any) => {
                if (operation !== this) {
                    return;
                }
                listeners.forEach((listener: ListenerInterface<Event>) => listener.dispose());
                this._trigger(EVENT.REFUSE, reason);
            })
        ];

        this.manager = manager;
        Object.defineProperty(this, 'manager', { configurable: false, writable: false });

        Object.defineProperty(this, 'result', { writable: false });
    }

    _run()
    {
        if (this._status !== STATUS.IDLE) {
            throw new Error('The operation has already begun.');
        }
        this._status = STATUS.RUNNING;
        this._trigger(EVENT.RUN);
        const onDone = (...result: any[]) => {
            if (!this.isRunning) {
                throw new Error('The operation is not in a running state.');
            }
            Object.defineProperty(this, 'result', { configurable: false, value: result });
            this._status = STATUS.DONE;
            this._trigger(EVENT.DONE, ...result);
        };
        try {
            this._process(onDone);
        } catch (error) {
            console.error('The operation failed unexpectedly with an error:', error);
            onDone(error);
        }
    }

    abstract _process(onDone: (...result: any[]) => void): void;

    request()
    {
        this.manager.request(this);
    }

    onAccept(callback: Callback, once?: boolean): Listener<T>;
    onAccept(target: Target, callback: AutoDisposeCallback, once?: boolean): AutoDisposeListener<T>;
    onAccept(arg1: Callback | Target, arg2?: boolean | AutoDisposeCallback, arg3?: boolean): Listener<T> | AutoDisposeListener<T>
    {
        const event: Event = EVENT.ACCEPT;
        if (isCallback(arg1)) {
            return this.on(event, arg1, arg2 as (boolean | undefined));
        }
        return this.on(event, arg1, arg2 as AutoDisposeCallback, arg3);
    }

    onRefuse(callback: Callback, once?: boolean): Listener<T>;
    onRefuse(target: Target, callback: AutoDisposeCallback, once?: boolean): AutoDisposeListener<T>;
    onRefuse(arg1: Callback | Target, arg2?: boolean | AutoDisposeCallback, arg3?: boolean): Listener<T> | AutoDisposeListener<T>
    {
        const event: Event = EVENT.REFUSE;
        if (isCallback(arg1)) {
            return this.on(event, arg1, arg2 as (boolean | undefined));
        }
        return this.on(event, arg1, arg2 as AutoDisposeCallback, arg3);
    }

    onRun(callback: Callback, once?: boolean): Listener<T>;
    onRun(target: Target, callback: AutoDisposeCallback, once?: boolean): AutoDisposeListener<T>;
    onRun(arg1: Callback | Target, arg2?: boolean | AutoDisposeCallback, arg3?: boolean): Listener<T> | AutoDisposeListener<T>
    {
        const event: Event = EVENT.RUN;
        if (isCallback(arg1)) {
            return this.on(event, arg1, arg2 as (boolean | undefined));
        }
        return this.on(event, arg1, arg2 as AutoDisposeCallback, arg3);
    }

    onDone(callback: Callback, once?: boolean): Listener<T>;
    onDone(target: Target, callback: AutoDisposeCallback, once?: boolean): AutoDisposeListener<T>;
    onDone(arg1: Callback | Target, arg2?: boolean | AutoDisposeCallback, arg3?: boolean): Listener<T> | AutoDisposeListener<T>
    {
        const event: Event = EVENT.DONE;
        if (isCallback(arg1)) {
            return this.on(event, arg1, arg2 as (boolean | undefined));
        }
        return this.on(event, arg1, arg2 as AutoDisposeCallback, arg3);
    }

    onRelease(callback: Callback, once?: boolean): Listener<T>;
    onRelease(target: Target, callback: AutoDisposeCallback, once?: boolean): AutoDisposeListener<T>;
    onRelease(arg1: Callback | Target, arg2?: boolean | AutoDisposeCallback, arg3?: boolean): Listener<T> | AutoDisposeListener<T>
    {
        const event: Event = EVENT.RELEASE;
        if (isCallback(arg1)) {
            return this.on(event, arg1, arg2 as (boolean | undefined));
        }
        return this.on(event, arg1, arg2 as AutoDisposeCallback, arg3);
    }
}

export default AbstractOperation;
