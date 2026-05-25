```toon
kind: llman.sdd.delta
ops[2]{op,req_id,title,statement,from,to,name}:
  add_requirement,"R-ISE-009",实时双向同步,系统 SHALL 支持临时文件与源文件的实时双向编辑同步(不仅限于保存时),null,null,null
  add_requirement,"R-ISE-010",多语言扩展,系统 MUST 通过 LanguageProvider 接口支持 Go/Rust/Java/Ruby 等新语言,null,null,null
op_scenarios[2]{req_id,id,given,when,then}:
  R-ISE-009,S001,用户在临时 SQL 文件中输入字符,源文件同步更新,用户可见实时变化无需手动保存
  R-ISE-010,S001,Go LanguageProvider 已注册,用户在 Go 文件中选中 SQL 字符串,获得与 Python 相同的临时文件编辑体验
```
