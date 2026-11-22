<p align="center">
  <img src="docs/brand-icon.png" alt="Proxy V2Route logo" width="100" height="100">
</p>
<h1 align="center">Proxy V2Route</h1>
<p align="center"><strong>Your browser. Your own route.</strong></p>
<p align="center">Manage browser proxy profiles, nodes and connection checks in one workspace.</p>
<p align="center"><a href="README.md">简体中文</a> · <strong>English</strong> · <a href="README.zh-TW.md">繁體中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.es.md">Español</a> · <a href="README.de.md">Deutsch</a></p>
<p align="center"><a href="https://velumarc.github.io/ProxyV2Route/?lang=en">Project website</a> · <a href="INSTALL.md">Installation</a> · <a href="SOURCES.md#source-map">Source map</a> · <a href="https://github.com/VelumArc/ProxyV2Route/issues">Report an issue</a></p>

---

**Published versions:** Chrome extension 1.2.72 · Firefox extension 1.2.74 · Windows companion 1.2.74

**Requirements:** Windows 10/11 x64 · .NET Framework 4.5.2+ · Chrome 120+ / Firefox 140+

## Get started in three steps

1. **Install the browser extension.** Get it from the [Chrome Web Store](https://chromewebstore.google.com/detail/proxy-v2route/mngpdlmiimigbloccmolkjbcagonijlm) or [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/proxy-v2route/).
2. **[Install the Windows companion — required for node routes](https://github.com/VelumArc/ProxyV2Route/blob/main/INSTALL.md#windows-companion).** The installer includes Python, Xray and MTR diagnostics; no separate installation is needed. v2rayN is only an optional node source or Follow endpoint.
3. **Check the connection, import and connect.** Open extension **Settings** and click **Check again**. Once connected, import your own nodes or subscriptions, create a profile and click **Apply profile**, then check the exit IP in IP Tools.

> The Windows installer is currently unsigned. This project does not provide proxy servers or subscriptions. [Complete package and source](https://github.com/VelumArc/ProxyV2Route/releases/tag/v1.2.74)

[![Proxy V2Route profiles workspace](docs/assets/workspace-en.png)](docs/assets/workspace-en.png)

<sub>Actual product interface with synthetic demo profiles and no personal node data. Select the image to view full size.</sub>

## Features

- **Profiles:** node routes, manual HTTP(S)/SOCKS proxies, automatic rules and PAC, with Direct, System and Follow v2rayN modes.
- **Routing rules:** assign domains, wildcard domains, IP addresses or IP:port pairs to a node or existing profile; separate multiple addresses with commas in one row.
- **Nodes and subscriptions:** import, search, hide, group and reorder nodes; optionally schedule subscription updates.
- **Predecessors and chains:** basic, predecessor and chain modes retain separate configurations, with per-path latency checks and cancellation.
- **Network checks:** node measurements, exit IP, download/upload, Ping, TCPing, MTR and website reachability.
- **Interface and portability:** 55 language/region options, light/dark themes and profile exports with their nodes and paths. Some interface translations remain machine-generated and have not been reviewed by a person.

Direct and System profiles share their saved rules with the toolbar shortcuts. Routing checks bypass addresses first, then the first matching policy, then the profile’s default route.

Save records edits. Apply profile saves and switches immediately.

[Installation, upgrades and backups](INSTALL.md) · [Build from source](SOURCES.md#en-build) · [Current source ZIP](https://github.com/VelumArc/ProxyV2Route/archive/refs/heads/main.zip)

## Privacy and support

Settings and node credentials stay on your device and are not sent to the developer. Network tools contact their providers. Opening the popup or IP Tools, or successfully switching routes, triggers bounded exit-IP checks through ipify. Profile backups contain node credentials and are **not encrypted**. Keep them private. Diagnostic results do not guarantee website, account or regional-service access.

[Privacy](docs/PRIVACY.md) · [Browser permissions](docs/PERMISSIONS.md) · [Issues](https://github.com/VelumArc/ProxyV2Route/issues). Include your version and reproduction steps, and remove credentials and personal data. Send sensitive reports to **1313333@gmail.com**.

Project code uses [GPL-3.0-or-later](LICENSE-GPL-3.0.txt). Third-party components retain their licenses and attribution; see [SOURCES.md](SOURCES.md) and the bundled notices.
