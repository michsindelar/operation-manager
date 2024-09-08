import AbstractManager from 'operation-manager/AbstractManager';
import AbstractOperation from 'operation-manager/AbstractOperation';
import { OperationInterface, ManagerInterface } from 'operation-manager/types';
import { Event } from 'event-handler-ts/Handler/types';
import { Target } from 'event-handler-ts/Listener/types';
import mockFn from './fn.mock';
import { describe, test, expect } from '@jest/globals';
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
    _process(onDone: (...result: any[]) => void): void
    {
        onDone();
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
    expect(() => new Manager(allowed)).not.toThrow();
    expect(() => new Manager([ ...allowed, AOperation ])).not.toThrow();
    expect(() => new Manager([])).toThrow();
});


test('allowed', () => {
    const manager1: ManagerInterface = new Manager(allowed);
    allowed.forEach((operation) => expect(manager1.allowed.includes(operation)).toBe(true));
    expect(manager1.allowed.length).toBe(allowed.length);
    manager1.allowed.push(DOperation);
    expect(manager1.allowed.length).toBe(allowed.length);

    const manager2: ManagerInterface = new Manager([ ...allowed, BOperation ]);
    allowed.forEach((operation) => expect(manager2.allowed.includes(operation)).toBe(true));
    expect(manager2.allowed.length).toBe(allowed.length);
});


test('operations', () => {
    const manager: ManagerInterface = new Manager(allowed);

    const operation1: OperationInterface<Event> = new COperation(manager);
    manager.request(operation1);
    expect(manager.operations.includes(operation1)).toBe(true);
    expect(manager.operations.length).toBe(1);

    const operation2: OperationInterface<Event> = new BOperation(manager);
    manager.operations.push(operation2);
    expect(manager.operations.includes(operation2)).toBe(false);
    expect(manager.operations.length).toBe(1);
    manager.request(operation2);
    expect(manager.operations.includes(operation2)).toBe(true);
    expect(manager.operations.length).toBe(2);
});


describe('request', () => {
    test('accepting the operation and rejecting it a second time', () => {
        const manager: ManagerInterface = new Manager(allowed);
        const onAcceptManager = mockFn();
        manager.onAccept(onAcceptManager);
        const onRefuseManager = mockFn();
        manager.onRefuse(onRefuseManager);
        const operation: OperationInterface<Event> = new COperation(manager);
        const onAcceptOperation = mockFn();
        operation.onAccept(onAcceptOperation);
        const onRefuseOperation = mockFn();
        operation.onRefuse(onRefuseOperation);

        manager.request(operation);
        expect(onAcceptManager.mock.calls).toHaveLength(1);
        expect(onAcceptManager.mock.calls[0][0]).toBe(operation);
        expect(onRefuseManager.mock.calls).toHaveLength(0);
        expect(onAcceptOperation.mock.calls).toHaveLength(1);
        expect(onRefuseOperation.mock.calls).toHaveLength(0);

        manager.request(operation)
        expect(onAcceptManager.mock.calls).toHaveLength(1);
        expect(onRefuseManager.mock.calls).toHaveLength(1);
        expect(onRefuseManager.mock.calls[0][0]).toBe(operation);
        expect(onAcceptOperation.mock.calls).toHaveLength(1);
        // Callback onRefuseOperation should not be called because the operation has been accepted in the past.
        expect(onRefuseOperation.mock.calls).toHaveLength(0);
    });

    test('reject a operation of another operation manager', () => {
        const manager: ManagerInterface = new Manager(allowed);
        const onAcceptManager = mockFn();
        manager.onAccept(onAcceptManager);
        const onRefuseManager = mockFn();
        manager.onRefuse(onRefuseManager);
        const operation: OperationInterface<Event> = new COperation(new Manager(allowed));
        const onAcceptOperation = mockFn();
        operation.onAccept(onAcceptOperation);
        const onRefuseOperation = mockFn();
        operation.onRefuse(onRefuseOperation);

        manager.request(operation);
        expect(onAcceptManager.mock.calls).toHaveLength(0);
        expect(onRefuseManager.mock.calls).toHaveLength(1);
        expect(onRefuseManager.mock.calls[0][0]).toBe(operation);
        expect(onAcceptOperation.mock.calls).toHaveLength(0);
        // The onRefuse event should not be called because the operation is listening to another manager's events.
        expect(onRefuseOperation.mock.calls).toHaveLength(0);
    });

    test('refusal of an unauthorized operation', () => {
        const manager: ManagerInterface = new Manager(allowed);
        const onAcceptManager = mockFn();
        manager.onAccept(onAcceptManager);
        const onRefuseManager = mockFn();
        manager.onRefuse(onRefuseManager);
        const operation: OperationInterface<Event> = new DOperation(manager);
        const onAcceptOperation = mockFn();
        operation.onAccept(onAcceptOperation);
        const onRefuseOperation = mockFn();
        operation.onRefuse(onRefuseOperation);

        manager.request(operation);
        expect(onAcceptManager.mock.calls).toHaveLength(0);
        expect(onRefuseManager.mock.calls).toHaveLength(1);
        expect(onRefuseManager.mock.calls[0][0]).toBe(operation);
        expect(onAcceptOperation.mock.calls).toHaveLength(0);
        expect(onRefuseOperation.mock.calls).toHaveLength(1);
    });
});


test('isAllowed', () => {
    const manager: ManagerInterface = new Manager(allowed);

    const operation1: OperationInterface<Event> = new COperation(manager);
    expect(manager.isAllowed(operation1)).toBe(true);

    const operation2: OperationInterface<Event> = new DOperation(manager);
    expect(manager.isAllowed(operation2)).toBe(false);

    const operation3: OperationInterface<Event> = new COperation(new Manager(allowed));
    expect(manager.isAllowed(operation3)).toBe(false);
});


test('isProcessable', () => {
    class Manager extends AbstractManager
    {
        constructor()
        {
            super(allowed);
        }

        // An operation is not processable if an instance of the BOperation is currently being processed.
        isProcessable(operation: OperationInterface<Event>): boolean
        {
            for (const operation of this._operations) {
                if (!(operation instanceof BOperation)) {
                    continue;
                }
                return false;
            }
            return true;
        }
    }

    const manager: ManagerInterface = new Manager();
    const onAccept = mockFn();
    manager.onAccept(onAccept);
    const onRefuse = mockFn();
    manager.onRefuse(onRefuse);
    const onRun = mockFn();
    manager.onRun(onRun);
    const onDone = mockFn();
    manager.onDone(onDone);
    const onRelease = mockFn();
    manager.onRelease(onRelease);
    const operation1 = new AOperation(manager);
    manager.request(operation1);
    const operation2 = new BOperation(manager);
    manager.request(operation2);
    const operation3 = new AOperation(manager);
    manager.request(operation3);

    expect(onAccept.mock.calls).toHaveLength(2);
    expect(onAccept.mock.calls[0][0]).toBe(operation1);
    expect(onAccept.mock.calls[1][0]).toBe(operation2);
    expect(onRefuse.mock.calls).toHaveLength(1);
    expect(onRefuse.mock.calls[0][0]).toBe(operation3);
    expect(onRun.mock.calls).toHaveLength(2);
    expect(onRun.mock.calls[0][0]).toBe(operation1);
    expect(onRun.mock.calls[1][0]).toBe(operation2);
    expect(onDone.mock.calls).toHaveLength(1);
    expect(onDone.mock.calls[0][0]).toBe(operation1);
    expect(onRelease.mock.calls).toHaveLength(1);
    expect(onRelease.mock.calls[0][0]).toBe(operation1);
});


test('clean', () => {
    const manager: ManagerInterface = new Manager(allowed);
    const target: Record<string, Mock> = {
        onAcceptManager: mockFn(),
        onRunManager: mockFn(),
        onDoneManager: mockFn(),
        onReleaseManager: mockFn(),
        onAcceptOperation1: mockFn(),
        onRunOperation1: mockFn(),
        onDoneOperation1: mockFn(),
        onReleaseOperation1: mockFn(),
        onAcceptOperation2: mockFn(),
        onRunOperation2: mockFn(),
        onDoneOperation2: mockFn(),
        onReleaseOperation2: mockFn()
    };
    manager.onAccept(target, target.onAcceptManager.bind(target));
    manager.onRun(target, 'onRunManager' as keyof Target);
    manager.onDone(target, target.onDoneManager.bind(target));
    manager.onRelease(target, 'onReleaseManager' as keyof Target);
    const operation1: OperationInterface<Event> = new AOperation(manager);
    operation1.onAccept(target, target.onAcceptOperation1.bind(target));
    operation1.onRun(target, 'onRunOperation1' as keyof Target);
    operation1.onDone(target, target.onDoneOperation1.bind(target));
    operation1.onRelease(target, 'onReleaseOperation1' as keyof Target);
    const operation2: COperation = new COperation(manager);
    operation2.onAccept(target, target.onAcceptOperation2.bind(target));
    operation2.onRun(target, 'onRunOperation2' as keyof Target);
    operation2.onDone(target, target.onDoneOperation2.bind(target));
    operation2.onRelease(target, 'onReleaseOperation2' as keyof Target);
    manager.request(operation1);
    manager.request(operation2);
    manager.clean(target);
    operation2.done?.();

    expect(target.onAcceptManager.mock.calls).toHaveLength(2);
    expect(target.onRunManager.mock.calls).toHaveLength(2);
    expect(target.onDoneManager.mock.calls).toHaveLength(1);
    expect(target.onReleaseManager.mock.calls).toHaveLength(1);
    expect(target.onAcceptOperation1.mock.calls).toHaveLength(1);
    expect(target.onRunOperation1.mock.calls).toHaveLength(1);
    expect(target.onDoneOperation1.mock.calls).toHaveLength(1);
    expect(target.onReleaseOperation1.mock.calls).toHaveLength(1);
    expect(target.onAcceptOperation2.mock.calls).toHaveLength(1);
    expect(target.onRunOperation2.mock.calls).toHaveLength(1);
    expect(target.onDoneOperation2.mock.calls).toHaveLength(0);
    expect(target.onReleaseOperation2.mock.calls).toHaveLength(0);
});


describe('on', () => {
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
    const operationA = new AOperation(manager);
    operationA.request();
    const operationB = new BOperation(manager);
    operationB.request();
    const operationC = new COperation(manager);
    operationC.request();
    const operationD = new DOperation(manager);
    operationD.request();

    test('onAccept', () => {
        expect(onAcceptManager.mock.calls).toHaveLength(3);
        expect(onAcceptManager.mock.calls[0][0]).toBe(operationA);
        expect(onAcceptManager.mock.calls[1][0]).toBe(operationB);
        expect(onAcceptManager.mock.calls[2][0]).toBe(operationC);
    });

    test('onRefuse', () => {
        expect(onRefuseManager.mock.calls).toHaveLength(1);
        expect(onRefuseManager.mock.calls[0][0]).toBe(operationD);
    });

    test('onRun', () => {
        expect(onRunManager.mock.calls).toHaveLength(3);
        expect(onRunManager.mock.calls[0][0]).toBe(operationA);
        expect(onRunManager.mock.calls[1][0]).toBe(operationB);
        expect(onRunManager.mock.calls[2][0]).toBe(operationC);
    });

    test('onDone', () => {
        expect(onDoneManager.mock.calls).toHaveLength(1);
        expect(onDoneManager.mock.calls[0][0]).toBe(operationA);
        expect(onReleaseManager.mock.calls).toHaveLength(1);
        expect(onReleaseManager.mock.calls[0][0]).toBe(operationA);
        operationC.done?.();
        expect(onDoneManager.mock.calls).toHaveLength(2);
        expect(onDoneManager.mock.calls[1][0]).toBe(operationC);
    });

    test('onRelease', () => {
        expect(onReleaseManager.mock.calls).toHaveLength(2);
        expect(onReleaseManager.mock.calls[0][0]).toBe(operationA);
        expect(onReleaseManager.mock.calls[1][0]).toBe(operationC);
    });
});
