Due to increasing security concerns by adopters of Open VSX, **namespaces can no longer be public**. Starting Dec. 17 2020, only members of a namespace have the authority to publish (with the exception of [the privileged @open-vsx account](https://github.com/eclipse/openvsx/wiki/#the-open-vsx-account)).

This change has the following consequences:

- When someone creates a namespace, they automatically become a contributor of that namespace.
- Extensions are shown as *verified* in the UI if the publishing user is a member of the namespace and the namespace has at least one owner. Otherwise the extensions are shown as *unverified* with a warning icon and an explanatory banner.
- Namespaces with no members are considered as *orphaned* (previously they were *public*).
- All previous publishers to an orphaned namespace have been added as contributors of that namespace.
- Orphaned namespaces with no published extensions have been deleted.

This change does not affect the publishing process if you create the namespace yourself.

---

The [publisher](https://code.visualstudio.com/api/references/extension-manifest) field in the package.json of VS Code extensions defines a namespace in which the extension is published. Valid namespace names are represented with the regex `[\w\-\+\$~]+`. This translates to the letters `a` - `z`, `A` - `Z`; numbers `0` - `9`; and the characters `_`, `-`, `+`, `$` and `~`.

The [VS Code Marketplace](https://marketplace.visualstudio.com/vscode) allows to create publishers and control who is allowed to publish. We take a similar approach in Open VSX. The main difference is that when you create a namespace, *you are not automatically the owner of that namespace*. You must [claim ownership](https://github.com/eclipse/openvsx/wiki/#how-to-claim-a-namespace) if you want your extensions to be displayed as *verified*.

When you [create a namespace](https://www.npmjs.com/package/ovsx#create-a-namespace), you are assigned as *contributor* so you can publish extensions in that namespace. Initially the namespace has no owner, therefore it is regarded as *unverified*. As soon as a user (you or somebody else) is granted ownership, the state of the namespace switches to *verified* and the owner obtains control on who is allowed to publish.

An extension version is regarded as *verified* if its namespace is verified and its publishing user is a member of the namespace. Every extension detail page on the Open VSX website displays the verified / unverified state along with the name of the publishing user. Verified extension versions are marked with a [shield icon](https://raw.githubusercontent.com/wiki/eclipse/openvsx/images/verified-small.svg), and unverified versions are marked with a warning icon ⚠️.

Before a namespace can be associated with your user account, you need to log in to [open-vsx.org](https://open-vsx.org/).

Claiming ownership of a namespace is done publicly by creating an issue in [github.com/EclipseFdn/open-vsx.org](https://github.com/EclipseFdn/open-vsx.org/issues/new/choose). By this the act of granting ownership is totally transparent, and you can simply comment on an existing issue in case you want to refute a previously granted ownership.

If you are an owner of a namespace, you are allowed to add other users to that namespace and to remove them again. This can be done in the [Namespaces](https://open-vsx.org/user-settings/namespaces) section of the settings page. There are two kinds of roles you can assign to namespace members:

- *Owner* – the same authority as you have
- *Contributor* – can publish extensions to that namespace, but cannot see or change namespace members

Service accounts (bots) should be added as contributors.

The [@open-vsx](https://github.com/open-vsx) service account is used to publish extensions which are not (yet) published by their original maintainers. The list of published extensions is managed in the [publish-extensions](https://github.com/open-vsx/publish-extensions) repository. Most extensions on this list are in unverified namespaces, and they are removed from the list when a maintainer claims ownership. However, in case a namespace owner does not continue publishing an extension that is relevant to the community, this extensions can be put back to the list, and [@open-vsx](https://github.com/open-vsx) will publish it *even if it is not a member of its namespace*. This is an exclusive privilege of the [@open-vsx](https://github.com/open-vsx) account, and of course it should be used sparingly. A better alternative might be to ask the namespace owner to [invite another person as contributor](https://github.com/eclipse/openvsx/wiki/#how-to-manage-namespace-members) so that person can take over publishing.

A warning icon ⚠️ is shown for some extensions, along with a hint that the publishing user is not verified. There are multiple situations that can cause this warning.

- A user created the namespace and published the extension, but did not [claim ownership](https://github.com/eclipse/openvsx/wiki/#how-to-claim-a-namespace) of the namespace.
- A user published the extension, but is no longer a member of the namespace (they were removed by an owner).
- The extension was published by [the privileged @open-vsx account](https://github.com/eclipse/openvsx/wiki/#the-open-vsx-account) although the namespace was owned by someone else.