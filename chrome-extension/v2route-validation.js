/* Proxy V2Route input validation. Copyright 2026 V2Route contributors.
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Parses PAC source without executing it. Acorn retains its MIT license. */
(function(root){
'use strict';
const commonJS=typeof module==='object'&&module.exports;
if(!commonJS&&!root.acorn&&typeof importScripts==='function')importScripts('v2route-ui/vendor/acorn/acorn.js');
const acorn=commonJS?require('./v2route-ui/vendor/acorn/acorn.js'):root.acorn;
const entryName='FindProxyForURL';
// Stable identifiers are assigned by the throwing site, never inferred from text.
function createError(code,message,params={},details=''){
 return Object.assign(new Error(message),{code,params,details});
}
function serializeError(value,fallbackCode='OPERATION_FAILED'){
 const message=typeof value?.message==='string'?value.message:String(value??'Operation failed');
 const code=typeof value?.code==='string'&&/^[A-Z][A-Z0-9_]{1,95}$/.test(value.code)?value.code:fallbackCode;
 const params={};
 if(value?.params&&typeof value.params==='object'&&!Array.isArray(value.params))for(const [key,item]of Object.entries(value.params)){
  if(/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(key)&&(typeof item==='string'||typeof item==='boolean'||typeof item==='number'&&Number.isFinite(item)))params[key]=item;
 }
 const details=typeof value?.details==='string'?value.details:message;
 return {message,code,params,details};
}
function failure(code,en,zh,params={},details=''){return createError(code,en+' / '+zh,params,details);}
function callable(node){return !!node&&['FunctionExpression','ArrowFunctionExpression','FunctionDeclaration'].includes(node.type)&&!node.async&&!node.generator;}
function entryTarget(node){
 if(node?.type==='Identifier')return node.name===entryName;
 return node?.type==='MemberExpression'&&!node.computed&&node.property?.name===entryName&&
  (node.object?.type==='ThisExpression'||node.object?.type==='Identifier'&&node.object.name==='globalThis');
}
function validatePac(source){
 if(typeof source!=='string'||!source.trim()||source.length>128*1024)throw failure("PAC_SOURCE_LIMIT",'Enter PAC source of at most 131072 characters','请输入不超过 131072 字符的 PAC 源码',{limit:131072});
 if(!acorn?.parse)throw failure("PAC_PARSER_UNAVAILABLE",'The packaged PAC parser is unavailable; reinstall the extension','本地 PAC 解析器不可用，请重新安装扩展');
 let tree;
 try{tree=acorn.parse(source,{ecmaVersion:2023,sourceType:'script'});}
 catch(e){
  const at=e.loc?` at line ${e.loc.line}, column ${e.loc.column+1}`:'';
  const location=e.loc?`（第 ${e.loc.line} 行，第 ${e.loc.column+1} 列）`:'';
  throw failure(e.loc?'PAC_SYNTAX_LOCATION':'PAC_SYNTAX_INVALID','Invalid PAC syntax'+at,'PAC 语法无效'+location,e.loc?{line:e.loc.line,column:e.loc.column+1}:{},e.message);
 }
 // Function declarations are hoisted; later direct assignments may replace them.
 // This intentionally recognizes explicit top-level definitions, not arbitrary
 // factories/control flow, and cannot prove how a PAC behaves for every URL.
 let found=false;
 for(const statement of tree.body)if(statement.type==='FunctionDeclaration'&&statement.id?.name===entryName)found=callable(statement);
 function assignment(expression){
  if(expression?.type==='SequenceExpression'){for(const item of expression.expressions)assignment(item);}
  else if(expression?.type==='AssignmentExpression'&&entryTarget(expression.left))found=expression.operator==='='&&callable(expression.right);
 }
 for(const statement of tree.body){
  if(statement.type==='VariableDeclaration'){
   for(const item of statement.declarations)if(item.id.type==='Identifier'&&item.id.name===entryName&&item.init)found=callable(item.init);
  }else if(statement.type==='ExpressionStatement')assignment(statement.expression);
 }
 if(!found)throw failure("PAC_FUNCTION_REQUIRED",'Define a synchronous top-level FindProxyForURL function, function variable or assignment','请在顶层定义同步 FindProxyForURL 函数、函数变量或函数赋值');
 return source;
}
function normalizeProxyHost(value){
 const invalid=()=>{throw failure("INVALID_PROXY_HOST",'Enter a DNS name or IP address without a port, URL, path or query','请输入 DNS 主机名或 IP 地址，不要包含端口、网址、路径或查询参数');};
 if(typeof value!=='string'||value.length>1024)invalid();
 let host=value.trim();
 if(!host||/[\s\x00-\x1f\x7f/\\@?#;%]/.test(host))invalid();
 if(host.includes('[')||host.includes(']')){
  if(!/^\[[^\[\]]+\]$/.test(host))invalid();
  host=host.slice(1,-1);if(!host.includes(':'))invalid();
 }
 if(host.includes(':')){
  try{const parsed=new URL('http://['+host+']/').hostname;if(!parsed.startsWith('[')||!parsed.endsWith(']'))invalid();return parsed.slice(1,-1).toLowerCase();}
  catch(_){invalid();}
 }
 if(/^[0-9.]+$/.test(host)){
  const parts=host.split('.');
  if(parts.length!==4||parts.some(part=>!/^\d{1,3}$/.test(part)||Number(part)>255))invalid();
  return parts.map(Number).join('.');
 }
 let ascii;
 try{ascii=new URL('http://'+host+'/').hostname.toLowerCase();}catch(_){invalid();}
 // Do not silently reinterpret a hexadecimal/short IPv4 spelling as an address.
 if(/^[0-9.]+$/.test(ascii))invalid();
 const labels=(ascii.endsWith('.')?ascii.slice(0,-1):ascii).split('.');
 if(ascii.length>253||labels.some(label=>! /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)))invalid();
 return ascii;
}
const exported={validatePac,normalizeProxyHost,createError,serializeError};
if(commonJS)module.exports=exported;else root.V2RouteValidation=exported;
})(globalThis);
