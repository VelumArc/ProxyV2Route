/* Explicit, local action feedback. Controllers belong to an operation, never a last click. */
(function(root){
  'use strict';
  const records=new Map();let sequence=0;
  const text=value=>value?.key?I18n.t(value.key):value?.error?V2R.errorText(value.error):typeof value==='function'?value():String(value||'');
  function begin(anchor,{key,className='',position='after'}={}){
    const id=key||++sequence;records.get(id)?.clear();
    const node=document.createElement('span');node.className='action-feedback'+(className?' '+className:'');node.hidden=true;node.setAttribute('role','status');node.setAttribute('aria-live','polite');node.setAttribute('aria-atomic','true');
    let value=null,timer=null,closed=false;
    const controller={
      refresh(){
        if(closed||value===null)return;
        const source=typeof anchor==='function'?anchor():anchor;
        const target=source?.matches('select')?source.closest('.themed-select')||source:source;
        if(!target?.isConnected){node.remove();return;}
        if(position==='before'){if(node.nextSibling!==target)target.before(node);}else if(node.previousSibling!==target)target.after(node);
        const label=text(value);if(node.textContent!==label)node.textContent=label;node.hidden=!label;
        const detail=value?.error?.details;node.title=typeof detail==='string'?detail:'';
      },
      show(next,kind='success',duration=kind==='success'?1000:0){
        if(closed)return;clearTimeout(timer);value=next;node.dataset.kind=kind;controller.refresh();
        if(duration>0)timer=setTimeout(()=>controller.clear(),duration);return controller;
      },
      success(key='saved'){return controller.show({key});},
      error(error){return controller.show({error},'error');},
      clear(){if(closed)return;closed=true;clearTimeout(timer);node.remove();if(records.get(id)===controller)records.delete(id);}
    };
    records.set(id,controller);return controller;
  }
  const refresh=()=>{for(const controller of records.values())controller.refresh();};
  const clear=()=>{for(const controller of [...records.values()])controller.clear();};
  root.V2RFeedback=Object.freeze({begin,refresh,clear});
  addEventListener('pagehide',clear,{once:true});
  addEventListener('hashchange',clear);
})(globalThis);
