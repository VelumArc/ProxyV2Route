<p align="center">
  <img src="docs/brand-icon.png" alt="Proxy V2Route ロゴ" width="100" height="100">
</p>
<h1 align="center">Proxy V2Route</h1>
<p align="center"><strong>ブラウザーに、自分だけの接続経路を。</strong></p>
<p align="center">ブラウザーのプロキシプロファイル、ノード、接続テストを一か所で管理します。</p>
<p align="center"><a href="README.md">简体中文</a> · <a href="README.en.md">English</a> · <a href="README.zh-TW.md">繁體中文</a> · <strong>日本語</strong> · <a href="README.es.md">Español</a> · <a href="README.de.md">Deutsch</a></p>
<p align="center"><a href="https://velumarc.github.io/ProxyV2Route/?lang=en">公式サイト（中国語／英語）</a> · <a href="INSTALL.md">インストール</a> · <a href="https://github.com/VelumArc/ProxyV2Route/issues">問題を報告</a></p>

---

**1.2.73** · Windows 10/11 x64 · .NET Framework 4.5.2+ · Chrome 120+ / Firefox 140+

> [Windows インストールガイド](https://github.com/VelumArc/ProxyV2Route/blob/main/INSTALL.md) · [完全パッケージとソースコード](https://github.com/VelumArc/ProxyV2Route/releases/tag/v1.2.73)。インストーラーにはローカル連携コンポーネントと Xray が含まれます。現在、コード署名はありません。Chrome 版は [Chrome ウェブストア](https://chromewebstore.google.com/detail/proxy-v2route/mngpdlmiimigbloccmolkjbcagonijlm) からインストールできます。Firefox 版は未署名で、常用には Mozilla による署名が必要です。

直接接続とシステムプロキシはプロファイル一覧で編集でき、ツールバーからも同じルールが適用されます。ノードと手動プロキシの詳細設定では、除外先を優先し、次に最初に一致したプロキシルールを使います。どちらにも一致しない場合は既定の経路を使います。

下部の「保存」は変更を記録し、「プロファイルを適用」は保存と切り替えを同時に行います。自分で作成したプロファイルは右上から削除できます。

[![Proxy V2Route のプロファイル画面](docs/assets/workspace-en.png)](docs/assets/workspace-en.png)

<sub>架空のデモプロファイルを使用した実際の英語画面です。個人のノード情報は含みません。画像を選択すると原寸で表示します。</sub>

## 主な機能

- **プロファイル：**ノード経由の接続、手動 HTTP(S)/SOCKS プロキシ、自動ルール、PAC。直接接続、システムプロキシ、v2rayN への追従に切り替えられます。
- **ドメイン別ルーティング：**サイトごとにノードや既存のプロファイルを指定できます。1 行に複数のドメインをカンマ区切りで入力できます。
- **ノードとサブスクリプション：**インポート、検索、非表示、名前付きグループ、並べ替え。必要に応じてサブスクリプションの定期更新を有効にできます。
- **前段プロキシとチェーン：**基本・前段プロキシ・チェーンの設定を個別に保持します。保存でモードを記録し、プロファイルを適用すると経路が切り替わります。各モードで経路ごとの遅延測定と停止ができます。
- **ネットワーク診断：**ノードの速度、出口 IP、ダウンロード／アップロード、Ping、TCPing、MTR、サイトへの到達性を確認できます。
- **表示と移行：**55 の言語・地域オプション、ライト／ダークテーマ、使用ノードと経路を含むプロファイルのエクスポート。追加された UI 翻訳は機械翻訳の初稿で、すべてが人手で確認済みではありません。

## 使い始める

1. インストーラー、または完全パッケージ内の `V2Route-Setup.exe` を実行し、Windows 用の連携コンポーネントと Xray をまとめてインストールします。ノード経由の接続と MTR にはこのコンポーネントが必要です。v2rayN や MTR ツールの別途インストールは不要です。
2. Chrome 版は [Chrome ウェブストア](https://chromewebstore.google.com/detail/proxy-v2route/mngpdlmiimigbloccmolkjbcagonijlm)からインストールできます。ローカルパッケージを使う場合は[インストールガイド](INSTALL.md#chrome)に従ってください。Firefox：`about:debugging` で未署名の XPI または `firefox-extension/manifest.json` を一時的に読み込みます。再起動後は再読み込みが必要です。
3. 自分のノードやサブスクリプションをインポートし、プロファイルを作成して適用します。v2rayN は任意のノード取得元、または追従先として使えます。このプロジェクトはプロキシサーバーやサブスクリプションを提供しません。

[インストール・更新・バックアップ（中国語／英語）](INSTALL.md) · [ソースからビルド](SOURCES.md) · [現在のソース ZIP](https://github.com/VelumArc/ProxyV2Route/archive/refs/heads/main.zip)

## プライバシーとサポート

設定とノードの認証情報は端末内に保存され、開発者には送信されません。ネットワークツールは各サービス提供者に接続します。ポップアップまたは IP 画面を開くと出口 IP を確認します。プロファイルのバックアップには認証情報が含まれ、**暗号化されていません**。安全に保管してください。診断結果はサイト、アカウント、地域限定サービスの利用を保証しません。

[プライバシー](docs/PRIVACY.md) · [ブラウザーの権限](docs/PERMISSIONS.md) · [問題の報告](https://github.com/VelumArc/ProxyV2Route/issues)。バージョンと再現手順を添え、認証情報や個人情報を取り除いてください。機密性の高い報告は **1313333@gmail.com** へ。

プロジェクトのコードは [GPL-3.0-or-later](LICENSE-GPL-3.0.txt) で提供されます。サードパーティーのコンポーネントにはそれぞれのライセンスと著作者表示が適用されます。[SOURCES.md](SOURCES.md) と同梱の通知を参照してください。
