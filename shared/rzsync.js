/* Super Renzhen — lưu tiến độ trên thiết bị và đồng bộ lên máy chủ khi đã đăng nhập.
   RZSync.create("yufa", { ok:{}, rv:{}, gt:{}, place:{} }) → { P, save(), onSynced(fn) } */
(function () {
  const sess = () => { try { const a = JSON.parse(localStorage.getItem("renzhen:auth") || "null"); return a && a.mode === "remote" && a.token ? a : null; } catch (e) { return null; } };
  window.RZSync = {
    create(app, init) {
      const PK = "renzhen:" + app + ":v1";
      const P = Object.assign({ ok: {}, rv: {}, gt: {}, place: {} }, init || {});
      try { Object.assign(P, JSON.parse(localStorage.getItem(PK) || "null") || {}); } catch (e) { /* bỏ qua */ }
      let t = null, busy = false; const cbs = [];
      const store = () => { try { localStorage.setItem(PK, JSON.stringify(P)); } catch (e) { /* bỏ qua */ } };
      async function api(method, body) {
        const a = sess(); if (!a) return null;
        try {
          const r = await fetch("/api/progress?app=" + app, { method, cache: "no-store", headers: Object.assign({ "Content-Type": "application/json", Authorization: "Bearer " + a.token }), body: body ? JSON.stringify(body) : undefined });
          return r.ok ? await r.json() : null;
        } catch (e) { return null; }
      }
      function merge(rp, rpl) {
        const keep = {};
        new Set([...Object.keys(P.ok), ...Object.keys(P.rv), ...Object.keys(rp.ok || {}), ...Object.keys(rp.rv || {})]).forEach(k => {
          const c = [[1, P.ok[k]], [0, P.rv[k]], [1, (rp.ok || {})[k]], [0, (rp.rv || {})[k]]].filter(x => x[1]).sort((a, b) => b[1] - a[1])[0];
          if (c) keep[k] = c;
        });
        P.ok = {}; P.rv = {}; Object.keys(keep).forEach(k => { (keep[k][0] ? P.ok : P.rv)[k] = keep[k][1]; });
        new Set([...Object.keys(P.gt), ...Object.keys(rp.gt || {})]).forEach(k => {
          const a = P.gt[k], b = (rp.gt || {})[k];
          P.gt[k] = !a ? b : !b ? a : { best: Math.max(a.best || 0, b.best || 0), last: (a.n || 0) >= (b.n || 0) ? a.last : b.last, n: Math.max(a.n || 0, b.n || 0) };
        });
        new Set([...Object.keys(P.place), ...Object.keys(rpl || {})]).forEach(k => {
          const a = P.place[k] || {}, b = (rpl || {})[k] || {};
          P.place[k] = { best: Math.max(a.best || 0, b.best || 0), pass: !!(a.pass || b.pass), n: Math.max(a.n || 0, b.n || 0) };
        });
      }
      async function sync() {
        if (!sess() || busy) return; busy = true;
        try {
          for (let i = 0; i < 3; i++) {
            const j = await api("GET"); if (!j) break;
            merge((j.data && j.data.progress) || {}, j.data && j.data.placement); store();
            const r = await api("PUT", { data: { progress: { ok: P.ok, rv: P.rv, gt: P.gt, ts: {}, clr: 0 }, placement: P.place }, ifRev: j.rev || 0 });
            if (r && r.ok) break;
          }
        } finally { busy = false; cbs.forEach(f => f()); }
      }
      window.addEventListener("renzhen:auth", () => { if (sess()) sync(); });
      setTimeout(sync, 800);
      return { P, save() { store(); clearTimeout(t); t = setTimeout(sync, 2500); }, onSynced(f) { cbs.push(f); }, now: () => Math.floor(Date.now() / 1000) };
    }
  };
})();
