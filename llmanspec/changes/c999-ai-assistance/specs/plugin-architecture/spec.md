```toon
kind: llman.sdd.delta
ops[2]{op,req_id,title,statement,from,to,name}:
  add_requirement,"R-PLG-017",内置 AI Provider,系统 MUST 内置 VS Code LM API Provider 实现作为默认选项,null,null,null
  add_requirement,"R-PLG-018",Ollama Provider,系统 SHALL 内置 Ollama Provider 实现支持本地模型,null,null,null
op_scenarios[2]{req_id,id,given,when,then}:
  R-PLG-017,S001,VS Code 环境支持 LM API,AI 功能被调用,通过 LM API Provider 处理请求
  R-PLG-018,S001,用户配置了 Ollama 端点地址,用户使用 AI 功能,请求发送到本地 Ollama 服务
```
