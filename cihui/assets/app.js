/* Super Cihui — từ vựng HSK 3.0. Ứng dụng một trang, không cần build. Dữ liệu nằm trong data/*.js */
(() => {
  "use strict";
  const C = window.MD_CATALOG;
  const main = document.getElementById("main");
  const LV = {};          // dữ liệu từng cấp đã tải
  const waiting = {};

  /* ------------------------------------------------------------ dữ liệu */
  window.MD = {
    register(d) {
      d.topics.forEach(t => t.items.forEach(e => { e.lv = e.lv || d.level; e.t = t.id; if (!e.vi && e.en) { e.vi = e.en; e.enOnly = true; } }));
      LV[d.level] = d;
      (waiting[d.level] || []).forEach(f => f.ok(d));
      delete waiting[d.level];
    },
    registerBooks(d) {   // data/giaotrinh.js: thứ tự từ theo giáo trình
      LV.giaotrinh = d;
      (waiting.giaotrinh || []).forEach(f => f.ok(d));
      delete waiting.giaotrinh;
    }
  };
  function load(lv) {
    if (LV[lv]) return Promise.resolve(LV[lv]);
    return new Promise((ok, no) => {
      const first = !waiting[lv];
      (waiting[lv] = waiting[lv] || []).push({ ok, no });
      if (!first) return;
      const s = document.createElement("script");
      s.src = `data/${lv}.js`;
      s.onerror = () => { (waiting[lv] || []).forEach(f => f.no(new Error(lv))); delete waiting[lv]; };
      document.head.appendChild(s);
    });
  }
  const readyLevels = () => C.levels.filter(l => l.ready).map(l => l.id);
  const loadAll = () => Promise.all(readyLevels().map(load));
  const allItems = () => readyLevels().flatMap(lv => LV[lv] ? LV[lv].topics.flatMap(t => t.items) : []);
  const levelOf = id => C.levels.find(l => l.id === id);

  /* ------------------------------------------------------------ lưu trữ */
  const store = {
    get(k, d) { try { const v = localStorage.getItem("rz:cihui:" + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("rz:cihui:" + k, JSON.stringify(v)); } catch (e) { /* bỏ qua */ } }
  };
  const S = Object.assign({ kanji: true, romaji: false, furi: true, quizDir: "jv" }, store.get("settings", {})); S.romaji = false; /* chỉ giữ pinyin trên chữ */
  const P = Object.assign({ ok: {}, rv: {}, gt: {}, clr: 0 }, store.get("progress", {}));
  try { const th = localStorage.getItem("renzhen:theme"); if (th) S.theme = th; } catch (e) { /* bỏ qua */ }     // màu giao diện dùng chung cả Super Renzhen
  const saveS = () => { store.set("settings", S); try { if (S.theme) localStorage.setItem("renzhen:theme", S.theme); } catch (e) { /* bỏ qua */ } };
  // Mọi thay đổi tiến độ đều báo cho module tài khoản (assets/auth.js) để đồng bộ khi đã đăng nhập.
  const listeners = [];
  const notify = () => listeners.forEach(f => { try { f(); } catch (e) { console.error(e); } });
  const saveP = () => { store.set("progress", P); paintReviewBadge(); notify(); };
  const nowSec = () => Math.floor(Date.now() / 1000);   // dấu thời gian (giây) để gộp tiến độ giữa các thiết bị
  function mark(id, st) {
    if (st === "ok") { P.ok[id] = nowSec(); delete P.rv[id]; }
    if (st === "rv") { P.rv[id] = nowSec(); delete P.ok[id]; }
    saveP();
  }
  const stateOf = id => P.rv[id] ? "rv" : P.ok[id] ? "ok" : "";

  /* ------------------------------------------------------------ tiếng Trung */
  const KJ = "\\u3400-\\u4dbf\\u4e00-\\u9fff\\uf900-\\ufaff々〆ヶヵ";
  const TOK = new RegExp(`(\\{)|(\\})|([${KJ}]+)\\[([^\\]]+)\\]|( )|([^{}])`, "g");
  const RUBY = new RegExp(`([${KJ}]+)\\[([^\\]]+)\\]`, "g");
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function jp(m, o = {}) {
    if (!m) return "";
    const kanji = o.kanji ?? S.kanji;
    let out = "", hidden = false;
    for (const x of m.matchAll(TOK)) {
      if (x[1]) { if (o.blank) { hidden = true; out += '<span class="blank" aria-label="chỗ trống">＿</span>'; } else if (o.hl !== false) out += '<mark class="hw">'; continue; }
      if (x[2]) { if (hidden) hidden = false; else if (!o.blank && o.hl !== false) out += "</mark>"; continue; }
      if (hidden) continue;
      if (x[3]) out += kanji ? ((o.furi ?? S.furi) ? `<ruby>${x[3]}<rt>${x[4]}</rt></ruby>` : x[3]) : esc(x[4]) + " ";
      else if (x[5]) out += kanji ? "" : '';
      else out += esc(x[6]);
    }
    return out;
  }
  const kana = m => (m || "").replace(RUBY, "$2").replace(/[{} ]/g, "");
  const surf = m => (m || "").replace(RUBY, "$1").replace(/[{} ]/g, "");
  const hira = s => s;
  const TONES = { a: "āáǎà", e: "ēéěè", i: "īíǐì", o: "ōóǒò", u: "ūúǔù", v: "ǖǘǚǜ" };
  const STRIP = { ā:"a",á:"a",ǎ:"a",à:"a",ē:"e",é:"e",ě:"e",è:"e",ī:"i",í:"i",ǐ:"i",ì:"i",ō:"o",ó:"o",ǒ:"o",ò:"o",ū:"u",ú:"u",ǔ:"u",ù:"u",ǖ:"v",ǘ:"v",ǚ:"v",ǜ:"v",ü:"v" };
  const plain = t => (t || "").toLowerCase().replace(/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]/g, c => STRIP[c]).replace(/[1-5]/g, "").replace(/[\s'’·\-,.，。]/g, "");
  const romaji = k => plain(k);
  const norm = s => (s || "").trim().toLowerCase().replace(/[\s・。、.,，'’\-·]/g, "");
  /* Chấm đáp án: chữ Hán (kể cả dạng khác của từ), pinyin có dấu, pinyin số (xue2xi2) hoặc không dấu. */
  function checkAnswer(input, e) {
    const a = norm(input);
    if (!a) return false;
    const forms = [surf(e.w), ...(e.alt || [])].map(norm);
    if (forms.includes(a)) return true;
    if (/[\u3400-\u9fff]/.test(a)) return false;
    return plain(a) === plain(kana(e.w)) || plain(a) === plain(e.rm || "");
  }

  /* ------------------------------------------------------------ giọng đọc */
  let zhVoice = null, voicesChecked = false;
  function pickVoice() {
    if (!("speechSynthesis" in window)) return;
    const vs = speechSynthesis.getVoices();
    if (vs.length) voicesChecked = true;
    zhVoice = vs.find(v => /^zh[-_]CN/i.test(v.lang) && /google|xiaoxiao|yunxi|ting-ting|tingting|huihui/i.test(v.name)) || vs.find(v => /^zh[-_]CN/i.test(v.lang)) || vs.find(v => /^zh/i.test(v.lang)) || null;
  }
  if ("speechSynthesis" in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
  function speak(text) {
    if (!("speechSynthesis" in window)) return toast("Trình duyệt này chưa hỗ trợ đọc thành tiếng.");
    if (voicesChecked && !zhVoice) toast("Thiết bị chưa có giọng đọc tiếng Trung. Hãy cài thêm giọng zh-CN trong phần cài đặt ngôn ngữ.");
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "zh-CN"; if (zhVoice) u.voice = zhVoice; u.rate = 0.85;
    speechSynthesis.speak(u);
  }
  const ICON_SPEAK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/><path d="M19 6a8.5 8.5 0 0 1 0 12"/></svg>';
  const ICON_FLIP = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 21v-5h5"/></svg>';

  /* ------------------------------------------------------------ hiệu ứng đúng / sai */
  const calm = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function celebrate(el, big) {
    if (!el) return;
    el.animate([{ transform: "scale(1)" }, { transform: "scale(1.045)" }, { transform: "scale(1)" }], { duration: 380, easing: "cubic-bezier(.3,1.6,.5,1)" });
    if (calm()) return;
    const r = el.getBoundingClientRect(), cs = getComputedStyle(document.documentElement);
    const cols = ["--mint", "--coral", "--green", "--mint"].map(v => cs.getPropertyValue(v).trim() || "#27c4b5");
    const n = big ? 46 : 16, x0 = r.left + r.width / 2, y0 = r.top + r.height / 2;
    for (let i = 0; i < n; i++) {
      const d = document.createElement("i");
      d.className = "confetto";
      d.style.cssText = `left:${x0}px;top:${y0}px;background:${cols[i % cols.length]};${i % 3 ? "" : "border-radius:50%;"}`;
      document.body.appendChild(d);
      const ang = Math.random() * Math.PI * 2, dist = (big ? 140 : 70) + Math.random() * (big ? 160 : 60);
      const dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist * .7 - (big ? 60 : 30);
      d.animate([
        { transform: "translate(-50%,-50%) rotate(0) scale(1)", opacity: 1 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${Math.random() * 540 - 270}deg) scale(.9)`, opacity: 1, offset: .6 },
        { transform: `translate(calc(-50% + ${dx * 1.1}px), calc(-50% + ${dy + 70}px)) rotate(${Math.random() * 720}deg) scale(.6)`, opacity: 0 }
      ], { duration: 750 + Math.random() * 450, easing: "cubic-bezier(.2,.7,.4,1)" }).onfinish = () => d.remove();
    }
  }
  function wobble(el) {
    if (!el) return;
    if (calm()) { el.animate([{ opacity: 1 }, { opacity: .55 }, { opacity: 1 }], { duration: 300 }); return; }
    el.animate([{ transform: "translateX(0)" }, { transform: "translateX(-9px)" }, { transform: "translateX(8px)" }, { transform: "translateX(-6px)" }, { transform: "translateX(4px)" }, { transform: "translateX(0)" }], { duration: 420, easing: "ease-out" });
  }
  function verdict(el, ok) {
    if (!el) return;
    el.classList.remove("pop");
    void el.offsetWidth;
    el.classList.add("pop");
  }
  function glow(el, ok) {
    if (!el || calm()) return;
    const c = getComputedStyle(document.documentElement).getPropertyValue(ok ? "--mint" : "--coral").trim();
    el.animate(ok ? [{ boxShadow: `0 0 0 0 ${c}99` }, { boxShadow: `0 0 0 16px ${c}00` }]
                  : [{ boxShadow: `inset 0 0 0 2px ${c}` }, { boxShadow: `inset 0 0 0 0 ${c}00` }], { duration: ok ? 700 : 600, easing: "ease-out" });
  }
  const buzz = () => { try { if (navigator.vibrate) navigator.vibrate(45); } catch (e) { /* bỏ qua */ } };
  const PRAISE = [["Chính xác!", "正确"], ["Tuyệt vời!", "太棒了"], ["Giỏi lắm!", "真棒"], ["Chuẩn rồi!", "完美"], ["Đúng rồi!", "答对了"]];
  const OOPS = [["Chưa đúng", "不对"], ["Suýt nữa rồi", "差一点"], ["Chưa chính xác", "再试试"]];
  const pickWord = ok => { const l = ok ? PRAISE : OOPS; return l[Math.floor(Math.random() * l.length)]; };
  const ICON_OK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  const ICON_NO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M7 7l10 10"/><path d="M17 7L7 17"/></svg>';
  function verdictHTML(ok, word, ans, streak) {
    const [vi, ja] = word || (ok ? PRAISE[0] : OOPS[0]);
    return `<span class="verdict verdict--${ok ? "ok" : "no"}"><span class="verdict__icon">${ok ? ICON_OK : ICON_NO}</span>
      <span class="verdict__word">${vi}<span class="verdict__ja" lang="zh">${ja}${ok ? "！" : "…"}</span></span>${ok && streak >= 3 ? `<span class="streak">${streak} câu đúng liên tiếp</span>` : ""}</span>${ans ? `<div class="verdict__ans">${ans}</div>` : ""}`;
  }
  function scoreRing(right, total) {
    const c = 2 * Math.PI * 52, pct = total ? right / total : 0;
    return `<svg class="score-ring" viewBox="0 0 120 120" role="img" aria-label="Đúng ${Math.round(pct * 100)} phần trăm"><circle class="bg" cx="60" cy="60" r="52"/>
      <circle class="fg" cx="60" cy="60" r="52" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${c.toFixed(1)}" data-off="${(c * (1 - pct)).toFixed(1)}"/>
      <text x="60" y="69" text-anchor="middle">${Math.round(pct * 100)}%</text></svg>`;
  }
  function doneHTML(title, right, total, note, buttons) {
    const pct = total ? right / total : 0;
    const msg = pct >= .9 ? "Xuất sắc! Bạn nắm rất chắc gói này." : pct >= .7 ? "Rất tốt. Ôn lại vài từ sai là trọn vẹn." : pct >= .5 ? "Khá ổn. Hãy luyện lại các câu sai nhé." : "Cần ôn thêm. Thử học thẻ trước rồi quay lại.";
    return `<div class="card"><div class="done">${scoreRing(right, total)}<h3>${title}</h3><p class="done__msg">${msg}</p><p>${note}</p>
      <div class="hero__actions">${buttons}</div></div></div>`;
  }
  function afterDone(root, right, total) {
    const fg = root.querySelector(".score-ring .fg");
    if (fg) requestAnimationFrame(() => requestAnimationFrame(() => { fg.style.strokeDashoffset = fg.dataset.off; }));
    if (total && right / total >= .7) setTimeout(() => celebrate(root.querySelector(".score-ring"), true), 650);
  }

  /* ------------------------------------------------------------ tiện ích */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const fmt = n => n.toLocaleString("vi-VN");
  const shuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const posName = p => p.split(",").map(x => C.posName[x] || x).join(", ");
  const meaningOf = e => e.c ? e.cv : e.vi;
  let toastTimer;
  function toast(msg) {
    const t = $(".toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
  }
  function paintReviewBadge() {
    const n = Object.keys(P.rv).length;
    $$("[data-review-count]").forEach(b => { b.hidden = !n; b.textContent = n; });
  }
  const learnedIn = items => items.reduce((s, e) => s + (P.ok[e.id] ? 1 : 0), 0);
  const meter = (a, b) => `<div class="meter" role="img" aria-label="Đã học ${a} trên ${b}"><i style="width:${b ? Math.round(a / b * 100) : 0}%"></i></div>`;
  const lvtag = lv => `<span class="lvtag" data-lv="${lv}">${(levelOf(lv) || { name: lv.toUpperCase() }).name.replace("HSK ", "H")}</span>`;
  function band({ crumb, crumbHref, big, bigJp, title, text, meta, extra, compact }) {
    return `<section class="band${compact ? " band--compact" : ""}"><div class="wrap band__in">
      <div class="band__big${bigJp ? " jp" : ""}" ${bigJp ? 'lang="zh"' : ""}>${big}</div>
      <div>${crumb ? `<a class="crumb" href="${crumbHref}"><span aria-hidden="true">←</span> ${esc(crumb)}</a>` : ""}
        <h1>${title}</h1>${text ? `<p>${text}</p>` : ""}${extra || ""}</div>
      ${meta ? `<div class="band__meta">${meta}</div>` : ""}
    </div></section>`;
  }

  /* ------------------------------------------------------------ điều hướng */
  let current = null;   // màn học đang mở
  function setNav(key) {
    $$("[data-nav]").forEach(a => { if (a.dataset.nav === key) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
  }
  async function route() {
    if (current && current.destroy) current.destroy();
    current = null;
    const h = location.hash.replace(/^#\/?/, "");
    const [path, qs] = h.split("?");
    const parts = path.split("/").filter(Boolean);
    const q = new URLSearchParams(qs || "");
    window.scrollTo(0, 0);
    try {
      if (!parts.length || parts[0] === "top") { setNav("hsk"); return await home(); }
      if (/^h[1-7]$/.test(parts[0])) { setNav("hsk"); return parts[1] ? await topicStudy(parts[0], parts[1]) : await level(parts[0]); }
      if (parts[0] === "tu-loai") { setNav("pos"); return parts[1] ? (parts[2] === "hoc" ? await posStudy(parts[1], q) : await posDetail(parts[1], q)) : await posList(); }
      if (parts[0] === "on-tap") { setNav("rev"); return parts[1] === "hoc" ? await reviewStudy() : await review(); }
      if (parts[0] === "test") { setNav("test"); return await placement(); }
      notFound();
    } catch (err) {
      console.error(err);
      main.innerHTML = `<div class="wrap sec"><div class="empty"><h3>Không tải được dữ liệu</h3><p>Hãy mở trang qua một máy chủ web (ví dụ Vercel) hoặc kiểm tra thư mục data/ có đủ file.</p><a class="btn btn--primary" href="#/">Về trang chủ</a></div></div>`;
    }
  }
  function notFound() {
    setNav("");
    main.innerHTML = `<div class="wrap sec"><div class="empty"><h3>Không có trang này</h3><p>Đường dẫn có thể đã thay đổi. Hãy chọn lại cấp độ để tiếp tục học.</p><a class="btn btn--primary" href="#/">Chọn cấp độ</a></div></div>`;
  }

  /* ------------------------------------------------------------ trang chủ */
  async function home() {
    await loadAll();
    const steps = C.levels.map((l, i) => {
      const items = LV[l.id] ? LV[l.id].topics.flatMap(t => t.items) : [];
      const st = l.ready ? (items.length ? `Đã học ${fmt(learnedIn(items))}/${fmt(items.length)}` : "Sẵn sàng") : "Đang biên soạn";
      return `<a class="step" data-lv="${l.id}" href="#/${l.id}">
        <span class="step__lv">${l.name}</span><span class="step__n">${fmt(l.target)} mục từ</span>
        <span class="step__st">${st}</span><span class="step__ja" aria-hidden="true">${"一二三四五六七"[i]}</span></a>`;
    }).join("");
    const pool = allItems().filter(e => e.e && /[一-龯]/.test(e.e));
    const demoItem = pool.length ? pool[Math.floor(Math.random() * pool.length)] : allItems().filter(e => e.vi && /[一-龯]/.test(e.w))[Math.floor(Math.random() * 400)] || null;
    main.innerHTML = `
    <section class="hero"><div class="wrap hero__in">
      <div class="hero__copy">
        <h1><span class="jp" lang="zh">${jp("词[cí]汇[huì]，一[yī]点[diǎn]一[yī]点[diǎn]积[jī]累[lěi]。", { hl: false })}</span>Nhớ từ tiếng Trung theo chuẩn HSK 3.0 mới.</h1>
        <p>${fmt(C.total)} mục từ chia theo bảy cấp của chuẩn HSK 3.0 (GF 0025—2021), mỗi cấp tách thành từng gói nhỏ. Mỗi từ có pinyin trên từng chữ, âm Hán Việt và nghĩa; bật tắt Hán tự hoặc pinyin tùy trình độ.</p>
        <div class="hero__actions"><a class="btn btn--primary" href="#/test">Test trình độ đầu vào</a><a class="btn btn--ghost" href="#/h1">Bắt đầu với HSK 1</a><button class="btn btn--coral btn--levels" type="button" data-to-levels>Chọn gói theo cấp độ <span aria-hidden="true">↓</span></button></div>
        ${placeChip()}
        <div class="quick" role="group" aria-label="Chọn cách học">
          <a class="qk" href="#/h1"><span class="qk__ja" lang="zh" aria-hidden="true">级</span><span class="qk__t"><b>Học theo cấp HSK</b><small>HSK 1 → HSK 7–9</small></span></a>
          <a class="qk" href="#/tu-loai"><span class="qk__ja" lang="zh" aria-hidden="true">词</span><span class="qk__t"><b>Học theo từ loại</b><small>Động từ, tính từ, lượng từ…</small></span></a>
          <a class="qk" href="#/on-tap"><span class="qk__ja" lang="zh" aria-hidden="true">复</span><span class="qk__t"><b>Ôn từ chưa thuộc</b><small>${Object.keys(P.rv).length ? `${fmt(Object.keys(P.rv).length)} từ đang chờ ôn` : "Từ sai tự vào danh sách này"}</small></span></a>
          <a class="qk" href="#/test"><span class="qk__ja" lang="zh" aria-hidden="true">试</span><span class="qk__t"><b>Test đầu vào</b><small>Biết nên bắt đầu từ cấp nào</small></span></a>
        </div>
      </div>
      <div class="stairs-wrap" id="goi-levels">
        <p class="stairs-tag"><b>Học theo cấp độ HSK 3.0</b><span>Bấm vào bậc thang cấp bạn muốn học</span>
          <svg viewBox="0 0 90 70" aria-hidden="true"><path d="M6 8c34-8 70 6 66 50" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="1 8"/><path d="M58 50l14 14 12-16" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg></p>
        <nav class="stairs" aria-label="Chọn cấp độ HSK">${steps}</nav>
      </div>
    </div></section>
    ${demoItem ? `<section class="sec"><div class="wrap demo">
      <div id="demo-card"></div>
      <div><h2>Một thẻ, đủ để dùng được từ.</h2>
        <ul class="demo__notes">
          <li><b>Hán tự và pinyin trên từng chữ</b><span>Nút <b>汉字</b> ở góc trên tắt chữ Hán để luyện đọc pinyin. Nút <b>拼音</b> ẩn pinyin trên chữ để luyện nhận mặt chữ.</span></li>
          <li><b>Âm Hán Việt</b><span>Giúp nhận ra từ Trung–Việt chung gốc, ví dụ 学习 là “học tập”, 电话 là “điện thoại”.</span></li>
          <li><b>Bốn cách luyện cho mỗi gói</b><span>Học thẻ, trắc nghiệm, viết lại và ghép cặp. Gõ bằng chữ Hán, pinyin có dấu, pinyin số (xue2xi2) hoặc không dấu. Từ sai tự vào danh sách cần ôn.</span></li>
        </ul></div>
    </div></section>` : ""}
    <section class="sec"><div class="wrap">
      <div class="sec__head"><h2>Hai cách để học</h2><p class="sec__lead">Cùng một kho từ HSK 3.0, nhìn từ hai hướng. Nhãn cấp độ luôn đi theo từng từ dù bạn học theo cách nào.</p></div>
      <div class="ways">
        <a class="way" href="#/h1"><span class="way__ja" lang="zh">按级别</span><b>Theo cấp độ HSK</b><span>Từ HSK 1 đến HSK 7–9, mỗi cấp chia thành các gói 30 từ theo thứ tự bảng chữ cái pinyin của chuẩn.</span><em>Chọn cấp độ</em></a>
        <a class="way" href="#/tu-loai"><span class="way__ja" lang="zh">按词类</span><b>Theo từ loại</b><span>Gom toàn bộ danh từ, động từ, tính từ… qua mọi cấp, có nhãn H1–H7 cạnh từng từ.</span><em>Chọn từ loại</em></a>
      </div>
    </div></section>`;
    const toLv = main.querySelector("[data-to-levels]");
    if (toLv) toLv.onclick = () => {
      const w = main.querySelector("#goi-levels"); if (!w) return;
      const top = w.getBoundingClientRect().top + scrollY - (parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--hk-h")) || 0) - 70;
      scrollTo({ top, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      w.classList.remove("is-hint"); void w.offsetWidth; w.classList.add("is-hint");
    };
    if (demoItem) {
      const host = $("#demo-card");
      const paint = () => { host.innerHTML = cardFrontHTML(demoItem, 0, 1, true); bindSpeak(host); };
      paint();
      current = { refresh: paint };
    }
  }

  /* ------------------------------------------------------------ test trình độ đầu vào */
  /* 7 phần HSK1→HSK7-9, mỗi phần 10 câu (tối đa 70 câu, 20 phút). Phần nào đúng dưới 50% thì dừng sớm.
     Đúng từ 75% là "vững" cấp đó. Câu hỏi lấy ngẫu nhiên từ kho từ vựng, không hiện đúng/sai giữa chừng. */
  const PL = { lvs: ["h1", "h2", "h3", "h4", "h5", "h6", "h7"], per: 10, pass: .85, stop: .6, limit: 20 * 60 };
  const PL_KIND = { mean: "Nghĩa của từ", cloze: "Điền từ vào cụm", read: "Cách đọc pinyin" };
  const HAS_KANJI = new RegExp(`[${KJ}]`);
  const plOK = e => !/(^|,)(pref|suf|ctr)(,|$)/.test(e.p) && !/[~〜～]/.test(e.w) && e.vi;
  const fmtDate = t => new Date(t).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  const mmss = s => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;
  const lvName = lv => (levelOf(lv) || { name: lv }).name;

  function placeChip() {
    const r = store.get("placement", null);
    if (!r) return "";
    return `<p class="chip-line">Kết quả test gần nhất (${fmtDate(r.at)}): <b>${r.start === "done" ? "Rất vững" : "nên học từ " + lvName(r.start)}</b> · <a href="#/test">xem lại hoặc làm lại</a></p>`;
  }

  function plQuestion(pool, e, kind) {
    const sameP = x => x !== e && x.p[0] === e.p[0];
    const near = list => [...shuffle(list.filter(sameP)), ...shuffle(list.filter(x => x !== e && !sameP(x)))];
    if (kind === "mean") {
      const picks = [];
      const cand = near(pool).filter(x => x.vi !== e.vi).slice(0, 140);
      for (const x of HKD.pickBy(e.vi, cand, 12, Math.random, "vi", x => x.vi, x => (sameP(x) ? 2 : 0))) { if (picks.length === 3) break; if (!picks.some(p => p.vi === x.vi)) picks.push(x); }
      if (picks.length < 3) return null;
      const opts = shuffle([e, ...picks]);
      return { kind, e, opts: opts.map(o => o.vi), ans: opts.indexOf(e) };
    }
    if (kind === "cloze") {
      if (!(e.c && e.c.includes("{") && e.cv)) return null;
      const picks = [];
      const cand = near(pool).filter(x => surf(x.w) !== surf(e.w) && x.vi !== e.vi).slice(0, 140);
      for (const x of HKD.pickBy(surf(e.w), cand, 12, Math.random, "jp", x => surf(x.w), x => (sameP(x) ? 2.5 : 0))) { if (picks.length === 3) break; if (!picks.some(p => surf(p.w) === surf(x.w))) picks.push(x); }
      if (picks.length < 3) return null;
      const opts = shuffle([e, ...picks]);
      return { kind, e, opts, ans: opts.indexOf(e) };
    }
    if (kind === "read") {
      const rd = kana(e.w);
      if (!HAS_KANJI.test(surf(e.w)) || rd.length < 2) return null;
      const withK = pool.filter(x => HAS_KANJI.test(surf(x.w)) && kana(x.w) !== rd);
      const cand = near(withK).slice(0, 140).map(x => ({ k: kana(x.w) })).filter(c => c.k !== rd);
      const picks = HKD.pickBy(rd, cand, 3, Math.random, "jp", c => c.k).map(c => c.k);
      if (picks.length < 3) return null;
      const opts = shuffle([rd, ...picks]);
      return { kind, e, opts, ans: opts.indexOf(rd) };
    }
    return null;
  }
  function plBuild() {
    return PL.lvs.map(lv => {
      const pool = LV[lv].topics.flatMap(t => t.items).filter(plOK), used = new Set(), qs = [];
      const pick = kind => {
        for (const e of shuffle(pool)) {
          if (used.has(e.id)) continue;
          const q = plQuestion(pool, e, kind);
          if (q) { used.add(e.id); return q; }
        }
        return null;
      };
      for (const k of ["mean", "mean", "mean", "mean", "cloze", "cloze", "cloze", "read", "read", "read"]) qs.push(pick(k) || pick("mean"));
      return { lv, qs: shuffle(qs.filter(Boolean)) };
    });
  }
  function plVerdict(stages, timedOut) {
    const per = stages.map(s => {
      const done = s.qs.filter(q => q.pick != null).length;
      const right = s.qs.filter(q => q.pick === q.ans).length;
      return { lv: s.lv, done, right, total: s.qs.length, pct: s.qs.length ? right / s.qs.length : 0 };
    }).filter(p => p.done > 0);
    const state = p => p.pct >= PL.pass ? "vung" : p.pct >= PL.stop ? "dang" : "chua";
    let solid = -1;
    for (let i = 0; i < PL.lvs.length; i++) { const p = per.find(x => x.lv === PL.lvs[i]); if (p && state(p) === "vung") solid = i; else break; }
    const start = solid >= PL.lvs.length - 1 ? "done" : PL.lvs[solid + 1];
    return { per, state, solid: solid < 0 ? null : PL.lvs[solid], start, timedOut };
  }

  async function placement() {
    await loadAll();
    const last = store.get("placement", null);
    const ST = { stages: null, s: 0, k: 0, t0: 0, timer: null, finished: false, dead: false };
    const stopTimer = () => { clearInterval(ST.timer); ST.timer = null; };
    const intro = () => {
      stopTimer();
      main.innerHTML = band({ big: "试", bigJp: true, title: "Test trình độ đầu vào", compact: false,
        text: "Làm một bài kiểm tra ngắn để biết nên bắt đầu học từ cấp nào. Kết quả chỉ để gợi ý lộ trình, không thay cho bài thi HSK thật.",
        meta: `<b>70</b><span>câu tối đa · 10–20 phút</span>` }) +
        `<section class="sec"><div class="wrap test-intro">
          <div class="card test-card"><div class="test-card__in">
            <h2>Trước khi bắt đầu</h2>
            <ul class="facts">
              <li><b>7 phần, từ HSK 1 đến HSK 7–9</b><span>Mỗi phần 10 câu trắc nghiệm. Cần đúng từ 85% để được tính là vững; nếu một phần đúng dưới 60%, bài test dừng ở đó, nên người mới học chỉ mất vài phút.</span></li>
              <li><b>Ba dạng câu hỏi</b><span>Nghĩa của từ, điền từ vào cụm, và chọn pinyin đúng của từ. Các dạng câu có pinyin trên chữ, riêng câu pinyin thì không. Chỉ những cấp có nghĩa tiếng Việt hoặc tiếng Anh mới ra câu nghĩa.</span></li>
              <li><b>Không biết thì bấm “Chưa biết”</b><span>Đừng đoán bừa, vì đoán may sẽ làm kết quả lệch. Bài test không hiện đúng sai giữa chừng.</span></li>
              <li><b>Không ảnh hưởng tiến độ học</b><span>Chỉ khi bạn chọn, các từ làm sai mới được thêm vào danh sách cần ôn.</span></li>
            </ul>
            <div class="hero__actions"><button class="btn btn--primary" type="button" data-start>Bắt đầu làm bài</button>
              <a class="btn btn--ghost" href="#/h1">Mới học? Bỏ qua, bắt đầu từ HSK 1</a></div>
          </div></div>
          ${last ? `<aside class="card test-last"><div class="test-card__in"><h3>Lần làm gần nhất</h3><p>${fmtDate(last.at)} · ${mmss(last.secs)} phút</p>
            <p class="test-last__r">${last.start === "done" ? "Rất vững HSK 7–9" : `Nên học từ <b>${lvName(last.start)}</b>`}</p>
            <button class="btn btn--ghost btn--sm" type="button" data-last>Xem lại kết quả</button></div></aside>` : ""}
        </div></section>`;
      $("[data-start]").onclick = begin;
      const lb = $("[data-last]"); if (lb) lb.onclick = () => result(last, null);
    };
    function begin() {
      ST.stages = plBuild(); ST.s = 0; ST.k = 0; ST.t0 = Date.now(); ST.finished = false;
      stopTimer();
      ST.timer = setInterval(tick, 1000);
      ask();
    }
    const left = () => PL.limit - Math.floor((Date.now() - ST.t0) / 1000);
    function tick() {
      const el = $("[data-timer]"); const l = left();
      if (el) { el.textContent = mmss(l); el.closest(".test-time").classList.toggle("is-low", l <= 120); }
      if (l <= 0 && !ST.finished) finish(true);
    }
    function ask() {
      const stg = ST.stages[ST.s], q = stg.qs[ST.k];
      const segs = ST.stages.map((x, i) => `<li class="${i < ST.s ? "is-done" : i === ST.s ? "is-now" : ""}"><span>${lvName(x.lv)}</span><i style="width:${i < ST.s ? 100 : i === ST.s ? Math.round(ST.k / x.qs.length * 100) : 0}%"></i></li>`).join("");
      const e = q.e;
      let stem;
      if (q.kind === "mean") stem = `<p class="test-ask">Từ này có nghĩa là gì?</p><div class="say" lang="zh">${jp(e.w, { hl: false, kanji: true, furi: true })}</div>`;
      else if (q.kind === "cloze") stem = `<p class="test-ask">Chọn từ điền vào chỗ trống</p><div class="say say--sm" lang="zh">${jp(e.c, { blank: true, kanji: true, furi: true })}</div><div class="card__hint">${esc(e.cv)}</div>`;
      else stem = `<p class="test-ask">Chọn cách đọc đúng của từ này</p><div class="say" lang="zh">${jp(surf(e.w), { hl: false, kanji: true, furi: false })}</div>`;
      const label = (o) => q.kind === "cloze" ? jp(o.w, { hl: false, kanji: true, furi: true }) : esc(o);
      main.innerHTML = `<section class="study test-run"><div class="wrap">
        <div class="test-bar">
          <ol class="segs" aria-label="Tiến độ các phần">${segs}</ol>
          <div class="test-time" title="Thời gian còn lại"><span aria-hidden="true">⏱</span> <b data-timer>${mmss(left())}</b></div>
        </div>
        <div class="card"><div class="quiz">
          <div class="card__top"><span class="lvtag" data-lv="${stg.lv}">Phần ${lvName(stg.lv)}</span><span>${PL_KIND[q.kind]}</span><span class="card__num">${ST.k + 1} <small>/ ${stg.qs.length}</small></span></div>
          <div class="quiz__q">${stem}</div>
          <div class="opts">${q.opts.map((o, i) => `<button class="opt${q.kind === "mean" ? "" : " jp-opt"}" type="button" data-o="${i}" ${q.kind === "mean" ? "" : 'lang="zh"'}><span class="k">${i + 1}</span><span>${label(o)}</span></button>`).join("")}</div>
          <div class="card__actions"><button class="btn btn--ghost" type="button" data-skip>Chưa biết</button></div>
        </div></div>
        <p class="kbd-hint"><kbd>1</kbd>–<kbd>4</kbd> chọn đáp án · <kbd>0</kbd> chưa biết</p>
      </div></section>`;
      $$("[data-o]").forEach(b => b.addEventListener("click", () => answer(+b.dataset.o, b)));
      $("[data-skip]").onclick = () => answer(-1);
      window.scrollTo(0, 0);
    }
    let locked = false;
    function answer(i, btn) {
      if (locked || ST.finished) return;
      locked = true;
      const stg = ST.stages[ST.s]; stg.qs[ST.k].pick = i;
      if (btn) btn.classList.add("is-pick");
      $$("[data-o],[data-skip]").forEach(b => { b.disabled = true; });
      setTimeout(() => {
        locked = false;
        if (ST.finished || ST.dead) return;
        ST.k++;
        if (ST.k >= stg.qs.length) {
          const right = stg.qs.filter(q => q.pick === q.ans).length;
          if (right / stg.qs.length < PL.stop || ST.s >= ST.stages.length - 1) return finish(false);
          ST.s++; ST.k = 0;
        }
        ask();
      }, calm() ? 60 : 220);
    }
    function finish(timedOut) {
      if (ST.finished) return;
      ST.finished = true; stopTimer();
      const secs = Math.min(PL.limit, Math.floor((Date.now() - ST.t0) / 1000));
      const v = plVerdict(ST.stages, timedOut);
      const rec = { at: Date.now(), secs, start: v.start, solid: v.solid, per: v.per.map(p => [p.lv, p.right, p.total]), timedOut: !!timedOut };
      store.set("placement", rec); notify();
      result(rec, ST.stages);
    }
    function result(rec, stages) {
      stopTimer();
      const per = rec.per.map(([lv, right, total]) => ({ lv, right, total, pct: total ? right / total : 0 }));
      const right = per.reduce((s, p) => s + p.right, 0), total = per.reduce((s, p) => s + p.total, 0);
      const st = p => p.pct >= PL.pass ? "vung" : p.pct >= PL.stop ? "dang" : "chua";
      const stTxt = { vung: "Vững", dang: "Đang học dở", chua: "Cần học" };
      const start = rec.start;
      
      const headline = start === "done" ? "Vốn từ của bạn rất vững, đã chạm tới HSK 7–9" : start === "h1" ? "Bạn nên bắt đầu từ HSK 1" : `Vốn từ của bạn vững tới ${rec.solid ? lvName(rec.solid) : "HSK 1"}, nên học tiếp từ ${lvName(start)}`;
      const wrong = stages ? stages.flatMap(s => s.qs.filter(q => q.pick != null && q.pick !== q.ans)) : [];   // chỉ tính câu đã được hỏi
      const kinds = {};
      if (stages) stages.forEach(s => s.qs.filter(q => q.pick != null).forEach(q => { const k = kinds[q.kind] = kinds[q.kind] || [0, 0]; k[1]++; if (q.pick === q.ans) k[0]++; }));
      main.innerHTML = band({ big: "结果", bigJp: true, title: "Kết quả test đầu vào", compact: true, crumb: "Về trang test", crumbHref: "#/test",
        text: "", meta: `<b>${right}/${total}</b><span>câu đúng · ${mmss(rec.secs)} phút${rec.timedOut ? " (hết giờ)" : ""}</span>` }) +
        `<section class="sec"><div class="wrap test-result">
          <div class="card"><div class="done test-done">${scoreRing(right, total)}
            <h3>${headline}</h3>
            <p class="done__msg">${start === "done" ? "Hãy luyện thêm cấp cao và ôn các từ cần ôn để giữ phong độ." : `Bắt đầu từ ${lvName(start)} để lấp các khoảng trống, vì từ cấp này trở đi bạn chưa đạt mức vững.`}</p>
            <div class="hero__actions">
              <a class="btn btn--primary" href="#/${start === "done" ? "h7" : start}">${start === "done" ? "Học HSK 7–9" : `Bắt đầu học ${lvName(start)}`}</a>
            </div></div></div>
          <div class="card"><div class="test-card__in">
            <h3>Điểm theo từng cấp</h3>
            <ul class="lvbars">${per.map(p => `<li><span class="lvtag" data-lv="${p.lv}">${lvName(p.lv)}</span>
              <span class="meter" role="img" aria-label="${p.right} trên ${p.total}"><i style="width:${Math.round(p.pct * 100)}%"></i></span>
              <b>${p.right}/${p.total}</b><em class="st st--${st(p)}">${stTxt[st(p)]}</em></li>`).join("")}
              ${PL.lvs.filter(lv => !per.some(p => p.lv === lv)).map(lv => `<li class="is-skip"><span class="lvtag" data-lv="${lv}">${lvName(lv)}</span><span class="meter"><i style="width:0"></i></span><b>—</b><em class="st">Chưa làm</em></li>`).join("")}
            </ul>
            ${Object.keys(kinds).length ? `<h3>Theo dạng câu hỏi</h3><ul class="kinds">${Object.entries(kinds).map(([k, [a, b]]) => `<li><span>${PL_KIND[k]}</span><b>${a}/${b}</b></li>`).join("")}</ul>` : ""}
            <p class="test-note">Mỗi cấp chỉ có 10 câu nên đây là ước lượng nhanh. Làm lại vài lần, hoặc học thử vài gói rồi kiểm tra lại để thấy rõ hơn.</p>
          </div></div>
          ${wrong.length ? `<div class="card"><div class="test-card__in">
            <div class="test-wrong__head"><h3>${wrong.length} câu chưa đúng</h3>
              <button class="btn btn--coral btn--sm" type="button" data-addrv>Thêm vào danh sách cần ôn</button></div>
            <ul class="test-wrong">${wrong.map(q => `<li><span class="lvtag" data-lv="${q.e.lv}">${lvName(q.e.lv)}</span>
              <span class="jp" lang="zh">${jp(q.e.w, { hl: false, kanji: true, furi: true })}</span>
              <span>${esc(q.e.vi)}${q.e.hv ? ` · <span class="hv">${esc(q.e.hv)}</span>` : ""}</span>${q.pick === -1 ? '<em class="st">Chưa biết</em>' : ""}</li>`).join("")}</ul>
          </div></div>` : ""}
          <div class="hero__actions"><button class="btn btn--primary" type="button" data-again>Làm lại bài test</button><a class="btn btn--ghost" href="#/">Về trang chủ</a></div>
        </div></section>`;
      afterDone($(".test-done"), right, total);
      const back = $(".crumb"); if (back) back.addEventListener("click", ev => { ev.preventDefault(); intro(); });
      $("[data-again]").onclick = () => { location.hash === "#/test" ? intro() : (location.hash = "#/test"); };
      const add = $("[data-addrv]");
      if (add) add.onclick = () => { wrong.forEach(q => mark(q.e.id, "rv")); add.disabled = true; add.textContent = "Đã thêm vào danh sách cần ôn"; toast(`Đã thêm ${wrong.length} từ vào danh sách cần ôn`); };
    }
    const onKey = ev => {
      if (!ST.stages || ST.finished || ev.metaKey || ev.ctrlKey || ev.altKey) return;
      if (/^[1-4]$/.test(ev.key)) { const b = $(`[data-o="${+ev.key - 1}"]`); if (b && !b.disabled) answer(+ev.key - 1, b); }
      else if (ev.key === "0") answer(-1);
    };
    document.addEventListener("keydown", onKey);
    // refresh rỗng: bật tắt Kanji/furigana/romaji (phím K, F, R) không được làm mất bài đang làm
    current = { refresh() { /* bài test dùng cách hiển thị cố định */ }, destroy() { ST.dead = true; stopTimer(); document.removeEventListener("keydown", onKey); } };
    intro();
  }

  /* ------------------------------------------------------------ cấp độ */
  async function level(lv) {
    const L = levelOf(lv);
    if (!L) return notFound();
    const tabs = `<nav class="lvtabs" aria-label="Cấp độ">${C.levels.map(l => `<a href="#/${l.id}" ${l.id === lv ? 'aria-current="page"' : ""}>${l.name}</a>`).join("")}</nav>`;
    if (!L.ready) {
      const per = Math.round(L.target / L.plan.length);
      main.innerHTML = band({ big: L.name, title: `Từ vựng ${L.name}`, text: esc(L.blurb), extra: tabs,
        meta: `<b>${fmt(L.target)}</b><span>mục từ, đang biên soạn</span>` }) +
        `<section class="sec"><div class="wrap">
          <div class="sec__head"><h2>Kế hoạch chủ đề</h2><p class="sec__lead">Các gói dưới đây sẽ mở lần lượt. Trong lúc chờ, bạn có thể ôn các cấp đã sẵn sàng.</p></div>
          <ul class="rows">${L.plan.map(([ja, vi]) => `<li class="row row--off"><div>
            <span><span class="row__ja" lang="zh">${jp(ja, { hl: false })}</span><br><span class="row__vi">${esc(vi)}</span></span>
            <span class="row__side"><b>~${per}</b> mục<br><span class="pill pill--soon">Sắp có</span></span></div></li>`).join("")}</ul>
        </div></section>`;
      current = { refresh: () => level(lv) };
      return;
    }
    const D = await load(lv);
    const items = D.topics.flatMap(t => t.items);
    const ok = learnedIn(items);
    main.innerHTML = band({ big: L.name, title: `Từ vựng ${L.name}`, text: esc(L.blurb), extra: tabs,
      meta: `<b>${fmt(ok)} / ${fmt(items.length)}</b><span>mục đã học</span>${meter(ok, items.length)}` }) +
      `<section class="sec"><div class="wrap">
        <div class="sec__head"><h2>${D.topics.length} gói chủ đề</h2><p class="sec__lead">Mỗi gói có đủ bốn chế độ luyện và tải được về Anki, Quizlet hoặc Excel.</p></div>
        <ul class="rows">${D.topics.map(t => {
          const k = learnedIn(t.items);
          return `<li class="row"><a href="#/${lv}/${t.id}">
            <span><span class="row__ja" lang="zh">${jp(t.ja, { hl: false })}</span><br><span class="row__vi">${esc(t.vi)}</span></span>
            <span class="row__side"><b>${t.items.length}</b> mục<br>${k ? `đã học ${k}` : "chưa học"}${meter(k, t.items.length)}</span></a></li>`;
        }).join("")}</ul>
      </div></section>`;
    current = { refresh: () => level(lv) };
  }

  async function topicStudy(lv, tid) {
    const D = await load(lv);
    const T = D.topics.find(t => t.id === tid);
    if (!T) return notFound();
    const L = levelOf(lv);
    study({ title: `${L.name} · ${T.vi}`, titleJa: T.ja, sub: T.desc, crumb: `Các chủ đề ${L.name}`, crumbHref: `#/${lv}`,
      items: T.items, file: `super-cihui-${lv}-${tid}` });
  }

  /* ------------------------------------------------------------ màn học */
  function cardFrontHTML(e, i, n, demo) {
    const phrase = e.c || e.w;
    const rm = e.c ? e.cr : e.r;
    const st = stateOf(e.id);
    return `<div class="card"><div class="card__face card__face--front" ${demo ? "" : 'data-flip tabindex="0" role="button" aria-label="Lật thẻ"'}>
      <div class="card__top">${lvtag(e.lv)}<span>${esc(posName(e.p))}</span>${e.c ? "<span>· cụm từ</span>" : ""}
        ${st === "ok" ? '<span class="state state--ok">Đã học</span>' : st === "rv" ? '<span class="state state--rv">Cần ôn</span>' : ""}
        ${demo ? "" : `<span class="card__num">${String(i + 1).padStart(3, "0")} <small>/ ${n}</small></span>`}</div>
      <div class="card__main">
        <div class="say${phrase.length > 40 ? " say--sm" : ""}" lang="zh">${jp(phrase)}</div>
        ${S.romaji ? `<div class="romaji">${esc(rm)}</div>` : ""}
        ${demo ? `<div class="back__mean" style="font-size:20px">${esc(meaningOf(e))}</div><div class="card__hint">${esc(e.vi)}${e.hv ? ` · <span class="hv">${esc(e.hv)}</span>` : ""}</div>` : ""}
      </div>
      <div class="card__actions"><button class="icon-btn" type="button" data-say="${esc(surf(phrase))}">${ICON_SPEAK} Nghe</button>
        ${demo ? "" : `<button class="icon-btn" type="button" data-flip>${ICON_FLIP} Lật thẻ</button>`}</div>
    </div></div>`;
  }
  function cardBackHTML(e) {
    return `<div class="card"><div class="card__face back" data-flip tabindex="0" role="button" aria-label="Lật lại mặt trước">
      <div class="card__top">${lvtag(e.lv)}<span>Nghĩa và ví dụ</span></div>
      <div class="back__mean">${esc(meaningOf(e))}</div>
      ${e.c ? `<div class="back__phrase" lang="zh">${jp(e.c)}</div>` : ""}
      <dl class="back__word">
        <dt>Từ</dt><dd class="jp" lang="zh">${jp(e.w, { hl: false })}${S.romaji ? ` <span class="romaji">${esc(e.r)}</span>` : ""}</dd>
        <dt>Nghĩa</dt><dd>${esc(e.vi)}</dd>
        ${e.en && !e.enOnly ? `<dt>English</dt><dd class="en-gloss">${esc(e.en)}</dd>` : ""}
        ${e.hv ? `<dt>Hán Việt</dt><dd class="hv">${esc(e.hv)}</dd>` : ""}
        <dt>Từ loại</dt><dd>${esc(posName(e.p))}</dd>
      </dl>
      ${e.e ? `<div class="ex"><div class="ex__ja" lang="zh">${jp(e.e, { hl: false })}</div><div class="ex__vi">${esc(e.ev)}</div></div>` : ""}
      <div class="card__actions"><button class="icon-btn" type="button" data-say="${esc(surf(e.e || e.w))}">${ICON_SPEAK} ${e.e ? "Nghe câu ví dụ" : "Nghe từ"}</button>
        <button class="icon-btn" type="button" data-flip>${ICON_FLIP} Xem mặt trước</button></div>
    </div></div>`;
  }
  function bindSpeak(root) {
    $$("[data-say]", root).forEach(b => b.addEventListener("click", ev => { ev.stopPropagation(); speak(b.dataset.say); }));
  }

  function study(cfg) {
    const items = cfg.items;
    const st = { mode: cfg.mode || "card", i: 0, flip: false, quiz: null, write: null, match: null, listOpen: false };
    const report = (box, mode, right, total) => { if (box.reported || !cfg.onResult) return; box.reported = true; cfg.onResult(mode, right, total); };
    main.innerHTML = band({ big: "", title: `${cfg.titleJa ? `<span lang="zh" class="jp" style="display:block;font-size:.72em;color:#bcd3d1;margin-bottom:4px">${jp(cfg.titleJa, { hl: false })}</span>` : ""}${esc(cfg.title)}`,
        crumb: cfg.crumb, crumbHref: cfg.crumbHref, text: esc(cfg.sub || ""), compact: true, extra: cfg.extra || "",
        meta: `<div class="dl"><button class="btn btn--ghost btn--sm" type="button" data-dl aria-expanded="false">Tải bộ từ</button>
          <div class="dl__menu" hidden><p>Tải ${items.length} mục của gói này để nhập vào Anki, Quizlet hoặc bảng tính.</p>
          <button type="button" data-fmt="tsv">.TSV <span>Anki, Quizlet</span></button><button type="button" data-fmt="csv">.CSV <span>Excel, Google Sheets</span></button></div></div>` })
      .replace('<div class="band__big"', '<div class="band__big" hidden') +
      `<section class="study"><div class="wrap">
        <div class="study__bar">
          <div class="modes" role="group" aria-label="Chế độ luyện tập">
            <button type="button" data-mode="card"><span class="jp" lang="zh">札</span>Học thẻ</button>
            <button type="button" data-mode="quiz"><span class="jp" lang="zh">択</span>Trắc nghiệm</button>
            <button type="button" data-mode="write"><span class="jp" lang="zh">書</span>Viết lại</button>
            <button type="button" data-mode="match"><span class="jp" lang="zh">合</span>Ghép cặp</button>
          </div>
          <div class="study__stats"><span>Đã học <b data-s-ok></b></span><span class="rv">Cần ôn <b data-s-rv></b></span>
            <button class="btn btn--ghost btn--sm only-m" type="button" data-list>Danh sách</button></div>
        </div>
        <div class="study__grid"><div data-stage></div>
          <aside class="aside" aria-label="Danh sách mục từ"><div class="aside__head"><b>${items.length} mục từ</b>
            <button class="btn btn--ghost btn--sm only-m" type="button" data-list>Đóng</button></div><ol class="wl" data-wl></ol></aside>
        </div>
      </div></section>`;
    const stage = $("[data-stage]"), wl = $("[data-wl]"), aside = $(".aside");

    // tải file
    const dlBtn = $("[data-dl]"), dlMenu = $(".dl__menu");
    dlBtn.addEventListener("click", () => { const open = dlMenu.hidden; dlMenu.hidden = !open; dlBtn.setAttribute("aria-expanded", open); });
    $$("[data-fmt]").forEach(b => b.addEventListener("click", () => { download(items, cfg.file, b.dataset.fmt); dlMenu.hidden = true; dlBtn.setAttribute("aria-expanded", "false"); }));
    const closeMenu = ev => { if (!ev.target.closest(".dl")) { dlMenu.hidden = true; dlBtn.setAttribute("aria-expanded", "false"); } };
    document.addEventListener("click", closeMenu);

    // danh sách bên
    let scrim = null;
    const setList = open => {
      st.listOpen = open; aside.classList.toggle("open", open);
      if (open && !scrim) { scrim = document.createElement("div"); scrim.className = "scrim"; scrim.onclick = () => setList(false); document.body.appendChild(scrim); }
      if (!open && scrim) { scrim.remove(); scrim = null; }
    };
    $$("[data-list]").forEach(b => b.addEventListener("click", () => setList(!st.listOpen)));
    function paintList() {
      wl.innerHTML = items.map((e, i) => `<li><button type="button" data-go="${i}" ${st.mode === "card" && i === st.i ? 'aria-current="true"' : ""}>
        <span class="wl__i">${String(i + 1).padStart(3, "0")}</span>
        <span class="wl__w" lang="zh">${jp(e.w, { hl: false })}<span class="wl__v">${esc(e.vi)}</span></span>
        <span class="dot ${stateOf(e.id) ? "dot--" + stateOf(e.id) : ""}"></span></button></li>`).join("");
    }
    wl.addEventListener("click", ev => {
      const b = ev.target.closest("[data-go]"); if (!b) return;
      st.mode = "card"; st.i = +b.dataset.go; st.flip = false; setList(false); paint();
    });
    function paintStats() {
      $("[data-s-ok]").textContent = `${learnedIn(items)}/${items.length}`;
      $("[data-s-rv]").textContent = items.filter(e => P.rv[e.id]).length;
    }

    // chế độ
    $$("[data-mode]").forEach(b => b.addEventListener("click", () => { st.mode = b.dataset.mode; st.flip = false; paint(); }));

    function paint(dir) {
      $$("[data-mode]").forEach(b => b.setAttribute("aria-pressed", b.dataset.mode === st.mode));
      if (st.mode === "card") paintCard(typeof dir === "string" ? dir : "");
      if (st.mode === "quiz") paintQuiz();
      if (st.mode === "write") paintWrite();
      if (st.mode === "match") paintMatch();
      paintStats(); paintList();
    }

    /* --- học thẻ --- */
    function paintCard(dir) {
      const e = items[st.i];
      stage.innerHTML = `<div class="flip${st.flip ? " is-flipped" : ""}${dir ? " deal-" + dir : ""}"><div class="flip__inner">${cardFrontHTML(e, st.i, items.length)}${cardBackHTML(e)}</div></div>` +
        `<div class="ctl"><button class="btn btn--coral" type="button" data-act="rv">↺ Chưa thuộc</button>
          <button class="nav-btn prev" type="button" data-act="prev" aria-label="Mục trước">‹</button>
          <button class="nav-btn" type="button" data-act="next" aria-label="Mục sau">›</button>
          <button class="btn btn--primary" type="button" data-act="ok">✓ Đã học</button></div>
        <p class="kbd-hint"><kbd>Space</kbd> lật thẻ · <kbd>←</kbd><kbd>→</kbd> chuyển thẻ · <kbd>1</kbd> chưa thuộc · <kbd>2</kbd> đã học · <kbd>K</kbd> Hán tự · <kbd>F</kbd> pinyin trên chữ</p>
        <p class="swipe-hint" aria-hidden="true"><span>‹</span> Vuốt phải: thẻ trước · Vuốt trái: thẻ sau <span>›</span></p>`;
      bindSpeak(stage);
      syncFaces();
      $$("[data-flip]", stage).forEach(el => el.addEventListener("click", ev => {
        ev.stopPropagation();
        if (ev.target.closest("[data-say]")) return;
        if (performance.now() - swipedAt < 400) return;   // vừa vuốt xong thì không tính là chạm để lật
        turn();
      }));
      $$("[data-act]", stage).forEach(b => b.addEventListener("click", () => act(b.dataset.act)));
      bindSwipe();
    }

    /* vuốt trái = thẻ sau, vuốt phải = thẻ trước (cảm ứng và chuột); cuộn dọc vẫn hoạt động bình thường */
    let swipedAt = -1e9;
    function bindSwipe() {
      const f = $(".flip", stage); if (!f) return;
      let pid = null, sx = 0, sy = 0, dx = 0, t0 = 0, axis = null;
      const reset = (anim) => {
        f.classList.remove("dragging");
        f.style.transition = anim ? "transform .22s cubic-bezier(.2,.8,.3,1), opacity .22s" : "";
        f.style.transform = ""; f.style.opacity = "";
        if (anim) setTimeout(() => { f.style.transition = ""; }, 240);
      };
      f.addEventListener("pointerdown", ev => {
        if (pid !== null || (ev.pointerType === "mouse" && ev.button !== 0)) return;
        if (ev.target.closest("[data-say], .icon-btn")) return;
        pid = ev.pointerId; sx = ev.clientX; sy = ev.clientY; dx = 0; t0 = performance.now(); axis = null;
      });
      f.addEventListener("pointermove", ev => {
        if (ev.pointerId !== pid) return;
        const mx = ev.clientX - sx, my = ev.clientY - sy;
        if (!axis) {
          if (Math.abs(mx) < 8 && Math.abs(my) < 8) return;
          axis = Math.abs(mx) > Math.abs(my) * 1.2 ? "x" : "y";
          if (axis === "x") { try { f.setPointerCapture(pid); } catch (e) { /* bỏ qua */ } f.classList.add("dragging"); }
        }
        if (axis !== "x") return;
        dx = mx;
        const lim = Math.min(Math.abs(dx), 140) * Math.sign(dx);
        f.style.transition = "none";
        f.style.transform = `translateX(${dx}px) rotate(${Math.max(-8, Math.min(8, lim / 18))}deg)`;
        f.style.opacity = String(1 - Math.min(Math.abs(dx) / 420, .45));
      });
      const finish = ev => {
        if (ev.pointerId !== pid) return;
        const was = axis; pid = null; axis = null;
        if (was !== "x") return;
        swipedAt = performance.now();
        const dt = Math.max(1, performance.now() - t0), v = Math.abs(dx) / dt;
        const far = Math.abs(dx) > Math.min(90, f.offsetWidth * .2) || (Math.abs(dx) > 36 && v > .5);
        if (ev.type === "pointercancel" || !far) return reset(true);
        const dir = dx < 0 ? "next" : "prev";
        if (calm()) { reset(false); return act(dir); }
        f.style.transition = "transform .16s ease-in, opacity .16s";
        f.style.transform = `translateX(${dx < 0 ? "-" : ""}${Math.max(f.offsetWidth, 280)}px) rotate(${dx < 0 ? -10 : 10}deg)`;
        f.style.opacity = "0";
        setTimeout(() => act(dir), 150);
      };
      f.addEventListener("pointerup", finish);
      f.addEventListener("pointercancel", finish);
    }
    function syncFaces() {
      const f = $(".flip", stage); if (!f) return;
      const [front, back] = $$(".flip__inner > .card", f);
      front.inert = st.flip; back.inert = !st.flip;
      front.setAttribute("aria-hidden", st.flip); back.setAttribute("aria-hidden", !st.flip);
    }
    function turn() {
      const f = $(".flip", stage); if (!f) return;
      st.flip = !st.flip;
      f.classList.remove("deal-next", "deal-prev");
      f.classList.toggle("is-flipped", st.flip);
      syncFaces();
      const face = $$(".flip__inner > .card", f)[st.flip ? 1 : 0];
      const btn = $("button[data-flip]", face); if (btn) btn.focus({ preventScroll: true });
    }
    function act(a) {
      let dir = a === "prev" ? "prev" : "next";
      if (a === "prev") { st.i = (st.i - 1 + items.length) % items.length; st.flip = false; }
      if (a === "next") { st.i = (st.i + 1) % items.length; st.flip = false; }
      if (a === "ok" || a === "rv") {
        mark(items[st.i].id, a);
        if (a === "rv") toast("Đã thêm vào danh sách cần ôn");
        st.i = (st.i + 1) % items.length; st.flip = false;
      }
      paint(dir);
      const cur = $('[aria-current="true"]', wl);
      if (cur) { const top = cur.offsetTop - wl.offsetTop, h = wl.clientHeight; if (top < wl.scrollTop || top > wl.scrollTop + h - cur.offsetHeight) wl.scrollTop = top - h / 3; }
    }

    /* --- trắc nghiệm --- */
    function newQuiz() { st.streak = 0; st.quiz = { deck: shuffle(items), k: 0, right: 0, wrong: [], answered: null, opts: null }; }
    function makeOpts(e) {
      /* chọn đáp án nhiễu giống đáp án đúng cả ở mặt chữ Nhật lẫn nghĩa tiếng Việt, cùng từ loại → không lộ đáp án qua hình thức */
      const mE = HKD.shape(meaningOf(e), "vi");
      const cands = shuffle(items.filter(x => x !== e && meaningOf(x) !== meaningOf(e) && surf(x.c || x.w) !== surf(e.c || e.w))).slice(0, 160);
      const bonus = x => (x.p.split(",")[0][0] === e.p[0] ? 2.5 : 0) + 0.8 * HKD.sim(mE, HKD.shape(meaningOf(x), "vi"), "vi");
      const picks = [];
      for (const x of HKD.pickBy(surf(e.c || e.w), cands, 12, Math.random, "jp", x => surf(x.c || x.w), bonus)) {
        if (picks.length === 3) break;
        if (!picks.some(p => meaningOf(p) === meaningOf(x) || surf(p.c || p.w) === surf(x.c || x.w))) picks.push(x);
      }
      return shuffle([e, ...picks]);
    }
    function paintQuiz() {
      if (!st.quiz) newQuiz();
      const q = st.quiz;
      if (q.k >= q.deck.length) {
        stage.innerHTML = doneHTML(`Xong ${q.deck.length} câu`, q.right, q.deck.length, `Đúng ${q.right}, sai ${q.wrong.length}. Các câu sai đã nằm trong danh sách cần ôn.`,
          `<button class="btn btn--primary" type="button" data-again>Làm lại</button>${q.wrong.length ? '<button class="btn btn--ghost" type="button" data-wrong>Chỉ làm lại câu sai</button>' : ""}`);
        afterDone(stage, q.right, q.deck.length);
        report(q, "quiz", q.right, q.deck.length);
        $("[data-again]", stage).onclick = () => { newQuiz(); paintQuiz(); };
        const w = $("[data-wrong]", stage); if (w) w.onclick = () => { const d = shuffle(q.wrong); newQuiz(); st.quiz.deck = d; st.quiz.reported = true; paintQuiz(); };
        return;
      }
      const e = q.deck[q.k];
      if (!q.opts) q.opts = makeOpts(e);
      const jv = S.quizDir === "jv";
      const prompt = jv ? `<div class="say" lang="zh">${jp(e.c || e.w)}</div>${S.romaji ? `<div class="romaji">${esc(e.c ? e.cr : e.r)}</div>` : ""}`
                        : `<div class="back__mean">${esc(meaningOf(e))}</div>`;
      stage.innerHTML = `<div class="card"><div class="quiz">
        <div class="card__top"><button class="icon-btn quiz__dir" type="button" data-dir>${jv ? "Trung → Việt" : "Việt → Trung"}</button>
          <span class="card__num">${q.k + 1} <small>/ ${q.deck.length}</small></span></div>
        <div class="quiz__q">${prompt}${jv ? `<button class="icon-btn" type="button" data-say="${esc(surf(e.c || e.w))}">${ICON_SPEAK} Nghe</button>` : ""}</div>
        <div class="opts">${q.opts.map((o, i) => `<button class="opt${jv ? "" : " jp-opt"}" type="button" data-o="${i}" ${jv ? "" : 'lang="zh"'}><span class="k">${i + 1}</span><span>${jv ? esc(meaningOf(o)) : jp(o.c || o.w, { hl: false })}</span></button>`).join("")}</div>
        <div class="feedback" aria-live="polite"></div>
        <div class="card__actions" data-next-wrap hidden><button class="btn btn--primary" type="button" data-next>Câu tiếp</button></div>
      </div></div>`;
      bindSpeak(stage);
      $("[data-dir]", stage).onclick = () => { S.quizDir = jv ? "vj" : "jv"; saveS(); paintQuiz(); };
      $$("[data-o]", stage).forEach(b => b.addEventListener("click", () => answerQuiz(+b.dataset.o)));
      $("[data-next]", stage).onclick = nextQuiz;
      if (q.answered != null) answerQuiz(q.answered, true);
    }
    function answerQuiz(i, replay) {
      const q = st.quiz, e = q.deck[q.k];
      if (q.answered != null && !replay) return;
      const right = q.opts[i] === e;
      if (!replay) {
        q.answered = i;
        q.word = pickWord(right);
        st.streak = right ? (st.streak || 0) + 1 : 0; q.streak = st.streak;
        if (right) { q.right++; mark(e.id, "ok"); } else { q.wrong.push(e); mark(e.id, "rv"); }
        paintStats(); paintList();
      }
      $$("[data-o]", stage).forEach((b, k) => { b.disabled = true; if (q.opts[k] === e) b.classList.add("is-right"); else if (k === i) b.classList.add("is-wrong"); });
      const fb = $(".feedback", stage);
      fb.className = "feedback " + (right ? "ok" : "no");
      fb.innerHTML = verdictHTML(right, q.word, right ? "" : `Đáp án: <span lang="zh" class="jp">${jp(e.c || e.w, { hl: false })}</span> = ${esc(meaningOf(e))}`, q.streak);
      if (!replay) {
        verdict(fb, right);
        const picked = $$("[data-o]", stage)[i], card = $(".card", stage);
        if (right) { celebrate(picked, q.streak > 0 && q.streak % 5 === 0); glow(card, true); }
        else { wobble(picked); glow(card, false); buzz(); }
      }
      $("[data-next-wrap]", stage).hidden = false;
      $("[data-next]", stage).focus({ preventScroll: true });
    }
    function nextQuiz() { const q = st.quiz; q.k++; q.answered = null; q.opts = null; paintQuiz(); }

    /* --- viết lại --- */
    function newWrite() { st.streak = 0; st.write = { deck: shuffle(items), k: 0, right: 0, checked: false, ok: false, hint: false, value: "" }; }
    function paintWrite() {
      if (!st.write) newWrite();
      const w = st.write;
      if (w.k >= w.deck.length) {
        stage.innerHTML = doneHTML(`Xong ${w.deck.length} từ`, w.right, w.deck.length, `Viết đúng ${w.right}. Các từ viết sai đã vào danh sách cần ôn.`,
          `<button class="btn btn--primary" type="button" data-again>Viết lại từ đầu</button>`);
        afterDone(stage, w.right, w.deck.length);
        report(w, "write", w.right, w.deck.length);
        $("[data-again]", stage).onclick = () => { newWrite(); paintWrite(); };
        return;
      }
      const e = w.deck[w.k];
      const ctx = e.c && e.c.includes("{") ? `<div class="say say--sm" lang="zh">${jp(e.c, { blank: true })}</div><div class="card__hint">${esc(e.cv)}</div>` : "";
      stage.innerHTML = `<div class="card"><div class="quiz">
        <div class="card__top">${lvtag(e.lv)}<span>${esc(posName(e.p))}</span><span class="card__num">${w.k + 1} <small>/ ${w.deck.length}</small></span></div>
        <div class="quiz__q"><div class="back__mean">${esc(e.vi)}</div>${ctx}
          ${w.hint ? `<div class="card__hint">${e.hv ? `Hán Việt <span class="hv">${esc(e.hv)}</span>, ` : ""}pinyin bắt đầu bằng 「${esc(kana(e.w)[0])}」, gồm ${surf(e.w).length} chữ Hán</div>` : ""}</div>
        <form class="write" autocomplete="off">
          <label class="sr" for="wr-in">Gõ từ tiếng Trung</label>
          <input id="wr-in" lang="zh" inputmode="text" autocapitalize="off" spellcheck="false" placeholder="Gõ chữ Hán hoặc pinyin" value="${esc(w.value)}" class="${w.checked ? (w.ok ? "ok" : "no") : ""}" ${w.checked ? "readonly" : ""}>
          <div class="write__row">${w.checked ? '<button class="btn btn--primary" type="submit">Từ tiếp theo</button>' :
            `<button class="btn btn--ghost" type="button" data-hint ${w.hint ? "disabled" : ""}>Gợi ý</button><button class="btn btn--ghost" type="button" data-skip>Bỏ qua</button><button class="btn btn--primary" type="submit">Kiểm tra</button>`}</div>
          <div class="feedback ${w.checked ? (w.ok ? "ok" : "no") : ""}" aria-live="polite">${w.checked ? verdictHTML(w.ok, w.word, `${w.ok ? "" : "Đáp án: "}<span lang="zh" class="jp" style="font-size:20px">${jp(e.w, { hl: false, kanji: true })}</span> <span class="romaji">${esc(e.r)}</span>`, w.streak) : ""}</div>
          <small>Chấp nhận chữ Hán, pinyin có dấu, pinyin số (xue2xi2) hoặc pinyin không dấu.</small>
        </form></div></div>`;
      const form = $("form", stage), input = $("#wr-in", stage);
      if (!w.checked) input.focus({ preventScroll: true });
      input.addEventListener("input", () => { w.value = input.value; });
      form.addEventListener("submit", ev => {
        ev.preventDefault();
        if (w.checked) { w.k++; w.checked = false; w.ok = false; w.hint = false; w.value = ""; return paintWrite(); }
        if (!input.value.trim()) return input.focus();
        w.value = input.value;
        settle(checkAnswer(input.value, e));
      });
      const h = $("[data-hint]", stage); if (h) h.onclick = () => { w.hint = true; paintWrite(); };
      const sk = $("[data-skip]", stage); if (sk) sk.onclick = () => { w.value = ""; settle(false); };
      function settle(ok) {
        w.checked = true; w.ok = ok; w.word = pickWord(ok);
        st.streak = ok ? (st.streak || 0) + 1 : 0; w.streak = st.streak;
        if (ok) { w.right++; mark(e.id, "ok"); } else mark(e.id, "rv");
        paintWrite(); paintStats(); paintList();
        const inp = $("#wr-in", stage), fbw = $(".feedback", stage), card = $(".card", stage);
        verdict(fbw, ok);
        if (ok) { celebrate(inp, w.streak > 0 && w.streak % 5 === 0); glow(card, true); } else { wobble(inp); glow(card, false); buzz(); }
        $("button[type=submit]", stage).focus({ preventScroll: true });
      }
    }

    /* --- ghép cặp --- */
    function newMatch() { st.match = { deck: shuffle(items), round: 0, miss: 0, pairs: 0, done: {}, sel: null, order: null }; }
    function paintMatch() {
      if (!st.match) newMatch();
      const m = st.match, size = 6;
      const set = m.deck.slice(m.round * size, m.round * size + size);
      if (!set.length) {
        const tries = m.pairs + m.miss;
        stage.innerHTML = doneHTML(`Đã ghép xong ${m.pairs} cặp`, m.pairs, tries, `Ghép nhầm ${m.miss} lần.`, `<button class="btn btn--primary" type="button" data-again>Chơi lại</button>`);
        afterDone(stage, m.pairs, tries);
        $("[data-again]", stage).onclick = () => { newMatch(); paintMatch(); };
        return;
      }
      if (!m.order) m.order = { L: shuffle(set), R: shuffle(set) };
      const rounds = Math.ceil(m.deck.length / size);
      stage.innerHTML = `<div class="card"><div class="match">
        <div class="card__top"><span>Chọn một từ tiếng Trung, rồi chọn nghĩa đúng</span><span class="card__num">Lượt ${m.round + 1} <small>/ ${rounds}</small></span></div>
        <div class="match__grid">
          <div class="match__col">${m.order.L.map(e => `<button class="tile jp-tile" type="button" lang="zh" data-l="${e.id}" ${m.done[e.id] ? "disabled" : ""}>${jp(e.w, { hl: false })}</button>`).join("")}</div>
          <div class="match__col">${m.order.R.map(e => `<button class="tile" type="button" data-r="${e.id}" ${m.done[e.id] ? "disabled" : ""}>${esc(e.vi)}</button>`).join("")}</div>
        </div>
        <div class="match__foot"><span>Ghép nhầm: <b>${m.miss}</b></span><button class="btn btn--ghost btn--sm" type="button" data-skipround>Bỏ lượt này</button></div>
      </div></div>`;
      $$(".tile", stage).forEach(t => { const id = t.dataset.l || t.dataset.r; if (m.done[id]) t.classList.add("is-done"); });
      $$(".tile", stage).forEach(t => t.addEventListener("click", () => pick(t)));
      $("[data-skipround]", stage).onclick = () => { m.round++; m.order = null; m.sel = null; paintMatch(); };
    }
    function pick(t) {
      const m = st.match;
      const side = t.dataset.l ? "l" : "r", id = t.dataset.l || t.dataset.r;
      if (!m.sel || m.sel.side === side) {
        $$(".tile.is-sel", stage).forEach(x => x.classList.remove("is-sel"));
        m.sel = { side, id }; t.classList.add("is-sel"); return;
      }
      const other = m.sel; m.sel = null;
      $$(".tile.is-sel", stage).forEach(x => x.classList.remove("is-sel"));
      if (other.id === id) {
        m.done[id] = 1; m.pairs++; mark(id, "ok");
        const pair = $$(`[data-l="${id}"],[data-r="${id}"]`, stage);
        pair.forEach(x => { x.classList.add("is-hit"); celebrate(x); });
        setTimeout(() => pair.forEach(x => { x.classList.remove("is-hit"); x.disabled = true; x.classList.add("is-done"); }), 380);
        paintStats(); paintList();
        if (m.order.L.every(e => m.done[e.id])) {
          setTimeout(() => { glow($(".card", stage), true); celebrate($(".match__grid", stage), true); }, 380);
          setTimeout(() => { m.round++; m.order = null; paintMatch(); }, 1100);
        }
      } else {
        m.miss++;
        const leftId = side === "l" ? id : other.id;
        mark(leftId, "rv"); paintStats(); paintList();
        const a = $(`[data-${other.side}="${other.id}"]`, stage);
        [t, a].forEach(x => { x.classList.add("is-wrong"); wobble(x); setTimeout(() => x.classList.remove("is-wrong"), 500); });
        buzz();
        $(".match__foot b", stage).textContent = m.miss;
      }
    }

    /* --- bàn phím --- */
    function onKey(ev) {
      if (ev.target.matches("input, textarea") || ev.metaKey || ev.ctrlKey || ev.altKey) return;
      if (st.mode === "card") {
        if (ev.key === " " || ev.key === "Enter") { if (ev.target.closest("button")) return; ev.preventDefault(); turn(); }
        else if (ev.key === "ArrowRight") act("next");
        else if (ev.key === "ArrowLeft") act("prev");
        else if (ev.key === "1") act("rv");
        else if (ev.key === "2") act("ok");
      } else if (st.mode === "quiz" && st.quiz) {
        if (/^[1-4]$/.test(ev.key) && st.quiz.answered == null) answerQuiz(+ev.key - 1);
        else if (ev.key === "Enter" && st.quiz.answered != null && !ev.target.closest("button")) nextQuiz();
      }
    }
    document.addEventListener("keydown", onKey);
    current = {
      refresh: paint,
      destroy() { document.removeEventListener("keydown", onKey); document.removeEventListener("click", closeMenu); if (scrim) scrim.remove(); }
    };
    paint();
  }

  /* ------------------------------------------------------------ tải bộ từ */
  function download(items, name, f) {
    const head = ["Từ", "Cách đọc", "Romaji", "Từ loại", "Hán Việt", "Nghĩa", "Cụm từ", "Cách đọc cụm", "Nghĩa cụm", "Ví dụ", "Cách đọc ví dụ", "Dịch ví dụ", "Cấp độ"];
    const rows = items.map(e => [surf(e.w), kana(e.w), e.r, posName(e.p), e.hv, e.vi, surf(e.c), kana(e.c), e.cv, surf(e.e), kana(e.e), e.ev, e.lv.toUpperCase()]);
    let text;
    if (f === "tsv") text = [head, ...rows].map(r => r.map(c => String(c || "").replace(/[\t\n]/g, " ")).join("\t")).join("\n");
    else text = "﻿" + [head, ...rows].map(r => r.map(c => `"${String(c || "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const blob = new Blob([text], { type: f === "tsv" ? "text/tab-separated-values;charset=utf-8" : "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `${name}.${f}`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast(`Đã tải ${items.length} mục dạng .${f.toUpperCase()}`);
  }

  /* ------------------------------------------------------------ từ loại */
  const posGroup = id => C.pos.find(p => p.id === id);
  const inGroup = (g, e) => e.p.split(",").some(p => (g.codes || [g.id]).includes(p));
  const LVCOL = { h1: "var(--mint)", h2: "var(--step-4)", h3: "var(--step-3)", h4: "var(--green)", h5: "var(--green-deep)", h6: "var(--coral)", h7: "var(--ink)" };
  async function posList() {
    await loadAll();
    const all = allItems();
    main.innerHTML = band({ big: "词类", bigJp: true, title: "Học theo từ loại", text: "Gom từ cùng loại qua mọi cấp độ. Nhãn H1–H7 nằm cạnh từng từ để bạn biết mình đang ở đâu.",
      meta: `<b>${fmt(all.length)}</b><span>mục từ đã mở</span>` }) +
      `<section class="sec"><div class="wrap"><ul class="posrows">${C.pos.map(g => {
        const its = all.filter(e => inGroup(g, e));
        const by = C.levels.map(l => [l.id, its.filter(e => e.lv === l.id).length]);
        return `<li><a href="#/tu-loai/${g.id}"><span><span class="row__ja" lang="zh">${jp(g.ja, { hl: false })}</span><br><span class="row__vi">${esc(g.label)}</span></span>
          <span class="row__side"><b>${fmt(its.length)}</b> mục<div class="lvbar" style="margin-top:6px">${by.filter(b => b[1]).map(([lv, n]) => `<i style="width:${its.length ? n / its.length * 100 : 0}%;background:${LVCOL[lv]}" title="${lv.toUpperCase()}: ${n}"></i>`).join("")}</div></span></a></li>`;
      }).join("")}</ul>
      <p class="sec__lead" style="margin-top:20px">Hiện mới mở cấp ${readyLevels().map(x => x.toUpperCase()).join(", ")}. Số mục sẽ tăng khi các cấp tiếp theo hoàn thành.</p></div></section>`;
  }
  const PACK = 50;
  function posFilter(g, q) {
    const cap = q.get("cap") || "all";
    return { cap, items: allItems().filter(e => inGroup(g, e) && (cap === "all" || e.lv === cap)) };
  }
  async function posDetail(gid, q) {
    const g = posGroup(gid); if (!g) return notFound();
    await loadAll();
    const { cap, items } = posFilter(g, q);
    let shown = 100;
    const packs = Math.ceil(items.length / PACK);
    main.innerHTML = band({ big: surf(g.ja).split("・")[0], bigJp: true, crumb: "Tất cả từ loại", crumbHref: "#/tu-loai",
        title: esc(g.label), text: "Lọc theo cấp độ, rồi chọn một gói 50 mục để luyện với đủ bốn chế độ.",
        meta: `<b>${fmt(items.length)}</b><span>mục ${cap === "all" ? "ở mọi cấp" : "cấp " + cap.toUpperCase()}</span>` }) +
      `<section class="sec" style="padding-top:32px"><div class="wrap">
        <div class="toolbar"><div class="chips" role="group" aria-label="Lọc cấp độ">
          <a class="chip" href="#/tu-loai/${gid}" ${cap === "all" ? 'aria-current="page"' : ""}>Tất cả</a>
          ${C.levels.map(l => l.ready ? `<a class="chip" href="#/tu-loai/${gid}?cap=${l.id}" ${cap === l.id ? 'aria-current="page"' : ""}>${l.name}</a>` : `<span class="chip" style="opacity:.45" title="Đang biên soạn">${l.name}</span>`).join("")}
        </div></div>
        ${items.length ? `<div class="toolbar"><b style="color:var(--green)">Chọn gói để luyện</b><div class="packs">${Array.from({ length: packs }, (_, i) =>
          `<a class="btn btn--ghost btn--sm" href="#/tu-loai/${gid}/hoc?cap=${cap}&goi=${i + 1}">Gói ${i + 1}: mục ${i * PACK + 1}–${Math.min(items.length, (i + 1) * PACK)}</a>`).join("")}</div></div>
        <table class="vt"><thead><tr><th>Cấp</th><th>Từ</th><th>Nghĩa</th><th>Cụm từ thông dụng</th></tr></thead><tbody data-tb></tbody></table>
        <div style="text-align:center;margin-top:16px"><button class="btn btn--ghost" type="button" data-more hidden>Hiện thêm 100 mục</button></div>` :
        `<div class="empty"><h3>Chưa có mục nào</h3><p>Cấp độ này chưa có ${esc(g.label.toLowerCase())}. Hãy chọn “Tất cả” hoặc một cấp khác.</p></div>`}
      </div></section>`;
    const tb = $("[data-tb]"), more = $("[data-more]");
    const paintRows = () => {
      if (!tb) return;
      tb.innerHTML = items.slice(0, shown).map(e => `<tr><td>${lvtag(e.lv)}</td>
        <td><span class="jp" lang="zh">${jp(e.w, { hl: false })}</span>${S.romaji ? `<div class="romaji" style="font-size:13px">${esc(e.r)}</div>` : ""}</td>
        <td>${esc(e.vi)}${e.hv ? `<div class="hv" style="font-size:12px">${esc(e.hv)}</div>` : ""}${e.en && !e.enOnly ? `<div class="en-gloss muted" style="font-size:12px">${esc(e.en)}</div>` : ""}</td>
        <td>${e.c ? `<span class="col-c" lang="zh">${jp(e.c, { hl: false })}</span><div class="muted">${esc(e.cv)}</div>` : '<span class="muted">Từ cơ bản, dùng trực tiếp</span>'}</td></tr>`).join("");
      if (more) more.hidden = shown >= items.length;
    };
    if (more) more.onclick = () => { shown += 100; paintRows(); };
    paintRows();
    current = { refresh: paintRows };
  }
  async function posStudy(gid, q) {
    const g = posGroup(gid); if (!g) return notFound();
    await loadAll();
    const { cap, items } = posFilter(g, q);
    const n = Math.max(1, +q.get("goi") || 1);
    const slice = items.slice((n - 1) * PACK, n * PACK);
    if (!slice.length) return notFound();
    study({ title: `${g.label} · gói ${n}`, sub: `${cap === "all" ? "Mọi cấp độ" : "Cấp " + cap.toUpperCase()}, mục ${(n - 1) * PACK + 1}–${(n - 1) * PACK + slice.length} trên ${items.length}.`,
      crumb: g.label, crumbHref: `#/tu-loai/${gid}${cap !== "all" ? "?cap=" + cap : ""}`, items: slice, file: `super-cihui-${gid}-${cap}-goi${n}` });
  }

  /* ------------------------------------------------------------ cần ôn */
  const reviewPool = async () => {
    await loadAll(); let all = allItems();
    if (C.industriesReady) { const D = await load("nganh"); all = all.concat(D.topics.flatMap(t => t.items)); }
    // từ đánh dấu khi học theo giáo trình có thể thuộc cấp chưa mở hoặc là mục riêng của giáo trình
    if (false) {
      await Promise.resolve();
      if (BOOKIDX) { const seen = new Set(all.map(e => e.id)); BOOKIDX.forEach(e => { if (!seen.has(e.id)) all.push(e); }); }
    }
    return all.filter(e => P.rv[e.id]);
  };
  async function review() {
    const items = await reviewPool();
    main.innerHTML = band({ big: "復習", bigJp: true, title: "Danh sách cần ôn", text: "Mọi từ bạn đánh dấu “Chưa thuộc” hoặc trả lời sai, gom từ tất cả các gói. Trả lời đúng hoặc bấm “Đã học” là từ rời khỏi danh sách.",
      meta: `<b>${items.length}</b><span>mục cần ôn</span>` }) +
      `<section class="sec" style="padding-top:32px"><div class="wrap">${items.length ? `
        <div class="toolbar"><a class="btn btn--primary" href="#/on-tap/hoc">Ôn ${items.length} mục này</a><span class="grow"></span><button class="btn btn--ghost btn--sm" type="button" data-clear>Xóa toàn bộ danh sách</button></div>
        <table class="vt"><thead><tr><th>Cấp</th><th>Từ</th><th>Nghĩa</th><th>Cụm từ</th></tr></thead><tbody>${items.map(e => `<tr><td>${lvtag(e.lv)}</td>
          <td><span class="jp" lang="zh">${jp(e.w, { hl: false })}</span></td><td>${esc(e.vi)}${e.en && !e.enOnly ? `<div class="en-gloss muted" style="font-size:12px">${esc(e.en)}</div>` : ""}</td>
          <td>${e.c ? `<span class="col-c" lang="zh">${jp(e.c, { hl: false })}</span><div class="muted">${esc(e.cv)}</div>` : ""}</td></tr>`).join("")}</tbody></table>` :
        `<div class="empty"><h3>Chưa có từ nào cần ôn</h3><p>Khi học thẻ, bấm “Chưa thuộc” để đưa từ vào đây. Các câu trắc nghiệm hay ghép cặp làm sai cũng tự động được thêm.</p><a class="btn btn--primary" href="#/n5">Bắt đầu học N5</a></div>`}
      </div></section>`;
    const c = $("[data-clear]");
    if (c) c.onclick = () => { if (confirm("Xóa toàn bộ danh sách cần ôn? Tiến độ “đã học” vẫn được giữ.")) { P.rv = {}; P.clr = nowSec(); saveP(); review(); } };
    current = { refresh: review };
  }
  async function reviewStudy() {
    const items = await reviewPool();
    if (!items.length) { location.hash = "#/on-tap"; return; }
    study({ title: "Ôn các từ chưa thuộc", sub: `${items.length} mục từ nhiều gói khác nhau.`, crumb: "Danh sách cần ôn", crumbHref: "#/on-tap", items, file: "super-cihui-can-on" });
  }

  /* ------------------------------------------------------------ chủ đề màu */
  const THEMES = [
    { id: "reu", ja: "苔", name: "Rêu", note: "Xanh rêu, mặc định", c: ["#004646", "#27c4b5", "#ed3838", "#f7f4ed"], meta: "#004646" },
    { id: "ai", ja: "藍", name: "Chàm", note: "Xanh chàm, dịu mắt", c: ["#233a63", "#5fa8d8", "#e0533d", "#f1f3f7"], meta: "#233a63" },
    { id: "sakura", ja: "桜", name: "Anh đào", note: "Hồng mận, ấm áp", c: ["#7a2e4a", "#ee8fae", "#d23b3b", "#fbf1f2"], meta: "#7a2e4a" },
    { id: "matcha", ja: "抹茶", name: "Trà xanh", note: "Xanh lá, tự nhiên", c: ["#3f5a22", "#a3c45a", "#d9622b", "#f4f2e4"], meta: "#3f5a22" },
    { id: "momiji", ja: "紅葉", name: "Lá phong", note: "Nâu đỏ mùa thu", c: ["#7a2f14", "#f2a04a", "#c8102e", "#faf0e3"], meta: "#7a2f14" },
    { id: "yoru", ja: "夜", name: "Ban đêm", note: "Nền tối, học buổi tối", c: ["#0b1416", "#134e4c", "#3fd1c0", "#ff6b6b"], meta: "#0b1416" }
  ];
  function applyTheme(id) {
    const t = THEMES.find(x => x.id === id) || THEMES[0];
    if (t.id === "reu") delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t.id;
    const m = $('meta[name="theme-color"]'); if (m) m.setAttribute("content", t.meta);
    $$(".theme-opt").forEach(o => o.setAttribute("aria-checked", o.dataset.t === t.id));
  }
  (function themePicker() {
    const btn = $("[data-theme-btn]"), menu = $(".theme-menu");
    menu.innerHTML = "<p>Màu giao diện</p>" + THEMES.map(t => `<button class="theme-opt" type="button" role="menuitemradio" data-t="${t.id}" aria-checked="false">
      <span class="sw">${t.c.map(c => `<i style="background:${c}"></i>`).join("")}</span>
      <span><b>${t.name}</b><small>${t.note}</small></span><span class="ja" lang="zh">${t.ja}</span></button>`).join("");
    const close = () => { menu.hidden = true; btn.setAttribute("aria-expanded", "false"); };
    btn.addEventListener("click", ev => { ev.stopPropagation(); const open = menu.hidden; menu.hidden = !open; btn.setAttribute("aria-expanded", open); });
    menu.addEventListener("click", ev => {
      const o = ev.target.closest(".theme-opt"); if (!o) return;
      S.theme = o.dataset.t; saveS(); applyTheme(S.theme); close();
      toast(`Đã đổi sang màu ${THEMES.find(x => x.id === S.theme).name}`);
    });
    document.addEventListener("click", ev => { if (!ev.target.closest(".themes")) close(); });
    document.addEventListener("keydown", ev => { if (ev.key === "Escape") close(); });
    applyTheme(S.theme || "reu");
  })();

  /* ------------------------------------------------------------ bật tắt */
  function paintToggles() {
    $$("[data-toggle]").forEach(b => b.setAttribute("aria-pressed", !!S[b.dataset.toggle]));
  }
  function flip(key) {
    S[key] = !S[key]; saveS(); paintToggles();
    toast(key === "kanji" ? (S.kanji ? "Đang hiện chữ Hán kèm pinyin" : "Đang hiện bằng pinyin") : key === "furi" ? (S.furi ? "Đang hiện pinyin trên chữ" : "Đã ẩn pinyin, chỉ hiện chữ Hán") : (S.romaji ? "Đang hiện dòng pinyin" : "Đã ẩn dòng pinyin"));
    if (current && current.refresh) current.refresh(); else route();
  }
  $$("[data-toggle]").forEach(b => b.addEventListener("click", () => flip(b.dataset.toggle)));
  document.addEventListener("keydown", ev => {
    if (ev.target.matches("input, textarea") || ev.metaKey || ev.ctrlKey || ev.altKey) return;
    if (ev.key === "k" || ev.key === "K") flip("kanji");
    if (ev.key === "f" || ev.key === "F") flip("furi");
  });

  /* ------------------------------------------------------------ cầu nối với assets/auth.js (đăng nhập + đồng bộ) */
  window.MD.sync = {
    snapshot: () => ({ progress: JSON.parse(JSON.stringify(P)), placement: store.get("placement", null) }),
    onChange: fn => listeners.push(fn),
    toast,
    apply(blob) {   // ghi tiến độ đã gộp vào thiết bị; không kích hoạt đồng bộ ngược
      const before = JSON.stringify([P, store.get("placement", null)]);
      const p = (blob && blob.progress) || {};
      P.ok = p.ok || {}; P.rv = p.rv || {}; P.gt = p.gt || {}; P.clr = p.clr || 0;
      store.set("progress", P);
      if (blob && blob.placement) store.set("placement", blob.placement); else { try { localStorage.removeItem("md:placement"); } catch (e) { /* bỏ qua */ } }
      paintReviewBadge();
      if (JSON.stringify([P, store.get("placement", null)]) !== before && !(current && current.destroy) && /^(#\/?)?$|^#\/(n[1-5]|review)?$/.test(location.hash)) route();
    }
  };

  paintToggles();
  paintReviewBadge();
  window.addEventListener("hashchange", route);
  route();
})();
