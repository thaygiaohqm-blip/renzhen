/* Đọc tiếng Trung dùng chung cho cả web: chọn giọng tự nhiên nhất của thiết bị, ngắt câu theo dấu câu,
   lên giọng ở câu hỏi/cảm thán, bấm lần nữa để dừng. */
(function () {
  "use strict";
  const ok = "speechSynthesis" in window;
  const GOOD = [
    [/natural|neural/i, 60], [/online/i, 20],
    [/xiaoxiao|xiaoyi|yunxi|yunjian|yunyang|yunxia|xiaobei|xiaoni|hiugaai|hsiaochen|hsiaoyu|yunjhe/i, 40],
    [/premium|enhanced|siri|ting-?ting|mei-?jia|sin-?ji|lili/i, 25],
    [/google/i, 18], [/microsoft/i, 8]
  ];
  let voice = null, voiceKey = "";
  function score(v) {
    let s = 0;
    if (/^zh[-_]CN$/i.test(v.lang) || /^cmn/i.test(v.lang)) s += 30; else if (/^zh[-_](TW|HK)/i.test(v.lang)) s += 10; else if (/^zh/i.test(v.lang)) s += 15; else return -1;
    for (const [re, w] of GOOD) if (re.test(v.name)) s += w;
    if (/compact|espeak|robot/i.test(v.name)) s -= 40;
    return s;
  }
  function pick() {
    if (!ok) return;
    const vs = speechSynthesis.getVoices().map(v => [v, score(v)]).filter(x => x[1] >= 0).sort((a, b) => b[1] - a[1]);
    voice = vs.length ? vs[0][0] : null;
  }
  if (ok) { pick(); speechSynthesis.addEventListener ? speechSynthesis.addEventListener("voiceschanged", pick) : (speechSynthesis.onvoiceschanged = pick); }
  const clean = t => String(t || "").replace(/\[[^\]]*\]/g, "").replace(/[{}]/g, "").replace(/\s+/g, " ").trim();
  function chunks(t) {
    const out = []; const re = /[^，。！？；：、,.!?;:…\n]+[，。！？；：、,.!?;:…]*/g; let m;
    while ((m = re.exec(t))) { const s = m[0].trim(); if (s) out.push(s); }
    return out.length ? out : [t];
  }
  let cur = null, gen = 0;
  function stop() { gen++; cur = null; if (ok) speechSynthesis.cancel(); document.querySelectorAll("[data-say].is-playing").forEach(b => b.classList.remove("is-playing")); }
  function speak(text, opt) {
    opt = opt || {};
    const t = clean(text);
    if (!ok) { if (opt.onend) opt.onend(); return false; }
    if (!t) return false;
    if (cur === t && !opt.noToggle) { stop(); if (opt.onend) opt.onend(); return false; }
    stop(); const my = gen; cur = t; if (!voice) pick();
    const parts = chunks(t), rate = (opt.rate || .92);
    const btn = opt.btn; if (btn) btn.classList.add("is-playing");
    const fin = () => { if (my !== gen) return; cur = null; if (btn) btn.classList.remove("is-playing"); if (opt.onend) opt.onend(); };
    let i = 0;
    const next = () => {
      if (my !== gen) return;
      if (i >= parts.length) return fin();
      const p = parts[i++], u = new SpeechSynthesisUtterance(p);
      u.lang = "zh-CN"; if (voice) u.voice = voice;
      const q = /[？?]$/.test(p), ex = /[！!]$/.test(p), cm = /[，,、；;：:]$/.test(p);
      u.rate = rate * (cm ? 1.02 : .97); u.pitch = q ? 1.12 : ex ? 1.08 : cm ? 1.02 : .98; u.volume = 1;
      u.onend = () => { if (my === gen) setTimeout(next, cm ? 90 : /[。.]$/.test(p) ? 200 : 40); };
      u.onerror = e => { if (my !== gen) return; if (e && (e.error === "canceled" || e.error === "interrupted")) return; fin(); };
      speechSynthesis.speak(u);
    };
    next(); return true;
  }
  window.RZTTS = { speak, stop, ok, voice: () => voice };
  window.addEventListener("pagehide", stop);
})();
