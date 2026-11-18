(async function(){
  'use strict';
  const t=k=>I18n.t(k),$=id=>document.getElementById(id),prefs=await V2R.prefsGet();I18n.set(prefs.language);const localeReady=I18n.load(prefs.language).catch(()=> 'en');document.documentElement.dataset.theme=prefs.theme||'light';
  const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
  // Overlay scrollbars may be hidden by the OS. Supplement them without
  // intercepting native scrolling, pointer dragging or keyboard interaction.
  function updateScrollHint() {
    const list=$('popup-scenarios'),host=$('popup-profiles');
    if(!list||!host)return;
    const gutter=Math.max(0,list.offsetWidth-list.clientWidth),range=list.scrollHeight-list.clientHeight;
    list.style.setProperty('--scenario-gutter',gutter+'px');
    host.dataset.overlayScroll=String(gutter===0&&range>1);
    if(gutter||range<=1)return;
    const size=Math.max(22,list.clientHeight*list.clientHeight/list.scrollHeight);
    host.style.setProperty('--scroll-hint-top',list.getBoundingClientRect().top-host.getBoundingClientRect().top+'px');
    host.style.setProperty('--scroll-hint-height',list.clientHeight+'px');
    host.style.setProperty('--scroll-hint-thumb',size+'px');
    host.style.setProperty('--scroll-hint-offset',(list.clientHeight-size)*Math.min(1,Math.max(0,list.scrollTop/range))+'px');
  }
  function fitLabels() {
    updateScrollHint();
    for (const label of document.querySelectorAll('#popup-current, .popup-profile .grow, .popup-tool>span')) {
      label.style.removeProperty('font-size');
      if (!label.clientWidth) continue;
      if(label.closest('#popup-builtins,.popup-actions'))continue;
      const range = document.createRange();
      range.selectNodeContents(label);
      const available = label.clientWidth - 0.5;
      if (range.getBoundingClientRect().width <= available) continue;
      let lower = 11;
      let upper = parseFloat(getComputedStyle(label).fontSize);
      for (let step = 0; step < 10; step++) {
        const candidate = (lower + upper) / 2;
        label.style.fontSize = candidate + 'px';
        if (range.getBoundingClientRect().width <= available) lower = candidate;
        else upper = candidate;
      }
      label.style.fontSize = Math.floor(lower * 100) / 100 + 'px';
    }
  }
  function translateLabels(){
    $('popup-intro').textContent=t('popupIntro');$('popup-settings').title=t('openSettings');$('popup-settings').setAttribute('aria-label',t('openSettings'));
    $('popup-selected-label').textContent=t('popupSelected');$('popup-footer-label').textContent=t('popupFooter');
    $('popup-settings').querySelector('span').textContent=t('proxySettings');$('popup-ip-tools').querySelector('span').textContent=t('ip-tools');$('popup-ip-tools').title=t('ip-tools');
    for(const row of document.querySelectorAll('.popup-profile')){const name=row.dataset.profile;if(name==='direct'||name==='system'){row.querySelector('.grow').textContent=t(name);row.title=t(name);}else row.setAttribute('aria-description',t('popupOrderHelp'));}
  }
  translateLabels();$('popup-version').textContent='v'+chrome.runtime.getManifest().version;
  $('popup-settings').onclick=()=>{chrome.runtime.openOptionsPage();};
  $('popup-ip-tools').onclick=()=>{const message=V2RFeedback.begin($('popup-ip-tools'),{key:'popup:tools'});chrome.tabs.create({url:chrome.runtime.getURL('v2route-ui/options.html#ip-tools')},()=>{if(chrome.runtime.lastError)message.error(chrome.runtime.lastError);else window.close();});};
  let statusValue=null;
  function error(value){statusValue=value;$('popup-status').hidden=false;$('popup-status').textContent=value?.key?t(value.key):V2R.errorText(value);}
  let switching=false,activeName='',lastStatus=null,syncSelection=null,translateSelection=null,closed=false;
  const connection=$('popup-connection'),help=$('popup-connection-help');
  function showHealth(status){
    lastStatus=status;connection.dataset.health=status.status;
    const label=t('health'+({ok:'Ok',error:'Error',checking:'Checking',unknown:'Unknown'}[status.status]||'Unknown'));
    const heading=t('healthLabel')+' · '+label;
    help.textContent=heading;connection.setAttribute('aria-label',heading+(activeName?' · '+activeName:''));$('popup-current').removeAttribute('title');
    $('popup-health-announcement').textContent=label;
  }
  const health=V2RHealth.create({inspect:()=>V2R.rpc('v2routeConnectionState',[!!chrome.extension?.inIncognitoContext]),probe:signal=>V2RIP.runCheck({family:'dual',signal,timeoutMs:8000}),onChange:showHealth});
  showHealth(health.value);
  // Language assets must never delay cached profiles or restart a selection.
  void localeReady.then(language=>{if(closed)return;I18n.set(language);translateLabels();if(statusValue)error(statusValue);V2RFeedback.refresh();if(translateSelection)translateSelection();else if(lastStatus)showHealth(lastStatus);fitLabels();});
  const check=force=>{if(!switching){if(navigator.onLine===false)health.invalidate('OFFLINE','error');else health.check({force});}};
  connection.addEventListener('mouseenter',()=>check(false));connection.addEventListener('focus',()=>check(false));
  connection.addEventListener('click',()=>check(true));connection.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();check(true);}});
  const offline=()=>health.invalidate('OFFLINE','error'),online=()=>check(true);
  window.addEventListener('offline',offline);window.addEventListener('online',online);
  const settingsChanged=()=>{health.invalidate('CHANGED');if(!switching)check(true);};
  const proxyError=()=>health.invalidate('PROXY_ERROR','error');
  const storageChanged=(changes,area)=>{if(area==='local'&&changes.v2routeModel&&!switching){health.invalidate('CHANGED');syncSelection?.();}};
  chrome.proxy?.settings?.onChange?.addListener(settingsChanged);chrome.proxy?.onError?.addListener(proxyError);chrome.storage?.onChanged?.addListener(storageChanged);
  window.addEventListener('pagehide',()=>{closed=true;health.stop();chrome.proxy?.settings?.onChange?.removeListener(settingsChanged);chrome.proxy?.onError?.removeListener(proxyError);chrome.storage?.onChanged?.removeListener(storageChanged);window.removeEventListener('offline',offline);window.removeEventListener('online',online);},{once:true});
  function showIcon(host,p,metadata){
    host.replaceChildren();const icon=V2R.profileIcon(p,metadata);
    if(icon){const image=el('img','route-icon');image.src=icon;image.alt='';image.onerror=()=>{image.onerror=null;image.src='icons/route.svg';};host.append(image);}
    else host.append(el('span','profile-symbol',p.name==='direct'?'↗':p.name==='system'?'◉':p.profileType==='SwitchProfile'?'⇄':'◆'));
  }
  // Stored profiles are display data only. Confirm selection through the
  // background, without holding the real buttons behind its startup queue.
  try{const options=await V2R.popupProfiles();if(closed)return;const all=[],host=$('popup-profiles'),icons=new Map();let active='',countries={},readGeneration=0,profileSignature='',textObserver=null,selectionConfirmed=false;
    function updateSelection(name){
      active=name;const current=all.find(p=>p.name===active);
      $('popup-current').textContent=(active==='direct'?t('direct'):active==='system'?t('system'):active)||t('healthUnknown');$('popup-current').title=$('popup-current').textContent;
      activeName=$('popup-current').textContent;if(lastStatus)showHealth(lastStatus);
      if(current)showIcon($('popup-current-icon'),current,countries[active]);else $('popup-current-icon').replaceChildren();
      for(const row of host.querySelectorAll('.popup-profile')){const selected=row.dataset.profile===active;row.classList.toggle('active',selected);row.setAttribute('aria-pressed',String(selected));row.querySelector('.check')?.remove();if(selected){const check=el('span','check','✓');check.setAttribute('aria-hidden','true');row.append(check);}}
      fitLabels();
      if(active&&!selectionConfirmed){selectionConfirmed=true;if(!host.contains(document.activeElement))$('popup-scenarios').querySelector('[aria-pressed=true]')?.scrollIntoView({block:'nearest',inline:'nearest'});}
    }
    function renderProfiles(options){
      const profiles=V2R.profiles(options),signature=JSON.stringify(profiles);
      if(signature===profileSignature)return;
      profileSignature=signature;all.splice(0,all.length,{name:'direct',profileType:'DirectProfile'},{name:'system',profileType:'SystemProfile'},...PopupOrder.sorted(profiles,prefs.popupProfileOrder));
      const focused=host.contains(document.activeElement)?document.activeElement.dataset.profile:null,scrollTop=$('popup-scenarios').scrollTop;
      icons.clear();$('popup-builtins').replaceChildren();$('popup-scenarios').replaceChildren();
    for(const p of all){const selected=p.name===active,row=el('button','popup-profile'+(selected?' active':''));row.type='button';row.dataset.profile=p.name;row.dataset.orderKey=PopupOrder.key(p);if(p.name!=='direct'&&p.name!=='system')row.setAttribute('aria-description',t('popupOrderHelp'));row.setAttribute('aria-pressed',String(selected));
      const icon=el('span','popup-icon-slot');icon.setAttribute('aria-hidden','true');showIcon(icon,p,countries[p.name]);icons.set(p.name,icon);row.append(icon);
      const text=p.name==='direct'?t('direct'):p.name==='system'?t('system'):p.name;row.append(el('span','grow',text));row.title=text;if(selected){const check=el('span','check','✓');check.setAttribute('aria-hidden','true');row.append(check);}
      row.onclick=async()=>{if(row.disabled||switching)return;const message=V2RFeedback.begin(()=>[...host.querySelectorAll('.popup-profile')].find(n=>n.dataset.profile===p.name),{key:'popup:apply'});switching=true;++readGeneration;health.invalidate('SWITCHING','checking');for(const b of host.querySelectorAll('button'))b.disabled=true;row.setAttribute('aria-busy','true');$('popup-status').hidden=true;statusValue=null;let applied=false,failed=false;try{await V2R.rpc('applyProfile',[p.name]);const latest=await V2R.read();if(!closed){applied=renderRead(latest);if(applied)message.success('applied');}}catch(e){failed=true;if(!closed){message.error(e);health.invalidate('APPLY_FAILED','error');}}finally{switching=false;row.removeAttribute('aria-busy');for(const b of host.querySelectorAll('button'))b.disabled=false;if(applied)check(true);else if(failed&&!closed)void syncSelection({preserveError:true});}};
      (p.name==='direct'||p.name==='system'?$('popup-builtins'):$('popup-scenarios')).append(row);
    }
      $('popup-scenarios').scrollTop=scrollTop;
      if(focused)[...host.querySelectorAll('.popup-profile')].find(row=>row.dataset.profile===focused)?.focus({preventScroll:true});
      if(textObserver){textObserver.disconnect();observeLabels();}
    }
    function renderRead(latest,preserveError=false){
      renderProfiles(latest.options);updateSelection(latest.state.isSystemProfile?'system':latest.state.currentProfileName);
      if(latest.state.proxyNotControllable){error({key:'externalControl'});health.invalidate('OVERRIDDEN','error');return false;}
      if(latest.state.zeroRouteError){error(latest.state.zeroRouteErrorInfo||{message:latest.state.zeroRouteError});health.invalidate('APPLY_FAILED','error');return false;}
      if(!preserveError){$('popup-status').hidden=true;statusValue=null;}return true;
    }
    renderProfiles(options);updateSelection('');translateSelection=()=>updateSelection(active);
    const orderAnnouncement=el('span','health-sr-only');orderAnnouncement.setAttribute('role','status');orderAnnouncement.setAttribute('aria-live','polite');document.body.append(orderAnnouncement);
    PopupOrder.attach($('popup-scenarios'),{canStart:()=>!switching,save:async order=>{
      const latest=await V2R.prefsGet();await V2R.prefsSet({...latest,popupProfileOrder:order});prefs.popupProfileOrder=order;
    },onError:(errorValue,row)=>{const name=row?.dataset.profile;V2RFeedback.begin(()=>[...$('popup-scenarios').querySelectorAll('.popup-profile')].find(n=>n.dataset.profile===name),{key:'popup:order'}).error(errorValue);},onSaved:row=>{orderAnnouncement.textContent=t('popupOrderSaved');const name=row?.dataset.profile;V2RFeedback.begin(()=>[...$('popup-scenarios').querySelectorAll('.popup-profile')].find(n=>n.dataset.profile===name),{key:'popup:order'}).success('popupOrderSaved');}});
    fitLabels();
    function observeLabels(){textObserver.observe($('popup-scenarios'));for(const label of document.querySelectorAll('#popup-current, .popup-profile .grow, .popup-tool>span'))textObserver.observe(label);}
    textObserver = new ResizeObserver(fitLabels);
    observeLabels();
    $('popup-scenarios').addEventListener('scroll',updateScrollHint,{passive:true});
    document.fonts.ready.then(fitLabels);
    window.addEventListener('pagehide', () => {textObserver.disconnect();$('popup-scenarios').removeEventListener('scroll',updateScrollHint);}, {once:true});
    syncSelection=async({preserveError=false}={})=>{const generation=++readGeneration;try{const latest=await V2R.read();if(closed||switching||generation!==readGeneration)return;if(renderRead(latest,preserveError)&&!preserveError)check(true);V2RFeedback.refresh();}catch(e){if(!closed&&!switching&&generation===readGeneration){if(!preserveError)error(e);health.invalidate('BACKGROUND','error');}}};
    void syncSelection();
    // Cached display metadata only: never start the companion, scan nodes, or
    // hold up profile switching just to render a flag.
    if(all.some(p=>p._zeroRouteChoice?.startsWith('node:'))){
      V2R.rpc('v2routeCachedProfileCountries').then(result=>{countries=result||{};
        for(const p of all){const metadata=countries?.[p.name];if(!metadata||metadata.choice!==p._zeroRouteChoice)continue;showIcon(icons.get(p.name),p,metadata);if(p.name===active)showIcon($('popup-current-icon'),p,metadata);}
        fitLabels();
      }).catch(()=>{});
    }
  }catch(e){error(e);health.invalidate('BACKGROUND','error');}
})();
