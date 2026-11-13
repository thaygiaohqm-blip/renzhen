/* Super Renzhen — thanh thương hiệu chung, màu giao diện và tài khoản.
   Dùng cho trang chủ, Super Cihui, Super Bunpou và Super Kanji. Tải ngay đầu <body> để thanh hiện cùng lúc với trang, không bị giật. */
(function () {
  const me = document.currentScript && document.currentScript.src || "";
  const base = me.replace(/renzhen\.js.*$/, "");
  const root = base.replace(/shared\/$/, "");
  const PRODUCTS = [];
  window.RENZHEN = { products: PRODUCTS, root };

  const esc = t => String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const put = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* bỏ qua */ } };
  const del = k => { try { localStorage.removeItem(k); } catch (e) { /* bỏ qua */ } };
  const ready = fn => document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", fn) : fn();

  if (!document.querySelector('link[href*="shared/renzhen.css"]')) { const css = document.createElement("link"); css.rel = "stylesheet"; css.href = base + "renzhen.css"; document.head.appendChild(css); }

  const page = document.body.dataset.renzhen;           // "home" | "goi" | "bunpou"
  const THEMES = [
    { id: "reu", ja: "青", name: "Rêu", note: "Xanh rêu, mặc định", c: ["#004646", "#27c4b5", "#ed3838", "#f7f4ed"] },
    { id: "ai", ja: "蓝", name: "Chàm", note: "Xanh chàm, dịu mắt", c: ["#233a63", "#5fa8d8", "#e0533d", "#f1f3f7"] },
    { id: "sakura", ja: "桃", name: "Hoa đào", note: "Hồng mận, ấm áp", c: ["#7a2e4a", "#ee8fae", "#d23b3b", "#fbf1f2"] },
    { id: "matcha", ja: "茶", name: "Trà xanh", note: "Xanh lá, tự nhiên", c: ["#3f5a22", "#a3c45a", "#d9622b", "#f4f2e4"] },
    { id: "momiji", ja: "枫", name: "Lá phong", note: "Nâu đỏ mùa thu", c: ["#7a2f14", "#f2a04a", "#c8102e", "#faf0e3"] },
    { id: "yoru", ja: "夜", name: "Ban đêm", note: "Nền tối, học buổi tối", c: ["#0b1416", "#134e4c", "#3fd1c0", "#ff6b6b"] }];

  /* ---------- Super Cihui / Super Bunpou: thanh thương hiệu dựng ngay khi trang bắt đầu tải ---------- */
  if (page === "cihui" || page === "yufa" || page === "hanzi" || page === "youxi" || page === "kouyu") {
    const link = (id, label) => '<a href="' + root + id + '/"' + (page === id ? ' aria-current="true"' : "") + ">" + label + "</a>";
    const s = document.createElement("div"); s.className = "hk-strip";
    s.innerHTML = '<div class="hk-strip__in"><a class="hk-strip__brand" href="' + root + '" title="Về trang chủ Super Renzhen"><img src="' + base + 'logo-mark.svg" alt="" width="48" height="48"><span><b>Super</b> Renzhen</span></a>' +
      '<nav class="hk-strip__nav" aria-label="Các công cụ của Super Renzhen">' + link("hanzi", "Super Hanzi") + link("cihui", "Super Cihui") + link("yufa", "Super Yufa") + link("youxi", "Super Youxi") + link("kouyu", "Super Kouyu") + '</nav><span class="hk-strip__grow"></span><div class="hk-strip__tools" data-hk-tools></div></div>';
    const sw = document.createElement("nav"); sw.className = "hk-switch"; sw.setAttribute("aria-label", "Chuyển công cụ");
    sw.innerHTML = link("hanzi", "Super Hanzi") + link("cihui", "Super Cihui") + link("yufa", "Super Yufa") + link("youxi", "Super Youxi") + link("kouyu", "Super Kouyu");
    document.body.insertBefore(sw, document.body.firstChild);
    document.body.insertBefore(s, document.body.firstChild);
    const setH = () => document.documentElement.style.setProperty("--hk-h", s.offsetHeight + "px");
    setH(); window.addEventListener("resize", setH); if (window.ResizeObserver) new ResizeObserver(setH).observe(s);
    // màu giao diện và tài khoản của từng app được chuyển lên thanh chung (giữ nguyên nút để mã của app vẫn hoạt động)
    ready(() => {
      const tools = s.querySelector("[data-hk-tools]");
      ["themes", "acct"].forEach(c => { const el = document.querySelector(".top ." + c); if (el) tools.appendChild(el); });
      tools.classList.add("is-ready");
      setH();
    });
  }

  /* ---------- Trang chủ: màu giao diện, tài khoản, hộp thoại đăng nhập ngay tại chỗ ---------- */
  if (page === "home" || page === "hanzi" || page === "youxi" || page === "kouyu") ready(() => {
    const tools = document.querySelector("[data-hk-tools]");
    const applyTheme = id => { if (!id || id === "reu") delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = id; };
    applyTheme(get("renzhen:theme"));
    if (!tools) return;
    tools.innerHTML = '<div class="hk-themes"><button class="hk-btn" type="button" aria-haspopup="true" aria-expanded="false" data-hk-theme title="Đổi màu giao diện"><i class="hk-dot"></i><span>Màu</span></button><div class="hk-menu" role="menu" hidden></div></div><div class="hk-acct"></div>';
    const tb = tools.querySelector("[data-hk-theme]"), menu = tools.querySelector(".hk-menu");
    menu.innerHTML = "<p>Màu giao diện (dùng chung cho cả Super Renzhen)</p>" + THEMES.map(t => '<button class="hk-opt" type="button" role="menuitemradio" data-t="' + t.id + '"><span class="hk-sw">' + t.c.map(c => '<i style="background:' + c + '"></i>').join("") + '</span><b>' + t.name + '<small>' + t.note + '</small></b><span class="hk-ja" lang="ja">' + t.ja + '</span></button>').join("");
    const mark = () => { const cur = get("renzhen:theme") || "reu"; menu.querySelectorAll(".hk-opt").forEach(o => o.setAttribute("aria-checked", o.dataset.t === cur)); };
    mark();
    tb.onclick = e => { e.stopPropagation(); menu.hidden = !menu.hidden; tb.setAttribute("aria-expanded", !menu.hidden); };
    menu.onclick = e => { const o = e.target.closest(".hk-opt"); if (!o) return; put("renzhen:theme", o.dataset.t); applyTheme(o.dataset.t); mark(); menu.hidden = true; };
    document.addEventListener("click", () => { menu.hidden = true; });

    const acct = tools.querySelector(".hk-acct");
    const session = () => { try { return JSON.parse(get("renzhen:auth") || "null"); } catch (e) { return null; } };
    const USER_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.2 3.6-7 8-7s8 2.8 8 7"/></svg>';
    const paintAcct = () => {
      const ses = session();
      if (!ses) {
        acct.innerHTML = '<button class="hk-btn hk-btn--solid" type="button" data-hk-login>' + USER_ICON + '<span>Đăng nhập</span></button>';
        acct.querySelector("button").onclick = e => { e.stopPropagation(); openLogin(); };
        return;
      }
      const nm = ses.name || ses.email || "?";
      acct.innerHTML = '<button class="hk-btn hk-btn--solid" type="button" title="' + esc(ses.email || "") + '"><b class="hk-av">' + esc(nm.trim().charAt(0).toUpperCase()) + '</b><span>' + esc(nm) + '</span></button><div class="hk-menu hk-menu--sm" hidden><p>' + esc(ses.email || "") + '</p><button class="hk-opt hk-out" type="button">Đăng xuất</button></div>';
      const bt = acct.querySelector("button"), mn = acct.querySelector(".hk-menu");
      bt.onclick = e => { e.stopPropagation(); mn.hidden = !mn.hidden; };
      acct.querySelector(".hk-out").onclick = () => { del("renzhen:auth"); paintAcct(); window.dispatchEvent(new Event("renzhen:auth")); };
    };
    paintAcct();

    /* hộp thoại đăng nhập / tạo tài khoản; gọi /api/auth giống trong các app, phiên lưu ở khoá renzhen:auth dùng chung */
    let dlg = null, probe = null;
    const detect = () => probe || (probe = fetch("/api/auth", { cache: "no-store" }).then(r => r.json()).then(j => !!(j && j.ok && j.ready)).catch(() => false));
    async function openLogin(startMode) {
      if (!dlg) {
        dlg = document.createElement("dialog"); dlg.className = "hk-dlg"; dlg.setAttribute("aria-labelledby", "hk-dlg-t");
        document.body.appendChild(dlg);
        dlg.addEventListener("click", ev => { if (ev.target === dlg) dlg.close(); });
      }
      let mode = startMode || "login", busy = false;
      const ok = await detect();
      const draw = err => {
        const reg = mode === "register";
        dlg.innerHTML = '<div class="hk-dlg__in"><button class="hk-dlg__x" type="button" data-x aria-label="Đóng">×</button>' +
          '<h2 id="hk-dlg-t">' + (reg ? "Tạo tài khoản" : "Đăng nhập") + '</h2>' +
          '<p class="hk-dlg__lead">Một tài khoản dùng chung cho Super Cihui, Super Bunpou và Super Kanji. Lưu tiến độ học, danh sách từ cần ôn, dùng được trên mọi thiết bị.</p>' +
          (ok ? "" : '<p class="hk-dlg__note"><b>Máy chủ tài khoản chưa bật.</b> Bạn vẫn học bình thường, tiến độ lưu trên thiết bị này. Khi chủ web hoàn tất cấu hình, nút này sẽ hoạt động.</p>') +
          '<div class="hk-dlg__tabs" role="tablist"><button type="button" role="tab" aria-selected="' + !reg + '" data-tab="login">Đăng nhập</button><button type="button" role="tab" aria-selected="' + reg + '" data-tab="register">Tạo tài khoản</button></div>' +
          '<form class="hk-dlg__form" novalidate>' +
          (reg ? '<label>Tên hiển thị <small>(không bắt buộc)</small><input name="name" autocomplete="nickname" maxlength="40"></label>' : "") +
          '<label>Email<input name="email" type="email" autocomplete="email" inputmode="email" required></label>' +
          '<label>Mật khẩu' + (reg ? " <small>(ít nhất 8 ký tự)</small>" : "") + '<span class="hk-pw"><input name="password" type="password" autocomplete="' + (reg ? "new-password" : "current-password") + '" required minlength="8"><button type="button" data-eye aria-pressed="false">Hiện</button></span></label>' +
          '<p class="hk-dlg__err" role="alert">' + esc(err || "") + '</p>' +
          '<button class="hk-go" type="submit"' + (ok ? "" : " disabled") + ">" + (reg ? "Tạo tài khoản" : "Đăng nhập") + '</button>' +
          '<p class="hk-dlg__fine">Chúng tôi chỉ lưu email, tên hiển thị và tiến độ học của bạn.' + (reg ? " Hiện chưa có chức năng khôi phục mật khẩu qua email, hãy nhớ mật khẩu của bạn." : "") + '</p></form></div>';
        dlg.querySelector("[data-x]").onclick = () => dlg.close();
        dlg.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => { mode = b.dataset.tab; draw(); first(); });
        dlg.querySelector("[data-eye]").onclick = ev => { const i = dlg.querySelector("input[name=password]"), show = i.type === "password"; i.type = show ? "text" : "password"; ev.currentTarget.textContent = show ? "Ẩn" : "Hiện"; ev.currentTarget.setAttribute("aria-pressed", show); };
        dlg.querySelector("form").addEventListener("submit", submit);
      };
      const first = () => { const i = dlg.querySelector("input"); if (i) i.focus(); };
      async function submit(ev) {
        ev.preventDefault();
        if (busy) return;
        const f = ev.currentTarget, email = f.email.value.trim(), password = f.password.value, name = f.name ? f.name.value.trim() : "";
        const go = dlg.querySelector(".hk-go"), errEl = dlg.querySelector(".hk-dlg__err");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { errEl.textContent = "Email chưa đúng định dạng."; return; }
        if (password.length < 8) { errEl.textContent = "Mật khẩu cần ít nhất 8 ký tự."; return; }
        errEl.textContent = ""; busy = true; go.disabled = true; go.textContent = "Đang xử lý…";
        try {
          const res = await fetch("/api/auth", { method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: mode, email, password, name }) });
          const j = await res.json().catch(() => ({}));
          if (!res.ok) { errEl.textContent = j.error || "Máy chủ báo lỗi, hãy thử lại sau."; busy = false; go.disabled = false; go.textContent = mode === "register" ? "Tạo tài khoản" : "Đăng nhập"; return; }
          put("renzhen:auth", JSON.stringify({ mode: "remote", token: j.token, email: j.user.email, name: j.user.name || "" }));
          dlg.close(); paintAcct(); window.dispatchEvent(new Event("renzhen:auth"));
        } catch (e) {
          errEl.textContent = "Không kết nối được máy chủ. Hãy kiểm tra mạng.";
          busy = false; go.disabled = false; go.textContent = mode === "register" ? "Tạo tài khoản" : "Đăng nhập";
        }
      }
      draw(); if (!dlg.open) dlg.showModal(); first();
    }
    window.RENZHEN.openLogin = openLogin;
    document.querySelectorAll("[data-open-login]").forEach(a => a.addEventListener("click", ev => { ev.preventDefault(); if (!session()) openLogin(); }));
    if (!session() && /[?&]login=1/.test(location.search)) setTimeout(openLogin, 300);
  });

})();
