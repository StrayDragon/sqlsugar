import * as assert from 'assert';
import { DIContainer } from '../core/di-container';

/**
 * Dependency Injection Container Tests
 *
 * Tests for the modern dependency injection container implementation
 * that supports singleton and transient service registration.
 */
suite('DI Container Tests', () => {

    let container: DIContainer;

    setup(() => {
        container = DIContainer.getInstance();
    });

    teardown(() => {
        container.dispose();
    });

    suite('Singleton Services', () => {
        test('should register and retrieve singleton service', () => {
            // Arrange
            const factory = () => ({ value: 42 });

            // Act
            container.registerSingleton('testService', factory);
            const service = container.get('testService');

            // Assert
            assert.strictEqual(service.value, 42, 'Service should be created with correct value');
        });

        test('should return same instance for singleton', () => {
            // Arrange
            let callCount = 0;
            const factory = () => {
                callCount++;
                return { id: callCount };
            };

            // Act
            container.registerSingleton('singletonService', factory);
            const service1 = container.get('singletonService');
            const service2 = container.get('singletonService');

            // Assert
            assert.strictEqual(service1, service2, 'Same instance should be returned for singleton');
            assert.strictEqual(callCount, 1, 'Factory should be called only once');
            assert.strictEqual(service1.id, 1, 'Service should have correct ID');
        });

        test('should throw error for unregistered service', () => {
            // Act & Assert
            assert.throws(
                () => container.get('nonexistentService'),
                /Service 'nonexistentService' not registered/
            );
        });
    });

    suite('Transient Services', () => {
        test('should register and retrieve transient service', () => {
            // Arrange
            const factory = () => ({ timestamp: Date.now() });

            // Act
            container.registerTransient('transientService', factory);
            const service = container.get('transientService');

            // Assert
            assert.ok(service.timestamp > 0, 'Service should be created with timestamp');
        });

        test('should return new instance for each transient request', () => {
            // Arrange
            let callCount = 0;
            const factory = () => {
                callCount++;
                return { id: callCount };
            };

            // Act
            container.registerTransient('transientService', factory);
            const service1 = container.get('transientService');
            const service2 = container.get('transientService');

            // Assert
            assert.notStrictEqual(service1, service2, 'Different instances should be returned');
            assert.strictEqual(callCount, 2, 'Factory should be called for each request');
            assert.strictEqual(service1.id, 1, 'First service should have ID 1');
            assert.strictEqual(service2.id, 2, 'Second service should have ID 2');
        });
    });

    suite('Service Dependencies', () => {
        test('should resolve services with dependencies', () => {
            // Arrange
            interface Database {
                query(sql: string): any;
            }

            interface UserRepository {
                findById(id: number): any;
            }

            const databaseFactory = () => ({
                query: (sql: string) => `Result for: ${sql}`
            });

            const userRepositoryFactory = () => {
                const db = container.get<Database>('database');
                return {
                    findById: (id: number) => db.query(`SELECT * FROM users WHERE id = ${id}`)
                };
            };

            // Act
            container.registerSingleton('database', databaseFactory);
            container.registerSingleton('userRepository', userRepositoryFactory);

            const userRepository = container.get<UserRepository>('userRepository');
            const result = userRepository.findById(42);

            // Assert
            assert.strictEqual(result, 'Result for: SELECT * FROM users WHERE id = 42', 'Service dependency should be resolved');
        });

        test('should handle circular dependencies gracefully', () => {
            // Arrange
            interface ServiceA {
                method(): string;
            }

            interface ServiceB {
                method(): string;
            }

            const serviceAFactory = () => {
                const serviceB = container.get<ServiceB>('serviceB');
                return {
                    method: () => `ServiceA using ServiceB: ${serviceB.method()}`
                };
            };

            const serviceBFactory = () => {
                const serviceA = container.get<ServiceA>('serviceA');
                return {
                    method: () => `ServiceB using ServiceA: ${serviceA.method()}`
                };
            };

            // Act & Assert
            container.registerSingleton('serviceA', serviceAFactory);
            container.registerSingleton('serviceB', serviceBFactory);

            // This should not throw an error but handle the circular dependency
            assert.throws(
                () => container.get('serviceA'),
                /Maximum dependency depth exceeded/
            );
        });
    });

    suite('Context-Aware Services', () => {
        test('should handle VS Code extension context', () => {
            // Arrange
            const mockContext = {
                subscriptions: [],
                globalState: { get: () => {}, update: () => {} },
                workspaceState: { get: () => {}, update: () => {} }
            };

            const contextAwareFactory = () => {
                // In a real scenario, this would use the context
                return {
                    context: mockContext,
                    initialize: () => 'Extension initialized'
                };
            };

            // Act
            container.registerSingleton('contextService', contextAwareFactory);
            const service = container.get('contextService');

            // Assert
            assert.strictEqual(service.context, mockContext, 'Service should have access to context');
            assert.strictEqual(service.initialize(), 'Extension initialized', 'Service should be functional');
        });
    });

    suite('Error Handling', () => {
        test('should handle factory errors gracefully', () => {
            // Arrange
            const faultyFactory = () => {
                throw new Error('Factory failed');
            };

            // Act & Assert
            container.registerSingleton('faultyService', faultyFactory);
            assert.throws(
                () => container.get('faultyService'),
                /Factory failed/
            );
        });

        test('should provide helpful error messages', () => {
            // Act & Assert
            assert.throws(
                () => container.get('missingService'),
                /Service 'missingService' not registered/,
                'Should provide clear error message'
            );
        });
    });

    suite('Container Lifecycle', () => {
        test('should clear all services on dispose', () => {
            // Arrange
            container.registerSingleton('service1', () => ({ id: 1 }));
            container.registerTransient('service2', () => ({ id: 2 }));

            // Act
            container.dispose();

            // Assert
            assert.throws(
                () => container.get('service1'),
                /Service 'service1' not registered/
            );
            assert.throws(
                () => container.get('service2'),
                /Service 'service2' not registered/
            );
        });

        test('should allow re-registration after dispose', () => {
            // Arrange
            container.registerSingleton('service', () => ({ version: 1 }));

            // Act
            container.dispose();
            container.registerSingleton('service', () => ({ version: 2 }));

            // Assert
            const service = container.get('service');
            assert.strictEqual(service.version, 2, 'Should use new factory after re-registration');
        });
    });

    suite('Complex Scenarios', () => {
        test('should handle mixed singleton and transient services', () => {
            // Arrange
            interface Logger {
                log(message: string): void;
            }

            interface Service {
                getId(): string;
            }

            let loggerCallCount = 0;
            const loggerFactory = () => {
                loggerCallCount++;
                return {
                    log: (message: string) => console.log(`[${loggerCallCount}] ${message}`)
                };
            };

            let serviceCallCount = 0;
            const serviceFactory = () => {
                serviceCallCount++;
                const logger = container.get<Logger>('logger');
                return {
                    getId: () => {
                        logger.log(`Creating service ${serviceCallCount}`);
                        return `service-${serviceCallCount}`;
                    }
                };
            };

            // Act
            container.registerSingleton('logger', loggerFactory);
            container.registerTransient('service', serviceFactory);

            const service1 = container.get<Service>('service');
            const service2 = container.get<Service>('service');
            const logger1 = container.get<Logger>('logger');
            const logger2 = container.get<Logger>('logger');

            // Assert
            assert.strictEqual(loggerCallCount, 1, 'Logger should be singleton - created once');
            assert.strictEqual(serviceCallCount, 2, 'Service should be transient - created twice');
            assert.strictEqual(logger1, logger2, 'Logger instances should be the same');
            assert.notStrictEqual(service1, service2, 'Service instances should be different');
            assert.strictEqual(service1.getId(), 'service-1', 'First service should have correct ID');
            assert.strictEqual(service2.getId(), 'service-2', 'Second service should have correct ID');
        });

        test('should simulate real extension scenario', () => {
            // Arrange - Simulate extension services
            interface Configuration {
                get(key: string): any;
            }

            interface LanguageHandler {
                detectLanguage(text: string): string;
            }

            interface CommandManager {
                registerCommand(name: string, callback: Function): void;
            }

            const configFactory = () => ({
                get: (key: string) => `config-value-for-${key}`
            });

            const languageHandlerFactory = () => {
                const config = container.get<Configuration>('configuration');
                return {
                    detectLanguage: (text: string) => {
                        const confidence = config.get('language-detection-confidence');
                        return text.includes('SELECT') ? 'sql' : 'unknown';
                    }
                };
            };

            const commandManagerFactory = () => {
                const config = container.get<Configuration>('configuration');
                const commands: { [name: string]: Function } = {};
                return {
                    registerCommand: (name: string, callback: Function) => {
                        commands[name] = callback;
                    },
                    getCommands: () => Object.keys(commands)
                };
            };

            // Act
            container.registerSingleton('configuration', configFactory);
            container.registerSingleton('languageHandler', languageHandlerFactory);
            container.registerSingleton('commandManager', commandManagerFactory);

            const langHandler = container.get<LanguageHandler>('languageHandler');
            const cmdManager = container.get<CommandManager>('commandManager');

            const detectedLanguage = langHandler.detectLanguage('SELECT * FROM users');
            cmdManager.registerCommand('testCommand', () => console.log('Test command'));

            // Assert
            assert.strictEqual(detectedLanguage, 'sql', 'Language detection should work');
            assert.ok(cmdManager.getCommands().includes('testCommand'), 'Command registration should work');
        });
    });

});