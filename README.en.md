<p align="center">
  <img src="docs/brand-icon.png" alt="Proxy V2Route logo" width="100" height="100">
</p>
<h1 align="center">Proxy V2Route</h1>
<p align="center"><strong>Your browser. Your own route.</strong></p>
<p align="center">Manage browser proxy profiles, nodes and connection checks in one workspace.</p>
<p align="center"><a href="README.md">简体中文</a> · <strong>English</strong> · <a href="README.zh-TW.md">繁體中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.es.md">Español</a> · <a href="README.de.md">Deutsch</a></p>
<p align="center"><a href="https://velumarc.github.io/ProxyV2Route/?lang=en">Project website</a> · <a href="INSTALL.md">Installation</a> · <a href="https://github.com/VelumArc/ProxyV2Route/issues">Report an issue</a></p>

---

**1.2.72** · Windows 10/11 x64 · .NET Framework 4.5.2+ · Chrome 120+ / Firefox 140+

> [Windows installer](https://github.com/VelumArc/ProxyV2Route/releases/download/v1.2.72/Proxy-V2Route-Setup-1.2.72-Windows-x64.exe) · [Complete package and source](https://github.com/VelumArc/ProxyV2Route/releases/tag/v1.2.72). The installer includes the local companion and Xray and is currently unsigned. Install the Chrome extension from the [Chrome Web Store](https://chromewebstore.google.com/detail/proxy-v2route/mngpdlmiimigbloccmolkjbcagonijlm); the Firefox add-on is unsigned and requires Mozilla signing for permanent installation.

Edit Direct and System in Profiles. Their toolbar shortcuts apply the same rules. For node and manual profiles, Advanced options checks bypass addresses first, then applies the first matching proxy policy. Remaining requests use the profile’s default route.

In the footer, Save keeps your edits for later. Apply profile saves them and switches immediately. You can delete a custom profile from its top-right corner.

[![Proxy V2Route profiles workspace](docs/assets/workspace-en.png)](docs/assets/workspace-en.png)

<sub>Actual product interface with synthetic demo profiles and no personal node data. Select the image to view full size.</sub>

## Features

- **Profiles:** node routes, manual HTTP(S)/SOCKS proxies, automatic rules and PAC; switch to Direct, System or Follow v2rayN.
- **Domain routing:** send sites through a node or an existing profile; use commas for multiple domains in one row.
- **Nodes and subscriptions:** import, search, hide, name groups and reorder them; optionally schedule subscription updates.
- **Predecessors and chains:** basic, predecessor and chain modes retain separate configurations. Save the selected mode, then apply the profile to use its route; all three offer per-path latency checks and Stop.
- **Network checks:** node measurements, exit IP, download/upload, Ping, TCPing, MTR and website reachability.
- **Interface and portability:** 55 language/region options, light/dark themes and profile exports with their nodes and paths. Newly added interface translations are machine-generated drafts and have not all undergone human review.

## Get started

1. Run the installer or `V2Route-Setup.exe` from the complete package to install the Windows companion and Xray together. Node routes and MTR require this companion; a separate v2rayN or MTR installation is not required.
2. Install for Chrome from the [Chrome Web Store](https://chromewebstore.google.com/detail/proxy-v2route/mngpdlmiimigbloccmolkjbcagonijlm). Follow the [installation guide](INSTALL.md#chrome) to load a local build. Firefox: temporarily load the unsigned XPI or `firefox-extension/manifest.json` at `about:debugging`; reload it after restarting Firefox.
3. Import your own nodes or subscriptions, create a profile and apply it. v2rayN is an optional node source or Follow endpoint; this project does not provide proxy servers or subscriptions.

[Installation, upgrades and backups](INSTALL.md) · [Build from source](SOURCES.md) · [Current source ZIP](https://github.com/VelumArc/ProxyV2Route/archive/refs/heads/main.zip)

## Privacy and support

Settings and node credentials stay on your device and are not sent to the developer. Network tools contact their providers; opening the popup or IP workspace checks your exit IP. Profile backups contain node credentials and are **not encrypted**. Keep them private. Diagnostic results do not guarantee website, account or regional-service access.

[Privacy](docs/PRIVACY.md) · [Browser permissions](docs/PERMISSIONS.md) · [Issues](https://github.com/VelumArc/ProxyV2Route/issues). Include your version and reproduction steps, and remove credentials and personal data. Send sensitive reports to **1313333@gmail.com**.

Project code uses [GPL-3.0-or-later](LICENSE-GPL-3.0.txt). Third-party components retain their licenses and attribution; see [SOURCES.md](SOURCES.md) and the bundled notices.
