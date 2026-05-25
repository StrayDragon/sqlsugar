```toon
kind: llman.sdd.delta
ops[3]{op,req_id,title,statement,from,to,name}:
  add_requirement,"R-TPL-008",方言适配,系统 MUST 支持同一模板的多方言变体(PostgreSQL/MySQL/SQLite 版本),null,null,null
  add_requirement,"R-TPL-009",模板继承,系统 SHALL 支持模板继承和组合(base + override 模式),null,null,null
  add_requirement,"R-TPL-010",CLI 验证,系统 SHALL 提供 CLI 命令用于 CI/CD 中验证模板语法和 fixture,null,null,null
op_scenarios[3]{req_id,id,given,when,then}:
  R-TPL-008,S001,模板定义了 PostgreSQL 和 MySQL 两个变体,用户当前方言为 MySQL,自动使用 MySQL 变体渲染
  R-TPL-009,S001,base 模板定义了通用 SELECT 结构,子模板覆盖 WHERE 条件,渲染结果合并 base 结构和自定义条件
  R-TPL-010,S001,CI 流程调用 sqlsugar validate-templates,模板有语法错误,命令返回非零退出码并报告错误位置
```
