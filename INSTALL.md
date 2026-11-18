# 安装与升级 / Installation

**Proxy V2Route 1.2.73** · Windows 10/11 x64 · .NET Framework 4.5.2+ · Chrome 120+ / Firefox 140+

[Windows 安装器](https://github.com/VelumArc/ProxyV2Route/releases/download/v1.2.73/Proxy-V2Route-Setup-1.2.73-Windows-x64.exe) · [完整包与源码](https://github.com/VelumArc/ProxyV2Route/releases/tag/v1.2.73)。[从 Chrome 应用商店安装扩展](https://chromewebstore.google.com/detail/proxy-v2route/mngpdlmiimigbloccmolkjbcagonijlm)；Firefox 提供未签名测试包。自行打包见[来源与构建](SOURCES.md)。

[Windows installer](https://github.com/VelumArc/ProxyV2Route/releases/download/v1.2.73/Proxy-V2Route-Setup-1.2.73-Windows-x64.exe) · [Complete package and source](https://github.com/VelumArc/ProxyV2Route/releases/tag/v1.2.73). [Install from the Chrome Web Store](https://chromewebstore.google.com/detail/proxy-v2route/mngpdlmiimigbloccmolkjbcagonijlm); Firefox is available as an unsigned test package. To build packages, see [SOURCES.md](SOURCES.md).

## 本地组件 / Windows companion

1. 运行 Windows 安装器或完整包内的 `V2Route-Setup.exe`。独立安装器解压至选择的新空文件夹，完整 ZIP 内的入口直接注册当前目录。
2. 点击“安装”，一次安装并为当前 Windows 用户注册组件；完整包已包含 Python 与 Xray，无需另装核心。
3. 在扩展“设置”中检查连接。需要读取 v2rayN 时，可重新扫描或选择其文件夹。

Run the matching setup in a permanent writable folder and click Install. Python and Xray are included; no separate core installation is needed. Use extension Settings to check the connection or locate v2rayN.

## 浏览器扩展 / Browser extension

### Chrome

从[Chrome 应用商店](https://chromewebstore.google.com/detail/proxy-v2route/mngpdlmiimigbloccmolkjbcagonijlm)安装。以下步骤适用于本地扩展包。

Install from the [Chrome Web Store](https://chromewebstore.google.com/detail/proxy-v2route/mngpdlmiimigbloccmolkjbcagonijlm). Follow these steps to load a local package.

解压 `Proxy-V2Route-Chrome-1.2.73.zip`，在 `chrome://extensions` 开启开发者模式，点击“加载已解压的扩展程序”，选择含 `manifest.json` 的目录。完整安装包中对应 `chrome-extension`。

Extract the Chrome ZIP to a permanent folder. Enable Developer mode at `chrome://extensions`, choose **Load unpacked** and select the directory containing `manifest.json`.

### Firefox

当前测试包未签名。进入 `about:debugging` →“此 Firefox”→“临时载入附加组件”，选择 `Proxy-V2Route-Firefox-1.2.73-unsigned.xpi` 或 `firefox-extension/manifest.json`。临时加载在浏览器重启后失效，永久安装需要 Mozilla 签名。

Load the unsigned test XPI through `about:debugging` → **This Firefox** → **Load Temporary Add-on**. Temporary loading lasts until Firefox restarts. Permanent installation requires Mozilla signing.

每个浏览器用户需分别启用扩展，无痕访问需在扩展详情中允许。

Enable the extension separately in each browser profile and allow private-window access when needed.

## 升级 / Upgrade

浏览器扩展与 Windows 配套组件分别更新。扩展更新不会自动安装或替换本机组件；升级组件前，请查看本页的版本要求和发布说明。

The browser extension and Windows companion update separately. An extension update does not install or replace the native companion. Check the requirements on this page and the release notes before upgrading the companion.

将匹配的新完整包装入新空文件夹，运行安装器并确认升级。安装器校验已有安装归属，迁移组件设置、导入节点、线路绑定及端口，仅重启已验证的本地组件。随后更新浏览器扩展，保留相同扩展身份并重新加载。

Install the matching complete package into a new empty folder and confirm the verified upgrade. Setup preserves companion settings, imported nodes, route bindings and ports, then restarts the verified companion. Update and reload the browser extension with the same identity.

扩展保留已保存的节点标识。节点暂时缺失时显示失效，不自动切换到“跟随 v2rayN”；同一标识恢复后可重新识别。节点确已更换或删除时，请在情景的线路选择区重新选择。

The extension preserves saved node IDs. A missing node remains unavailable instead of silently switching to Follow v2rayN; the same ID can be recognized when it returns. If the node was replaced or deleted, choose its replacement in the profile route selector.

## 情景与线路 / Profiles

- 在“情景模式”新建情景，或从“节点库”点击“创建情景”。Choose **New profile** or **Create profile** in Node Library.
- 基础、前置和链式代理分别保存出口节点及相关配置。点击模式后，保存按钮会记录当前模式；其他模式的配置保留，再切回即可继续使用。要回到单一出口，点击“基础代理”。Basic, predecessor and chain modes retain separate exits and settings. Save the selected mode and apply the profile to switch routes. Other mode settings remain available when you switch back. Choose Basic proxy for exit-only routing.
- 点击「应用情景」可保存并切换。仅保存的配置也可稍后从工具栏应用。Apply profile saves your edits and switches routes. You can also apply a saved profile from the toolbar.
- “跟随 v2rayN”使用其正在运行的本地入口。Follow v2rayN uses its running local endpoint.
- 三种模式的连接顺序卡片均可检测链路，显示每段状态和延迟。点击停止后等待当前有时限的探测结束，不会改动正在使用的线路。“跟随”尚未确定具体节点时无法逐段检测。All three modes offer per-path status, latency and Stop in the connection-order card. Stop waits for the current bounded probe; diagnostics do not change the applied route. Dynamic Follow routes cannot be probed without concrete nodes.

自动切换可设置默认直连或系统代理，再在域名规则右侧选择节点库线路。规则按顺序匹配；节点规则失效时报告错误，不改走其他线路。含节点规则的备份需要 1.2.53 或更新版本导入。

多个域名可写在同一行，例如 `example.com,*.example.net`，共用右侧目标；完整网址每行一条。含逗号多域名规则的备份需使用 1.2.54 或更新版本。

Automatic profiles can keep a Direct/System default and target library nodes in domain rules. The first matching rule wins; unavailable node-rule targets fail instead of using another route. Backups containing node rules require 1.2.53 or later.

Separate domains with commas, e.g. `example.com,*.example.net`, to share one row's target. Keep full URL patterns on separate rows. Backups with comma-separated domain rules require 1.2.54 or later.

PAC 在保存前进行离线语法检查，需要顶层同步 `FindProxyForURL` 函数。语法通过不保证任意脚本对所有网址都能正确执行。

PAC syntax is parsed locally before saving and requires an explicit synchronous top-level `FindProxyForURL` function. Syntax validation cannot prove behavior for every URL.

## 备份与停用 / Backup and removal

导出情景包含所用节点的配置、凭据及完整前置链路，包括扫描节点。新电脑安装组件后导入，即可恢复为独立节点。备份导出每个情景最近保存时选定的模式，其他模式的配置保留在当前浏览器。文件**未加密**，请妥善保管。旧备份缺少的凭据需在原电脑重新导出；动态“跟随”情景须先选择具体节点，依赖外部本机文件的配置无法迁移。

Profile exports include the selected nodes, credentials and predecessor paths, including scanned nodes. Install the companion on the destination and import the file to restore independent nodes. The backup exports the mode selected in each saved profile. Other saved modes stay in this browser. Backups are **unencrypted**. Re-export on the source computer if an older backup lacks credentials. Select a concrete node for dynamic Follow profiles; configurations using external local files cannot be migrated.

停用前切换至“直连”或“系统”，再运行 `uninstall.cmd` 解除注册。Switch to Direct or System before running `uninstall.cmd` to unregister the companion.

## 常见问题 / FAQ

- **还要安装 v2rayN 或 MTR 吗？** 不需要。完整包已包含本地组件、Python、Xray 和网络诊断。v2rayN 仅用于可选节点来源或“跟随”模式。
  **Do I need v2rayN or MTR?** No. The complete package includes the companion, Python, Xray and network diagnostics. v2rayN is only an optional node source or Follow endpoint.
- **“重新检测”会更新核心吗？** 不会。它检查本机组件及固定版本核心的存在和校验状态，不查询上游最新版本。“安装/修复”恢复固定核心；更新请安装新版配套包。
  **Does Check again update the core?** No. It checks the local companion and the presence/checksum status of the pinned core, without querying the latest upstream release. Install/repair restores that pinned core; use a newer complete package to update.

导入代理时新建分组需要 1.2.65 或更新版配套组件。
Importing proxies into a new group requires companion 1.2.65 or later.

在情景列表中选择“直连网络”或“系统代理”可编辑快捷按钮的规则。直连只需填写指定代理策略。系统、节点与手动情景先检查绕过地址，再按从上到下的顺序使用第一条命中策略。以 `*.example.org` 匹配子域名，以 `192.0.2.10:8443` 仅匹配访问该 IP 和端口的请求。IP 规则不解析域名。带规则的系统代理在应用时读取 Windows 手动代理配置。Windows 代理设置更新后，在扩展弹窗再次选择当前情景即可读取新设置。系统使用 PAC 或自动发现时会提示无法应用。包含这些策略的备份需使用 1.2.65 或更新版导入。

Edit Direct and System in Profiles to configure their toolbar shortcuts. Bypasses take priority over ordered proxy policies. Unmatched requests use the profile default. Use a bare IP or specify a port to narrow the match. System policies use a snapshot of manual Windows proxy settings. After changing Windows proxy settings, select the current profile again in the extension popup. System policies require a manual proxy configuration. PAC and auto-discovery are unsupported for these policies. Restore backups containing these policies with version 1.2.65 or later.

## Firefox 1.2.73

Firefox 使用新扩展 ID，请先安装 1.2.73 配套组件。若装过旧测试扩展，请在旧扩展中导出情景，再在新扩展中导入；浏览器不会自动迁移不同 ID 的设置。Chrome 扩展 ID 不变，已有 1.2.72 可继续使用。

Firefox uses a new extension ID and requires companion 1.2.73 or later. If you used the previous test extension, export profiles there and import them into the new extension; browser settings do not migrate automatically between IDs. The Chrome extension ID is unchanged and Chrome 1.2.72 remains compatible.
