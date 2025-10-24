# 内联 SQL 编辑功能

## 概述

支持在专用 SQL 文件中编辑嵌入在代码（Python、JavaScript、TypeScript 等）中的 SQL 字符串，并自动同步回源文件。

## 组件

- **command-handler.ts**：实现 `sqlsugar.editInlineSQL` 命令
- **temp-file-manager.ts**：创建和管理临时 SQL 文件
- **language-handler.ts**：检测编程语言并处理引号类型
- **indent-sync.ts**：维护源文件和临时文件之间的精确缩进

## 工作流程

1. 用户在代码中选择 SQL 字符串
2. 命令提取 SQL，移除引号
3. 在 `.vscode/sqlsugar/temp/` 中创建临时 `.sql` 文件
4. 在并排编辑器中打开临时文件
5. 保存时，将更改同步回原始文件
6. 保留缩进和引号样式

## 支持的语言

- Python（单引号、双引号、三引号、f-strings）
- JavaScript/TypeScript（单引号、双引号、模板字面量）
- 通用（基本引号处理）

## 关键特性

- **智能引号检测**：自动检测并保留引号样式
- **精确缩进**：维护原始代码的精确缩进
- **SQL 验证**：如果选中文本不像 SQL 则发出警告
- **自动清理**：编辑器关闭时移除临时文件

