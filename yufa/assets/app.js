/* Super Yufa — ngữ pháp HSK 3.0. Ứng dụng một trang, không cần build. Dữ liệu: data/gram.js (window.YF). */
(function () {
  "use strict";
  const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const esc = t => String(t == null ? "" : t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const main = $("#main");
  const PATS = YF.pats, G = YF.meta.groups, CV = YF.meta.cv;
  const LVN = { 1: "HSK 1", 2: "HSK 2", 3: "HSK 3", 4: "HSK 4", 5: "HSK 5", 6: "HSK 6", 7: "HSK 7–9" };
  const LVD = { 1: "Câu cơ bản, từ loại thường dùng, hỏi đáp và thời gian", 2: "Bổ ngữ, so sánh, thể động tác và liên từ đầu tiên", 3: "Câu phức, bổ ngữ xu hướng, bị động và nhấn mạnh", 4: "Cấu trúc trung cấp, câu phức nhiều tầng", 5: "Ngữ pháp trang trọng và văn viết", 6: "Cấu trúc cố định, văn phong báo chí", 7: "Cao cấp: văn học, học thuật, cấu trúc hiếm" };
  const byId = {}; PATS.forEach(p => { byId[p.id] = p; });
  const byLv = l => PATS.filter(p => p.lv === l);
  const gName = g => (G.find(x => x.id === g) || { vi: g }).vi;
  const cName = c => CV[c] || c;
  const S = RZSync.create("yufa");
  const P = S.P, now = S.now;
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const rnd = a => a[Math.floor(Math.random() * a.length)];
  const fmt = n => n.toLocaleString("vi-VN");
  const known = id => !!P.ok[id];
  const setKnown = (id, b) => { if (b) { P.ok[id] = now(); delete P.rv[id]; } else { delete P.ok[id]; P.rv[id] = now(); } S.save(); badge(); };
  const knownIn = L => L.filter(p => known(p.id)).length;
  const bar = (a, b) => `<div class="bar"><i style="width:${b ? Math.round(100 * a / b) : 0}%"></i></div>`;
  const pill = (t, b) => `<span class="pill">${t}${b != null ? " <b>" + b + "</b>" : ""}</span>`;
  const hero = (t, sub, pills) => `<section class="kh"><div class="kh__in"><div><h1>${t}</h1>${sub ? `<p>${sub}</p>` : ""}</div><div class="kh__stat">${pills || ""}</div></div></section>`;
  const toastEl = $(".toast"); let toastT;
  const toast = t => { toastEl.textContent = t; toastEl.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove("show"), 2400); };
  function badge() { const n = Object.keys(P.rv).length; $$("[data-review-count]").forEach(b => { b.textContent = n; b.hidden = !n; }); }

  /* ---------- pinyin ruby: 学[xué]习[xí] ---------- */
  const RB = /([㐀-鿿])\[([^\]]+)\]/g;
  const plain = t => (t || "").replace(RB, "$1");
  const py = t => (t || "").replace(RB, "$2");
  const ruby = t => esc(t).replace(RB, "<ruby>$1<rt>$2</rt></ruby>");
  let SHOW_PY = true; try { SHOW_PY = localStorage.getItem("renzhen:yufa:py") !== "0"; } catch (e) { /* bỏ qua */ }

  /* ---------- đọc thành tiếng (zh-CN) ---------- */
  let zh = null;
  function pickVoice() { if (!("speechSynthesis" in window)) return; const v = speechSynthesis.getVoices(); zh = v.find(x => /^zh[-_]CN/i.test(x.lang) && /google|xiaoxiao|yunxi|tingting|huihui/i.test(x.name)) || v.find(x => /^zh[-_]CN/i.test(x.lang)) || v.find(x => /^zh/i.test(x.lang)) || null; }
  if ("speechSynthesis" in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
  function speak(text) {
    if (!("speechSynthesis" in window)) return toast("Trình duyệt này chưa hỗ trợ đọc thành tiếng.");
    speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = "zh-CN"; if (zh) u.voice = zh; u.rate = .85; speechSynthesis.speak(u);
  }
  const SPK = '<button class="ib" type="button" data-say aria-label="Nghe đọc" title="Nghe đọc"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/></svg></button>';
  document.addEventListener("click", e => { const b = e.target.closest("[data-say]"); if (b) { e.preventDefault(); speak(b.dataset.say || ""); } });

  /* ---------- điều hướng ---------- */
  function setNav(k) { $$("[data-nav]").forEach(a => a.classList.toggle("is-on", a.dataset.nav === k)); }
  let KEYS = null;
  document.addEventListener("keydown", e => { if (e.target.closest && e.target.closest("input,textarea")) return; if (KEYS && !e.repeat) KEYS(e); });

  /* ---------- trang chủ: theo cấp độ ---------- */
  function home() {
    const cards = [1, 2, 3, 4, 5, 6, 7].map(l => {
      const L = byLv(l), k = knownIn(L), withEx = L.filter(p => p.ex.length).length;
      return `<a class="card card--lv" data-lv="${l}" href="#/cap-do/${l}"><div class="card__top"><span class="big">${LVN[l]}</span><span class="pill">${L.length} điểm</span></div><p>${LVD[l]}</p>${bar(k, L.length)}<p>Đã thuộc ${k}/${L.length} · ${withEx} điểm có ví dụ</p></a>`;
    });
    main.innerHTML = hero("Ngữ pháp HSK 3.0 theo cấp độ", "Mỗi điểm ngữ pháp lấy từ phụ lục A của chuẩn HSK 3.0 (GF 0025—2021): có mẫu, nhóm phân loại, ví dụ kèm pinyin, nghe đọc và bài luyện.", pill("Tổng số điểm", PATS.length) + pill("Đã thuộc", knownIn(PATS))) +
      `<div class="wrap lvgrid"><div class="lvrow">${cards[0]}${cards[1]}</div><div class="lvrow">${cards[2]}${cards[3]}</div><div class="lvrow">${cards[4]}${cards[5]}</div><div class="lvrow lvrow--1">${cards[6]}</div></div>`;
  }

  /* ---------- danh sách điểm ngữ pháp ---------- */
  const patRow = p => `<a class="yf-pat${known(p.id) ? " is-ok" : ""}" href="#/mau/${p.id}"><span class="yf-no">${String(p.n).padStart(3, "0")}</span><span><div class="yf-pt" lang="zh">${esc(p.p)}</div>${p.vi ? `<div class="yf-ms">${esc(p.vi.slice(0, 120))}${p.vi.length > 120 ? "…" : ""}</div>` : ""}<div class="yf-cat">${esc(gName(p.g))} · ${esc(cName(p.c))}${p.d ? " · " + esc(p.d.slice(0, 20)) : ""}</div></span><span class="pill">${LVN[p.lv].replace("HSK ", "H")}</span></a>`;
  function listPage(title, sub, L, back, key, lv) {
    const groups = G.map(g => ({ g, L: L.filter(p => p.g === g.id) })).filter(x => x.L.length);
    main.innerHTML = hero(title, sub, pill("Số điểm", L.length) + pill("Đã thuộc", knownIn(L) + "/" + L.length)) +
      `<div class="wrap"><a class="crumb" href="${back}">← Quay lại</a>
      <div class="yf-tools"><a class="btn btn--primary" href="#/luyen/${key}/the">Flashcard</a><a class="btn btn--ghost" href="#/luyen/${key}/dien">Điền chỗ trống</a><a class="btn btn--ghost" href="#/luyen/${key}/sapxep">Sắp xếp câu</a>${lv ? `<a class="btn btn--coral" href="#/luyen/${key}/test">Bài test 10 câu</a>` : ""}</div>
      ${groups.map(x => `<h2 class="yf-sec">${esc(x.g.vi)} <small>(${x.L.length})</small></h2><div class="yf-list">${x.L.map(patRow).join("")}</div>`).join("")}</div>`;
  }
  const scope = key => key === "all" ? PATS : key === "on-tap" ? PATS.filter(p => P.rv[p.id]) : /^c\d$/.test(key) ? byLv(+key.slice(1)) : PATS.filter(p => p.g === key);
  const scopeTitle = key => key === "all" ? "Tất cả" : key === "on-tap" ? "Cần ôn" : /^c\d$/.test(key) ? LVN[+key.slice(1)] : gName(key);
  const scopeBack = key => /^c\d$/.test(key) ? "#/cap-do/" + key.slice(1) : key === "on-tap" ? "#/on-tap" : key === "all" ? "#/" : "#/nhom/" + encodeURIComponent(key);

  function nhom(g) {
    if (!g) {
      main.innerHTML = hero("Nhóm ngữ pháp", "Phân loại theo chính mục lục của chuẩn: từ loại, thành phần câu, loại câu, cấu trúc cố định, cách hỏi, cách nhấn mạnh, khẩu ngữ…", pill("Số nhóm", G.length)) +
        `<div class="wrap yf-groups">${G.map(x => { const L = PATS.filter(p => p.g === x.id); return `<a class="card" href="#/nhom/${encodeURIComponent(x.id)}"><div class="card__top"><span class="big" lang="zh" style="font-size:26px">${x.zh}</span><span class="pill">${L.length}</span></div><h3>${x.vi}</h3>${bar(knownIn(L), L.length)}<p>Đã thuộc ${knownIn(L)}/${L.length}</p></a>`; }).join("")}</div>`;
      return;
    }
    const L = PATS.filter(p => p.g === g); if (!L.length) return home();
    listPage(gName(g), "Các điểm ngữ pháp thuộc nhóm này ở mọi cấp, có nhãn H1–H7 cạnh từng điểm.", L, "#/nhom", g, false);
  }

  /* ---------- chi tiết ---------- */
  function mau(id) {
    const p = byId[id]; if (!p) return home();
    const i = PATS.indexOf(p), prev = PATS[i - 1], next = PATS[i + 1];
    const sent = p.ex.map(e => `<div class="yf-sent"><div><div class="jp ${SHOW_PY ? "" : "yf-hide"}" lang="zh">${ruby(e.zh)}</div>${e.vi ? `<div class="yf-vi">${esc(e.vi)}</div>` : ""}</div>${SPK.replace("data-say", `data-say="${esc(plain(e.zh))}"`)}</div>`).join("");
    main.innerHTML = hero(`<span lang="zh" style="font-size:${p.p.length > 30 ? 22 : p.p.length > 14 ? 30 : 48}px;display:block;line-height:1.35">${esc(p.p)}</span>`, `${esc(gName(p.g))} · ${esc(cName(p.c))}${p.d ? " · " + esc(p.d) : ""}`, pill("Cấp", LVN[p.lv]) + pill("Số", String(p.n).padStart(3, "0"))) +
      `<div class="wrap"><a class="crumb" href="#/cap-do/${p.lv}">← ${LVN[p.lv]}</a>
      <div class="yf-tools"><button class="btn ${known(p.id) ? "btn--ghost" : "btn--primary"}" data-known>${known(p.id) ? "✓ Đã thuộc (bỏ đánh dấu)" : "Đánh dấu đã thuộc"}</button><button class="btn btn--ghost" data-py>${SHOW_PY ? "Ẩn pinyin" : "Hiện pinyin"}</button><button class="btn btn--ghost" data-say="${esc(plain(p.p).replace(/[^㐀-鿿]/g, ""))}">Nghe mẫu</button></div>
      <h2 class="yf-sec">Giải thích</h2>
      ${p.vi ? `<div class="yf-box">${esc(p.vi)}</div>` : `<div class="yf-note">Điểm này chưa có giải thích tiếng Việt. Mẫu và ví dụ lấy nguyên từ chuẩn HSK 3.0; phần giải thích tiếng Việt cho cấp này đang được bổ sung.</div>`}
      ${p.forms.length ? `<h2 class="yf-sec">Từ và cụm minh họa theo chuẩn</h2><div class="yf-forms">${p.forms.map(f => `<span lang="zh">${SHOW_PY ? ruby(f) : esc(plain(f))}</span>`).join("")}</div>` : ""}
      ${sent ? `<h2 class="yf-sec">Ví dụ (${p.ex.length})</h2>${sent}` : `<div class="yf-note">Chưa có câu ví dụ cho điểm này trong dữ liệu đã trích từ chuẩn.</div>`}
      <div class="yf-tools" style="margin-top:20px">${prev ? `<a class="btn btn--ghost" href="#/mau/${prev.id}">← Điểm trước</a>` : ""}${next ? `<a class="btn btn--ghost" href="#/mau/${next.id}">Điểm sau →</a>` : ""}</div></div>`;
    $("[data-known]").onclick = () => { setKnown(p.id, !known(p.id)); mau(id); };
    $("[data-py]").onclick = () => { SHOW_PY = !SHOW_PY; try { localStorage.setItem("renzhen:yufa:py", SHOW_PY ? "1" : "0"); } catch (e) { /* bỏ qua */ } mau(id); };
  }

  /* ---------- luyện tập ---------- */
  const COMMON = ["的", "了", "在", "把", "被", "比", "就", "都", "也", "还", "很", "不", "没", "过", "着", "得", "地", "会", "能", "要", "和", "跟", "从", "对", "给", "又", "再", "才", "但是", "因为", "所以", "如果", "虽然"];
  function markers(p) {
    const raw = p.p.replace(/[（(][^）)]*[）)]/g, "").replace(/\d/g, "");
    return [...new Set(raw.split(/[、；;，,/／\s…·.:：“”"'+＋]+/).map(x => x.trim()).filter(x => /^[㐀-鿿]{1,3}$/.test(x)))];
  }
  function mkCloze(p) {
    const ms = markers(p); if (!ms.length || !p.ex.length) return null;
    for (const e of shuffle(p.ex)) {
      const t = plain(e.zh), hit = ms.filter(m => t.includes(m)).sort((a, b) => b.length - a.length)[0];
      if (!hit) continue;
      const others = ms.filter(m => m !== hit);
      const opts = shuffle([hit, ...shuffle(others).slice(0, 3), ...shuffle(COMMON.filter(c => c !== hit && !t.includes(c) && !others.includes(c)))].filter((v, i, a) => a.indexOf(v) === i).slice(0, 4));
      if (opts.length < 3 || !opts.includes(hit)) continue;
      /* thay dấu hiệu trong chuỗi ruby: tìm lần xuất hiện đầu tiên theo chữ */
      const chars = hit.split(""); let s = e.zh, idx = -1;
      const bare = plain(e.zh), pos = bare.indexOf(hit);
      let n = 0, out = "", ci = 0;
      for (const m of e.zh.matchAll(/([㐀-鿿])(?:\[[^\]]+\])?|[^]/g)) {
        const ch = m[1] || m[0];
        if (ci >= pos && ci < pos + chars.length && m[1]) { if (ci === pos) out += "\u0001"; ci++; continue; }
        out += m[0]; if (m[1] || true) ci++;
      }
      return { p, kind: "cloze", big: ruby(out).replace("\u0001", '<span class="yf-blank">　　</span>'), ask: "Chọn từ điền vào chỗ trống", opts: opts.map(o => ({ t: o, ok: o === hit })), say: bare, explain: `${bare} · điểm ngữ pháp: ${p.p}` };
    }
    return null;
  }
  function mkOrder(p) {
    const es = shuffle(p.ex.filter(e => e.seg && e.seg.length >= 3)); if (!es.length) return null;
    const e = es[0];
    return { p, kind: "order", ask: "Sắp xếp các thành phần thành câu đúng", seg: e.seg, say: plain(e.zh), explain: plain(e.zh) };
  }
  function runQuiz(qs, o) {
    let i = 0, ok = 0, ans = null, streakTok = [];
    CTXBAR(o.title);
    KEYS = null;
    const done = () => {
      main.innerHTML = `<div class="stage"><div class="res"><div class="res__score">${ok}<small>/${qs.length}</small></div><p>${o.test ? (ok >= Math.ceil(qs.length * .8) ? "Đạt yêu cầu (≥ 80%)." : "Chưa đạt 80%. Hãy ôn lại rồi thử tiếp.") : "Hoàn thành bài luyện."}</p><div class="act" style="justify-content:center"><a class="btn btn--ghost" href="${o.back}">Thoát</a><button class="btn btn--primary" data-again>Làm lại</button></div></div></div>`;
      $("[data-again]").onclick = () => o.again(); if (o.onDone) o.onDone(ok, qs.length);
    };
    const render = () => {
      const q = qs[i]; ans = null; streakTok = [];
      const head = `<div class="sbar"><a class="x" href="${o.back}">✕ Thoát</a>${bar(i, qs.length)}<span class="cnt">${i + 1}/${qs.length}</span></div>`;
      if (q.kind === "cloze") {
        main.innerHTML = `<div class="stage">${head}<div class="q yf-q"><p class="q__ask">${q.ask}</p><div class="q__big ${SHOW_PY ? "" : "yf-hide"}" lang="zh">${q.big}</div><div class="opts">${q.opts.map((op, n) => `<button type="button" class="opt" data-o="${n}"><i>${n + 1}</i><span lang="zh">${esc(op.t)}</span></button>`).join("")}</div><div id="fb"></div></div><div class="act"><span></span><button class="btn btn--ghost" data-skip>Bỏ qua</button></div></div>`;
        const pick = n => {
          if (ans != null) return; ans = n; const r = q.opts[n].ok; if (r) ok++; else { P.rv[q.p.id] = now(); S.save(); badge(); }
          $$("[data-o]").forEach((b, k) => { b.disabled = true; if (q.opts[k].ok) b.classList.add("is-right"); else if (k === n) b.classList.add("is-wrong"); });
          $("#fb").innerHTML = `<div class="feedback ${r ? "ok" : "no"}"><b>${r ? "Chính xác!" : "Chưa đúng"}</b> <span lang="zh">${esc(q.explain)}</span> <a href="#/mau/${q.p.id}">Xem điểm ngữ pháp</a></div>`;
          $(".act").innerHTML = `<span></span><button class="btn btn--primary" data-next>${i < qs.length - 1 ? "Câu tiếp →" : "Xem kết quả"}</button>`; $("[data-next]").onclick = next; $("[data-next]").focus({ preventScroll: true });
          if (o.test === undefined) null;
        };
        $$("[data-o]").forEach(b => b.onclick = () => pick(+b.dataset.o)); $("[data-skip]").onclick = () => { P.rv[q.p.id] = now(); S.save(); badge(); next(); };
        KEYS = e => { if (e.key >= "1" && e.key <= "4") { const n = +e.key - 1; if (q.opts[n]) pick(n); } else if ((e.key === "Enter" || e.key === " ") && ans != null) { e.preventDefault(); next(); } };
      } else {
        const toks = shuffle(q.seg.map((t, k) => ({ t, k })));
        main.innerHTML = `<div class="stage">${head}<div class="q yf-q"><p class="q__ask">${q.ask}</p><div class="yf-order" id="ord"></div><div class="yf-order" id="pool" style="border-style:solid"></div><div id="fb"></div></div><div class="act"><button class="btn btn--ghost" data-reset>Làm lại</button><button class="btn btn--primary" data-check>Kiểm tra</button></div></div>`;
        const draw = () => {
          $("#ord").innerHTML = streakTok.map(t => `<button type="button" class="yf-tok ${SHOW_PY ? "" : "yf-hide"}" data-u="${t.k}" lang="zh">${ruby(t.t)}</button>`).join("");
          $("#pool").innerHTML = toks.filter(t => !streakTok.includes(t)).map(t => `<button type="button" class="yf-tok ${SHOW_PY ? "" : "yf-hide"}" data-p="${t.k}" lang="zh">${ruby(t.t)}</button>`).join("");
          $$("[data-p]").forEach(b => b.onclick = () => { streakTok.push(toks.find(t => t.k === +b.dataset.p)); draw(); });
          $$("[data-u]").forEach(b => b.onclick = () => { streakTok = streakTok.filter(t => t.k !== +b.dataset.u); draw(); });
        };
        draw();
        $("[data-reset]").onclick = () => { streakTok = []; draw(); };
        $("[data-check]").onclick = () => {
          if (ans != null) return next();
          const right = streakTok.length === q.seg.length && streakTok.map(t => plain(t.t)).join("") === q.seg.map(plain).join("");
          ans = right ? 1 : 0; if (right) ok++; else { P.rv[q.p.id] = now(); S.save(); badge(); }
          $("#fb").innerHTML = `<div class="feedback ${right ? "ok" : "no"}"><b>${right ? "Chính xác!" : "Chưa đúng"}</b> <span lang="zh">${esc(q.explain)}</span> <button class="ib" data-say="${esc(q.say)}" type="button">🔊</button> <a href="#/mau/${q.p.id}">Xem điểm ngữ pháp</a></div>`;
          $("[data-check]").textContent = i < qs.length - 1 ? "Câu tiếp →" : "Xem kết quả";
        };
      }
    };
    const next = () => { if (i < qs.length - 1) { i++; render(); } else done(); };
    render();
  }
  function CTXBAR(t) { const cb = $("#ctxbar"); if (cb) { cb.innerHTML = `<b>${esc(t || "")}</b>`; cb.hidden = !t; } }

  function luyen(key, mode) {
    const L = scope(key), back = scopeBack(key), title = scopeTitle(key);
    if (!L.length) { main.innerHTML = `<div class="wrap"><p class="empty">Chưa có điểm ngữ pháp nào trong phạm vi này. <a href="${back}">Quay lại</a></p></div>`; return; }
    if (mode === "the") return flash(L, back, title);
    const start = () => {
      const maker = mode === "sapxep" ? mkOrder : mkCloze, N = mode === "test" ? 10 : 12;
      const qs = []; for (const p of shuffle(L)) { const q = maker(p); if (q) qs.push(q); if (qs.length >= N) break; }
      if (!qs.length) { main.innerHTML = `<div class="wrap"><p class="empty">Phạm vi này chưa đủ ví dụ để tạo bài ${mode === "sapxep" ? "sắp xếp câu" : "điền chỗ trống"}. <a href="${back}">Quay lại</a></p></div>`; return; }
      runQuiz(qs, { title: title + " · " + (mode === "sapxep" ? "Sắp xếp câu" : mode === "test" ? "Bài test" : "Điền chỗ trống"), back, again: start, test: mode === "test" });
    };
    start();
  }
  function flash(L, back, title) {
    let q = shuffle(L), i = 0, flip = false;
    CTXBAR(title + " · Flashcard");
    const render = () => {
      if (i >= q.length) { main.innerHTML = `<div class="stage"><div class="res"><div class="res__score">${q.length}<small> thẻ</small></div><p>Bạn đã xem hết bộ thẻ.</p><div class="act" style="justify-content:center"><a class="btn btn--ghost" href="${back}">Thoát</a><button class="btn btn--primary" data-again>Học lại</button></div></div></div>`; $("[data-again]").onclick = () => { q = shuffle(L); i = 0; flip = false; render(); }; return; }
      const p = q[i], e = p.ex[0];
      main.innerHTML = `<div class="stage"><div class="sbar"><a class="x" href="${back}">✕ Thoát</a>${bar(i, q.length)}<span class="cnt">${i + 1}/${q.length}</span></div>
        <div class="q yf-q" data-flip tabindex="0" style="cursor:pointer;min-height:260px"><p class="q__ask">${LVN[p.lv]} · ${esc(gName(p.g))} · ${esc(cName(p.c))}</p><div class="q__big" lang="zh">${esc(p.p)}</div>
        ${flip ? `<div class="yf-box" style="margin-top:12px">${p.vi ? esc(p.vi) : "Chưa có giải thích tiếng Việt; xem mẫu và ví dụ theo chuẩn."}</div>${e ? `<div class="yf-sent"><div class="jp ${SHOW_PY ? "" : "yf-hide"}" lang="zh">${ruby(e.zh)}</div></div>` : ""}` : `<p class="q__vi" style="margin-top:16px">Bấm để lật thẻ</p>`}</div>
        <div class="act"><button class="btn btn--coral" data-no>↺ Chưa thuộc</button><button class="btn btn--ghost" data-flipb>Lật thẻ</button><button class="btn btn--primary" data-yes>✓ Đã thuộc</button></div></div>`;
      $("[data-flip]").onclick = () => { flip = !flip; render(); }; $("[data-flipb]").onclick = () => { flip = !flip; render(); };
      $("[data-yes]").onclick = () => { setKnown(p.id, true); i++; flip = false; render(); }; $("[data-no]").onclick = () => { setKnown(p.id, false); i++; flip = false; render(); };
      KEYS = ev => { if (ev.key === " ") { ev.preventDefault(); flip = !flip; render(); } else if (ev.key === "1") $("[data-no]").click(); else if (ev.key === "2") $("[data-yes]").click(); };
    };
    render();
  }

  /* ---------- test đầu vào: 5 câu điền chỗ trống mỗi cấp ---------- */
  function test() {
    const done = [1, 2, 3, 4, 5, 6, 7].filter(l => (P.place[l] || {}).pass);
    main.innerHTML = hero("Test đầu vào", "Chọn cấp muốn thử. Mỗi bài có 10 câu điền chỗ trống từ ví dụ của chuẩn HSK 3.0. Đạt từ 80% thì nên thử cấp cao hơn.", pill("Cấp cao nhất đã qua", done.length ? LVN[Math.max(...done)] : "Chưa có")) +
      `<div class="wrap lvgrid"><div class="lvrow">${[1, 2, 3, 4, 5, 6, 7].map(l => { const st = P.place[l] || {}; return `<a class="card card--lv" href="#/luyen/c${l}/test"><div class="card__top"><span class="big">${LVN[l]}</span><span class="pill">10 câu</span></div><p>${st.pass ? "✓ Đã qua · " + st.best + "/10" : "Sẵn sàng" + (st.best != null ? " · cao nhất " + st.best + "/10" : "")}</p></a>`; }).join("")}</div></div>`;
  }
  const _luyen = luyen;
  luyen = function (key, mode) { _luyen(key, mode); };

  /* ---------- giáo trình ---------- */
  function giaotrinh() {
    main.innerHTML = hero("Giáo trình", "Ngữ pháp theo từng bài của giáo trình bạn đang học.", "") +
      `<div class="wrap"><div class="yf-note" style="background:var(--mint-soft);color:var(--ink)"><b>Đang chờ giáo trình.</b> Khi bạn gửi giáo trình, mỗi bài sẽ được gắn với các điểm ngữ pháp HSK 3.0 tương ứng và hiện ở đây, có luyện tập riêng theo từng bài. Hiện tại bạn có thể học theo <a href="#/">cấp độ</a> hoặc <a href="#/nhom">nhóm ngữ pháp</a>.</div></div>`;
  }

  /* ---------- tìm kiếm ---------- */
  const fold = t => (t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/[1-5\s'’]/g, "");
  function search(q) {
    main.innerHTML = hero("Tìm điểm ngữ pháp", "Gõ chữ Hán (như 比, 了, 把), pinyin hoặc từ khóa tiếng Việt trong phần giải thích.", "") +
      `<div class="wrap"><input class="inp" id="q" type="search" placeholder="Ví dụ: 比, bi, so sánh, bổ ngữ…" value="${esc(q)}" style="width:100%;padding:12px 16px;font-size:17px;border:1px solid var(--line);border-radius:var(--r)"><div id="res" class="yf-list"></div></div>`;
    const run = () => {
      const v = $("#q").value.trim(), f = fold(v); if (!v) { $("#res").innerHTML = ""; return; }
      const sc = PATS.map(p => { let s = 0; if (p.p.includes(v) || (p.d || "").includes(v) || p.c.includes(v)) s = 90; else if (f && p.ex.some(e => plain(e.zh).includes(v))) s = 40; else if (f && fold(p.ex.map(e => py(e.zh)).join("")).includes(f) && f.length > 1 && !/[㐀-鿿]/.test(v)) s = 30; if (s < 90 && p.vi && p.vi.toLowerCase().includes(v.toLowerCase())) s = Math.max(s, 60); return { p, s }; }).filter(x => x.s).sort((a, b) => b.s - a.s).slice(0, 60);
      $("#res").innerHTML = sc.length ? sc.map(x => patRow(x.p)).join("") : `<p class="empty">Không có kết quả.</p>`;
    };
    $("#q").oninput = run; run(); $("#q").focus();
  }

  /* ---------- cần ôn ---------- */
  function onTap() {
    const L = PATS.filter(p => P.rv[p.id]);
    main.innerHTML = hero("Cần ôn", "Điểm ngữ pháp bạn làm sai hoặc đánh dấu chưa thuộc sẽ nằm ở đây.", pill("Số điểm", L.length)) +
      `<div class="wrap">${L.length ? `<div class="yf-tools"><a class="btn btn--primary" href="#/luyen/on-tap/the">Flashcard</a><a class="btn btn--ghost" href="#/luyen/on-tap/dien">Điền chỗ trống</a><a class="btn btn--ghost" href="#/luyen/on-tap/sapxep">Sắp xếp câu</a></div><div class="yf-list">${L.map(patRow).join("")}</div>` : `<p class="empty">Chưa có điểm nào cần ôn.</p>`}</div>`;
  }

  /* ---------- định tuyến ---------- */
  function route() {
    KEYS = null; speechSynthesis && speechSynthesis.cancel && speechSynthesis.cancel(); CTXBAR("");
    const seg = location.hash.replace(/^#\/?/, "").split("?")[0].split("/").filter(Boolean).map(decodeURIComponent);
    const qs = new URLSearchParams((location.hash.split("?")[1]) || "");
    const t = seg[0] || "cap-do"; setNav(["luyen"].includes(t) ? "" : t === "mau" ? "cap-do" : t); window.scrollTo(0, 0); badge();
    document.title = "Super Yufa — Ngữ pháp HSK 3.0";
    if (t === "cap-do" && seg[1]) { const l = +seg[1]; if (!LVN[l]) return home(); return listPage(LVN[l], LVD[l], byLv(l), "#/", "c" + l, true); }
    if (t === "cap-do") return home();
    if (t === "nhom") return nhom(seg[1]);
    if (t === "mau") return mau(seg[1]);
    if (t === "luyen") return luyen(seg[1], seg[2]);
    if (t === "giao-trinh") return giaotrinh();
    if (t === "tim-kiem") return search(qs.get("q") || "");
    if (t === "test") return test();
    if (t === "on-tap") return onTap();
    home();
  }
  window.addEventListener("hashchange", route);
  S.onSynced(() => { if (!/^#\/luyen\//.test(location.hash)) route(); });
  route();
})();
