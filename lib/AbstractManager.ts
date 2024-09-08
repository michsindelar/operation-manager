import AbstractHandler from 'event-handler-ts/Handler/AbstractHandler';
import Listener from 'event-handler-ts/Listener/Listener';
import AutoDisposeListener from 'event-handler-ts/Listener/AutoDisposeListener';
import { Event } from 'event-handler-ts/Handler/types';
import { Target, Callback, AutoDisposeCallback } from 'event-handler-ts/Listener/types';
import { isCallback } from 'event-handler-ts/Listener/guards';
import { ManagerInterface, OperationInterface } from './types';

const EVENT: Readonly<Record<string, symbol>> = {
    /* An operation has been accepted and is about to be launched.
      The operation has also been added to the operations set. */
    ACCEPT: Symbol('ACCEPT'),
    /* An operation has been refused. */
    REFUSE: Symbol('REFUSE'),
    /* An operation has been started.
     It's fired when an accepted operation triggers RUN event. */
    RUN: Symbol('RUN'),
    /* An operation is done.
     It's fired when an accepted operation triggers DONE event. */
    DONE: Symbol('DONE'),
    /* An operation has been removed from the operation set. */
    RELEASE: Symbol('RELEASE')
};


abstract class AbstractManager extends AbstractHandler<symbol> implements ManagerInterface
{
    protected readonly _operations: Set<OperationInterface<Event>> = new Set<OperationInterface<Event>>();
    protected readonly _allowed: Set<new (...args: any[]) => OperationInterface<Event>> = new Set<new (...args: any[]) => OperationInterface<Event>>();

    get allowed(): (new (...args: any[]) => OperationInterface<Event>)[]
    {
        return [ ...this._allowed ];
    }

    get operations(): OperationInterface<Event>[]
    {
        return [ ...this._operations ];
    }

    constructor(allowed: (new (...args: any[]) => OperationInterface<Event>)[])
    {
        super(Object.values(EVENT));

        if (!Array.isArray(allowed) || allowed.length < 1) {
            throw new Error('The list of allowed operations must not be empty.');
        }
        for (const constructor of allowed) {
            if (this._allowed.has(constructor)) {
                continue;
            }
            this._allowed.add(constructor);
        }
    }

    protected _removeOperation(operation: OperationInterface<Event>)
    {
        if (!this._operations.has(operation)) {
            throw new Error('The operation is not managed.');
        }
        this._operations.delete(operation);
        this._trigger(EVENT.RELEASE, operation);
    }

    protected _addOperation(operation: OperationInterface<Event>)
    {
        if (!operation.isIdle) {
            throw new Error('The operation has already started.');
        }
        if (this._operations.has(operation)) {
            throw new Error('The operation has already been accepted.');
        }
        this._operations.add(operation);
    }

    /* Sets the given operation (eg. listeners). */
    protected _setup(operation: OperationInterface<Event>)
    {
        operation.onDone(
            this,
            (): void => {
                this._trigger(EVENT.DONE, operation);
                this._removeOperation(operation);
            },
            true
        );
        operation.onRun(this, this._trigger.bind(this, EVENT.RUN, operation), true);
    }

    /* Prepares other operations for new operation. */
    protected _prepare(operation: OperationInterface<Event>)
    {
    }

    abstract isProcessable(operation: OperationInterface<Event>): boolean;

    request(operation: OperationInterface<Event>) {
        try {
            if (!this.isAllowed(operation)) {
                throw new Error('The operation is not allowed.');
            }
            if (!this.isProcessable(operation)) {
                throw new Error('The operation is not processable.');
            }
            this._setup(operation);
            this._prepare(operation);
            this._addOperation(operation);
            this._trigger(EVENT.ACCEPT, operation);
        } catch (error) {
            let message = 'The request has been refused.';
            if (typeof error === 'string') {
                message = error;
            } else if (error instanceof Error) {
                message = error.message;
            }
            this._trigger(EVENT.REFUSE, operation, message);
        }
    }

    isAllowed(operation: OperationInterface<Event>)
    {
        if (operation.manager !== this) {
            return false;
        }
        return this._allowed.has(operation.constructor as (new (...args: any[]) => OperationInterface<Event>));
    }

    clean(target: Target)
    {
        this.off(target);
        this._operations.forEach((operation) => operation.off(target));
    }

    onAccept(callback: Callback, once?: boolean): Listener<symbol>;
    onAccept(target: Target, callback: AutoDisposeCallback, once?: boolean): AutoDisposeListener<symbol>;
    onAccept(arg1: Callback | Target, arg2?: boolean | AutoDisposeCallback, arg3?: boolean): Listener<symbol> | AutoDisposeListener<symbol>
    {
        const event: Event = EVENT.ACCEPT;
        if (isCallback(arg1)) {
            return this.on(event, arg1, arg2 as (boolean | undefined));
        }
        return this.on(event, arg1, arg2 as AutoDisposeCallback, arg3);
    }

    onRefuse(callback: Callback, once?: boolean): Listener<symbol>;
    onRefuse(target: Target, callback: AutoDisposeCallback, once?: boolean): AutoDisposeListener<symbol>;
    onRefuse(arg1: Callback | Target, arg2?: boolean | AutoDisposeCallback, arg3?: boolean): Listener<symbol> | AutoDisposeListener<symbol>
    {
        const event: Event = EVENT.REFUSE;
        if (isCallback(arg1)) {
            return this.on(event, arg1, arg2 as (boolean | undefined));
        }
        return this.on(event, arg1, arg2 as AutoDisposeCallback, arg3);
    }

    onRun(callback: Callback, once?: boolean): Listener<symbol>;
    onRun(target: Target, callback: AutoDisposeCallback, once?: boolean): AutoDisposeListener<symbol>;
    onRun(arg1: Callback | Target, arg2?: boolean | AutoDisposeCallback, arg3?: boolean): Listener<symbol> | AutoDisposeListener<symbol>
    {
        const event: Event = EVENT.RUN;
        if (isCallback(arg1)) {
            return this.on(event, arg1, arg2 as (boolean | undefined));
        }
        return this.on(event, arg1, arg2 as AutoDisposeCallback, arg3);
    }

    onDone(callback: Callback, once?: boolean): Listener<symbol>;
    onDone(target: Target, callback: AutoDisposeCallback, once?: boolean): AutoDisposeListener<symbol>;
    onDone(arg1: Callback | Target, arg2?: boolean | AutoDisposeCallback, arg3?: boolean): Listener<symbol> | AutoDisposeListener<symbol>
    {
        const event: Event = EVENT.DONE;
        if (isCallback(arg1)) {
            return this.on(event, arg1, arg2 as (boolean | undefined));
        }
        return this.on(event, arg1, arg2 as AutoDisposeCallback, arg3);
    }

    onRelease(callback: Callback, once?: boolean): Listener<symbol>;
    onRelease(target: Target, callback: AutoDisposeCallback, once?: boolean): AutoDisposeListener<symbol>;
    onRelease(arg1: Callback | Target, arg2?: boolean | AutoDisposeCallback, arg3?: boolean): Listener<symbol> | AutoDisposeListener<symbol>
    {
        const event: symbol = EVENT.RELEASE;
        if (isCallback(arg1)) {
            return this.on(event, arg1, arg2 as (boolean | undefined));
        }
        return this.on(event, arg1, arg2 as AutoDisposeCallback, arg3);
    }
}

export default AbstractManager;
