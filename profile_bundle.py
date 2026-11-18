"""Explicit, bounded migration of profile nodes; never a copy of the local library.

Only the user's requested routes are exported. Credentials belong in this private
native response and the user's backup, never in logs, catalogs or error details.
"""
import hashlib
import json
import re
import sqlite3
import uuid

import library_store as store
import proxy_import_formats as formats
import routes
import subscriptions

MAX_BYTES = 900 * 1024
MAX_NODES = 1500
MAX_BINDINGS = 500
IDENT = re.compile(r'[A-Za-z0-9_-]{1,128}')
RESERVED = {'__proto__', 'constructor', 'prototype', '__defineGetter__',
            '__defineSetter__', 'hasOwnProperty', '__lookupGetter__',
            '__lookupSetter__', 'isPrototypeOf', 'propertyIsEnumerable',
            'toLocaleString', 'toString', 'valueOf'}


def _fail(message):
    raise ValueError(message)


def _encoded(value):
    try:
        return json.dumps(value, ensure_ascii=False, separators=(',', ':'),
                          sort_keys=True, allow_nan=False).encode('utf-8')
    except (TypeError, ValueError, UnicodeError, RecursionError):
        _fail('Invalid backup JSON / 备份 JSON 无效')


def _bounded(value):
    if len(_encoded(value)) > MAX_BYTES:
        _fail('Profile node backup exceeds 900 KiB / 情景节点备份超过 900 KiB 传输上限')


def _request(value, allowed):
    if not isinstance(value, dict) or set(value) - allowed:
        _fail('Invalid profile backup request / 情景备份请求无效')


def _id(value):
    if not isinstance(value, str) or not IDENT.fullmatch(value) or value in RESERVED:
        _fail('Invalid backup node identifier / 备份节点标识无效')
    return value


def _text(value, maximum):
    if (not isinstance(value, str) or not 1 <= len(value) <= maximum or
            not value.strip() or any(ord(c) < 32 or ord(c) == 127 for c in value)):
        _fail('Invalid backup name / 备份名称无效')
    return value


def _route(value):
    if not isinstance(value, str) or not value.startswith('node:'):
        _fail('Select a concrete node before exporting / 导出前请选择具体节点')
    _id(value[5:])
    return value


def _outbound(value):
    # Reject references before validation so neither unsupported fields nor their
    # values enter a diagnostic. Inline certificates/keys remain ordinary data.
    def inspect(item, depth=0):
        if depth > 18:
            _fail('Backup node is too deeply nested / 备份节点嵌套过深')
        if isinstance(item, dict):
            for key, child in item.items():
                if (not isinstance(key, str) or key.lower().endswith(('file', 'filepath')) or
                        key in ('dir', 'interface', 'masterKeyLog', 'dialerProxy', 'outboundTag')):
                    _fail('Node depends on a local file, interface or external route; cannot migrate / 节点依赖本机文件、接口或外部线路，无法迁移')
                inspect(child, depth + 1)
        elif isinstance(item, list):
            if len(item) > 512:
                _fail('Backup node array is too large / 备份节点数组过大')
            for child in item:
                inspect(child, depth + 1)
    inspect(value)
    try:
        return formats.validate_outbound(value)
    except (ValueError, TypeError, KeyError, AttributeError, OverflowError):
        _fail('Node configuration cannot be migrated without data loss / 节点配置无法无损迁移，请检查协议和传输参数')


def _fingerprint(outbound):
    return hashlib.sha256(_encoded(outbound)).hexdigest()


def _record(outbound, name, country=None):
    # The shared URI parser has a shorter label limit; bundle names have already
    # been checked against the backup schema's 256-character limit.
    node = formats.record(outbound)
    node.update(IndexId='local-' + _fingerprint(outbound), Remarks=name)
    if country:
        node['_country'] = country
    return node


def _validate_core(nodes):
    if not nodes:
        return
    if not routes.location().get('core_path'):
        _fail('Install the local core before migrating nodes / 请先安装本地核心，再迁移节点')
    # This writes only a temporary private test configuration; no route starts
    # and no network requests are issued. Errors never contain core output.
    subscriptions._secure()
    subscriptions._validate_nodes({node['IndexId']: node for node in nodes})


def export_bundle(value):
    _request(value, {'bindings'})
    bindings = value.get('bindings')
    if not isinstance(bindings, list) or len(bindings) > MAX_BINDINGS:
        _fail('Too many or invalid profile bindings / 情景绑定无效或超过 500 个')
    checked = []
    seen_keys = set()
    for binding in bindings:
        _request(binding, {'key', 'route', 'predecessor', 'chain'})
        key = _text(binding.get('key'), 128)
        if key in seen_keys or key in {'__proto__', 'constructor', 'prototype'}:
            _fail('Duplicate or invalid profile key / 情景名称重复或无效')
        seen_keys.add(key)
        if binding.get('route') == 'follow':
            _fail('Follow mode is machine-specific; choose the actual node before exporting / 跟随模式依赖当前电脑，导出前请改选实际节点')
        route = _route(binding.get('route'))
        predecessor = binding.get('predecessor', 'inherit')
        if predecessor not in ('inherit', 'none'):
            _route(predecessor)
        chain = binding.get('chain')
        if 'chain' in binding:
            if not isinstance(chain, list) or len(chain) >= MAX_NODES:
                _fail('Invalid backup chain / 备份链路无效')
            chain = [_route(choice) for choice in chain]
        checked.append((key, route, predecessor, chain))
    if not checked:
        return {'nodes': [], 'bindings': []}
    # One consistent library snapshot, with the source application's defaults
    # materialized into each outbound rather than copied as machine metadata.
    with store.locked():
        try:
            snapshot = routes.snapshot()
        except (OSError, ValueError, sqlite3.Error):
            # A moved/uninstalled source application does not invalidate the
            # independent library. Missing external chain hops still fail below.
            snapshot = routes.snapshot(discover=False)
    gui, source_nodes, groups = snapshot
    nodes = []
    mapped = {}
    result_bindings = []
    for key, route, predecessor, chain in checked:
        try:
            _, meta = routes.build_choice(route, snapshot, predecessor=predecessor, chain=chain)
        except (ValueError, TypeError, KeyError, AttributeError):
            _fail('Profile chain is missing, unsupported or invalid / 情景链路缺失、不受支持或配置无效')
        choices = meta.get('chain_values')
        if not choices or choices[-1] != route:
            _fail('Cannot resolve the complete profile chain / 无法解析完整情景链路')
        for choice in choices:
            if choice in mapped:
                continue
            if len(nodes) >= MAX_NODES:
                _fail('Profile backup exceeds 1500 nodes / 情景备份超过 1500 个节点')
            original = source_nodes[choice[5:]]
            # Recompile the raw record, not the linked config: generated tags and
            # dialer references are represented by the portable chain instead.
            try:
                raw = routes.translate(original, 'portable', gui)
            except (ValueError, TypeError, KeyError, AttributeError):
                _fail('Source node cannot be migrated / 源节点无法迁移')
            outbound = _outbound(raw)
            ident = 'portable-' + uuid.uuid4().hex
            name = _text(original.get('Remarks') or outbound['protocol'].upper(), 256)
            country = original.get('_country') or routes.describe(name, groups.get(str(original.get('Subid')), {}).get('Remarks', '')).get('country')
            node = {'id': ident, 'name': name, 'outbound': outbound}
            if isinstance(country, str) and re.fullmatch('[a-z]{2}', country):
                node['country'] = country
            nodes.append(node)
            mapped[choice] = 'node:' + ident
        result_bindings.append({'key': key, 'route': mapped[route], 'predecessor': 'none',
                                'chain': [mapped[choice] for choice in choices[:-1]]})
    result = {'nodes': nodes, 'bindings': result_bindings}
    _bounded({'ok': True, 'result': result})
    _validate_core([_record(node['outbound'], node['name'], node.get('country')) for node in nodes])
    return result


def import_bundle(value):
    _request(value, {'nodes'})
    incoming = value.get('nodes')
    if not isinstance(incoming, list) or len(incoming) > MAX_NODES:
        _fail('Too many or invalid backup nodes / 备份节点无效或超过 1500 个')
    prepared = []
    seen = set()
    for item in incoming:
        _request(item, {'id', 'name', 'outbound', 'country'})
        ident = _id(item.get('id'))
        if ident in seen:
            _fail('Duplicate backup node identifier / 备份节点标识重复')
        seen.add(ident)
        name = _text(item.get('name'), 256)
        country = item.get('country')
        if 'country' in item and (not isinstance(country, str) or not re.fullmatch('[a-z]{2}', country)):
            _fail('Invalid backup country code / 备份国家代码无效')
        outbound = _outbound(item.get('outbound'))
        prepared.append((ident, _record(outbound, name, country)))
    _validate_core([node for _, node in prepared])
    token = uuid.uuid4().hex
    mapping, created = {}, []
    adopted = False
    with store.locked(timeout=30):
        data = store.read()
        known = {}
        # Only independent local nodes are deduplication targets. Subscription
        # nodes can disappear or change on refresh and must not own a backup.
        for ident, node in data['nodes'].items():
            if (not isinstance(node, dict) or node.get('_source') != 'local' or
                    node.get('_subscription') or node.get('IndexId') != ident):
                continue
            try:
                _id(ident)
                outbound = _outbound(routes.translate(node, 'portable', {'CoreBasicItem': {}, 'Inbound': []}))
            except (ValueError, TypeError, KeyError, AttributeError):
                continue
            known.setdefault(_fingerprint(outbound), ident)
        for portable_id, node in prepared:
            fingerprint = _fingerprint(node['_outbound'])
            ident = known.get(fingerprint)
            if ident is None:
                ident = node['IndexId']
                # Even a malformed or manually edited existing record must
                # never be overwritten by a stable-identifier collision.
                if ident in data['nodes']:
                    ident = 'local-' + uuid.uuid4().hex
                    node['IndexId'] = ident
                node['_profileBundle'] = token
                data['nodes'][ident] = node
                known[fingerprint] = ident
                created.append(ident)
            elif data['nodes'][ident].get('_profileBundle') not in (None, token):
                # Another import now owns a valid mapping to this node, even
                # before its asynchronous configure request persists references.
                # The original import can no longer safely roll it back.
                data['nodes'][ident].pop('_profileBundle')
                adopted = True
            mapping[portable_id] = 'node:' + ident
        if len(data['nodes']) > subscriptions.MAX_TOTAL:
            _fail('Local node library limit reached / 本地节点库已达数量上限')
        result = {'mapping': mapping, 'created': created, 'rollbackToken': token}
        _bounded({'ok': True, 'result': result})
        if created or adopted:
            store.write(data)
    return result


def rollback_bundle(value):
    _request(value, {'ids', 'rollbackToken'})
    ids, token = value.get('ids'), value.get('rollbackToken')
    if (not isinstance(ids, list) or len(ids) > MAX_NODES or
            not isinstance(token, str) or not re.fullmatch('[0-9a-f]{32}', token)):
        _fail('Invalid backup rollback request / 备份回滚请求无效')
    ids = [_id(ident) for ident in ids]
    if len(ids) != len(set(ids)):
        _fail('Duplicate rollback identifier / 回滚节点标识重复')
    subscriptions._secure()
    with store.locked(timeout=30):
        data = store.read()
        refs = subscriptions._refs()
        removed, retained = [], []
        for ident in ids:
            node = data['nodes'].get(ident)
            if node is None:
                continue
            if node.get('_profileBundle') != token:
                retained.append({'id': ident, 'reason': 'not_owned'})
            elif ident in refs:
                retained.append({'id': ident, 'reason': 'in_use'})
            else:
                removed.append(ident)
        result = {'removed': removed, 'retained': retained}
        _bounded({'ok': True, 'result': result})
        if removed:
            for ident in removed:
                del data['nodes'][ident]
            store.write(data)
    return result


def handle(command, settings):
    _bounded({'command': command, 'settings': settings})
    operation = {'profileBundleExport': export_bundle, 'profileBundleImport': import_bundle,
                 'profileBundleRollback': rollback_bundle}.get(command)
    if operation is None:
        _fail('Unsupported profile backup command / 不支持的情景备份命令')
    result = operation(settings)
    _bounded({'ok': True, 'result': result})
    return result
