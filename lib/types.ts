import Listener from 'event-handler-ts/Listener/Listener';
import AutoDisposeListener from 'event-handler-ts/Listener/AutoDisposeListener';
import { NonTriggerHandler, Event } from 'event-handler-ts/Handler/types';
import { Target, Callback, AutoDisposeCallback } from 'event-handler-ts/Listener/types';


interface ListenableInterface<T extends Event>
{
    onAccept(callback: Callback, once?: boolean): Listener<T>;
    onAccept(target: Target, callback: AutoDisposeCallback, once?: boolean): AutoDisposeListener<T>;

    onRefuse(callback: Callback, once?: boolean): Listener<T>;
    onRefuse(target: Target, callback: AutoDisposeCallback, once?: boolean): AutoDisposeListener<T>;

    onRun(callback: Callback, once?: boolean): Listener<T>;
    onRun(target: Target, callback: AutoDisposeCallback, once?: boolean): AutoDisposeListener<T>;

    onDone(callback: Callback, once?: boolean): Listener<T>;
    onDone(target: Target, callback: AutoDisposeCallback, once?: boolean): AutoDisposeListener<T>;

    onRelease(callback: Callback, once?: boolean): Listener<T>;
    onRelease(target: Target, callback: AutoDisposeCallback, once?: boolean): AutoDisposeListener<T>;
}

export interface ManagerInterface extends NonTriggerHandler<symbol>, ListenableInterface<symbol>
{
    /* Constructors of the allowed operations. */
    readonly allowed: (new (...args: any[]) => OperationInterface<Event>)[];
    /* Actual set of operations. */
    readonly operations: OperationInterface<Event>[];

    /* Requests the given operation. */
    request(operation: OperationInterface<Event>): void;
    /* Indicates whether this operation manager is allowed to process the operation. */
    isAllowed(operation: OperationInterface<Event>): void;
    /* Evaluates whether the operation is currently processable.
      For example, the operation may be incompatible with other operations currently being processed. */
    isProcessable(operation: OperationInterface<Event>): boolean;
    /* Dispose all listeners bound to the target. Usually used inside the target destructor. */
    clean(target: Target): void;
}

export interface OperationInterface<T extends Event> extends NonTriggerHandler<Event>, ListenableInterface<Event>
{
    readonly manager: ManagerInterface;
    readonly isIdle: boolean;
    readonly isRunning: boolean;
    readonly isDone: boolean;
    readonly result?: any;

    /* It is not recommended to use this feature as it could be a bit confusing.
       Use manager.request(operation) instead. */
    request(): void;
}
