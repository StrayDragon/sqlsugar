# SQLSugar 现代化重构计划

## 📋 概述

本文档详细描述了 SQLSugar VS Code 扩展的现代化重构计划，旨在提升代码质量、可维护性和开发效率。重构基于当前代码分析结果，采用现代 TypeScript 开发最佳实践。

## 🔍 当前状态分析

### 代码规模
- **源代码文件**: 9 个 TypeScript 文件
- **测试文件**: 8 个 TypeScript 文件
- **源代码行数**: ~7,130 行
- **测试代码行数**: ~2,638 行
- **测试覆盖率**: 约 37%

### 架构评估
✅ **优势**:
- 良好的分层架构 (Core/Handlers/Processors)
- 单例模式管理核心组件
- 适当的依赖注入和接口分离
- 全面的错误处理和资源管理

❌ **待改进**:
- ESLint 配置过于简单，缺少现代规则
- TypeScript 配置不够严格
- 代码复杂度较高，某些组件职责过重
- 测试框架需要现代化

## 🎯 重构目标

1. **代码质量提升 60%** - 通过现代 linting 规则
2. **类型安全性提升 80%** - 通过严格的 TypeScript 配置
3. **维护效率提升 40%** - 通过更好的代码组织
4. **测试覆盖率提升至 70%+** - 通过现代测试工具
5. **性能提升 30%** - 通过优化和缓存策略

## 🚀 重构计划

### 阶段 1: 开发工具现代化

#### 1.1 升级 ESLint 配置
**当前问题**: `eslint.config.mjs` 只有 7 条基本规则，严重过时

**解决方案**: 采用 `@antfu/eslint-config` 现代配置

```javascript
// eslint.config.mjs
import antfu from '@antfu/eslint-config'

export default antfu({
  typescript: {
    tsconfigPath: 'tsconfig.json',
  },
  stylistic: {
    indent: 2,
    quotes: 'single',
  },
  // 启用类型感知规则
  typescript: true,
})
```

#### 1.2 添加核心 TypeScript ESLint 规则
```javascript
// 推荐的现代规则集
const typeCheckedRules = {
  '@typescript-eslint/await-thenable': 'error',
  '@typescript-eslint/no-explicit-any': 'error',
  '@typescript-eslint/no-floating-promises': 'error',
  '@typescript-eslint/no-misused-promises': 'error',
  '@typescript-eslint/no-unsafe-assignment': 'error',
  '@typescript-eslint/no-unsafe-call': 'error',
  '@typescript-eslint/no-unsafe-member-access': 'error',
  '@typescript-eslint/no-unsafe-return': 'error',
  '@typescript-eslint/restrict-template-expressions': 'error',
  '@typescript-eslint/unbound-method': 'error',
}
```

#### 1.3 强化 TypeScript 配置
**更新 `tsconfig.json`**:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "noUncheckedIndexedAccess": true
  }
}
```

### 阶段 2: 核心架构重构

#### 2.1 分离大型组件
**目标**: 将 `extension-core.ts` (约 500+ 行) 拆分为更小的、职责单一的组件

**新的文件结构**:
```
src/core/
├── extension-core.ts          # 核心协调器 (保持轻量)
├── temp-file-manager.ts        # 临时文件管理
├── event-handler.ts           # 事件处理
├── metrics-collector.ts       # 指标收集
└── di-container.ts            # 依赖注入容器
```

#### 2.2 引入依赖注入容器
**新增 `core/di-container.ts`**:
```typescript
export class DIContainer {
  private services = new Map<string, any>();
  private singletons = new Map<string, any>();

  register<T>(key: string, factory: () => T): void {
    this.services.set(key, factory());
  }

  singleton<T>(key: string, factory: () => T): void {
    if (!this.singletons.has(key)) {
      this.singletons.set(key, factory());
    }
  }

  get<T>(key: string): T {
    return this.singletons.get(key) || this.services.get(key);
  }
}
```

#### 2.3 现代化错误处理
**引入 Result 类型模式**:
```typescript
// types/result.ts
interface Result<T, E = Error> {
  ok: boolean;
  value?: T;
  error?: E;
}

class ExtensionCore {
  async createTempSQLFile(
    editor: vscode.TextEditor,
    selection: vscode.Selection,
    quotedSQL: string
  ): Promise<Result<vscode.Uri>> {
    try {
      // 实现
      return { ok: true, value: uri };
    } catch (error) {
      return { ok: false, error };
    }
  }
}
```

### 阶段 3: 测试现代化

#### 3.1 升级测试框架
**从 Mocha 迁移到 Vitest**:
```json
{
  "scripts": {
    "test": "vitest",
    "test:coverage": "c8 vitest",
    "test:watch": "vitest watch",
    "test:ui": "vitest --ui"
  },
  "devDependencies": {
    "vitest": "^1.0.0",
    "c8": "^8.0.0",
    "@vitest/ui": "^1.0.0",
    "@testing-library/vscode": "^1.0.0"
  }
}
```

#### 3.2 现代化测试写法
```typescript
// 使用 vitest 和 testing-library
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExtensionCore } from '../../core/extension-core';

describe('ExtensionCore', () => {
  let extensionCore: ExtensionCore;

  beforeEach(() => {
    // 测试设置
    vi.clearAllMocks();
  });

  it('should create temp file successfully', async () => {
    const result = await extensionCore.createTempSQLFile(
      mockEditor,
      mockSelection,
      mockQuotedSQL
    );

    expect(result.ok).toBe(true);
    expect(result.value).toBeDefined();
  });

  it('should handle errors gracefully', async () => {
    // 模拟错误场景
    vi.spyOn(fs.promises, 'writeFile').mockRejectedValue(new Error('Write failed'));

    const result = await extensionCore.createTempSQLFile(
      mockEditor,
      mockSelection,
      mockQuotedSQL
    );

    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
  });
});
```

#### 3.3 提升测试覆盖率
**目标**: 从 37% 提升到 70%+

**策略**:
- 为所有核心组件添加单元测试
- 添加集成测试覆盖主要工作流
- 使用 Mock 和 Stub 隔离外部依赖
- 添加端到端测试验证用户场景

### 阶段 4: 性能优化

#### 4.1 代码分割和懒加载
```typescript
// 动态导入大型模块
class ExtensionCore {
  private jinja2Processor: Promise<Jinja2NunjucksProcessor> | null = null;

  async getJinja2Processor(): Promise<Jinja2NunjucksProcessor> {
    if (!this.jinja2Processor) {
      this.jinja2Processor = import('./jinja2-nunjucks-processor')
        .then(module => module.Jinja2NunjucksProcessor.getInstance());
    }
    return this.jinja2Processor;
  }
}
```

#### 4.2 缓存策略优化
```typescript
// 新增 utils/cache-manager.ts
class CacheManager {
  private cache = new Map<string, { value: any; ttl: number }>();

  set<T>(key: string, value: T, ttlMs: number = 30000): void {
    this.cache.set(key, {
      value,
      ttl: Date.now() + ttlMs
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item || Date.now() > item.ttl) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }

  clear(): void {
    this.cache.clear();
  }
}
```

#### 4.3 内存管理优化
```typescript
// 改进资源清理
class ExtensionCore implements vscode.Disposable {
  private disposables: vscode.Disposable[] = [];
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // 定期清理过期资源
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredResources();
    }, 5 * 60 * 1000); // 每5分钟清理一次

    this.disposables.push(
      new vscode.Disposable(() => {
        clearInterval(this.cleanupInterval);
      })
    );
  }

  dispose(): void {
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
  }
}
```

### 阶段 5: 代码质量提升

#### 5.1 引入代码度量工具
```json
{
  "devDependencies": {
    "sonarjs": "^1.0.0",
    "typescript-eslint": "^6.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0"
  }
}
```

#### 5.2 复杂度控制
**目标**: 保持函数圈复杂度 < 10，文件行数 < 300

**策略**:
- 使用 `eslint-plugin-complexity` 监控复杂度
- 定期代码审查和重构
- 自动化代码质量检查

#### 5.3 文档和类型定义
**改进 API 文档**:
```typescript
/**
 * 创建临时SQL文件进行编辑
 *
 * @param editor - 当前活动的文本编辑器
 * @param selection - 用户选择的文本范围
 * @param quotedSQL - 带引号的SQL字符串
 * @returns Promise<Result<vscodeUri>> 包含创建结果或错误信息
 *
 * @example
 * ```typescript
 * const result = await extensionCore.createTempSQLFile(
 *   vscode.window.activeTextEditor!,
 *   new vscode.Selection(0, 0, 0, 20),
 *   '"SELECT * FROM users"'
 * );
 *
 * if (result.ok) {
 *   console.log('Temp file created:', result.value);
 * }
 * ```
 */
async createTempSQLFile(
  editor: vscode.TextEditor,
  selection: vscode.Selection,
  quotedSQL: string
): Promise<Result<vscode.Uri>> {
  // 实现
}
```

## 📊 验收标准

### 代码质量指标
- [ ] ESLint 错误数量: 0
- [ ] TypeScript 错误数量: 0
- [ ] 代码覆盖率: ≥ 70%
- [ ] 圈复杂度平均: < 8
- [ ] 最大文件行数: < 300

### 性能指标
- [ ] 扩展启动时间: < 100ms
- [ ] 命令响应时间: < 50ms
- [ ] 内存使用量: < 50MB
- [ ] 文件操作延迟: < 10ms

### 用户体验指标
- [ ] 功能完整性: 100%
- [ ] 错误处理覆盖率: 100%
- [ ] 向后兼容性: 100%
- [ ] 文档完整性: 100%

## 🔧 实施建议

### 开发流程
1. **分支策略**: 使用功能分支进行重构
2. **代码审查**: 所有重构代码需要团队审查
3. **渐进式重构**: 分阶段实施，避免大规模重写
4. **测试驱动**: 重构前先编写测试，确保功能不变

### 风险控制
1. **向后兼容**: 保持现有 API 接口不变
2. **数据安全**: 确保用户数据不丢失
3. **性能监控**: 重构过程中持续监控性能指标
4. **回滚机制**: 准备快速回滚方案

### 工具推荐
- **代码质量**: SonarQube, CodeClimate
- **性能分析**: VS Code Performance Inspector
- **测试覆盖**: Istanbul, c8
- **文档生成**: TypeDoc, Swagger

## 📝 总结

本重构计划通过系统性的现代化改造，将显著提升 SQLSugar 扩展的代码质量、可维护性和性能。采用渐进式重构策略，确保在提升代码质量的同时，保持功能的稳定性和向后兼容性。

重构完成后，SQLSugar 将成为一个更加健壮、高效和易维护的 VS Code 扩展，为用户提供更好的 SQL 编辑体验。