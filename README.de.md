<p align="center">
  <img src="docs/brand-icon.png" alt="Proxy V2Route Logo" width="100" height="100">
</p>
<h1 align="center">Proxy V2Route</h1>
<p align="center"><strong>Dein Browser. Deine eigene Route.</strong></p>
<p align="center">Verwalte Proxy-Profile, Knoten und Verbindungstests für deinen Browser an einem Ort.</p>
<p align="center"><a href="README.md">简体中文</a> · <a href="README.en.md">English</a> · <a href="README.zh-TW.md">繁體中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.es.md">Español</a> · <strong>Deutsch</strong></p>
<p align="center"><a href="https://velumarc.github.io/ProxyV2Route/?lang=en">Website (Chinesisch/Englisch)</a> · <a href="INSTALL.md">Installation</a> · <a href="https://github.com/VelumArc/ProxyV2Route/issues">Problem melden</a></p>

---

**Veröffentlichte Versionen:** Chrome-Erweiterung 1.2.72 · Firefox-Erweiterung 1.2.73 · Windows-Komponente 1.2.74

**Voraussetzungen:** Windows 10/11 x64 · .NET Framework 4.5.2+ · Chrome 120+ / Firefox 140+

## In drei Schritten starten

1. **Browser-Erweiterung installieren.** Installiere sie aus dem [Chrome Web Store](https://chromewebstore.google.com/detail/proxy-v2route/mngpdlmiimigbloccmolkjbcagonijlm) oder von [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/proxy-v2route/).
2. **[Windows-Begleitkomponente installieren — für Knotenverbindungen erforderlich](https://github.com/VelumArc/ProxyV2Route/blob/main/INSTALL.md#windows-companion).** Python, Xray und MTR-Diagnose sind enthalten; eine separate Installation ist nicht nötig. v2rayN dient nur optional als Knotenquelle oder laufender Endpunkt.
3. **Verbindung prüfen, importieren und verbinden.** Öffne die Einstellungen der Erweiterung und prüfe die Verbindung erneut. Sobald die Komponente verbunden ist, importiere deine Knoten oder Abonnements, erstelle ein Profil und wende es an. Prüfe anschließend die Ausgangs-IP in den IP-Werkzeugen.

> Der Windows-Installer ist derzeit nicht codesigniert. Dieses Projekt stellt keine Proxy-Server oder Abonnements bereit. [Komplettpaket und Quellcode](https://github.com/VelumArc/ProxyV2Route/releases/tag/v1.2.74)

[![Profilansicht von Proxy V2Route](docs/assets/workspace-en.png)](docs/assets/workspace-en.png)

<sub>Tatsächliche englische Oberfläche mit fiktiven Demo-Profilen, ohne persönliche Knotendaten. Klicke auf das Bild für die volle Größe.</sub>

## Funktionen

- **Profile:** Knotenverbindungen, manuelle HTTP(S)/SOCKS-Proxys, automatische Regeln und PAC; mit Direktverbindung, System-Proxy oder dem laufenden v2rayN-Endpunkt.
- **Routingregeln:** Ordne Domains, Wildcard-Domains, IP-Adressen oder IP:Port-Paare einem Knoten oder vorhandenen Profil zu; trenne mehrere Adressen in einer Zeile durch Kommas.
- **Knoten und Abonnements:** importieren, suchen, ausblenden, gruppieren und sortieren; regelmäßige Abonnement-Aktualisierungen sind optional.
- **Vorgeschaltete Proxys und Ketten:** Basis-, vorgeschalteter Proxy- und Kettenmodus behalten getrennte Einstellungen. Jeder bietet Latenztests für einzelne Pfadabschnitte und eine Stoppfunktion.
- **Netzwerkdiagnose:** Knotenmessungen, Ausgangs-IP, Download/Upload, Ping, TCPing, MTR und Erreichbarkeit von Websites.
- **Oberfläche und Umzug:** 55 Sprach-/Regionsoptionen, helle/dunkle Designs und Profilexport mit Knoten und Routen. Einige Übersetzungen der Oberfläche sind maschinell erstellt und noch nicht manuell geprüft.

Direktverbindung und System-Proxy verwenden dieselben gespeicherten Regeln wie ihre Schaltflächen in der Symbolleiste. Zuerst gelten Ausnahmen, dann die erste passende Proxyregel und zuletzt die Standardroute des Profils.

„Speichern“ sichert die Änderungen. „Profil anwenden“ speichert sie und wechselt sofort zur neuen Route.

[Installation, Updates und Sicherungen (Chinesisch/Englisch)](INSTALL.md) · [Aus dem Quellcode bauen](SOURCES.md) · [Aktuelles Quellcode-ZIP](https://github.com/VelumArc/ProxyV2Route/archive/refs/heads/main.zip)

## Datenschutz und Hilfe

Einstellungen und Zugangsdaten der Knoten bleiben auf deinem Gerät und werden nicht an den Entwickler gesendet. Netzwerkwerkzeuge kontaktieren ihre jeweiligen Anbieter. Beim Öffnen des Popups oder IP-Bereichs und nach einem erfolgreichen Routenwechsel erfolgen begrenzte Prüfungen der Ausgangs-IP über ipify. Profilsicherungen enthalten Zugangsdaten und sind **nicht verschlüsselt**. Bewahre sie sicher auf. Testergebnisse garantieren keinen Zugriff auf Websites, Konten oder regionale Dienste.

[Datenschutz](docs/PRIVACY.md) · [Browser-Berechtigungen](docs/PERMISSIONS.md) · [Probleme melden](https://github.com/VelumArc/ProxyV2Route/issues). Nenne die Version und die Schritte zur Reproduktion. Entferne Zugangsdaten und persönliche Informationen; vertrauliche Meldungen bitte an **1313333@gmail.com**.

Der Projektcode steht unter [GPL-3.0-or-later](LICENSE-GPL-3.0.txt). Komponenten Dritter behalten ihre Lizenzen und Urheberhinweise; siehe [SOURCES.md](SOURCES.md) und die mitgelieferten Hinweise.
