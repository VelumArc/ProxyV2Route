# 来源与构建 / Sources and builds

[中文构建说明](#zh-build) · [English build guide](#en-build) · [安装成品 / Install a release](INSTALL.md)

本页面向从源码构建的开发者。普通安装请使用[安装说明](INSTALL.md)。

This guide is for developers building from source. For regular installation, use the [installation guide](INSTALL.md).

已发布的安装与审核包对应各自的 Release 标签。主分支的源码可能包含已合入、将在后续版本交付的修正。

Installers and store packages correspond to their release tags. The main branch may include fixes intended for later releases.

<a id="source-map"></a>

## 源码导航 / Source map

GitHub 文件列表中的文字是该路径最近一次改动的提交标题。标题里出现的旧版本号记录当时的改动。已发布版本和下载见 [Releases](https://github.com/VelumArc/ProxyV2Route/releases)。

GitHub's file list shows the commit title of the last change to each path. Any version number in that title refers to that change. Published versions and downloads are listed under [Releases](https://github.com/VelumArc/ProxyV2Route/releases).

| 模块 / Area | 文件或目录 / Files | 用途 / Purpose |
| --- | --- | --- |
| 浏览器扩展 / Browser extensions | [`chrome-extension/`](chrome-extension/) · [`firefox-extension/`](firefox-extension/) | 界面、浏览器代理控制和各自的扩展清单 / UI, browser proxy control and browser-specific manifests |
| Windows 安装 / Windows setup | [`SetupLauncher.cs`](SetupLauncher.cs) · [`portable_install.py`](portable_install.py) · [`upgrade_install.py`](upgrade_install.py) | 安装器界面、安装和升级 / Installer UI, installation and upgrades |
| 浏览器与组件通信 / Native messaging | [`NativeHost.cs`](NativeHost.cs) · [`native_host.py`](native_host.py) · [`install_host.py`](install_host.py) | 本机宿主启动、请求处理和浏览器注册 / Host launch, request handling and browser registration |
| 本机代理与核心 / Local proxy and core | [`backend.py`](backend.py) · [`core_manager.py`](core_manager.py) · [`discovery.py`](discovery.py) | 代理入口、线路绑定、Xray 管理、可选 v2rayN 定位 / Proxy endpoints, route bindings, Xray management and optional v2rayN discovery |
| 情景和节点 / Profiles and nodes | [`routes.py`](routes.py) · [`library_store.py`](library_store.py) · [`node_import.py`](node_import.py) · [`profile_bundle.py`](profile_bundle.py) | 线路配置、节点持久化、导入及情景备份 / Routes, node storage, imports and profile backups |
| 线路检测 / Route diagnostics | [`network_diagnostics.py`](network_diagnostics.py) · [`chain_probe.py`](chain_probe.py) · [`node_measure.py`](node_measure.py) | 网络检测、链式线路逐段检测与节点测速 / Network, per-hop chain and node performance tests |
| 组件构建 / Companion builds | [`build_host.py`](build_host.py) · [`build_runtime.py`](build_runtime.py) · [`build_core.py`](build_core.py) · [`build_setup.py`](build_setup.py) | 构建通信宿主、准备 Python 运行时和 Xray、生成 Windows 安装器 / Build the messaging host, prepare Python and Xray, and build the Windows installer |
| 打包与源码导出 / Packages and source export | [构建命令 / Build commands](#build-commands) · [`pack_portable.py`](pack_portable.py) · [`prepare_source_bundle.py`](prepare_source_bundle.py) · [`assemble_public_repo.py`](assemble_public_repo.py) | 生成完整包、源码包和公开仓库文件 / Create complete packages, source archives and the public repository tree |
| 官网与素材 / Website and assets | [`docs/`](docs/) · [`assets/`](assets/) | 官网、产品文档及构建素材 / Website, product documentation and build assets |
| 第三方依赖 / Third-party dependencies | [`vendor-html/`](vendor-html/) · [`vendor_yaml/`](vendor_yaml/) | HTML 解析器重建配方及随包分发的 PyYAML 源码 / HTML parser rebuild recipe and bundled PyYAML source |
| 开源许可 / Open-source licenses | [`LICENSE`](LICENSE) · [`licenses/`](licenses/) | 项目许可证及随包第三方声明 / Project license and bundled third-party notices |

## 许可与依赖 / Licenses and dependencies

Chrome、Firefox 扩展及 Windows 配套组件的自有代码均在本仓库公开，采用 **GPL-3.0-or-later**。第三方组件保留各自许可与署名。浏览器源码为可读 JavaScript、HTML、CSS，直接复制到扩展包。

The project code for the Chrome and Firefox extensions and the Windows companion is published in this repository under **GPL-3.0-or-later**. Third-party components retain their licenses and notices. Readable JavaScript, HTML and CSS browser sources are copied directly into extension packages.

| 组件 / Component | 固定版本 / Pinned version | 许可与来源 / License and source |
| --- | --- | --- |
| flag-icons | 7.6.0 | MIT · `assets/FLAG-ICONS-LICENSE` · [Source](https://github.com/lipis/flag-icons) |
| CPython embedded, Windows amd64 | 3.13.17 | PSF + bundled third-party licenses · `licenses/python` · [Distribution](https://www.python.org/ftp/python/3.13.17/) |
| Xray-core, Windows64 | v26.10.31 | MPL-2.0 · `licenses/xray` · [Source](https://github.com/XTLS/Xray-core/releases/tag/v26.10.31) |
| parse5 / entities | 7.3.0 / 6.0.1 | MIT / BSD-2-Clause · [Chrome license](chrome-extension/v2route-ui/vendor/HTML-PARSER-LICENSE.txt) / [Firefox license](firefox-extension/v2route-ui/vendor/HTML-PARSER-LICENSE.txt) · [Build recipe](vendor-html/README.md) |
| Acorn（离线 PAC 语法解析 / offline PAC syntax parser） | 8.15.0 | MIT · [Chrome license](chrome-extension/v2route-ui/vendor/acorn/LICENSE.txt) / [Firefox license](firefox-extension/v2route-ui/vendor/acorn/LICENSE.txt) · [Source](https://github.com/acornjs/acorn/tree/8.15.0) |
| PyYAML | 6.0.3 | MIT · `licenses/pyyaml` · [Source](https://github.com/yaml/pyyaml/tree/6.0.3) |

<a id="zh-build"></a>

## 中文构建说明

### 环境与步骤

使用 **Windows 10/11 x64、Python 3.13 和 Windows .NET Framework C# 编译器**。在可写源码目录，按顺序运行下方命令；构建会下载固定的官方依赖。每次使用新的输出路径。

### 来源校验

- Python 与 Xray 下载包经 SHA-256 校验。Xray 对应源码、链接模块声明、Go 工具链声明及 SBOM 位于 `licenses/xray`；适配器支持范围见[出站配置说明](docs/OUTBOUND-ADAPTER.md)。
- PyYAML 使用未修改的纯 Python 源码。来源、压缩包及逐文件 SHA-256 记录于 `licenses/pyyaml/PROVENANCE.json`，打包时逐项核验。订阅解析只加载受限节点数据，不执行 YAML 标签、外部提供器或脚本。
- 固定版本 HTML 解析器的重建方法见 [vendor-html/README.md](vendor-html/README.md)。构建生成的 Firefox 包仍需 Mozilla 签名，才能永久安装。

<a id="en-build"></a>

## English build guide

### Environment and steps

Use **Windows 10/11 x64, Python 3.13 and the Windows .NET Framework C# compiler**. Run the commands below in order from a writable source folder. The build downloads pinned official dependencies. Use fresh output paths for every build.

### Source verification

- Python and Xray archives are SHA-256 verified. Xray source references, linked-module notices, Go notices and the SBOM are under `licenses/xray`. See the [outbound adapter guide](docs/OUTBOUND-ADAPTER.md) for supported inputs.
- Unchanged pure-Python PyYAML sources are vendored. Archive and per-file SHA-256 records are in `licenses/pyyaml/PROVENANCE.json` and verified on every package build. Subscription parsing accepts bounded node data and does not execute YAML constructors, external providers or scripts.
- The pinned HTML parser rebuild instructions are in [vendor-html/README.md](vendor-html/README.md). Built Firefox packages require Mozilla signing for permanent installation.

<a id="build-commands"></a>

## 构建命令 / Build commands

```powershell
python build_runtime.py
python build_core.py
python collect_core_notices.py
python build_host.py
python build_setup.py
python prepare_source_bundle.py
python pack_portable.py --output V2Route-local.zip --store-dir browser-packages
```

## 互操作参考 / Interoperability reference

v2rayN 是可选节点来源。适配器开发参考了 v2rayN **7.25.6** 的 `V2rayOutboundService.cs`。

v2rayN is an optional node source. Adapter development referenced `V2rayOutboundService.cs` in v2rayN **7.25.6**. [Source](https://github.com/2dust/v2rayN)
