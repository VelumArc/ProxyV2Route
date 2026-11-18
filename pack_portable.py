"""V2Route clean allowlist packager. No state or legacy extension engines."""
import argparse, base64, hashlib, io, json, re, stat, zipfile
from pathlib import Path, PurePosixPath
ROOT=Path(__file__).resolve().parent
FILES=('backend.py','routes.py','route_labels.py','discovery.py','native_host.py','NativeHost.cs','build_host.py','build_runtime.py','build_core.py','install_host.py','portable_install.py','setup.py','pack_portable.py','prepare_source_bundle.py','assemble_public_repo.py','product.json','extension-id.json','install.cmd','uninstall.cmd','select-v2.cmd','README.md','SOURCES.md','LICENSE-GPL-3.0.txt','docs/RUNTIME-AND-INSTALLATION.md','docs/NODE-IMPORT.md')
FILES += ('assets/countries.json','outbound_adapter.py','docs/OUTBOUND-ADAPTER.md','collect_core_notices.py')
FILES += ('INSTALL.md','docs/index.html','docs/privacy.html','docs/site.css','docs/.nojekyll','docs/PRIVACY.md','docs/PERMISSIONS.md')
FILES += ('docs/IP-TOOLS.md','docs/brand-icon.png')
FILES += ('README.en.md','README.zh-TW.md','README.ja.md','README.es.md','README.de.md','docs/site.js','docs/assets/README.md','docs/assets/workspace-zh.png','docs/assets/workspace-en.png','docs/assets/aurora-wave.svg')
FILES += ('SetupLauncher.cs','build_setup.py','network_diagnostics.py','upgrade_install.py')
FILES += ('proxy_import_formats.py','core_manager.py','system_proxy.py')
FILES += ('explicit_chain.py','chain_probe.py','docs/WEBSITE-CATALOG.md')
FILES += ('folder_browser.py',)
FILES += ('profile_bundle.py',)
FILES += ('node_measure.py','library_store.py','subscriptions.py','subscription_fetch.py','subscription_formats.py')
FILES += ('vendor-html/package.json','vendor-html/package-lock.json','vendor-html/entry.js','vendor-html/build.mjs','vendor-html/README.md')
OPTIONAL_SOURCE=('node_import.py','render_ui_icons.py')
EXT_ROOT=('manifest.json','v2route-background.js','v2route-library.js','v2route-tool-cache.js','v2route-validation.js','LICENSE','COPYING','NOTICES.md','v2route-assets/FLAG-ICONS-LICENSE','v2route-assets/PROVENANCE.json')
# Explicit locales contain manifest descriptions and bundled UI translations.
LOCALES=('ar am bg bn ca cs da de el en en_AU en_GB en_US es es_419 et fa fi fil fr gu he hi hr hu id it ja kn ko lt lv ml mr ms nl no pl pt_BR pt_PT ro ru sk sl sr sv sw ta te th tr uk vi zh_CN zh_TW').split()
EXT_TREES=('v2route-ui','v2route-assets/flags',*(f'_locales/{code}' for code in LOCALES))
# Source artwork and Windows installer ICO input are not browser runtime assets.
EXT_BUILD_ASSETS=('v2route-ui/icons/brand-toolbar.png','v2route-ui/icons/icon-256.png')
BANNED_PARTS={'data','private','receipts','__pycache__','node_modules','.git','build-cache','firefox-tool-cache','firefox-upstream','store-listing','screenshots'}
BANNED_FILES={'settings.json','v2-location.json','guiNDB.db','guiNConfig.json','control.key','auth.json','cookies.sqlite','Preferences','Secure Preferences','Login Data','Cookies','History','logins.json','key4.db','capture-receipt.json','REVIEWER-NOTES.md','REPOSITORY-README.md','LISTING.md'}
def digest(data):return hashlib.sha256(data).hexdigest()
def read_json(path):return json.loads(path.read_text(encoding='utf-8'))

def release_version():
    """Reject mixed release identities before producing any distributable."""
    versions={name:read_json(ROOT/name).get('version') for name in
              ('product.json','chrome-extension/manifest.json','firefox-extension/manifest.json')}
    declarations=re.findall(r'\bconst\s+string\s+Version\s*=\s*"([^"]+)"\s*;',
                            (ROOT/'SetupLauncher.cs').read_text(encoding='utf-8-sig'))
    if len(declarations)!=1:raise RuntimeError('Installer version declaration is missing or ambiguous')
    versions['SetupLauncher.cs']=declarations[0]
    version=versions['product.json']
    if not isinstance(version,str) or not re.fullmatch(r'(?:0|[1-9]\d{0,4})(?:\.(?:0|[1-9]\d{0,4})){0,3}',version):
        raise RuntimeError('Invalid product release version')
    if not any(int(part) for part in version.split('.')) or any(int(part)>65535 for part in version.split('.')):
        raise RuntimeError('Invalid product release version')
    if any(value!=version for value in versions.values()):
        raise RuntimeError('Release version mismatch / 产品、双浏览器与安装器版本不一致')
    return version
def validate_export_name(name):
    path=PurePosixPath(name)
    if not name or path.is_absolute() or '\\' in name or ':' in name or any(part in ('','..','.') for part in name.split('/')):
        raise RuntimeError('Invalid export path: '+name)
    if {part.casefold() for part in path.parts}&BANNED_PARTS or path.name.casefold() in {n.casefold() for n in BANNED_FILES} or path.suffix.lower() in ('.pyc','.log','.db','.sqlite'):
        raise RuntimeError('State/internal material excluded / 禁止导出状态和内部材料: '+name)
    return path

def safe_file(path):
    rel=path.relative_to(ROOT)
    validate_export_name(rel.as_posix())
    for parent in [path,*path.parents]:
        if parent==ROOT:break
        if parent.is_symlink() or getattr(parent.lstat(),'st_file_attributes',0)&stat.FILE_ATTRIBUTE_REPARSE_POINT:
            raise RuntimeError('Reparse point excluded / 禁止打包链接: '+str(rel))
    if not path.resolve(strict=True).is_relative_to(ROOT.resolve(strict=True)):raise RuntimeError('Path escapes package: '+str(rel))
    return rel.as_posix(),path.read_bytes()
def yaml_sources():
    record=read_json(ROOT/'licenses/pyyaml/PROVENANCE.json')
    if record.get('version')!='6.0.3' or record.get('license')!='MIT':raise RuntimeError('Unexpected YAML dependency')
    expected={name for name in record['files'] if name.startswith('vendor_yaml/')}
    actual={p.relative_to(ROOT).as_posix() for p in (ROOT/'vendor_yaml').glob('*.py')}
    if expected!=actual:raise RuntimeError('YAML source inventory changed')
    payload={}
    for name,digest_expected in record['files'].items():
        if not (name in expected or name=='licenses/pyyaml/LICENSE'):raise RuntimeError('Unexpected YAML dependency path')
        key,body=safe_file(ROOT/name)
        if digest(body)!=digest_expected:raise RuntimeError('YAML source checksum changed: '+name)
        payload[key]=body
    key,body=safe_file(ROOT/'licenses/pyyaml/PROVENANCE.json');payload[key]=body
    return payload
def extension_files(browser):
    folder=ROOT/(browser+'-extension');payload={}
    for name in EXT_ROOT:
        path=folder/name
        if path.is_file():payload[name]=safe_file(path)[1]
    for tree in EXT_TREES:
        for path in sorted((folder/tree).rglob('*')):
            if path.is_file() and path.suffix.lower() in ('.js','.html','.css','.json','.svg','.png','.txt') and not path.name.startswith(('test-','test_')):
                name=path.relative_to(folder).as_posix()
                if name not in EXT_BUILD_ASSETS:payload[name]=safe_file(path)[1]
    manifest=json.loads(payload['manifest.json']);background=manifest['background']
    entries=[background.get('service_worker')] if browser=='chrome' else background.get('scripts',[])
    entries += [manifest['action']['default_popup'],manifest['options_ui']['page']]
    entries += list(manifest.get('icons',{}).values())
    for entry in entries:
        if entry not in payload:raise RuntimeError('Missing packaged entry: '+str(entry))
    if 'local.v2route' not in payload['v2route-background.js'].decode():raise RuntimeError('Wrong native host')
    if any(n.startswith(('js/','css/','lib/','vendor/','popup/')) for n in payload):raise RuntimeError('Legacy engine excluded')
    return payload,manifest
def archive_bytes(payload,prefix=''):
    output=io.BytesIO()
    with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
        for name,data in sorted(payload.items()):
            info=zipfile.ZipInfo(prefix+name,date_time=(2026,11,11,0,0,0))
            info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16
            z.writestr(info,data,compress_type=zipfile.ZIP_DEFLATED,compresslevel=9)
    with zipfile.ZipFile(io.BytesIO(output.getvalue())) as z:
        if z.testzip():raise RuntimeError('ZIP CRC failed')
        for name,data in payload.items():
            if z.read(prefix+name)!=data:raise RuntimeError('ZIP verification failed: '+name)
    return output.getvalue()
def validate_browser_identities(product,chrome,firefox):
    from native_host import extension_ids
    identity=read_json(ROOT/'extension-id.json');identifiers=extension_ids(ROOT)
    public_key=base64.b64decode(chrome['key'],validate=True)
    chrome_id=''.join(chr(ord('a')+int(n,16)) for n in digest(public_key)[:32])
    if chrome_id!=product['chrome_id'] or identifiers[0]!=chrome_id or identity.get('key')!=chrome['key']:
        raise RuntimeError('Chrome ID/key mismatch')
    if len(identifiers)!=2:raise RuntimeError('Chrome Web Store identity is missing')
    if firefox['browser_specific_settings']['gecko']['id']!=product['firefox_id']:raise RuntimeError('Firefox ID mismatch')
    if chrome['version']!=firefox['version']:raise RuntimeError('Version mismatch')

def collect():
    release_version()
    payload={}
    def add(path):
        name,data=safe_file(path);payload[name]=data
    for name in FILES:add(ROOT/name)
    for name in OPTIONAL_SOURCE:
        if (ROOT/name).is_file():add(ROOT/name)
    payload.update(yaml_sources())
    for name in ('native/V2RouteHost.exe','native/V2RouteHost.exe.config'):add(ROOT/name)
    for name in ('V2Route-Setup.exe','licenses/setup-build.json'):add(ROOT/name)
    setup=read_json(ROOT/'licenses/setup-build.json')
    if digest(payload[setup['launcher']])!=setup['sha256'] or digest(payload[setup['source']])!=setup['source_sha256']:
        raise RuntimeError('Setup helper/source checksum failed')
    from build_setup import branding
    if setup.get('build_script')!='build_setup.py' or setup.get('build_script_sha256')!=digest(payload['build_setup.py']) or setup.get('branding')!=branding()[1]:
        raise RuntimeError('Setup branding/build inputs changed; rebuild the installer')
    for tree in ('licenses/python','licenses/xray'):
        for path in sorted((ROOT/tree).rglob('*')):
            if path.is_file():add(path)
    for name in ('licenses/native-build.json','assets/FLAG-ICONS-LICENSE','sources/V2Route-source.zip','sources/SOURCE-MANIFEST.json'):add(ROOT/name)
    runtime=read_json(ROOT/'licenses/python/PROVENANCE.json')
    for name,expected in runtime['files'].items():
        key,data=safe_file(ROOT/'runtime'/name)
        if digest(data)!=expected:raise RuntimeError('Python checksum failed: '+name)
        payload[key]=data
    core=read_json(ROOT/'licenses/xray/PROVENANCE.json')
    for name,expected in core['files'].items():
        key,data=safe_file(ROOT/name)
        if digest(data)!=expected:raise RuntimeError('Xray checksum failed: '+name)
        payload[key]=data
    dependencies=read_json(ROOT/'licenses/xray/DEPENDENCY-MANIFEST.json')
    from collect_core_notices import build_metadata
    toolchain,_,linked=build_metadata(payload['cores/xray/xray.exe'])
    actual={(m['module'],m['version'],m['go_sum']) for m in linked}
    documented={(m['module'],m['version'],m['go_sum']) for m in dependencies['modules']}
    if not dependencies['complete'] or dependencies['binary_sha256']!=digest(payload['cores/xray/xray.exe']) or dependencies['go_version']!=toolchain or actual!=documented:
        raise RuntimeError('Xray dependency notices do not match the linked binary')
    for module in dependencies['modules']:
        if not module['go_sum_verified'] or not module['notices']:raise RuntimeError('Unverified dependency notice')
        for note in module['notices']:
            key='licenses/xray/'+note['file']
            if key not in payload or digest(payload[key])!=note['sha256']:raise RuntimeError('Dependency notice checksum failed: '+key)
    for note in dependencies['toolchain']:
        key='licenses/xray/'+note['file']
        if key not in payload or digest(payload[key])!=note['sha256']:raise RuntimeError('Go notice checksum failed: '+key)
    native=read_json(ROOT/'licenses/native-build.json')
    if digest(payload[native['launcher']])!=native['sha256'] or digest(payload[native['source']])!=native['source_sha256']:raise RuntimeError('Native launcher/source checksum failed')
    product=read_json(ROOT/'product.json')
    if product['product_id']!='v2route' or product['host_name']!='local.v2route':raise RuntimeError('Wrong identity')
    chrome,cm=extension_files('chrome');firefox,fm=extension_files('firefox')
    validate_browser_identities(product,cm,fm)
    for browser,files in (('chrome',chrome),('firefox',firefox)):
        for name,data in files.items():payload[browser+'-extension/'+name]=data
        # The complete desktop bundle retains matching build inputs, even
        # though the browser-only ZIP/XPI excludes these two source assets.
        for name in EXT_BUILD_ASSETS:add(ROOT/(browser+'-extension')/name)
    source=read_json(ROOT/'sources/SOURCE-MANIFEST.json')
    if digest(payload['sources/V2Route-source.zip'])!=source['sha256']:raise RuntimeError('Source archive checksum failed')
    for name,expected in source['files'].items():
        if name not in payload or digest(payload[name])!=expected:
            raise RuntimeError('Sources changed; regenerate source archive / 源码已变化，请重建源码包: '+name)
    version=cm['version']
    packages={f'Proxy-V2Route-Chrome-{version}.zip':archive_bytes(chrome),f'Proxy-V2Route-Firefox-{version}-unsigned.xpi':archive_bytes(firefox)}
    payload.update(packages)
    manifest={'format':1,'product':product,'version':version,'firefox_signed':False,'store_status':product['store_status'],'runtime':runtime['version'],'core':core['version'],'files':{n:{'sha256':digest(b),'bytes':len(b)} for n,b in sorted(payload.items())}}
    payload['PACKAGE-MANIFEST.json']=(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n').encode()
    return payload,manifest,packages
def write_new(path,data):
    path=path.resolve();path.parent.mkdir(parents=True,exist_ok=True)
    with path.open('xb') as f:f.write(data)
    if digest(path.read_bytes())!=digest(data):raise RuntimeError('Written archive checksum mismatch')
    return {'path':str(path),'bytes':len(data),'sha256':digest(data)}
def chrome_store_archive(local_archive):
    with zipfile.ZipFile(io.BytesIO(local_archive)) as archive:
        files={name:archive.read(name) for name in archive.namelist()}
    manifest=json.loads(files['manifest.json'])
    manifest.pop('key',None)
    files['manifest.json']=(json.dumps(manifest,ensure_ascii=False,sort_keys=True,indent=2,allow_nan=False)+'\n').encode('utf-8')
    return archive_bytes(files)

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--output',type=Path);parser.add_argument('--store-dir',type=Path)
    parser.add_argument('--chrome-store-output',type=Path,metavar='NEWFILE',help='Write a Chrome Web Store ZIP without manifest.key; local packages retain their key.')
    args=parser.parse_args();payload,manifest,packages=collect()
    result={'ok':True,'files':len(payload),'version':manifest['version'],'firefox_signed':False,'written':[]}
    if args.output:result['written'].append(write_new(args.output,archive_bytes(payload,'V2Route/')))
    if args.store_dir:
        for name,data in packages.items():result['written'].append(write_new(args.store_dir/name,data))
    if args.chrome_store_output:
        name=f"Proxy-V2Route-Chrome-{manifest['version']}.zip"
        written=write_new(args.chrome_store_output,chrome_store_archive(packages[name]));written['purpose']='chrome-web-store'
        result['written'].append(written)
    print(json.dumps(result,ensure_ascii=False,indent=2))
if __name__=='__main__':main()
