/* V2Route browser controller. Copyright 2026 V2Route contributors.
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Readable source; no remote code, telemetry, cloud sync or web page access. */
(function (root) {
'use strict';
if(!root.V2RouteToolCache&&typeof importScripts==='function')importScripts('v2route-tool-cache.js');
if(typeof importScripts==='function'){
 if(!root.V2RNativeClient)importScripts('v2route-ui/node-measure-client.js');
 if(!root.V2RouteLibrary)importScripts('v2route-library.js');
 if(!root.V2RouteValidation)importScripts('v2route-validation.js');
}
const ToolCache=typeof module==='object'&&module.exports?require('./v2route-tool-cache.js'):root.V2RouteToolCache;
const Library=typeof module==='object'&&module.exports?require('./v2route-library.js'):root.V2RouteLibrary;
const NativeClient=typeof module==='object'&&module.exports?require('./v2route-ui/node-measure-client.js'):root.V2RNativeClient;
const Validation=typeof module==='object'&&module.exports?require('./v2route-validation.js'):root.V2RouteValidation;
const HOST='local.v2route', KEY='v2routeModel';
const clone=v=>JSON.parse(JSON.stringify(v));
const own=(object,key)=>Object.hasOwn(object,key)?object[key]:undefined;
const builtins={direct:{name:'direct',profileType:'DirectProfile',color:'#42ad8c',builtin:true},system:{name:'system',profileType:'SystemProfile',color:'#7792ad',builtin:true}};
const fault=Validation.createError,serializeError=Validation.serializeError;
function error(code,en,zh,params={},details=''){return fault(code,en+' / '+zh,params,details);}
function externalError(value,code,params={}){
 const record=serializeError(value,code);
 return fault(record.code,record.message,{...params,...record.params},record.details);
}
function nativeError(reply,fallbackCode,fallbackMessage,params={},keepMessage=false){
 const technical=reply?.error||reply?.status?.error||fallbackMessage;
 const message=keepMessage?fallbackMessage:technical;
 const generic=fallbackCode==='NATIVE_ROUTE_UNAVAILABLE'?fallbackCode:'COMPANION_OPERATION_FAILED';
 const code=reply?.error_code||((reply?.error||reply?.status?.error)?generic:fallbackCode);
 return externalError({code,message:String(message),params:reply?.error_params,details:reply?.error_details??String(technical)},fallbackCode,params);
}
function nameValid(name){return typeof name==='string'&&name.trim()===name&&name.length>0&&name.length<=128&&!/[\x00-\x1f\x7f]/.test(name)&&!['direct','system','__proto__','constructor','prototype'].includes(name)&&!Object.hasOwn(Object.prototype,name)&&!name.startsWith('_');}
function validPort(port){return Number.isInteger(port)&&port>0&&port<65536;}
function revision(){return Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);}
function references(p){return [...(p.profileType==='SwitchProfile'?[p.defaultProfileName]:[]),...(p.rules||[]).filter(r=>!Object.hasOwn(r,'route')).map(r=>r.profileName)];}
function ruleRoutes(p){return [...new Set((p?.rules||[]).filter(r=>Object.hasOwn(r,'route')).map(r=>r.route))];}
function builtinInput(p){return !!p&&Object.hasOwn(builtins,p.name)&&p.profileType===builtins[p.name].profileType&&p.builtin===true;}
function policyProfile(p){return !!p&&(builtinInput(p)||(p.profileType!=='SwitchProfile'&&(p.rules||[]).length>0)||(p.bypassList||[]).some(c=>(typeof c==='string'?c:c.pattern||'').includes(':'))||(p.rules||[]).some(r=>r.condition?.conditionType!=='UrlWildcardCondition'&&r.condition?.pattern?.includes(':')));}
 function nativeBuiltin(p){return !!p&&['DirectProfile','SystemProfile'].includes(p.profileType)&&!(p.rules||[]).length&&!(p.bypassList||[]).some(c=>Library.storedRulePatterns({conditionType:'BypassCondition',pattern:typeof c==='string'?c:c.pattern}).length);}
function ruleEndpoint(p,route){const b=p._zeroRouteRuleBindings?.[route];return b?.route===route&&validPort(b.port)?'SOCKS5 127.0.0.1:'+b.port:'PROXY 127.0.0.1:0';}
 function legacyAddressRows(p){
  const rows={bypass:[],rules:[]};
  function legacy(pattern){try{return !Library.addressPatterns(pattern).length;}catch(e){if(e.code!=='INVALID_DOMAIN_PATTERNS')throw e;return true;}}
  (p.bypassList||[]).forEach((entry,index)=>{if(legacy(typeof entry==='string'?entry:entry.pattern))rows.bypass.push(index);});
  (p.rules||[]).forEach((rule,index)=>{if(rule.condition.conditionType!=='UrlWildcardCondition'&&legacy(rule.condition.pattern))rows.rules.push(index);});
  return rows;
 }
 function portableHistory(p){
  const retained={bypassList:[],rules:[]},rows=p.legacyAddressRows;
  if(rows!==undefined){
   if(!rows||typeof rows!=='object'||Array.isArray(rows)||Object.keys(rows).some(key=>!['bypass','rules'].includes(key)))throw error('INVALID_BACKUP','Invalid legacy address metadata','旧地址兼容信息无效');
   for(const [type,field] of [['bypass','bypassList'],['rules','rules']]){
    if(!Array.isArray(rows[type])||rows[type].some(index=>!Number.isInteger(index)||index<0||index>=(p[field]?.length||0)))throw error('INVALID_BACKUP','Invalid legacy address metadata','旧地址兼容信息无效');
    retained[field]=rows[type].map(index=>p[field][index]);
   }
  }
  // Earlier format-4 exports could contain pre-policy CIDR bypasses without
  // provenance. They remained literal, unmatched tokens in that version.
  for(const entry of Array.isArray(p.bypassList)?p.bypassList:[]){
   const text=typeof entry==='string'?entry:entry?.pattern;
   if(typeof text==='string'&&/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}\/(?:[0-9]|[12][0-9]|3[0-2])$/.test(text)&&text.split('/')[0].split('.').every(part=>+part<=255))retained.bypassList.push(entry);
  }
  return retained;
 }
function sanitize(input,existing,previous=existing,portable=false){
 const previousBypass=new Set((previous?.bypassList||[]).map(item=>typeof item==='string'?item:item.pattern));
 const previousConditions=new Set((previous?.rules||[]).map(rule=>JSON.stringify([rule.condition.conditionType,rule.condition.pattern])));
 function checkBypass(pattern){
  if(!portable&&!previousBypass.has(pattern)&&!Library.addressPatterns(pattern).length)throw error('INVALID_BYPASS_ENTRY','Enter at least one address in each bypass entry','每条绕过规则都须填写有效地址');
 }
 if(!input||!nameValid(input.name)&&!builtinInput(input))throw error("INVALID_PROFILE_NAME",'Invalid profile name','情景名称无效');
 if(!['FixedProfile','SwitchProfile','PacProfile','DirectProfile','SystemProfile'].includes(input.profileType)||['DirectProfile','SystemProfile'].includes(input.profileType)&&!builtinInput(input))throw error("UNSUPPORTED_PROFILE_TYPE",'Unsupported profile type','不支持的情景类型');
 const p={name:input.name,profileType:input.profileType,color:/^#[0-9a-f]{6}$/i.test(input.color||'')?input.color:'#269eab',revision:revision()};
 if(builtinInput(input)){p.builtin=true;p.color=builtins[p.name].color;}
 if(p.profileType==='FixedProfile'){
  const proxy=input.fallbackProxy;
  if(!proxy||!['http','https','socks4','socks5'].includes(proxy.scheme)||typeof proxy.host!=='string'||!proxy.host.trim()||/[\s;\r\n/@]/.test(proxy.host)||!validPort(proxy.port))throw error("INVALID_PROXY_ENDPOINT",'Enter a valid proxy host and port','请输入有效代理地址和端口');
  if(input.proxyDNS===false)throw error("PROXY_DNS_REQUIRED",'SOCKS5 DNS is resolved through the proxy in V2Route','V2Route 的 SOCKS5 DNS 使用代理端解析');
  p.fallbackProxy={scheme:proxy.scheme,host:Validation.normalizeProxyHost(proxy.host),port:proxy.port};p.proxyDNS=true;
  if(!Array.isArray(input.bypassList||[])||(input.bypassList||[]).length>500)throw error("INVALID_BYPASS_LIST",'Invalid bypass list','绕过列表无效');
  p.bypassList=(input.bypassList||[]).map(c=>{const pattern=typeof c==='string'?c:c?.pattern;if(typeof pattern!=='string'||!pattern||pattern.length>512||/[\x00-\x1f]/.test(pattern))throw error("INVALID_BYPASS_ENTRY",'Invalid bypass entry','绕过条目无效');checkBypass(pattern);return {conditionType:'BypassCondition',pattern};});
  if(existing?._zeroRouteSlot){for(const k of ['_zeroRouteSlot','_zeroRouteChoice','_zeroRouteIcon','_zeroRouteCountry','_zeroRoutePredecessor','_zeroRouteChain','_v2routeManual','_v2routeNodeModes'])if(existing[k]!==undefined)p[k]=clone(existing[k]);p.fallbackProxy=clone(existing.fallbackProxy);}
 }else if(p.profileType==='SystemProfile'){
  if(!Array.isArray(input.bypassList||[])||(input.bypassList||[]).length>500)throw error("INVALID_BYPASS_LIST",'Invalid bypass list','绕过列表无效');
  p.bypassList=(input.bypassList||[]).map(c=>{const pattern=typeof c==='string'?c:c?.pattern;if(typeof pattern!=='string'||!pattern||pattern.length>512)throw error("INVALID_BYPASS_ENTRY",'Invalid bypass entry','绕过条目无效');checkBypass(pattern);return {conditionType:'BypassCondition',pattern};});
 }else if(p.profileType==='DirectProfile'){
  if(!Array.isArray(input.bypassList||[])||(input.bypassList||[]).length)throw error("INVALID_BYPASS_LIST",'Direct profiles do not need bypass addresses','直连情景无需设置绕过地址');
 }else if(p.profileType==='PacProfile'){
  if(input.pacUrl)throw error("REMOTE_PAC_UNSUPPORTED",'Use inline PAC source; remote PAC is not supported','请粘贴 PAC 源码；不支持远程 PAC 地址');
  if(typeof input.pacScript!=='string'||input.pacScript.length>128*1024||!input.pacScript.includes('FindProxyForURL'))throw error("PAC_ENTRY_REQUIRED",'Enter PAC source with FindProxyForURL','请输入包含 FindProxyForURL 的 PAC 源码');
  p.pacScript=Validation.validatePac(input.pacScript);p.pacUrl='';
 }
 if(p.profileType==='SwitchProfile'||p.profileType!=='PacProfile'&&input.rules!==undefined){
  if(!Array.isArray(input.rules)||input.rules.length>1000)throw error("INVALID_RULES",'Invalid rules','规则无效');
  if(p.profileType==='SwitchProfile')p.defaultProfileName=input.defaultProfileName;
  let matchCount=0;
  p.rules=input.rules.map(r=>{
   const c=r?.condition;if(!c||!['HostWildcardCondition','UrlWildcardCondition','BypassCondition'].includes(c.conditionType)||typeof c.pattern!=='string'||!c.pattern||c.pattern.length>2048)throw error("UNSUPPORTED_RULE_CONDITION",'Only host and URL wildcard rules are supported','仅支持主机和网址通配规则');
   const retained=portable||previousConditions.has(JSON.stringify([c.conditionType,c.pattern]));
   const patterns=retained?Library.storedRulePatterns(c):Library.rulePatterns(c);
   if(c.conditionType==='HostWildcardCondition'&&(!patterns.length||patterns.some(pattern=>/[\s/\\]/.test(pattern))))throw error("INVALID_DOMAIN_PATTERNS",'Enter comma-separated domain patterns; put each URL on its own row','请输入用逗号分隔的域名规则；网址请单独填写一行');
   matchCount+=patterns.length;if(matchCount>1000)throw error("RULE_PATTERNS_LIMIT",'Automatic rules support at most 1000 total matching patterns','自动规则的匹配项总数不能超过 1000 个',{limit:1000});
   const node=Object.hasOwn(r,'route');if(node&&(Object.hasOwn(r,'profileName')||typeof r.route!=='string'||!/^node:[A-Za-z0-9_-]{1,128}$/.test(r.route)))throw error("INVALID_RULE_TARGET",'Choose one valid node or profile for each rule','每条规则请选择一个有效节点或情景');
   return {condition:{conditionType:c.conditionType,pattern:c.pattern},...(node?{route:r.route}:{profileName:r.profileName})};
  });
  if(ruleRoutes(p).length>500)throw error("RULE_NODES_LIMIT",'Automatic rules support at most 500 distinct nodes','自动规则最多支持 500 个不同节点',{limit:500});
 }
 return p;
}
function validateGraph(profiles){
 // Memoize subtree height, not just successful visits: a shared subtree can be
 // reached from a longer path later. The PAC permits depths 0 through 64.
 const heights=new Map(),visiting=new Set();
 const tooDeep=()=>error("PROFILE_REFERENCE_DEPTH",'Automatic rules exceed the maximum depth of 64','自动规则引用层数不能超过 64 层',{limit:64});
 function visit(name){
  if(typeof name!=='string')throw error("INVALID_PROFILE_REFERENCE",'Invalid profile reference','情景引用无效');
  const p=own(profiles,name)||own(builtins,name);
  if(!p)throw error("PROFILE_REFERENCE_MISSING",'Referenced profile does not exist: '+name,'引用的情景不存在',{name:name});
  if(visiting.has(name))throw error("PROFILE_REFERENCE_CYCLE",'Circular profile references','情景存在循环引用');
  if(heights.has(name))return heights.get(name);
  if(visiting.size>64)throw tooDeep();
  visiting.add(name);
  try{
   let height=0;
   for(const ref of references(p)){
    if(own(profiles,ref)?.profileType==='PacProfile')throw error("PAC_RULE_TARGET_UNSUPPORTED",'Automatic rules cannot target an inline PAC profile','自动规则不能引用内联 PAC 情景');
    height=Math.max(height,1+visit(ref));
    if(height>64)throw tooDeep();
   }
   heights.set(name,height);return height;
  }finally{visiting.delete(name);}
 }
 Object.keys(profiles).forEach(n=>visit(n));
}
function needsSystem(name,profiles,seen=new Set()){
 if(name==='system')return true;if(seen.has(name))return false;seen.add(name);
 const p=own(profiles,name);return !!p&&references(p).some(n=>needsSystem(n,profiles,seen));
}
function systemSnapshot(value){
 const bad=()=>{throw error("INVALID_SYSTEM_PROXY_RESPONSE",'Invalid system proxy response; update or repair the companion','系统代理返回无效，请更新或修复本地组件');};
 const object=v=>v&&typeof v==='object'&&!Array.isArray(v),keys=(v,allowed)=>Object.keys(v).every(k=>allowed.includes(k));
 if(!object(value)||!keys(value,['version','mode','proxies','bypass'])||value.version!==1||!['direct','fixed'].includes(value.mode)||!object(value.proxies)||!keys(value.proxies,['http','https','ftp','fallback'])||!Array.isArray(value.bypass)||value.bypass.length>500)bad();
 for(const p of Object.values(value.proxies)){
  if(!object(p)||!keys(p,['scheme','host','port'])||!['http','https','socks4','socks5'].includes(p.scheme)||typeof p.host!=='string'||!p.host||p.host.length>253||!validPort(p.port))bad();
  if(p.host.includes(':')){try{new URL('http://['+p.host+']/');}catch(_){bad();}}
  else if(!/^[a-z0-9_][a-z0-9_.-]*$/i.test(p.host))bad();
 }
 for(const b of value.bypass){
  if(!object(b)||!keys(b,['kind','host','scheme','port'])||!['local','host','ip'].includes(b.kind))bad();
  if(b.kind==='local'){if(Object.keys(b).length!==1)bad();continue;}
  if(typeof b.host!=='string'||!b.host||b.host.length>253)bad();
  if(b.kind==='host'&&!/^[a-z0-9_.*-]+$/i.test(b.host))bad();
  if(b.kind==='ip'&&!(/^[a-f0-9]{32}$/.test(b.host)||/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(b.host)&&b.host.split('.').every(n=>+n<=255)))bad();
  if(b.scheme!==undefined&&!['http','https','ftp','ws','wss'].includes(b.scheme)||b.port!==undefined&&!validPort(b.port))bad();
 }
 if(value.mode==='direct'&&(Object.keys(value.proxies).length||value.bypass.length)||value.mode==='fixed'&&!Object.keys(value.proxies).length)bad();
 return clone(value);
}
const systemProxyForURL=Library.systemProxyForURL;
function pacFor(name,profiles,snapshot){
 // Chrome's inline PAC transport accepts ASCII only. Escape JSON UTF-16 code
 // units rather than changing profile names, references or string semantics.
 const asciiJson=value=>JSON.stringify(value).replace(/[\u007f-\uffff]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'));
 function proxy(p){const r=p.fallbackProxy,types={http:'PROXY',https:'HTTPS',socks4:'SOCKS',socks5:'SOCKS5'};return types[r.scheme]+' '+(r.host.includes(':')&&!r.host.startsWith('[')?'['+r.host+']':r.host)+':'+r.port;}
 const table={};
 const pending=[name];
 while(pending.length){
  const key=pending.pop();
  if(Object.hasOwn(table,key))continue;
  const p=own(profiles,key)||own(builtins,key);
  if(!p)continue;
  pending.push(...references(p));
  table[key]={type:p.profileType,bypass:(p.bypassList||[]).flatMap(v=>Library.storedRulePatterns({conditionType:'BypassCondition',pattern:typeof v==='string'?v:v.pattern})),rules:(p.rules||[]).map(r=>({patterns:Library.storedRulePatterns(r.condition),urlMode:r.condition.conditionType==='UrlWildcardCondition',...(Object.hasOwn(r,'route')?{proxy:ruleEndpoint(p,r.route)}:{profileName:r.profileName})})),...(p.profileType==='FixedProfile'?{proxy:proxy(p)}:{}),otherwise:p.defaultProfileName};}
 const system=needsSystem(name,profiles)?systemSnapshot(snapshot):null;
 return 'function FindProxyForURL(url,host){var table='+asciiJson(table)+',target='+asciiJson(name)+',system='+asciiJson(system)+';'+(system?systemProxyForURL.toString():'')+Library.addressMatches.toString()+
  'function match(p,urlMode){return urlMode?shExpMatch(url,p):addressMatches(p,url,host);}' +
  'function pick(n,depth){if(depth>64)return "PROXY 127.0.0.1:0";var p=table[n];if(!p)return "PROXY 127.0.0.1:0";for(var i=0;i<p.bypass.length;i++)if(match(p.bypass[i],false))return "DIRECT";for(var j=0;j<p.rules.length;j++){var r=p.rules[j];for(var k=0;k<r.patterns.length;k++)if(match(r.patterns[k],r.urlMode))return r.proxy||pick(r.profileName,depth+1);}if(p.type==="DirectProfile")return "DIRECT";if(p.type==="SystemProfile")return systemProxyForURL(url,host,system);if(p.type==="FixedProfile")return p.proxy;if(p.type==="SwitchProfile")return pick(p.otherwise,depth+1);return "PROXY 127.0.0.1:0";}return pick(target,0);}';
}
function createController(api, firefox=false){
 const toolCache=ToolCache.create(api,firefox);
 let model=null,ready=null,queue=Promise.resolve(),latest=null,blobUrl=null,browserTransaction=null,appliedConfig=null,appliedSystemSnapshot=null;
 const library=Library.create({api,
  nativeRequest:async(command,settings)=>{
   let session;
   try{session=NativeClient.create({api,commands:Library.COMMANDS,timeoutMs:90000});return await session.request(command,settings);}catch(e){throw externalError(e,'COMPANION_OPERATION_FAILED',{command});}finally{session?.close();}
  },
  resolveTransport:url=>enqueue(async()=>{
   const before=await connectionState();
   if(before.status!=='ready')return {kind:'unavailable',reason:'current_proxy_unverified'};
   const runtime=effectiveRoute(),snapshot={currentProfileName:runtime.name,profiles:clone(runtime.profiles)},system=appliedSystemSnapshot;
   const transport=await Library.transportFor(snapshot,url,async()=>{
    if(snapshot.currentProfileName==='system'&&nativeBuiltin(profile('system',snapshot.profiles)))return readSystem();
    if(!system)throw fault('SYSTEM_PROXY_SNAPSHOT_UNAVAILABLE','Applied system proxy snapshot unavailable');
    return system;
   }),after=await connectionState();
   return after.status==='ready'&&after.token===before.token?transport:{kind:'unavailable',reason:'current_proxy_changed'};
  })
 });
 const call=(object,method,...args)=>new Promise((resolve,reject)=>{
  const failed=e=>reject(externalError(e,method==='sendNativeMessage'?'COMPANION_UNAVAILABLE':'BROWSER_API_FAILED',{method}));
  try{object[method](...args,value=>{const e=api.runtime.lastError;e?failed(e):resolve(value);});}catch(e){failed(e);}
 });
 async function load(){if(!ready)ready=call(api.storage.local,'get',KEY).then(v=>{model=v[KEY]||{version:1,profiles:{},currentProfileName:'system',zeroRouteError:'',zeroRouteErrorInfo:null};}).catch(e=>{ready=null;throw e;});await ready;}
 async function persist(next){await call(api.storage.local,'set',{[KEY]:next});model=next;}
 async function native(command,settings){const request={command};if(settings!==undefined)request.settings=settings;if(new TextEncoder().encode(JSON.stringify(request)).length>900*1024)throw error("COMPANION_MESSAGE_LIMIT",'Settings exceed the Companion message limit','设置超过本地组件传输上限');let c;try{c=await call(api.runtime,'sendNativeMessage',HOST,request);}catch(e){throw error("COMPANION_UNAVAILABLE",'Install or repair the V2Route Companion: '+e.message,'请安装或修复 V2Route 本地组件',{command},e.details||e.message);}if(!c?.catalog?.settings||!c?.status)throw nativeError(c,'INVALID_COMPANION_RESPONSE','Invalid companion response / 本地组件返回无效',{command});if(c.ok===false)throw nativeError(c,'COMPANION_OPERATION_FAILED','Companion operation failed / 本地组件操作失败',{command});latest=c;return c;}
 async function bundleNative(command,settings){
  const request={command,settings};
  if(new TextEncoder().encode(JSON.stringify(request)).length>900*1024)throw error("BACKUP_MESSAGE_LIMIT",'Node backup exceeds the Companion message limit','节点备份超过本地组件传输上限');
  const reply=await call(api.runtime,'sendNativeMessage',HOST,request);
  if(!reply?.ok||!reply.result||typeof reply.result!=='object')throw nativeError(reply,'BACKUP_TRANSFER_UNAVAILABLE','Update or repair the Companion to transfer node backups / 请更新或修复本地组件以迁移节点备份',{command});
  return reply.result;
 }
 function portableNodes(nodes){
  if(!Array.isArray(nodes)||nodes.length>1500)throw error("INVALID_BACKUP_NODES",'Invalid backup nodes','备份节点无效');
  const ids=new Set();
  for(const n of nodes){
   if(!n||typeof n!=='object'||Array.isArray(n)||Object.keys(n).some(k=>!['id','name','outbound','country'].includes(k))||typeof n.id!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(n.id)||Object.hasOwn(Object.prototype,n.id)||ids.has(n.id)||typeof n.name!=='string'||!n.name.trim()||n.name.length>256||!n.outbound||typeof n.outbound!=='object'||Array.isArray(n.outbound)||(n.country!==undefined&&!/^[a-z]{2}$/.test(n.country)))throw error("INVALID_BACKUP_NODE",'Invalid or duplicate backup node','备份节点无效或重复');
   ids.add(n.id);
  }
  return ids;
 }
 function portableReferences(profiles,nodes){
  const ids=portableNodes(nodes),used=new Set();
  for(const profile of profiles)for(const p of [...(profile.route?[profile]:[]),...(profile.rules||[]).filter(r=>Object.hasOwn(r,'route'))]){
   if(p.predecessor!=='none'||!Array.isArray(p.chain)||p.route==='follow')throw error("BACKUP_INDEPENDENT_PATH_REQUIRED",'Backup must contain an independent node path','备份必须包含独立节点链路');
   validRoute(p.route);validChain(p.route,p.chain);
   for(const route of [...p.chain,p.route]){const id=route.slice(5);if(!ids.has(id))throw error("BACKUP_NODE_MISSING",'Backup is missing a required node','备份缺少情景所需节点');used.add(id);}
  }
  if(used.size!==ids.size)throw error("BACKUP_UNUSED_NODES",'Backup contains unreferenced nodes','备份包含未被情景引用的节点');
 }
 async function exportProfiles(){
  if(Object.keys(model.profiles).length>500)throw error("BACKUP_PROFILES_LIMIT",'Backup supports at most 500 profiles','备份最多支持 500 个情景',{limit:500});
  const bindings=[],targets=new Map();let nodeRules=false;const profiles=Object.values(model.profiles).map(p=>{
   const q=clone(p);
   if(q._zeroRouteSlot){
    if(q._v2routeManual){const m=q._v2routeManual;q.fallbackProxy={scheme:m.scheme,host:m.host,port:m.port};q.manualAuth={username:m.username,password:m.password};}
    else{bindings.push({key:q.name,route:q._zeroRouteChoice,predecessor:q._zeroRoutePredecessor||'inherit',...chainRecord(q._zeroRouteChain)});targets.set(q.name,[q]);delete q.fallbackProxy;}
    for(const key of ['_zeroRouteSlot','_zeroRouteChoice','_zeroRouteIcon','_zeroRouteCountry','_zeroRoutePredecessor','_zeroRouteChain','_v2routeManual'])delete q[key];
   }
   for(const route of ruleRoutes(p)){
     const b=ruleBinding(p,route,true),key='_rule-'+bindings.length;nodeRules=true;
    bindings.push({key,route,predecessor:b.predecessor,...chainRecord(b.chain)});targets.set(key,q.rules.filter(r=>r.route===route));
   }
   // Portable formats 2/3 snapshot only the effective path, not local drafts.
   delete q._v2routeNodeModes;delete q._zeroRouteRuleBindings;
   delete q.revision;return q;
  });
  let nodes=[];
  if(bindings.length){
   if(bindings.length>500)throw error("BACKUP_NODE_PATHS_LIMIT",'Backup supports at most 500 node paths','备份最多支持 500 条节点链路',{limit:500});
   const bundle=await bundleNative('profileBundleExport',{bindings});
   if(!Array.isArray(bundle.bindings)||bundle.bindings.length!==bindings.length)throw error("BACKUP_NODES_INCOMPLETE",'Incomplete node backup','节点备份不完整');
   const pending=new Set(bindings.map(b=>b.key));
   for(const b of bundle.bindings){
    if(!b||!pending.delete(b.key))throw error("INVALID_BACKUP_PATH",'Invalid backup path','备份链路无效');
    validRoute(b.route);validChain(b.route,b.chain);
    if(b.route==='follow'||b.predecessor!=='none'||!Array.isArray(b.chain))throw error("BACKUP_PATH_INCOMPLETE",'Incomplete node backup path','节点备份链路不完整');
    for(const p of targets.get(b.key)){p.route=b.route;p.predecessor=b.predecessor;p.chain=clone(b.chain);}
   }
   nodes=bundle.nodes;
  }
  portableReferences(profiles,nodes);
   const backup={format:profiles.some(policyProfile)?4:nodeRules?3:2,product:'V2Route',profiles,nodes,note:'Contains node configurations and credentials, including predecessor chains. Keep this backup private. / 包含节点配置、账号密钥及完整前置链路，请妥善保管。'};
   if(backup.format===4)for(const p of profiles){const rows=legacyAddressRows(p);if(rows.bypass.length||rows.rules.length)p.legacyAddressRows=rows;}
  if(new TextEncoder().encode(JSON.stringify(backup,null,2)).length>5*1024*1024)throw error("BACKUP_SIZE_LIMIT",'Backup exceeds 5 MB','备份文件不能超过 5 MB',{limit:5});
  return backup;
 }
 function profile(name,profiles=model.profiles){return own(profiles,name)||own(builtins,name);}
 function effectiveRoute(){return model.appliedRoute||{name:model.currentProfileName,profiles:model.profiles};}
 // Pin only reachable definitions. Saved edits must never update a listener still used by live traffic.
 function pinCurrentRoute(){
  if(model.appliedRoute)return model.appliedRoute;
  const name=model.currentProfileName,profiles={};
  function include(key){if(Object.hasOwn(profiles,key))return;const p=profile(key);if(!p)return;profiles[key]=clone(p);references(p).forEach(include);}
  include(name);return {name,profiles};
 }
 function slotsIn(profiles){return new Set(Object.values(profiles).flatMap(ownedSlots));}
  function binding(name,c){const p=profile(name);if(!p)return{exists:false,name,slot:null,route:'manual',predecessor:'inherit'};const slot=p._zeroRouteSlot||null,record=slot&&c.catalog.settings.buttons[slot];return{exists:true,name,slot,route:slot?(record?.route||p._zeroRouteChoice):'manual',predecessor:record?.predecessor||p._zeroRoutePredecessor||'inherit',...chainRecord(storedChain(record,p,c)),port:slot?(c.catalog.settings.ports[slot]||null):null,orphan:!!slot&&!record&&validPort(p.fallbackProxy?.port)};}
 function enrich(c,name){const profiles={};for(const p of Object.values(model.profiles))if(p._zeroRouteSlot)profiles[p._zeroRouteSlot]={name:p.name,slot:p._zeroRouteSlot,port:p.fallbackProxy.port};return {...c,apiVersion:4,profiles,binding:name?binding(name,c):null};}
 function needed(name,profiles=model.profiles,seen=new Set()){if(seen.has(name))return[];seen.add(name);const p=profile(name,profiles);if(!p)throw error("PROFILE_NOT_FOUND",'Profile not found','情景不存在');return [...(p._zeroRouteSlot?[p._zeroRouteSlot]:[]),...ruleRoutes(p).map(route=>ruleBinding(p,route).slot),...references(p).flatMap(n=>needed(n,profiles,seen))];}
  function ruleBinding(p,route,allowPending=false){const b=p._zeroRouteRuleBindings?.[route];if(!b||b.route!==route||!/^zo-[0-9a-f-]{36}$/.test(b.slot||'')||!(validPort(b.port)||allowPending&&b.port===null)||!['inherit','none'].includes(b.predecessor))throw error("RULE_BINDING_MISSING",'Node rule binding is missing. Reopen and save the automatic profile: '+p.name,'节点规则绑定缺失，请重新打开并保存自动规则情景',{name:p.name});validChain(route,b.chain);return b;}
  function ownedSlots(p){return [...new Set([...(p?._zeroRouteSlot&&validPort(p.fallbackProxy?.port)?[p._zeroRouteSlot]:[]),...Object.values(p?._zeroRouteRuleBindings||{}).filter(b=>validPort(b.port)).map(b=>b.slot)])];}
  function pendingBase(p){return !!p?._zeroRouteSlot&&p.fallbackProxy?.port===null;}
  function hasPending(p){return pendingBase(p)||Object.values(p?._zeroRouteRuleBindings||{}).some(b=>b.port===null);}
 function samePath(record,b){return !!record&&record.route===b.route&&(record.predecessor||'inherit')===b.predecessor&&JSON.stringify(record.chain)===JSON.stringify(b.chain);}
 function sameRecord(a,b){return a&&b?a.label===b.label&&samePath(a,{...b,predecessor:b.predecessor||'inherit'}):!a&&!b;}
 async function configureNative(settings){
  try{return await native('configure',settings);}
  catch(e){
   if(e.code!=='COMPANION_UNAVAILABLE'&&e.code!=='INVALID_COMPANION_RESPONSE')throw e;
   let current;try{current=await native('getState');}catch(_){throw e;}
   const actual=current.catalog.settings;
   if(actual.revision===settings.revision+1&&Object.keys(actual.buttons).length===Object.keys(settings.buttons).length&&Object.entries(settings.buttons).every(([slot,record])=>sameRecord(actual.buttons[slot],record)))return current;
   throw e;
  }
 }
 function requireRelease(c,ids){if(ids.length>1000)throw error("RECOVERY_BINDINGS_LIMIT",'Too many node bindings for one recovery. Open and save the referenced profiles separately','一次恢复的节点绑定超过 1000 个，请分别打开并保存所引用的情景',{limit:1000});if(ids.length>1&&!c.capabilities?.bulkReleaseSlots)throw error("COMPANION_BULK_RELEASE_REQUIRED",'Upgrade the local companion to manage multiple node rules safely','请升级本地组件以安全管理多个节点规则');}
 async function releaseSlots(ids,c){ids=[...new Set(ids)];if(model.appliedRoute){const live=slotsIn(model.appliedRoute.profiles);ids=ids.filter(id=>!live.has(id));}if(!ids.length)return c;if(ids.length>1){c=c||await native('getState');requireRelease(c,ids);}try{return await native('releaseSlot',ids.length===1?{id:ids[0]}:{ids});}catch(e){try{const after=await native('getState');if(ids.every(id=>!Object.hasOwn(after.catalog.settings.buttons,id)&&!Object.hasOwn(after.catalog.settings.ports,id)))return after;}catch(_){}throw e;}}
 function ruleMetadata(c,slot,route){const record=c.catalog.settings.buttons[slot],port=c.catalog.settings.ports[slot];if(!record||record.route!==route||!validPort(port))throw error("RULE_PORT_UNAVAILABLE",'Node rule port is unavailable','节点规则端口不可用');return {slot,route,predecessor:record.predecessor||'inherit',...chainRecord(record.chain),port};}
 function checkRuleBindings(c,name,profiles=model.profiles,seen=new Set()){
  if(seen.has(name))return;seen.add(name);const p=profile(name,profiles);
  for(const route of ruleRoutes(p)){const b=ruleBinding(p,route),available=c.catalog.routes?.find(r=>r.value===route);if(!available||available.supported===false||!samePath(c.catalog.settings.buttons[b.slot],b)||c.catalog.settings.ports[b.slot]!==b.port)throw error("RULE_NODE_CHANGED",'Node rule unavailable or changed. Restore the node or select another node and save: '+p.name,'节点规则不可用或已更改，请恢复节点或重新选择节点并保存',{name:p.name});}
  for(const ref of references(p))checkRuleBindings(c,ref,profiles,seen);
 }
 function checkSlots(c,slots){for(const id of slots){const detail=c.status.slots?.[id],port=c.catalog.settings.ports[id];if(!c.status.running||!detail?.ok||!validPort(port)||c.status.ports?.[id]!==port)throw nativeError({error:detail?.error||c.status.error,error_code:detail?.error_code||c.status.error_code,error_params:detail?.error_params||c.status.error_params,error_details:detail?.error_details||c.status.error_details},'NATIVE_ROUTE_UNAVAILABLE','Selected route unavailable / 所选线路不可用',{slot:id});}}
 async function readSystem(){
  let timeout;try{
   const response=await Promise.race([call(api.runtime,'sendNativeMessage',HOST,{command:'systemProxy'}),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(error("SYSTEM_PROXY_TIMEOUT",'Reading the system proxy timed out','读取系统代理超时')),5000);})]);
   if(!response?.ok)throw nativeError(response,'SYSTEM_PROXY_UNAVAILABLE','System proxy unavailable / 系统代理不可用',{command:'systemProxy'});return systemSnapshot(response.result);
  }finally{clearTimeout(timeout);}
 }
 async function indicator(p){if(!p)return;try{await call(api.action,'setTitle',{title:'Proxy V2Route · '+p.name});await call(api.action,'setBadgeText',{text:p.profileType==='DirectProfile'?'D':p.profileType==='SystemProfile'?'S':''});}catch(_){}}
 async function setBrowser(name,snapshot,profiles){
  const p=profile(name,profiles);if(!p)throw error("PROFILE_NOT_FOUND",'Profile not found','情景不存在');
  let nextBlob=null;
  if(firefox&&!await call(api.extension,'isAllowedIncognitoAccess'))throw error("FIREFOX_PRIVATE_ACCESS_REQUIRED",'Allow V2Route in private windows in extension details before changing proxy settings','请先在扩展详情允许 V2Route 在隐私窗口运行');
  const control=await call(api.proxy.settings,'get',{});if(control?.levelOfControl==='not_controllable'||control?.levelOfControl==='controlled_by_other_extensions')throw error("PROXY_CONTROL_UNAVAILABLE",'Another extension or policy controls the proxy','其他扩展或策略控制了代理设置');
  let value;
  if(nativeBuiltin(p)&&p.profileType==='DirectProfile')value=firefox?{proxyType:'none'}:{mode:'direct'};
  else if(nativeBuiltin(p)&&p.profileType==='SystemProfile')value=firefox?{proxyType:'system'}:{mode:'system'};
  else{
   const data=p.profileType==='PacProfile'?p.pacScript:pacFor(name,profiles,snapshot);
   if(firefox){nextBlob=URL.createObjectURL(new Blob([data],{type:'application/x-ns-proxy-autoconfig'}));value={proxyType:'autoConfig',autoConfigUrl:nextBlob,proxyDNS:p.proxyDNS!==false};}
   else value={mode:'pac_script',pacScript:{data,mandatory:true}};
  }
  try{const changed=await call(api.proxy.settings,'set',firefox?{value}:{value,scope:'regular'});if(changed===false)throw error("PROXY_SETTING_REFUSED",'Browser refused the proxy setting','浏览器拒绝代理设置');}catch(e){if(nextBlob)URL.revokeObjectURL(nextBlob);throw e;}
  if(browserTransaction){
    if(!browserTransaction.before)browserTransaction.before={value:clone(control.value),blob:blobUrl,applied:appliedConfig,system:appliedSystemSnapshot};
   if(nextBlob)browserTransaction.created.add(nextBlob);
  }else if(blobUrl)URL.revokeObjectURL(blobUrl);
   blobUrl=nextBlob;appliedConfig=clone(value);appliedSystemSnapshot=snapshot?clone(snapshot):null;
  await indicator(p);
 }
 async function applyReady(name,restore=false){
  const profiles=restore?effectiveRoute().profiles:model.profiles;
  const slots=needed(name,profiles),snapshot=!nativeBuiltin(profile(name,profiles))&&needsSystem(name,profiles)?await readSystem():undefined;
  if(slots.length){const c=await native('ensure');checkRuleBindings(c,name,profiles);checkSlots(c,slots);}
  await setBrowser(name,snapshot,profiles);
  const next=clone(model);
  if(!restore){
   next.currentProfileName=name;
   if(next.appliedRoute){
    const retained=slotsIn(next.profiles),retired=Array.from(slotsIn(next.appliedRoute.profiles)).filter(id=>!retained.has(id));
    if(retired.length)next.retiredSlots=[...new Set([...(next.retiredSlots||[]),...retired])];
    delete next.appliedRoute;
   }
  }
  next.zeroRouteError='';next.zeroRouteErrorInfo=null;
  await persist(next);if(next.retiredSlots?.length)browserTransaction.collectRetired=true;return {name,applied:true};
 }
  async function materialize(name,profiles,transaction){
   const visited=new Set(),plans=[];
   function include(key){
    if(visited.has(key))return;visited.add(key);
    const p=profile(key,profiles);if(!p)throw error('PROFILE_NOT_FOUND','Profile not found','情景不存在');
    if(pendingBase(p))plans.push({p,slot:p._zeroRouteSlot,route:p._zeroRouteChoice,predecessor:p._zeroRoutePredecessor,...chainRecord(p._zeroRouteChain)});
    for(const route of ruleRoutes(p)){
     const b=ruleBinding(p,route,true);
     if(b.port===null)plans.push({p,slot:b.slot,route,predecessor:b.predecessor,...chainRecord(b.chain),rule:true});
    }
    references(p).forEach(include);
   }
   include(name);if(!plans.length)return;
   let c=await native('getState');
   for(const plan of plans){
    requireChain(c,plan.chain);
    if(!plan.rule&&plan.p._v2routeManual){
     const manual=plan.p._v2routeManual;
     const imported=await importManual({...plan.p,fallbackProxy:manual},manual);
     transaction.imported.push(imported);plan.route=imported.route;
    }
   }
   if(transaction.imported.length)c=await native('getState');
   const settings=clone(c.catalog.settings),added=[];
   for(const plan of plans){
    const choice=c.catalog.routes?.find(r=>r.value===plan.route);
    if(!choice||choice.supported===false&&(plan.rule||!(plan.chain!==undefined?choice.chain_supported:plan.predecessor!=='inherit'&&choice.override_supported)))throw error('SELECTED_NODE_UNAVAILABLE','Selected node is unavailable. Restore it or choose another node','所选节点不可用，请恢复节点或选择其他节点');
    const path={label:plan.p.name,route:plan.route,predecessor:plan.predecessor,...chainRecord(plan.chain)},prior=settings.buttons[plan.slot];
    // An unknown owner may have claimed this ID, including after an uncertain
    // previous reply. Never overwrite its record or roll it back.
    if(prior&&!samePath(prior,path))throw error('ROUTE_REVISION_CONFLICT','Route changed in another window. Refresh first','线路已在其他窗口修改，请先刷新');
    if(!prior){settings.buttons[plan.slot]=path;added.push(plan.slot);}
   }
   requireRelease(c,added);
   if(added.length){
    c=await configureNative(settings);
    transaction.undo.push({previous:{buttons:{},ports:{}},slots:added,expected:settings});
   }
   checkSlots(c,plans.map(plan=>plan.slot));
   for(const plan of plans){
    if(plan.rule)continue;
    const prepared=managed(plan.p,c,plan.slot,plan.route);
    prepared.revision=plan.p.revision;profiles[plan.p.name]=prepared;
   }
   for(const plan of plans)if(plan.rule)profiles[plan.p.name]._zeroRouteRuleBindings[plan.route]=ruleMetadata(c,plan.slot,plan.route);
  }
  async function apply(name,restore=false,candidate=model){
   const before=model,transaction={undo:[],imported:[]};
   const next=clone(candidate),profiles=restore&&next.appliedRoute?next.appliedRoute.profiles:next.profiles;
   try{
    if(!restore)await materialize(name,profiles,transaction);
    model=next;
    if(needed(name,profiles).length)await repairBindings(await native('getState'),false,name,restore&&!!model.appliedRoute,transaction);
    return await applyReady(name,restore);
   }catch(e){
    model=before;
    try{for(const undo of transaction.undo.reverse())await restoreSlots(undo.previous,undo.slots,undo.expected);await cleanupManual(transaction.imported);}
    catch(restoreError){throw error('PROFILE_SAVE_RESTORE_FAILED','Profile application failed and cleanup needs attention','情景应用失败且线路清理尚未完成',{},restoreError.message);}
    throw e;
   }
  }
 async function collectRetiredSlots(){
  if(!model.retiredSlots?.length)return;
  const retained=slotsIn(model.profiles);
  if(model.appliedRoute)for(const id of slotsIn(model.appliedRoute.profiles))retained.add(id);
  const ids=model.retiredSlots.filter(id=>!retained.has(id));
  if(ids.length===1)await releaseSlots(ids);
  else if(ids.length){
   const c=await native('getState'),batchSize=c.capabilities?.bulkReleaseSlots?1000:1;
   for(let i=0;i<ids.length;i+=batchSize)await releaseSlots(ids.slice(i,i+batchSize),c);
  }
  const next=clone(model);delete next.retiredSlots;await persist(next);
 }
  async function commitProfiles(profiles,currentName=model.currentProfileName){
   validateGraph(profiles);const before=clone(model),next=clone(model);
  next.profiles=profiles;next.currentProfileName=currentName;
  try{
   await persist(next);
   if(currentName!==before.currentProfileName||!next.appliedRoute&&own(profiles,currentName))await apply(currentName);
  }catch(e){await persist(before);throw e;}
 }
 function savedProfiles(p,from=p.name){
  const profiles=clone(model.profiles);if(from!==p.name)delete profiles[from];profiles[p.name]=p;
  if(from!==p.name)for(const item of Object.values(profiles))if(references(item).length){
   let changed=false;if(item.defaultProfileName===from){item.defaultProfileName=p.name;changed=true;}
   for(const rule of item.rules||[])if(rule.profileName===from){rule.profileName=p.name;changed=true;}
   if(changed)item.revision=revision();
  }
  validateGraph(profiles);return profiles;
 }
 function manualAuth(value,scheme){
  if(value===undefined||value===null)return null;
  if(typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['username','password'].includes(k)))throw error("INVALID_PROXY_AUTH",'Invalid proxy authentication','代理认证参数无效');
  const {username='',password=''}=value;
  if([username,password].some(v=>typeof v!=='string'||v.length>512||/[\x00-\x1f\x7f]/.test(v)))throw error("INVALID_PROXY_CREDENTIALS",'Invalid proxy credentials','代理账号或密码无效');
  if(!username&&!password)return null;
  if(!username)throw error("PROXY_USERNAME_REQUIRED",'Enter a proxy username','请输入代理用户名');
  if(!['http','https','socks5'].includes(scheme))throw error("SOCKS4_AUTH_UNSUPPORTED",'SOCKS4 authentication is not supported; use HTTP(S) or SOCKS5','SOCKS4 不支持此认证，请使用 HTTP(S) 或 SOCKS5');
  return {username,password};
 }
 async function importManual(p,auth){
  const endpoint=p.fallbackProxy,host=endpoint.host.includes(':')&&!endpoint.host.startsWith('[')?'['+endpoint.host+']':endpoint.host;
  let text;try{text=endpoint.scheme+'://'+encodeURIComponent(auth.username)+':'+encodeURIComponent(auth.password)+'@'+host+':'+endpoint.port+'#'+encodeURIComponent(p.name);}catch(_){throw error("INVALID_PROXY_CREDENTIALS",'Invalid proxy credentials','代理账号或密码无效');}
  const response=await native('importLinks',{text}),result=response.import_result,id=result?.ids?.[0];
  if(result?.ids?.length!==1||!/^local-[A-Za-z0-9_-]+$/.test(id||''))throw error("IMPORTED_PROXY_MISSING",'Companion did not return the imported proxy','本地组件未返回导入的代理');
  return {route:'node:'+id,added:result.added===1,id,manual:{...endpoint,...auth}};
 }
 async function cleanupManual(items){
  let failed=false;for(const item of items)if(item?.added)try{await native('removeNode',{id:item.id});}catch(_){failed=true;}
  if(failed)throw error("MANUAL_PROXY_CLEANUP_FAILED",'Save failed; a temporary imported proxy remains in the node library','保存失败；临时导入的代理仍保留在节点库，请检查后手动移除');
 }
 async function state(keys){
  const live=effectiveRoute(),active=profile(live.name,live.profiles);
  const appliedIcon=model.appliedRoute&&active?Object.fromEntries(['name','profileType','_zeroRouteIcon','_zeroRouteCountry','_zeroRouteChoice'].filter(k=>Object.hasOwn(active,k)).map(k=>[k,active[k]])):null;
  const s={appliedIcon,availableProfiles:{...clone(builtins),...clone(model.profiles)},currentProfileName:model.currentProfileName,isSystemProfile:model.currentProfileName==='system',proxyNotControllable:false,zeroRouteError:model.zeroRouteError||'',zeroRouteErrorInfo:model.zeroRouteErrorInfo||null};try{const p=await call(api.proxy.settings,'get',{});s.proxyNotControllable=['not_controllable','controlled_by_other_extensions'].includes(p?.levelOfControl);}catch(e){s.zeroRouteError=e.message;s.zeroRouteErrorInfo=serializeError(e);}return keys?Object.fromEntries(keys.map(k=>[k,s[k]])):s;}
 // Read-only effective-setting inspection. It never starts/repairs the Companion
 // or sets a proxy. A separate popup-scoped network check verifies reachability.
 async function connectionState(incognito=false){
  const runtime=effectiveRoute(),name=runtime.name,p=profile(name,runtime.profiles);
  const result={profile:model.currentProfileName,limited:p?.profileType==='SwitchProfile'||p?.profileType==='PacProfile'||name==='system'||!!p?.bypassList?.length||!!p?.rules?.length};
  if(!p)return {...result,status:'error',code:'MISSING'};
  const current=await call(api.proxy.settings,'get',firefox?{}:{incognito:incognito===true});
  if(['not_controllable','controlled_by_other_extensions'].includes(current?.levelOfControl))return {...result,status:'error',code:'OVERRIDDEN'};
  if(model.zeroRouteError)return {...result,status:'error',code:'APPLY_FAILED'};
  const actual=current?.value||{},type=firefox?actual.proxyType:actual.mode;
  let matches=false;
  if(nativeBuiltin(p))matches=type===(name==='direct'?(firefox?'none':'direct'):'system');
  else if(current?.levelOfControl!=='controlled_by_this_extension')return {...result,status:'error',code:'NOT_APPLIED'};
  else if(appliedConfig){
   matches=firefox?type===appliedConfig.proxyType&&actual.autoConfigUrl===appliedConfig.autoConfigUrl&&actual.proxyDNS===appliedConfig.proxyDNS:
    type===appliedConfig.mode&&actual.pacScript?.data===appliedConfig.pacScript?.data&&actual.pacScript?.mandatory===true;
  }else if(!firefox&&!needsSystem(name,runtime.profiles)){
   matches=type==='pac_script'&&actual.pacScript?.mandatory===true&&actual.pacScript?.data===(p.profileType==='PacProfile'?p.pacScript:pacFor(name,runtime.profiles));
  }else return {...result,status:'unknown',code:'UNVERIFIED'};
  if(!matches)return {...result,status:'error',code:'NOT_APPLIED'};
  // Return only a fingerprint; PAC data can include private manual endpoints.
  const bytes=new TextEncoder().encode(JSON.stringify([name,actual,runtime.profiles]));
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  return {...result,status:'ready',code:'READY',token:Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('')};
 }
 function revisionCheck(p,expected){if(p?(p.revision!==expected):(expected!==null&&expected!==undefined))throw error("PROFILE_REVISION_CONFLICT",'Profile changed in another window. Reopen it and try again','情景已在其他窗口修改，请重新打开后再试');}
 function validRoute(route){if(route!=='follow'&&!/^node:[A-Za-z0-9_-]{1,128}$/.test(route||''))throw error("INVALID_ROUTE",'Invalid route','线路无效');}
 function validPredecessor(route,value){if(!['inherit','none'].includes(value))validRoute(value);if(value==='follow'||(route==='follow'&&!['inherit','none'].includes(value)))throw error("INVALID_PREDECESSOR",'Invalid predecessor for this route','此前置代理不适用于所选线路');}
 function validChain(route,chain){if(chain===undefined)return;if(!Array.isArray(chain)||chain.some(value=>typeof value!=='string'||!/^node:[A-Za-z0-9_-]{1,128}$/.test(value))||(route==='follow'&&chain.length))throw error("INVALID_CHAIN",'Invalid ordered chain','多层代理节点或顺序无效');}
 function chainRecord(chain){return chain===undefined?{}:{chain:clone(chain)};}
 function modeObject(value,keys){return value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));}
 function validateModes(value){
  // Inactive drafts share the existing native-message budget, not a new hop limit.
  if(new TextEncoder().encode(JSON.stringify(value)).length>900*1024)throw error("INVALID_ROUTE_SETTINGS",'Route mode settings exceed the Companion message limit','线路模式设置超过本地组件传输上限');
  const route=value=>typeof value==='string'&&(value===''||value==='follow'||/^node:[A-Za-z0-9_-]{1,128}$/.test(value));
  const predecessor=value=>typeof value==='string'&&(['','inherit','none'].includes(value)||/^node:[A-Za-z0-9_-]{1,128}$/.test(value));
  if(!modeObject(value,['version','active','base','predecessor','chain'])||value.version!==1||!['base','predecessor','chain'].includes(value.active)||
   !modeObject(value.base,['route'])||!route(value.base.route)||!modeObject(value.predecessor,['route','predecessor'])||!route(value.predecessor.route)||!predecessor(value.predecessor.predecessor)||
   !modeObject(value.chain,['route','chain'])||!route(value.chain.route)||!Array.isArray(value.chain.chain)||value.chain.chain.some(item=>typeof item!=='string'||(item!==''&&!/^node:[A-Za-z0-9_-]{1,128}$/.test(item))))throw error("INVALID_ROUTE_SETTINGS",'Invalid route mode settings','线路模式设置无效');
  return clone(value);
 }
 function modeProjection(value){const item=value[value.active];return {route:item.route,predecessor:value.active==='predecessor'?item.predecessor:'none',...(value.active==='chain'?chainRecord(item.chain):{})};}
 function nodeModes(p,path,supplied){
  const active=path.chain!==undefined?'chain':path.predecessor==='none'?'base':'predecessor';
  if(supplied!==undefined){
   const value=validateModes(supplied),projected=modeProjection(value);
   validRoute(projected.route);validPredecessor(projected.route,projected.predecessor);validChain(projected.route,projected.chain);
   if(projected.route!==path.route||projected.predecessor!==path.predecessor||JSON.stringify(projected.chain)!==JSON.stringify(path.chain))throw error("INVALID_ROUTE_SETTINGS",'Active mode does not match the saved route','当前模式与保存线路不一致');
   return value;
  }
  const value=p?._v2routeNodeModes?validateModes(p._v2routeNodeModes):{version:1,active,base:{route:path.route},predecessor:{route:path.route,predecessor:path.predecessor},chain:{route:path.route,chain:clone(path.chain||[])}};
  const prior=modeProjection(value);
  // Legacy callers update the effective path without erasing other mode drafts.
  if(prior.predecessor!==path.predecessor||JSON.stringify(prior.chain)!==JSON.stringify(path.chain))value.active=active;
  value[value.active]={route:path.route,...(value.active==='predecessor'?{predecessor:path.predecessor}:value.active==='chain'?{chain:clone(path.chain)}:{})};
  return value;
 }
 // A capable companion can remove a chain; older services and orphan recovery need saved metadata.
 function storedChain(record,p,c){return record&&c.capabilities?.explicitChains?record.chain:record?.chain??p._zeroRouteChain;}
 function requireChain(c,chain){if(chain!==undefined&&!c.capabilities?.explicitChains)throw error("COMPANION_CHAINS_REQUIRED",'Upgrade the local companion to enable ordered chains','请升级本地组件以启用多层代理');}
 function routeCountry(c,route){const country=String(c?.catalog?.routes?.find(r=>r.value===route)?.country||'').toLowerCase();return /^[a-z]{2}$/.test(country)&&country!=='xx'?country:'';}
 function managed(p,c,slot,route){const port=c.catalog.settings.ports[slot];if(!validPort(port))throw error("ROUTE_PORT_UNAVAILABLE",'No port was allocated','未分配有效端口');const country=route==='follow'?'':routeCountry(c,route);const result={...p,revision:revision(),_zeroRouteSlot:slot,_zeroRouteChoice:route,_zeroRouteCountry:country,_zeroRoutePredecessor:c.catalog.settings.buttons[slot]?.predecessor||'inherit',_zeroRouteIcon:route==='follow'?'v2route-ui/icons/follow.svg':country?'v2route-assets/flags/'+country+'.svg':'v2route-ui/icons/route.svg',fallbackProxy:{scheme:'socks5',host:'127.0.0.1',port},proxyDNS:true,bypassList:p.bypassList||[]};const chain=c.catalog.settings.buttons[slot]?.chain;if(chain===undefined)delete result._zeroRouteChain;else result._zeroRouteChain=clone(chain);if(!p._v2routeManual)result._v2routeNodeModes=nodeModes(p,{route,predecessor:result._zeroRoutePredecessor,...chainRecord(chain)});return result;}
  async function repairBindings(c,reapply=true,name=model.currentProfileName,restorePinned=false,transaction=null){
  const profiles=restorePinned?model.appliedRoute.profiles:model.profiles;
  if(c.catalog.error||!Array.isArray(c.catalog.routes))return c;
  const available=new Map(c.catalog.routes.map(route=>[route.value,route]));
  const wanted=new Set();function include(name){if(wanted.has(name))return;wanted.add(name);const p=profile(name,profiles);if(p)for(const ref of references(p))include(ref);}include(name);
  const settings=clone(c.catalog.settings),plans=[];
  for(const p of Object.values(profiles)){
   if(!wanted.has(p.name))continue;
   for(const route of ruleRoutes(p)){
     const b=ruleBinding(p,route,true),previous=settings.buttons[b.slot];
     if(b.port===null)continue;
    // A node rule never adopts another slot's route or falls back to Follow.
    if(!available.has(route)||available.get(route).supported===false||(previous&&!samePath(previous,b))||(b.chain!==undefined&&!c.capabilities?.explicitChains))continue;
    const configure=!previous||!validPort(settings.ports[b.slot]);
    if(!configure&&b.port===settings.ports[b.slot])continue;
    if(configure)settings.buttons[b.slot]={label:p.name,route,predecessor:b.predecessor,...chainRecord(b.chain)};
    plans.push({p,slot:b.slot,route,previous,configure,rule:true});
   }
    if(!p._zeroRouteSlot||p._v2routeManual||pendingBase(p))continue;
   const slot=p._zeroRouteSlot,previous=settings.buttons[slot];
   let route=previous?.route||p._zeroRouteChoice||'follow';
   if(route==='manual'||route==='none')route=p._zeroRouteChoice||'follow';
   const managedChoice=typeof route==='string'&&(route==='follow'||route.startsWith('node:'));
   if(!managedChoice||!available.has(route)){
    // A missing explicit choice remains selected for repair; never switch it to Follow.
    if((typeof route==='string'&&route.startsWith('node:'))||storedChain(previous,p,c)!==undefined)continue;
    if(!available.has('follow')||available.get('follow').supported===false)continue;
    route='follow';
   }
   const savedPredecessor=previous?.predecessor||p._zeroRoutePredecessor||'inherit',predecessor=route==='follow'&&!['inherit','none'].includes(savedPredecessor)?'inherit':savedPredecessor,chain=storedChain(previous,p,c);
   if(chain!==undefined&&!c.capabilities?.explicitChains)continue;
   const configure=!previous||previous.route!==route||!validPort(settings.ports[slot]);
   const metadata=p._zeroRouteChoice!==route||p._zeroRoutePredecessor!==predecessor||JSON.stringify(p._zeroRouteChain)!==JSON.stringify(chain)||p.fallbackProxy?.port!==settings.ports[slot];
   if(!configure&&!metadata)continue;
   if(configure)settings.buttons[slot]={label:p.name,route,predecessor,...chainRecord(chain)};
   plans.push({p,slot,route,previous,configure});
  }
  if(!plans.length)return c;
  const before=clone(model),changed=plans.filter(plan=>plan.configure);
  requireRelease(c,changed.filter(plan=>!plan.previous).map(plan=>plan.slot));
  let done=c,configured=false;
  try{
   if(changed.length){
     done=await configureNative(settings);configured=true;
    checkSlots(done,changed.map(plan=>plan.slot));
   }
   const next=clone(model);
   const updated=restorePinned?next.appliedRoute.profiles:next.profiles;
   for(const plan of plans)if(plan.rule){const p=updated[plan.p.name];p._zeroRouteRuleBindings[plan.route]=ruleMetadata(done,plan.slot,plan.route);}else updated[plan.p.name]=managed(updated[plan.p.name],done,plan.slot,plan.route);
    if(transaction)model=next;else await persist(next);
   const live=effectiveRoute(),activeSlots=new Set(needed(live.name,live.profiles));
   if(reapply&&plans.some(plan=>activeSlots.has(plan.slot))){
    if(model.appliedRoute)await repairBindings(done,false,live.name,true);
    await applyReady(live.name,!!model.appliedRoute);
   }
   if(transaction&&configured)transaction.undo.push({previous:c.catalog.settings,slots:changed.map(plan=>plan.slot),expected:settings});
   return done;
  }catch(e){
    if(transaction)model=before;else await persist(before);
   if(configured)try{await restoreSlots(c.catalog.settings,changed.map(plan=>plan.slot),settings);}
   catch(restore){throw error("ROUTE_RECOVERY_RESTORE_FAILED",'Route recovery failed and restoration needs attention: '+restore.message,'线路恢复失败且原绑定尚未完全还原',{},restore.details||restore.message);}
   throw e;
  }
 }
 async function restoreSlots(previous,slots,expected){
  const c=await native('getState'),settings=clone(c.catalog.settings);
  const touched=slots.filter(slot=>(!expected||sameRecord(settings.buttons[slot],expected.buttons[slot]))&&(!sameRecord(settings.buttons[slot],previous.buttons[slot])||settings.ports[slot]!==previous.ports[slot]));
  const existing=touched.filter(slot=>previous.buttons[slot]),created=touched.filter(slot=>!previous.buttons[slot]);
  requireRelease(c,created);
  for(const slot of existing){settings.buttons[slot]=clone(previous.buttons[slot]);if(validPort(previous.ports[slot]))settings.ports[slot]=previous.ports[slot];}
  if(existing.length)await configureNative(settings);
  await releaseSlots(created,c);
 }
 async function rollbackSlot(slot,record,expected){const c=await native('getState'),settings=clone(c.catalog.settings);if(!sameRecord(settings.buttons[slot],expected))return c;if(!record)return releaseSlots([slot],c);settings.buttons[slot]=record;return configureNative(settings);}
  async function bind(name,route,prior,manual,predecessor){let p=model.profiles[name];if(!p||p.profileType!=='FixedProfile')throw error("PROXY_PROFILE_REQUIRED",'Choose a proxy profile','请选择代理情景');const c=await native('getState'),current=binding(name,c);if(!prior||prior.slot!==current.slot||prior.route!==current.route||(prior.predecessor||'inherit')!==current.predecessor||JSON.stringify(prior.chain)!==JSON.stringify(current.chain))throw error("ROUTE_REVISION_CONFLICT",'Route changed in another window. Refresh first','线路已在其他窗口修改，请先刷新');
   if(model.appliedRoute||hasPending(p)){
    if(route==='manual'&&!p._zeroRouteSlot)return enrich(c,name);
    if(route==='manual'&&!manual)throw error('DETACH_PROXY_REQUIRED','Enter the replacement manual proxy before detaching','解除绑定前请填写手工代理');
    const chain=route==='follow'?undefined:current.chain;
    const input=route==='manual'?{...manual,name,profileType:'FixedProfile',color:p.color,rules:p.rules}:p;
    await editProfile(input,p.revision,route==='manual'?{route}:{route,predecessor:chain!==undefined?'none':predecessor??current.predecessor,...chainRecord(chain)},name,'save');
    return enrich(c,name);
   }
  if(route==='manual'){if(!p._zeroRouteSlot)return enrich(c,name);if(!manual)throw error("DETACH_PROXY_REQUIRED",'Enter the replacement manual proxy before detaching','解除绑定前请填写手工代理');const old=p._zeroRouteSlot,before=clone(model),next=clone(model.profiles);const replacement=sanitize({...manual,name,profileType:'FixedProfile',color:p.color,...(p.rules?{rules:p.rules}:{})},undefined,p);if(p._zeroRouteRuleBindings)replacement._zeroRouteRuleBindings=clone(p._zeroRouteRuleBindings);if(replacement.fallbackProxy.host==='127.0.0.1'&&replacement.fallbackProxy.port===p.fallbackProxy.port)throw error("DETACH_PORT_CONFLICT",'The managed port will be released. Enter a different manual proxy','此自动端口即将释放，请填写其他手工代理');next[name]=replacement;await commitProfiles(next);try{return enrich(await native('releaseSlot',{id:old}),name);}catch(e){await persist(before);throw e;}}
  validRoute(route);const chain=route==='follow'?undefined:current.chain;requireChain(c,chain);predecessor=chain!==undefined?'none':predecessor??current.predecessor;validPredecessor(route,predecessor);const slot=p._zeroRouteSlot||'zo-'+crypto.randomUUID(),settings=clone(c.catalog.settings),previous=settings.buttons[slot];settings.buttons[slot]={label:name,route,predecessor,...chainRecord(chain)};const done=await configureNative(settings);try{checkSlots(done,[slot]);const profiles=clone(model.profiles);profiles[name]=managed(p,done,slot,route);await commitProfiles(profiles);return enrich(done,name);}catch(e){try{await rollbackSlot(slot,previous,settings.buttons[slot]);}catch(rollback){throw error("ROUTE_SAVE_ROLLBACK_FAILED",'Route save failed and rollback needs attention: '+rollback.message,'线路保存失败且恢复未完成',{},rollback.details||rollback.message);}throw e;}
 }
  // A null port records a saved path which has never owned a listener. Its
  // reserved ID survives editor reloads. Only explicit Apply may bind it.
  function draftProfile(input,expected,routing,renameTo){
   const from=input?.name,previous=own(model.profiles,from),target=renameTo??from;
   revisionCheck(previous,expected);
   if(Object.hasOwn(builtins,from)&&(!builtinInput(input)||target!==from))throw error('BUILTIN_PROFILE_LOCKED','Built-in profiles keep their name and type','内置情景的名称和类型不可更改');
   if(!builtinInput(input)&&(!nameValid(from)||!nameValid(target)||target!==from&&own(model.profiles,target)))throw error('PROFILE_NAME_CONFLICT','Invalid or duplicate profile name','名称无效或已存在');
   const fixed=input.profileType==='FixedProfile';
   if(routing!=null&&(!fixed||typeof routing!=='object'||Array.isArray(routing)||Object.keys(routing).some(k=>!['route','predecessor','auth','chain','modes'].includes(k))||routing.auth!==undefined&&routing.route!=='manual'||routing.modes!==undefined&&routing.route==='manual'))throw error('INVALID_ROUTE_SETTINGS','Invalid route settings','线路设置无效');
   if(routing?.route==='manual'&&routing.chain!==undefined)throw error('MANUAL_CHAIN_UNSUPPORTED','Manual proxies do not accept a node chain','手工代理不能附带节点链');
   const retained=fixed&&!routing&&previous?._zeroRouteSlot;
   const auth=routing?.route==='manual'?manualAuth(routing.auth,input.fallbackProxy?.scheme):null;
   const node=retained?!previous._v2routeManual:!!routing&&routing.route!=='manual';
   const source={...input,name:target};
   if(input.profileType!=='PacProfile'&&source.rules===undefined&&previous?.rules)source.rules=previous.rules;
   if(node)source.fallbackProxy={scheme:'socks5',host:'127.0.0.1',port:1};
   if(retained&&previous._v2routeManual)source.fallbackProxy=previous._v2routeManual;
   const p=sanitize(source,undefined,previous);
   const manual=auth?{...p.fallbackProxy,...auth}:retained?previous._v2routeManual:null;
   if(node||manual){
    const route=node?(routing?.route??previous._zeroRouteChoice):null;
    const chain=node?(routing?routing.chain:previous._zeroRouteChain):undefined;
    let predecessor=node?(routing?routing.predecessor??'inherit':previous._zeroRoutePredecessor||'inherit'):'none';
    if(node){
     validRoute(route);validPredecessor(route,predecessor);validChain(route,chain);
     if(chain!==undefined){
      if(routing?.modes!==undefined&&routing.predecessor!==undefined&&predecessor!=='none')throw error('INVALID_ROUTE_SETTINGS','Active mode does not match the saved route','当前模式与保存线路不一致');
      predecessor='none';
     }
     p._v2routeNodeModes=nodeModes(previous,{route,predecessor,...chainRecord(chain)},routing?.modes);
    }else p._v2routeManual=clone(manual);
    const same=previous?._zeroRouteSlot&&(manual?previous._v2routeManual&&['scheme','host','port','username','password'].every(k=>previous._v2routeManual[k]===manual[k]):!previous._v2routeManual&&previous._zeroRouteChoice===route&&(previous._zeroRoutePredecessor||'inherit')===predecessor&&JSON.stringify(previous._zeroRouteChain)===JSON.stringify(chain));
    p._zeroRouteSlot=same||pendingBase(previous)?previous._zeroRouteSlot:'zo-'+crypto.randomUUID();
    p._zeroRouteChoice=manual?(same?previous._zeroRouteChoice:'manual'):route;
    p._zeroRoutePredecessor=predecessor;
    if(chain!==undefined)p._zeroRouteChain=clone(chain);
    const country=same?previous._zeroRouteCountry||'':routeCountry(latest,route);
    p._zeroRouteCountry=country;
    p._zeroRouteIcon=route==='follow'?'v2route-ui/icons/follow.svg':country?'v2route-assets/flags/'+country+'.svg':'v2route-ui/icons/route.svg';
    p.fallbackProxy=same?clone(previous.fallbackProxy):{scheme:'socks5',host:'127.0.0.1',port:null};
   }else if(fixed&&previous?._zeroRouteSlot&&p.fallbackProxy.host==='127.0.0.1'&&p.fallbackProxy.port===previous.fallbackProxy?.port)throw error('DETACH_PORT_CONFLICT','The managed port will be released. Enter a different manual proxy','此自动端口即将释放，请填写其他手工代理');
   for(const route of ruleRoutes(p)){
    p._zeroRouteRuleBindings??={};
    p._zeroRouteRuleBindings[route]=previous?._zeroRouteRuleBindings?.[route]?clone(ruleBinding(previous,route,true)):{slot:'zo-'+crypto.randomUUID(),route,predecessor:'inherit',port:null};
   }
   return p;
  }
  async function editProfile(input,expected,routeOptions,renameTo,intent){
   const previous=own(model.profiles,input?.name);
   if(intent===undefined&&!model.appliedRoute&&!hasPending(previous))return saveProfile(input,expected,routeOptions,renameTo);
   intent??='save';
   if(intent!=='apply'&&intent!=='save')throw error('INVALID_ROUTE_SETTINGS','Unknown profile action','情景操作无效');
   const p=draftProfile(input,expected,routeOptions,renameTo),pinned=pinCurrentRoute(),next=clone(model);
   next.profiles=savedProfiles(p,input.name);
   if(model.currentProfileName===input.name)next.currentProfileName=p.name;
   if(intent==='apply'||model.appliedRoute||Object.hasOwn(pinned.profiles,input.name))next.appliedRoute=pinned;
   const retained=slotsIn(next.profiles),retired=ownedSlots(previous).filter(slot=>!retained.has(slot));
   if(retired.length)next.retiredSlots=[...new Set([...(next.retiredSlots||[]),...retired])];
   if(intent==='apply')await apply(p.name,false,next);
   else await persist(next);
   return clone(model.profiles[p.name]);
  }
 async function saveProfile(input,expected,routeOptions,renameTo){
   const existing=own(model.profiles,input?.name);
  if(Object.hasOwn(builtins,input?.name||'')&&(!builtinInput(input)||renameTo!==undefined&&renameTo!==input.name))throw error('BUILTIN_PROFILE_LOCKED','Built-in profiles keep their name and type','内置情景的名称和类型不可更改');
  if(builtinInput(input)||input?.profileType==='FixedProfile'&&(input.rules!==undefined||existing?.rules?.length)||existing?.profileType!=='SwitchProfile'&&existing?._zeroRouteRuleBindings)return savePolicyProfile(input,expected,routeOptions,renameTo);
  if(input?.profileType==='SwitchProfile')return saveRuleProfile(input,expected,routeOptions,renameTo);
  if(!existing?._zeroRouteRuleBindings)return saveProfileBase(input,expected,routeOptions,renameTo);
  revisionCheck(existing,expected);
  const before=clone(model),c=await native('getState'),oldSlots=ownedSlots(existing);requireRelease(c,oldSlots);
  let saved=null;const transaction={};
  try{saved=await saveProfileBase(input,expected,routeOptions,renameTo,transaction);await releaseSlots(oldSlots,c);return saved;}
  catch(e){if(saved){await persist(before);try{await restoreSlots(c.catalog.settings,ownedSlots(saved));await cleanupManual([transaction.imported]);}catch(restore){throw error("PROFILE_SAVE_RESTORE_FAILED",'Save failed and route restoration needs attention: '+restore.message,'保存失败且线路恢复未完成',{},restore.details||restore.message);}}throw e;}
 }
 // Plan the default path and exception paths together. No profile or browser
 // configuration is committed until every required native slot is available.
 async function savePolicyProfile(input,expected,routeOptions,renameTo){
   const from=input.name,existing=own(model.profiles,from);revisionCheck(existing,expected);
  const target=renameTo??from,builtin=builtinInput(input);
  if(!builtin&&(!nameValid(from)||!nameValid(target)||target!==from&&own(model.profiles,target)))throw error('PROFILE_NAME_CONFLICT','Invalid or duplicate profile name','名称无效或已存在');
  if(routeOptions===null)routeOptions=undefined;
  if(routeOptions!==undefined&&(!routeOptions||typeof routeOptions!=='object'||Array.isArray(routeOptions)||Object.keys(routeOptions).some(k=>!['route','predecessor','auth','chain','modes'].includes(k))||input.profileType!=='FixedProfile'||routeOptions.auth!==undefined&&routeOptions.route!=='manual'||routeOptions.modes!==undefined&&routeOptions.route==='manual'))throw error('INVALID_ROUTE_SETTINGS','Invalid route settings','线路设置无效');
  const auth=routeOptions?.route==='manual'?manualAuth(routeOptions.auth,input.fallbackProxy?.scheme):null;
  if(routeOptions?.route==='manual'&&routeOptions.chain!==undefined)throw error('MANUAL_CHAIN_UNSUPPORTED','Manual proxies do not accept a node chain','手工代理不能附带节点链');
  const bindBase=!!(routeOptions&&routeOptions.route!=='manual'||auth),detach=!!(existing?._zeroRouteSlot&&routeOptions?.route==='manual'&&!auth);
  const source={...input,name:target,rules:input.rules??existing?.rules??[]};
  let p=sanitize(bindBase&&!auth?{...source,fallbackProxy:{scheme:'socks5',host:'127.0.0.1',port:1}}:source,bindBase||detach?undefined:existing,existing);
  let route=routeOptions?.route,predecessor=auth?'none':routeOptions?.predecessor??'inherit',chain=routeOptions?.chain;
  if(bindBase&&!auth){validRoute(route);validPredecessor(route,predecessor);validChain(route,chain);if(chain!==undefined)predecessor='none';if(routeOptions.modes!==undefined&&chain!==undefined&&routeOptions.predecessor!==undefined&&routeOptions.predecessor!=='none')throw error('INVALID_ROUTE_SETTINGS','Active mode does not match the saved route','当前模式与保存线路不一致');p._v2routeNodeModes=nodeModes(existing,{route,predecessor,...chainRecord(chain)},routeOptions.modes);}
  if(detach&&p.fallbackProxy.host==='127.0.0.1'&&p.fallbackProxy.port===existing.fallbackProxy.port)throw error('DETACH_PORT_CONFLICT','The managed port will be released. Enter a different manual proxy','此自动端口即将释放，请填写其他手工代理');
  savedProfiles(p,from);
  const before=clone(model),currentName=model.currentProfileName===from?target:model.currentProfileName,routes=ruleRoutes(p),oldSlots=ownedSlots(existing);
  if(!bindBase&&!routes.length&&!oldSlots.length){await commitProfiles(savedProfiles(p,from),currentName);return clone(p);}
  const original=await native('getState');let c=original,imported=null,configured=false,expectedSettings=null;const changed=[];
  try{
   if(bindBase){requireChain(c,chain);if(existing?._zeroRouteSlot){const old=c.catalog.settings.buttons[existing._zeroRouteSlot];if(!old||old.route!==existing._zeroRouteChoice||(old.predecessor||'inherit')!==(existing._zeroRoutePredecessor||'inherit')||JSON.stringify(old.chain)!==JSON.stringify(existing._zeroRouteChain))throw error('ROUTE_REVISION_CONFLICT','Route changed in another window. Refresh first','线路已在其他窗口修改，请先刷新');}}
   if(auth){imported=await importManual(p,auth);route=imported.route;p._v2routeManual=imported.manual;c=await native('getState');}
   const settings=clone(c.catalog.settings),available=new Map((c.catalog.routes||[]).map(r=>[r.value,r]));let baseSlot=null;
   if(bindBase){baseSlot=existing?._zeroRouteSlot||'zo-'+crypto.randomUUID();settings.buttons[baseSlot]={label:target,route,predecessor,...chainRecord(chain)};changed.push(baseSlot);}
   if(routes.length)p._zeroRouteRuleBindings={};
   for(const choice of routes){
    if(!available.has(choice)||available.get(choice).supported===false)throw error('SELECTED_NODE_UNAVAILABLE','Selected node is unavailable. Restore it or choose another node','所选节点不可用，请恢复节点或选择其他节点');
    const b=existing?._zeroRouteRuleBindings?.[choice];if(b)ruleBinding(existing,choice);
    const slot=b?.slot||'zo-'+crypto.randomUUID(),old=settings.buttons[slot];
    if(old&&(!b||!samePath(old,b)))throw error('RULE_REVISION_CONFLICT','Node rule changed in another window. Refresh first','节点规则已在其他窗口修改，请先刷新');
    const pre=b?.predecessor||'inherit',hops=b?.chain;requireChain(c,hops);settings.buttons[slot]={label:target,route:choice,predecessor:pre,...chainRecord(hops)};changed.push(slot);p._zeroRouteRuleBindings[choice]={slot,route:choice};
   }
   const retained=new Set([...changed,...(!bindBase&&p._zeroRouteSlot?[p._zeroRouteSlot]:[])]),unused=oldSlots.filter(slot=>!retained.has(slot));requireRelease(c,unused);requireRelease(c,changed.filter(slot=>!original.catalog.settings.buttons[slot]));
    expectedSettings=settings;let done=c;if(changed.length){done=await configureNative(settings);configured=true;checkSlots(done,changed);}
   if(baseSlot)p=managed(p,done,baseSlot,route);
   for(const choice of routes)p._zeroRouteRuleBindings[choice]=ruleMetadata(done,p._zeroRouteRuleBindings[choice].slot,choice);
   await commitProfiles(savedProfiles(p,from),currentName);
   if(unused.length)configured=true;await releaseSlots(unused,c);return clone(p);
  }catch(e){
   await persist(before);
   try{if(configured)await restoreSlots(original.catalog.settings,[...new Set([...changed,...oldSlots])],expectedSettings);await cleanupManual([imported]);}
   catch(restore){throw error('PROFILE_SAVE_RESTORE_FAILED','Save failed and route restoration needs attention: '+restore.message,'保存失败且线路恢复未完成',{},restore.details||restore.message);}
   throw e;
  }
 }
 async function saveRuleProfile(input,expected,routeOptions,renameTo){
   const from=input?.name,existing=own(model.profiles,from);revisionCheck(existing,expected);
  const target=renameTo??from;if(!nameValid(from)||!nameValid(target)||(target!==from&&own(model.profiles,target)))throw error("PROFILE_NAME_CONFLICT",'Invalid or duplicate profile name','名称无效或已存在');
  if(routeOptions!==undefined&&routeOptions!==null)throw error("INVALID_ROUTE_SETTINGS",'Invalid route settings','线路设置无效');
  const p=sanitize({...input,name:target},undefined,existing),routes=ruleRoutes(p),before=clone(model),currentName=model.currentProfileName===from?target:model.currentProfileName;
  savedProfiles(p,from);
  const oldSlots=ownedSlots(existing);
  if(!routes.length&&!oldSlots.length){await commitProfiles(savedProfiles(p,from),currentName);return clone(p);}
  const c=await native('getState'),settings=clone(c.catalog.settings),changed=[];
  const available=new Map((c.catalog.routes||[]).map(r=>[r.value,r]));
  p._zeroRouteRuleBindings={};
  for(const route of routes){
   if(!available.has(route)||available.get(route).supported===false)throw error("SELECTED_NODE_UNAVAILABLE",'Selected node is unavailable. Restore it or choose another node','所选节点不可用，请恢复节点或选择其他节点');
   const b=existing?._zeroRouteRuleBindings?.[route];if(b)ruleBinding(existing,route);
   const slot=b?.slot||'zo-'+crypto.randomUUID(),previous=settings.buttons[slot];
   if(previous&&(!b||!samePath(previous,b)))throw error("RULE_REVISION_CONFLICT",'Node rule changed in another window. Refresh first','节点规则已在其他窗口修改，请先刷新');
   const predecessor=b?.predecessor||'inherit',chain=b?.chain;requireChain(c,chain);
   settings.buttons[slot]={label:target,route,predecessor,...chainRecord(chain)};changed.push(slot);p._zeroRouteRuleBindings[route]={slot,route};
  }
  const unused=oldSlots.filter(slot=>!changed.includes(slot));requireRelease(c,unused);requireRelease(c,changed.filter(slot=>!c.catalog.settings.buttons[slot]));
  let configured=false;
  try{
    if(changed.length){const done=await configureNative(settings);configured=true;checkSlots(done,changed);for(const route of routes)p._zeroRouteRuleBindings[route]=ruleMetadata(done,p._zeroRouteRuleBindings[route].slot,route);}
   if(!routes.length)delete p._zeroRouteRuleBindings;
   await commitProfiles(savedProfiles(p,from),currentName);
   await releaseSlots(unused,c);return clone(p);
  }catch(e){await persist(before);if(configured)try{await restoreSlots(c.catalog.settings,changed,settings);}catch(restore){throw error("PROFILE_SAVE_RESTORE_FAILED",'Save failed and route restoration needs attention: '+restore.message,'保存失败且线路恢复未完成',{},restore.details||restore.message);}throw e;}
 }
 async function saveProfileBase(input,expected,routeOptions,renameTo,transaction){
   const from=input?.name,existing=own(model.profiles,from);revisionCheck(existing,expected);
  const target=renameTo??from;if(!nameValid(from)||!nameValid(target)||(target!==from&&own(model.profiles,target)))throw error("PROFILE_NAME_CONFLICT",'Invalid or duplicate profile name','名称无效或已存在');
  input={...input,name:target};if(routeOptions===null)routeOptions=undefined;
  if(routeOptions!==undefined&&(!routeOptions||typeof routeOptions!=='object'||Array.isArray(routeOptions)||Object.keys(routeOptions).some(k=>!['route','predecessor','auth','chain','modes'].includes(k))||input?.profileType!=='FixedProfile'||(routeOptions.auth!==undefined&&routeOptions.route!=='manual')||(routeOptions.modes!==undefined&&routeOptions.route==='manual')))throw error("INVALID_ROUTE_SETTINGS",'Invalid route settings','线路设置无效');
  const currentName=model.currentProfileName===from?target:model.currentProfileName;
  const auth=routeOptions?.route==='manual'?manualAuth(routeOptions.auth,input.fallbackProxy?.scheme):null;
  if(routeOptions?.route==='manual'&&routeOptions.chain!==undefined)throw error("MANUAL_CHAIN_UNSUPPORTED",'Manual proxies do not accept a node chain','手工代理不能附带节点链');
  if((routeOptions&&routeOptions.route!=='manual')||auth){
   let imported=null;
   const draft=sanitize(auth?input:{...input,fallbackProxy:{scheme:'socks5',host:'127.0.0.1',port:1}},undefined,existing);savedProfiles(draft,from);
   let route=routeOptions.route,predecessor=auth?'none':routeOptions.predecessor??'inherit',chain=routeOptions.chain;if(!auth){validRoute(route);validPredecessor(route,predecessor);validChain(route,chain);}if(chain!==undefined)predecessor='none';
   if(routeOptions.modes!==undefined&&chain!==undefined&&routeOptions.predecessor!==undefined&&routeOptions.predecessor!=='none')throw error("INVALID_ROUTE_SETTINGS",'Active mode does not match the saved route','当前模式与保存线路不一致');
   if(!auth)draft._v2routeNodeModes=nodeModes(existing,{route,predecessor,...chainRecord(chain)},routeOptions.modes);
   const c=await native('getState');requireChain(c,chain);
   const slot=existing?._zeroRouteSlot||'zo-'+crypto.randomUUID(),settings=clone(c.catalog.settings),previous=settings.buttons[slot];
   if(existing?._zeroRouteSlot&&(!previous||previous.route!==existing._zeroRouteChoice||(previous.predecessor||'inherit')!==(existing._zeroRoutePredecessor||'inherit')||JSON.stringify(previous.chain)!==JSON.stringify(existing._zeroRouteChain)))throw error("ROUTE_REVISION_CONFLICT",'Route changed in another window. Refresh first','线路已在其他窗口修改，请先刷新');
   let configured=false;
   try{
    if(auth){imported=await importManual(draft,auth);route=imported.route;draft._v2routeManual=imported.manual;}
     settings.buttons[slot]={label:target,route,predecessor,...chainRecord(chain)};const done=await configureNative(settings);configured=true;
    checkSlots(done,[slot]);const p=managed(draft,done,slot,route);await commitProfiles(savedProfiles(p,from),currentName);if(transaction)transaction.imported=imported;return clone(p);
   }catch(e){if(configured)try{await rollbackSlot(slot,previous,settings.buttons[slot]);}catch(rollback){throw error("PROFILE_SAVE_RESTORE_FAILED",'Save failed and route restoration needs attention: '+rollback.message,'保存失败且线路恢复未完成',{},rollback.details||rollback.message);}await cleanupManual([imported]);throw e;}
  }
  const detaching=existing?._zeroRouteSlot&&(input.profileType!=='FixedProfile'||routeOptions?.route==='manual');
  const p=sanitize(input,detaching?undefined:existing,existing),before=clone(model);
  if(p._zeroRouteSlot&&!p._v2routeManual)p._v2routeNodeModes=nodeModes(existing,{route:p._zeroRouteChoice,predecessor:p._zeroRoutePredecessor||'inherit',...chainRecord(p._zeroRouteChain)});
  if(detaching&&p.profileType==='FixedProfile'&&p.fallbackProxy.host==='127.0.0.1'&&p.fallbackProxy.port===existing.fallbackProxy.port)throw error("DETACH_PORT_CONFLICT",'The managed port will be released. Enter a different manual proxy','此自动端口即将释放，请填写其他手工代理');
  await commitProfiles(savedProfiles(p,from),currentName);
  if(detaching)try{await native('releaseSlot',{id:existing._zeroRouteSlot});}catch(e){await persist(before);throw e;}
  return clone(p);
 }
 const methods={
  v2routeClearToolCache:value=>toolCache.clear(value),
  v2routeWaitToolCache:value=>toolCache.wait(value),
  getAll:()=>Object.fromEntries(Object.entries({...builtins,...model.profiles}).map(([k,v])=>['+'+k,clone(v)])),
  getState:state,
   v2routeConnectionState:connectionState,
  v2routeCachedProfileCountries:()=>latest?Object.fromEntries(Object.values(model.profiles).filter(p=>p._zeroRouteChoice?.startsWith('node:')).map(p=>[p.name,{choice:p._zeroRouteChoice,country:routeCountry(latest,p._zeroRouteChoice)}])):{},
  applyProfile:(name,expected)=>{if(expected!==undefined)revisionCheck(own(model.profiles,name),expected);return apply(name);},
  zeroRouteGetState:async name=>enrich(await repairBindings(await native('getState'),true,name||model.currentProfileName),name),
  zeroRouteEnsure:async()=>enrich(await native('ensure')),
  zeroRouteReorder:async value=>enrich(await native('reorder',value)),
  zeroRouteBind:bind,
  zeroRouteCreate:async(input,route='follow',predecessor='inherit')=>{if(!input||!nameValid(input.name)||model.profiles[input.name])throw error("PROFILE_NAME_REQUIRED",'Choose a unique profile name','请输入不重复的情景名称');validRoute(route);validPredecessor(route,predecessor);const c=await native('getState'),slot='zo-'+crypto.randomUUID(),settings=clone(c.catalog.settings);settings.buttons[slot]={label:input.name,route,predecessor};const done=await configureNative(settings);try{checkSlots(done,[slot]);const p=managed({name:input.name,profileType:'FixedProfile',color:input.color||'#269eab',bypassList:[]},done,slot,route);const profiles=clone(model.profiles);profiles[p.name]=p;await commitProfiles(profiles);return enrich(done,p.name);}catch(e){try{await native('releaseSlot',{id:slot});}catch(_){}throw e;}},
  v2routeSaveProfile:editProfile,
  v2routeChainProbe:async value=>{
   if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['route','chain','index','predecessor'].includes(k)))throw error("INVALID_CHAIN_PROBE",'Invalid chain probe','链路探测请求无效');
   validRoute(value.route);validChain(value.route,value.chain);if(!Array.isArray(value.chain)||!Number.isInteger(value.index)||value.index<0||value.index>value.chain.length)throw error("INVALID_HOP_INDEX",'Invalid hop index','链路层号无效');
   if(Object.hasOwn(value,'predecessor')){if(typeof value.predecessor!=='string')throw error("INVALID_LEGACY_PREDECESSOR",'Invalid legacy predecessor','继承模式前置无效');validPredecessor(value.route,value.predecessor);}
   const response=await call(api.runtime,'sendNativeMessage',HOST,{command:'chainProbe',settings:value});
   if(!response?.ok||typeof response.result?.ok!=='boolean'||response.result.index!==value.index)throw nativeError(response,'CHAIN_PROBE_FAILED','Chain probe failed / 链路探测失败',{command:'chainProbe'},true);return response.result;
  },
   renameProfile:async(from,to)=>{const p=own(model.profiles,from);if(!p||!nameValid(to)||own(model.profiles,to))throw error("PROFILE_NAME_CONFLICT",'Invalid or duplicate profile name','名称无效或已存在');const manual=p._v2routeManual;return editProfile(manual?{...p,fallbackProxy:{scheme:manual.scheme,host:manual.host,port:manual.port}}:p,p.revision,manual?{route:'manual',auth:{username:manual.username,password:manual.password}}:p._zeroRouteSlot?{route:p._zeroRouteChoice,predecessor:p._zeroRoutePredecessor||'inherit',...chainRecord(p._zeroRouteChain)}:null,to);},
  v2routeDeleteProfile:async(name,expected,options)=>{
   if(Object.hasOwn(builtins,name))throw error('BUILTIN_PROFILE_LOCKED','Built-in profiles cannot be removed','内置情景不能移除');
   const p=model.profiles[name];revisionCheck(p,expected);
   if(!p)throw error("PROFILE_NOT_FOUND",'Profile not found','情景不存在');
   const active=model.currentProfileName===name;
   if(active&&options?.switchTo!=='system')throw error("ACTIVE_PROFILE_DELETE",'Switch to another profile before deleting','请切换到其他情景后再删除');
   if(Object.values(model.profiles).some(x=>references(x).includes(name)))throw error("REFERENCED_PROFILE_DELETE",'This profile is referenced by an automatic rule','该情景被自动规则引用');
   const before=clone(model),next=clone(model),slots=ownedSlots(p),c=slots.length?await native('getState'):null;if(c)requireRelease(c,slots);
   delete next.profiles[name];
   if(active)await commitProfiles(next.profiles,'system');
   else await persist(next);
   try{await releaseSlots(slots,c);}
   catch(e){await persist(before);throw e;}
   if(active)await indicator(profile('system'));
   return true;
  },
  v2routeImportLinks:async text=>enrich(await native('importLinks',{text})),
  v2routeRemoveNode:async id=>enrich(await native('removeNode',{id})),
  v2routeHostSettings:async value=>enrich(await native('hostSettings',value)),
  v2routeRescan:async()=>enrich(await native('rescan')),
  v2routeChooseV2Folder:async()=>enrich(await native('chooseV2Folder')),
  v2routeBrowseV2Folder:async value=>{
   if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!['path','validate'].includes(key))||typeof value.path!=='string'||value.path.length>1024||(value.validate!==undefined&&typeof value.validate!=='boolean'))throw error("INVALID_FOLDER_REQUEST",'Invalid folder request','文件夹请求无效');
   const response=await call(api.runtime,'sendNativeMessage',HOST,{command:'folderBrowse',settings:value});
   if(!response?.ok)throw nativeError(response,'FOLDER_UNAVAILABLE','Folder unavailable; check path, access and Companion version / 文件夹不可用，请检查路径、访问权限及本地组件版本',{command:'folderBrowse'},true);
   return response.result;
  },
  v2routeCoreStatus:async()=>{const response=await call(api.runtime,'sendNativeMessage',HOST,{command:'coreStatus'});if(!response?.ok)throw nativeError(response,'CORE_STATUS_UNAVAILABLE','Core status unavailable / 核心状态不可用',{command:'coreStatus'});return response.result;},
  v2routeInstallCore:async()=>{const response=await call(api.runtime,'sendNativeMessage',HOST,{command:'installCore'});if(!response?.ok)throw nativeError(response,'CORE_INSTALL_FAILED','Core installation failed / 核心安装失败',{command:'installCore'});return response.result;},
  v2routeNetworkTest:async settings=>{
   if(!settings||typeof settings!=='object'||Array.isArray(settings))throw error("INVALID_NETWORK_TEST",'Invalid network test','网络检测参数无效');
   let request={...settings};if(request.target==='current'){
    const live=effectiveRoute(),p=profile(live.name,live.profiles),manual=p?._v2routeManual;
    if(!p||p.profileType!=='FixedProfile')throw error("NETWORK_TARGET_REQUIRED",'Select a node or manual proxy profile, or enter a custom target','请先切换到节点或手动代理情景，或填写自定义目标');
    request={kind:request.kind,target:'current',...(request.count!==undefined?{count:request.count}:{})};
    if(manual||!p._zeroRouteSlot){const endpoint=manual||p.fallbackProxy;request.host=endpoint.host;request.port=endpoint.port;}
    else{request.route=p._zeroRouteChoice;request.predecessor=p._zeroRoutePredecessor||'inherit';}
   }
   const response=await call(api.runtime,'sendNativeMessage',HOST,{command:'networkTest',settings:request});if(!response?.ok||!(request.kind==='mtr'?Array.isArray(response.result?.hops):Array.isArray(response.result?.samples)))throw nativeError(response,'NETWORK_TEST_FAILED','Network diagnostic failed / 网络检测失败',{command:'networkTest'});return response.result;
  },
  v2routeExport:exportProfiles,
  v2routeImportProfiles:async value=>{
   if(![1,2,3,4].includes(value?.format)||!Array.isArray(value.profiles)||value.profiles.length>500||(value.format>=2&&value.product!=='V2Route'))throw error("INVALID_BACKUP",'Invalid V2Route backup','无效的 V2Route 备份');
   if(new TextEncoder().encode(JSON.stringify(value)).length>5*1024*1024)throw error("BACKUP_SIZE_LIMIT",'Backup exceeds 5 MB','备份文件不能超过 5 MB',{limit:5});
   const profiles=clone(model.profiles),managedPlans=[],importedManual=[];
   for(const item of value.profiles){
    if(!item||(!nameValid(item.name)&&!(value.format===4&&builtinInput(item)))||own(profiles,item.name))throw error("IMPORT_PROFILE_NAME_CONFLICT",'Duplicate or invalid profile name','名称重复或无效，未导入');
    if(Object.keys(item).some(k=>k.startsWith('_zeroRoute')||k==='_v2routeManual'||k==='_v2routeNodeModes'))throw error("BACKUP_INTERNAL_BINDINGS",'Backup contains internal bindings','备份含内部绑定标识');
    if(value.format<4&&(builtinInput(item)||item.profileType!=='SwitchProfile'&&item.rules?.length))throw error('BACKUP_FORMAT4_REQUIRED','Routing policies require a format 4 backup','代理策略需要格式 4 的备份');
    const route=item.route;if((route||item.manualAuth)&&item.profileType!=='FixedProfile')throw error("BACKUP_BINDING_TYPE",'Only proxy profiles can have route bindings','仅代理情景可以绑定线路');
    if(route&&item.manualAuth)throw error("BACKUP_PROXY_CONFLICT",'Backup has conflicting proxy settings','备份代理设置冲突');
     const previous=value.format===4?portableHistory(item):undefined;
     const p=sanitize(route?{...item,fallbackProxy:{scheme:'socks5',host:'127.0.0.1',port:1}}:item,undefined,previous,value.format<4),auth=manualAuth(item.manualAuth,p.fallbackProxy?.scheme);
    profiles[p.name]=p;if(route){validRoute(route);const predecessor=item.predecessor??'inherit';validPredecessor(route,predecessor);validChain(route,item.chain);managedPlans.push({p,route,predecessor,...chainRecord(item.chain)});}else if(auth)managedPlans.push({p,auth,predecessor:'none'});
    if(ruleRoutes(p).length){
     if(value.format!==3&&value.format!==4)throw error("BACKUP_FORMAT3_REQUIRED",'Node rules require a format 3 portable backup','节点规则需要格式 3 的可迁移备份');
     for(const route of ruleRoutes(p)){
      const records=item.rules.filter(r=>r.route===route),record=records[0];
      if(records.some(r=>r.predecessor!==record.predecessor||JSON.stringify(r.chain)!==JSON.stringify(record.chain)))throw error("RULE_PATH_CONFLICT",'Conflicting node rule paths','节点规则链路冲突');
      managedPlans.push({p,rule:route,route,predecessor:record.predecessor,...chainRecord(record.chain)});
     }
    }
   }
   validateGraph(profiles);
   if(managedPlans.length>500)throw error("BACKUP_NODE_PATHS_LIMIT",'Backup supports at most 500 node paths','备份最多支持 500 条节点链路',{limit:500});
   if(value.format>=2)portableReferences(value.profiles,value.nodes);
   let importedNodes=null;
   try{
    if(managedPlans.length){
     let c=await native('getState');for(const m of managedPlans)requireChain(c,m.chain);
     if(value.format>=2&&value.nodes.length){
      importedNodes=await bundleNative('profileBundleImport',{nodes:value.nodes});
      const {mapping,created,rollbackToken}=importedNodes;
      if(!mapping||typeof mapping!=='object'||Array.isArray(mapping)||!Array.isArray(created)||created.some(id=>typeof id!=='string'||!/^local-[A-Za-z0-9_-]+$/.test(id))||typeof rollbackToken!=='string'||!/^[a-f0-9]{32}$/.test(rollbackToken))throw error("INVALID_NODE_IMPORT_RESPONSE",'Invalid node import response','节点导入返回无效');
      const remap=route=>{const mapped=own(mapping,route.slice(5));if(typeof mapped!=='string'||!/^node:local-[A-Za-z0-9_-]+$/.test(mapped))throw error("NODE_MAPPING_INCOMPLETE",'Node mapping is incomplete','节点映射不完整');return mapped;};
      for(const m of managedPlans)if(!m.auth){m.route=remap(m.route);m.predecessor='none';m.chain=m.chain.map(remap);}
     }
     const rulePlans=new Map(),ruleMappings=new Map();
     for(let i=0;i<managedPlans.length;i++){
      const m=managedPlans[i];if(!m.rule)continue;
      const key=JSON.stringify([m.p.name,m.route]),prior=rulePlans.get(key);
      if(prior&&JSON.stringify(prior.chain)!==JSON.stringify(m.chain))throw error("IMPORTED_RULE_PATH_CONFLICT",'Imported nodes resolve to conflicting rule paths','导入的节点映射到冲突的规则链路');
      if(!ruleMappings.has(m.p))ruleMappings.set(m.p,new Map());ruleMappings.get(m.p).set(m.rule,m.route);
      if(prior){managedPlans.splice(i--,1);continue;}rulePlans.set(key,m);
     }
     for(const [p,mapping]of ruleMappings)for(const r of p.rules)if(Object.hasOwn(r,'route'))r.route=mapping.get(r.route);
     for(const m of managedPlans)if(m.auth){const imported=await importManual(m.p,m.auth);importedManual.push(imported);m.route=imported.route;m.p._v2routeManual=imported.manual;}
     // Read a fresh settings revision after node writes, preserving other browser bindings.
     c=await native('getState');if(managedPlans.some(m=>m.rule))requireRelease(c,managedPlans);const settings=clone(c.catalog.settings);
     for(const m of managedPlans){m.slot='zo-'+crypto.randomUUID();settings.buttons[m.slot]={label:m.p.name,route:m.route,predecessor:m.chain===undefined?m.predecessor:'none',...chainRecord(m.chain)};}
     const committed=await configureNative(settings);checkSlots(committed,managedPlans.map(m=>m.slot));
     for(const m of managedPlans)if(!m.rule)profiles[m.p.name]=managed(m.p,committed,m.slot,m.route);
     for(const m of managedPlans)if(m.rule){const p=profiles[m.p.name];p._zeroRouteRuleBindings??={};p._zeroRouteRuleBindings[m.route]=ruleMetadata(committed,m.slot,m.route);}
    }
     const next=clone(model),live=pinCurrentRoute();next.profiles=profiles;
     if(value.profiles.some(item=>Object.hasOwn(live.profiles,item.name)))next.appliedRoute=live;
     await persist(next);return {imported:value.profiles.length};
   }catch(e){
    let cleanupFailed=false;
    const slots=managedPlans.filter(m=>m.slot).map(m=>m.slot);
    if(managedPlans.some(m=>m.rule))try{await releaseSlots(slots);}catch(_){cleanupFailed=true;}
    else for(const slot of slots)try{await native('releaseSlot',{id:slot});}catch(_){cleanupFailed=true;}
    try{await cleanupManual(importedManual);}catch(_){cleanupFailed=true;}
    if(importedNodes?.created?.length)try{const result=await bundleNative('profileBundleRollback',{ids:importedNodes.created,rollbackToken:importedNodes.rollbackToken});if(!Array.isArray(result.retained)||result.retained.length)cleanupFailed=true;}catch(_){cleanupFailed=true;}
    if(cleanupFailed)throw error("IMPORT_CLEANUP_FAILED",'Import failed; some temporary nodes or ports could not be released. Existing profiles were retained','导入失败，部分临时节点或端口未能释放；原有情景已保留');
    throw e;
   }
  }
 };
 async function dispatch(message){await load();if(library.methods.has(message?.method)){if(!Array.isArray(message.args||[])||(message.args||[]).length>1)throw error("INVALID_LIBRARY_REQUEST",'Invalid library request','节点库请求无效');return library.run(message.method,message.args?.[0]);}if(!message||!Object.hasOwn(methods,message.method)||!Array.isArray(message.args||[]))throw error("UNSUPPORTED_REQUEST",'Unsupported request','不支持的请求');return methods[message.method](...(message.args||[]));}
 function enqueue(operation,onFailure){const work=queue.then(async()=>{
  await load();const transaction={before:null,created:new Set(),profile:clone(profile(effectiveRoute().name,effectiveRoute().profiles)||null)};browserTransaction=transaction;
  try{
   const result=await operation();
   if(transaction.collectRetired&&model.retiredSlots?.length){try{await collectRetiredSlots();}catch(_){/* Durable IDs are retried after a later operation. */}}
   return result;
  }catch(e){
   if(transaction.before){try{const changed=await call(api.proxy.settings,'set',firefox?{value:transaction.before.value}:{value:transaction.before.value,scope:'regular'});if(changed===false)throw error("PROXY_ROLLBACK_REFUSED",'Browser refused proxy rollback','浏览器拒绝恢复代理');blobUrl=transaction.before.blob;appliedConfig=transaction.before.applied;appliedSystemSnapshot=transaction.before.system;await indicator(transaction.profile);}
    catch(restore){e=error("BROWSER_PROXY_RESTORE_FAILED",'Operation failed and the previous browser proxy could not be restored: '+restore.message,'操作失败，且之前的浏览器代理未能恢复',{},restore.details||restore.message);}}
   if(onFailure)return await onFailure(e);
   throw e;
  }finally{
   if(transaction.before?.blob&&transaction.before.blob!==blobUrl)URL.revokeObjectURL(transaction.before.blob);
   for(const url of transaction.created)if(url!==blobUrl)URL.revokeObjectURL(url);
   browserTransaction=null;
  }
 });queue=work.catch(()=>{});return work;}
 function run(message){if(library.methods.has(message?.method)||['v2routeChainProbe','v2routeClearToolCache','v2routeWaitToolCache','v2routeBrowseV2Folder'].includes(message?.method))return dispatch(message);return enqueue(()=>dispatch(message));}
 function attach(){api.runtime.onMessage.addListener((message,sender,respond)=>{if(sender.id!==api.runtime.id)return false;if(library.methods.has(message?.method)&&!String(sender.url||'').startsWith(api.runtime.getURL('v2route-ui/')))return false;run(message).then(result=>respond({result}),e=>respond({error:serializeError(e)}));return true;});
  library.attach();
  const restore=()=>enqueue(()=>{browserTransaction.collectRetired=true;const live=effectiveRoute();return live.name==='system'&&nativeBuiltin(profile('system',live.profiles))?undefined:apply(live.name,true);},async e=>{
   // Restoration, its selection decision and failure handling occupy one queue
   // entry, so a subsequent user selection always runs after the entire restore.
   await persist({...model,zeroRouteError:e.message,zeroRouteErrorInfo:serializeError(e)});
   if(firefox){let nextBlob=null;try{
    const control=await call(api.proxy.settings,'get',{});
    if(['not_controllable','controlled_by_other_extensions'].includes(control?.levelOfControl)||!await call(api.extension,'isAllowedIncognitoAccess'))return;
    nextBlob=URL.createObjectURL(new Blob(['function FindProxyForURL(){return "PROXY 127.0.0.1:0";}'],{type:'application/x-ns-proxy-autoconfig'}));
    const changed=await call(api.proxy.settings,'set',{value:{proxyType:'autoConfig',autoConfigUrl:nextBlob}});
    if(changed===false)throw fault('STARTUP_FALLBACK_REFUSED','Browser refused startup fallback');
    if(blobUrl)URL.revokeObjectURL(blobUrl);blobUrl=nextBlob;nextBlob=null;appliedConfig=null;appliedSystemSnapshot=null;
   }catch(_){}finally{if(nextBlob)URL.revokeObjectURL(nextBlob);}}
  });
  api.runtime.onInstalled?.addListener(details=>openFirstInstall(api,details));
  api.runtime.onStartup?.addListener(()=>{void restore().catch(()=>{});});restore().catch(()=>{});
 }
 return {run,attach,getModel:()=>clone(model)};
}
function openFirstInstall(api,details){
 if(details?.reason!=='install')return;
 try{api.tabs.create({url:api.runtime.getURL('v2route-ui/options.html')+'#settings'},()=>{void api.runtime.lastError;});}catch(_){}
}
const exported={createController,sanitize,validateGraph,pacFor,nameValid,openFirstInstall};
if(typeof module==='object'&&module.exports)module.exports=exported;
else if(root.chrome?.runtime)createController(root.chrome,typeof root.browser!=='undefined'&&!!root.browser.runtime?.getBrowserInfo).attach();
})(globalThis);
