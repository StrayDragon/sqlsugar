```toon
kind: llman.sdd.delta
ops[2]{op,req_id,title,statement,from,to,name}:
  add_requirement,"R-J2E-016",模板浏览器,系统 MUST 在可视化编辑器中提供模板库浏览和插入功能,null,null,null
  add_requirement,"R-J2E-017",参数类型扩展,系统 MUST 在可视化编辑器中支持 array/enum/optional 等复合参数类型的交互式输入,null,null,null
op_scenarios[2]{req_id,id,given,when,then}:
  R-J2E-016,S001,用户点击编辑器中的模板库按钮,系统展示模板列表,用户选择模板后插入到当前编辑区域
  R-J2E-017,S001,模板参数定义为 enum 类型(排序方向),可视化编辑器渲染参数,展示下拉选择而非普通文本输入框
```
