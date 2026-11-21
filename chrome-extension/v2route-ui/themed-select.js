/* Shared single-select surface. Native controls remain the source of truth. */
(function(root){
  'use strict';
  const controls=new Map();let sequence=0,opened=null;
  const node=(tag,cls)=>{const n=document.createElement(tag);n.className=cls;return n;};
  function eligible(select){return !select.multiple&&select.size<=1&&!select.hidden&&select.getAttribute('aria-hidden')!=='true'&&!select.closest('.profile-type-control')&&!select.matches('.nl-native-mode,[data-native-select]');}
  function mount(select){
    const field=select.closest('label'),control=node('span','themed-select'),trigger=node('button','themed-select-trigger'),text=node('span','themed-select-value'),arrow=node('span','themed-select-arrow'),menu=node('div','themed-select-menu');
    const id='themed-select-'+(++sequence),original={tabIndex:select.getAttribute('tabindex'),aria:select.getAttribute('aria-hidden'),labelFor:field?.getAttribute('for')},descriptors={};
    let rows=[],active=-1,search='',searchedAt=0,destroyed=false;
    trigger.type='button';trigger.id=id;trigger.setAttribute('role','combobox');trigger.setAttribute('aria-haspopup','listbox');trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls',id+'-menu');trigger.setAttribute('aria-autocomplete','none');
    arrow.setAttribute('aria-hidden','true');trigger.append(text,arrow);menu.id=id+'-menu';menu.setAttribute('role','listbox');menu.setAttribute('popover','manual');menu.hidden=true;
    function appearance(){
      const style=getComputedStyle(select);
      for(const key of ['fontFamily','fontSize','fontWeight','fontStyle','lineHeight','color','backgroundColor','backgroundImage','borderTop','borderRight','borderBottom','borderLeft','borderRadius','boxShadow','paddingTop','paddingRight','paddingBottom','paddingLeft','minHeight','height'])trigger.style[key]=style[key];
      trigger.style.paddingRight=Math.max(12,parseFloat(style.paddingRight)||0)+'px';
      if(select.closest('.nl-top-control')){trigger.style.border='0';trigger.style.background='transparent';trigger.style.boxShadow='none';trigger.style.paddingInline='0';}
      control.style.flex=style.flex;control.style.alignSelf=style.alignSelf;
      for(const key of ['gridColumn','gridRow','order','marginTop','marginRight','marginBottom','marginLeft'])control.style[key]=style[key];
    }
    appearance();select.before(control);control.append(select,trigger,menu);select.classList.add('themed-select-native');select.tabIndex=-1;select.setAttribute('aria-hidden','true');if(field)field.htmlFor=id;
    const enabled=()=>rows.map((row,i)=>!row.disabled?i:-1).filter(i=>i>=0);
    function focusOption(index,scroll=true){
      if(index<0||!rows[index]||rows[index].disabled)return;
      active=index;rows.forEach((row,i)=>row.element.classList.toggle('is-active',i===index));trigger.setAttribute('aria-activedescendant',rows[index].element.id);
      if(scroll)rows[index].element.scrollIntoView({block:'nearest'});
    }
    function close(focus=false){
      if(opened===api)opened=null;
      if(menu.matches(':popover-open'))menu.hidePopover();menu.hidden=true;trigger.setAttribute('aria-expanded','false');trigger.removeAttribute('aria-activedescendant');
      if(focus&&!destroyed&&trigger.isConnected&&!trigger.disabled)trigger.focus();
    }
    function position(){
      if(opened!==api)return;
      const anchor=select.closest('.nl-top-control')||trigger,r=anchor.getBoundingClientRect();if(!r.width||!r.height){close();return;}
      const scale=r.width/anchor.offsetWidth||1,spaceBelow=innerHeight-r.bottom-12,spaceAbove=r.top-12;
      menu.style.left='0px';menu.style.top='0px';menu.style.width=r.width/scale+'px';menu.style.maxHeight=Math.max(80,Math.min(320,Math.max(spaceBelow,spaceAbove)/scale))+'px';
      const origin=menu.getBoundingClientRect(),menuScale=origin.width/parseFloat(getComputedStyle(menu).width)||scale,below=spaceBelow>=origin.height||spaceBelow>=spaceAbove;
      const left=Math.max(8,Math.min(r.left,innerWidth-origin.width-8)),top=below?r.bottom+6:Math.max(8,r.top-origin.height-6);
      menu.style.width=r.width/menuScale+'px';menu.style.left=(left-origin.left)/menuScale+'px';menu.style.top=(top-origin.top)/menuScale+'px';
    }
    function open(index=select.selectedIndex){
      if(destroyed||select.matches(':disabled')||trigger.closest('[inert]')||!trigger.getClientRects().length)return;
      opened?.close();appearance();rebuild();opened=api;menu.hidden=false;menu.showPopover();trigger.setAttribute('aria-expanded','true');trigger.focus();position();
      const choices=enabled();focusOption(choices.includes(index)?index:choices[0]);
    }
    function choose(index){
      if(!rows[index]||rows[index].disabled||select.matches(':disabled'))return;
      const changed=select.selectedIndex!==index;select.selectedIndex=index;close(true);
      if(changed){select.dispatchEvent(new Event('input',{bubbles:true}));select.dispatchEvent(new Event('change',{bubbles:true}));}
    }
    function label(){return select.getAttribute('aria-label')||[...(select.getAttribute('aria-labelledby')||'').split(/\s+/)].map(id=>document.getElementById(id)?.textContent||'').join(' ').trim()||field?.querySelector('.field-label')?.textContent||'';}
    function sync(){
      if(destroyed)return;
      const selected=select.selectedOptions[0];text.textContent=selected?.label||'';trigger.title=select.title||text.textContent;trigger.disabled=select.matches(':disabled');
      trigger.setAttribute('aria-label',[label(),text.textContent].filter(Boolean).join(': '));menu.setAttribute('aria-label',label()||text.textContent);
      control.hidden=select.hidden||select.style.display==='none';
      rows.forEach((row,i)=>{row.disabled=row.option.disabled||row.option.parentElement?.disabled||row.option.hidden;row.element.setAttribute('aria-selected',String(i===select.selectedIndex));row.element.setAttribute('aria-disabled',String(!!row.disabled));});
      if(trigger.disabled||control.hidden||!trigger.getClientRects().length)close();
    }
    function rebuild(){
      menu.replaceChildren();let group=null;
      rows=Array.from(select.options,(option,index)=>{
        if(option.parentElement.tagName==='OPTGROUP'&&option.parentElement!==group){group=option.parentElement;const title=node('div','themed-select-group');title.textContent=group.label;title.setAttribute('role','presentation');menu.append(title);}
        const element=node('div','themed-select-option'),name=node('span','themed-select-option-label'),check=node('span','themed-select-check');
        element.id=id+'-option-'+index;element.setAttribute('role','option');element.dataset.value=option.value;element.hidden=option.hidden;name.textContent=option.label;check.setAttribute('aria-hidden','true');element.append(name,check);menu.append(element);
        element.addEventListener('pointermove',()=>{if(opened===api){menu.dataset.inputMode='pointer';focusOption(index,false);}});element.addEventListener('click',event=>{event.preventDefault();choose(index);});
        return{option,element,disabled:false};
      });sync();if(opened===api){position();focusOption(select.selectedIndex);}
    }
    trigger.addEventListener('click',event=>{event.preventDefault();menu.dataset.inputMode='pointer';opened===api?close():open();});
    trigger.addEventListener('keydown',event=>{
      const choices=enabled();if(!choices.length)return;
      if(['ArrowDown','ArrowUp','Home','End','Enter',' '].includes(event.key)||(event.key.length===1&&!event.ctrlKey&&!event.metaKey&&!event.altKey))menu.dataset.inputMode='keyboard';
      if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
        event.preventDefault();if(event.altKey&&event.key==='ArrowUp'){close(true);return;}
        if(event.key==='Home'||event.key==='End'){const index=event.key==='Home'?choices[0]:choices.at(-1);opened===api?focusOption(index):open(index);}
        else if(opened!==api)open();else focusOption(choices[Math.max(0,Math.min(choices.length-1,choices.indexOf(active)+(event.key==='ArrowDown'?1:-1)))]);
      }else if(event.key==='Enter'||event.key===' '){event.preventDefault();opened===api?choose(active):open();}
      else if(event.key==='Tab')close();
      else if(event.key.length===1&&!event.ctrlKey&&!event.metaKey&&!event.altKey){
        const now=performance.now();search=now-searchedAt<700?search+event.key:event.key;searchedAt=now;
        const find=q=>choices.find(index=>rows[index].option.label.trim().toLocaleLowerCase().startsWith(q.toLocaleLowerCase()));let index=find(search);
        if(index===undefined){search=event.key;index=find(search);}if(index!==undefined){event.preventDefault();opened===api?focusOption(index):open(index);}
      }
    });
    control.addEventListener('focusout',event=>{if(opened===api&&!control.contains(event.relatedTarget))close();});
    // Firefox can still move focus on mousedown after a cancelled pointerdown.
    for(const type of ['pointerdown','mousedown'])menu.addEventListener(type,event=>event.preventDefault());
    select.addEventListener('input',sync);select.addEventListener('change',sync);
    for(const key of ['value','selectedIndex']){const descriptor=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,key);descriptors[key]=Object.getOwnPropertyDescriptor(select,key);Object.defineProperty(select,key,{configurable:true,enumerable:descriptor.enumerable,get(){return descriptor.get.call(this);},set(value){descriptor.set.call(this,value);sync();}});}
    const observer=new MutationObserver(()=>{appearance();rebuild();});observer.observe(select,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['disabled','selected','hidden','label','value','aria-label','aria-labelledby','class','style']});
    function destroy(){
      if(destroyed)return;close();destroyed=true;observer.disconnect();controls.delete(select);select.removeEventListener('input',sync);select.removeEventListener('change',sync);
      for(const [key,descriptor]of Object.entries(descriptors))descriptor?Object.defineProperty(select,key,descriptor):delete select[key];
      select.classList.remove('themed-select-native');for(const [key,value]of [['tabindex',original.tabIndex],['aria-hidden',original.aria]])value===null?select.removeAttribute(key):select.setAttribute(key,value);
      if(field)original.labelFor===null?field.removeAttribute('for'):field.setAttribute('for',original.labelFor);
      control.before(select);control.remove();
    }
    const api={control,trigger,menu,close,position,sync,appearance,destroy};controls.set(select,api);rebuild();return api;
  }
  function scan(scope){if(scope.nodeType!==1&&scope!==document)return;const selects=scope.matches?.('select')?[scope]:scope.querySelectorAll('select');for(const select of selects)if(!controls.has(select)&&eligible(select))mount(select);}
  function start(){
    // Both supported browsers provide top-layer popovers. Leave native controls
    // usable on older engines rather than opening clipped or inaccessible menus.
    if(!HTMLElement.prototype.showPopover)return;
    scan(document);
    new MutationObserver(records=>{
      for(const [select,api]of controls)if(!api.control.isConnected||!api.control.contains(select)||select.multiple||select.size>1)api.destroy();
      for(const record of records){
        for(const added of record.addedNodes)scan(added);
        if(record.type==='attributes'&&record.target.tagName==='SELECT')scan(record.target);
        if(record.type==='attributes'&&(record.target===document.documentElement||record.target.tagName==='FIELDSET'))for(const api of controls.values()){api.appearance();api.sync();}
      }
      if(opened&&!opened.trigger.getClientRects().length)opened.close();
    }).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','multiple','size','aria-hidden','disabled','data-theme','lang']});
    document.addEventListener('pointerdown',event=>{if(opened&&!event.composedPath().includes(opened.control))opened.close();},true);
    document.addEventListener('keydown',event=>{if(opened&&event.key==='Escape'){event.preventDefault();event.stopPropagation();opened.close(true);}},true);
    document.addEventListener('scroll',event=>{if(opened&&!opened.menu.contains(event.target))opened.position();},true);
    document.addEventListener('reset',()=>queueMicrotask(()=>{for(const api of controls.values())api.sync();}),true);
    const refreshAppearance=()=>{for(const api of controls.values())api.appearance();opened?.position();};
    addEventListener('resize',refreshAppearance);matchMedia('(prefers-color-scheme:dark)').addEventListener('change',refreshAppearance);
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();
})(globalThis);
