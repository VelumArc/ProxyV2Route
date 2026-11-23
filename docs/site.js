/* Local-only language preference; no libraries, requests or analytics. */
(() => {
  'use strict';
  const preferenceKey = 'v2route-site-language';
  const languages = new Set(['zh', 'en']);
  const requested = new URLSearchParams(location.search).get('lang');
  const languageSwitch = document.querySelector('.language-switch');
  const languageLinks = document.querySelectorAll('a[data-preserve-language]');

  function setLinkLanguage(language) {
    for (const link of languageLinks) {
      const target = new URL(link.href);
      target.searchParams.set('lang', language);
      link.href = target.href;
    }
  }

  if (!languageSwitch) {
    if (languages.has(requested)) setLinkLanguage(requested);
    return;
  }

  const translations = [...document.querySelectorAll('[data-en]')].map(element => ({
    element, zh: [...element.childNodes].map(node => node.cloneNode(true)), en: element.dataset.en
  }));
  const attributes = ['label', 'alt', 'src', 'href'].flatMap(name =>
    [...document.querySelectorAll(`[data-en-${name}]`)].map(element => ({
      element, name: name === 'label' ? 'aria-label' : name,
      zh: element.getAttribute(name === 'label' ? 'aria-label' : name),
      en: element.getAttribute(`data-en-${name}`)
    }))
  );
  const title = { zh: document.title, en: 'Independent browser routes · Proxy V2Route' };
  const description = document.querySelector('meta[name="description"]');
  const descriptions = {
    zh: description.content,
    en: 'Proxy V2Route: independent browser proxy routes, profiles, nodes, subscriptions and connection diagnostics in one workspace.'
  };
  const buttons = [...languageSwitch.querySelectorAll('[data-language]')];
  function applyLanguage(language, userInitiated = false) {
    if (!languages.has(language)) language = 'zh';
    translations.forEach(item => {
      if (language === 'zh') item.element.replaceChildren(...item.zh.map(node => node.cloneNode(true)));
      else item.element.textContent = item.en;
    });
    attributes.forEach(item => { item.element.setAttribute(item.name, item[language]); });
    setLinkLanguage(language);
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
    document.title = title[language];
    description.content = descriptions[language];
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.language === language)));
    if (userInitiated) {
      try { localStorage.setItem(preferenceKey, language); } catch { /* Reading remains available with storage disabled. */ }
      const url = new URL(location.href);
      url.searchParams.set('lang', language);
      try { history.replaceState(null, '', url); } catch { /* Local previews can restrict history changes. */ }
      document.getElementById('language-status').textContent = language === 'zh' ? '已切换至中文。' : 'Language changed to English.';
    }
  }
  let saved;
  try { saved = localStorage.getItem(preferenceKey); } catch { /* Optional preference only. */ }
  applyLanguage(languages.has(requested) ? requested : languages.has(saved) ? saved : 'zh');
  buttons.forEach(button => button.addEventListener('click', () => applyLanguage(button.dataset.language, true)));
  languageSwitch.hidden = false;

  const preview = document.querySelector('.image-preview');
  if (typeof preview?.showModal === 'function') {
    const link = document.querySelector('.screenshot-link');
    const image = new Image();
    preview.append(image);
    link.setAttribute('aria-haspopup', 'dialog');
    link.addEventListener('click', event => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      image.src = link.href;
      image.alt = link.querySelector('img').alt;
      preview.showModal();
    });
    // Older browsers support modal dialogs but lack native backdrop dismissal.
    if (!('closedBy' in preview)) {
      let pressedBackdrop = false;
      preview.addEventListener('pointerdown', event => { pressedBackdrop = event.target === preview; });
      preview.addEventListener('click', event => {
        if (pressedBackdrop && event.target === preview) preview.close();
      });
    }
    preview.addEventListener('close', () => link.focus({ preventScroll: true }));
  }
})();
