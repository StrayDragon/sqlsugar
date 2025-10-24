# Open VSX 发布指南 - 消除警告

由于 Open VSX 采用者日益增长的安全考虑，**命名空间不再是公开的**。从 2020 年 12 月 17 日开始，只有命名空间的成员才有权发布（除了[特权 @open-vsx 账户](https://github.com/eclipse/openvsx/wiki/#the-open-vsx-account)）。

此更改带来以下后果：

- 当有人创建命名空间时，他们自动成为该命名空间的贡献者
- 如果发布用户是命名空间的成员且命名空间至少有一个所有者，扩展在 UI 中显示为*已验证*。否则扩展显示为*未验证*，带有警告图标和说明横幅
- 没有成员的命名空间被视为*孤立的*（以前是*公开的*）
- 所有先前发布到孤立命名空间的发布者已被添加为该命名空间的贡献者
- 没有已发布扩展的孤立命名空间已被删除

如果您自己创建命名空间，此更改不会影响发布过程。

---

## 命名空间说明

VS Code 扩展的 package.json 中的 [publisher](https://code.visualstudio.com/api/references/extension-manifest) 字段定义了扩展发布的命名空间。有效的命名空间名称用正则表达式 `[\w\-\+\$~]+` 表示。这转换为字母 `a` - `z`、`A` - `Z`；数字 `0` - `9`；以及字符 `_`、`-`、`+`、`$` 和 `~`。

[VS Code Marketplace](https://marketplace.visualstudio.com/vscode) 允许创建发布者并控制谁可以发布。我们在 Open VSX 中采用类似的方法。主要区别在于，当您创建命名空间时，*您不会自动成为该命名空间的所有者*。如果您希望扩展显示为*已验证*，则必须[声明所有权](https://github.com/eclipse/openvsx/wiki/#how-to-claim-a-namespace)。

当您[创建命名空间](https://www.npmjs.com/package/ovsx#create-a-namespace)时，您被分配为*贡献者*，因此您可以在该命名空间中发布扩展。最初命名空间没有所有者，因此被视为*未验证*。一旦用户（您或其他人）被授予所有权，命名空间的状态就会切换到*已验证*，所有者可以控制谁可以发布。

如果扩展的命名空间已验证且其发布用户是命名空间的成员，则扩展版本被视为*已验证*。Open VSX 网站上的每个扩展详情页面都会显示已验证/未验证状态以及发布用户的名称。已验证的扩展版本标有[盾牌图标](https://raw.githubusercontent.com/wiki/eclipse/openvsx/images/verified-small.svg)，未验证的版本标有警告图标。

## 如何声明命名空间所有权

在命名空间可以与您的用户账户关联之前，您需要登录到 [open-vsx.org](https://open-vsx.org/)。

声明命名空间所有权是通过在 [github.com/EclipseFdn/open-vsx.org](https://github.com/EclipseFdn/open-vsx.org/issues/new/choose) 中创建 issue 来公开完成的。通过这种方式，授予所有权的行为完全透明，如果您想反驳先前授予的所有权，可以简单地在现有 issue 上发表评论。

## 如何管理命名空间成员

如果您是命名空间的所有者，您可以向该命名空间添加其他用户并再次删除他们。这可以在设置页面的 [Namespaces](https://open-vsx.org/user-settings/namespaces) 部分完成。您可以为命名空间成员分配两种角色：

- *Owner（所有者）* – 与您拥有相同的权限
- *Contributor（贡献者）* – 可以向该命名空间发布扩展，但无法查看或更改命名空间成员

服务账户（机器人）应添加为贡献者。

## Open VSX 账户

[@open-vsx](https://github.com/open-vsx) 服务账户用于发布尚未由其原始维护者发布的扩展。已发布扩展的列表在 [publish-extensions](https://github.com/open-vsx/publish-extensions) 仓库中管理。此列表上的大多数扩展都在未验证的命名空间中，当维护者声明所有权时，它们会从列表中删除。但是，如果命名空间所有者不继续发布与社区相关的扩展，该扩展可以放回列表中，[@open-vsx](https://github.com/open-vsx) 将发布它，*即使它不是其命名空间的成员*。这是 [@open-vsx](https://github.com/open-vsx) 账户的独有特权，当然应该谨慎使用。更好的替代方案可能是要求命名空间所有者[邀请另一个人作为贡献者](https://github.com/eclipse/openvsx/wiki/#how-to-manage-namespace-members)，以便该人可以接管发布。

## 为什么会显示警告

某些扩展会显示警告图标，并提示发布用户未验证。有多种情况可能导致此警告：

- 用户创建了命名空间并发布了扩展，但没有[声明命名空间所有权](https://github.com/eclipse/openvsx/wiki/#how-to-claim-a-namespace)
- 用户发布了扩展，但不再是命名空间的成员（他们被所有者删除）
- 扩展由[特权 @open-vsx 账户](https://github.com/eclipse/openvsx/wiki/#the-open-vsx-account)发布，尽管命名空间由其他人拥有