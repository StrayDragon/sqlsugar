```toon
kind: llman.sdd.delta
ops[3]{op,req_id,title,statement,from,to,name}:
  add_requirement,"R-AI-008",VS Code LM API,系统 MUST 优先集成 VS Code Language Model API 作为默认 AI 后端,null,null,null
  add_requirement,"R-AI-009",上下文注入,系统 MUST 在 AI 请求中自动注入可用的 schema/表结构上下文,null,null,null
  add_requirement,"R-AI-010",多轮对话,系统 SHALL 支持 AI 交互的多轮对话保持上下文连续性,null,null,null
op_scenarios[3]{req_id,id,given,when,then}:
  R-AI-008,S001,用户安装了支持 LM API 的 VS Code 版本,用户使用 AI 功能,通过 VS Code LM API 调用无需额外配置
  R-AI-009,S001,数据库已连接且 schema 已加载,用户输入自然语言查询,AI 请求自动包含相关表结构信息
  R-AI-010,S001,用户已生成一条 SQL,用户说'加个分页',AI 在原 SQL 基础上添加 LIMIT/OFFSET
```
