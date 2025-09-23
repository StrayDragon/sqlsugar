/**
 * 开发指标接口
 */
export interface DevMetrics {
  activeDisposables: number;
  activeTempFiles: number;
  totalCommandInvocations: number;
  commandUsageMap: Map<string, number>;
  performanceMetrics: {
    avgResponseTime: number;
    totalOperations: number;
    errorCount: number;
  };
}

/**
 * 开发指标收集器
 * 负责收集和追踪扩展的各种性能和使用指标
 */
export class MetricsCollector {
  private metrics: DevMetrics;

  /**
   * 记录命令调用
   */
  public recordCommandInvocation(command: string): void {
    this.metrics.totalCommandInvocations++;

    const currentCount = this.metrics.commandUsageMap.get(command) || 0;
    this.metrics.commandUsageMap.set(command, currentCount + 1);
  }

  /**
   * 更新活跃disposables数量
   */
  public updateActiveDisposables(count: number): void {
    this.metrics.activeDisposables = count;
  }

  /**
   * 更新活跃临时文件数量
   */
  public updateActiveTempFiles(count: number): void {
    this.metrics.activeTempFiles = count;
  }

  /**
   * 记录性能指标
   */
  public recordPerformance(operationTime: number, hadError: boolean = false): void {
    const perf = this.metrics.performanceMetrics;

    // 计算新的平均响应时间
    perf.totalOperations++;
    perf.avgResponseTime =
      (perf.avgResponseTime * (perf.totalOperations - 1) + operationTime) / perf.totalOperations;

    if (hadError) {
      perf.errorCount++;
    }
  }

  /**
   * 获取当前指标
   */
  public getMetrics(): DevMetrics {
    return { ...this.metrics };
  }

  /**
   * 获取命令使用统计
   */
  public getCommandUsageStats(): Array<{ command: string; count: number }> {
    return Array.from(this.metrics.commandUsageMap.entries())
      .map(([command, count]) => ({ command, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * 获取性能报告
   */
  public getPerformanceReport(): {
    avgResponseTime: number;
    totalOperations: number;
    errorRate: number;
    successRate: number;
  } {
    const perf = this.metrics.performanceMetrics;
    const errorRate = perf.totalOperations > 0 ? (perf.errorCount / perf.totalOperations) * 100 : 0;
    const successRate = 100 - errorRate;

    return {
      avgResponseTime: perf.avgResponseTime,
      totalOperations: perf.totalOperations,
      errorRate,
      successRate,
    };
  }

  /**
   * 重置指标（用于测试环境）
   */
  public reset(): void {
    this.metrics = {
      activeDisposables: 0,
      activeTempFiles: 0,
      totalCommandInvocations: 0,
      commandUsageMap: new Map(),
      performanceMetrics: {
        avgResponseTime: 0,
        totalOperations: 0,
        errorCount: 0,
      },
    };
  }

  /**
   * 导出指标为JSON
   */
  public exportMetrics(): string {
    return JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        metrics: this.metrics,
        performanceReport: this.getPerformanceReport(),
        commandUsageStats: this.getCommandUsageStats(),
      },
      null,
      2
    );
  }
}
