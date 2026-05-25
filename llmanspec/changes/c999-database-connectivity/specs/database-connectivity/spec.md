```toon
kind: llman.sdd.delta
ops[4]{op,req_id,title,statement,from,to,name}:
  add_requirement,"R-DBC-009",执行计划可视化,系统 SHALL 可视化 EXPLAIN 输出帮助用户理解查询性能,null,null,null
  add_requirement,"R-DBC-010",连接池管理,系统 MUST 实现连接池限制并发连接数避免资源泄漏,null,null,null
  add_requirement,"R-DBC-011",多连接管理,系统 MUST 支持配置和切换多个数据库连接,null,null,null
  add_requirement,"R-DBC-012",Jinja2 集成执行,系统 MUST 允许从 Jinja2 编辑器直接执行渲染后的 SQL,null,null,null
op_scenarios[4]{req_id,id,given,when,then}:
  R-DBC-009,S001,用户执行了 SELECT 查询,用户点击查看执行计划,EXPLAIN 结果以树形或表格可视化展示
  R-DBC-010,S001,连接池已满(达到配置上限),新查询请求到来,系统排队等待或提示用户当前连接繁忙
  R-DBC-011,S001,用户配置了开发和生产两个连接,用户切换到生产连接,后续查询走生产数据库且状态栏更新指示
  R-DBC-012,S001,用户在 Jinja2 编辑器中完成变量填充,用户点击执行按钮,渲染后的 SQL 发送到当前活动数据库连接执行
```
