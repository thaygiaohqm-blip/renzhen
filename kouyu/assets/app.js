/* Super Kouyu — luyện nói HSKK. Một trang, không cần build. Dữ liệu: data/kouyu.js (window.KY). */
(function () {
  "use strict";
  const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const esc = t => String(t == null ? "" : t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const main = $("#main"), S = RZSync.create("kouyu"), P = S.P, now = S.now;
  const RB = /([㐀-鿿])\[([^\]]+)\]/g;
  const plain = t => String(t || "").replace(RB, "$1");
  const ruby = t => esc(t).replace(RB, "<ruby>$1<rt>$2</rt></ruby>");
  const pyl = t => String(t || "").replace(RB, "$2 ").replace(/\s+/g, " ").trim();
  let SHOW_PY = true; try { SHOW_PY = localStorage.getItem("renzhen:kouyu:py") !== "0"; } catch (e) { /* bỏ qua */ }
  const bar = (a, b) => `<div class="bar"><i style="width:${b ? Math.round(100 * a / b) : 0}%"></i></div>`;
  const pill = (t, b) => `<span class="pill">${t}${b != null ? " <b>" + b + "</b>" : ""}</span>`;
  const hero = (t, sub, pills) => `<section class="kh"><div class="kh__in"><div><h1>${t}</h1>${sub ? `<p>${sub}</p>` : ""}</div><div class="kh__stat">${pills || ""}</div></div></section>`;
  const toastEl = $(".toast"); let toastT;
  const toast = t => { toastEl.textContent = t; toastEl.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove("show"), 2400); };

  /* ---------- cấu trúc đề ---------- */
  const LV = {
    chu: { zh: "初级", vi: "Sơ cấp", sub: "Tương đương khoảng HSK 1–2: câu ngắn, chủ đề đời sống hằng ngày.", parts: ["repeat", "answer", "qa"] },
    zhong: { zh: "中级", vi: "Trung cấp", sub: "Tương đương khoảng HSK 3–4: câu dài hơn, mô tả tranh và nêu ý kiến ngắn.", parts: ["repeat", "pic", "qa"] },
    gao: { zh: "高级", vi: "Cao cấp", sub: "Tương đương khoảng HSK 5–6: thuật lại, đọc to và trình bày quan điểm.", parts: ["retell", "read", "qa"] }
  };
  const PT = {
    repeat: { zh: "听后重复", vi: "Nghe rồi nhắc lại", ex: { chu: 15, zhong: 10 }, how: "Nghe một câu, nhắc lại đúng và rõ ràng ngay sau khi nghe." },
    answer: { zh: "听后回答", vi: "Nghe rồi trả lời", ex: { chu: 10 }, how: "Nghe một câu hỏi ngắn, trả lời ngay bằng một câu hoàn chỉnh." },
    pic: { zh: "看图说话", vi: "Xem tranh nói", ex: { zhong: 2 }, how: "Nhìn tranh, nói chuyện gì đang diễn ra bằng một đoạn liền mạch." },
    retell: { zh: "听后复述", vi: "Nghe rồi thuật lại", ex: { gao: 3 }, how: "Nghe một đoạn văn, thuật lại nội dung chính bằng lời của mình." },
    read: { zh: "朗读", vi: "Đọc to", ex: { gao: 1 }, how: "Đọc to một đoạn văn: đúng chữ, đúng thanh điệu, ngắt nghỉ tự nhiên." },
    qa: { zh: "回答问题", vi: "Trả lời câu hỏi", ex: { chu: 2, zhong: 2, gao: 2 }, how: "Đọc câu hỏi, chuẩn bị trong thời gian ngắn rồi trả lời liền mạch." }
  };
  /* gợi ý bấm giờ khi luyện: [chuẩn bị, nói] (giây) */
  const TM = { "chu.qa": [15, 30], "zhong.pic": [30, 60], "zhong.qa": [30, 60], "gao.retell": [0, 90], "gao.read": [60, 120], "gao.qa": [60, 120] };
  const PK = { r: "repeat", a: "answer", q: "qa", p: "pic", t: "retell", d: "read" };
  const ALL = []; Object.keys(LV).forEach(l => LV[l].parts.forEach(p => (KY[l][p] || []).forEach((it, i) => { it._l = l; it._p = p; it._i = i; ALL.push(it); })));
  const byId = {}; ALL.forEach(it => { byId[it.id] = it; });
  const list = (l, p) => KY[l][p] || [];
  const done = id => !!P.ok[id];
  const setDone = (id, b) => { if (b) P.ok[id] = now(); else delete P.ok[id]; S.save(); };
  const cnt = (l, p) => list(l, p).filter(x => done(x.id)).length;

  /* ---------- đọc thành tiếng ---------- */
  let zh = null;
  function pickVoice() { if (!("speechSynthesis" in window)) return; const v = speechSynthesis.getVoices(); zh = v.find(x => /^zh[-_]CN/i.test(x.lang) && /google|xiaoxiao|yunxi|tingting|huihui/i.test(x.name)) || v.find(x => /^zh[-_]CN/i.test(x.lang)) || v.find(x => /^zh/i.test(x.lang)) || null; }
  if ("speechSynthesis" in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
  function speak(text, rate, onend) {
    if (!("speechSynthesis" in window)) { toast("Trình duyệt này chưa hỗ trợ đọc thành tiếng."); if (onend) onend(); return; }
    speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(plain(text)); u.lang = "zh-CN"; if (zh) u.voice = zh; u.rate = rate || .9;
    if (onend) { u.onend = onend; u.onerror = onend; } speechSynthesis.speak(u);
  }
  const SPK = (t, label, rate) => `<button class="btn btn--ghost btn--sm" type="button" data-say="${esc(plain(t))}"${rate ? ` data-rate="${rate}"` : ""}>🔊 ${label || "Nghe"}</button>`;
  document.addEventListener("click", e => { const b = e.target.closest("[data-say]"); if (b) { e.preventDefault(); speak(b.dataset.say, parseFloat(b.dataset.rate) || .9); } });

  /* ---------- đồng hồ ---------- */
  let TMR = null;
  const stopTimer = () => { if (TMR) { clearInterval(TMR); TMR = null; } };
  const mmss = s => String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
  function beep() { try { const c = new (window.AudioContext || window.webkitAudioContext)(), o = c.createOscillator(), g = c.createGain(); o.connect(g); g.connect(c.destination); o.frequency.value = 880; g.gain.value = .08; o.start(); setTimeout(() => { o.stop(); c.close(); }, 180); } catch (e) { /* bỏ qua */ } }
  function countdown(sec, onTick, onEnd) { stopTimer(); let left = sec; onTick(left); TMR = setInterval(() => { left--; onTick(left); if (left <= 0) { stopTimer(); beep(); onEnd && onEnd(); } }, 1000); }

  /* ---------- ghi âm ---------- */
  function recorder(host) {
    host.innerHTML = `<div class="ky-timer"><button class="btn btn--ghost" type="button" data-rec>🎙 Ghi âm</button><span class="ky-phase" data-rs>Ghi lại giọng nói để nghe lại và so với bài mẫu. Bản ghi chỉ nằm trong trình duyệt, không được tải lên.</span></div><div data-ra></div>`;
    let mr = null, chunks = [], stream = null; const btn = $("[data-rec]", host), rs = $("[data-rs]", host), ra = $("[data-ra]", host);
    btn.onclick = async () => {
      if (mr && mr.state === "recording") { mr.stop(); return; }
      if (!navigator.mediaDevices || !window.MediaRecorder) return toast("Trình duyệt này chưa hỗ trợ ghi âm.");
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) { return toast("Chưa được cấp quyền micro."); }
      chunks = []; mr = new MediaRecorder(stream); mr.ondataavailable = e => chunks.push(e.data);
      mr.onstop = () => { stream.getTracks().forEach(t => t.stop()); const url = URL.createObjectURL(new Blob(chunks, { type: mr.mimeType || "audio/webm" })); ra.innerHTML = `<audio controls src="${url}"></audio>`; btn.classList.remove("is-rec"); btn.textContent = "🎙 Ghi âm lại"; rs.textContent = "Đã ghi xong. Bấm phát để nghe lại."; };
      mr.start(); btn.classList.add("is-rec"); btn.textContent = "⏹ Dừng ghi"; rs.textContent = "Đang ghi âm…";
    };
  }

  /* ---------- điều hướng ---------- */
  function setNav(k) { $$("[data-nav]").forEach(a => a.classList.toggle("is-on", a.dataset.nav === k)); }
  const levelDone = l => LV[l].parts.reduce((n, p) => n + cnt(l, p), 0), levelTotal = l => LV[l].parts.reduce((n, p) => n + list(l, p).length, 0);

  /* ---------- trang chủ ---------- */
  function home() {
    main.innerHTML = hero("Luyện nói HSKK", "Ba cấp sơ, trung, cao với đúng các dạng bài của kỳ thi nói HSKK. Mỗi bài có đề, bài nói mẫu kèm pinyin và bản dịch, nghe đọc, bấm giờ và ghi âm.", pill("Số bài", ALL.length) + pill("Đã luyện", ALL.filter(x => done(x.id)).length)) +
      `<div class="wrap"><div class="ky-parts">${Object.keys(LV).map(l => { const v = LV[l]; return `<a class="card card--lv" href="#/c/${l}"><div class="card__top"><span class="big" lang="zh">${v.zh}</span><span class="pill">${v.vi}</span></div><p>${v.sub}</p><p>${v.parts.map(p => PT[p].zh).join(" · ")}</p>${bar(levelDone(l), levelTotal(l))}<p>Đã luyện ${levelDone(l)}/${levelTotal(l)} bài</p></a>`; }).join("")}</div>
      <div class="ky-note"><b>Lưu ý.</b> Đề và bài mẫu ở đây do Claude biên soạn theo dạng đề HSKK để bạn luyện, không phải đề thi chính thức. Hãy tự nói trước, rồi mới xem bài mẫu để đối chiếu.</div></div>`;
  }

  /* ---------- hướng dẫn / cấu trúc đề ---------- */
  function guide() {
    const rows = Object.keys(LV).map(l => LV[l].parts.map((p, i) => `<tr>${i === 0 ? `<td rowspan="3"><b lang="zh">${LV[l].zh}</b><br>${LV[l].vi}</td>` : ""}<td><b lang="zh">${PT[p].zh}</b><br>${PT[p].vi}</td><td>${PT[p].ex[l]} ${p === "pic" ? "tranh" : p === "retell" ? "đoạn" : p === "read" ? "bài" : "câu"}</td><td>${PT[p].how}</td></tr>`).join("")).join("");
    main.innerHTML = hero("Cấu trúc đề HSKK", "HSKK là kỳ thi nói của hệ thống HSK, chia ba cấp: sơ cấp, trung cấp, cao cấp. Mỗi cấp có ba phần.", "") +
      `<div class="wrap"><table class="ky-struct"><thead><tr><th>Cấp</th><th>Phần thi</th><th>Số lượng</th><th>Yêu cầu</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="ky-panel"><h2>Mẹo luyện nói</h2><ul class="ky-tip"><li>Nghe nhắc lại: bắt chước cả ngữ điệu, đừng chỉ nhớ từ. Câu càng dài càng cần chia thành cụm.</li><li>Trả lời câu hỏi: nói câu hoàn chỉnh, thêm một lý do hoặc ví dụ, dùng liên từ như 因为、所以、而且、但是.</li><li>Xem tranh nói: bắt đầu bằng “图片里……”, nói ai, ở đâu, đang làm gì, rồi đến cảm nhận của bạn.</li><li>Thuật lại: nắm nhân vật, sự việc, kết quả; không cần nhớ từng chữ.</li><li>Đọc to: chậm vừa phải, chú ý thanh 3, thanh nhẹ, ngắt hơi ở dấu phẩy và dấu chấm.</li><li>Ghi âm và nghe lại bản thân; so với bài mẫu từng câu một.</li></ul></div>
      <p class="ky-vi">Thời gian chuẩn bị và nói ở từng bài trong ứng dụng chỉ là gợi ý luyện tập, hãy xem thông báo mới nhất của đơn vị tổ chức thi để biết quy định chính thức.</p></div>`;
  }

  /* ---------- trang cấp ---------- */
  function level(l) {
    const v = LV[l]; if (!v) return home();
    main.innerHTML = hero(`<span lang="zh">${v.zh}</span> · ${v.vi}`, v.sub, pill("Đã luyện", levelDone(l) + "/" + levelTotal(l))) +
      `<div class="wrap"><a class="crumb" href="#/">← Tất cả cấp</a><div class="ky-parts">${v.parts.map(p => `<a class="card" href="#/c/${l}/${p}"><div class="card__top"><span class="big" lang="zh" style="font-size:26px">${PT[p].zh}</span><span class="pill">${list(l, p).length} bài</span></div><h3>${PT[p].vi}</h3><p>${PT[p].how}</p><p>Đề thi thật: ${PT[p].ex[l]} ${p === "pic" ? "tranh" : p === "retell" ? "đoạn" : p === "read" ? "bài" : "câu"}</p>${bar(cnt(l, p), list(l, p).length)}</a>`).join("")}</div></div>`;
  }

  /* ---------- trang phần: danh sách ---------- */
  const IC = { done: "✓" };
  function part(l, p) {
    if (!LV[l] || !LV[l].parts.includes(p)) return home();
    const L = list(l, p), t = PT[p];
    let body;
    if (p === "repeat" || p === "answer") {
      body = `<div class="yf-tools"><a class="btn btn--primary" href="#/thi/${l}/${p}">▶ Chế độ thi (tự chạy)</a><button class="btn btn--ghost" data-mask>${MASK ? "Hiện chữ" : "Che chữ"}</button><button class="btn btn--ghost" data-py>${SHOW_PY ? "Ẩn pinyin" : "Hiện pinyin"}</button></div>` +
        L.map((it, i) => { const z = p === "repeat" ? it.zh : it.q, vi = p === "repeat" ? it.vi : it.qv; return `<div class="ky-row${done(it.id) ? " is-ok" : ""}" data-id="${it.id}"><span class="ky-no">${i + 1}</span><div><div class="ky-zh${MASK ? " is-mask" : ""}${SHOW_PY ? "" : " yf-hide"}" lang="zh" data-zh>${ruby(z)}</div><div class="ky-vi">${esc(vi)}</div>${p === "answer" ? `<details><summary class="ky-vi" style="cursor:pointer">Xem câu trả lời mẫu</summary><div class="ky-zh${SHOW_PY ? "" : " yf-hide"}" lang="zh">${ruby(it.a)}</div><div class="ky-vi">${esc(it.av)}</div>${SPK(it.a, "Nghe mẫu")}</details>` : ""}</div><div class="ky-acts">${SPK(z, "Nghe")}${SPK(z, "Chậm", .6)}<button class="btn ${done(it.id) ? "btn--primary" : "btn--ghost"} btn--sm" data-done>${done(it.id) ? "✓ Đã luyện" : "Đánh dấu"}</button></div></div>`; }).join("");
    } else {
      body = `<div class="ky-parts">${L.map((it, i) => `<a class="card${done(it.id) ? " is-ok" : ""}" href="#/b/${it.id}"><div class="card__top"><span class="big">${i + 1}</span><span class="pill">${done(it.id) ? "✓ Đã luyện" : "Chưa luyện"}</span></div><h3>${p === "qa" ? "" : esc(it.t) + " · " + esc(it.tv)}${p === "qa" ? `<span lang="zh" style="font-family:var(--jp);font-size:17px;font-weight:700">${esc(plain(it.q))}</span>` : ""}</h3>${p === "qa" ? `<p>${esc(it.qv)}</p>` : p === "pic" ? `<p style="font-size:30px">${esc(it.scene)}</p>` : `<p>${esc(it.sv.slice(0, 80))}…</p>`}</a>`).join("")}</div>`;
    }
    main.innerHTML = hero(`<span lang="zh">${t.zh}</span> · ${t.vi}`, t.how, pill("Cấp", LV[l].zh) + pill("Đã luyện", cnt(l, p) + "/" + L.length)) + `<div class="wrap"><a class="crumb" href="#/c/${l}">← ${LV[l].zh} ${LV[l].vi}</a>${body}</div>`;
    $$("[data-done]").forEach(b => b.onclick = () => { const id = b.closest("[data-id]").dataset.id; setDone(id, !done(id)); part(l, p); });
    const m = $("[data-mask]"); if (m) m.onclick = () => { MASK = !MASK; part(l, p); };
    const q = $("[data-py]"); if (q) q.onclick = () => { SHOW_PY = !SHOW_PY; try { localStorage.setItem("renzhen:kouyu:py", SHOW_PY ? "1" : "0"); } catch (e) { /* bỏ qua */ } part(l, p); };
    $$("[data-zh].is-mask").forEach(el => el.onclick = () => el.classList.remove("is-mask"));
  }
  let MASK = true;

  /* ---------- chế độ thi (nghe nhắc lại / nghe trả lời) ---------- */
  let ALIVE = 0;
  function exam(l, p) {
    if (!LV[l] || !["repeat", "answer"].includes(p)) return home();
    const L = list(l, p), N = Math.min(PT[p].ex[l] || 10, L.length), items = L.slice().sort(() => Math.random() - .5).slice(0, N), me = ++ALIVE;
    let i = 0;
    const alive = () => me === ALIVE && location.hash.startsWith("#/thi/");
    const finish = () => { main.innerHTML = hero("Hoàn thành", `Bạn đã luyện hết ${N} ${p === "repeat" ? "câu nhắc lại" : "câu trả lời"}.`, "") + `<div class="wrap"><div class="yf-tools"><a class="btn btn--primary" href="#/thi/${l}/${p}" onclick="setTimeout(()=>location.reload(),0)">Làm lại</a><a class="btn btn--ghost" href="#/c/${l}/${p}">Về danh sách</a></div></div>`; };
    const step = () => {
      if (!alive()) return; if (i >= N) return finish();
      const it = items[i], z = p === "repeat" ? it.zh : it.q;
      main.innerHTML = hero(`<span lang="zh">${PT[p].zh}</span> · ${i + 1}/${N}`, p === "repeat" ? "Nghe một lần rồi nhắc lại thật rõ." : "Nghe câu hỏi rồi trả lời ngay.", "") +
        `<div class="wrap"><div class="ky-panel ky-exam"><div class="ky-bar"><i style="width:${Math.round(100 * i / N)}%"></i></div><div class="ky-phase" id="ph">Đang đọc…</div><div class="ky-clock" id="ck">··</div><div class="ky-zh${SHOW_PY ? "" : " yf-hide"}" lang="zh" id="zh" style="visibility:hidden">${ruby(z)}</div><div class="ky-vi" id="vi" style="visibility:hidden">${esc(p === "repeat" ? it.vi : it.qv)}</div><div id="ans" style="visibility:hidden;margin-top:12px"><div class="ky-zh" lang="zh">${p === "answer" ? ruby(it.a) : ""}</div><div class="ky-vi">${p === "answer" ? esc(it.av) : ""}</div></div><div class="yf-tools" style="justify-content:center;margin-top:16px"><button class="btn btn--ghost" id="again">🔊 Nghe lại</button><button class="btn btn--primary" id="next">Câu tiếp →</button><a class="btn btn--ghost" href="#/c/${l}/${p}">Dừng</a></div></div></div>`;
      const show = () => { $("#zh").style.visibility = "visible"; $("#vi").style.visibility = "visible"; if (p === "answer") $("#ans").style.visibility = "visible"; };
      const nextNow = () => { stopTimer(); speechSynthesis.cancel(); setDone(it.id, true); i++; step(); };
      $("#next").onclick = nextNow; $("#again").onclick = () => { stopTimer(); speechSynthesis.cancel(); run(); };
      const run = () => {
        $("#ph").textContent = "Đang đọc…"; $("#ck").textContent = "··";
        speak(z, .9, () => {
          if (!alive()) return; const secs = p === "repeat" ? Math.max(4, Math.ceil(plain(z).length * .6)) : 10;
          $("#ph").textContent = p === "repeat" ? "Nhắc lại bây giờ!" : "Trả lời bây giờ!"; $("#ck").classList.add("is-speak");
          countdown(secs, s => { if (alive()) $("#ck").textContent = mmss(Math.max(0, s)); }, () => { if (!alive()) return; $("#ph").textContent = "Đối chiếu với đáp án"; $("#ck").classList.remove("is-speak"); $("#ck").textContent = "✓"; show(); });
        });
      };
      run();
    };
    step();
  }

  /* ---------- trang bài luyện nói có chuẩn bị ---------- */
  function keyModal(k) {
    const m = document.createElement("div"); m.className = "ky-modal";
    m.innerHTML = `<div class="ky-modal__box" role="dialog" aria-modal="true"><button class="ky-modal__x" type="button" aria-label="Đóng">×</button><div class="ky-zh" lang="zh" style="font-size:28px">${ruby(k.zh)}</div><div class="ky-vi" style="font-size:16px;margin:6px 0 12px">${esc(k.vi)}</div>${SPK(k.zh, "Nghe cụm từ")}</div>`;
    document.body.appendChild(m); const close = () => { m.remove(); document.removeEventListener("keydown", ek); }, ek = e => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", ek); m.onclick = e => { if (e.target === m || e.target.closest(".ky-modal__x")) close(); };
  }
  function item(id) {
    const it = byId[id]; if (!it) return home();
    const l = it._l, p = it._p, L = list(l, p), i = it._i, prev = L[i - 1], next = L[i + 1], tm = TM[l + "." + p] || [30, 60];
    const title = p === "qa" ? `Đề ${i + 1}` : `${esc(it.t)} · ${esc(it.tv)}`;
    let prompt, sample = "", sampleVi = "";
    if (p === "qa") { prompt = `<div class="ky-q${SHOW_PY ? "" : " yf-hide"}" lang="zh">${ruby(it.q)}</div><div class="ky-vi">${esc(it.qv)}</div><div style="margin-top:8px">${SPK(it.q, "Nghe câu hỏi")}</div>`; sample = it.a; sampleVi = it.av; }
    else if (p === "pic") { prompt = `<div class="ky-scene" aria-label="Tranh minh họa">${esc(it.scene)}</div><p class="ky-vi">Tranh minh họa bằng biểu tượng. Hãy mô tả: có ai, ở đâu, đang làm gì, và cảm nhận của bạn. Từ gợi ý ở bên dưới.</p>`; sample = it.a; sampleVi = it.av; }
    else if (p === "retell") { prompt = `<p class="ky-vi">Bấm nghe đoạn văn (có thể nghe nhiều lần khi luyện), rồi thuật lại nội dung chính bằng lời của bạn. Chữ được ẩn để bạn luyện nghe.</p><div style="margin:8px 0">${SPK(it.src, "Nghe đoạn văn")} ${SPK(it.src, "Nghe chậm", .7)} <button class="btn btn--ghost btn--sm" data-showsrc>Xem nguyên văn</button></div><div id="src" hidden><div class="ky-zh${SHOW_PY ? "" : " yf-hide"}" lang="zh">${ruby(it.src)}</div><div class="ky-vi">${esc(it.sv)}</div></div>`; sample = it.a; sampleVi = it.av; }
    else { prompt = `<div class="ky-zh${SHOW_PY ? "" : " yf-hide"}" lang="zh">${ruby(it.src)}</div><div style="margin-top:8px">${SPK(it.src, "Nghe đọc mẫu")} ${SPK(it.src, "Nghe chậm", .7)} <button class="btn btn--ghost btn--sm" data-showvi>Xem bản dịch</button></div><div class="ky-vi" id="vi" hidden>${esc(it.sv)}</div>`; }
    main.innerHTML = hero(title, PT[p].vi + " · " + LV[l].vi, pill("Bài", (i + 1) + "/" + L.length) + pill("Trạng thái", done(id) ? "Đã luyện" : "Chưa luyện")) +
      `<div class="wrap"><a class="crumb" href="#/c/${l}/${p}">← ${PT[p].zh} · ${PT[p].vi}</a>
      <div class="yf-tools"><button class="btn btn--ghost" data-py>${SHOW_PY ? "Ẩn pinyin" : "Hiện pinyin"}</button></div>
      <div class="ky-panel"><h2>${p === "read" ? "Bài đọc" : p === "retell" ? "Đoạn nghe" : p === "pic" ? "Tranh" : "Câu hỏi"}</h2>${prompt}</div>
      ${p === "pic" || p === "qa" || p === "retell" || p === "read" ? `<div class="ky-panel"><h2>Bấm giờ</h2><div class="ky-timer"><span class="ky-clock" id="ck">00:00</span><span class="ky-phase" id="ph">Sẵn sàng</span>${tm[0] ? `<button class="btn btn--ghost" id="tp">Chuẩn bị ${tm[0]}s</button>` : ""}<button class="btn btn--primary" id="ts">Nói ${tm[1]}s</button><button class="btn btn--ghost" id="tx">Dừng</button></div></div>` : ""}
      <div class="ky-panel ky-rec"><h2>Ghi âm</h2><div id="rec"></div></div>
      ${it.k && it.k.length ? `<div class="ky-panel"><h2>${p === "read" ? "Từ khó" : "Cụm từ chính"} (bấm để nghe)</h2><div class="ky-key">${it.k.map((k, n) => `<button type="button" data-k="${n}" lang="zh">${esc(plain(k.zh))}</button>`).join("")}</div></div>` : ""}
      ${sample ? `<div class="ky-panel"><h2>Bài nói mẫu</h2><button class="btn btn--ghost" data-showsample>Xem bài mẫu</button><div id="sample" hidden><div class="ky-zh${SHOW_PY ? "" : " yf-hide"}" lang="zh" style="margin-top:10px">${ruby(sample)}</div><div class="ky-vi">${esc(sampleVi)}</div><div style="margin-top:8px">${SPK(sample, "Nghe bài mẫu")} ${SPK(sample, "Nghe chậm", .7)}</div></div></div>` : ""}
      <div class="yf-tools"><button class="btn ${done(id) ? "btn--ghost" : "btn--primary"}" data-done>${done(id) ? "✓ Đã luyện (bỏ đánh dấu)" : "Đánh dấu đã luyện"}</button>${prev ? `<a class="btn btn--ghost" href="#/b/${prev.id}">← Bài trước</a>` : ""}${next ? `<a class="btn btn--ghost" href="#/b/${next.id}">Bài sau →</a>` : ""}</div></div>`;
    recorder($("#rec"));
    $("[data-done]").onclick = () => { setDone(id, !done(id)); item(id); };
    $("[data-py]").onclick = () => { SHOW_PY = !SHOW_PY; try { localStorage.setItem("renzhen:kouyu:py", SHOW_PY ? "1" : "0"); } catch (e) { /* bỏ qua */ } item(id); };
    $$("[data-k]").forEach(b => b.onclick = () => keyModal(it.k[+b.dataset.k]));
    const ss = $("[data-showsample]"); if (ss) ss.onclick = () => { $("#sample").hidden = false; ss.hidden = true; };
    const sr = $("[data-showsrc]"); if (sr) sr.onclick = () => { $("#src").hidden = !$("#src").hidden; };
    const sv = $("[data-showvi]"); if (sv) sv.onclick = () => { $("#vi").hidden = !$("#vi").hidden; };
    const ck = $("#ck"), ph = $("#ph");
    if (ck) {
      const run = (label, sec, speakPhase) => { ph.textContent = label; ck.classList.toggle("is-speak", !!speakPhase); countdown(sec, s => { ck.textContent = mmss(Math.max(0, s)); }, () => { ph.textContent = "Hết giờ"; ck.classList.remove("is-speak"); }); };
      const tp = $("#tp"); if (tp) tp.onclick = () => run("Đang chuẩn bị…", tm[0], false);
      $("#ts").onclick = () => run("Đang nói…", tm[1], true);
      $("#tx").onclick = () => { stopTimer(); ph.textContent = "Đã dừng"; ck.classList.remove("is-speak"); };
    }
  }

  /* ---------- đã luyện ---------- */
  function history() {
    const g = ALL.filter(x => done(x.id)).sort((a, b) => P.ok[b.id] - P.ok[a.id]);
    main.innerHTML = hero("Đã luyện", "Các bài bạn đã đánh dấu, mới nhất ở trên cùng.", pill("Tổng", g.length) + pill("Số bài", ALL.length)) +
      `<div class="wrap">${g.length ? g.map(it => { const t = it._p === "repeat" ? plain(it.zh) : it._p === "answer" ? plain(it.q) : it._p === "qa" ? plain(it.q) : it.t; const href = ["repeat", "answer"].includes(it._p) ? `#/c/${it._l}/${it._p}` : `#/b/${it.id}`; return `<a class="yf-pat is-ok" href="${href}"><span class="yf-no">${LV[it._l].zh}</span><span><div class="yf-pt" lang="zh">${esc(t)}</div><div class="yf-cat">${PT[it._p].zh} · ${PT[it._p].vi}</div></span><span class="pill">✓</span></a>`; }).join("") : `<p class="empty">Chưa có bài nào được đánh dấu. <a href="#/">Bắt đầu luyện</a></p>`}</div>`;
  }

  /* ---------- định tuyến ---------- */
  function route() {
    stopTimer(); ALIVE++; if ("speechSynthesis" in window) speechSynthesis.cancel();
    const seg = location.hash.replace(/^#\/?/, "").split("?")[0].split("/").filter(Boolean).map(decodeURIComponent), t = seg[0] || "";
    setNav(t === "huong-dan" ? "huong-dan" : t === "da-luyen" ? "da-luyen" : "cap"); window.scrollTo(0, 0);
    document.title = "Super Kouyu — Luyện nói HSKK";
    if (t === "c" && seg[2]) return part(seg[1], seg[2]);
    if (t === "c") return level(seg[1]);
    if (t === "b") return item(seg[1]);
    if (t === "thi") return exam(seg[1], seg[2]);
    if (t === "huong-dan") return guide();
    if (t === "da-luyen") return history();
    home();
  }
  window.addEventListener("hashchange", route);
  S.onSynced(() => { if (!/^#\/(thi|b)\//.test(location.hash)) route(); });
  route();
})();
