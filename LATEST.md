## 🚧 进行中：奇怪占位符值问题调试 (2025-10-17)

**问题**: V2编辑器在自动渲染时出现奇怪的占位符值，如 `42VAR002`、数字追加等异常

**状态**: 🔄 IN PROGRESS - 调试中 (已部署增强追踪系统)

### 🎯 问题描述

用户报告V2编辑器在变量修改后，右侧SQL预览区域出现异常的占位符值：

1. **数字追加模式**:
   - `"demo_use_where_clause"` → `"demo_use_where_clause1"`
   - `42` → `422` (追加数字 `2`)
   - `42` → `412` (追加数字 `1`)

2. **可疑占位符**:
   - 类似 `42VAR002` 的奇怪模式
   - 在自动渲染过程中意外出现

### 🔍 已完成的分析和修复

#### 1. **UI日志清理** ✅
- 移除了错误的UI状态日志导出功能
- 更正按钮文本为"📋 变量日志"
- 清理了无用的调试代码

#### 2. **变量变化追踪系统** ✅
- 实现了完整的变量变化context追踪
- 记录每次变量变化的old/new value、完整context、template内容
- 添加before/after render阶段的详细日志
- 支持导出包含所有追踪信息的日志文件

#### 3. **右边面板HTML追踪** ✅
- 新增右边SQL预览区域HTML内容捕获
- 每次变量变化时记录HTML状态
- 自动检测HTML中的占位符模式 (`VAR_*`, `*VAR*`, `42VAR*`)
- 检测到可疑占位符时发送实时警报

#### 4. **增强调试系统** ✅
- 详细记录变量替换过程
- 追踪 `formatValue()` 方法执行
- 检测可疑的数字插入模式
- 记录替换是否成功

### 📊 当前发现

#### **确认的异常模式**:
```javascript
// 字符串变量数字追加
"use_where_clause": "demo_use_where_clause" → "demo_use_where_clause1"

// 数字变量数字追加
"product_line_id": 42 → 422
"department_id": 42 → 412
```

#### **可能的问题根源**:
1. **变量值存储/更新机制**: 可能存在值拼接而不是替换
2. **V1处理器交互**: V1处理器可能返回了带有索引的变量名
3. **默认值生成逻辑**: `generateDefaultValue()` 可能在某些情况下生成带数字的值
4. **变量替换逻辑**: `simulateTemplateRendering()` 中的替换过程可能有误

### 🚀 已部署的调试增强

#### **新增追踪功能**:
1. **详细变量替换日志**:
   ```
   [V2_EDITOR_VARIABLE_REPLACE_DETAILS] Key: use_where_clause, Original value: "demo_use_where_clause", Formatted: 'demo_use_where_clause'
   [V2_EDITOR_VARIABLE_REPLACE_DETAILS] Matches found: ["{{ use_where_clause }}"]
   ```

2. **formatValue过程追踪**:
   ```
   [V2_EDITOR_FORMAT_VALUE] Input: "demo_use_where_clause1" (string), Output: 'demo_use_where_clause1'
   [V2_EDITOR_SUSPICIOUS_FORMATTING] Suspicious formatting detected: "demo_use_where_clause" -> 'demo_use_where_clause1'
   ```

3. **右边面板HTML捕获**:
   ```
   [V2_EDITOR_RIGHT_PANEL_HTML] Right panel HTML captured: 2014 characters
   [V2_EDITOR_PLACEHOLDER_IN_HTML] Found placeholder pattern in right panel HTML!
   ```

### 📋 下一步计划

#### **待测试项目**:
1. **增强版调试测试**: 使用新版本触发变量变化，收集详细的替换过程日志
2. **V1处理器分析**: 检查V1处理器返回的变量数据和格式
3. **变量存储机制检查**: 验证 `this.variableValues` 的更新逻辑
4. **模板渲染流程分析**: 确认数字追加发生的具体环节

#### **待解决问题**:
1. **定位数字追加的确切根源**: 是存储、格式化还是替换环节？
2. **确认是否V1处理器相关**: V1处理器是否返回了异常数据？
3. **修复数字插入bug**: 找到具体代码位置并修复
4. **完善占位符检测**: 覆盖更多异常模式

### 🔧 技术实现

#### **核心修改文件**:
- `/src/jinja2-editor-v2/components/jinja2-editor-v2.ts`:
  - 新增 `variableChangeLogs` 数组追踪所有变化
  - 增强 `recordVariableChange()` 方法
  - 新增 `captureRightPanelHTML()` 方法
  - 增强 `simulateTemplateRendering()` 和 `formatValue()` 调试

#### **日志导出功能**:
- 按钮: "📋 变量日志"
- 格式: 包含完整变量变化历史和右边面板HTML
- 用途: 离线分析占位符问题的根本原因

### 📝 使用说明

#### **测试步骤**:
1. 安装最新版本 `sqlsugar.vsix`
2. 打开V2编辑器并修改变量
3. 观察VS Code OUTPUT频道中的详细日志
4. 如果再次出现异常值，点击"📋 变量日志"导出完整分析数据

#### **关键日志标识**:
- `[V2_EDITOR_VARIABLE_CHANGE]`: 基础变量变化
- `[V2_EDITOR_RIGHT_PANEL_HTML]`: 右边面板HTML状态
- `[V2_EDITOR_VARIABLE_REPLACE_DETAILS]`: 详细替换过程
- `[V2_EDITOR_FORMAT_VALUE]`: 值格式化过程
- `[V2_EDITOR_PLACEHOLDER_IN_HTML]`: 发现占位符警报

### 📄 相关日志文件

- `SQLSugar.log`: 初始变量变化追踪日志
- `SQLSugar2.log`: HTML追踪功能测试日志
- 后续测试将生成包含详细替换过程的新日志

---

**状态**: 🔄 等待用户测试增强版调试系统，收集更详细的错误信息以定位问题根源。

**下次开发**: 基于增强调试日志分析，定位数字追加问题的确切代码位置并实施修复。