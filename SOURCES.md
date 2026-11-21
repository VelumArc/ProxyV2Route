# 来源与构建 / Sources and builds

[中文构建说明](#zh-build) · [English build guide](#en-build) · [安装成品 / Install a release](INSTALL.md)

本页面向从源码构建的开发者。普通安装请使用[安装说明](INSTALL.md)。

This guide is for developers building from source. For regular installation, use the [installation guide](INSTALL.md).

## 源码导航 / Source map

| 文件或目录 / Files | 用途 / Purpose |
| --- | --- |
| `chrome-extension/` · `firefox-extension/` | 浏览器界面与代理控制 / Browser UI and proxy control |
| `backend.py` | 本机独立代理入口与线路绑定 / Independent local proxy endpoints and route bindings |
| `core_manager.py` | 固定版本核心的安装与修复 / Install and repair the pinned core |
| `discovery.py` | 定位可选的本机 v2rayN / Locate the optional local v2rayN client |
| `library_store.py` | 本机节点库的持久化与并发写入保护 / Local node-library storage and write coordination |
| `build_*.py` · `pack_portable.py` | 构建组件与生成发布包 / Build components and release packages |
| `prepare_source_bundle.py` · `assemble_public_repo.py` | 生成源码包与可公开的源码目录 / Prepare source archives and the public source tree |

## 许可与依赖 / Licenses and dependencies

Proxy V2Route 自有代码采用 **GPL-3.0-or-later**，第三方组件保留各自许可与署名。浏览器源码为可读 JavaScript、HTML、CSS，直接复制到扩展包。

Proxy V2Route-authored code uses **GPL-3.0-or-later**. Third-party components retain their licenses and notices. Readable JavaScript, HTML and CSS browser sources are copied directly into extension packages.

| 组件 / Component | 固定版本 / Pinned version | 许可与来源 / License and source |
| --- | --- | --- |
| flag-icons | 7.6.0 | MIT · `assets/FLAG-ICONS-LICENSE` · [Source](https://github.com/lipis/flag-icons) |
| CPython embedded, Windows amd64 | 3.13.17 | PSF + bundled third-party licenses · `licenses/python` · [Distribution](https://www.python.org/ftp/python/3.13.17/) |
| Xray-core, Windows64 | v26.10.31 | MPL-2.0 · `licenses/xray` · [Source](https://github.com/XTLS/Xray-core/releases/tag/v26.10.31) |
| parse5 / entities | 7.3.0 / 6.0.1 | MIT / BSD-2-Clause · `v2route-ui/vendor/HTML-PARSER-LICENSE.txt` · [Build recipe](vendor-html/README.md) |
| Acorn（离线 PAC 语法解析 / offline PAC syntax parser） | 8.15.0 | MIT · `v2route-ui/vendor/acorn/LICENSE.txt` · [Source](https://github.com/acornjs/acorn/tree/8.15.0) |
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
