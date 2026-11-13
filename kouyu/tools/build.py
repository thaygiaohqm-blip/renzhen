# -*- coding: utf-8 -*-
import json, re, sys
from pypinyin import pinyin, Style
import c_chu, c_zhong, c_gao
HAN = re.compile(r'[㐀-鿿]')
def rb(t):
    out = []
    py = pinyin(t, style=Style.TONE, errors=lambda s: [c for c in s], strict=False)
    flat = [x[0] for x in py]
    assert len(flat) == len(t), (t, len(flat), len(t))
    for ch, p in zip(t, flat):
        out.append(ch + "[" + p + "]" if HAN.match(ch) else ch)
    r = "".join(out)
    r = r.replace("觉[jué]得[dé]", "觉[jué]得[de]")
    r = re.sub(r"([说跑写玩考理吃做唱睡])\[([^\]]+)\]得\[dé\]", r"\1[\2]得[de]", r)
    r = re.sub(r"([好漂亮快累早晚高慢干净忙])\[([^\]]+)\]得\[dé\]", r"\1[\2]得[de]", r)
    r = re.sub(r"得\[dé\](?=[很更不太多好快清])", "得[de]", r)
    return r
def kp(lst): return [{"zh": rb(a), "vi": b} for a, b in lst]
D = {}
c = c_chu
D["chu"] = {
 "repeat": [{"id": "chu-r%02d" % (i+1), "zh": rb(a), "vi": b} for i, (a, b) in enumerate(c.REPEAT)],
 "answer": [{"id": "chu-a%02d" % (i+1), "q": rb(q), "a": rb(a), "qv": qv, "av": av} for i, (q, a, qv, av) in enumerate(c.ANSWER)],
 "qa": [{"id": "chu-q%02d" % (i+1), "q": rb(q), "qv": qv, "a": rb(a), "av": av, "k": kp(k)} for i, (q, qv, a, av, k) in enumerate(c.QA)],
}
c = c_zhong
D["zhong"] = {
 "repeat": [{"id": "zhong-r%02d" % (i+1), "zh": rb(a), "vi": b} for i, (a, b) in enumerate(c.REPEAT)],
 "pic": [{"id": "zhong-p%02d" % (i+1), "t": t, "tv": tv, "scene": sc, "a": rb(a), "av": av, "k": kp(k)} for i, (t, tv, sc, a, av, k) in enumerate(c.PIC)],
 "qa": [{"id": "zhong-q%02d" % (i+1), "q": rb(q), "qv": qv, "a": rb(a), "av": av, "k": kp(k)} for i, (q, qv, a, av, k) in enumerate(c.QA)],
}
c = c_gao
D["gao"] = {
 "retell": [{"id": "gao-t%02d" % (i+1), "t": t, "tv": tv, "src": rb(s), "sv": sv, "a": rb(a), "av": av, "k": kp(k)} for i, (t, tv, s, sv, a, av, k) in enumerate(c.RETELL)],
 "read": [{"id": "gao-d%02d" % (i+1), "t": t, "tv": tv, "src": rb(s), "sv": sv, "k": kp(k)} for i, (t, tv, s, sv, k) in enumerate(c.READ)],
 "qa": [{"id": "gao-q%02d" % (i+1), "q": rb(q), "qv": qv, "a": rb(a), "av": av, "k": kp(k)} for i, (q, qv, a, av, k) in enumerate(c.QA)],
}
open("../data/kouyu.js", "w", encoding="utf-8").write("window.KY=" + json.dumps(D, ensure_ascii=False, separators=(",", ":")) + ";")
print("ok", len(json.dumps(D, ensure_ascii=False)))
