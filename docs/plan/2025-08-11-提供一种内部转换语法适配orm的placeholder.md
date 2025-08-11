因为sqls不支持sqlalchemy的placeholder，所以需要提供一种内部转换语法适配orm的placeholder

比如

```sql
SELECT
    *
FROM
    TABLE
WHERE
    id = :id
    AND name = :name
    AND age = :age
```

会提示

```
2025/08/11 23:19:34 panic serving textDocument/formatting: runtime error: invalid memory address or nil pointer dereference
goroutine 52 [running]:
github.com/sqls-server/sqls/internal/handler.panicf({0x1042dae00, 0x104910340}, {0x10405487e, 0x2}, {0xc00011d860, 0x1, 0x1})
	/Users/straydragon/go/pkg/mod/github.com/sqls-server/sqls@v0.2.28/internal/handler/handler.go:63 +0xa9
github.com/sqls-server/sqls/internal/handler.(*Server).Handle.func1()
	/Users/straydragon/go/pkg/mod/github.com/sqls-server/sqls@v0.2.28/internal/handler/handler.go:82 +0x89
panic({0x1042dae00?, 0x104910340?})
	/Users/straydragon/.g/go/src/runtime/panic.go:792 +0x132
github.com/sqls-server/sqls/ast.joinRender({0xc00012aaa0?, 0x5?, 0x10?}, 0xc000595be8)
	/Users/straydragon/go/pkg/mod/github.com/sqls-server/sqls@v0.2.28/ast/ast.go:609 +0x7d
github.com/sqls-server/sqls/ast.(*ItemWith).Render(0xc00005af00?, 0x10?)
	/Users/straydragon/go/pkg/mod/github.com/sqls-server/sqls@v0.2.28/ast/ast.go:85 +0x27
github.com/sqls-server/sqls/ast.joinRender({0xc000472b00?, 0xc00011dc18?, 0xc00004eca0?}, 0xc000595be8)
	/Users/straydragon/go/pkg/mod/github.com/sqls-server/sqls@v0.2.28/ast/ast.go:609 +0x86
github.com/sqls-server/sqls/ast.(*Statement).Render(0x104347500?, 0xc00011dc18?)
	/Users/straydragon/go/pkg/mod/github.com/sqls-server/sqls@v0.2.28/ast/ast.go:407 +0x27
github.com/sqls-server/sqls/ast.joinRender({0xc00004eca0?, 0x2?, 0x104320a80?}, 0xc000595be8)
	/Users/straydragon/go/pkg/mod/github.com/sqls-server/sqls@v0.2.28/ast/ast.go:609 +0x86
github.com/sqls-server/sqls/ast.(*Query).Render(0x1043c2180?, 0xc000457cb0?)
	/Users/straydragon/go/pkg/mod/github.com/sqls-server/sqls@v0.2.28/ast/ast.go:391 +0x27
github.com/sqls-server/sqls/internal/formatter.Format({0xc0003903c0?, 0x4?}, {{{0xc0004661c0, 0x6b}}, {0x4010000000000000, 0x1, 0x1, 0x0, 0x0}, {{0x0, ...}}}, ...)
	/Users/straydragon/go/pkg/mod/github.com/sqls-server/sqls@v0.2.28/internal/formatter/formatter.go:45 +0x172
github.com/sqls-server/sqls/internal/handler.(*Server).handleTextDocumentFormatting(0xc0001800c0, {0x103911f93?, 0xc00011dd18?}, 0xc00055a000?, 0xc0001801e0)
	/Users/straydragon/go/pkg/mod/github.com/sqls-server/sqls@v0.2.28/internal/handler/format.go:28 +0x137
github.com/sqls-server/sqls/internal/handler.(*Server).handle(0xc0001800c0, {0x1043c0410, 0x10496b940}, 0xc0005282d0, 0xc0001801e0)
	/Users/straydragon/go/pkg/mod/github.com/sqls-server/sqls@v0.2.28/internal/handler/handler.go:121 +0x3cc
github.com/sqls-server/sqls/internal/handler.(*Server).Handle(0xc00004e6c0?, {0x1043c0410?, 0x10496b940?}, 0x103939ad4?, 0xc00046a000?)
	/Users/straydragon/go/pkg/mod/github.com/sqls-server/sqls@v0.2.28/internal/handler/handler.go:86 +0x7a
github.com/sourcegraph/jsonrpc2.(*HandlerWithErrorConfigurer).Handle(0xc000497670, {0x1043c0410, 0x10496b940}, 0xc0005282d0, 0xc0001801e0)
	/Users/straydragon/go/pkg/mod/github.com/sourcegraph/jsonrpc2@v0.2.0/handler_with_error.go:21 +0x57
github.com/sourcegraph/jsonrpc2.(*Conn).readMessages(0xc0005282d0, {0x1043c0410, 0x10496b940})
	/Users/straydragon/go/pkg/mod/github.com/sourcegraph/jsonrpc2@v0.2.0/conn.go:205 +0x2dd
created by github.com/sourcegraph/jsonrpc2.NewConn in goroutine 1
	/Users/straydragon/go/pkg/mod/github.com/sourcegraph/jsonrpc2@v0.2.0/conn.go:62 +0x1e6
[Error - 23:19:34] Request textDocument/formatting failed.
  Message: unexpected panic: runtime error: invalid memory address or nil pointer dereference
  Code: 0
2025/08/11 23:19:56 error serving, jsonrpc2: code -32601 message: method not supported: $/cancelRequest
2025/08/11 23:19:56 jsonrpc2 handler: notification "$/cancelRequest" handling error: jsonrpc2: code -32601 message: method not supported: $/cancelRequest

```

但是如果修改为 (编辑区)

```sql
select *
from table
where id = "__:id"
and name = "__:name"
```

0. 当用户右键Edit inline sql 时, 插件会检测是否包含占位符, 如果包含, 则会自动进行类似pattern的转换("__:<PH>")
1. 当用户保存同步原位置代码前, 插件内部进行替换映射

