<p align="center">
  <img src="docs/brand-icon.png" alt="Proxy V2Route 標誌" width="100" height="100">
</p>
<h1 align="center">Proxy V2Route</h1>
<p align="center"><strong>你的瀏覽器。你的獨立路線。</strong></p>
<p align="center">在同一個工作區管理瀏覽器代理情境、節點與連線檢測。</p>
<p align="center"><a href="README.md">简体中文</a> · <a href="README.en.md">English</a> · <strong>繁體中文</strong> · <a href="README.ja.md">日本語</a> · <a href="README.es.md">Español</a> · <a href="README.de.md">Deutsch</a></p>
<p align="center"><a href="https://velumarc.github.io/ProxyV2Route/?lang=zh">專案網站（簡中／英文）</a> · <a href="INSTALL.md">安裝說明</a> · <a href="https://github.com/VelumArc/ProxyV2Route/issues">問題回報</a></p>

---

**1.2.70** · Windows 10/11 x64 · .NET Framework 4.5.2+ · Chrome 120+ / Firefox 140+

> [Windows 安裝程式](https://github.com/VelumArc/ProxyV2Route/releases/download/v1.2.70/Proxy-V2Route-Setup-1.2.70-Windows-x64.exe) · [完整套件與原始碼](https://github.com/VelumArc/ProxyV2Route/releases/tag/v1.2.70)。安裝程式包含本機元件與 Xray，目前未經程式碼簽章。Chrome 版可從[線上應用程式商店](https://chromewebstore.google.com/detail/proxy-v2route/mngpdlmiimigbloccmolkjbcagonijlm)安裝；Firefox 擴充套件尚未簽署，永久安裝需要 Mozilla 簽署。

可在情境清單中編輯直連與系統代理，工具列捷徑會套用相同規則。節點與手動代理的進階選項支援略過位址及指定代理策略。先檢查略過位址，再依序套用第一條符合的策略，其餘使用情境的預設路線。

下方「儲存」保留變更，「套用情境」會儲存並立即切換。自訂情境可在右上角刪除。

[![Proxy V2Route 情境工作區](docs/assets/workspace-zh.png)](docs/assets/workspace-zh.png)

<sub>實際產品的簡體中文介面，使用虛構示範情境，不含個人節點資料。點選查看原圖。</sub>

## 功能

- **情境切換：**節點代理、手動 HTTP(S)/SOCKS 代理、自動規則與 PAC；可切換直接連線、系統代理或跟隨 v2rayN。
- **網域分流：**指定網站使用節點或既有情境；同一列可用逗號填寫多個網域。
- **節點與訂閱：**匯入、搜尋、隱藏、命名群組與排序；可視需要開啟訂閱定時更新。
- **前置與代理鏈：**基礎、前置和鏈式代理分別保留設定；切換模式後儲存目前路線，三種模式皆可逐段檢測延遲並停止檢測。
- **網路檢測：**節點測速、出口 IP、下載／上傳、Ping、TCPing、MTR 與網站連線檢測。
- **介面與移轉：**55 個語言／地區選項、明暗主題；匯出情境及所用節點與代理鏈。新增介面譯文為機器翻譯初稿，尚未全部經過人工校對。

## 開始使用

1. 執行安裝程式或完整套件中的 `V2Route-Setup.exe`，一次安裝 Windows 本機元件與 Xray。節點路線與 MTR 需要此元件；不必另裝 v2rayN 或 MTR 工具。
2. Chrome：解壓縮本機 Chrome 套件，在 `chrome://extensions` 開啟開發人員模式，載入包含 `manifest.json` 的目錄。Firefox：在 `about:debugging` 暫時載入未簽署的 XPI 或 `firefox-extension/manifest.json`；重新啟動後需再次載入。
3. 匯入自己的節點或訂閱，建立情境並套用。v2rayN 僅是選用的節點來源或「跟隨」入口；本專案不提供代理伺服器或訂閱。

[安裝、升級與備份（簡中／英文）](INSTALL.md) · [原始碼建置](SOURCES.md) · [目前原始碼 ZIP](https://github.com/VelumArc/ProxyV2Route/archive/refs/heads/main.zip)

## 隱私與支援

設定和節點憑證保存在本機，不會上傳給開發者。網路工具會連線至各服務提供者；開啟彈出視窗或 IP 工作區會檢查出口 IP。情境備份包含節點憑證且**未加密**，請妥善保管。檢測結果不保證網站、帳號或地區服務可用。

[隱私說明](docs/PRIVACY.md) · [瀏覽器權限](docs/PERMISSIONS.md) · [問題回報](https://github.com/VelumArc/ProxyV2Route/issues)。回報時請提供版本與重現步驟，移除憑證和個人資料；敏感問題請聯絡 **1313333@gmail.com**。

專案程式碼採用 [GPL-3.0-or-later](LICENSE-GPL-3.0.txt)；第三方元件保留各自的授權與署名，詳見 [SOURCES.md](SOURCES.md) 及隨附聲明。
