```toon
kind: llman.sdd.delta
ops[2]{op,req_id,title,statement,from,to,name}:
  add_requirement,"R-SQL-011",Schema 补全,系统 MUST 利用数据库连接的 schema 信息提供表名/列名补全,null,null,null
  add_requirement,"R-SQL-012",活表验证,系统 SHALL 验证 SQL 引用的表和列在已连接数据库中实际存在,null,null,null
op_scenarios[2]{req_id,id,given,when,then}:
  R-SQL-011,S001,用户已连接数据库且 schema 已加载,用户在 SQL 中输入 FROM 后空格,展示可用表名补全列表
  R-SQL-012,S001,SQL 引用了不存在的列名,系统验证 SQL,标记警告提示列名可能不存在
```
