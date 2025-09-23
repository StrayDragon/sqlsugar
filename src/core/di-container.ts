import * as vscode from 'vscode';

/**
 * Dependency Injection Container for managing singleton and transient services
 * Provides clean dependency management and service lifecycle control
 */
export class DIContainer {
  private static instance: DIContainer | undefined;
  private services = new Map<string, { factory: () => any; instance: any; type: 'singleton' | 'transient' }>();
  private disposables: vscode.Disposable[] = [];

  private constructor() {}

  /**
   * Get the singleton instance of DIContainer
   */
  public static getInstance(): DIContainer {
    if (!DIContainer.instance) {
      DIContainer.instance = new DIContainer();
    }
    return DIContainer.instance;
  }

  /**
   * Register a singleton service (created once and reused)
   */
  public registerSingleton<T>(key: string, factory: () => T): void {
    this.services.set(key, {
      factory,
      instance: undefined,
      type: 'singleton'
    });
  }

  /**
   * Register a transient service (created each time it's requested)
   */
  public registerTransient<T>(key: string, factory: () => T): void {
    this.services.set(key, {
      factory,
      instance: undefined,
      type: 'transient'
    });
  }

  /**
   * Register a service with VS Code context (singleton with context support)
   */
  public registerWithContext<T>(key: string, factory: (context: vscode.ExtensionContext) => T): void {
    this.services.set(key, {
      factory: () => {
        throw new Error(`Service ${key} requires context. Use getWithContext() instead.`);
      },
      instance: undefined,
      type: 'singleton'
    });
  }

  /**
   * Get a service instance
   */
  public get<T>(key: string): T {
    const service = this.services.get(key);
    if (!service) {
      throw new Error(`Service '${key}' not registered`);
    }

    if (service.type === 'singleton') {
      if (!service.instance) {
        service.instance = service.factory();
      }
      return service.instance;
    } else {
      // Transient service - create new instance each time
      return service.factory();
    }
  }

  /**
   * Get a service that requires VS Code context
   */
  public getWithContext<T>(key: string, context: vscode.ExtensionContext): T {
    const service = this.services.get(key);
    if (!service) {
      throw new Error(`Service '${key}' not registered`);
    }

    if (service.type === 'singleton' && service.instance) {
      return service.instance;
    }

    // For services requiring context, we need to handle them specially
    const contextAwareFactory = service.factory as any;
    if (typeof contextAwareFactory === 'function' && contextAwareFactory.length > 0) {
      const instance = contextAwareFactory(context);
      if (service.type === 'singleton') {
        service.instance = instance;
      }
      return instance;
    }

    return service.factory();
  }

  /**
   * Check if a service is registered
   */
  public has(key: string): boolean {
    return this.services.has(key);
  }

  /**
   * Remove a service and dispose it if it has a dispose method
   */
  public remove(key: string): void {
    const service = this.services.get(key);
    if (service && service.instance) {
      if (typeof service.instance.dispose === 'function') {
        try {
          service.instance.dispose();
        } catch (error) {
          console.error(`Error disposing service ${key}:`, error);
        }
      }
      this.services.delete(key);
    }
  }

  /**
   * Clear all services and dispose them properly
   */
  public clear(): void {
    this.services.forEach((service, key) => {
      if (service.instance && typeof service.instance.dispose === 'function') {
        try {
          service.instance.dispose();
        } catch (error) {
          console.error(`Error disposing service ${key}:`, error);
        }
      }
    });
    this.services.clear();
  }

  /**
   * Get all registered service keys
   */
  public getRegisteredKeys(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Register a disposable that will be cleaned up when the container is disposed
   */
  public registerDisposable(disposable: vscode.Disposable): void {
    this.disposables.push(disposable);
  }

  /**
   * Dispose the container and all services
   */
  public dispose(): void {
    this.clear();
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
  }
}

/**
 * Utility function to get the DI container instance
 */
export function getContainer(): DIContainer {
  return DIContainer.getInstance();
}

/**
 * Decorator for injecting dependencies
 */
export function inject(key: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const container = getContainer();
      const dependency = container.get(key);
      return originalMethod.apply(this, [dependency, ...args]);
    };

    return descriptor;
  };
}

/**
 * Decorator for injecting services that require context
 */
export function injectWithContext(key: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (context: vscode.ExtensionContext, ...args: any[]) {
      const container = getContainer();
      const dependency = container.getWithContext(key, context);
      return originalMethod.apply(this, [dependency, ...args]);
    };

    return descriptor;
  };
}