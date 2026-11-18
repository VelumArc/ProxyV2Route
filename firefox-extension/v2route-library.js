/* SPDX-License-Identifier: GPL-3.0-or-later
 * User-enabled subscription scheduling and private native operations. */
(function(root){
'use strict';
const ALARM='v2route-subscriptions', SCHEDULE_KEY='v2routeSubscriptionSchedule';
const COMMANDS=['subscriptionState','libraryGroups','libraryImport','subscriptionSave','subscriptionRemove','subscriptionContext','subscriptionRefresh'];
const METHODS={v2routeLibraryState:'subscriptionState',v2routeLibraryGroups:'libraryGroups',v2routeLibraryImport:'libraryImport',v2routeSubscriptionSave:'subscriptionSave',v2routeSubscriptionRemove:'subscriptionRemove'};
const unavailable=reason=>({kind:'unavailable',reason});
function error(code,message,details=''){return Object.assign(new Error(message),{code,params:{},details});}
function wildcard(pattern,value){
 const escaped=String(pattern).replace(/[|\\{}()[\]^$+?.]/g,'\\$&').replace(/\*/g,'.*').replace(/\\\?/g,'.');
 return new RegExp('^'+escaped+'$').test(value);
}
function matches(pattern,urlMode,url){
 return urlMode?wildcard(pattern,url.href):addressMatches(pattern,url.href,url.hostname);
}
// This function is embedded verbatim in PAC files. It must not rely on URL,
// browser APIs, DNS lookups or other functions from this module.
function addressMatches(pattern,url,host){
 function ipKey(value){
  if(value.indexOf(':')<0)return null;
  var tail=value.match(/(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/);
  if(tail){var bytes=tail[0].split('.');for(var t=0;t<4;t++)if(+bytes[t]>255)return null;value=value.slice(0,-tail[0].length)+((+bytes[0]<<8)+(+bytes[1])).toString(16)+':'+((+bytes[2]<<8)+(+bytes[3])).toString(16);}
  var halves=value.split('::');if(halves.length>2)return null;
  var left=halves[0]?halves[0].split(':'):[],right=halves.length===2&&halves[1]?halves[1].split(':'):[];
  if(halves.length===1&&left.length!==8||halves.length===2&&left.length+right.length>=8)return null;
  while(left.length+right.length<8)left.push('0');left=left.concat(right);
  var out='';for(var i=0;i<left.length;i++){if(!/^[0-9a-f]{1,4}$/i.test(left[i]))return null;out+=('0000'+left[i]).slice(-4);}return out.toLowerCase();
 }
 var p=String(pattern).toLowerCase(),h=String(host).toLowerCase().replace(/^\[|\]$/g,'').replace(/\.$/,''),port=null;
 if(p==='<local>')return h.indexOf('.')<0&&h.indexOf(':')<0;
 if(p.charAt(0)==='['){var end=p.indexOf(']');if(end<0)return false;var suffix=p.slice(end+1);if(suffix&&!/^:\d+$/.test(suffix))return false;port=suffix?+suffix.slice(1):null;p=p.slice(1,end);}
 else if((p.match(/:/g)||[]).length===1){var parts=p.split(':');if(!/^\d+$/.test(parts[1]))return false;p=parts[0];port=+parts[1];}
 if(port!==null){
  if(port<1||port>65535)return false;
  var authority=String(url).match(/^([a-z][a-z0-9+.-]*):\/\/([^/?#]*)/i);if(!authority)return false;
  var endpoint=authority[2].split('@').pop(),found=endpoint.match(/:(\d+)$/);
  var actual=found?+found[1]:({http:80,https:443,ws:80,wss:443,ftp:21})[authority[1].toLowerCase()];
  if(actual!==port)return false;
 }
 p=p.replace(/\.$/,'');
 if(p.indexOf(':')>=0){var key=ipKey(p);return key!==null&&key===ipKey(h);}
 if(p.charAt(0)==='.')return h===p.slice(1)||h.slice(-p.length)===p;
 return new RegExp('^'+p.replace(/[|\\{}()[\]^$+?.]/g,'\\$&').replace(/\*/g,'.*').replace(/\\\?/g,'.')+'$').test(h);
}
function addressPatterns(pattern){
 if(typeof pattern!=='string')throw error('INVALID_DOMAIN_PATTERNS','Enter a domain, wildcard domain, IP address or IP:port');
 return [...new Set(pattern.split(/[,，]/).map(ruleHost).filter(Boolean))];
}
function ruleHost(pattern){
 const value=pattern.trim().toLowerCase();
 if(!value||value==='<local>')return value;
 const normalized=value.replace(/[\u3002\uff0e\uff61]/g,'.');
 const invalid=()=>{throw error('INVALID_DOMAIN_PATTERNS','Enter comma-separated domain patterns; put each URL on its own row / 请输入用逗号分隔的域名规则；网址请单独填写一行');};
 if(/[\s/\\@#%]/.test(normalized))invalid();
 let address=normalized,port='';
 if(address.startsWith('[')){
  const parsed=address.match(/^\[([a-f0-9:.]+)\](?::(\d+))?$/i);if(!parsed)invalid();
  try{address=new URL('http://['+parsed[1]+']/').hostname;}catch(_){invalid();}port=parsed[2]||'';
 }else if((address.match(/:/g)||[]).length>1){try{address=new URL('http://['+address+']/').hostname;}catch(_){invalid();}}
 else if(address.includes(':')){const pair=address.split(':');address=pair[0];port=pair[1];if(!/^\d+$/.test(port))invalid();}
 if(port&&(!Number.isInteger(+port)||+port<1||+port>65535))invalid();
 const suffix=port?':'+Number(port):'';
 if(address.startsWith('['))return address+suffix;
 const prefix=address.startsWith('.')?'.':'',host=address.slice(prefix.length).replace(/\.$/,'');
 if(!host||!prefix&&host.startsWith('.')||/[\[\]:]/.test(host))invalid();
 if(/^[\d.]+$/.test(host)&&(!/^(?:\d{1,3}\.){3}\d{1,3}$/.test(host)||host.split('.').some(n=>+n>255)))invalid();
 if(!/[^\x00-\x7f]/.test(host)){if(!/^[a-z0-9_*?.-]+$/.test(host))invalid();return prefix+host+suffix;}
 const labels=host.split('.');
 // Punycode transforms an entire label. A wildcard within a Unicode label
 // cannot be translated without changing its match; complete wildcard labels
 // and all existing ASCII wildcard expressions retain their usual meaning.
 if(labels.some(label=>/[^\x00-\x7f]/.test(label)&&/[*?]/.test(label)))invalid();
 try{
  if(!/[*?]/.test(host)){
   const parsed=new URL('http://'+host+'/');
   if(parsed.username||parsed.password||parsed.port||parsed.search||parsed.hash||parsed.pathname!=='/'||/[*?]/.test(parsed.hostname))invalid();
   return prefix+parsed.hostname+suffix;
  }
  return prefix+labels.map(label=>{
   if(!/[^\x00-\x7f]/.test(label))return label;
   const parsed=new URL('http://'+label+'.invalid/'),ascii=parsed.hostname.slice(0,-8);
   if(!parsed.hostname.endsWith('.invalid')||!ascii||/[.*?]/.test(ascii)||parsed.username||parsed.password||parsed.port||parsed.search||parsed.hash||parsed.pathname!=='/')invalid();
   return ascii;
  }).join('.')+suffix;
 }catch(_){invalid();}
}
function rulePatterns(condition){
 const pattern=condition.pattern;
 // Commas are valid URL characters. Only host rules treat them as separators.
 return condition.conditionType==='HostWildcardCondition'||condition.conditionType==='BypassCondition'?addressPatterns(pattern):[pattern];
}
// Older versions stored unvalidated bypass and host patterns. Keep their text
// and continue routing if a legacy pattern cannot be parsed as an address.
function storedRulePatterns(condition){
 if(condition.conditionType==='UrlWildcardCondition')return [condition.pattern];
 const result=new Set();
 for(const raw of condition.pattern.split(/[,，]/)){
  const token=raw.trim();
  if(!token)continue;
  try{result.add(ruleHost(token));}
  catch(e){if(e.code!=='INVALID_DOMAIN_PATTERNS')throw e;result.add(token);}
 }
 return [...result];
}
// Share the exact system bypass rules between subscription routing and PAC.
// Keep this function self-contained so its source can run in the PAC environment.
function systemProxyForURL(url,host,config){
 function shExpMatch(value,pattern){return new RegExp('^'+pattern.replace(/[|\\{}()[\]^$+?.]/g,'\\$&').replace(/\*/g,'.*').replace(/\\\?/g,'.')+'$').test(value);}
 function ipKey(h){
  if(h.indexOf(':')<0)return /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(h)?h:null;
  var tail=h.match(/(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/);
  if(tail){var bytes=tail[0].split('.');h=h.slice(0,-tail[0].length)+((+bytes[0]<<8)+(+bytes[1])).toString(16)+':'+((+bytes[2]<<8)+(+bytes[3])).toString(16);}
  var halves=h.split('::');if(halves.length>2)return null;
  var a=halves[0]?halves[0].split(':'):[],b=halves.length>1&&halves[1]?halves[1].split(':'):[];
  if(halves.length===1&&a.length!==8||a.length+b.length>8)return null;
  while(a.length+b.length<8)a.push('0');a=a.concat(b);
  var out='';for(var i=0;i<a.length;i++){if(!/^[0-9a-f]{1,4}$/i.test(a[i]))return null;out+=('0000'+a[i]).slice(-4);}return out.toLowerCase();
 }
 if(!config)return 'PROXY 127.0.0.1:0';
 if(config.mode==='direct')return 'DIRECT';
 var h=host.toLowerCase().replace(/^\[|\]$/g,''),ip=ipKey(h);
 var scheme=url.slice(0,url.indexOf(':')).toLowerCase(),authority=url.replace(/^[^:]+:\/\//,'').split('/')[0].split('@').pop(),portMatch=authority.match(/:(\d+)$/);
 var port=portMatch?+portMatch[1]:({http:80,https:443,ftp:21,ws:80,wss:443}[scheme]||0);
 // Match Windows/Chromium implicit local bypass, including IPv6 spellings.
 if(h==='localhost'||/\.localhost\.?$/.test(h)||h==='localhost.'||h==='loopback'||h==='loopback.'||/^127\./.test(h)||/^169\.254\./.test(h)||h==='0.0.0.0'||ip==='00000000000000000000000000000000'||ip==='00000000000000000000000000000001'||ip&&/^fe[89ab]/.test(ip)||ip&&/^00000000000000000000ffff7f/.test(ip)||ip==='00000000000000000000ffff00000000')return 'DIRECT';
 for(var i=0;i<config.bypass.length;i++){
  var r=config.bypass[i];if(r.scheme&&r.scheme!==scheme||r.port&&r.port!==port)continue;
  if(r.kind==='local'&&!ip&&h.indexOf('.')<0||r.kind==='ip'&&ip===r.host||r.kind==='host'&&shExpMatch(h,r.host))return 'DIRECT';
 }
 var p=(scheme==='ws'||scheme==='wss')?(config.proxies.fallback||config.proxies.https||config.proxies.http):(config.proxies[scheme]||config.proxies.fallback);
 if(!p)return 'DIRECT';
 return {http:'PROXY',https:'HTTPS',socks4:'SOCKS',socks5:'SOCKS5'}[p.scheme]+' '+(p.host.indexOf(':')>=0?'['+p.host+']':p.host)+':'+p.port;
}
async function transportFor(model,target,readSystem){
 let url;try{url=new URL(target);}catch(_){return unavailable('invalid_subscription_url');}
 if(!['http:','https:'].includes(url.protocol))return unavailable('invalid_subscription_url');
 const seen=new Set();
 async function pick(name){
  if(seen.has(name)||seen.size>64)return unavailable('profile_cycle');
  seen.add(name);
  const p=Object.hasOwn(model.profiles,name)?model.profiles[name]:name==='direct'?{profileType:'DirectProfile'}:name==='system'?{profileType:'SystemProfile'}:null;
  if(!p)return unavailable('profile_missing');
  if((p.bypassList||[]).some(x=>storedRulePatterns({conditionType:'BypassCondition',pattern:typeof x==='string'?x:x.pattern}).some(pattern=>matches(pattern,false,url))))return unavailable('current_route_direct');
  if(['FixedProfile','SwitchProfile','DirectProfile','SystemProfile'].includes(p.profileType)){
   const rule=(p.rules||[]).find(r=>storedRulePatterns(r.condition).some(pattern=>matches(pattern,r.condition.conditionType==='UrlWildcardCondition',url)));
   if(rule&&Object.hasOwn(rule,'route')){const binding=p._zeroRouteRuleBindings?.[rule.route];return binding?.route===rule.route?endpoint({scheme:'socks5',host:'127.0.0.1',port:binding.port}):unavailable('rule_node_unavailable');}
   if(rule)return pick(rule.profileName);
  }
  if(p.profileType==='DirectProfile')return unavailable('current_route_direct');
  if(p.profileType==='SystemProfile'){
   const value=await readSystem();
   if(systemProxyForURL(url.href,url.hostname,value)==='DIRECT')return unavailable('current_route_direct');
   return endpoint(value.proxies?.[url.protocol.slice(0,-1)]||value.proxies?.fallback);
  }
  if(p.profileType==='FixedProfile'){
   return endpoint(p.fallbackProxy);
  }
  if(p.profileType==='SwitchProfile'){
   return pick(p.defaultProfileName);
  }
  return unavailable('inline_pac_unresolved');
 }
 function endpoint(p){
  if(!p||!['http','https','socks5'].includes(p.scheme)||typeof p.host!=='string'||!p.host||!Number.isInteger(p.port)||p.port<1||p.port>65535)return unavailable('proxy_unavailable');
  return {kind:p.scheme,host:p.host,port:p.port};
 }
 return pick(model.currentProfileName);
}
function create({api,nativeRequest,resolveTransport}){
 let running=false,attached=false,scheduleRevision=-1,scheduleTail=Promise.resolve();
 const call=(object,method,...args)=>new Promise((resolve,reject)=>{try{object[method](...args,value=>api.runtime.lastError?reject(error('BROWSER_SCHEDULING_UNAVAILABLE','Browser scheduling unavailable / 浏览器调度不可用',api.runtime.lastError.message||'')):resolve(value));}catch(e){reject(error('BROWSER_SCHEDULING_UNAVAILABLE',e.message||String(e),e.details||e.message||String(e)));}});
 function schedule(operation){
  const result=scheduleTail.then(operation);
  scheduleTail=result.catch(()=>{});
  return result;
 }
 function saveSchedule(state){return schedule(async()=>{
  if(!Array.isArray(state?.subscriptions))return;
  if(Number.isInteger(state.revision)){
   if(state.revision<scheduleRevision)return;
   scheduleRevision=state.revision;
  }
  const rows=Array.isArray(state?.subscriptions)?state.subscriptions:[],enabled=rows.filter(s=>s.enabled===true);
  await call(api.storage.local,'set',{[SCHEDULE_KEY]:{enabled:enabled.length>0}});
  if(!api.alarms)return;
  if(!enabled.length){await call(api.alarms,'clear',ALARM);return;}
  const due=enabled.map(s=>Number(s.next_due)).filter(n=>Number.isFinite(n)&&n>0);
  const when=Math.max(Date.now()+60000,due.length?Math.min(...due):Date.now()+300000);
  // Chrome 120 and Firefox accept when. Avoid newer persistence-only fields.
  await api.alarms.create(ALARM,{when});
 });}
 async function state(){const value=await nativeRequest('subscriptionState',{});await saveSchedule(value);return value;}
 async function refresh(id,trigger='manual'){
  if(typeof id!=='string'||!id||id.length>128)throw error('INVALID_SUBSCRIPTION','Invalid subscription / 订阅无效');
  const context=await nativeRequest('subscriptionContext',{id});
  let transport={kind:'direct'};
  if(context.policy!=='direct-only'){
   try{transport=await resolveTransport(context.url);}catch(_){transport=unavailable('proxy_unavailable');}
  }
  const value=await nativeRequest('subscriptionRefresh',{id,transport,trigger,expected_generation:context.generation});
  await saveSchedule(value);
  return value;
 }
 async function run(method,value={}){
  if(method==='v2routeSubscriptionRefresh'){
   if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>k!=='id'))throw error('INVALID_SUBSCRIPTION_REQUEST','Invalid subscription request / 订阅请求无效');
   return refresh(value.id);
  }
  const command=METHODS[method];
  if(!command)throw error('UNSUPPORTED_LIBRARY_REQUEST','Unsupported library request / 不支持的节点库请求');
  if(method==='v2routeLibraryState')return state();
  const result=await nativeRequest(command,value);
  if(Array.isArray(result?.subscriptions)){await saveSchedule(result);return result;}
  return {...await state(),...result};
 }
 function scheduleFailure(){return schedule(async()=>{
  try{
   const cached=await call(api.storage.local,'get',SCHEDULE_KEY);
   if(cached[SCHEDULE_KEY]?.enabled&&api.alarms)await api.alarms.create(ALARM,{when:Date.now()+300000});
  }catch(_){}
 });}
 async function tick(){
  if(running)return;
  running=true;
  try{
   const before=await nativeRequest('subscriptionState',{}),now=Date.now();
   // Bounded batches; remaining overdue sources get the next shared alarm.
   for(const source of (before.subscriptions||[]).filter(s=>s.enabled===true&&Number(s.next_due)<=now).slice(0,10)){
    try{await refresh(source.id,'automatic');}catch(_){}
   }
   await state();
  }catch(_){await scheduleFailure();}
  finally{running=false;}
 }
 async function bootstrap(){
  try{
   const cache=await call(api.storage.local,'get',SCHEDULE_KEY);
   if(cache[SCHEDULE_KEY]?.enabled)await tick();
  }catch(_){await scheduleFailure();}
 }
 function attach(){
  if(attached)return;attached=true;
  api.alarms?.onAlarm?.addListener(a=>{if(a.name===ALARM)void tick();});
  api.runtime.onStartup?.addListener(()=>{void bootstrap();});
  void bootstrap();
 }
 return {run,attach,refresh,tick,saveSchedule,methods:new Set([...Object.keys(METHODS),'v2routeSubscriptionRefresh'])};
}
const exported={create,transportFor,wildcard,rulePatterns,storedRulePatterns,addressPatterns,addressMatches,systemProxyForURL,ALARM,SCHEDULE_KEY,COMMANDS};
root.V2RouteLibrary=exported;
if(typeof module==='object'&&module.exports)module.exports=exported;
})(typeof globalThis==='object'?globalThis:this);

