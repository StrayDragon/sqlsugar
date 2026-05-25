```toon
kind: llman.sdd.delta
ops[2]{op,req_id,title,statement,from,to,name}:
  add_requirement,"R-PLG-015",内置 Database Provider,系统 MUST 内置 PostgreSQL/MySQL/SQLite 三个 DatabaseProvider 实现,null,null,null
  add_requirement,"R-PLG-016",连接生命周期,系统 MUST 定义 DatabaseProvider 的连接建立/测试/关闭/池化生命周期接口,null,null,null
op_scenarios[2]{req_id,id,given,when,then}:
  R-PLG-015,S001,用户选择 PostgreSQL 连接类型,系统加载 pg DatabaseProvider,连接成功建立并可执行查询
  R-PLG-016,S001,扩展停用(deactivate),系统触发所有 Provider 关闭连接,连接池中所有连接正确释放
```
