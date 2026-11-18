# 来源与构建 / Sources and builds

Proxy V2Route 代码采用 GPL-3.0-or-later，第三方组件保留各自许可与署名。浏览器源码为可读 JavaScript、HTML、CSS，直接复制到扩展包。

V2Route-authored code uses GPL-3.0-or-later. Third-party components retain their licenses and notices. Readable browser sources are copied directly into extension packages.

## 依赖 / Dependencies

| 组件 / Component | 版本 / Version | 许可 / License |
| --- | --- | --- |
| flag-icons | 7.6.0 | MIT，`assets/FLAG-ICONS-LICENSE` · [Source](https://github.com/lipis/flag-icons) |
| CPython embedded, Windows amd64 | 3.13.17 | PSF 及随包第三方许可，`licenses/python` · [Distribution](https://www.python.org/ftp/python/3.13.17/) |
| Xray-core, Windows64 | v26.10.31 | MPL-2.0，`licenses/xray` · [Source](https://github.com/XTLS/Xray-core/releases/tag/v26.10.31) |
| parse5 / entities | 7.3.0 / 6.0.1 | MIT / BSD-2-Clause，`v2route-ui/vendor/HTML-PARSER-LICENSE.txt` · [Build recipe](vendor-html/README.md) |
| Acorn (offline PAC syntax parser / 离线 PAC 语法解析) | 8.15.0 | MIT，`v2route-ui/vendor/acorn/LICENSE.txt` · [Source](https://github.com/acornjs/acorn/tree/8.15.0) |
| PyYAML | 6.0.3 | MIT，`licenses/pyyaml` · [Source](https://github.com/yaml/pyyaml/tree/6.0.3) |

Python 与 Xray 下载包经 SHA-256 校验。Xray 对应源码、链接模块声明、Go 工具链声明及 SBOM 位于 `licenses/xray`，适配器范围见[出站配置说明](docs/OUTBOUND-ADAPTER.md)。

Python and Xray archives are SHA-256 verified. Xray source references, linked-module notices, Go notices and the SBOM are included under `licenses/xray`. See the outbound adapter guide for supported inputs.

订阅解析使用未修改的 PyYAML 纯 Python 源码；来源、压缩包及逐文件 SHA-256 记录于 `licenses/pyyaml/PROVENANCE.json`，打包时逐项核验。只加载受限节点数据，不执行 YAML 标签、外部提供器或脚本。

The unchanged pure-Python PyYAML sources are vendored and verified against the provenance manifest on every package build. Subscription parsing accepts bounded node data and does not execute YAML constructors, external providers or scripts.

## 构建 / Build

使用 Windows 10/11 x64、Python 3.13 和 Windows .NET Framework C# 编译器，在可写源码目录运行下列命令。构建会下载固定官方依赖。

Use Windows 10/11 x64, Python 3.13 and the Windows .NET Framework C# compiler. Run these commands in a writable source folder to fetch pinned dependencies and build matching packages.

```powershell
python build_runtime.py
python build_core.py
python collect_core_notices.py
python build_host.py
python build_setup.py
python prepare_source_bundle.py
python pack_portable.py --output V2Route-local.zip --store-dir browser-packages
```

每次使用新的输出路径。Firefox 永久安装需 Mozilla 签名；HTML 解析器的固定版本重建步骤见 `vendor-html/README.md`。

Use fresh output paths. Permanent Firefox installation requires Mozilla signing. The pinned HTML parser rebuild instructions are in `vendor-html/README.md`.

## 互操作参考 / Interoperability reference

- **本地客户端互操作 / Local-client interoperability:** v2rayN 是可选节点来源；适配器开发参考了 v2rayN 7.25.6 的 `V2rayOutboundService.cs`。v2rayN is an optional node source; adapter development referenced `V2rayOutboundService.cs` in v2rayN 7.25.6. [Source](https://github.com/2dust/v2rayN)
