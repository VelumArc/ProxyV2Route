# 运行环境 / Runtime requirements

当前公开版本 / Current releases: **Chrome 1.2.74 · Firefox 1.2.74 · Windows 配套组件 / companion 1.2.74**

| 项目 / Component | 要求 / Requirement |
| --- | --- |
| Windows | 10 / 11 x64 |
| .NET Framework | 4.5.2+ |
| Chrome | 120+ · [Chrome Web Store](https://chromewebstore.google.com/detail/proxy-v2route/mngpdlmiimigbloccmolkjbcagonijlm) |
| Firefox | 140+ · [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/proxy-v2route/) |

## Windows 配套组件

完整 Windows 包包含 Python、Xray 和 `local.v2route` Native Messaging 宿主。组件按 Windows 用户注册；扩展身份需与宿主白名单匹配，安装目录需长期保留且可写。

导入节点通过随包核心运行。“跟随 v2rayN”需要其本地代理正在运行；可在扩展“设置”选择 v2rayN 文件夹或重新扫描。

安装、升级、扩展加载与停用见[安装说明](../INSTALL.md)。权限和数据处理见[权限说明](PERMISSIONS.md)与[隐私说明](PRIVACY.md)。

## Windows companion

The complete Windows package includes Python, Xray and the `local.v2route` Native Messaging host. Registration is per Windows account. The extension identity must match the host allowlist, and the installation folder must remain writable and available.

Imported nodes run through the bundled core. Follow v2rayN requires its running local proxy. Extension Settings provides folder selection and rescan controls.

See the [installation guide](../INSTALL.md) for setup, upgrades, extension loading and removal. See [permissions](PERMISSIONS.md) and [privacy](PRIVACY.md) for access and data handling details.
