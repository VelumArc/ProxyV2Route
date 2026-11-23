<p align="center">
  <img src="docs/brand-icon.png" alt="Logotipo de Proxy V2Route" width="100" height="100">
</p>
<h1 align="center">Proxy V2Route</h1>
<p align="center"><strong>Tu navegador. Tu propia ruta.</strong></p>
<p align="center">Gestiona perfiles de proxy, nodos y pruebas de conexión del navegador desde un solo espacio.</p>
<p align="center"><a href="README.md">简体中文</a> · <a href="README.en.md">English</a> · <a href="README.zh-TW.md">繁體中文</a> · <a href="README.ja.md">日本語</a> · <strong>Español</strong> · <a href="README.de.md">Deutsch</a></p>
<p align="center"><a href="https://velumarc.github.io/ProxyV2Route/?lang=en">Sitio web (chino/inglés)</a> · <a href="INSTALL.md">Instalación</a> · <a href="SOURCES.md#source-map">Mapa del código fuente</a> · <a href="https://github.com/VelumArc/ProxyV2Route/issues">Informar de un problema</a></p>

---

**Versiones publicadas:** extensión de Chrome 1.2.74 · extensión de Firefox 1.2.74 · componente de Windows 1.2.74

**Requisitos:** Windows 10/11 x64 · .NET Framework 4.5.2+ · Chrome 120+ / Firefox 140+

## Empieza en tres pasos

1. **Instala la extensión del navegador.** Descárgala desde [Chrome Web Store](https://chromewebstore.google.com/detail/proxy-v2route/mngpdlmiimigbloccmolkjbcagonijlm) o [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/proxy-v2route/).
2. **[Instala el componente de Windows — obligatorio para las rutas mediante nodos](https://github.com/VelumArc/ProxyV2Route/blob/main/INSTALL.md#windows-companion).** El instalador incluye Python, Xray y diagnóstico MTR; no hace falta instalarlos por separado. v2rayN es solo una fuente de nodos o un destino de seguimiento opcional.
3. **Comprueba la conexión, importa y conecta.** Abre la configuración de la extensión y vuelve a comprobar la conexión. Una vez conectado el componente, importa tus nodos o suscripciones, crea un perfil y aplícalo. Comprueba después la IP de salida en las herramientas IP.

> El instalador de Windows no tiene firma de código. Este proyecto no proporciona servidores proxy ni suscripciones. [Paquete completo y código fuente](https://github.com/VelumArc/ProxyV2Route/releases/tag/v1.2.74)

[![Perfiles de Proxy V2Route](docs/assets/workspace-en.png)](docs/assets/workspace-en.png)

<sub>Interfaz real en inglés con perfiles ficticios de demostración, sin datos personales de nodos. Selecciona la imagen para verla a tamaño completo.</sub>

## Funciones

- **Perfiles:** rutas mediante nodos, proxies HTTP(S)/SOCKS manuales, reglas automáticas y PAC; con conexión directa, proxy del sistema o seguimiento de v2rayN.
- **Reglas de enrutamiento:** asigna dominios, dominios con comodines, direcciones IP o pares IP:puerto a un nodo o perfil existente; separa varias direcciones con comas en una fila.
- **Nodos y suscripciones:** importa, busca, oculta, agrupa y ordena nodos; las actualizaciones periódicas de suscripciones son opcionales.
- **Proxies previos y cadenas:** los modos básico, proxy previo y cadena conservan configuraciones independientes. Todos permiten medir la latencia por tramo y detener la prueba.
- **Diagnóstico de red:** mediciones de nodos, IP de salida, descarga/subida, Ping, TCPing, MTR y acceso a sitios web.
- **Interfaz y migración:** 55 opciones de idioma/región, temas claro/oscuro y exportación de perfiles con sus nodos y rutas. Algunas traducciones de la interfaz se han generado automáticamente y aún no se han revisado manualmente.

Los perfiles de conexión directa y del sistema comparten sus reglas guardadas con los accesos de la barra de herramientas. Primero se aplican las exclusiones, después la primera regla coincidente y, por último, la ruta predeterminada del perfil.

«Guardar» conserva los cambios. «Aplicar perfil» los guarda y cambia de ruta al instante.

[Instalación, actualizaciones y copias de seguridad (chino/inglés)](INSTALL.md) · [Compilar desde el código fuente (inglés)](SOURCES.md#en-build) · [ZIP del código fuente actual](https://github.com/VelumArc/ProxyV2Route/archive/refs/heads/main.zip)

## Privacidad y soporte

La configuración y las credenciales de los nodos se guardan en tu equipo y no se envían al desarrollador. Las herramientas de red contactan con sus proveedores. Abrir la ventana emergente o la sección IP, o cambiar de ruta correctamente, inicia comprobaciones limitadas de la IP de salida a través de ipify. Las copias de los perfiles contienen credenciales y **no están cifradas**. Guárdalas de forma segura. Los resultados no garantizan el acceso a sitios, cuentas o servicios regionales.

[Privacidad](docs/PRIVACY.md) · [Permisos del navegador](docs/PERMISSIONS.md) · [Problemas](https://github.com/VelumArc/ProxyV2Route/issues). Incluye la versión y los pasos para reproducir el problema; elimina credenciales y datos personales. Para informes confidenciales: **1313333@gmail.com**.

El código del proyecto utiliza [GPL-3.0-or-later](LICENSE-GPL-3.0.txt). Los componentes de terceros conservan sus licencias y atribuciones; consulta [SOURCES.md](SOURCES.md) y los avisos incluidos.
