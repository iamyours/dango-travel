// How to add a new language (e.g. Japanese):
// 1. Add 'ja' to SUPPORTED, LABELS ({ ja: '日' }), and HTML_LANG ({ ja: 'ja' }).
// 2. Copy en.js to ja.js and translate dictionary values.
// 3. Add <script src="assets/i18n/ja.js"></script> next to the other dictionaries.
(function() {
  'use strict';

  var SUPPORTED = ['zh', 'en'];   // add 'ja' here and ship a ja.js dictionary to add Japanese
  var DEFAULT_LANG = 'zh';        // source language; HTML is authored in Chinese
  var FALLBACK_LANG = 'zh';       // used when a key is missing in the active language
  var STORAGE_KEY = 'site-lang';  // shared by every page on the origin
  var HTML_LANG = { zh: 'zh-CN', en: 'en', ja: 'ja' };
  var LABELS = { zh: '中', en: 'EN', ja: '日' };

  var dicts = {}, switchers = [];

  function isSupported(l) { return typeof l === 'string' && SUPPORTED.indexOf(l) !== -1; }
  function getStorage(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function setStorage(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  function detectLang() {
    try {
      var m = (location.search || '').match(/[?&]lang=([^&#]+)/i);
      if (m && isSupported(m = decodeURIComponent(m[1]).toLowerCase())) {
        setStorage(STORAGE_KEY, m); return m;
      }
    } catch (e) {}
    var s = getStorage(STORAGE_KEY);
    if (s && isSupported(s)) return s;
    var nav = '';
    try { nav = (navigator.languages && navigator.languages[0]) || navigator.language || ''; } catch (e) {}
    nav = nav.toLowerCase();
    if (nav.indexOf('zh') === 0) return 'zh';
    return isSupported(nav.slice(0, 2)) ? nav.slice(0, 2) : (isSupported('en') ? 'en' : DEFAULT_LANG);
  }

  function updateHtmlTag(l) {
    if (document.documentElement) {
      document.documentElement.lang = HTML_LANG[l] || l;
      document.documentElement.setAttribute('data-lang', l);
    }
  }

  var currentLang = detectLang();
  updateHtmlTag(currentLang);

  function hasKey(k, l) {
    var d = dicts[l || currentLang];
    return Boolean(d && Object.prototype.hasOwnProperty.call(d, k) && d[k] !== undefined);
  }
  function hasTranslation(k) { return hasKey(k, currentLang) || hasKey(k, FALLBACK_LANG); }

  function interpolate(str, vars) {
    if (typeof str !== 'string' || !vars || typeof vars !== 'object') return str;
    return str.replace(/\{([^{}]+)\}/g, function(match, name) {
      if (Object.prototype.hasOwnProperty.call(vars, name) && vars[name] !== undefined) {
        var v = vars[name];
        if (v !== null && typeof v === 'object' && typeof v.k === 'string') return I18N.t(v.k, v.v);
        return String(v);
      }
      return match;
    });
  }

  function t(key, vars) {
    var val = hasKey(key, currentLang) ? dicts[currentLang][key]
            : hasKey(key, FALLBACK_LANG) ? dicts[FALLBACK_LANG][key] : key;
    if (val === key && !hasTranslation(key)) return key;
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      var isOne = Boolean(vars && Number(vars.n) === 1);
      val = isOne ? (val.one !== undefined ? val.one : val.other)
                  : (val.other !== undefined ? val.other : val.one);
      if (val === undefined) return key;
    }
    if (Array.isArray(val)) {
      return val.map(function(item) { return typeof item === 'string' ? interpolate(item, vars) : item; });
    }
    return typeof val === 'string' ? interpolate(val, vars) : val;
  }

  function refreshSwitchers() {
    for (var i = 0; i < switchers.length; i++) {
      var spans = switchers[i].querySelectorAll('span[data-l]');
      for (var j = 0; j < spans.length; j++) spans[j].classList.toggle('on', spans[j].getAttribute('data-l') === currentLang);
    }
  }

  function apply(root) {
    var base = root || document;
    if (!base) return;
    var list = [];
    if (base.nodeType === 1 && (base.hasAttribute('data-i18n') || base.hasAttribute('data-i18n-html') || base.hasAttribute('data-i18n-attr'))) list.push(base);
    if (base.querySelectorAll) {
      var nodes = base.querySelectorAll('[data-i18n],[data-i18n-html],[data-i18n-attr]');
      for (var i = 0; i < nodes.length; i++) list.push(nodes[i]);
    }
    for (var i = 0; i < list.length; i++) {
      var el = list[i], k = el.getAttribute('data-i18n'), kh = el.getAttribute('data-i18n-html'), raw = el.getAttribute('data-i18n-attr');
      if (k && hasTranslation(k)) el.textContent = t(k);
      else if (kh && hasTranslation(kh)) el.innerHTML = t(kh);
      if (raw) {
        var pairs = raw.split(';');
        for (var j = 0; j < pairs.length; j++) {
          var p = pairs[j].trim(), colon = p.indexOf(':');
          if (colon > 0) {
            var attr = p.slice(0, colon).trim(), ak = p.slice(colon + 1).trim();
            if (attr && ak && hasTranslation(ak)) el.setAttribute(attr, t(ak));
          }
        }
      }
    }
    refreshSwitchers();
  }

  function switchLang(lang, persist) {
    if (!isSupported(lang) || lang === currentLang) return;
    currentLang = lang;
    I18N.lang = currentLang;
    I18N.locale = HTML_LANG[currentLang] || currentLang;
    if (persist) setStorage(STORAGE_KEY, currentLang);
    updateHtmlTag(currentLang);
    apply(document);
    try { window.dispatchEvent(new CustomEvent('i18n:change', { detail: { lang: currentLang } })); } catch (e) {}
  }

  function injectStyle() {
    if (typeof document === 'undefined' || document.getElementById('i18n-style')) return;
    var head = document.head || document.getElementsByTagName('head')[0] || document.documentElement;
    if (!head) return;
    var s = document.createElement('style');
    s.id = 'i18n-style';
    s.textContent =
      '.i18n-switch{display:inline-flex;align-items:center;gap:2px;white-space:nowrap;cursor:pointer;font:inherit;line-height:1.2}' +
      '.i18n-switch span{opacity:.5;font-weight:600}.i18n-switch span.on{opacity:1;font-weight:800}.i18n-switch .i18n-sep{opacity:.35;font-weight:400}';
    head.appendChild(s);
  }

  var I18N = {
    SUPPORTED: SUPPORTED,
    STORAGE_KEY: STORAGE_KEY,
    lang: currentLang,
    locale: HTML_LANG[currentLang] || currentLang,
    add: function(lang, dict) {
      if (!dicts[lang]) dicts[lang] = {};
      if (dict && typeof dict === 'object') Object.assign(dicts[lang], dict);
    },
    has: function(key, lang) { return hasKey(key, lang); },
    t: t,
    pick: function(obj, field) {
      if (!obj) return undefined;
      var val = obj[field + '_' + currentLang];
      return (typeof val === 'string' && val.length > 0) ? val : obj[field];
    },
    apply: apply,
    setLang: function(lang) { switchLang(lang, true); },
    onChange: function(fn) { window.addEventListener('i18n:change', function(e) { fn(e.detail.lang); }); },
    next: function() {
      var idx = SUPPORTED.indexOf(currentLang);
      return SUPPORTED[(idx + 1) % SUPPORTED.length];
    },
    switcher: function(opts) {
      injectStyle();
      var btn = document.createElement('button');
      btn.type = 'button';
      var extra = (opts && opts.className && opts.className.trim()) ? ' ' + opts.className.trim() : '';
      btn.className = 'i18n-switch' + extra;
      btn.setAttribute('aria-label', '切换语言 / Switch language');
      btn.setAttribute('title', '切换语言 / Switch language');
      btn.innerHTML = SUPPORTED.map(function(l, i) {
        var label = LABELS[l] || l.toUpperCase(), cls = l === currentLang ? ' class="on"' : '';
        return (i > 0 ? '<span class="i18n-sep">/</span>' : '') + '<span data-l="' + l + '"' + cls + '>' + label + '</span>';
      }).join('');
      btn.addEventListener('click', function() { I18N.setLang(I18N.next()); });
      switchers.push(btn);
      return btn;
    },
    mountSwitchers: function() {
      var targets = document.querySelectorAll('[data-i18n-switch]');
      for (var i = 0; i < targets.length; i++) {
        if (!targets[i].querySelector('.i18n-switch')) {
          targets[i].appendChild(I18N.switcher({ className: targets[i].getAttribute('data-i18n-switch') || '' }));
        }
      }
    }
  };

  window.addEventListener('storage', function(e) {
    if (e.key === STORAGE_KEY && e.newValue && isSupported(e.newValue) && e.newValue !== currentLang) {
      switchLang(e.newValue, false);
    }
  });

  window.I18N = I18N;
  injectStyle();

  function onReady() { apply(document); I18N.mountSwitchers(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', onReady);
  else onReady();
})();
