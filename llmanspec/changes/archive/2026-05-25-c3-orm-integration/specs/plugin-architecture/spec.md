```toon
kind: llman.sdd.delta
ops[2]{op,req_id,title,statement,from,to,name}:
  add_requirement,"R-PLG-013",内置 ORM Provider,系统 MUST 内置 SQLAlchemy 和 Django 两个 ORMProvider 实现,null,null,null
  add_requirement,"R-PLG-014",ORM 发现服务,系统 MUST 提供 ORMDiscoveryService 统一管理多个 ORMProvider 的扫描结果,null,null,null
op_scenarios[2]{req_id,id,given,when,then}:
  R-PLG-013,S001,项目同时包含 SQLAlchemy 和 Django model,扩展激活扫描工作区,两个 Provider 分别识别各自的 model 并合并到统一 schema
  R-PLG-014,S001,多个 ORMProvider 返回同名表的 schema,ORMDiscoveryService 合并结果,优先使用有更多列信息的 Provider 结果
```
