<p align="center">
  <img src="docs/brand-icon.png" alt="Proxy V2Route 标识" width="100" height="100">
</p>
<h1 align="center">Proxy V2Route</h1>
<p align="center"><strong>你的浏览器。你的独立线路。</strong></p>
<p align="center">在一个工作区管理浏览器代理情景、节点与连接检测。</p>
<p align="center"><strong>简体中文</strong> · <a href="README.en.md">English</a> · <a href="README.zh-TW.md">繁體中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.es.md">Español</a> · <a href="README.de.md">Deutsch</a></p>
<p align="center"><a href="https://velumarc.github.io/ProxyV2Route/?lang=zh">项目主页</a> · <a href="INSTALL.md">安装说明</a> · <a href="https://github.com/VelumArc/ProxyV2Route/issues">问题反馈</a></p>

---

**1.2.68** · Windows 10/11 x64 · .NET Framework 4.5.2+ · Chrome 120+ / Firefox 140+

> [Windows 安装器](https://github.com/VelumArc/ProxyV2Route/releases/download/v1.2.68/Proxy-V2Route-Setup-1.2.68-Windows-x64.exe) · [完整包与源码](https://github.com/VelumArc/ProxyV2Route/releases/tag/v1.2.68)。安装器包含本地组件与 Xray，目前未作代码签名。Chrome 版可从[应用商店](https://chromewebstore.google.com/detail/proxy-v2route/mngpdlmiimigbloccmolkjbcagonijlm)安装；Firefox 扩展尚未签名，永久安装需 Mozilla 签名。

直连和系统代理可在情景列表中编辑，工具栏快捷按钮使用同一套规则。节点和手动代理的高级选项支持绕过地址与指定代理策略。规则优先匹配绕过地址，再按顺序选择第一个命中的策略，最后使用情景的默认线路。

底部「保存」记录修改，「应用情景」保存并立即切换。自建情景可在右上角删除。

[![Proxy V2Route 情景工作区](docs/assets/workspace-zh.png)](docs/assets/workspace-zh.png)

<sub>实际产品界面，使用虚构演示情景，不含个人节点数据。点击查看原图。</sub>

## 功能

- **情景切换：**节点代理、手动 HTTP(S)/SOCKS 代理、自动规则与 PAC；可切换直连、系统代理或跟随 v2rayN。
- **域名分流：**指定网站使用节点或已有情景；同一行可用逗号填写多个域名。
- **节点与订阅：**导入、搜索、隐藏、命名分组与排序；可按需开启订阅定时更新。
- **前置与链路：**基础、前置和链式代理分别记住配置；切换模式后保存当前线路，三种模式均可逐段检测延迟并停止检测。
- **网络检测：**节点测速、出口 IP、下载／上传、Ping、TCPing、MTR 与网站连通检测。
- **界面与迁移：**55 个语言／地区选项、深浅主题；导出情景及所用节点与链路。新增界面译文为机器翻译初稿，尚未全部经过人工审校。

## 开始使用

1. 运行安装器，或完整包中的 `V2Route-Setup.exe`，一次安装 Windows 本地组件与 Xray。节点线路与 MTR 需要该组件；无需另装 v2rayN 或 MTR 工具。
2. Chrome：解压本地 Chrome 包，在 `chrome://extensions` 开启开发者模式并加载包含 `manifest.json` 的目录。Firefox：在 `about:debugging` 临时加载未签名 XPI 或 `firefox-extension/manifest.json`；重启后需重新加载。
3. 导入自己的节点或订阅，创建情景并应用。v2rayN 仅是可选节点来源或“跟随”入口；本项目不提供代理服务器或订阅。

[安装、升级与备份](INSTALL.md) · [从源码构建](SOURCES.md) · [当前源码 ZIP](https://github.com/VelumArc/ProxyV2Route/archive/refs/heads/main.zip)

## 隐私与支持

配置和节点凭据保存在本机，不上传给开发者。网络工具会联系相应服务商；打开弹窗或 IP 工作区会检查出口 IP。情景备份含节点凭据且**未加密**，请妥善保管。检测结果不保证网站、账号或地区服务可用。

[隐私说明](docs/PRIVACY.md) · [浏览器权限](docs/PERMISSIONS.md) · [问题反馈](https://github.com/VelumArc/ProxyV2Route/issues)。反馈时请提供版本与复现步骤，移除凭据和个人数据；敏感问题联系 **1313333@gmail.com**。

项目代码采用 [GPL-3.0-or-later](LICENSE-GPL-3.0.txt)；第三方组件保留各自许可与署名，详见 [SOURCES.md](SOURCES.md) 和随包声明。
