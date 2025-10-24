/**
 * 简化的依赖注入容器
 * 提供基本的服务注册和获取功能
 */
export class DIContainer {
  private static instance: DIContainer | undefined;
  private services = new Map<string, unknown>();

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}

  /**
   * 获取容器单例实例
   */
  public static getInstance(): DIContainer {
    if (!DIContainer.instance) {
      DIContainer.instance = new DIContainer();
    }
    return DIContainer.instance;
  }

  /**
   * 注册服务实例
   */
  public register<T>(key: string, instance: T): void {
    this.services.set(key, instance);
  }

  /**
   * 获取服务实例
   */
  public get<T>(key: string): T {
    const service = this.services.get(key);
    if (!service) {
      throw new Error(`Service '${key}' not registered`);
    }
    return service as T;
  }

  /**
   * 检查服务是否已注册
   */
  public has(key: string): boolean {
    return this.services.has(key);
  }

  /**
   * 清理所有服务
   */
  public clear(): void {
    this.services.clear();
  }

  /**
   * 重置容器实例(用于测试)
   */
  public static resetInstance(): void {
    if (DIContainer.instance) {
      DIContainer.instance.clear();
      DIContainer.instance = undefined;
    }
  }
}

/**
 * 获取容器实例的便捷函数
 */
export function getContainer(): DIContainer {
  return DIContainer.getInstance();
}
