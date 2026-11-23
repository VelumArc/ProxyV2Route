# 安装与升级 / Installation

**Windows 10/11 x64 · .NET Framework 4.5.2+ · Chrome 120+ / Firefox 140+**

[简体中文](#zh-install) · [English](#en-install) · [下载 / Downloads](#downloads) · [自行构建 / Build from source](SOURCES.md)

当前公开版本 / Current releases: **Chrome 1.2.74 · Firefox 1.2.74 · Windows 配套组件 / companion 1.2.74**

扩展与配套组件分别更新，日常使用请从对应商店安装。Extensions and the companion update separately; use the browser stores for regular installation.

<a id="windows-companion"></a>

## [下载 Windows 必备组件安装器 / Download Windows companion](https://github.com/VelumArc/ProxyV2Route/releases/download/v1.2.74/Proxy-V2Route-Setup-1.2.74-Windows-x64.exe)

**节点线路必须安装此组件。** 安装器已含 Python、Xray 与 MTR 诊断；v2rayN 可选，无需另装核心或 MTR 工具。Windows 安装器目前未作代码签名。

**Required for node routes.** Includes Python, Xray and MTR diagnostics. v2rayN is optional; no separate core or MTR tool is needed. The Windows installer is currently unsigned.

<a id="downloads"></a>

## 下载入口 / Downloads

| 用途 / Purpose | 下载 / Download |
| --- | --- |
| <a id="chrome"></a>日常安装 Chrome / Install Chrome extension | [Chrome 应用商店 / Chrome Web Store](https://chromewebstore.google.com/detail/proxy-v2route/mngpdlmiimigbloccmolkjbcagonijlm) |
| <a id="firefox"></a>日常安装 Firefox / Install Firefox extension | [Firefox 附加组件商店 / Firefox Add-ons](https://addons.mozilla.org/firefox/addon/proxy-v2route/) |
| Windows 节点组件 / Windows node companion | [安装器 1.2.74 / Installer](#windows-companion) |
| Firefox 离线安装 / Offline Firefox installation | [Firefox XPI 1.2.74（AMO 官方）/ Official AMO XPI](https://addons.mozilla.org/firefox/downloads/file/5288404/proxy_v2route-1.2.74.xpi) |
| 普通用户组合包 / Customer bundle | [Windows 1.2.74 + Firefox 签名版 / signed 1.2.74 + 安装说明 / guide](https://github.com/VelumArc/ProxyV2Route/releases/download/v1.2.74/Proxy-V2Route-1.2.74-Customer-20261122-AMO.zip) |
| 本地测试与源码 / Local testing and source | [完整本地包、源码与校验信息 / Release files](https://github.com/VelumArc/ProxyV2Route/releases/tag/v1.2.74) |

客户组合包、完整本地包和源码包中的商店版本记录对应打包日期。当前版本和安装步骤以本页及上方官方商店为准。

Store versions mentioned inside the customer, complete local and source ZIPs reflect their packaging dates. Use this guide and the official store links above for current versions and installation steps.

<a id="zh-install"></a>

## 简体中文

### 三步开始使用

1. **安装扩展。** 从上方 Chrome 或 Firefox 商店安装。Firefox 扩展详情须启用“允许在隐私窗口中运行”；Chrome 无痕访问也需在扩展详情中允许。每个浏览器配置文件需分别启用扩展。
2. **安装 Windows 配套组件。** 运行[安装器](#windows-companion)，选择可长期保留、可写的新空文件夹，点击“安装”。组件为当前 Windows 用户注册。使用完整本地 ZIP 时，运行其中的 `V2Route-Setup.exe` 会直接注册当前目录。
3. **检查连接，导入并应用。** 在扩展“设置”点击“重新检测”；连接成功后，导入自己的节点或订阅，创建情景并点击“应用情景”，再到 IP 工具确认出口。需要读取 v2rayN 时，可重新扫描或选择其文件夹。本项目不提供代理服务器或订阅。

### 升级与旧版迁移

浏览器扩展与 Windows 配套组件分别更新。扩展更新不会自动安装或替换本机组件；升级组件前，请查看本页要求及发布说明。

- **升级组件：** 将匹配的新完整包装入新空文件夹，运行安装器并确认升级。安装器校验已有安装归属，迁移组件设置、导入节点、线路绑定及端口，仅重启已验证的本地组件。随后更新或重新加载扩展，保留相同扩展身份。
- **Firefox 旧测试版：** 正式版使用新扩展 ID，需要配套组件 1.2.73 或更新版。装过旧测试扩展的用户应先在旧扩展导出情景，再在新扩展导入；不同 ID 的设置不会自动迁移。Chrome 扩展 ID 不变，已有 1.2.72 可继续使用。
- **节点暂时缺失：** 扩展保留已保存的节点标识，不会自动改为“跟随 v2rayN”。同一标识恢复后可重新识别；节点确已更换或删除时，在情景中重新选择。

### 情景、规则与检测

在“情景模式”点击“新建情景”，或从“节点库”点击“创建情景”。基础、前置和链式代理分别保留出口节点与配置；保存当前模式不会清空其他模式。回到单一出口时选择“基础代理”。

“保存”记录修改；“应用情景”同时保存并切换。已保存的情景也可从工具栏应用。“跟随 v2rayN”使用其正在运行的本地入口。

三种模式的连接顺序卡片均可检测链路，显示每段状态和延迟。停止操作等待当前有时限的探测结束，不改变正在使用的线路。动态“跟随”尚未确定具体节点时，无法逐段检测。

| 规则配置 | 生效方式 |
| --- | --- |
| 自动切换 | 设置默认直连或系统代理，在规则右侧选择节点库线路。按顺序使用第一条命中规则；节点目标失效时报告错误，不改走其他线路。 |
| 直连与系统情景 | 在情景列表编辑，工具栏快捷按钮使用同一套规则。直连只需配置“指定代理策略”。 |
| 系统、节点与手动情景 | 先检查“不代理的地址”，再使用第一条命中的指定代理策略，未命中时使用情景默认线路。 |
| 域名、IP 与端口 | 普通域名仅匹配该域名；填写 `example.com, *.example.com` 可同时覆盖主域名与子域名，共用右侧目标。`192.0.2.10:8443` 仅匹配该 IP 和端口。IP 规则不解析域名。完整网址规则每行一条，建议使用 `https://example.com/*` 匹配整站。本扩展的 PAC 分流规则在 Firefox 中无法读取网址路径，在 Chrome 中无法读取 HTTPS 路径，因此不能应用这些路径条件；Chrome 明确的 HTTP 规则可匹配路径。 |
| 带规则的系统代理 | 应用时读取 Windows 手动代理配置。Windows 设置变更后，在扩展弹窗再次选择当前情景；PAC 或自动发现不能与这些系统规则组合使用。 |
| PAC 脚本 | 保存前离线检查语法，须提供顶层同步 `FindProxyForURL` 函数。语法通过不保证脚本对所有网址都能正确执行；脚本同样受浏览器隐藏网址路径的限制。 |

兼容要求：节点规则备份需 1.2.53 或更新版；逗号多域名规则备份需 1.2.54 或更新版；指定代理策略备份需 1.2.65 或更新版。导入节点时新建分组需配套组件 1.2.65 或更新版。

### 备份与停用

情景导出包含所用节点配置、凭据和完整前置链路，包括扫描节点。新电脑安装组件后导入，可恢复为独立节点。每个情景只导出最近保存时选定的模式，其他模式的配置保留在当前浏览器。

**备份文件未加密，请私下保管。** 旧备份缺少凭据时，须在原电脑重新导出。动态“跟随”情景需先选择具体节点；依赖外部本机文件的配置无法迁移。

停用组件前切换至“直连”或“系统”，再运行 `uninstall.cmd` 解除注册。

### 本地开发测试

- **Chrome：** 解压 `Proxy-V2Route-Chrome-1.2.74.zip` 到长期保留的目录，在 `chrome://extensions` 开启开发者模式，点击“加载已解压的扩展程序”，选择含 `manifest.json` 的目录。完整本地包中对应 `chrome-extension`。
- **Firefox：** 日常安装使用商店版或签名 XPI。`Proxy-V2Route-Firefox-1.2.74-unsigned.xpi` 与完整本地包内的 `firefox-extension` 仅用于开发测试：在 `about:debugging` →“此 Firefox”→“临时载入附加组件”选择 XPI 或 `manifest.json`；重启浏览器后失效。

### 常见问题

**还要安装 v2rayN 或 MTR 吗？** 不需要。Windows 包已包含本地组件、Python、Xray 和网络诊断。v2rayN 仅用于可选节点来源或“跟随”模式。

**“重新检测”会更新核心吗？** 不会。它检查本机组件及固定版本核心的存在和校验状态，不查询上游最新版本。“安装/修复”恢复固定核心；更新请安装新版配套包。

<a id="en-install"></a>

## English

### Get started in three steps

1. **Install the extension** from the Chrome or Firefox store linked above. In Firefox add-on details, enable **Allow in Private Windows**. For Chrome incognito use, allow access in extension details. Enable the extension separately in each browser profile.
2. **Install the Windows companion.** Run the [installer](#windows-companion), choose a new empty, permanent writable folder and click **Install**. Registration is for the current Windows user. With the complete local ZIP, run `V2Route-Setup.exe` to register its current folder instead.
3. **Check the connection, import and apply.** In extension **Settings**, click **Check again**. Once connected, import your own nodes or subscriptions, create a profile and click **Apply profile**, then check the exit IP in IP Tools. To read v2rayN nodes, rescan or select its folder. This project does not provide proxy servers or subscriptions.

### Upgrades and migration

Browser extensions and the Windows companion update separately. An extension update does not install or replace the companion. Check this page's requirements and the release notes before upgrading it.

- **Companion upgrade:** Put the matching new complete package in a new empty folder, run Setup and confirm the upgrade. Setup verifies installation ownership, migrates companion settings, imported nodes, route bindings and ports, then restarts only the verified companion. Update or reload the extension while keeping the same extension identity.
- **Previous Firefox test extension:** The public release uses a new extension ID and requires companion 1.2.73 or later. Export profiles from the old test extension and import them into the new extension; settings do not migrate automatically between IDs. The Chrome ID is unchanged and Chrome 1.2.72 remains compatible.
- **Missing nodes:** Saved node IDs remain stored instead of silently switching to Follow v2rayN. The same ID can be recognized when it returns. If a node was replaced or deleted, select its replacement in the profile editor.

### Profiles, rules and diagnostics

Choose **New profile** in Profiles or **Create profile** in Node Library. Basic, predecessor and chain modes retain separate exit nodes and settings. Saving the selected mode preserves the other modes; choose Basic proxy for a single exit.

**Save** keeps edits for later. **Apply profile** saves and switches routes; saved profiles can also be applied from the toolbar. **Follow v2rayN** uses its running local endpoint.

All three modes offer per-path status, latency and Stop in the connection-order card. Stop waits for the current bounded probe; diagnostics do not change the applied route. Dynamic Follow routes cannot be probed without concrete nodes.

| Configuration | Behavior |
| --- | --- |
| Automatic profiles | Keep a Direct or System default and select library nodes as rule targets. The first matching rule wins; an unavailable node target reports an error rather than using another route. |
| Direct and System profiles | Edit them in Profiles to configure the same rules used by their toolbar shortcuts. Direct only needs proxy policies. |
| System, node and manual profiles | Bypasses take priority, then the first matching proxy policy, then the profile default. |
| Domains, IP addresses and ports | A plain domain matches only that host. Use `example.com, *.example.com` to cover both the main domain and its subdomains with one row's target. `192.0.2.10:8443` matches that IP and port only. IP rules do not resolve domain names. Put each full URL pattern on a separate row; prefer an origin-wide pattern such as `https://example.com/*`. The PAC-based routing used by this extension cannot read URL paths in Firefox or HTTPS paths in Chrome, so those path-dependent conditions cannot be applied. Explicit HTTP rules in Chrome can match paths. |
| System profiles with rules | Applying the profile takes a snapshot of manual Windows proxy settings. After changing those settings, select the current profile again in the extension popup. PAC and auto-discovery cannot be combined with these System rules. |
| PAC scripts | Local syntax checking runs before saving and requires an explicit synchronous top-level `FindProxyForURL` function. Passing syntax validation cannot prove behavior for every URL; scripts have the same browser URL-path visibility limits. |

Backup compatibility: node rules require version 1.2.53 or later; comma-separated domain rules require 1.2.54 or later; proxy policies require 1.2.65 or later. Importing nodes into a new group requires companion 1.2.65 or later.

### Backups and removal

Profile exports include the selected nodes, credentials and full predecessor paths, including scanned nodes. Install the companion on the destination and import the file to restore independent nodes. Each profile exports its last saved selected mode; other mode settings stay in the current browser.

**Backups are unencrypted; keep them private.** Re-export on the source computer if an older backup lacks credentials. Select a concrete node for dynamic Follow profiles. Configurations using external local files cannot be migrated.

Switch to Direct or System before running `uninstall.cmd` to unregister the companion.

### Local development testing

- **Chrome:** Extract `Proxy-V2Route-Chrome-1.2.74.zip` to a permanent folder. Enable Developer mode at `chrome://extensions`, choose **Load unpacked** and select the directory containing `manifest.json`. The complete local package uses the `chrome-extension` folder.
- **Firefox:** Use the store release or signed XPI for regular installation. The local `Proxy-V2Route-Firefox-1.2.74-unsigned.xpi` and the complete local package's `firefox-extension` are for development testing only. Load the XPI or `manifest.json` through `about:debugging` → **This Firefox** → **Load Temporary Add-on**. Temporary loading lasts only until Firefox restarts.

### FAQ

**Do I need v2rayN or MTR?** No. The Windows package includes the companion, Python, Xray and network diagnostics. v2rayN is only an optional node source or Follow endpoint.

**Does Check again update the core?** No. It checks the local companion and the presence and checksum status of the pinned core, without querying the latest upstream release. Install/repair restores that pinned core; use a newer companion package to update.
