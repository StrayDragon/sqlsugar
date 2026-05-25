```toon
kind: llman.sdd.delta
ops[4]{op,req_id,title,statement,from,to,name}:
  add_requirement,"R-ORM-008",工作区扫描,系统 MUST 在激活时扫描工作区发现 ORM model 文件并建立 schema 索引,null,null,null
  add_requirement,"R-ORM-009",增量更新,系统 MUST 监听文件变化增量更新 schema 索引而非全量重扫,null,null,null
  add_requirement,"R-ORM-010",多绑定风格,系统 MUST 统一处理 ?/$1/:name/%(name)s 等参数绑定风格,null,null,null
  add_requirement,"R-ORM-011",Schema 缓存,系统 MUST 将解析的 schema 缓存到工作区存储避免重复解析,null,null,null
op_scenarios[4]{req_id,id,given,when,then}:
  R-ORM-008,S001,项目包含 SQLAlchemy models.py,扩展激活,后台扫描完成后 schema 索引包含所有表定义
  R-ORM-009,S001,用户修改了 model 文件添加新列,文件保存触发 watcher,schema 索引增量更新包含新列
  R-ORM-010,S001,模板中混用 :name 和 %(name)s 占位符,系统处理模板,两种风格都被正确识别和替换
  R-ORM-011,S001,扩展重新激活且 model 文件未变化,系统加载缓存,schema 从缓存恢复无需重新解析
```
