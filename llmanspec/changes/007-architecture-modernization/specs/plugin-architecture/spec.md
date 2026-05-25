```toon
kind: llman.sdd.delta
ops[3]{op,req_id,title,statement,from,to,name}:
  add_requirement,"R-PLG-019",LSP 抽取,系统 SHALL 将 SQL intelligence 核心逻辑抽取为独立 Language Server Protocol 服务,null,null,null
  add_requirement,"R-PLG-020",CLI 工具,系统 SHALL 提供 sqlsugar CLI 支持 lint/format/test 命令用于 CI/CD,null,null,null
  add_requirement,"R-PLG-021",插件文档,系统 MUST 提供完整的 Provider 接口文档和插件开发指南,null,null,null
op_scenarios[3]{req_id,id,given,when,then}:
  R-PLG-019,S001,LSP server 独立运行,Neovim 客户端连接,获得与 VS Code 相同的 SQL 验证和补全能力
  R-PLG-020,S001,CI 流程调用 sqlsugar lint *.sql,SQL 文件有语法错误,命令返回非零退出码并输出错误报告
  R-PLG-021,S001,开发者查阅插件开发文档,开发者实现自定义 DialectProvider,文档指引完整且 Provider 成功注册
```
