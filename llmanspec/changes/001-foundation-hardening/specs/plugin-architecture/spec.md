```toon
kind: llman.sdd.delta
ops[2]{op,req_id,title,statement,from,to,name}:
  add_requirement,"R-PLG-009",渐进式迁移,系统 MUST 支持从现有 DI 容器平滑迁移到 Provider 注册模式,null,null,null
  add_requirement,"R-PLG-010",基础 Provider 类型,系统 MUST 在此阶段实现 LanguageProvider 和 InferenceProvider 基础接口,null,null,null
op_scenarios[2]{req_id,id,given,when,then}:
  R-PLG-009,S001,现有 DIContainer 注册了服务,引入 ProviderRegistry,原有服务通过适配器继续工作
  R-PLG-010,S001,LanguageProvider 接口已定义,现有 LanguageHandler 实现适配器,Python/JS/TS 语言支持不受影响
```
