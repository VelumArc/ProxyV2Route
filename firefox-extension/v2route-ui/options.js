/* Local configuration UI. Node credentials remain in the companion. */
(function () {
  'use strict';
  const {rpc,read,clone,profiles,routeIcon,routeLabel}=V2R, t=k=>I18n.t(k), $=id=>document.getElementById(id);
  let data={options:{},state:{}}, native=null, nativeError='', prefs={}, page='profiles', selected=null, picker=null, modalPicker=null, busy=false, catalogAttempted=false,activeEditor=null,creating=null,activeLibrary=null,activeCore=null;
  let preferencePending=false,preferenceQueue=Promise.resolve();
  const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
  const button=(text,action,cls='button')=>{const b=el('button',cls,text);b.type='button';b.onclick=action;return b;};
  const mark=(control,id)=>{control.dataset.feedback=id;return control;};
  const feedback=id=>V2RFeedback.begin(()=>document.querySelector('[data-feedback="'+id+'"]')||(id==='setup-check'?document.querySelector('.companion-settings .component-status'):null),{key:'options:'+id,position:id==='save-paths'?'before':'after'});
  const action=(id,work)=>{const message=feedback(id);return perform(()=>work(message),null,message);};
  function field(label,control,help){const wrap=el(/^(INPUT|SELECT|TEXTAREA)$/.test(control.tagName)?'label':'div','field');wrap.append(el('span','field-label',label),control);if(help)wrap.append(el('small','muted',help));return wrap;}
  function input(value='',type='text'){const n=el('input');n.type=type;n.value=value;n.autocomplete='off';return n;}
  function select(items,value){const n=el('select');for(const [v,label]of items){const o=el('option','',label);o.value=v;n.append(o);}n.value=value;return n;}
  function area(value='',rows=4){const n=el('textarea');n.value=value;n.rows=rows;n.spellcheck=false;return n;}
  function card(title,subtitle){const n=el('section','card');if(title)n.append(el('h2','',title));if(subtitle)n.append(el('p','muted',subtitle));return n;}
  function uiIcon(kind){
    const paths={copy:['M8 8h12v13H8V8Z','M16 8V3H3v13h5'],program:['M3 4h18v16H3V4Z','M3 9h18M7 6.5h.2M10 6.5h.2M8 13l-2 2 2 2M12 17h5'],route:['M6 5h8a4 4 0 0 1 0 8H9a3 3 0 0 0 0 6h9','M8 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0','M22 19a3 3 0 1 1-6 0 3 3 0 0 1 6 0'],nodes:['m12 3 10 5-10 5L2 8l10-5Z','m3 12 9 5 9-5M3 16l9 5 9-5'],settings:['M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z','m9.5 3 .5-1h4l.5 3 2 .9 2.8-1 2 3.4-2.2 2.1v2.3l2.2 2.1-2 3.4-2.8-1-2 .9-.5 3h-4l-.5-3-2-.9-2.8 1-2-3.4L4.4 13v-2.3L2.2 8.6l2-3.4 2.8 1 2-.9.5-2.3Z'],trash:['M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7'],info:['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z','M12 11v6M12 7v.2'],core:['m12 2 9 5v10l-9 5-9-5V7l9-5Z','m3 7 9 5 9-5M12 12v10'],backup:['M12 16V3m-4 4 4-4 4 4','M4 12v8h16v-8'],refresh:['M20 7v5h-5','M4 17v-5h5','M6 7a7 7 0 0 1 11-2l3 7M4 12l3 7a7 7 0 0 0 11-2'],add:['M12 5v14M5 12h14'],create:['M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z','M12 8v8M8 12h8'],hide:['m3 3 18 18','M10 10a3 3 0 0 0 4 4','M9 5a11 11 0 0 1 13 7 14 14 0 0 1-4 5M6 6a14 14 0 0 0-4 6 11 11 0 0 0 12 7'],show:['M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z','M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z'],folder:['M3 6h6l2 2h10v12H3V6Z'],save:['M5 3h12l4 4v14H3V3h2Z','M7 3v6h10V3M7 21v-8h10v8'],profiles:['M3 3h7v7H3V3ZM14 3h7v7h-7V3ZM3 14h7v7H3v-7ZM14 14h7v7h-7v-7Z'],'ip-tools':['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z','M3 12h18M12 3a18 18 0 0 1 0 18 18 18 0 0 1 0-18Z']};
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('ui-icon');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.8');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');for(const d of paths[kind]||paths.info){const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',d);svg.append(path);}return svg;
  }
  function panelHeading(title,kind,subtitle){const head=el('div','editor-panel-header'),name=el('div','editor-panel-title'),icon=el('span','panel-icon');icon.append(uiIcon(kind));name.append(icon,el('h3','',title));head.append(name);if(subtitle)head.append(el('p','panel-intro',subtitle));return head;}
  function iconButton(label,action,kind,cls='button subtle'){const b=button(label,action,cls);b.prepend(uiIcon(kind));return b;}
  function pathField(label,control,kind){
    let pending=false;
    const row=el('div','path-input-row'),copy=iconButton('',async()=>{
      if(copy.disabled||pending)return;const copiedValue=control.value,message=V2RFeedback.begin(copy,{key:copy});pending=true;copy.disabled=true;
      try{await navigator.clipboard.writeText(copiedValue);if(row.isConnected&&control.value===copiedValue)message.success('ipCopied');}
      catch(_){if(row.isConnected)message.show({key:'ipCopyFailed'},'error');}
      finally{pending=false;if(row.isConnected)copy.disabled=!control.value;}
    },'copy','path-copy-button');
    control.setAttribute('aria-label',label);copy.setAttribute('aria-label',t('copyPath')+': '+label);copy.title=t('pathCopyHint');copy.disabled=!control.value;row.append(uiIcon(kind),control,copy);
    control.addEventListener('input',()=>{copy.disabled=pending||!control.value;});const wrap=field(label,row);wrap.classList.add('path-field');return wrap;
  }
  let reportTimer=null,reportValue=null;
  const reportText=value=>value?.key?t(value.key):value?.error?V2R.errorText(value.error):String(value||'');
  function report(message,kind='success'){
    clearTimeout(reportTimer);reportTimer=null;
    reportValue=message;const status=$('status');status.hidden=!message;status.textContent=reportText(message);status.className='notice '+kind;
    if(message&&kind==='success')reportTimer=setTimeout(()=>{status.hidden=true;reportValue=null;reportTimer=null;},1000);
  }
  async function perform(action,onError,message){if(busy)return;busy=true;document.body.classList.add('busy');try{await action();}catch(error){if(message)message.error(error);else if(!onError)report({error},'error');onError?.(error);}finally{busy=false;document.body.classList.remove('busy');renderPreferences();}}
  function current(){return data.state.isSystemProfile?'system':data.state.currentProfileName;}
  function updateActiveBadge(row){
    const badge=row.querySelector('.active-label');
    if(current()===row.dataset.profile){
      if(!badge)row.append(el('span','active-label',t('active')));
    }else badge?.remove();
  }
  let stateRead=0;
  async function refreshProfileState(){
    if(!data.state.currentProfileName)return;
    const generation=++stateRead,previous=data;
    let state;
    try{state=await V2R.readProfileState();}
    catch(_){state={...data.state,currentProfileApplied:false};}
    if(previous!==data||generation!==stateRead)return;
    data.state=state;
    if(state.availableProfiles){
      data.options=Object.fromEntries(Object.entries(state.availableProfiles).map(([name,profile])=>['+'+name,{...profile}]));
    }
    if(page==='profiles'){
      for(const row of document.querySelectorAll('.profile-item[data-profile]'))updateActiveBadge(row);
      activeEditor?.sync();
    }
  }
  function profileType(p){return p._zeroRouteSlot&&!p._v2routeManual?t('managed'):({FixedProfile:t('manual'),SwitchProfile:t('auto'),PacProfile:t('pac'),DirectProfile:t('direct'),SystemProfile:t('system'),VirtualProfile:t('virtual')})[p.profileType]||p.profileType;}
  function iconFor(p){if(p.profileType==='SystemProfile'){const icon=el('span','profile-symbol');icon.append(uiIcon('program'));return icon;}const src=V2R.profileIcon(p);if(src){const image=el('img','route-icon');image.src=src;image.alt='';return image;}const n=el('span','profile-symbol',p.profileType==='SwitchProfile'?'⇄':p.profileType==='PacProfile'?'{}':'↗');n.style.setProperty('--profile-color',/^#[a-f\d]{3,6}$/i.test(p.color||'')?p.color:'#368cbd');return n;}
  async function loadCatalog(name){catalogAttempted=true;try{const result=await rpc('zeroRouteGetState',name?[name]:[]);if(!result?.catalog?.routes||!result.catalog.settings)throw V2R.uiError('nativeMissing');native=result;nativeError='';return result;}catch(error){nativeError=error;native=null;return null;}}
  async function reload(){if(page==='ip-tools'){render();return;}await loadCatalog();data=await read();render();}
  async function rescanLocal(message){const result=await rpc('v2routeRescan');native=result;data=await read();render();const discovery=result.catalog?.discovery||result.discovery;if(discovery?.ok===false)message.error({message:discovery.error,code:discovery.errorCode,params:discovery.errorParams});else message.success('rescanDone');}
  function applyTheme(){I18n.set(prefs.language);document.documentElement.dataset.theme=prefs.theme||'light';document.querySelectorAll('[data-i18n]').forEach(n=>n.textContent=t(n.dataset.i18n));if(reportValue)$('status').textContent=reportText(reportValue);renderPreferences();V2RFeedback.refresh();}
  function renderPreferences(){
    const host=$('header-preferences');if(!host)return;
    // Retain the controls while translating so focus and native selection survive.
    if(!$('quick-language')){
      host.replaceChildren();
      const language=select(I18n.available.map(item=>[item.id,item.label]),I18n.language);
      language.id='quick-language';language.className='preference-language-select';mark(language,'language');
      language.onchange=()=>togglePreference('language',language.value);host.append(language);
      const theme=button('',()=>togglePreference('theme'),'preference-toggle');theme.id='quick-theme';mark(theme,'theme');host.append(theme);
    }
    const dark=prefs.theme==='dark',language=$('quick-language'),theme=$('quick-theme');
    language.value=I18n.language;language.title=t('language');language.setAttribute('aria-label',t('language'));
    language.disabled=preferencePending||busy;
    theme.replaceChildren(appearanceIcon(dark));theme.dataset.state=dark?'dark':'light';
    theme.title=t(dark?'switchToLight':'switchToDark');
    theme.setAttribute('aria-label',t('theme')+': '+t(dark?'dark':'light')+'. '+theme.title);
    for(const control of [language,theme])control.setAttribute('aria-disabled',String(preferencePending));
    host.setAttribute('aria-busy',String(preferencePending));
  }
  function appearanceIcon(dark){
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');
    svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.7');
    svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');
    const paths=dark?['M20.4 14.1A8.5 8.5 0 0 1 9.9 3.6a8.5 8.5 0 1 0 10.5 10.5Z','M17 3.5v3M15.5 5h3']:['M16.3 12a4.3 4.3 0 1 1-8.6 0 4.3 4.3 0 0 1 8.6 0Z','M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42'];
    for(const d of paths){const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',d);svg.append(path);}
    return svg;
  }
  async function togglePreference(key,choice){
    if(preferencePending||busy)return;
    const value=key==='language'?I18n.normalize(choice):(prefs.theme==='dark'?'light':'dark');
    const message=feedback(key==='language'?'language':'theme');preferencePending=true;renderPreferences();
    // Keep existing drafts and prevent opening an old-language dialog while its dictionary loads.
    if(key==='language')for(const region of [$('content'),$('header-actions')])region.inert=true;
    try{
      if(key==='language')await I18n.load(value);
      await savePreferences(()=>({[key]:value}));
      const draft=key==='language'?activeEditor?.capture():null;
      if(key==='language'){render(page==='nodes');if(draft)activeEditor?.restore(draft);}
      else applyTheme();
    }catch(error){message.error(error);}
    finally{preferencePending=false;for(const region of [$('content'),$('header-actions')])region.inert=false;renderPreferences();V2RFeedback.refresh();}
  }
  function savePreferences(patch){
    const work=preferenceQueue.then(async()=>{const next={...prefs,...patch(prefs)};await V2R.prefsSet(next);prefs=next;return next;});
    preferenceQueue=work.catch(()=>{});return work;
  }
  function explicitPreferences(value){
    // Legacy automatic choices resolve once; the next click stores explicit states.
    const language=I18n.normalize(value.language);
    const theme=value.theme==='dark'||(value.theme==='auto'&&matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light';
    return {...value,language,theme};
  }
  function render(keepLibrary=false){if(page!=='settings')activeCore=null;const retained=keepLibrary&&page==='nodes'&&activeLibrary;if(!retained){activeLibrary?.destroy();activeLibrary=null;}V2RIPPanel.stop(page!=='ip-tools');picker?.destroy();picker=null;activeEditor?.destroy?.();activeEditor=null;applyTheme();renderNav();document.body.dataset.page=page;$('page-title').textContent=t(page);const pageIcon=el('span','page-title-icon');pageIcon.append(uiIcon(page));$('page-title').prepend(pageIcon);$('page-intro').textContent=t(page==='profiles'?'profileIntro':page==='nodes'?'nodesIntro':page==='ip-tools'?'ipIntro':'settingsIntro');$('page-intro').title=$('page-intro').textContent;$('header-actions').replaceChildren();
    const banner=$('native-banner');banner.hidden=!!native||page==='ip-tools';if(!native&&page!=='ip-tools'){banner.className='native-banner';banner.replaceChildren(el('strong','',t('nativeMissing')),el('p','',t('nativeHelp')),el('small','',nativeError?V2R.errorText(nativeError):''),mark(button(t('retry'),()=>action('native-retry',async message=>{await reload();if(!native)message.error(nativeError||V2R.uiError('nativeMissing'));else message.clear();}),'button subtle'),'native-retry'));}
    if(retained){activeLibrary.translate();return;}
    $('content').replaceChildren();if(page==='profiles')renderProfiles();else if(page==='nodes')renderNodes();else if(page==='ip-tools')V2RIPPanel.render($('content'));else renderSettings();
    if(data.state.proxyNotControllable)report({key:'externalControl'},'error');V2RFeedback.refresh();
  }
  function renderNav(){const nav=$('navigation');nav.replaceChildren();for(const id of ['profiles','nodes','ip-tools','settings']){const b=button('',()=>{if(busy)return;location.hash=id;},'nav-item'+(page===id?' active':''));const icon=el('span','nav-symbol');icon.append(uiIcon(id));icon.setAttribute('aria-hidden','true');const content=el('span','nav-content');content.append(icon,el('span','nav-label',t(id)));b.append(content);b.setAttribute('aria-current',page===id?'page':'false');nav.append(b);}}
  function renderProfiles(){
    appendProfileTransferActions($('header-actions'));$('header-actions').append(button('+ '+t('newProfile'),()=>showCreate(),'button primary'));
    const layout=el('div','profiles-layout'),list=el('section','profile-list'),editor=el('div','profile-editor');layout.append(list,editor);$('content').append(layout);
    const search=input();search.type='search';search.placeholder=t('searchProfiles');search.setAttribute('aria-label',t('searchProfiles'));list.append(search);const rows=el('div','profile-items');list.append(rows);
    const listProfiles=()=>[...['direct','system'].map(name=>data.options['+'+name]).filter(Boolean),...profiles(data.options)];
    const all=listProfiles();
    if(!selected||!all.some(p=>p.name===selected))selected=all.find(p=>!p.builtin)?.name||all[0]?.name||null;
    const displayName=p=>p.builtin?t(p.name):p.name;
    function draw(){
      rows.replaceChildren();
      for(const p of listProfiles().filter(p=>displayName(p).toLocaleLowerCase().includes(search.value.toLocaleLowerCase()))){
        const b=button('',()=>{
          if(busy)return;
          const latest=data.options['+'+p.name];
          if(!latest){draw();return;}
          V2RFeedback.clear();creating=null;selected=p.name;draw();drawEditor(editor,latest);
        },'profile-item'+(p.name===selected?' selected':''));
        b.dataset.profile=p.name;b.append(iconFor(p));
        const text=el('span','grow');text.append(el('strong','',displayName(p)));
        if(!p.builtin)text.append(el('small','muted',profileType(p)));
        b.append(text);updateActiveBadge(b);rows.append(b);
      }
    }
    search.oninput=draw;draw();if(creating){const pending=creating.snapshot;drawEditor(editor,creating.profile,true);if(pending)activeEditor?.restore(pending);}else if(selected)drawEditor(editor,all.find(p=>p.name===selected));else{const empty=card(t('noSelection'));empty.append(button('+ '+t('newProfile'),()=>showCreate(),'button primary'));editor.append(empty);}
  }
  function predecessorControl(host,initial,onChange,context={}){
    let value=initial??'inherit',nodeValue=value.startsWith('node:')?value:'',prePicker=null;
    // The header mode buttons own visibility; predecessor fields stay expanded.
    function refresh(){panel.hidden=false;}
    const section=el('section','editor-panel predecessor-section proxy-row'),head=panelHeading(t('predecessor'),'route');head.title=t('preIntro');
    const panel=el('div','predecessor-panel');const mode=select([['inherit',t('preInherit')],['none',t('preNone')],['node',t('preSpecific')]],(value===''||value.startsWith('node:'))?'node':value),nodeHost=el('div'),nodeField=field(t('preNode'),nodeHost),help=el('p','panel-info',t('preHelp'));help.prepend(uiIcon('info'));nodeField.classList.add('predecessor-node-field');const modeField=el('div','field predecessor-mode-field');mode.setAttribute('aria-label',t('preMode'));modeField.append(mode);panel.append(modeField,nodeField,help);section.append(head,panel);host.append(section);
    function preCatalog(){return {...native.catalog,routes:native.catalog.routes.filter(r=>r.value!=='follow'&&r.value!=='manual')};}
    function update(){prePicker?.destroy();prePicker=null;nodeField.hidden=mode.value!=='node';if(mode.value==='node'&&native){prePicker=new RoutePicker(nodeHost,{catalog:preCatalog(),hiddenValues:prefs.hiddenRouteValues,value:nodeValue||'unselected',placeholder:t('chainChooseNode'),onChange:r=>{nodeValue=r.value;value=nodeValue;onChange(value);},onRefresh:async()=>{native=await rpc('zeroRouteGetState');context.onCatalogChange?.();return{catalog:preCatalog()};},onOrder:async(order,revision)=>{native=await rpc('zeroRouteReorder',[{revision,groups:order}]);context.onCatalogChange?.();return{catalog:preCatalog()};},onError:()=>{}});}}
    mode.onchange=()=>{value=mode.value==='node'?nodeValue:mode.value;update();onChange(value);};update();refresh();
    return{element:section,value:()=>value,refresh,destroy:()=>prePicker?.destroy(),set:next=>{value=next??'inherit';nodeValue=value.startsWith('node:')?value:'';mode.value=(value===''||nodeValue)?'node':value;update();refresh();}};
  }
  function drawEditor(container,p,isNew=false){
    picker?.destroy();picker=null;activeEditor?.destroy?.();activeEditor=null;container.replaceChildren();
    const builtin=!!p.builtin&&['direct','system'].includes(p.name),initialType=builtin?p.name:isNew?'node':p.profileType==='SwitchProfile'?'auto':p.profileType==='PacProfile'?'pac':p._zeroRouteSlot&&!p._v2routeManual?'node':'manual';
    const initialRules=()=>clone(p.rules||[]).map(r=>({pattern:r.condition?.pattern||'',type:r.condition?.conditionType||'HostWildcardCondition',target:r.route||'profile:'+r.profileName}));
    const manual=p._v2routeManual,initialRoute=p._zeroRouteChoice||'follow',initialPredecessor=p._zeroRoutePredecessor||(isNew?'none':'inherit');
    const nodeModes=clone(p._v2routeNodeModes||{version:1,active:Array.isArray(p._zeroRouteChain)?'chain':initialPredecessor==='none'?'base':'predecessor',base:{route:initialRoute},predecessor:{route:initialRoute,predecessor:initialPredecessor},chain:{route:initialRoute,chain:clone(p._zeroRouteChain||[])}});
    let type=initialType,saving=false,preControl=null,chainControl=null,defaultControl=null,chainDraft=null,rulePickers=[],baseline='',saveButton=null,applyButton=null,controls={},drafts={
      node:{route:initialRoute,predecessor:initialPredecessor,chain:p._zeroRouteChain===undefined?undefined:clone(p._zeroRouteChain),modes:nodeModes,rules:initialRules(),bypass:(p.bypassList||[]).map(x=>typeof x==='string'?x:x.pattern||'').join('\n')},
      manual:{scheme:manual?.scheme||(p._zeroRouteSlot?'socks5':p.fallbackProxy?.scheme||'socks5'),host:manual?.host||(p._zeroRouteSlot?'127.0.0.1':p.fallbackProxy?.host||'127.0.0.1'),port:String(manual?.port||(p._zeroRouteSlot?'10808':p.fallbackProxy?.port||'10808')),username:manual?.username||'',password:manual?.password||'',rules:initialRules(),bypass:(p.bypassList||[]).map(x=>typeof x==='string'?x:x.pattern||'').join('\n')},
      auto:{defaultProfile:p.defaultProfileName||'direct',rules:initialRules()},
      direct:{rules:initialRules()},system:{rules:initialRules(),bypass:(p.bypassList||[]).map(x=>typeof x==='string'?x:x.pattern||'').join('\n')},
      pac:{pacScript:p.pacScript||'function FindProxyForURL(url, host) { return "DIRECT"; }'}
    };
    const heading=el('div','editor-heading'),title=el('div','profile-heading-name'),name=input(p.name),typeSelect=select(builtin?[[p.name,t(p.name)]]:[['node',t('managed')],['manual',t('manual')],['auto',t('auto')],['pac',t('pac')]],type);typeSelect.disabled=builtin;
    const nameTitle=el('h2'),nameLabel=el('label','profile-name-label',t('name')),renameButton=button(t('rename'),()=>beginNameEdit(),'rename-link');let editingName=isNew,nameBeforeEdit=name.value;
    name.className='profile-name-input';name.id='profile-name-input';nameLabel.htmlFor=name.id;name.setAttribute('aria-label',t('name'));name.placeholder=t('name');name.maxLength=128;name.spellcheck=false;
    function drawName(){heading.classList.toggle('editing-name',editingName);name.hidden=!editingName;nameTitle.hidden=editingName;nameTitle.textContent=builtin?t(p.name):name.value.trim()||t('name');nameTitle.title=nameTitle.textContent;renameButton.hidden=isNew||builtin;renameButton.setAttribute('aria-pressed',String(editingName));}
    function beginNameEdit(){if(!editingName)nameBeforeEdit=name.value;editingName=true;drawName();name.focus();name.select();}
    function finishNameEdit(){editingName=isNew;drawName();}
    name.addEventListener('blur',finishNameEdit);
    name.addEventListener('keydown',event=>{
      if(event.isComposing||event.keyCode===229)return;
      if(event.key==='Escape'){event.preventDefault();event.stopPropagation();name.value=nameBeforeEdit;finishNameEdit();sync();if(!isNew)renameButton.focus();}
      else if(event.key==='Enter'){event.preventDefault();event.stopPropagation();if(saveButton&&!saveButton.disabled)saveButton.click();else{finishNameEdit();if(!isNew)renameButton.focus();}}
    });
    const nameRow=el('div','profile-name-row'),nameCaption=el('div','profile-name-caption');nameCaption.append(nameLabel);
    nameRow.append(nameTitle,name,renameButton);title.append(nameCaption,nameRow);drawName();
    function localPort(){
      const proxy=p.fallbackProxy,port=Number(proxy?.port);
      return !isNew&&p._zeroRouteSlot&&['127.0.0.1','localhost','::1'].includes(proxy?.host)&&Number.isInteger(port)&&port>0&&port<=65535?port:null;
    }
    const typeField=field(t('type'),typeSelect);typeField.classList.add('heading-mode');
    heading.append(title,typeField);
    if(isNew)heading.append(button(t('cancel'),()=>{creating=null;render();},'button subtle'));
    else if(!builtin)heading.append(iconButton(t('deleteProfileAction'),deleteProfile,'trash','button danger-text delete-profile'));
    container.append(heading);
    V2RProfileTypeSelect.mount(typeSelect,{label:t('type')});
    const modeHost=el('div','profile-chain-actions');heading.insertBefore(modeHost,typeField);
    const panel=card(),body=el('div','editor-fields'),actions=el('div','editor-actions');panel.append(body,actions);container.append(panel);
    function capture(){if(chainControl)chainDraft=chainControl.capture();const d=drafts[type];for(const [key,control]of Object.entries(controls))if(control&&typeof control.value==='string')d[key]=control.value;return d;}
    function snapshot(){const d=clone(capture());if(d.bypass!==undefined)d.bypass=d.bypass.split(/\r?\n/).map(v=>v.trim()).filter(Boolean);if(d.host)d.host=d.host.trim();if(d.rules)d.rules=d.rules.map(r=>({...r,pattern:r.type==='HostWildcardCondition'?r.pattern:r.pattern.trim()}));return JSON.stringify({type,name:name.value.trim(),draft:d},(_key,value)=>value&&typeof value==='object'&&!Array.isArray(value)?Object.fromEntries(Object.entries(value).sort(([a],[b])=>a<b?-1:a>b?1:0)):value);}
    function draftState(){capture();return{profile:p.name,name:name.value,editingName,nameBeforeEdit,type,drafts:clone(drafts),chainDraft:clone(chainDraft),advancedOpen:!!body.querySelector('details')?.open};}
    function sync(){
      if(!saveButton||!applyButton)return;
      const dirty=snapshot()!==baseline;
      if(isNew&&creating)creating.snapshot=draftState();
      const incomplete=type==='node'&&Array.isArray(drafts.node.chain)&&(drafts.node.route==='follow'||drafts.node.chain.some(value=>!/^node:[A-Za-z0-9_-]{1,128}$/.test(value)));
      const saved=!isNew&&!dirty;
      const applied=saved&&current()===p.name&&data.state.currentProfileApplied&&data.state.availableProfiles?.[p.name]?.revision===p.revision;
      saveButton.disabled=saving||incomplete||saved;
      applyButton.disabled=saving||incomplete||applied;
      saveButton.textContent=t(saving==='save'?'saving':isNew?'create':dirty?'save':'saved');
      applyButton.textContent=t(saving==='apply'?'switching':applied?'profileApplied':'apply');
      saveButton.dataset.complete=String(saved&&saving!=='save');
      applyButton.dataset.complete=String(applied&&saving!=='apply');
      for(const [control,intent] of [[saveButton,'save'],[applyButton,'apply']])control.setAttribute('aria-busy',String(saving===intent));
      if(dirty&&reportValue?.key==='saved')report('');
    }
    function deleteProfile(){
      if(busy||saving)return;
      const active=current()===p.name;
      confirm(t('deleteProfile'),t(active?'deleteActiveHelp':'deleteProfileHelp'),async()=>{
        await rpc('v2routeDeleteProfile',[p.name,p.revision,active?{switchTo:'system'}:null]);
        selected=null;await reload();
      },active?t('deleteActive'):t('delete'));
    }
    function drawFields(){modeHost.hidden=type!=='node'||!native;
      picker?.destroy();picker=null;chainControl?.destroy();chainControl=null;preControl?.destroy();preControl=null;defaultControl?.destroy();defaultControl=null;rulePickers.forEach(control=>control.destroy());rulePickers=[];body.replaceChildren();controls={};const d=drafts[type];let fieldsHost=body;
      const discovery=native?.catalog?.discovery;
      const showV2rayNote=type==='system'&&Boolean((discovery?.ok&&discovery.selected)||discovery?.candidates?.some(item=>item.valid===true));
      if(type==='node'){
        const workspace=el('div','proxy-workspace'),configuration=el('div','proxy-config-column'),preview=el('aside','proxy-path-column');workspace.append(configuration,preview);body.append(workspace);fieldsHost=configuration;preview.hidden=!native;workspace.classList.toggle('without-companion',!native);
        const routeField=el('section','editor-panel route-choice-field proxy-row'),line=el('div','route-choice-line editor-panel-body'),routeHost=el('div','proxy-row-selector');routeField.append(panelHeading(t('chainBase'),'route'),line);line.append(routeHost);configuration.append(routeField);
        const metadata=el('p','route-source'),chain=el('p','chain'),routeMeta=el('div','route-selection-meta');routeMeta.append(metadata,chain);line.append(routeMeta);
        function targetCatalog(){return{...native.catalog,routes:native.catalog.routes.map(r=>(d.chain!==undefined?r.chain_supported:(r.override_supported&&d.predecessor&&d.predecessor!=='inherit'))?{...r,supported:true,reason:''}:r)};}
        function describe(){const route=native?.catalog.routes.find(r=>r.value===d.route);metadata.textContent=route?t('source')+': '+t(route.source==='local'?'imported':'v2rayn'):'';if(Array.isArray(d.chain)){const names=[...d.chain,d.route].map(value=>{const item=native?.catalog.routes.find(r=>r.value===value);return item?routeLabel(item):t(value?'routeMissing':'chainChooseNode');});chain.textContent=t('chain')+': '+names.join(' → ');return;}if(route?.value==='follow'){chain.textContent=d.predecessor?.startsWith('node:')?t('preFollowInvalid'):t('followChainHelp');return;}if(route?.supported===false&&d.predecessor==='inherit'){chain.textContent=V2R.routeReason(route)||t('preNeedsFix');return;}let names=route?.chain?.length?route.chain.slice():route?[routeLabel(route)]:[];if(d.predecessor==='none')names=route?[routeLabel(route)]:[];else if(d.predecessor?.startsWith('node:')){const before=native?.catalog.routes.find(r=>r.value===d.predecessor);names=[...(before?.chain?.length?before.chain:before?[routeLabel(before)]:[t('routeMissing')]),...(route?[routeLabel(route)]:[])];}chain.textContent=names.length?t('chain')+': '+names.join(' → '):'';}
        function catalogChanged(){if(!routeField.isConnected)return;chainControl?.refresh();picker?.update(targetCatalog(),d.route);describe();}
        function legacyChain(){
          const route=native.catalog.routes.find(r=>r.value===d.route);
          if(!route||d.route==='follow'||!d.predecessor)return null;
          const override=route.supported!==false||route.override_supported===true;
          if(d.predecessor==='none')return override?[]:null;
          const specific=d.predecessor?.startsWith('node:'),before=specific?native.catalog.routes.find(r=>r.value===d.predecessor):route;
          if(!before||before.supported===false||!Array.isArray(before.chain_values)||!before.chain_values.length)return null;
          const path=specific?[...before.chain_values,d.route]:before.chain_values.slice();
          // Match the legacy builder's cycle/depth rules; explicit chains remain unrestricted.
          if((specific&&!override)||path.at(-1)!==d.route||path.length>6||new Set(path).size!==path.length)return null;
          return path.slice(0,-1);
        }
        if(native){picker=new RoutePicker(routeHost,{allowPredecessorOverride:true,catalog:targetCatalog(),hiddenValues:prefs.hiddenRouteValues,value:d.route,onChange:r=>{d.route=r.value;preControl?.refresh();chainControl?.refresh();describe();sync();},onRefresh:async()=>{native=await rpc('zeroRouteGetState',[p.name]);catalogChanged();return{...native,catalog:targetCatalog()};},onOrder:async(order,revision)=>{native=await rpc('zeroRouteReorder',[{revision,groups:order}]);catalogChanged();return{...native,catalog:targetCatalog()};},onError:()=>{}});preControl=predecessorControl(configuration,d.predecessor,v=>{d.predecessor=v;chainControl?.refresh();picker?.update(targetCatalog(),d.route);describe();sync();},{onCatalogChange:catalogChanged});
          chainControl=V2RChainEditor.mount({host:configuration,modeHost,previewHost:preview,getLocalPort:localPort,landing:routeField,legacy:preControl,initial:d.chain,draft:chainDraft,getCatalog:()=>native.catalog,getRoute:()=>d.route,modes:d.modes,setRoute:value=>{d.route=value;picker?.update(targetCatalog(),d.route);describe();},
            getLegacyChain:legacyChain,getLegacyPredecessor:()=>d.predecessor,setLegacyPredecessor:value=>{d.predecessor=value;preControl.set(value);},
            capable:()=>!!native.capabilities?.explicitChains,hiddenValues:prefs.hiddenRouteValues,
            onChange:value=>{d.chain=value;picker?.update(targetCatalog(),d.route);describe();sync();},
            refreshCatalog:async()=>{native=await rpc('zeroRouteGetState',[p.name]);catalogChanged();return native.catalog;},
            onOrder:async(order,revision)=>{native=await rpc('zeroRouteReorder',[{revision,groups:order}]);catalogChanged();return native.catalog;},rpc});
        }
        else routeHost.append(el('p','notice error',t('noNativeRoute')));describe();
      }else if(type==='manual'){
        controls.scheme=select([['socks5','SOCKS5'],['http','HTTP'],['https','HTTPS'],['socks4','SOCKS4']],d.scheme);controls.host=input(d.host);controls.port=input(d.port,'number');controls.port.min=1;controls.port.max=65535;const grid=el('div','proxy-grid'),dnsHelp=el('p','muted',t('proxyDns'));dnsHelp.hidden=d.scheme!=='socks5';controls.scheme.addEventListener('change',()=>{dnsHelp.hidden=controls.scheme.value!=='socks5';});grid.append(field(t('scheme'),controls.scheme),field(t('address'),controls.host),field(t('port'),controls.port));body.append(grid,dnsHelp);
        controls.username=input(d.username);controls.password=input(d.password,'password');controls.username.autocomplete='off';controls.password.autocomplete='new-password';const auth=el('div','proxy-auth-grid');auth.append(field(t('proxyUsername'),controls.username),field(t('proxyPassword'),controls.password));body.append(auth,el('p','muted',t('proxyAuthHelp')));
      }else if(type==='auto'){
        controls.defaultProfile=select(profileChoices(p.name),d.defaultProfile);body.append(field(t('defaultRoute'),controls.defaultProfile),el('p','muted',t('ruleHelp')),el('p','muted auto-system-help',t('autoSystemHelp')));defaultControl=V2RProfileTypeSelect.mount(controls.defaultProfile,{label:t('defaultRoute'),className:'default-profile-control',icon:profileChoiceType,describe:value=>t('defaultChoice_'+profileChoiceType(value))});drawRules(d,body,false);
      }else if(type==='direct'||type==='system'){
        if(!showV2rayNote){
          const defaultNote=el('div','policy-default-note');
          defaultNote.append(uiIcon(type==='direct'?'route':'program'),el('p','muted',t(type==='direct'?'policyDirectHelp':'policySystemHelp')));
          body.append(defaultNote);
        }
      }else{controls.pacScript=area(d.pacScript,10);controls.pacScript.className='code-input';body.append(field(t('pacScript'),controls.pacScript,t('pacHelp')));}
      if(['node','manual','direct','system'].includes(type)){
        const advanced=el('details','advanced editor-panel routing-policies'),summary=el('summary','editor-panel-header',t('advanced')),inside=el('div','advanced-body');advanced.append(summary,inside);advanced.open=builtin;
        if(showV2rayNote){
          const note=el('p','system-v2ray-note');
          note.append(uiIcon('info'),el('span','',t('systemV2rayNote')));
          inside.append(note);
        }
        if(type!=='direct'){const bypass=el('section','policy-section policy-bypass');controls.bypass=area(d.bypass,3);controls.bypass.placeholder="example.com\n*.example.org\n192.0.2.1:8443";controls.bypass.spellcheck=false;bypass.append(field(t('bypass'),controls.bypass,t('bypassHelp')));inside.append(bypass);}
        const policies=el('section','policy-section policy-overrides');policies.append(el('h3','policy-heading',t('policyRules')),el('p','muted policy-address-help',t('policyAddressHelp')));drawRules(d,policies,true);inside.append(policies);if(type!=='direct'&&!showV2rayNote)inside.append(el('p','muted policy-priority',t('policyPriority')));fieldsHost.append(advanced);
      }
    }
    function drawRules(d,host,policy){
      const list=el('div','rules-list'+(policy?' policy-rules':'')),empty=el('p','muted policy-empty',t('policyEmpty'));
      function refreshRules(source){for(const control of rulePickers)if(control!==source)control.update(ruleTargetCatalog(),control.value);}
      function redraw(){
        rulePickers.forEach(control=>control.destroy());rulePickers=[];list.replaceChildren();empty.hidden=!!d.rules.length;
        d.rules.forEach((r,i)=>{
          const row=el('div','rule-row'+(policy?' policy-rule-row':'')),pattern=input(r.pattern),target=el('div','rule-target rule-target-picker');pattern.placeholder=t('rulePatternPlaceholder');pattern.title=t(policy?'policyAddressHelp':'rulePatternHelp');pattern.setAttribute('aria-label',t('pattern'));pattern.spellcheck=false;pattern.oninput=()=>{r.pattern=pattern.value;r.type=pattern.value.includes('://')?'UrlWildcardCondition':'HostWildcardCondition';};
          const control=ruleTargetControl(target,p.name,r.target,value=>{r.target=value;sync();},refreshRules);rulePickers.push(control);
          const tools=el('div','policy-rule-actions');
          if(policy)for(const [delta,key,glyph]of [[-1,'policyMoveUp','↑'],[1,'policyMoveDown','↓']]){const move=button(glyph,()=>{const next=i+delta;[d.rules[i],d.rules[next]]=[d.rules[next],d.rules[i]];redraw();sync();list.children[next]?.querySelector('input')?.focus();},'icon-button');move.setAttribute('aria-label',t(key));move.title=t(key);move.disabled=i+delta<0||i+delta>=d.rules.length;tools.append(move);}
          const remove=button('×',()=>{d.rules.splice(i,1);redraw();sync();(list.children[Math.min(i,d.rules.length-1)]?.querySelector('input')||add).focus();},'icon-button');remove.setAttribute('aria-label',t('remove'));remove.title=t('remove');tools.append(remove);row.append(pattern,target,...(policy?[tools]:[remove]));list.append(row);
        });
      }
      const add=button('+ '+t('addRule'),()=>{d.rules.push({pattern:'',type:'HostWildcardCondition',target:policy?'':'profile:direct'});redraw();sync();list.lastElementChild?.querySelector('input')?.focus();},'button subtle policy-add');redraw();host.append(list,...(policy?[empty]:[]),add);
    }
    typeSelect.onchange=()=>{capture();type=typeSelect.value;drawFields();sync();};drawFields();
    async function submit(applyNow,anchor){
      if(busy||saving||(applyNow?applyButton:saveButton).disabled)return;
      const message=V2RFeedback.begin(()=>document.querySelector('[data-feedback="'+anchor+'"]'),{key:'options:'+anchor,className:'profile-save-error'});
      saving=applyNow?'apply':'save';sync();heading.inert=true;body.inert=true;
      await perform(async()=>{
        const wanted=name.value.trim();if(!wanted)throw V2R.uiError('fieldRequired');
        const all=await rpc('getAll'),latest=isNew?p:all['+'+p.name];
        if(!isNew&&(!latest||latest.revision!==p.revision))throw V2R.uiError('updatedElsewhere');
        if((isNew||wanted!==p.name)&&all['+'+wanted])throw V2R.uiError('profileExists');
        if(applyNow&&!isNew&&snapshot()===baseline){
          await rpc('applyProfile',[wanted,latest.revision??null]);await reload();message.success('applied');return;
        }
        const d=capture(),next={name:isNew?wanted:p.name,color:latest.color,profileType:builtin?p.profileType:type==='auto'?'SwitchProfile':type==='pac'?'PacProfile':'FixedProfile',...(builtin?{builtin:true}:{}),revision:latest.revision};let routing;
        if(type==='node'||type==='manual'){next.proxyDNS=true;next.bypassList=d.bypass.split(/\r?\n/).map(v=>v.trim()).filter(Boolean).map(pattern=>({conditionType:'BypassCondition',pattern}));if(type==='node'){if(!native)throw V2R.uiError('noNativeRoute');if(!d.predecessor)throw V2R.uiError('preSelectRequired');routing={route:d.route,predecessor:d.chain===undefined?d.predecessor:'none',...(d.chain===undefined?{}:{chain:d.chain}),modes:clone(d.modes)};}else{const port=Number(d.port);if(!Number.isInteger(port)||port<1||port>65535)throw V2R.uiError('invalidPort');if(d.scheme==='socks4'&&(d.username||d.password))throw V2R.uiError('proxyAuthSocks4');next.fallbackProxy={scheme:d.scheme,host:d.host.trim(),port};routing={route:'manual',auth:{username:d.username,password:d.password}};}}
        else if(type==='auto'){if(d.rules.some(r=>!r.pattern.trim()||!r.target))throw V2R.uiError('rulesError');next.defaultProfileName=d.defaultProfile;next.rules=d.rules.map(r=>({condition:{conditionType:r.type,pattern:r.type==='HostWildcardCondition'?r.pattern:r.pattern.trim()},...(r.target.startsWith('node:')?{route:r.target}:{profileName:r.target.slice('profile:'.length)})}));}
        else if(!builtin){next.pacUrl='';next.pacScript=d.pacScript;}
        if(builtin&&type==='system')next.bypassList=d.bypass.split(/\r?\n/).map(v=>v.trim()).filter(Boolean).map(pattern=>({conditionType:'BypassCondition',pattern}));
        if(['node','manual','direct','system'].includes(type)){if(d.rules.some(r=>!r.pattern.trim()||!r.target))throw V2R.uiError('rulesError');next.rules=d.rules.map(r=>({condition:{conditionType:r.type,pattern:r.type==='HostWildcardCondition'?r.pattern:r.pattern.trim()},...(r.target.startsWith('node:')?{route:r.target}:{profileName:r.target.slice('profile:'.length)})}));}
        const saved=await rpc('v2routeSaveProfile',[next,isNew?null:next.revision,routing||null,wanted,applyNow?'apply':'save']);if(saved?.revision)p.revision=saved.revision;if(saved?.name)p.name=saved.name;
        selected=isNew?wanted:p.name;if(isNew)creating=null;await reload();message.success(applyNow?'applied':'saved');
      },null,message);saving=false;heading.inert=false;body.inert=false;if(panel.isConnected)sync();
    }
    saveButton=mark(button(t('saved'),()=>submit(false,'save-profile'),'button primary'),'save-profile');
    applyButton=mark(button(t('apply'),()=>submit(true,'apply-edited-profile'),'button primary'),'apply-edited-profile');
    actions.append(saveButton,applyButton);
    baseline=snapshot();for(const region of [heading,body]){region.addEventListener('input',sync);region.addEventListener('change',sync);}sync();
    activeEditor={sync,capture:draftState,restore:s=>{if(s.profile!==p.name)return;drafts=clone(s.drafts);chainDraft=clone(s.chainDraft||null);name.value=s.name;editingName=isNew||!!s.editingName;nameBeforeEdit=s.nameBeforeEdit??s.name;drawName();type=s.type;typeSelect.value=type;drawFields();const advanced=body.querySelector('details');if(advanced)advanced.open=s.advancedOpen;sync();},destroy:()=>{chainControl?.destroy();preControl?.destroy();defaultControl?.destroy();rulePickers.forEach(control=>control.destroy());rulePickers=[];}};
  }
  function profileChoices(exclude){return [...[['direct',t('direct')],['system',t('system')]].filter(([name])=>name!==exclude),...profiles(data.options).filter(p=>p.name!==exclude&&['FixedProfile','SwitchProfile'].includes(p.profileType)).map(p=>[p.name,p.name])];}
  function profileChoiceType(value){if(value==='direct'||value==='system')return value;const p=data.options['+'+value];return p?.profileType==='SwitchProfile'?'auto':p?._zeroRouteSlot&&!p._v2routeManual?'node':'manual';}
  function ruleTargetCatalog(){return{...(native?.catalog||{}),routes:(native?.catalog?.routes||[]).filter(route=>route.value?.startsWith('node:')),settings:native?.catalog?.settings||{group_order:[],revision:0}};}
  function ruleTargetControl(host,exclude,value,onChange,onCatalogChange){
    const shortcuts=profileChoices(exclude).map(([name,label])=>({value:'profile:'+name,label,icon:name==='direct'?'icons/direct.svg':V2R.profileIcon(data.options['+'+name])||'icons/route.svg'}));
    if(value.startsWith('profile:')&&!shortcuts.some(choice=>choice.value===value))shortcuts.push({value,label:t('ruleTargetUnavailable')+' · '+value.slice('profile:'.length),supported:false});
    const control=new RoutePicker(host,{catalog:ruleTargetCatalog(),shortcuts,wide:true,label:t('target'),hiddenValues:prefs.hiddenRouteValues,value:value||'unselected',placeholder:t('selectRoute'),missingLabel:t('ruleTargetUnavailable')+' · '+value,
      onChange:route=>onChange(route.value),onRefresh:async()=>{native=await rpc('zeroRouteGetState',[exclude]);onCatalogChange(control);return ruleTargetCatalog();},
      onOrder:async(order,revision)=>{native=await rpc('zeroRouteReorder',[{revision,groups:order}]);onCatalogChange(control);return ruleTargetCatalog();},onError:()=>{}});return control;
  }
  function showCreate(route='follow'){
    if(busy||preferencePending)return;V2RFeedback.clear();
    creating={profile:{name:'',profileType:'FixedProfile',color:'#269eab',_zeroRouteChoice:route},snapshot:null};page='profiles';if(location.hash!=='#profiles')history.pushState(null,'','#profiles');render();document.querySelector('.profile-name-input')?.focus();
  }
  function renderNodes(){
    activeLibrary=V2RNodeLibrary.mount($('content'),{catalog:native?.catalog,actions:$('header-actions'),getPrefs:()=>prefs,savePrefs:savePreferences,onCreate:showCreate,onRescan:()=>action('rescan-local',rescanLocal),onCatalog:catalog=>{if(native)native={...native,catalog};}});
  }
  function appendProfileTransferActions(host){
    const file=input('','file');file.accept='application/json,.json';file.hidden=true;
    file.onchange=()=>action('import-profiles',async message=>{const selected=file.files[0];if(!selected)return;if(selected.size>5*1024*1024)throw V2R.uiError('backupTooLarge');let payload;try{payload=JSON.parse(await selected.text());}catch(_){throw V2R.uiError('invalidBackupJSON');}await rpc('v2routeImportProfiles',[payload]);file.value='';await reload();message.success();});
    const exportButton=mark(iconButton(t('export'),()=>action('export-profiles',async message=>{const payload=await rpc('v2routeExport');const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download='V2Route-profiles-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);message.success('backupDone');}),'backup'),'export-profiles');
    const importButton=mark(iconButton(t('import'),()=>file.click(),'backup'),'import-profiles');importButton.classList.add('import-icon');
    host.append(exportButton,importButton,file);
  }
  function renderSettings(){
    const grid=el('div','settings-grid');$('content').append(grid);
    if(!native){const setup=card(t('setupTitle'),t('setupIntro'));setup.classList.add('setup-card');const steps=el('ol','setup-steps');for(const text of [t('setupStepOne'),t('setupStepTwo'),t('setupStepThree')])steps.append(el('li','',text));setup.append(steps);const links=el('div','setup-actions'),download=el('a','button subtle',t('downloadCompanion'));download.href='https://github.com/VelumArc/ProxyV2Route/blob/main/INSTALL.md';download.target='_blank';download.rel='noopener noreferrer';links.append(mark(button(t('setupCheck'),()=>action('setup-check',async message=>{await reload();if(!native)message.error(nativeError||V2R.uiError('nativeMissing'));else message.clear();}),'button primary'),'setup-check'),download);setup.append(links,el('p','muted',t('setupDownloadNote')));grid.append(setup);}
    const host=card(t('localComponent'),t('pathsHelp')),status=el('div','component-status');status.append(el('span','local-dot'+(native?'':' offline')),el('strong','',native?(native.status?.running?t('ready'):t('connectedIdle')):t('stopped')));host.classList.add('companion-settings');host.querySelector('h2').append(status);
    if(native){const discoveryActions=el('div','setup-actions');discoveryActions.append(mark(button(t('chooseFolder'),async()=>{const selected=await V2RFolderPicker.open({path:rootPath.value.trim(),rpc});if(selected!==null)rootPath.value=selected;},'button subtle'),'choose-folder'),mark(button(t('rescanLocal'),()=>action('rescan-local',rescanLocal),'button subtle'),'rescan-local'));host.append(discoveryActions);}
    const pathSettings=native?.hostSettings||native?.catalog?.hostSettings||{},rootPath=input(pathSettings.v2raynRoot||''),corePath=input(pathSettings.corePath||'');rootPath.placeholder=corePath.placeholder=t('optionalPath');const saveActions=el('div','settings-save-actions');
    saveActions.append(mark(button(t('savePaths'),()=>action('save-paths',async message=>{
      await rpc('v2routeHostSettings',[{v2raynRoot:rootPath.value.trim(),corePath:corePath.value.trim()}]);await reload();
      message.success();
    }),'button primary'),'save-paths'));
    host.append(pathField(t('rootPath'),rootPath,'folder'),pathField(t('corePath'),corePath,'program'),saveActions);grid.append(host);
    if(!activeCore&&globalThis.V2RCorePanel)activeCore=V2RCorePanel.create();if(activeCore){activeCore.refreshLabels();grid.append(activeCore);}
    const about=card(t('about'),t('aboutText'));about.classList.add('about-card');about.append(el('p','version',t('version')+' '+chrome.runtime.getManifest().version),el('p','muted',t('privacyText')));const privacy=el('a','text-link',t('privacyDetails'));privacy.href='notices.html#privacy';privacy.target='_blank';const notices=el('a','text-link',t('licenses'));notices.href='notices.html';notices.target='_blank';const aboutLinks=el('div','about-links');aboutLinks.append(privacy,notices);about.append(aboutLinks);grid.append(about);
    const policy=card(t('policyCenter'),t('policyCenterIntro'));policy.classList.add('policy-center');
    for(const [titleKey,bodyKey] of [['policyPrivacyTitle','policyPrivacySummary'],['policyDeclarationTitle','policyDeclarationSummary'],['policyFaqTitle','policyFaqSummary']]){
      const item=el('details','policy-item'),summary=el('summary','',t(titleKey));item.append(summary,el('p','muted',t(bodyKey)));policy.append(item);
    }
    const policyLinks=el('div','about-links'),fullPolicy=el('a','text-link',t('policyDetailsLink')),thirdParty=el('a','text-link',t('thirdPartyNotice'));
    fullPolicy.href='notices.html#privacy';fullPolicy.target='_blank';fullPolicy.rel='noopener noreferrer';thirdParty.href='notices.html#provenance';thirdParty.target='_blank';thirdParty.rel='noopener noreferrer';policyLinks.append(fullPolicy,thirdParty);policy.append(policyLinks);grid.append(policy);
    for(const b of host.querySelectorAll('.button')){const kind=b.textContent===t('chooseFolder')?'folder':b.textContent===t('rescanLocal')?'refresh':'save';b.prepend(uiIcon(kind));}
    const coreCheck=grid.querySelector('.core-panel .setup-actions .button');if(coreCheck&&!coreCheck.querySelector('.ui-icon'))coreCheck.prepend(uiIcon('refresh'));
  }
  function showModal(content){modalPicker?.destroy();modalPicker=null;$('modal-content').replaceChildren(content);const title=content.querySelector('h2');if(title){title.id='v2route-dialog-title';$('modal').setAttribute('aria-labelledby',title.id);}if(!$('modal').open)$('modal').showModal();}
  $('modal').addEventListener('close',()=>{modalPicker?.destroy();modalPicker=null;});
  function confirm(title,text,action,actionLabel=t('delete')){const content=el('div','modal-body');content.append(el('h2','',title),el('p','muted',text));const actions=el('div','modal-actions'),ok=button(actionLabel,async()=>{if(ok.disabled)return;ok.disabled=true;const message=V2RFeedback.begin(ok,{key:'confirm-profile'});try{await action();if($('modal-content').contains(content)){message.success();setTimeout(()=>{if($('modal-content').contains(content))$('modal').close();},1000);}}catch(error){if($('modal-content').contains(content)){message.error(error);ok.disabled=false;}}},'button danger');actions.append(button(t('cancel'),()=>$('modal').close(),'button subtle'),ok);content.append(actions);showModal(content);}
  window.addEventListener('hashchange',()=>{const next=location.hash.slice(1);page=['profiles','nodes','ip-tools','settings'].includes(next)?next:'profiles';report('');if(page!=='ip-tools'&&!catalogAttempted){V2RIPPanel.stop(true);perform(reload);}else render();});
  chrome.storage?.onChanged?.addListener((changes,area)=>{if(area==='local'&&changes.v2routeModel)void refreshProfileState();});
  chrome.proxy?.settings?.onChange?.addListener(refreshProfileState);
  window.addEventListener('unhandledrejection',event=>{report({error:event.reason},'error');});
  async function init(){prefs=explicitPreferences(await V2R.prefsGet());try{await I18n.load(prefs.language);}catch(_){prefs.language='en';}applyTheme();const hash=location.hash.slice(1);page=['profiles','nodes','ip-tools','settings'].includes(hash)?hash:'profiles';report({key:'loading'},'');await reload();report('');}
  init().catch(error=>{render();report({error},'error');});
})();
