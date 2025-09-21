<div align="center">
  <img src="./icon.png" alt="SQLSugar Icon" width="128" height="128" />

  <h1>SQLSugar</h1>

  <p>
    <a href="https://github.com/straydragon/sqlsugar/actions/workflows/test.yml">
      <img src="https://github.com/straydragon/sqlsugar/actions/workflows/test.yml/badge.svg" alt="Test" />
    </a>
    <a href="https://github.com/straydragon/sqlsugar/actions/workflows/release.yml">
      <img src="https://github.com/straydragon/sqlsugar/actions/workflows/release.yml/badge.svg" alt="Release" />
    </a>
    <a href="https://open-vsx.org/extension/l8ng/sqlsugar"><img src="https://img.shields.io/open-vsx/v/l8ng/sqlsugar?label=Open%20VSX" alt="Open VSX" /></a>
    <!-- <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT" /></a>
    <a href="https://marketplace.visualstudio.com/items?itemName=localsqlsugar.sqlsugar"><img src="https://img.shields.io/visual-studio-marketplace/v/localsqlsugar.sqlsugar?label=VS%20Code%20Marketplace" alt="VS Code Marketplace" /></a>
    <a href="https://marketplace.visualstudio.com/items?itemName=localsqlsugar.sqlsugar"><img src="https://img.shields.io/visual-studio-marketplace/d/localsqlsugar.sqlsugar" alt="VS Code Marketplace Downloads" /></a>
    <a href="https://marketplace.visualstudio.com/items?itemName=localsqlsugar.sqlsugar"><img src="https://img.shields.io/visual-studio-marketplace/i/localsqlsugar.sqlsugar" alt="VS Code Marketplace Installs" /></a> -->
  </p>
</div>

这是一个VSCode插件, 提供了一些额外处理在代码中内嵌 SQL 字符串的功能:

- 同步编辑内联SQL (`SQLSugar: Edit Inline SQL`) : 编辑区选中文本右键菜单选择触发
  - 在编辑器中选中 SQL 字符串，右键或命令面板执行“Edit Inline SQL”，在侧边打开临时 .sql 文件进行专注编辑。
  - 集成 [sqls-server/sqls: SQL language server written in Go.](https://github.com/sqls-server/sqls)，配置后可以提供补全与悬停信息
  - ORM 风格占位符支持：临时把 `:name` 转换为可编辑的字符串字面量，保存时还原为 `:name`，避免误把时间如 `12:34` 或 Postgres `::type` 当作占位符。
  - 临时文件自动清理：支持保存时或关闭编辑器时删除临时文件(可选)。

- 编辑 `Jinja2 SQL` 内嵌字符串模板 (`SQLSugar: Copy Jinja2 Template (Visual Editor)`) : 编辑区选中文本右键菜单选择触发
  - 识别并解析Jinja2模板, 并自动获取推断字段默认值, 用户可以在UI中自由配置字段值和类型, 模板实时渲染, 方便复制并使用渲染后的SQL

# 插件设置

请参考安装后插件页面中的设置项目, 或者在 设置UI(`Settings (UI)`) 中 搜索输入 `@ext:l8ng.sqlsugar`

# QA

## Q: 是否提供格式化?
扩展不内置 SQL 格式化与 lint, 建议配合 SQLFluff 等扩展使用（本仓库附带 `.sqlfluff` 示例）。

