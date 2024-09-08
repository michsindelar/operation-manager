import AbstractManager from 'operation-manager/AbstractManager';
import AbstractOperation from 'operation-manager/AbstractOperation';
import { OperationInterface, ManagerInterface } from 'operation-manager/types';
import { Event } from 'event-handler-ts/Handler/types';
import Listener from 'event-handler-ts/Listener/Listener';
import AutoDisposeListener from 'event-handler-ts/Listener/AutoDisposeListener';
import { isCallback } from 'event-handler-ts/Listener/guards';
import { Target, Callback, AutoDisposeCallback } from 'event-handler-ts/Listener/types';
import mockFn from './fn.mock';
import { describe, expect, test } from '@jest/globals';
import { Mock } from 'jest-mock';


class Manager extends AbstractManager
{
    isProcessable(operation: OperationInterface<Event>): boolean
    {
        return true;
    }
}

class AOperation extends AbstractOperation<Event>
{
    static RESULT: string[] = [ 'result1', 'result2', 'result3' ];

    _process(onDone: (...result: any[]) => void): void
    {
        onDone(...AOperation.RESULT);
    }
}

class BOperation extends AbstractOperation<Event>
{
    _process(onDone: (...result: any[]) => void): void
    {
        // This operation will never end.
    }
}

class COperation extends AbstractOperation<Event>
{
    done?: (...result: any[]) => void;

    _process(onDone: (...result: any[]) => void): void
    {
        // This operation ends when the "done" method is called.
        this.done = onDone;
    }
}

class DOperation extends AbstractOperation<Event>
{
    _process(onDone: (...result: any[]) => void): void
    {
        // This operation will never end.
    }
}

const allowed: (new (...args: any[]) => OperationInterface<Event>)[] = [ AOperation, BOperation, COperation ];
Object.freeze(allowed);


test('constructor', () => {
    const EVENT: Readonly<Record<string, Event>> = {
        SUCCESS: 'success',
        ERROR: 1
    };
    class Operation<T extends Event> extends AbstractOperation<Event>
    {
        constructor(manager: ManagerInterface)
        {
            super(manager, Object.values(EVENT));
        }

        _done?: (...result: any[]) => void;

        _process(onDone: (...result: any[]) => void): void
        {
            this._done = onDone;
        }

        success(): void
        {
            if (!this.isRunning) {
                return;
            }
            this._trigger(EVENT.SUCCESS);
            this._done?.();
        }

        error(message: string): void
        {
            if (!this.isRunning) {
                return;
            }
            this._trigger(EVENT.ERROR, message);
            this._done?.(message);
        }

        onSuccess(callback: Callback, once?: boolean): Listener<T>;
        onSuccess(target: Target, callback: AutoDisposeCallback, once?: boolean): AutoDisposeListener<T>;
        onSuccess(arg1: Callback | Target, arg2?: boolean | AutoDisposeCallback, arg3?: boolean): Listener<T> | AutoDisposeListener<T>
        {
            const event: Event = EVENT.SUCCESS;
            if (isCallback(arg1)) {
                return this.on(event, arg1, arg2 as (boolean | undefined));
            }
            return this.on(event, arg1, arg2 as AutoDisposeCallback, arg3);
        }

        onError(callback: Callback, once?: boolean): Listener<T>;
        onError(target: Target, callback: AutoDisposeCallback, once?: boolean): AutoDisposeListener<T>;
        onError(arg1: Callback | Target, arg2?: boolean | AutoDisposeCallback, arg3?: boolean): Listener<T> | AutoDisposeListener<T>
        {
            const event: Event = EVENT.ERROR;
            if (isCallback(arg1)) {
                return this.on(event, arg1, arg2 as (boolean | undefined));
            }
            return this.on(event, arg1, arg2 as AutoDisposeCallback, arg3);
        }
    }
    const manager: ManagerInterface = new Manager([ Operation ]);
    const operation1 = new Operation(manager);
    const onAcceptOperation1 = mockFn();
    operation1.onAccept(onAcceptOperation1);
    const onRefuseOperation1 = mockFn();
    operation1.onRefuse(onRefuseOperation1);
    const onRunOperation1 = mockFn();
    operation1.onRun(onRunOperation1);
    const onSuccessOperation1 = mockFn();
    operation1.onSuccess(onSuccessOperation1);
    const onErrorOperation1 = mockFn();
    operation1.onError(onErrorOperation1);
    const onDoneOperation1 = mockFn();
    operation1.onDone(onDoneOperation1);
    const onReleaseOperation1 = mockFn();
    operation1.onRelease(onReleaseOperation1);
    operation1.request();

    expect(onAcceptOperation1.mock.calls).toHaveLength(1);
    expect(onRefuseOperation1.mock.calls).toHaveLength(0);
    expect(onRunOperation1.mock.calls).toHaveLength(1);
    expect(onSuccessOperation1.mock.calls).toHaveLength(0);
    expect(onErrorOperation1.mock.calls).toHaveLength(0);
    expect(onDoneOperation1.mock.calls).toHaveLength(0);
    expect(onReleaseOperation1.mock.calls).toHaveLength(0);
    operation1.success();
    expect(onSuccessOperation1.mock.calls).toHaveLength(1);
    expect(onErrorOperation1.mock.calls).toHaveLength(0);
    expect(onDoneOperation1.mock.calls).toHaveLength(1);
    expect(onReleaseOperation1.mock.calls).toHaveLength(1);


    const operation2 = new Operation(manager);
    const onAcceptOperation2 = mockFn();
    operation2.onAccept(onAcceptOperation2);
    const onRefuseOperation2 = mockFn();
    operation2.onRefuse(onRefuseOperation2);
    const onRunOperation2 = mockFn();
    operation2.onRun(onRunOperation2);
    const onSuccessOperation2 = mockFn();
    operation2.onSuccess(onSuccessOperation2);
    const onErrorOperation2 = mockFn();
    operation2.onError(onErrorOperation2);
    const onDoneOperation2 = mockFn();
    operation2.onDone(onDoneOperation2);
    const onReleaseOperation2 = mockFn();
    operation2.onRelease(onReleaseOperation2);
    operation2.request();

    expect(onAcceptOperation2.mock.calls).toHaveLength(1);
    expect(onRefuseOperation2.mock.calls).toHaveLength(0);
    expect(onRunOperation2.mock.calls).toHaveLength(1);
    expect(onSuccessOperation2.mock.calls).toHaveLength(0);
    expect(onErrorOperation2.mock.calls).toHaveLength(0);
    expect(onDoneOperation2.mock.calls).toHaveLength(0);
    expect(onReleaseOperation2.mock.calls).toHaveLength(0);
    const message: string = 'Something went wrong!';
    operation2.error(message);
    expect(onSuccessOperation2.mock.calls).toHaveLength(0);
    expect(onErrorOperation2.mock.calls).toHaveLength(1);
    expect(onErrorOperation2.mock.calls[0]).toHaveLength(1);
    expect(onErrorOperation2.mock.calls[0][0]).toBe(message);
    expect(onDoneOperation2.mock.calls).toHaveLength(1);
    expect(onDoneOperation2.mock.calls[0]).toHaveLength(1);
    expect(onDoneOperation2.mock.calls[0][0]).toBe(message);
    expect(onReleaseOperation2.mock.calls).toHaveLength(1);
    expect(operation2.result).toHaveLength(1);
    expect(operation2.result?.[0]).toBe(message);
});


test('manager', () => {
    const manager: ManagerInterface = new Manager(allowed);
    const operation: OperationInterface<Event> = new AOperation(manager);

    expect(operation.manager).toBe(manager);
});


test('isIdle', () => {
    const manager: ManagerInterface = new Manager(allowed);
    const operation: OperationInterface<Event> = new AOperation(manager);

    expect(operation.isIdle).toBe(true);
});


test('isRunning', () => {
    const manager: ManagerInterface = new Manager(allowed);
    const operation: OperationInterface<Event> = new BOperation(manager);
    manager.request(operation);

    expect(operation.isRunning).toBe(true);
});


test('isDone', () => {
    const manager: ManagerInterface = new Manager(allowed);
    const operation: COperation = new COperation(manager);
    manager.request(operation);
    operation.done?.();

    expect(operation.isDone).toBe(true);
});


test('result', () => {
    const manager: ManagerInterface = new Manager(allowed);
    const operation: AOperation = new AOperation(manager);
    manager.request(operation);

    AOperation.RESULT.forEach(item => expect(operation.result?.includes(item)).toBe(true));
    expect(operation.result?.length).toBe(AOperation.RESULT.length);
});


test('request', () => {
    const manager: ManagerInterface = new Manager(allowed);
    const onAcceptManager = mockFn();
    manager.onAccept(onAcceptManager);
    const onRefuseManager = mockFn();
    manager.onRefuse(onRefuseManager);
    const onRunManager = mockFn();
    manager.onRun(onRunManager);
    const onDoneManager = mockFn();
    manager.onDone(onDoneManager);
    const onReleaseManager = mockFn();
    manager.onRelease(onReleaseManager);
    const operation1: OperationInterface<Event> = new AOperation(manager);
    const onAcceptOperation1 = mockFn();
    operation1.onAccept(onAcceptOperation1);
    const onRefuseOperation1 = mockFn();
    operation1.onRefuse(onRefuseOperation1);
    const onRunOperation1 = mockFn();
    operation1.onRun(onRunOperation1);
    const onDoneOperation1 = mockFn();
    operation1.onDone(onDoneOperation1);
    const onReleaseOperation1 = mockFn();
    operation1.onRelease(onReleaseOperation1);
    const operation2: OperationInterface<Event> = new DOperation(manager);
    const onAcceptOperation2 = mockFn();
    operation2.onAccept(onAcceptOperation2);
    const onRefuseOperation2 = mockFn();
    operation2.onRefuse(onRefuseOperation2);
    const onRunOperation2 = mockFn();
    operation2.onRun(onRunOperation2);
    const onDoneOperation2 = mockFn();
    operation2.onDone(onDoneOperation2);
    const onReleaseOperation2 = mockFn();
    operation2.onRelease(onReleaseOperation2);
    operation1.request();
    operation2.request();

    expect(onAcceptManager.mock.calls).toHaveLength(1);
    expect(onAcceptManager.mock.calls[0][0]).toBe(operation1);
    expect(onRefuseManager.mock.calls).toHaveLength(1);
    expect(onRefuseManager.mock.calls[0][0]).toBe(operation2);
    expect(onRunManager.mock.calls).toHaveLength(1);
    expect(onRunManager.mock.calls[0][0]).toBe(operation1);
    expect(onDoneManager.mock.calls).toHaveLength(1);
    expect(onDoneManager.mock.calls[0][0]).toBe(operation1);
    expect(onReleaseManager.mock.calls).toHaveLength(1);
    expect(onReleaseManager.mock.calls[0][0]).toBe(operation1);
    expect(onAcceptOperation1.mock.calls).toHaveLength(1);
    expect(onRefuseOperation1.mock.calls).toHaveLength(0);
    expect(onRunOperation1.mock.calls).toHaveLength(1);
    expect(onDoneOperation1.mock.calls).toHaveLength(1);
    expect(onReleaseOperation1.mock.calls).toHaveLength(1);
    expect(onAcceptOperation2.mock.calls).toHaveLength(0);
    expect(onRefuseOperation2.mock.calls).toHaveLength(1);
    expect(onRunOperation2.mock.calls).toHaveLength(0);
    expect(onDoneOperation2.mock.calls).toHaveLength(0);
    expect(onReleaseOperation2.mock.calls).toHaveLength(0);
});


describe('on', () => {
    const manager: ManagerInterface = new Manager(allowed);
    const operationA = new AOperation(manager);
    const onAcceptOperationA = mockFn();
    operationA.onAccept(onAcceptOperationA);
    const onRefuseOperationA = mockFn();
    operationA.onRefuse(onRefuseOperationA);
    const onRunOperationA = mockFn();
    operationA.onRun(onRunOperationA);
    const onDoneOperationA = mockFn();
    operationA.onDone(onDoneOperationA);
    const onReleaseOperationA = mockFn();
    operationA.onRelease(onReleaseOperationA);
    operationA.request();
    const operationB = new BOperation(manager);
    const onAcceptOperationB = mockFn();
    operationB.onAccept(onAcceptOperationB);
    const onRefuseOperationB = mockFn();
    operationB.onRefuse(onRefuseOperationB);
    const onRunOperationB = mockFn();
    operationB.onRun(onRunOperationB);
    const onDoneOperationB = mockFn();
    operationB.onDone(onDoneOperationB);
    const onReleaseOperationB = mockFn();
    operationB.onRelease(onReleaseOperationB);
    operationB.request();
    const operationC = new COperation(manager);
    const onAcceptOperationC = mockFn();
    operationC.onAccept(onAcceptOperationC);
    const onRefuseOperationC = mockFn();
    operationC.onRefuse(onRefuseOperationC);
    const onRunOperationC = mockFn();
    operationC.onRun(onRunOperationC);
    const onDoneOperationC = mockFn();
    operationC.onDone(onDoneOperationC);
    const onReleaseOperationC = mockFn();
    operationC.onRelease(onReleaseOperationC);
    operationC.request();
    const operationD = new DOperation(manager);
    const onAcceptOperationD = mockFn();
    operationD.onAccept(onAcceptOperationD);
    const onRefuseOperationD = mockFn();
    operationD.onRefuse(onRefuseOperationD);
    const onRunOperationD = mockFn();
    operationD.onRun(onRunOperationD);
    const onDoneOperationD = mockFn();
    operationD.onDone(onDoneOperationD);
    const onReleaseOperationD = mockFn();
    operationD.onRelease(onReleaseOperationD);
    operationD.request();

    test('onAccept', () => {
        expect(onAcceptOperationA.mock.calls).toHaveLength(1);
        expect(onAcceptOperationB.mock.calls).toHaveLength(1);
        expect(onAcceptOperationC.mock.calls).toHaveLength(1);
        expect(onAcceptOperationD.mock.calls).toHaveLength(0);
    });

    test('onRefuse', () => {
        expect(onRefuseOperationA.mock.calls).toHaveLength(0);
        expect(onRefuseOperationB.mock.calls).toHaveLength(0);
        expect(onRefuseOperationC.mock.calls).toHaveLength(0);
        expect(onRefuseOperationD.mock.calls).toHaveLength(1);
    });

    test('onRun', () => {
        expect(onRunOperationA.mock.calls).toHaveLength(1);
        expect(onRunOperationB.mock.calls).toHaveLength(1);
        expect(onRunOperationC.mock.calls).toHaveLength(1);
        expect(onRunOperationD.mock.calls).toHaveLength(0);
    });

    test('onDone', () => {
        expect(onDoneOperationA.mock.calls).toHaveLength(1);
        expect(onDoneOperationB.mock.calls).toHaveLength(0);
        expect(onDoneOperationC.mock.calls).toHaveLength(0);
        operationC.done?.();
        expect(onDoneOperationC.mock.calls).toHaveLength(1);
        expect(onDoneOperationD.mock.calls).toHaveLength(0);
    });

    test('onRelease', () => {
        expect(onReleaseOperationA.mock.calls).toHaveLength(1);
        expect(onReleaseOperationB.mock.calls).toHaveLength(0);
        expect(onReleaseOperationC.mock.calls).toHaveLength(1);
        expect(onReleaseOperationD.mock.calls).toHaveLength(0);
    });
});
