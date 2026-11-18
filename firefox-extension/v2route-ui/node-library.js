/* Node library: local catalog, explicit subscriptions and isolated measurements. */
(function (root) {
  'use strict';
  const t=key=>I18n.t(key), el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
  const button=(text,fn,cls='button')=>{const n=el('button',cls,text);n.type='button';n.onclick=fn;return n;};
  const input=(value='',type='text')=>{const n=el('input');n.type=type;n.value=value;n.autocomplete='off';return n;};
  const select=(items,value)=>{const n=el('select');for(const [v,label] of items){const o=el('option','',label);o.value=v;n.append(o);}n.value=value;return n;};
  const field=(label,n)=>{const wrap=el('label','nl-field');wrap.append(el('span','field-label',label),n);return wrap;};
  function icon(kind){
    const paths={folder:['M3 6h7l2 3h9v11H3V6Z'],layers:['m12 3 9 5-9 5-9-5 9-5Z','m3 12 9 5 9-5M3 16l9 5 9-5'],search:['M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z','m15 15 6 6'],refresh:['M20 7v5h-5','M4 17v-5h5','M6 7a7 7 0 0 1 11-2l3 7M4 12l3 7a7 7 0 0 0 11-2'],plus:['M12 5v14M5 12h14'],bolt:['m13 2-9 12h7l-1 8 10-13h-7l0-7Z'],eye:['M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z','M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z'],trash:['M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7'],edit:['m4 16 12-12 4 4-12 12-5 1 1-5Z','m13 7 4 4'],node:['M12 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z','M5 16a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM19 16a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z','m10 9-4 7M14 9l4 7'],clock:['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z','M12 7v5l3 2'],download:['M12 3v12m-5-5 5 5 5-5','M4 16v5h16v-5'],upload:['M12 16V4m-5 5 5-5 5 5','M4 17v4h16v-4'],sort:['M7 3v18m-3-3 3 3 3-3M17 21V3m-3 3 3-3 3 3'],stop:['M5 5h14v14H5Z'],cloud:['M7 18H5a4 4 0 0 1-1-8 7 7 0 0 1 13-2 5 5 0 0 1 2 10H7Z'],link:['m10 14 4-4','M8 16l-2 2a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0M16 8l2-2a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0'],check:['m4 12 5 5L20 6']};
    const n=document.createElementNS('http://www.w3.org/2000/svg','svg');for(const [k,v]of Object.entries({viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.7','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true',focusable:'false'}))n.setAttribute(k,v);n.classList.add('nl-icon');for(const d of paths[kind]||paths.layers){const p=document.createElementNS(n.namespaceURI,'path');p.setAttribute('d',d);n.append(p);}return n;
  }
  function decorate(n,kind,label=n.textContent,compact=false){n.replaceChildren(icon(kind));n.classList.toggle('nl-icon-button',compact);if(!compact)n.append(el('span','',label));n.setAttribute('aria-label',label);n.title=label;return n;}
  const labelIcon=(label,kind)=>{const n=el('span','nl-label-icon');n.append(icon(kind),el('span','',label));return n;};
  const local=r=>r.source==='local'||r.source==='imported'||r.imported===true||String(r.value).startsWith('node:local');
  const finite=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
  const terminal=s=>['complete','completed','done','cancelled','canceled','stopped','error','failed'].includes(s);
  const stateKey=s=>({queued:'nlQueued',pending:'nlQueued',running:'nlRunning',starting:'nlRunning',stopping:'nlStopping',cancelling:'nlStopping',complete:'nlComplete',completed:'nlComplete',done:'nlComplete',ok:'nlComplete',success:'nlComplete',failed:'nlFailed',error:'nlFailed',cancelled:'nlStopped',canceled:'nlStopped',stopped:'nlStopped',partial:'nlPartial'})[s]||'nlUntested';
  const errorText=error=>V2R.errorText(typeof error==='string'?{code:error}:error);
  function mount(host,context) {
    let alive=true,lib={revision:0,groups:[]},catalog=context.catalog||{routes:[]},available=false,mutation=false,loadSerial=0;
    let currentGroup='all',grouping=context.getPrefs().nodeGrouping==='country'?'country':'source',source='all',query='',showHidden=false,sort='name',direction=1,tablePage=0;
    let chosen=new Set(),results=new Map(),mode='quick',traffic=10,concurrency=2,job=null,starting=false,stopping=false,generation=0,pollTimer=null,stateTimer=null,transport=null;
    let focusedRoute=null,testScope='single',frozenOrder=null,selectionAnchor=null,dragSelection=null,dragFrame=0;
    let view={},dialog=null,dialogGeneration=0,noticeText=null,noticeKind='',groupDrag=null,groupFrame=0,suppressGroupClick=false,groupMessage=null;
    let columnWidths=context.getPrefs().nodeColumnWidths,disposeColumnResize=()=>{};
    let metricObserver=null,metricFrame=0,metricWidth=0;
    if(!Array.isArray(columnWidths)||columnWidths.length!==6||columnWidths.some(n=>!Number.isFinite(n)||n<40||n>4000))columnWidths=null;
    const workspace=el('div','node-workspace');host.append(workspace);
    const routes=()=> (catalog.routes||[]).filter(r=>String(r.value).startsWith('node:'));
    const hidden=r=>!local(r)&&(context.getPrefs().hiddenRouteValues||[]).includes(r.value);
    const eligible=r=>r.supported!==false&&!hidden(r);
    const running=()=>starting||stopping||!!job&&(!terminal(job.state)||job.hasMore);
    const selectedRoutes=()=>visibleRoutes().filter(r=>eligible(r)&&chosen.has(r.value));
    const activeName=()=>groupList().find(g=>g.id===currentGroup)?.name||t('nlAllNodes');
    function country(r){const code=String(r.country||'').toUpperCase();if(!/^[A-Z]{2}$/.test(code))return{id:'unknown',name:t('unknownCountry')};let name=code;try{name=new Intl.DisplayNames([I18n.locale||'en'],{type:'region'}).of(code)||code;}catch(_){}return{id:code,name};}
    function groupId(r){return grouping==='country'?'country:'+country(r).id:'group:'+String(r.group_id||'ungrouped');}
    function groupList(includeFiltered=false){
      const groups=new Map();
      if(grouping==='source')for(const g of [...(catalog.groups||[]),...(lib.groups||[])])groups.set('group:'+g.id,{...g,id:'group:'+g.id,rawId:g.id,name:g.name_key?t(g.name_key):g.id==='local-imports'?t('imported'):g.name,count:0});
      for(const r of routes()){
        const id=groupId(r);if(!groups.has(id))groups.set(id,{id,rawId:r.group_id,name:grouping==='country'?country(r).name:r.group_id==='local-imports'?t('imported'):V2R.routeGroup(r)||t('ungrouped'),source:local(r)?'local':'v2rayn',readonly:!local(r),count:0});
        if((showHidden||!hidden(r))&&(source==='all'||(source==='local')===local(r)))groups.get(id).count++;
      }
      const order=catalog.settings?.group_order||[];
      const list=[...groups.values()].filter(g=>includeFiltered||source==='all'||grouping==='country'||(source==='local')===(g.source==='local'));
      list.sort((a,b)=>grouping==='country'?a.name.localeCompare(b.name,I18n.locale||'en'):(order.indexOf(a.rawId)<0?10000:order.indexOf(a.rawId))-(order.indexOf(b.rawId)<0?10000:order.indexOf(b.rawId))||a.name.localeCompare(b.name,I18n.locale||'en'));
      return [{id:'all',name:t('nlAllNodes'),count:list.reduce((sum,g)=>sum+g.count,0),readonly:true},...list];
    }
    function visibleRoutes(){
      const text=query.trim().toLocaleLowerCase();return routes().filter(r=>(showHidden||!hidden(r))&&(source==='all'||(source==='local')===local(r))&&(currentGroup==='all'||groupId(r)===currentGroup)&&(!text||(V2R.routeLabel(r)+' '+(V2R.routeGroup(r))+' '+country(r).name+' '+(V2R.routeProtocol(r))).toLocaleLowerCase().includes(text)));
    }
    function sortedRows(){const list=visibleRoutes().slice();if(frozenOrder){const positions=new Map(frozenOrder.map((id,i)=>[id,i]));return list.sort((a,b)=>(positions.get(a.value)??1e9)-(positions.get(b.value)??1e9));}return list.sort((a,b)=>{
      if(sort==='name')return direction*V2R.routeLabel(a).localeCompare(V2R.routeLabel(b),I18n.locale||'en')||a.value.localeCompare(b.value);
      const key={latency:'latencyMs',download:'downloadAverageMbps',upload:'uploadAverageMbps'}[sort],x=results.get(a.value)?.[key],y=results.get(b.value)?.[key];
      if(!finite(x)||!finite(y))return finite(x)?-1:finite(y)?1:a.value.localeCompare(b.value);
      return direction*(x-y)||a.value.localeCompare(b.value);
    });}
    function notice(value,kind='error'){noticeText=value;noticeKind=kind;const text=value?.key?t(value.key):value?.error?errorText(value.error):String(value||'');if(view.notice){view.notice.textContent=text;view.notice.className='nl-notice '+kind;view.notice.hidden=!text;}}
    function ingest(state){
      if(!state||typeof state!=='object')throw new Error('invalid-state');
      lib={...lib,...state};if(state.catalog?.routes){catalog=state.catalog;context.onCatalog?.(catalog);}
      const known=new Set(routes().map(r=>r.value));chosen=new Set([...chosen].filter(id=>known.has(id)));for(const id of results.keys())if(!known.has(id))results.delete(id);
      available=true;
    }
    async function loadState(silent=false){
      const serial=++loadSerial;try{const state=await V2R.rpc('v2routeLibraryState');if(!alive||serial!==loadSerial||running())return;ingest(state);if(!silent)notice('');drawGroups();drawRows();updateControls();}
      catch(_){if(alive&&serial===loadSerial&&!silent)notice({key:'nlUpgrade'});}
      finally{if(alive&&serial===loadSerial){scheduleState();}}
    }
    function scheduleState(){clearTimeout(stateTimer);if(alive)stateTimer=setTimeout(()=>{if(!document.hidden&&!mutation&&!running())loadState(true);else scheduleState();},10000);}
    async function mutate(method,value){
      if(mutation||!alive)return null;mutation=true;loadSerial++;clearTimeout(stateTimer);updateControls();
      try{const state=await V2R.rpc(method,[value]);if(!alive)return null;ingest(state);drawGroups();drawRows();notice('');return state;}
      finally{mutation=false;if(alive){drawRows();updateControls();scheduleState();}}
    }
    function panel(title,cls){const p=el('section','nl-panel '+cls),head=el('header','nl-panel-header');head.append(el('h2','',title));p.append(head);return p;}
    function bindColumnResize(table,heading){
      const headers=[...heading.children],columns=el('colgroup'),minimum=[180,96,80,80,70,I18n.language==='en'?260:228];
      const cols=headers.map(()=>{const col=el('col');columns.append(col);return col;});table.prepend(columns);
      let drag=null;
      const clamp=(width,index)=>Math.round(Math.max(minimum[index],Math.min(4000,width)));
      const measured=()=>{const scale=table.getBoundingClientRect().width/parseFloat(getComputedStyle(table).width)||1;return headers.map(th=>th.getBoundingClientRect().width/scale);};
      const persist=anchor=>{const saved=columnWidths?.slice()||null,message=V2RFeedback.begin(anchor,{key:'library:column-width'});context.savePrefs(()=>({nodeColumnWidths:saved})).catch(error=>{if(alive)message.error(error);});};
      function apply(widths){
        columnWidths=widths?.map(width=>Math.round(Math.max(40,Math.min(4000,width))))||null;table.classList.toggle('nl-widths-custom',!!columnWidths);
        /* Keep the table attached to its container.  The old implementation
           used the saved pixel sum as the table width, so a viewport wider
           than the last resize left a dead track after Actions (and left the
           last resize handle floating in that empty area).  Keep the saved
           values as proportions instead; the table can now grow with the
           viewport while the compact breakpoints still replace them with
           their visible-column percentages. */
        const total=columnWidths?.reduce((sum,n)=>sum+n,0)||0;
        table.style.width=columnWidths?'100%':'';
        headers.forEach((th,i)=>{th.style.width=columnWidths?'auto':'';cols[i].style.width=columnWidths&&total?((columnWidths[i]/total)*100).toFixed(4)+'%':'';const handle=th.querySelector('.nl-column-resize');if(handle)handle.setAttribute('aria-valuenow',String(columnWidths?.[i]||Math.round(th.getBoundingClientRect().width)));});
      }
      function finish(save){
        const previous=drag;if(!previous)return;drag=null;workspace.classList.remove('nl-column-resizing');previous.handle.classList.remove('is-dragging');
        if(previous.handle.hasPointerCapture(previous.pointerId))previous.handle.releasePointerCapture(previous.pointerId);
        if(!save)apply(previous.before);else if(previous.changed)persist(previous.handle);
      }
      function reset(anchor){finish(false);apply(null);persist(anchor);}
      headers.forEach((th,index)=>{
        const handle=button('',()=>{},'nl-column-resize'),label=th.textContent.trim();
        handle.title=t('columnResizeHelp');
        handle.setAttribute('role','separator');handle.setAttribute('aria-orientation','vertical');handle.setAttribute('aria-label',label+' · '+t('columnResize'));
        handle.setAttribute('aria-valuemin',String(minimum[index]));handle.setAttribute('aria-valuemax','4000');
        handle.onclick=e=>e.stopPropagation();handle.ondblclick=e=>{e.preventDefault();e.stopPropagation();reset(handle);};
        handle.onpointerdown=e=>{
          if(e.button!==0)return;e.preventDefault();e.stopPropagation();finish(true);endRowDrag();
          const widths=measured(),scale=table.getBoundingClientRect().width/parseFloat(getComputedStyle(table).width)||1;
          drag={handle,pointerId:e.pointerId,index,startX:e.clientX,scale,widths,before:columnWidths?.slice()||null,changed:false};
          handle.focus({preventScroll:true});handle.setPointerCapture(e.pointerId);handle.classList.add('is-dragging');workspace.classList.add('nl-column-resizing');
        };
        handle.onpointermove=e=>{
          if(!drag||e.pointerId!==drag.pointerId)return;e.preventDefault();e.stopPropagation();
          const widths=drag.widths.slice();widths[index]=clamp(widths[index]+(e.clientX-drag.startX)/drag.scale,index);
          if(Math.abs(widths[index]-drag.widths[index])<1&&!drag.changed)return;drag.changed=true;apply(widths);
        };
        handle.onpointerup=e=>{e.stopPropagation();finish(true);};handle.onpointercancel=()=>finish(false);handle.onlostpointercapture=()=>finish(true);
        handle.onkeydown=e=>{
          if(e.key==='Escape'&&drag){e.preventDefault();e.stopPropagation();finish(false);return;}
          if(e.key==='Home'){e.preventDefault();e.stopPropagation();reset(handle);return;}
          if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();e.stopPropagation();
          finish(true);const widths=measured();widths[index]+= (e.key==='ArrowRight'?1:-1)*(e.shiftKey?32:16);apply(widths);persist(handle);
        };
        th.append(handle);
      });
      apply(columnWidths);
      return()=>finish(true);
    }
    function build(){
      cancelGroupDrag();endRowDrag();disposeColumnResize();metricObserver?.disconnect();metricObserver=null;cancelAnimationFrame(metricFrame);workspace.replaceChildren();context.actions.replaceChildren();
      const rescan=decorate(button(t('rescanLocal'),()=>{if(!running())context.onRescan();}),'refresh');rescan.dataset.nlMutation='';rescan.dataset.feedback='rescan-local';
      const importButton=decorate(button(t('importNodes'),()=>showImport('links',null,()=>context.actions.querySelector('[data-feedback=import-nodes]')),'button primary'),'plus');importButton.dataset.nlAvailable='';importButton.dataset.feedback='import-nodes';context.actions.append(rescan,importButton);
      const filters=el('div','nl-topbar'),search=input(query,'search'),searchWrap=el('label','nl-search'),sourceControl=select([['all',t('allSources')],['v2rayn',t('v2rayn')],['local',t('imported')]],source),groupControl=select([['source',t('nlGroupBySource')],['country',t('groupByCountry')]],grouping),sortControl=select([['name',t('nlSortName')],['latency',t('nlSortLatency')],['download',t('nlSortDownload')],['upload',t('nlSortUpload')]],sort);
      search.placeholder=t('searchRoutes');search.setAttribute('aria-label',t('searchRoutes'));searchWrap.append(icon('search'),search);
      const control=(n,label,kind)=>{const w=el('label','nl-top-control');n.setAttribute('aria-label',t(label));w.append(icon(kind),n);return w;};
      const filterChanged=()=>{tablePage=0;if(!running())frozenOrder=null;drawGroups();drawRows();updateControls();paintCurrent();};
      sourceControl.onchange=()=>{source=sourceControl.value;filterChanged();};groupControl.onchange=()=>{grouping=groupControl.value;currentGroup='all';filterChanged();const message=V2RFeedback.begin(groupControl,{key:'library:grouping'});context.savePrefs(p=>({nodeGrouping:grouping})).then(()=>message.clear(),error=>message.error(error));};
      search.oninput=()=>{query=search.value;filterChanged();};sortControl.onchange=()=>{if(running())return;sort=sortControl.value;direction=['name','latency'].includes(sort)?1:-1;frozenOrder=null;drawRows();};
      filters.append(searchWrap,control(sourceControl,'source','layers'),control(groupControl,'grouping','layers'),control(sortControl,'nlSort','sort'));workspace.append(filters);
      const groups=panel(t('grouping'),'nl-groups'),middle=panel(t('nlNodeResults'),'nl-results'),center=panel(t('nlTestCenter'),'nl-center');workspace.append(groups,middle,center);
      groups.querySelector('h2').prepend(icon('layers'));center.querySelector('h2').prepend(icon('bolt'));
      const groupListHost=el('div','nl-group-list');groupListHost.setAttribute('role','tablist');groupListHost.setAttribute('aria-orientation','vertical');groupListHost.setAttribute('aria-label',t('grouping'));groupListHost.addEventListener('lostpointercapture',groupCancel);groupListHost.addEventListener('dragstart',event=>event.preventDefault());groups.append(groupListHost);
      const groupActions=el('div','nl-group-actions'),newGroup=decorate(button(t('nlNewGroup'),()=>editGroup(null,()=>view.groupActions.querySelector('[data-feedback=new-group]'))),'plus');newGroup.dataset.nlAvailable='';newGroup.dataset.feedback='new-group';groupActions.append(newGroup);groups.append(groupActions);
      const groupHeading=middle.querySelector('.nl-panel-header');groupHeading.replaceChildren();const groupTitle=el('div','nl-result-title'),groupStats=el('div','nl-group-stats'),groupToolbar=el('div','nl-result-actions');groupHeading.append(groupTitle,groupStats,groupToolbar);
      const allTestButton=decorate(button(t('nlTestAll'),()=>{testScope='batch';start(visibleRoutes().filter(eligible).map(r=>r.value));},'button subtle'),'layers');allTestButton.dataset.nlTestAll='';
      const hiddenLabel=decorate(button(t('showHidden'),()=>{showHidden=!showHidden;hiddenLabel.setAttribute('aria-pressed',String(showHidden));filterChanged();},'nl-hidden-toggle'),'eye');hiddenLabel.setAttribute('aria-pressed',String(showHidden));groupToolbar.append(hiddenLabel,allTestButton);
      const noticeHost=el('p','nl-notice');noticeHost.setAttribute('role','status');middle.append(noticeHost);
      const tableWrap=el('div','nl-table-scroll');tableWrap.tabIndex=0;tableWrap.setAttribute('role','region');tableWrap.setAttribute('aria-label',t('nlNodeResults'));
      const table=el('table','nl-table'),head=el('thead'),heading=el('tr');table.setAttribute('role','grid');table.setAttribute('aria-multiselectable','true');
      for(const [key,label,kind]of [['name','nlNode','node'],['latency','nlHttpsLatency','clock'],['download','speedDownload','download'],['upload','speedUpload','upload']]){const th=el('th');th.scope='col';th.dataset.sort=key;const b=button('',()=>{if(running())return;frozenOrder=null;if(sort===key)direction=-direction;else{sort=key;direction=key==='name'||key==='latency'?1:-1;}sortControl.value=sort;drawRows();},'nl-sort');b.append(labelIcon(t(label),kind));b.title=t(key==='latency'?'nlLatencyMethod':'nlSort');th.append(b);heading.append(th);}
      for(const [label,kind]of [['nlStatus','check'],['nlActions','layers']]){const th=el('th');th.append(labelIcon(t(label),kind));th.scope='col';heading.append(th);}head.append(heading);const body=el('tbody');bindRowSelection(tableWrap);table.append(head,body);tableWrap.append(table);middle.append(tableWrap);disposeColumnResize=bindColumnResize(table,heading);
      const footer=el('div','nl-table-footer'),count=el('span','muted'),pages=el('div','nl-pages'),previous=button('‹',()=>{tablePage--;drawRows();},'button subtle'),next=button('›',()=>{tablePage++;drawRows();},'button subtle'),range=el('span','muted');previous.setAttribute('aria-label',t('nlPreviousPage'));next.setAttribute('aria-label',t('nlNextPage'));pages.append(previous,range,next);footer.append(count,pages);middle.append(footer);
      const scopeTabs=el('div','nl-scope-tabs');scopeTabs.setAttribute('role','tablist');scopeTabs.setAttribute('aria-label',t('nlTestScope'));const singleTab=decorate(button(t('nlSingle'),()=>setScope('single')),'node'),batchTab=decorate(button(t('nlGroupBatch'),()=>setScope('batch')),'layers');scopeTabs.append(singleTab,batchTab);center.append(scopeTabs);
      for(const [b,scope]of [[singleTab,'single'],[batchTab,'batch']]){b.dataset.scope=scope;b.setAttribute('role','tab');b.onkeydown=e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();setScope(scope==='single'?'batch':'single');(scope==='single'?batchTab:singleTab).focus();}};}
      const target=el('div','nl-target');center.append(target);
      const testForm=el('div','nl-test-form'),modeControl=select([['quick',t('nlQuick')],['full',t('nlFull')]],mode),trafficControl=select([10,25,50,100].map(n=>[String(n),n+' MiB']),String(traffic)),concurrencyControl=select([1,2,3].map(n=>[String(n),n+' '+t('nodeCount')]),String(concurrency));
      modeControl.dataset.nlMode='';modeControl.classList.add('nl-native-mode');modeControl.tabIndex=-1;modeControl.setAttribute('aria-hidden','true');
      const modeTabs=el('div','nl-mode-tabs'),quick=decorate(button(t('nlQuick'),()=>setMode('quick')),'clock'),full=decorate(button(t('nlFull'),()=>setMode('full')),'download');modeTabs.append(quick,full);modeControl.onchange=()=>setMode(modeControl.value);trafficControl.onchange=()=>{traffic=Number(trafficControl.value);updateControls();};concurrencyControl.onchange=()=>concurrency=Number(concurrencyControl.value);
      const modeField=field(t('nlTestMode'),modeTabs),trafficField=field(t('nlTraffic'),trafficControl),concurrencyField=field(t('nlConcurrency'),concurrencyControl);modeField.append(modeControl);testForm.append(modeField,concurrencyField,trafficField);
      for(const [f,k]of [[modeField,'bolt'],[trafficField,'download'],[concurrencyField,'layers']])f.querySelector('.field-label').prepend(icon(k));
      const service=el('div','nl-service');service.title=t('nlLatencyMethod');service.append(labelIcon(t('nlService'),'cloud'),el('strong','','Cloudflare'));testForm.append(service);
      const budget=el('p','nl-budget muted');testForm.append(budget);center.append(testForm);
      const current=el('div','nl-current');center.append(current);
      const progress=el('progress','nl-progress');progress.max=1;progress.value=0;progress.setAttribute('aria-label',t('nlProgress'));const summary=el('p','nl-job-summary');summary.setAttribute('role','status');summary.setAttribute('aria-live','polite');center.append(progress,summary);
      const actions=el('div','nl-test-actions'),singleButton=decorate(button(t('nlStart'),()=>{if(focusedRoute)start([focusedRoute]);},'button primary'),'bolt'),selectedButton=decorate(button(t('nlTestSelected'),()=>start([...chosen]),'button primary'),'bolt'),groupButton=decorate(button(t('nlTestVisible'),()=>start(visibleRoutes().filter(eligible).map(r=>r.value))),'layers'),stop=decorate(button(t('nlStop'),stopTest,'button danger-text'),'stop');singleButton.dataset.nlSingle='';selectedButton.dataset.nlStart='';groupButton.dataset.nlStart='';stop.dataset.nlStop='';actions.append(singleButton,selectedButton,groupButton,stop);center.append(actions);
      view={groupListHost,groupActions,body,count,pages,previous,next,range,tableWrap,sortControl,sourceControl,groupControl,search,groupTitle,groupStats,allTestButton,hiddenLabel,singleTab,batchTab,target,quick,full,singleButton,notice:noticeHost,modeControl,trafficField,trafficControl,concurrencyField,concurrencyControl,budget,selectedButton,groupButton,stop,progress,summary,current};
      notice(noticeText,noticeKind);drawGroups();drawRows();updateControls();paintCurrent();V2RFeedback.refresh();
    }
    function setScope(value){if(running())return;testScope=value;updateControls();paintCurrent();}
    function setMode(value){if(running())return;mode=value;view.modeControl.value=value;updateControls();}
    function groupIcon(){const items=visibleRoutes(),countries=new Set(items.map(r=>r.country).filter(Boolean));if(items.length&&countries.size===1&&items.every(r=>r.country)){const n=el('img','nl-flag');n.src=V2R.routeIcon(items[0]);n.alt='';return n;}return icon('layers');}
    function paintLatency(node,value){const quality=!finite(value)?'unknown':value<=200?'fast':value<=500?'moderate':'slow';node.dataset.quality=quality;node.title=t('nlLatencyMethod');node.classList.add('nl-latency');node.replaceChildren(el('span','nl-latency-value',finite(value)?Math.round(value)+' ms':'—'),el('small','nl-quality-label',t({unknown:'nlUntested',fast:'nlLatencyFast',moderate:'nlLatencyModerate',slow:'nlLatencySlow'}[quality])));}
    function paintGroup(){
      view.groupTitle.replaceChildren(groupIcon(),el('h2','',activeName()));
      const items=visibleRoutes(),tested=items.filter(r=>terminal(results.get(r.value)?.state)),latencies=items.map(r=>results.get(r.value)?.latencyMs).filter(finite),average=latencies.length?latencies.reduce((a,b)=>a+b,0)/latencies.length:null;
      view.groupStats.replaceChildren();for(const [kind,text]of [['node',items.length+' '+t('nodeCount')],['check',tested.length+' '+t('nlMeasured')]])view.groupStats.append(labelIcon(text,kind));const latency=el('span','nl-group-latency'),value=el('span');paintLatency(value,average);latency.append(icon('clock'),el('span','',t('nlMeanLatency')),value);view.groupStats.append(latency);
    }
    function paintTarget(){
      const visible=visibleRoutes(),known=visible.find(r=>r.value===focusedRoute&&eligible(r));if(!known){focusedRoute=visible.find(eligible)?.value||null;testScope='single';}chosen=new Set([...chosen].filter(id=>visible.some(r=>r.value===id&&eligible(r))));
      const node=routes().find(r=>r.value===focusedRoute),wrap=el('span','nl-target-icon');view.target.replaceChildren();
      if(testScope==='single'&&node){const img=el('img','nl-flag');img.src=V2R.routeIcon(node);img.alt='';wrap.append(img);}else wrap.append(groupIcon());
      const text=el('div');text.append(el('small','muted',t(testScope==='single'?'nlCurrentNode':'nlCurrentGroup')),el('strong','',testScope==='single'?(node?V2R.routeLabel(node):t('nlChooseNode')):activeName()));if(testScope==='single'&&node)text.append(el('small','muted',[V2R.routeProtocol(node),V2R.routeGroup(node)].filter(Boolean).join(' · ')));view.target.append(wrap,text);
    }
    function drawGroups(){
      if(!alive)return;cancelGroupDrag();const list=groupList();if(!list.some(g=>g.id===currentGroup))currentGroup='all';view.groupListHost.replaceChildren();
      list.forEach((g,index)=>{const custom=grouping==='source'&&g.source==='local'&&!g.readonly&&g.rawId!=='local-imports',b=button('',()=>{if(suppressGroupClick)return;currentGroup=g.id;tablePage=0;if(!running())frozenOrder=null;drawGroups();drawRows();updateControls();paintCurrent();},'nl-group');b.dataset.groupId=g.id;b.title=g.name+(custom?' · '+t('nlCustomGroup'):'');b.setAttribute('aria-label',b.title);if(custom)b.dataset.customGroup='';b.id='nl-group-'+index;b.setAttribute('role','tab');b.setAttribute('aria-selected',String(currentGroup===g.id));b.setAttribute('aria-controls','nl-results-body');b.tabIndex=currentGroup===g.id?0:-1;const mark=grouping==='source'&&g.id!=='all'?el('span','nl-group-grip','⠿'):icon(g.id==='all'?'layers':'node');mark.setAttribute('aria-hidden','true');b.append(mark,el('span','nl-group-name',g.name),el('span','badge',g.count));if(grouping==='source'&&g.id!=='all'){b.dataset.sortGroup=g.rawId;b.title+=' · '+t('groupHint');b.onpointerdown=groupDown;}b.onkeydown=e=>{if(e.altKey&&['ArrowUp','ArrowDown'].includes(e.key)){if(grouping!=='source'||g.id==='all')return;e.preventDefault();const order=list.filter(x=>x.id!=='all').map(x=>x.rawId),at=order.indexOf(g.rawId),next=at+(e.key==='ArrowUp'?-1:1);if(next>=0&&next<order.length){[order[at],order[next]]=[order[next],order[at]];saveGroupOrder(order,g.rawId);}return;}let at=index;if(e.key==='ArrowDown')at=(index+1)%list.length;else if(e.key==='ArrowUp')at=(index+list.length-1)%list.length;else if(e.key==='Home')at=0;else if(e.key==='End')at=list.length-1;else return;e.preventDefault();currentGroup=list[at].id;tablePage=0;if(!running())frozenOrder=null;drawGroups();drawRows();updateControls();paintCurrent();view.groupListHost.children[at]?.focus();};view.groupListHost.append(b);});
      for(const old of view.groupActions.querySelectorAll('[data-group-edit]'))old.remove();
      const selected=list.find(g=>g.id===currentGroup);if(selected&&selected.source==='local'&&!selected.readonly&&selected.rawId!=='local-imports'){
        const rename=button(t('rename'),()=>editGroup(selected,()=>view.groupActions.querySelector('[data-feedback=rename-group]')),'button subtle'),remove=button(t('remove'),()=>confirmAction(t('nlRemoveGroup'),t('nlRemoveGroupHelp'),()=>mutate('v2routeLibraryGroups',{action:'remove',id:selected.rawId,revision:lib.revision}),()=>view.groupActions.querySelector('[data-feedback=remove-group]')),'button danger-text');for(const b of [rename,remove]){decorate(b,b===rename?'edit':'trash');b.dataset.groupEdit='';b.dataset.feedback=b===rename?'rename-group':'remove-group';b.dataset.nlAvailable='';view.groupActions.append(b);}
      }
    }
    function cancelGroupDrag(feedback=false){
      const d=groupDrag;if(!d)return;groupDrag=null;clearTimeout(d.timer);cancelAnimationFrame(groupFrame);for(const row of view.groupListHost.children)row.classList.remove('dragging','drop-before','drop-after');view.groupListHost.classList.remove('sorting');try{view.groupListHost.releasePointerCapture(d.id);}catch(_){}if(feedback&&d.active)groupMessage?.success('orderCancelled');else groupMessage?.clear();
    }
    function groupDown(event){
      if(event.button!==0||groupDrag||!available||mutation||running()||grouping!=='source')return;
      const row=event.currentTarget,d={id:event.pointerId,row,startX:event.clientX,startY:event.clientY,y:event.clientY,active:false,group:row.dataset.sortGroup,target:row.dataset.sortGroup,after:false,order:groupList().filter(g=>g.id!=='all').map(g=>g.rawId)};groupDrag=d;
      d.timer=setTimeout(()=>{if(groupDrag!==d||row.parentElement!==view.groupListHost||mutation||running()){cancelGroupDrag();return;}d.active=true;row.classList.add('dragging');view.groupListHost.classList.add('sorting');try{view.groupListHost.setPointerCapture(d.id);}catch(_){}groupMessage=V2RFeedback.begin(()=>[...view.groupListHost.querySelectorAll('[data-sort-group]')].find(n=>n.dataset.sortGroup===d.group)?.querySelector('.nl-group-name'),{key:'library:group-order'});groupMessage.show({key:'dragHint'},'pending');groupFrame=requestAnimationFrame(groupPoint);},250);
    }
    function groupPoint(){
      const d=groupDrag;if(!d?.active)return;if(d.row.parentElement!==view.groupListHost){cancelGroupDrag();return;}
      const box=view.groupListHost.getBoundingClientRect();if(d.y<box.top+24)view.groupListHost.scrollTop-=10;else if(d.y>box.bottom-24)view.groupListHost.scrollTop+=10;
      const rows=[...view.groupListHost.querySelectorAll('[data-sort-group]')];for(const row of rows)row.classList.remove('drop-before','drop-after');const targets=rows.filter(row=>row!==d.row),target=targets.find(row=>d.y<row.getBoundingClientRect().bottom)||targets.at(-1);
      if(target){const rect=target.getBoundingClientRect();d.target=target.dataset.sortGroup;d.after=d.y>rect.top+rect.height/2;target.classList.add(d.after?'drop-after':'drop-before');}groupFrame=requestAnimationFrame(groupPoint);
    }
    function groupMove(event){const d=groupDrag;if(!d||event.pointerId!==d.id)return;if(event.buttons===0){cancelGroupDrag();return;}d.y=event.clientY;if(!d.active){if(Math.hypot(event.clientX-d.startX,event.clientY-d.startY)>8)cancelGroupDrag();return;}event.preventDefault();}
    function groupUp(event){const d=groupDrag;if(!d||event.pointerId!==d.id)return;const box=view.groupListHost.getBoundingClientRect(),outside=event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom,order=V2R.move(d.order,d.group,d.target,d.after);cancelGroupDrag(outside);if(d.active){suppressGroupClick=true;setTimeout(()=>suppressGroupClick=false,0);if(!outside&&JSON.stringify(order)!==JSON.stringify(d.order))saveGroupOrder(order,d.group);}}
    function groupCancel(event){if(groupDrag&&(!event||!['pointercancel','lostpointercapture'].includes(event.type)||event.pointerId===groupDrag.id))cancelGroupDrag(true);}
    function groupKey(event){if(event.key==='Escape'&&groupDrag){event.preventDefault();event.stopPropagation();cancelGroupDrag(true);}}
    function groupVisibility(){if(document.hidden)cancelGroupDrag(true);}
    async function saveGroupOrder(order,sourceId){
      if(!alive||!available||mutation||running()||grouping!=='source')return;cancelGroupDrag();const full=groupList(true).filter(g=>g.id!=='all').map(g=>g.rawId),visible=new Set(order);let at=0;const merged=full.map(id=>visible.has(id)?order[at++]:id);
      if(JSON.stringify(merged)===JSON.stringify(full))return;mutation=true;loadSerial++;clearTimeout(stateTimer);view.groupListHost.setAttribute('aria-busy','true');updateControls();const message=V2RFeedback.begin(()=>[...view.groupListHost.querySelectorAll('[data-sort-group]')].find(n=>n.dataset.sortGroup===sourceId)?.querySelector('.nl-group-name'),{key:'library:group-order'});
      try{const state=await V2R.rpc('zeroRouteReorder',[{revision:catalog.settings.revision,groups:merged}]);if(!alive)return;if(!state.catalog?.routes)throw new Error('invalid-state');const focused=view.groupListHost.contains(document.activeElement)?document.activeElement.dataset.groupId:null,top=view.groupListHost.scrollTop;ingest({catalog:state.catalog});drawGroups();drawRows();message.success();if(focused)[...view.groupListHost.children].find(row=>row.dataset.groupId===focused)?.focus({preventScroll:true});view.groupListHost.scrollTop=top;}
      catch(error){if(alive)message.error(error);}
      finally{mutation=false;if(alive){view.groupListHost.removeAttribute('aria-busy');updateControls();scheduleState();}}
    }
    function metricCell(row,key,average){
      const n=el('td','nl-number');n.dataset.metric=key;if(!row){n.textContent='—';return n;}
      const value=row[average];n.textContent=finite(value)?value.toFixed(2)+' Mbps':'—';n.dataset.metric=key;n.dataset.phaseState=finite(value)?'complete':'unknown';return n;
    }
    function drawRows(){
      if(!alive)return;const allItems=sortedRows();tablePage=Math.max(0,Math.min(tablePage,Math.ceil(allItems.length/50)-1));const items=allItems.slice(tablePage*50,tablePage*50+50);view.previous.disabled=tablePage===0;view.next.disabled=(tablePage+1)*50>=allItems.length;view.pages.hidden=allItems.length<=50;view.range.textContent=(tablePage+1)+' / '+Math.max(1,Math.ceil(allItems.length/50));view.body.replaceChildren();view.body.id='nl-results-body';
      workspace.querySelector('.nl-results').setAttribute('aria-label',activeName());
      for(const th of workspace.querySelectorAll('th[data-sort]'))th.setAttribute('aria-sort',th.dataset.sort===sort?(direction>0?'ascending':'descending'):'none');
      for(const r of items){
        const result=results.get(r.value),row=el('tr',hidden(r)?'nl-row hidden-node':'nl-row');row.dataset.route=r.value;row.dataset.state=result?.state||'untested';
        row.tabIndex=0;row.setAttribute('aria-selected',String(chosen.has(r.value)));row.setAttribute('aria-disabled',String(!eligible(r)||running()));
        const name=el('td','nl-node'),nameLine=el('span','nl-node-name'),flag=el('img','nl-flag');flag.src=V2R.routeIcon(r);flag.alt='';const tile=el('span','nl-flag-tile');tile.append(flag);nameLine.append(tile,el('strong','',V2R.routeLabel(r)));name.append(nameLine);
        const meta=el('small','nl-node-meta muted');if(r.protocol||r.protocol_key)meta.append(el('span','nl-protocol',V2R.routeProtocol(r)));meta.append(el('span','',V2R.routeGroup(r)||t('v2rayn')));if(hidden(r))meta.append(el('span','',t('hiddenNode')));name.append(meta);
        nameLine.title=V2R.routeLabel(r);
        if(r.supported===false){const hint=el('span','nl-unavailable',V2R.routeReason(r));hint.title=hint.textContent;meta.append(hint);}
        if((result?.chainValues||r.chain_values||[]).length>1)meta.append(el('span','nl-chain-note',t('nlViaGroup')));
        meta.title=meta.textContent;
        const latency=el('td','nl-number',finite(result?.latencyMs)?Math.round(result.latencyMs)+' ms':'—');latency.dataset.metric='latency';paintLatency(latency,result?.latencyMs);
        const status=el('td','nl-row-status',t(stateKey(result?.state)));status.dataset.status=result?.state||'untested';if(result?.errorCode)status.title=errorText(result.errorCode);
        const actions=el('td'),buttons=el('div','nl-row-actions'),test=button(t('nlTestNode'),()=>{focusedRoute=r.value;testScope='single';start([r.value]);},'button subtle');test.disabled=running()||!eligible(r)||!root.V2RNodeMeasure;test.title=t(mode==='full'?'nlFull':'nlQuick');test.dataset.action='test';
        const create=button(t(r.supported===false&&r.override_supported?'preConfigure':'useNode'),()=>context.onCreate(r.value),'button subtle');create.disabled=(r.supported===false&&!r.override_supported)||hidden(r);create.dataset.action='create';buttons.append(test,create);
        if(local(r)){const remove=button(t('remove'),()=>confirmAction(t('removeNode'),t('removeNodeHelp'),async()=>{await V2R.rpc('v2routeRemoveNode',[r.id||r.value.replace(/^node:/,'')]);await loadState();}),'button danger-text');remove.disabled=running()||mutation;remove.dataset.action='remove';buttons.append(remove);}
        else{const toggle=button(t(hidden(r)?'restoreNode':'hideNode'),async()=>{toggle.disabled=true;const message=V2RFeedback.begin(()=>[...view.body.querySelectorAll('.nl-row')].find(n=>n.dataset.route===r.value)?.querySelector('[data-action=hide]')||view.hiddenLabel,{key:'library:hide:'+r.value});try{await context.savePrefs(p=>{const values=new Set(p.hiddenRouteValues||[]);hidden(r)?values.delete(r.value):values.add(r.value);return{hiddenRouteValues:[...values]};});if(!alive)return;chosen.delete(r.value);drawGroups();drawRows();updateControls();message.clear();}catch(error){message.error(error);toggle.disabled=false;}},'button subtle');toggle.disabled=running();toggle.dataset.action='hide';toggle.title=t('hideNodeHelp');buttons.append(toggle);}
        for(const b of buttons.children)decorate(b,{test:'bolt',create:'plus',hide:'eye',remove:'trash'}[b.dataset.action],b.textContent,!['test','create'].includes(b.dataset.action));if(!(r.supported===false&&r.override_supported)){create.querySelector('span').className='nl-action-long';const short=el('span','nl-action-short',t('nlProfileShort'));short.setAttribute('aria-hidden','true');create.append(short);}actions.append(buttons);row.append(name,latency,metricCell(result,'download','downloadAverageMbps'),metricCell(result,'upload','uploadAverageMbps'),status,actions);view.body.append(row);
      }
      if(!items.length){const row=el('tr'),cell=el('td','nl-empty',t(routes().length?'adjustNodeFilters':'noNodesHelp'));cell.colSpan=6;row.append(cell);view.body.append(row);}
      updateSelection();paintGroup();
    }
    function paintRows(){
      for(const n of view.body.querySelectorAll('.nl-row')){
        const row=results.get(n.dataset.route);n.dataset.state=row?.state||'untested';
        for(const key of ['download','upload']){const cell=n.querySelector('[data-metric='+key+']'),value=row?.[key+'AverageMbps'];cell.textContent=finite(value)?value.toFixed(2)+' Mbps':'—';cell.dataset.phaseState=finite(value)?'complete':'unknown';}
        paintLatency(n.querySelector('[data-metric=latency]'),row?.latencyMs);const status=n.querySelector('.nl-row-status');status.textContent=t(stateKey(row?.state));status.dataset.status=row?.state||'untested';status.title=row?.errorCode?errorText(row.errorCode):'';
        const route=routes().find(r=>r.value===n.dataset.route);n.setAttribute('aria-disabled',String(running()||!route||!eligible(route)));for(const b of n.querySelectorAll('[data-action]'))if(b.dataset.action!=='create')b.disabled=running()||(b.dataset.action==='test'&&(!route||!eligible(route)));
      }paintGroup();
    }
    function updateSelection(){
      for(const row of view.body.querySelectorAll('.nl-row'))row.setAttribute('aria-selected',String(chosen.has(row.dataset.route)));
      view.count.textContent=visibleRoutes().length+' '+t('nodeCount')+' · '+selectedRoutes().length+' '+t('nlSelected');
    }
    function clearSelection(){if(running()||!chosen.size)return;chosen.clear();selectionAnchor=null;updateControls();paintCurrent();}
    function onBlankPointerDown(e){
      if(e.button!==0||!alive||running()||dialog?.open||!chosen.size)return;
      if(e.target.closest('.nl-row,button,a,input,select,textarea,label,summary,dialog,[role=button],[role=tab],[role=option],[role=listbox],[role=menu],[contenteditable=true]'))return;
      const scroll=e.target.closest('.nl-table-scroll');if(scroll){const r=scroll.getBoundingClientRect();if(e.clientX>=r.left+scroll.clientWidth*r.width/scroll.offsetWidth||e.clientY>=r.top+scroll.clientHeight*r.height/scroll.offsetHeight)return;}
      clearSelection();
    }
    function selectRange(ids,from,to,base,remove=false){
      chosen=new Set(base);for(const id of ids.slice(Math.min(from,to),Math.max(from,to)+1))remove?chosen.delete(id):chosen.add(id);
      const selected=selectedRoutes();focusedRoute=selected.length===1?selected[0].value:ids[to];testScope=selected.length>1?'batch':'single';updateControls();paintCurrent();
    }
    function endRowDrag(){const previous=dragSelection;dragSelection=null;cancelAnimationFrame(dragFrame);dragFrame=0;if(previous?.wrap.hasPointerCapture(previous.pointerId))previous.wrap.releasePointerCapture(previous.pointerId);}
    function bindRowSelection(wrap){
      const rows=()=>[...view.body.querySelectorAll('.nl-row')].filter(n=>n.getAttribute('aria-disabled')!=='true');
      const interactive=target=>target.closest('button,a,input,select,textarea');
      function dragTo(y){if(!dragSelection)return;const list=rows(),ids=list.map(n=>n.dataset.route),from=ids.indexOf(dragSelection.anchor);if(from<0){endRowDrag();return;}let index=0,distance=Infinity;list.forEach((n,i)=>{const r=n.getBoundingClientRect(),gap=Math.max(r.top-y,y-r.bottom,0);if(gap<distance){distance=gap;index=i;}});selectRange(ids,from,index,dragSelection.base,dragSelection.remove);}
      function scrollDrag(){if(!dragSelection||!alive||running()){endRowDrag();return;}const r=wrap.getBoundingClientRect(),y=dragSelection.y,delta=y<r.top+32?-12:y>r.bottom-32?12:0;if(delta){const before=wrap.scrollTop;wrap.scrollTop+=delta;if(wrap.scrollTop!==before)dragTo(y);}dragFrame=requestAnimationFrame(scrollDrag);}
      wrap.onpointerdown=e=>{if(e.button!==0||e.pointerType==='touch'||running()||interactive(e.target))return;const row=e.target.closest('.nl-row'),list=rows(),index=list.indexOf(row);if(index<0)return;e.preventDefault();endRowDrag();const ids=list.map(n=>n.dataset.route),modifier=e.ctrlKey||e.metaKey,anchor=e.shiftKey?ids.indexOf(selectionAnchor):-1,from=anchor>=0?anchor:index,base=modifier?new Set(chosen):new Set(),remove=modifier&&chosen.has(ids[index]);dragSelection={wrap,pointerId:e.pointerId,anchor:ids[from],base,remove,y:e.clientY};if(!e.shiftKey)selectionAnchor=ids[index];selectRange(ids,from,index,base,remove);row.focus({preventScroll:true});wrap.setPointerCapture(e.pointerId);dragFrame=requestAnimationFrame(scrollDrag);};
      wrap.onpointermove=e=>{if(dragSelection&&e.pointerId===dragSelection.pointerId){dragSelection.y=e.clientY;dragTo(e.clientY);}};
      wrap.onpointerup=wrap.onpointercancel=wrap.onlostpointercapture=()=>endRowDrag();
      wrap.onkeydown=e=>{if(running()||interactive(e.target))return;if(e.key==='Escape'){e.preventDefault();clearSelection();return;}const list=rows(),row=e.target.closest('.nl-row'),index=list.indexOf(row);if(index<0)return;const ids=list.map(n=>n.dataset.route),modifier=e.ctrlKey||e.metaKey;if(modifier&&e.key.toLowerCase()==='a'){e.preventDefault();selectRange(ids,0,ids.length-1,new Set());return;}if([' ','Enter','ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();let at=index;if(e.key==='ArrowDown')at=Math.min(ids.length-1,index+1);if(e.key==='ArrowUp')at=Math.max(0,index-1);const anchor=e.shiftKey?ids.indexOf(selectionAnchor):-1;selectRange(ids,anchor>=0?anchor:at,at,modifier?chosen:new Set(),modifier&&chosen.has(ids[at]));if(!e.shiftKey)selectionAnchor=ids[at];list[at].focus();}};
    }
    function budgetFor(ids){return mode==='full'?ids.length*traffic*2:0;}
    function updateControls(){
      if(!alive)return;const previousFocus=focusedRoute;paintTarget();const active=running(),selected=selectedRoutes().map(r=>r.value),shown=visibleRoutes().filter(eligible).map(r=>r.value);
      for(const n of [...workspace.querySelectorAll('[data-nl-available]'),...context.actions.querySelectorAll('[data-nl-available]')])n.disabled=!available||mutation||active;
      for(const n of context.actions.querySelectorAll('[data-nl-mutation]'))n.disabled=active||mutation;
      view.modeControl.disabled=active;view.trafficControl.disabled=active;view.concurrencyControl.disabled=active;view.trafficField.hidden=false;view.concurrencyField.hidden=false;view.trafficField.title=mode==='quick'?t('nlTrafficFullOnly'):'';
      view.budget.hidden=mode!=='full';view.budget.textContent=mode==='full'&&testScope==='single'?t('nlBudget')+': '+(focusedRoute?traffic*2:0)+' MiB':mode==='full'?t('nlTestSelected')+' ('+selected.length+'): '+budgetFor(selected)+' MiB · '+t('nlTestVisible')+' ('+shown.length+'): '+budgetFor(shown)+' MiB':'';view.budget.classList.toggle('error',budgetFor(selected)>8192||budgetFor(shown)>8192||selected.length>1000||shown.length>1000);
      view.selectedButton.disabled=active||!selected.length||selected.length>1000||budgetFor(selected)>8192||!root.V2RNodeMeasure;view.groupButton.disabled=active||!shown.length||shown.length>1000||budgetFor(shown)>8192||!root.V2RNodeMeasure;
      decorate(view.groupButton,'layers',t(currentGroup==='all'?'nlTestAll':'nlTestGroup')+' ('+shown.length+')');decorate(view.selectedButton,'bolt',t('nlTestSelected')+' ('+selected.length+')');view.stop.hidden=!active;view.stop.disabled=stopping;decorate(view.stop,'stop',t(stopping?'nlStopping':'nlStop'));
      for(const [b,value]of [[view.singleTab,'single'],[view.batchTab,'batch']]){b.setAttribute('aria-selected',String(testScope===value));b.tabIndex=testScope===value?0:-1;b.disabled=active;}for(const [b,value]of [[view.quick,'quick'],[view.full,'full']]){b.setAttribute('aria-pressed',String(mode===value));b.disabled=active;}
      view.sortControl.disabled=active;for(const b of workspace.querySelectorAll('.nl-sort'))b.disabled=active;view.allTestButton.disabled=view.groupButton.disabled;decorate(view.allTestButton,'layers',t(currentGroup==='all'?'nlTestAll':'nlTestGroup'));view.singleButton.hidden=testScope!=='single';view.selectedButton.hidden=view.groupButton.hidden=testScope!=='batch';paintTarget();const target=routes().find(r=>r.value===focusedRoute);view.singleButton.disabled=active||!target||!eligible(target)||!root.V2RNodeMeasure;
      const total=Number(job?.total)||0,completed=Number(job?.completed)||0;view.progress.hidden=!job;view.progress.max=Math.max(1,total);view.progress.value=Math.min(total,completed);
      view.summary.textContent=starting?t('nlStarting'):job?t(stateKey(job.state))+' · '+completed+'/'+total+' · '+(Number(job.succeeded)||0)+' '+t('nlSucceeded'):t('nlReady');updateSelection();if(previousFocus!==focusedRoute)paintCurrent();
    }
    function paintCurrent(){
      const row=[...results.values()].find(r=>['running','starting'].includes(r.state))||results.get(focusedRoute);view.current.replaceChildren();
      const route=routes().find(r=>r.value===row?.route);if(route)view.current.append(el('strong','nl-current-name',V2R.routeLabel(route)));
      const metrics=el('div','nl-live-metrics');for(const [key,title,avg]of [['latency','nlHttpsLatency',''],['download','speedDownload','downloadAverageMbps'],['upload','speedUpload','uploadAverageMbps']]){
        const card=el('div','nl-live-metric');card.dataset.metric=key;const active=row?.phase===key&&['running','starting'].includes(row.state),value=key==='latency'?row?.latencyMs:active?row[key+'Mbps']:row?.[avg];card.append(labelIcon(t(title),key==='latency'?'clock':key),el('strong','',finite(value)?(key==='latency'?Math.round(value)+' ms':value.toFixed(2)+(active?' Mbps/s':' Mbps')):'—'));if(key==='latency'){const metric=card.querySelector('strong');paintLatency(metric,value);metric.querySelector('.nl-latency-value').textContent=finite(value)?Math.round(value):'—';const quality=metric.querySelector('.nl-quality-label');quality.classList.add('nl-latency');quality.dataset.quality=metric.dataset.quality;metric.append(document.createTextNode(' '),el('small','nl-speed-unit',finite(value)?'ms':'\u00a0'));card.append(quality);}else if(finite(value))card.querySelector('strong').replaceChildren(el('span','nl-speed-value',value.toFixed(2)),document.createTextNode(' '),el('small','nl-speed-unit',active?'Mbps/s':'Mbps'));if(key!=='latency')card.append(el('small','muted',finite(value)?t(active?'speedRealtime':'speedAverage'):t('nlUntested')));metrics.append(card);
      }view.current.append(metrics);fitMetricValues();
      if(!metricObserver&&root.ResizeObserver){metricObserver=new ResizeObserver(entries=>{const width=entries[0]?.contentRect.width||0;if(Math.abs(width-metricWidth)>.5){metricWidth=width;fitMetricValues();}});metricObserver.observe(view.current);}
    }
    function fitMetricValues(){
      cancelAnimationFrame(metricFrame);metricFrame=requestAnimationFrame(()=>{
        if(!alive||!view.current?.isConnected)return;
        for(const card of view.current.querySelectorAll('.nl-live-metric')){
          const value=card.querySelector('strong');if(!value)continue;value.style.fontSize='';
          const style=getComputedStyle(card),valueStyle=getComputedStyle(value),available=card.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight),needed=value.scrollWidth,base=parseFloat(valueStyle.fontSize),gap=(parseFloat(valueStyle.columnGap)||0)*Math.max(0,value.children.length-1);
          if(available>gap&&needed>available)value.style.fontSize=Math.max(1,Math.floor(base*(available-gap)/(needed-gap)*10)/10)+'px';
        }
      });
    }
    function acceptSnapshot(snapshot,token){
      if(!alive||token!==generation||!snapshot||typeof snapshot!=='object')return false;
      if(job?.jobId&&snapshot.jobId!==job.jobId)return false;if(job?.seq!=null&&snapshot.seq<job.seq)return false;
      job={...job,...snapshot};for(const row of snapshot.rows||[])if(typeof row.route==='string')results.set(row.route,{...results.get(row.route),...row});
      if(terminal(job.state)){starting=false;stopping=false;if(!job.hasMore)clearTimeout(pollTimer);}
      paintRows();updateControls();paintCurrent();return true;
    }
    async function poll(token){
      if(!alive||token!==generation||!job||(terminal(job.state)&&!job.hasMore))return;
      try{const state=await transport.request('nodeMeasurePoll',{jobId:job.jobId,afterSeq:job.seq||0});if(acceptSnapshot(state,token)&&(!terminal(job.state)||job.hasMore)){clearTimeout(pollTimer);pollTimer=setTimeout(()=>poll(token),job.hasMore?0:500);}}
      catch(_){if(!alive||token!==generation)return;job={...job,state:'error',hasMore:false};stopping=false;starting=false;for(const [id,row]of results)if(!terminal(row.state))results.set(id,{...row,state:'error',downloadMbps:null,uploadMbps:null});notice({key:'nlMeasureDisconnected'});transport?.close();transport=null;paintRows();updateControls();paintCurrent();}
    }
    async function start(ids){
      if(running()||!alive||!root.V2RNodeMeasure)return;const map=new Map(routes().map(r=>[r.value,r]));ids=[...new Set(ids)].filter(id=>map.has(id)&&eligible(map.get(id)));if(!ids.length||ids.length>1000||budgetFor(ids)>8192)return;
      frozenOrder=sortedRows().map(r=>r.value);focusedRoute=ids[0];const token=++generation;clearTimeout(pollTimer);starting=true;stopping=false;job=null;notice('');for(const id of ids)results.set(id,{route:id,state:'queued'});paintRows();updateControls();paintCurrent();
      try{transport?.close();transport=root.V2RNodeMeasure.create();const snapshot=await transport.request('nodeMeasureStart',{nodeIds:ids,mode,trafficMiB:traffic,concurrency});if(!alive||token!==generation)return;starting=false;if(!snapshot?.jobId)throw new Error('invalid-job');acceptSnapshot(snapshot,token);if(stopping)await cancelJob(token);else if(!terminal(job.state)||job.hasMore)poll(token);}
      catch(_){if(!alive||token!==generation)return;transport?.close();transport=null;starting=false;stopping=false;for(const id of ids)results.set(id,{route:id,state:'error'});job={state:'error',total:ids.length,completed:0,succeeded:0,rows:[]};notice({key:'nlMeasureDisconnected'});paintRows();updateControls();}
    }
    async function cancelJob(token){
      try{const snapshot=await transport.request('nodeMeasureCancel',{jobId:job.jobId,afterSeq:job.seq||0});if(acceptSnapshot(snapshot,token)&&(!terminal(job.state)||job.hasMore))poll(token);}
      catch(_){if(alive&&token===generation){transport?.close();transport=null;for(const [id,row]of results)if(!terminal(row.state))results.set(id,{...row,state:'cancelled',downloadMbps:null,uploadMbps:null});job={...job,state:'cancelled',hasMore:false};stopping=false;notice({key:'nlMeasureDisconnected'});paintRows();updateControls();paintCurrent();}}
    }
    function stopTest(){if(!running()||stopping)return;stopping=true;clearTimeout(pollTimer);updateControls();if(job?.jobId)cancelJob(generation);}
    function openDialog(title,returnTo){
      closeDialog();const token=++dialogGeneration,opener=document.activeElement,n=el('dialog','nl-dialog'),body=el('div','nl-dialog-body'),heading=el('h2','',title);heading.id='nl-dialog-title';n.setAttribute('aria-labelledby',heading.id);body.append(heading);n.append(body);document.body.append(n);dialog=n;
      n.addEventListener('close',()=>{n.remove();if(dialog===n){dialog=null;dialogGeneration++;}if(alive&&opener?.isConnected)opener.focus();},{once:true});n.showModal();return{n,body,token,returnTo};
    }
    function closeDialog(){if(dialog){const old=dialog;dialog=null;dialogGeneration++;old.close();old.remove();}}
    function dialogActions(form,submitLabel,action){
      const actions=el('div','nl-dialog-actions'),cancel=button(t('cancel'),()=>form.n.close(),'button subtle'),submit=button(submitLabel,async()=>{
        if(submit.disabled)return;submit.disabled=true;const message=V2RFeedback.begin(()=>form.n.open?submit:form.returnTo?.(),{key:form.n,className:'nl-dialog-feedback'});
        try{
          const outcome=await action();
          if(!alive||dialog!==form.n)return;
          form.n.close();
          if(outcome?.warning){
            const warning=()=>t('nlPartial')+' · '+errorText(outcome.warning);
            if(form.returnTo?.()?.isConnected)message.show(warning,'error');
            else{message.clear();notice(warning());}
          }else message.clear();
        }
        catch(err){if(alive&&dialog===form.n){message.error(err);submit.disabled=false;}}
      },'button primary');actions.append(cancel,submit);form.body.append(actions);return submit;
    }
    function invalid(key){throw V2R.uiError(key);}
    function editGroup(group,returnTo){
      const form=openDialog(t(group?'nlRenameGroup':'nlNewGroup'),returnTo),name=input(group?.name||'');name.maxLength=100;form.body.append(field(t('nlName'),name));dialogActions(form,t('save'),async()=>{if(!name.value.trim())invalid('nlNameRequired');await mutate('v2routeLibraryGroups',{action:group?'rename':'create',...(group?{id:group.rawId}:{}),name:name.value.trim(),revision:lib.revision});});name.focus();
    }
    function confirmAction(title,help,action,returnTo){const form=openDialog(title,returnTo);form.body.append(el('p','muted',help));dialogActions(form,t('nlConfirm'),action);}
    function showImport(tab='links',subscription=null,returnTo){
      if(!available||running()||host.inert)return;const form=openDialog(t(subscription?'nlEditSubscription':'importTitle'),returnTo),tabs=el('div','nl-import-tabs'),content=el('div'),linksPanel=el('div'),subPanel=el('div');
      const linksTab=button(t('nlPasteContent'),()=>changeTab('links')),subTab=button(t('nlSubscriptionURL'),()=>changeTab('subscription'));tabs.setAttribute('role','tablist');for(const b of [linksTab,subTab])b.setAttribute('role','tab');tabs.append(linksTab,subTab);if(!subscription)form.body.append(tabs);
      const text=el('textarea');text.rows=7;text.spellcheck=false;text.placeholder='vless://…\nhttps://user:password@proxy.example:443';text.setAttribute('aria-label',t('nlPasteContent'));linksPanel.append(el('p','muted',t('importHelp')),text);
      const examples=el('details','import-examples');examples.append(el('summary','',t('importExamples')),el('pre','code-input','http://user:password@proxy.example:8080\nsocks5://user:password@proxy.example:1080\nss://BASE64(method:password)@proxy.example:8388\nvmess://Base64\nvless://UUID@proxy.example:443?security=tls\ntrojan://password@proxy.example:443\nhy2://password@proxy.example:443\n{"proxies": [{"type":"socks5","server":"proxy.example","port":1080}]}'));linksPanel.append(examples);
      const name=input(subscription?.name||''),url=input('','url');url.placeholder=subscription?t('nlKeepURL'):'https://example.com/subscription';url.spellcheck=false;url.autocomplete='off';name.maxLength=100;
      const enabled=input('','checkbox');enabled.checked=subscription?.enabled??false;const interval=input(String(subscription?.interval_minutes||60),'number');interval.min='5';interval.max='43200';interval.step='1';
      const policy=select([['proxy-first',t('nlProxyFirst')],['proxy-only',t('nlProxyOnly')],['direct-only',t('nlDirectOnly')]],subscription?.policy||'proxy-first');
      const autoLabel=el('label','nl-checkbox');autoLabel.append(enabled,el('span','',t('nlAutoUpdate')));subPanel.append(field(t('nlNameGroup'),name),field(t('nlSubscriptionURL'),url),field(t('nlConnectionPolicy'),policy),el('p','muted',t('nlProxyFirstHelp')),autoLabel,field(t('nlInterval'),interval));enabled.onchange=()=>interval.disabled=!enabled.checked;enabled.onchange();
      const groupOptions=(lib.groups||[]).map(g=>[g.id,g.id==='local-imports'?t('imported'):g.name]),defaultGroup=groupOptions.some(([id])=>id===currentGroup.replace(/^group:/,''))?currentGroup.replace(/^group:/,''):'local-imports';
      const destination=select([['',t('nlSubscriptionOwnGroup')],...groupOptions],subscription?.group_id||(tab==='subscription'?'':defaultGroup));destination.dataset.importGroup='';const groupField=field(t('nlDestinationGroup'),destination);
      const groupName=input(''),newGroupField=field(t('nlNameGroup'),groupName);groupName.maxLength=100;groupName.dataset.importGroupName='';
      content.append(linksPanel,subPanel);form.body.append(content,groupField,newGroupField,el('p','muted import-privacy',t('importPrivacy')));destination.onchange=()=>newGroupField.hidden=tab!=='links'||!!destination.value;
      const submit=dialogActions(form,t(subscription?'save':'import'),async()=>{
        if(tab==='links'){
          if(!text.value.trim())invalid('nlContentRequired');if(!destination.value&&!groupName.value.trim())invalid('nlNameRequired');await mutate('v2routeLibraryImport',{text:text.value,...(destination.value?{group_id:destination.value}:{group_name:groupName.value.trim()}),revision:lib.revision});text.value='';
        }else{
          if(!name.value.trim())invalid('nlNameRequired');if(!subscription&&!url.value.trim())invalid('nlURLRequired');
          if(url.value.trim()){let parsed;try{parsed=new URL(url.value.trim());}catch(_){invalid('nlURLRequired');}if(!['http:','https:'].includes(parsed.protocol)||parsed.username||parsed.password)invalid('nlURLRequired');}
          const minutes=Number(interval.value);if(!Number.isInteger(minutes)||minutes<5||minutes>43200)invalid('nlIntervalInvalid');
          const saved=await mutate('v2routeSubscriptionSave',{...(subscription?{id:subscription.id}:{}),name:name.value.trim(),...(url.value.trim()?{url:url.value.trim()}:{}),...(destination.value?{group_id:destination.value}:{}),enabled:enabled.checked,interval_minutes:minutes,policy:policy.value,revision:lib.revision});url.value='';if(!subscription&&saved?.created_id){const updated=await mutate('v2routeSubscriptionRefresh',{id:saved.created_id});if(updated?.refresh?.ok===false)return{warning:{code:updated.refresh.code}};}
        }
      });
      function changeTab(next){tab=next;linksPanel.hidden=tab!=='links';subPanel.hidden=tab!=='subscription';for(const [b,value]of [[linksTab,'links'],[subTab,'subscription']]){b.setAttribute('aria-selected',String(value===tab));b.tabIndex=value===tab?0:-1;}destination.onchange();submit.textContent=t(subscription?'save':tab==='links'?'import':'save');}
      tabs.onkeydown=e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();changeTab(tab==='links'?'subscription':'links');(tab==='links'?linksTab:subTab).focus();}};changeTab(tab);(tab==='links'?text:name).focus();
    }
    function destroy(){
      if(!alive)return;cancelGroupDrag();root.removeEventListener('pointermove',groupMove);root.removeEventListener('pointerup',groupUp);root.removeEventListener('pointercancel',groupCancel);root.removeEventListener('blur',groupCancel);root.removeEventListener('keydown',groupKey,true);document.removeEventListener('visibilitychange',groupVisibility);endRowDrag();disposeColumnResize();metricObserver?.disconnect();cancelAnimationFrame(metricFrame);alive=false;root.removeEventListener('pagehide',destroy);document.removeEventListener('pointerdown',onBlankPointerDown);generation++;loadSerial++;clearTimeout(pollTimer);clearTimeout(stateTimer);closeDialog();if(job?.jobId&&!terminal(job.state))transport?.request('nodeMeasureCancel',{jobId:job.jobId}).catch(()=>{});transport?.close();transport=null;workspace.remove();
    }
    root.addEventListener('pagehide',destroy,{once:true});document.addEventListener('pointerdown',onBlankPointerDown);root.addEventListener('pointermove',groupMove,{passive:false});root.addEventListener('pointerup',groupUp);root.addEventListener('pointercancel',groupCancel);root.addEventListener('blur',groupCancel);root.addEventListener('keydown',groupKey,true);document.addEventListener('visibilitychange',groupVisibility);
    build();loadState();return{destroy,translate:build};
  }
  root.V2RNodeLibrary={mount};
})(globalThis);
