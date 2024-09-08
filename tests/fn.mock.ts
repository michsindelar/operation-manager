import { FunctionLike, Mock } from 'jest-mock';
import { jest } from '@jest/globals';


export default function mockFn(fn?: FunctionLike): Mock
{
    const mock = jest.fn(fn);
    Object.setPrototypeOf(mock, Function);
    return mock;
}
