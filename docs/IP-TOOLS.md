# IP and network tools / IP 与网络工具

- **IP tests / IP 检测**: Globalping supports Ping, Traceroute and MTR from up to three probes, with global, China, Asia, Europe and North America selections. Availability depends on the selected region. Targets default to the current browser exit IP and remain editable.
- **Website tests / 网站检测**: GreatFire checks domains. The local catalog covers 52 public websites in AI, development, video/music, social, mainland and common-service categories. Check only selected visible entries; four requests run concurrently at most.
- **Speed / 测速**: one compact Cloudflare dialog offers download + upload or either direction, HTTP latency, live per-second rates and final averages. Each phase has a 10/50/100 MiB limit. FAST.com remains a separate provider.
- Ping0 report failures offer a gray same-IP source dialog. The dialog has reload and page-maximize controls; maximizing fills the current browser viewport without entering monitor fullscreen. Site verification remains manual; embedded session recovery does not certify that the provider accepted a verification.

网络测试是特定时刻、特定测量路径的结果。网站“已响应”不等于地区解锁；远端探针无法单凭一条超时证明 IP 被墙。关闭弹窗停止本地测试。

情景与代理链配置见[安装说明](../INSTALL.md)，选齐节点后保存并应用。

基础、前置和链式代理都可在连接顺序卡片点击“检测链路”，查看逐段状态和延迟。链路检测使用临时核心测试累计路径，每一段都经过前面的全部代理。红色表示本次路径失败，灰色表示后续未检测；停止后等待当前有时限的探测结束。继承链无法解析时需先修复配置；“跟随 v2rayN”下可先编辑多层链，选择具体落地节点后才能保存或检测。

See the [installation guide](../INSTALL.md) for profile and chain setup. Save a complete chain before applying it. Basic, predecessor and chain modes all provide Test and Stop controls with per-path status and latency in the connection-order card. Diagnostics test each cumulative path from entry to exit; unresolved inherited chains require configuration repair first.
