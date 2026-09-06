(() => {
  'use strict';
  const allowed = document.body.dataset.pageType === 'guide';
  const slot = document.querySelector('ins.adsbygoogle');
  if (!allowed || !slot || !/^ca-pub-\d{16}$/.test(slot.dataset.adClient || '')) return;
  // Fail closed if the publisher's certified CMP has not been installed.
  let started = false;
  let attempts = 0;
  function start() {
    if (started) return;
    started = true;
    const script = document.createElement('script');
    script.async = true; script.crossOrigin = 'anonymous';
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + slot.dataset.adClient;
    script.onload = () => { (window.adsbygoogle = window.adsbygoogle || []).push({}); };
    document.head.append(script);
  }
  function connect() {
    if (typeof window.__tcfapi !== 'function') { if (++attempts < 20) setTimeout(connect, 500); return; }
    window.__tcfapi('addEventListener', 2, (data, success) => {
      if (!success || !data || !['tcloaded','useractioncomplete'].includes(data.eventStatus)) return;
      if (data.gdprApplies === false || (data.gdprApplies === true && data.purpose?.consents?.[1] === true && data.vendor?.consents?.[755] === true)) start();
    });
  }
  connect();
})();
