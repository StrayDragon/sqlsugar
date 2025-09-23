import * as assert from 'assert';
import { Result, Ok, Err } from '../types/result';

/**
 * Result Type Tests
 *
 * Tests for the functional Result type pattern implementation
 * that provides better error handling and chaining capabilities.
 */
suite('Result Type Tests', () => {

    suite('Basic Result Creation', () => {
        test('should create Ok result successfully', () => {
            const result = new Ok(42);
            assert.strictEqual(result.ok, true, 'Ok result should have ok=true');
            assert.strictEqual(result.value, 42, 'Ok result should contain the value');
            assert.strictEqual(result.error, undefined, 'Ok result should have no error');
        });

        test('should create Err result successfully', () => {
            const error = new Error('Test error');
            const result = new Err(error);
            assert.strictEqual(result.ok, false, 'Err result should have ok=false');
            assert.strictEqual(result.error, error, 'Err result should contain the error');
        });

        test('should handle string errors in Err', () => {
            const result = new Error('Something went wrong');
            const errResult = new Err(result);
            assert.strictEqual(errResult.ok, false, 'Err result should have ok=false');
            assert.strictEqual(errResult.error, result, 'Err result should contain the string error');
        });
    });

    suite('map Operation', () => {
        test('should map Ok value correctly', () => {
            const result = new Ok(5);
            const mapped = result.map(x => x * 2);

            assert.ok(mapped instanceof Ok, 'Mapped result should be Ok');
            assert.strictEqual(mapped.value, 10, 'Value should be doubled');
        });

        test('should not map Err value', () => {
            const error = new Error('Original error');
            const result = new Err<number>(error);
            const mapped = result.map(x => x * 2);

            assert.ok(mapped instanceof Err, 'Mapped Err should remain Err');
            assert.strictEqual(mapped.error, error, 'Original error should be preserved');
        });

        test('should handle mapping errors', () => {
            const result = new Ok('5');
            const mapped = result.map(x => parseInt(x, 10));

            assert.ok(mapped instanceof Ok, 'Successful mapping should be Ok');
            assert.strictEqual(mapped.value, 5, 'Value should be parsed correctly');
        });
    });

    suite('flatMap Operation', () => {
        test('should flatMap Ok value correctly', () => {
            const result = new Ok('hello');
            const flatMapped = result.flatMap(x => new Ok(x.toUpperCase()));

            assert.ok(flatMapped instanceof Ok, 'FlatMapped result should be Ok');
            assert.strictEqual(flatMapped.value, 'HELLO', 'Value should be transformed');
        });

        test('should handle flatMap returning Err', () => {
            const result = new Ok('invalid');
            const flatMapped = result.flatMap(x => {
                if (x === 'invalid') {
                    return new Err(new Error('Invalid input'));
                }
                return new Ok(x);
            });

            assert.ok(flatMapped instanceof Err, 'Should return Err for invalid input');
            assert.strictEqual(flatMapped.error.message, 'Invalid input', 'Should contain the error');
        });

        test('should not flatMap Err value', () => {
            const error = new Error('Original error');
            const result = new Err<string>(error);
            const flatMapped = result.flatMap(x => new Ok(x.toUpperCase()));

            assert.ok(flatMapped instanceof Err, 'FlatMapped Err should remain Err');
            assert.strictEqual(flatMapped.error, error, 'Original error should be preserved');
        });
    });

    suite('Chaining Operations', () => {
        test('should chain multiple map operations', () => {
            const result = new Ok('10')
                .map(x => parseInt(x, 10))
                .map(x => x * 2)
                .map(x => x + 5);

            assert.ok(result instanceof Ok, 'Chained operations should return Ok');
            assert.strictEqual(result.value, 25, 'All operations should be applied');
        });

        test('should chain map and flatMap operations', () => {
            const result = new Ok('10,20,30')
                .map(x => x.split(','))
                .flatMap(arr => new Ok(arr.map(s => parseInt(s.trim(), 10))))
                .map(numbers => numbers.reduce((sum, n) => sum + n, 0));

            assert.ok(result instanceof Ok, 'Chained operations should return Ok');
            assert.strictEqual(result.value, 60, 'Sum should be calculated correctly');
        });

        test('should short-circuit chain on error', () => {
            const result = new Ok('10')
                .map(x => parseInt(x, 10))
                .flatMap((x: number) => {
                    if (x < 0) return new Err(new Error('Negative number'));
                    return new Ok(x);
                })
                .map(x => x * 2); // This should not execute

            assert.ok(result instanceof Ok, 'Valid chain should complete');
            assert.strictEqual(result.value, 20, 'Final result should be correct');
        });

        test('should handle error in middle of chain', () => {
            const result = new Ok('invalid')
                .map(x => parseInt(x, 10))
                .flatMap(x => new Ok(x * 2))
                .map(x => x + 5); // This should not execute

            assert.ok(result instanceof Err, 'Chain with error should return Err');
            assert.ok(result.error instanceof Error, 'Should contain parsing error');
        });
    });

    suite('Error Handling', () => {
        test('should preserve original error type', () => {
            const customError = new TypeError('Type error occurred');
            const result = new Err<number>(customError);

            assert.ok(result.error instanceof TypeError, 'Should preserve original error type');
            assert.strictEqual(result.error.message, 'Type error occurred', 'Should preserve error message');
        });

        test('should handle async operations', async () => {
            const asyncOperation = async (value: number): Promise<Result<number, Error>> => {
                if (value > 100) {
                    return new Err(new Error('Value too large'));
                }
                return new Ok(value * 2);
            };

            const result = await asyncOperation(50);
            assert.ok(result instanceof Ok, 'Valid async operation should return Ok');
            assert.strictEqual(result.value, 100, 'Async operation should complete');

            const errorResult = await asyncOperation(200);
            assert.ok(errorResult instanceof Err, 'Invalid async operation should return Err');
            assert.strictEqual(errorResult.error.message, 'Value too large', 'Should contain correct error');
        });
    });

    suite('Type Safety', () => {
        test('should maintain type information', () => {
            const stringResult: Result<string, Error> = new Ok('hello');
            const numberResult: Result<number, Error> = stringResult.map(s => s.length);

            // This should compile without TypeScript errors
            assert.strictEqual(numberResult.value, 5, 'Type should be inferred correctly');
        });

        test('should handle union types', () => {
            type StringOrNumber = string | number;
            const result: Result<StringOrNumber, Error> = new Ok('hello');

            const processed = result.map((value: StringOrNumber): string => {
                if (typeof value === 'string') {
                    return value.toUpperCase();
                }
                return value.toString();
            });

            assert.strictEqual(processed.value, 'HELLO', 'Union type should be handled correctly');
        });
    });

    suite('Real-world Scenarios', () => {
        test('should handle validation scenarios', () => {
            const validateEmail = (email: string): Result<string, Error> => {
                if (!email.includes('@')) {
                    return new Err(new Error('Invalid email format'));
                }
                return new Ok(email.toLowerCase());
            };

            const validateAge = (age: string): Result<number, Error> => {
                const num = parseInt(age, 10);
                if (isNaN(num)) {
                    return new Err(new Error('Age must be a number'));
                }
                if (num < 0 || num > 150) {
                    return new Err(new Error('Age must be between 0 and 150'));
                }
                return new Ok(num);
            };

            // Valid case
            const emailResult = validateEmail('USER@EXAMPLE.COM');
            assert.ok(emailResult instanceof Ok, 'Valid email should be Ok');
            assert.strictEqual(emailResult.value, 'user@example.com', 'Email should be normalized');

            const ageResult = validateAge('25');
            assert.ok(ageResult instanceof Ok, 'Valid age should be Ok');
            assert.strictEqual(ageResult.value, 25, 'Age should be parsed');

            // Invalid cases
            const invalidEmail = validateEmail('invalid-email');
            assert.ok(invalidEmail instanceof Err, 'Invalid email should be Err');

            const invalidAge = validateAge('200');
            assert.ok(invalidAge instanceof Err, 'Invalid age should be Err');
        });

        test('should handle database operation simulation', () => {
            type User = { id: number; name: string; email: string; };

            const findUserById = (id: number): Result<User, Error> => {
                if (id <= 0) {
                    return new Err(new Error('Invalid user ID'));
                }
                if (id > 1000) {
                    return new Err(new Error('User not found'));
                }
                return new Ok({ id, name: `User ${id}`, email: `user${id}@example.com` });
            };

            const getUserEmail = (id: number): Result<string, Error> => {
                return findUserById(id)
                    .flatMap(user => new Ok(user.email))
                    .map(email => email.toUpperCase());
            };

            // Valid user
            const result1 = getUserEmail(42);
            assert.ok(result1 instanceof Ok, 'Valid user should return Ok');
            assert.strictEqual(result1.value, 'USER42@EXAMPLE.COM', 'Email should be processed');

            // Invalid ID
            const result2 = getUserEmail(-1);
            assert.ok(result2 instanceof Err, 'Invalid ID should return Err');
            assert.strictEqual(result2.error.message, 'Invalid user ID', 'Should contain validation error');

            // User not found
            const result3 = getUserEmail(9999);
            assert.ok(result3 instanceof Err, 'Non-existent user should return Err');
            assert.strictEqual(result3.error.message, 'User not found', 'Should contain not found error');
        });
    });

});