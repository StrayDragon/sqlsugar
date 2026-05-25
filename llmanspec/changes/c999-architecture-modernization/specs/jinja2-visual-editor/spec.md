```toon
kind: llman.sdd.delta
ops[2]{op,req_id,title,statement,from,to,name}:
  add_requirement,"R-J2E-018",Monaco 集成,系统 SHALL 在可视化编辑器中使用 Monaco Editor 替代纯文本实现 SQL 编辑,null,null,null
  add_requirement,"R-J2E-019",多面板布局,系统 SHALL 支持可拖拽调整大小的多面板布局(模板/变量/预览),null,null,null
op_scenarios[2]{req_id,id,given,when,then}:
  R-J2E-018,S001,用户在可视化编辑器的模板区域编辑,系统使用 Monaco Editor 渲染,获得语法高亮和基础补全能力
  R-J2E-019,S001,用户拖拽面板分隔线,系统调整面板大小,布局实时响应且面板内容正确渲染
```
