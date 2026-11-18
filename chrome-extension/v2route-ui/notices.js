/* Product navigation is localized. Formal policy prose remains the supplied EN/ZH original. */
(async function(){
  'use strict';
  const language=document.getElementById('notice-ui-language'),policy=document.getElementById('notice-policy-language');
  let prefs=await V2R.prefsGet();
  try{await I18n.load(prefs.language);}catch(_){prefs.language='en';}
  for(const item of I18n.available){const option=document.createElement('option');option.value=item.id;option.textContent=item.label;language.append(option);}
  function translate(){
    I18n.set(prefs.language);document.documentElement.dataset.theme=prefs.theme||'light';
    for(const node of document.querySelectorAll('[data-i18n]'))node.textContent=I18n.t(node.dataset.i18n);
    language.value=I18n.language;language.setAttribute('aria-label',I18n.t('language'));policy.setAttribute('aria-label',I18n.t('noticeBodyLanguages'));
    document.title='Proxy V2Route — '+I18n.t('licenses');V2RFeedback.refresh();
  }
  function showPolicy(){for(const node of document.querySelectorAll('[data-policy-lang]'))node.hidden=node.dataset.policyLang!==policy.value;}
  translate();policy.value=I18n.language.startsWith('zh')?'zh':'en';showPolicy();policy.onchange=showPolicy;
  language.onchange=async()=>{
    if(language.disabled)return;language.disabled=true;const choice=language.value,message=V2RFeedback.begin(language,{key:'notice-language'});
    try{await I18n.load(choice);const latest=await V2R.prefsGet();prefs={...latest,language:choice};await V2R.prefsSet(prefs);translate();}
    catch(error){language.value=I18n.language;message.error(error);}
    finally{language.disabled=false;}
  };
})();
