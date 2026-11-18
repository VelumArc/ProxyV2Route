/* Read a bounded public report from its own first-party tab. No cookie access. */
(function(root){
  'use strict';
  const LIMIT=512*1024,TIMEOUT=45000,CHANNEL='v2route-public-page';
  const error=code=>Object.assign(new Error(code),{code});
  function reportURL(value){
    try{
      const u=new URL(value);
      if(u.origin!=='https://ping0.cc'||u.username||u.password||u.search||u.hash)return null;
      const match=/^\/ip\/([^/]+)$/.exec(u.pathname);if(!match)return null;
      const ip=decodeURIComponent(match[1]);
      if(ip.includes(':')){
        if(!/^[\da-f:.]+$/i.test(ip))return null;
        new URL('http://['+ip+']/');
      }else if(!/^(?:0|[1-9]\d{0,2})(?:\.(?:0|[1-9]\d{0,2})){3}$/.test(ip)||ip.split('.').some(n=>+n>255))return null;
      return 'https://ping0.cc/ip/'+ip;
    }catch(_){return null;}
  }
  // Serialized into an isolated world; only DOM report data leaves the page.
  function watchPage(requestId,expectedURL,limit,remaining){
    const api=globalThis.browser||globalThis.chrome,channel='v2route-public-page';
    if(location.href!==expectedURL)return;
    const key='__v2routePublicPageReaders';
    const readers=globalThis[key]||(globalThis[key]=new Map());
    if(readers.has(requestId))return;
    let stopped=false,notified=false,observer,timer,queued=false;
    const stop=()=>{
      if(stopped)return;stopped=true;observer?.disconnect();clearTimeout(timer);
      api.runtime.onMessage.removeListener(onMessage);removeEventListener('pagehide',stop);
      readers.delete(requestId);if(!readers.size)delete globalThis[key];
    };
    const send=payload=>{try{Promise.resolve(api.runtime.sendMessage({channel,requestId,url:location.href,...payload})).catch(()=>stop());}catch(_){stop();}};
    const onMessage=message=>{if(message?.channel===channel&&message.requestId===requestId&&message.type==='stop')stop();};
    const inspect=()=>{
      queued=false;if(stopped)return;if(location.href!==expectedURL){stop();return;}
      const report=document.querySelector('#check .info.asninfo .content');
      if(report?.textContent.trim()){
        const html=document.documentElement.outerHTML;
        if(html.length>limit||new TextEncoder().encode(html).byteLength>limit)send({type:'error',code:'TOO_LARGE'});
        else send({type:'report',html});
        stop();return;
      }
      if(document.readyState==='complete'&&document.body&&!document.body.textContent.trim()&&!document.querySelector('script,iframe')){
        send({type:'error',code:'EMPTY_PAGE'});stop();return;
      }
      if(!notified&&(document.querySelector('.cf-turnstile,#challenge-form,#cf-challenge-running,script[src*="challenges.cloudflare.com"],iframe[src*="challenges.cloudflare.com"]')||/just a moment|attention required|checking your browser/i.test(document.title))){notified=true;send({type:'verification'});}
    };
    readers.set(requestId,stop);api.runtime.onMessage.addListener(onMessage);addEventListener('pagehide',stop,{once:true});
    observer=new MutationObserver(()=>{if(!queued){queued=true;queueMicrotask(inspect);}});
    observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','id','src']});
    timer=setTimeout(stop,Math.max(1,Math.min(45000,remaining)));inspect();
  }
  function read({url,signal,onVerification}={}){
    const expectedURL=reportURL(url),api=root.browser||root.chrome;
    if(!expectedURL)return Promise.reject(error('BAD_OPTIONS'));
    if(signal?.aborted)return Promise.reject(error('CANCELLED'));
    if(!api?.tabs?.create||!api.scripting?.executeScript)return Promise.reject(error('PERMISSION'));
    return new Promise((resolve,reject)=>{
      const requestId=root.crypto.randomUUID(),deadline=Date.now()+TIMEOUT,activated=new Set();
      let tabId=null,settled=false,verification=false,injected=false,createSettled=false,timer;
      const sameURL=value=>reportURL(value)===expectedURL;
      const closeOwned=async()=>{
        if(tabId===null)return;
        try{await api.tabs.sendMessage(tabId,{channel:CHANNEL,requestId,type:'stop'},{frameId:0});}catch(_){}
        try{const tab=await api.tabs.get(tabId);if(!activated.has(tabId)&&!tab.active)await api.tabs.remove(tabId);}catch(_){}
      };
      const cleanup=()=>{
        clearTimeout(timer);signal?.removeEventListener('abort',onAbort);root.removeEventListener('pagehide',onAbort);
        api.runtime.onMessage.removeListener(onMessage);api.tabs.onUpdated.removeListener(onUpdated);api.tabs.onRemoved.removeListener(onRemoved);
        // Keep activation tracking until the final ownership check has completed.
        if(createSettled)void closeOwned().finally(()=>api.tabs.onActivated.removeListener(onActivated));
      };
      const finish=(failure,result)=>{if(settled)return;settled=true;cleanup();if(failure)reject(error(failure));else resolve(result);};
      const onAbort=()=>finish('CANCELLED');
      const onActivated=info=>activated.add(info.tabId);
      const onRemoved=id=>{if(id===tabId)finish('CANCELLED');};
      const onMessage=(message,sender)=>{
        if(settled||message?.channel!==CHANNEL||message.requestId!==requestId||sender.id!==api.runtime.id||sender.tab?.id!==tabId||sender.frameId!==0||!sameURL(sender.url)||!sameURL(message.url))return;
        if(message.type==='verification'){
          if(!verification){verification=true;try{Promise.resolve(onVerification?.({tabId})).catch(()=>{});}catch(_){}}
        }else if(message.type==='report'&&typeof message.html==='string'){
          if(message.html.length>LIMIT||new TextEncoder().encode(message.html).byteLength>LIMIT)finish('TOO_LARGE');
          else finish(null,{html:message.html,url:expectedURL,tabId});
        }else if(message.type==='error'){
          if(message.code==='TOO_LARGE')finish('TOO_LARGE');
          else if(message.code==='EMPTY_PAGE')finish('INVALID_RESPONSE');
        }
      };
      const inject=()=>{
        if(settled||injected||tabId===null)return;injected=true;
        Promise.resolve().then(()=>{
          if(settled)return;
          return api.scripting.executeScript({target:{tabId,frameIds:[0]},func:watchPage,args:[requestId,expectedURL,LIMIT,Math.max(1,deadline-Date.now())]});
        }).then(()=>{
          // Cancellation may race with delivery of executeScript to a retained tab.
          if(settled)return api.tabs.sendMessage(tabId,{channel:CHANNEL,requestId,type:'stop'},{frameId:0}).catch(()=>{});
        }).catch(()=>{if(!settled)finish('PERMISSION');});
      };
      const onUpdated=(id,change,tab)=>{
        if(settled||id!==tabId)return;
        if(change.url&&!sameURL(change.url)){finish('NETWORK');return;}
        if(change.status==='loading')injected=false;
        if(change.status==='complete'){
          if(tab?.url&&!sameURL(tab.url)){finish('NETWORK');return;}inject();
        }
      };
      api.runtime.onMessage.addListener(onMessage);api.tabs.onUpdated.addListener(onUpdated);api.tabs.onRemoved.addListener(onRemoved);api.tabs.onActivated.addListener(onActivated);
      signal?.addEventListener('abort',onAbort,{once:true});root.addEventListener('pagehide',onAbort,{once:true});
      timer=setTimeout(()=>finish('TIMEOUT'),TIMEOUT);
      Promise.resolve().then(()=>api.tabs.create({url:expectedURL,active:false})).then(async tab=>{
        createSettled=true;
        if(!Number.isInteger(tab?.id)){finish('NETWORK');return;}
        tabId=tab.id;if(tab.active)activated.add(tabId);
        if(settled){await closeOwned();api.tabs.onActivated.removeListener(onActivated);return;}
        // A fast page may complete before tabs.create resolves.
        const current=await api.tabs.get(tabId);
        if(settled)return;
        if(current.status==='complete'){
          if(!sameURL(current.url)){finish('NETWORK');return;}inject();
        }
      }).catch(()=>{createSettled=true;if(settled)api.tabs.onActivated.removeListener(onActivated);else finish('NETWORK');});
    });
  }
  root.V2RPublicPage=Object.freeze({read});
})(globalThis);
