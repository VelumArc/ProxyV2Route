/* Accessible illustrated select; the native control owns its value. */
(function(root){
  'use strict';
  let sequence=0;
  function typeIcon(value){
    const tile=document.createElement('span'),svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    tile.className='profile-type-icon';tile.setAttribute('aria-hidden','true');
    svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');
    svg.setAttribute('stroke-width','1.8');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');
    const paths={
      node:['M7 5h7a4 4 0 0 1 0 8H9a3 3 0 0 0 0 6h8','M8 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0','M23 19a3 3 0 1 1-6 0 3 3 0 0 1 6 0'],
      manual:['M3 6h5m4 0h9M3 18h9m4 0h5','M12 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0','M16 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0'],
      auto:['M20 4v6h-6M4 20v-6h6','M5 8a8 8 0 0 1 13-3l2 5M4 14l2 5a8 8 0 0 0 13-3'],
      direct:['M4 20 20 4M7 4h13v13'],
      system:['M3 4h18v13H3V4Z','M8 21h8M12 17v4'],
      pac:['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z','M14 2v6h6']
    };
    for(const data of paths[value]||paths.node){
      const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',data);svg.append(path);
    }
    if(value==='pac'){
      const caption=document.createElementNS(svg.namespaceURI,'text');
      caption.setAttribute('x','12');caption.setAttribute('y','17');caption.setAttribute('text-anchor','middle');
      caption.setAttribute('fill','currentColor');caption.setAttribute('stroke','none');
      caption.setAttribute('font-size','6.5');caption.setAttribute('font-weight','750');caption.textContent='PAC';svg.append(caption);
    }
    tile.append(svg);return tile;
  }
  function mount(select,{label,describe,icon,className}={}){
    const field=select.parentElement,id='profile-type-'+(++sequence),control=document.createElement('div'),trigger=document.createElement('button'),text=document.createElement('span'),arrow=document.createElement('span'),menu=document.createElement('div');
    const original={hidden:select.hidden,tabIndex:select.getAttribute('tabindex'),ariaHidden:select.getAttribute('aria-hidden'),labelFor:field.getAttribute('for'),value:Object.getOwnPropertyDescriptor(select,'value')};
    const descriptor=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value');
    let opened=false,destroyed=false,active=-1,rows=[],search='',searchedAt=0;
    const choiceIcon=value=>typeIcon(icon?icon(value):value);
    control.className='profile-type-control'+(className?' '+className:'');trigger.className='profile-type-trigger';trigger.type='button';trigger.id=id;trigger.setAttribute('role','combobox');trigger.setAttribute('aria-haspopup','listbox');trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls',id+'-menu');trigger.setAttribute('aria-autocomplete','none');
    text.className='profile-type-value';arrow.className='profile-type-arrow';arrow.setAttribute('aria-hidden','true');trigger.append(choiceIcon(select.value),text,arrow);
    menu.className='profile-type-menu';menu.id=id+'-menu';menu.hidden=true;menu.setAttribute('role','listbox');menu.setAttribute('aria-label',label||select.getAttribute('aria-label')||'');
    select.before(control);control.append(select,trigger,menu);select.hidden=true;select.tabIndex=-1;select.setAttribute('aria-hidden','true');if(field.tagName==='LABEL')field.htmlFor=id;
    function enabled(){return rows.map((row,index)=>!row.option.disabled?index:-1).filter(index=>index>=0);}
    function focusOption(index){
      if(index<0||!rows[index]||rows[index].option.disabled)return;active=index;
      rows.forEach((row,i)=>row.element.classList.toggle('is-active',i===active));
      trigger.setAttribute('aria-activedescendant',rows[index].element.id);
      rows[index].element.scrollIntoView({block:'nearest'});
    }
    function close(focus=false){
      opened=false;menu.hidden=true;trigger.setAttribute('aria-expanded','false');trigger.removeAttribute('aria-activedescendant');
      document.removeEventListener('pointerdown',outside,true);document.removeEventListener('keydown',escape,true);
      if(focus&&!destroyed&&trigger.isConnected&&!trigger.disabled)trigger.focus();
    }
    function open(index=select.selectedIndex){
      if(destroyed||select.disabled||trigger.closest('[inert]'))return;
      sync();opened=true;menu.hidden=false;trigger.setAttribute('aria-expanded','true');trigger.focus();
      const choices=enabled();focusOption(choices.includes(index)?index:choices[0]);
      document.addEventListener('pointerdown',outside,true);document.addEventListener('keydown',escape,true);
    }
    function choose(index){
      const item=rows[index];if(!item||item.option.disabled||select.disabled)return;
      const changed=select.value!==item.option.value;select.value=item.option.value;close(true);
      if(changed){select.dispatchEvent(new Event('input',{bubbles:true}));select.dispatchEvent(new Event('change',{bubbles:true}));}
    }
    function outside(event){if(!event.composedPath().includes(control))close();}
    function escape(event){if(opened&&event.key==='Escape'){event.preventDefault();event.stopPropagation();close(true);}}
    function sync(){
      if(destroyed)return;
      text.textContent=select.selectedOptions[0]?.textContent||'';trigger.setAttribute('aria-label',(label?label+': ':'')+text.textContent);trigger.disabled=select.disabled;
      trigger.querySelector('.profile-type-icon').replaceWith(choiceIcon(select.value));
      rows.forEach((row,index)=>{row.element.setAttribute('aria-selected',String(index===select.selectedIndex));row.element.setAttribute('aria-disabled',String(row.option.disabled));});
      if(select.disabled)close();
    }
    function rebuild(){
      menu.replaceChildren();rows=Array.from(select.options,(option,index)=>{
        const element=document.createElement('div'),copy=document.createElement('span'),name=document.createElement('span'),description=document.createElement('span'),check=document.createElement('span');
        element.className='profile-type-option';element.id=id+'-option-'+index;element.setAttribute('role','option');element.dataset.value=option.value;
        name.className='profile-type-name';name.id=element.id+'-name';name.textContent=option.textContent;
        description.className='profile-type-description';description.id=element.id+'-description';
        description.textContent=describe?describe(option.value):(['node','manual','auto','pac'].includes(option.value)?root.I18n?.t('typeDescription_'+option.value)||'':'');
        description.hidden=!description.textContent;
        element.setAttribute('aria-labelledby',name.id);if(description.textContent)element.setAttribute('aria-describedby',description.id);
        copy.className='profile-type-copy';copy.append(name,description);
        check.className='profile-type-check';check.setAttribute('aria-hidden','true');element.append(choiceIcon(option.value),copy,check);menu.append(element);
        element.addEventListener('pointermove',()=>{if(opened&&!option.disabled){menu.dataset.inputMode='pointer';focusOption(index);}});
        element.addEventListener('click',event=>{event.preventDefault();choose(index);});return {option,element};
      });sync();if(opened)focusOption(select.selectedIndex);
    }
    trigger.addEventListener('click',event=>{event.preventDefault();menu.dataset.inputMode='pointer';opened?close():open();});
    trigger.addEventListener('keydown',event=>{
      const choices=enabled();if(!choices.length)return;
      if(['ArrowDown','ArrowUp','Home','End','Enter',' '].includes(event.key)||(event.key.length===1&&!event.ctrlKey&&!event.metaKey&&!event.altKey))menu.dataset.inputMode='keyboard';
      if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
        event.preventDefault();if(event.altKey&&event.key==='ArrowUp'){close(true);return;}
        if(event.key==='Home'||event.key==='End'){const index=event.key==='Home'?choices[0]:choices.at(-1);opened?focusOption(index):open(index);}
        else if(!opened)open();
        else{const at=choices.indexOf(active),next=Math.max(0,Math.min(choices.length-1,at+(event.key==='ArrowDown'?1:-1)));focusOption(choices[next]);}
      }else if(event.key==='Enter'||event.key===' '){event.preventDefault();opened?choose(active):open();}
      else if(event.key==='Tab')close();
      else if(event.key.length===1&&!event.ctrlKey&&!event.metaKey&&!event.altKey){
        const now=performance.now();search=now-searchedAt<700?search+event.key:event.key;searchedAt=now;
        const find=query=>choices.find(index=>rows[index].option.textContent.trim().toLocaleLowerCase().startsWith(query.toLocaleLowerCase()));
        let index=find(search);if(index===undefined){search=event.key;index=find(search);}if(index!==undefined){event.preventDefault();opened?focusOption(index):open(index);}
      }
    });
    control.addEventListener('focusout',event=>{if(opened&&!control.contains(event.relatedTarget))close();});
    menu.addEventListener('pointerdown',event=>event.preventDefault());
    // Firefox can still move focus on the compatibility mouse event.
    menu.addEventListener('mousedown',event=>event.preventDefault());
    select.addEventListener('change',sync);select.addEventListener('input',sync);
    Object.defineProperty(select,'value',{configurable:true,enumerable:descriptor.enumerable,get(){return descriptor.get.call(this);},set(value){descriptor.set.call(this,value);sync();}});
    const optionObserver=new MutationObserver(rebuild);optionObserver.observe(select,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['disabled','selected','label']});
    const ownerObserver=new MutationObserver(()=>{if(!control.isConnected)destroy();});ownerObserver.observe(document.documentElement,{childList:true,subtree:true});
    function destroy(){
      if(destroyed)return;close();destroyed=true;optionObserver.disconnect();ownerObserver.disconnect();select.removeEventListener('change',sync);select.removeEventListener('input',sync);
      if(original.value)Object.defineProperty(select,'value',original.value);else delete select.value;
      select.hidden=original.hidden;for(const [key,value]of [['tabindex',original.tabIndex],['aria-hidden',original.ariaHidden]])value===null?select.removeAttribute(key):select.setAttribute(key,value);
      if(field.tagName==='LABEL')original.labelFor===null?field.removeAttribute('for'):field.setAttribute('for',original.labelFor);
      if(control.isConnected){control.before(select);control.remove();}
    }
    rebuild();return Object.freeze({sync,destroy});
  }
  root.V2RProfileTypeSelect=Object.freeze({mount});
})(globalThis);
