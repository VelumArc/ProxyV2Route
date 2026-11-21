/* On-demand companion core status and repair. GPL-3.0-or-later. */
(function(root){
  'use strict';
  const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
  function create(){
    const t=k=>I18n.t('core_'+k);
    const panel=el('section','card core-panel'),state=el('p','component-status'),
      stateIcon=el('span','core-status-icon','✓'),stateLabel=el('span','core-status-label'),
      detail=el('div','muted core-detail'),versionRow=el('div','core-version'),
      versionValue=el('span','core-version-value'),actions=el('div','setup-actions'),notice=el('p','muted');
    state.setAttribute('role','status');state.setAttribute('aria-live','polite');
    stateIcon.setAttribute('aria-hidden','true');stateIcon.hidden=true;
    state.append(stateIcon,stateLabel);
    versionRow.append(el('span','core-version-label',t('version')),versionValue);versionRow.hidden=true;
    panel.append(el('h2','',t('title')),el('p','muted',t('intro')),state,versionRow,detail,actions,notice);
    const check=el('button','button subtle',t('verify')),install=el('button','button primary',t('install')),
      download=el('a','button subtle',t('download'));
    check.type=install.type='button';download.href='https://github.com/VelumArc/ProxyV2Route/blob/main/INSTALL.md';
    download.target='_blank';download.rel='noopener noreferrer';
    actions.append(check,install,download);download.hidden=true;install.disabled=true;
    let busy=false,refreshRequested=false,sequence=0,canRepair=false,statusKey='',noticeKey='';
    function setStatus(key,status,shared=false){
      statusKey=shared?key:'core_'+key;stateLabel.textContent=I18n.t(statusKey);
      state.dataset.state=status;
      stateIcon.hidden=status!=='ready';
      state.classList.toggle('error',status==='error');
    }
    async function run(repair=false,clicked=false){
      if(busy)return;busy=true;const ticket=++sequence;
      const message=clicked?V2RFeedback.begin(repair?install:check,{key:repair?install:check}):null;
      check.disabled=install.disabled=true;panel.setAttribute('aria-busy','true');
      setStatus(repair?'installing':'checking','checking');
      versionRow.hidden=true;detail.textContent='';
      try{
        const response=await V2R.rpc(repair?'v2routeInstallCore':'v2routeCoreStatus'),value=response?.result||response;
        if(ticket!==sequence||!panel.isConnected)return;
        if(!value||typeof value.installed!=='boolean')throw Object.assign(new Error('Invalid core status response'),{code:'CORE_STATUS_UNAVAILABLE',details:'Invalid core status response'});
        const verified=value.installed&&value.verified===true,
          invalid=value.integrity==='checksum-mismatch',unreadable=value.integrity==='unreadable';
        const resultKey=verified?(repair?'done':'ready'):unreadable?'unreadable':invalid?'corrupt':value.installed?'external':'missing';
        setStatus(resultKey,
          verified?'ready':invalid||unreadable?'error':value.installed?'unverified':'missing');
        versionValue.textContent=value.version||'';versionValue.title=value.path||'';
        versionRow.hidden=!verified||!value.version;
        canRepair=value.repairSupported!==false;download.hidden=true;
        noticeKey='help';notice.textContent=t(noticeKey);
        message?.clear();
      }catch(error){
        if(ticket!==sequence||!panel.isConnected)return;
        const disconnected=error?.code==='COMPANION_UNAVAILABLE',background=['backgroundUnavailable','backgroundNoResponse'].includes(error?.uiKey);
        setStatus(disconnected?'nativeMissing':background?error.uiKey:repair?'core_failed':'error_CORE_STATUS_UNAVAILABLE','error',true);
        detail.replaceChildren(V2R.diagnostic(error,repair?'installCore':'coreStatus'));if(!repair||disconnected||background)canRepair=false;
        message?.error(error);
        download.hidden=false;noticeKey=disconnected?'absentHelp':repair?'failed':'';notice.textContent=noticeKey?t(noticeKey):'';
      }finally{busy=false;check.disabled=false;install.disabled=!canRepair;panel.removeAttribute('aria-busy');if(refreshRequested){refreshRequested=false;if(panel.isConnected)void run();}}
    }
    panel.refreshLabels=()=>{
      panel.querySelector('h2').textContent=t('title');panel.querySelector('p.muted').textContent=t('intro');
      panel.querySelector('.core-version-label').textContent=t('version');
      check.textContent=t('verify');install.textContent=t('install');download.textContent=t('download');
      if(statusKey)stateLabel.textContent=I18n.t(statusKey);if(noticeKey)notice.textContent=t(noticeKey);
      detail.querySelector('.native-diagnostic')?.refreshLabels();
    };
    panel.refreshStatus=()=>{if(busy){refreshRequested=true;return;}return run();};
    check.onclick=()=>run(false,true);install.onclick=()=>run(true,true);run();return panel;
  }
  root.V2RCorePanel={create};
})(globalThis);
