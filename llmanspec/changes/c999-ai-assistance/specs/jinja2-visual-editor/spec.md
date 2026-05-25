```toon
kind: llman.sdd.delta
ops[2]{op,req_id,title,statement,from,to,name}:
  add_requirement,"R-J2E-014",AI 辅助输入,系统 SHALL 在可视化编辑器中提供自然语言输入框支持 AI 生成模板,null,null,null
  add_requirement,"R-J2E-015",AI 推断增强,系统 MUST 支持通过 AI 分析代码上下文增强变量类型推断准确度,null,null,null
op_scenarios[2]{req_id,id,given,when,then}:
  R-J2E-014,S001,用户在可视化编辑器中点击 AI 辅助按钮,用户输入业务描述,AI 生成 Jinja2 模板并填充到编辑器
  R-J2E-015,S001,变量名称模式推断为 string 但代码上下文显示为 Integer 类型,AI 推断介入,类型被修正为 number
```
