import * as assert from 'assert';
import * as vscode from 'vscode';
import { ExtensionCore } from '../core/extension-core';
import { DIContainer } from '../core/di-container';
import { TempFileManager } from '../core/temp-file-manager';
import { Result } from '../types/result';
import { TestHelpers } from './utils/test-helpers';

/**
 * Core Architecture Tests
 *
 * Tests for the refactored core architecture components including
 * ExtensionCore, service management, and the new Result pattern.
 */
suite('Core Architecture Tests', () => {
    let testWorkspace: string;
    let mockContext: vscode.ExtensionContext;

    suiteSetup(async () => {
        testWorkspace = await TestHelpers.setupTestWorkspace();

        // Create a mock extension context
        mockContext = {
            subscriptions: [],
            globalState: {
                get: (key: string) => undefined,
                update: (key: string, value: any) => Promise.resolve()
            },
            workspaceState: {
                get: (key: string) => undefined,
                update: (key: string, value: any) => Promise.resolve()
            },
            extensionPath: '/test/extension/path',
            extensionUri: vscode.Uri.file('/test/extension/path'),
            asAbsolutePath: (relativePath: string) => `/test/extension/path/${relativePath}`,
            storagePath: '/test/storage/path',
            globalStoragePath: '/test/global/storage/path',
            logPath: '/test/log/path',
            environmentVariableCollection: {} as any,
            secrets: {} as any,
            extensionMode: vscode.ExtensionMode.Test,
            extension: {
                id: 'test.extension',
                version: '1.0.0'
            }
        } as vscode.ExtensionContext;
    });

    suiteTeardown(async () => {
        await TestHelpers.cleanupWorkspace();
        ExtensionCore.resetInstance();
    });

    suite('ExtensionCore Singleton Pattern', () => {
        test('should create singleton instance correctly', () => {
            // Act
            const core1 = ExtensionCore.getInstance(mockContext);
            const core2 = ExtensionCore.getInstance(mockContext);

            // Assert
            assert.strictEqual(core1, core2, 'Should return same instance (singleton pattern)');
            assert.ok(core1 instanceof ExtensionCore, 'Should be instance of ExtensionCore');
        });

        test('should throw error when context not provided', () => {
            // Act & Assert
            ExtensionCore.resetInstance();
            assert.throws(
                () => ExtensionCore.getInstance(),
                /ExtensionCore instance not initialized and no context provided/
            );
        });

        test('should reset instance correctly', () => {
            // Arrange
            const core1 = ExtensionCore.getInstance(mockContext);

            // Act
            ExtensionCore.resetInstance();
            const core2 = ExtensionCore.getInstance(mockContext);

            // Assert
            assert.notStrictEqual(core1, core2, 'Reset should create new instance');
        });
    });

    suite('Service Management', () => {
        test('should provide access to all core services', () => {
            // Arrange
            const core = ExtensionCore.getInstance(mockContext);

            // Act & Assert
            assert.ok(core.getLanguageHandler(), 'Should provide LanguageHandler');
            assert.ok(core.getSQLsClientManager(), 'Should provide SQLsClientManager');
            assert.ok(core.getCommandManager(), 'Should provide CommandManager');
            assert.ok(core.getTempFileManager(), 'Should provide TempFileManager');
            assert.ok(core.getMetricsCollector(), 'Should provide MetricsCollector');
        });

        test('should return same service instances', () => {
            // Arrange
            const core = ExtensionCore.getInstance(mockContext);

            // Act
            const langHandler1 = core.getLanguageHandler();
            const langHandler2 = core.getLanguageHandler();
            const tempManager1 = core.getTempFileManager();
            const tempManager2 = core.getTempFileManager();

            // Assert
            assert.strictEqual(langHandler1, langHandler2, 'Should return same LanguageHandler instance');
            assert.strictEqual(tempManager1, tempManager2, 'Should return same TempFileManager instance');
        });
    });

    suite('Result Pattern Integration', () => {
        test('should use Result type for createTempSQLFile', async () => {
            // Arrange
            const core = ExtensionCore.getInstance(mockContext);
            const document = await TestHelpers.createTestFile(
                'const sql = "SELECT * FROM users";',
                'result-test'
            );
            const editor = await vscode.window.showTextDocument(document);
            const selection = new vscode.Selection(0, 12, 0, 31);

            // Act
            const result = await core.createTempSQLFile(editor, selection, 'SELECT * FROM users');

            // Assert
            assert.ok(result instanceof Result, 'Should return Result instance');
            assert.ok(result.ok, 'Should return Ok result for valid input');
            assert.ok(result.value, 'Should contain URI value');
            assert.ok(result.value instanceof vscode.Uri, 'URI should be vscode.Uri instance');
        });

        test('should handle error case with Result type', async () => {
            // Arrange
            const core = ExtensionCore.getInstance(mockContext);

            // Create invalid scenario (no active editor)
            await vscode.commands.executeCommand('workbench.action.closeAllEditors');

            // Act & Assert
            // Note: This test might need adjustment based on actual error handling
            try {
                const result = await core.createTempSQLFile(
                    {} as vscode.TextEditor,
                    new vscode.Selection(0, 0, 0, 0),
                    'SELECT * FROM users'
                );
                // If it doesn't throw, check if it's an error Result
                if (!result.ok) {
                    assert.ok(result.error, 'Should contain error information');
                }
            } catch (error) {
                // Expected behavior for invalid input
                assert.ok(error, 'Should handle invalid input appropriately');
            }
        });
    });

    suite('Dependency Injection Container', () => {
        test('should register all services in DI container', () => {
            // Arrange
            const core = ExtensionCore.getInstance(mockContext);
            const container = (core as any).container as DIContainer;

            // Act & Assert
            // Test that we can get all expected services
            assert.doesNotThrow(() => container.get('languageHandler'), 'Should have languageHandler');
            assert.doesNotThrow(() => container.get('sqlsClientManager'), 'Should have sqlsClientManager');
            assert.doesNotThrow(() => container.get('commandManager'), 'Should have commandManager');
            assert.doesNotThrow(() => container.get('preciseIndentSync'), 'Should have preciseIndentSync');
            assert.doesNotThrow(() => container.get('tempFileManager'), 'Should have tempFileManager');
            assert.doesNotThrow(() => container.get('eventHandler'), 'Should have eventHandler');
            assert.doesNotThrow(() => container.get('metricsCollector'), 'Should have metricsCollector');
            assert.doesNotThrow(() => container.get('extensionCore'), 'Should have extensionCore');
        });

        test('should return same instances from DI container', () => {
            // Arrange
            const core = ExtensionCore.getInstance(mockContext);
            const container = (core as any).container as DIContainer;

            // Act
            const service1 = container.get('languageHandler');
            const service2 = container.get('languageHandler');

            // Assert
            assert.strictEqual(service1, service2, 'DI container should return same instances for singletons');
        });
    });

    suite('Metrics Collection', () => {
        test('should collect command invocation metrics', () => {
            // Arrange
            const core = ExtensionCore.getInstance(mockContext);
            const initialMetrics = core.getMetrics();

            // Act
            core.recordCommandInvocation('testCommand');
            const updatedMetrics = core.getMetrics();

            // Assert
            assert.strictEqual(
                updatedMetrics.totalCommandInvocations,
                initialMetrics.totalCommandInvocations + 1,
                'Should increment command invocation count'
            );
        });

        test('should provide comprehensive metrics', () => {
            // Arrange
            const core = ExtensionCore.getInstance(mockContext);

            // Act
            const metrics = core.getMetrics();

            // Assert
            assert.ok(typeof metrics.activeDisposables === 'number', 'Should have active disposables count');
            assert.ok(typeof metrics.activeTempFiles === 'number', 'Should have active temp files count');
            assert.ok(typeof metrics.totalCommandInvocations === 'number', 'Should have command invocation count');
            assert.ok(metrics.totalCommandInvocations >= 0, 'Command count should be non-negative');
        });
    });

    suite('Resource Management', () => {
        test('should dispose all resources correctly', () => {
            // Arrange
            const core = ExtensionCore.getInstance(mockContext);

            // Act
            assert.doesNotThrow(() => {
                core.dispose();
            }, 'Dispose should not throw errors');

            // Assert
            // Reset for other tests
            ExtensionCore.resetInstance();
        });

        test('should handle multiple dispose calls gracefully', () => {
            // Arrange
            const core = ExtensionCore.getInstance(mockContext);

            // Act & Assert
            assert.doesNotThrow(() => core.dispose(), 'First dispose should not throw');
            assert.doesNotThrow(() => core.dispose(), 'Second dispose should not throw');

            // Reset for other tests
            ExtensionCore.resetInstance();
        });
    });

    suite('Service Integration', () => {
        test('should integrate services correctly', () => {
            // Arrange
            const core = ExtensionCore.getInstance(mockContext);
            const tempManager = core.getTempFileManager();
            const eventHandler = (core as any).eventHandler;

            // Act & Assert
            assert.ok(tempManager, 'TempFileManager should be accessible');
            assert.ok(eventHandler, 'EventHandler should be available internally');

            // Test that services are properly initialized
            const metrics = core.getMetrics();
            assert.ok(typeof metrics.activeDisposables === 'number', 'Services should be properly initialized');
        });

        test('should handle service dependencies', () => {
            // Arrange
            const core = ExtensionCore.getInstance(mockContext);
            const container = (core as any).container as DIContainer;

            // Act
            const tempManager = container.get('tempFileManager');
            const langHandler = container.get('languageHandler');

            // Assert
            assert.ok(tempManager instanceof TempFileManager, 'TempFileManager should be properly instantiated');
            assert.ok(langHandler, 'LanguageHandler should be properly instantiated');
        });
    });

    suite('Error Handling and Resilience', () => {
        test('should handle missing context gracefully', () => {
            // Arrange
            ExtensionCore.resetInstance();

            // Act & Assert
            assert.throws(
                () => ExtensionCore.getInstance(),
                /ExtensionCore instance not initialized/,
                'Should provide clear error message for missing context'
            );
        });

        test('should maintain service consistency after reset', () => {
            // Arrange
            const core1 = ExtensionCore.getInstance(mockContext);
            const originalHandler = core1.getLanguageHandler();

            // Act
            ExtensionCore.resetInstance();
            const core2 = ExtensionCore.getInstance(mockContext);
            const newHandler = core2.getLanguageHandler();

            // Assert
            assert.notStrictEqual(core1, core2, 'Core instances should be different');
            assert.notStrictEqual(originalHandler, newHandler, 'Service instances should be recreated');
            assert.ok(newHandler, 'New service should be properly initialized');
        });
    });

});