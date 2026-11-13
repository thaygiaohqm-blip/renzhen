#!/usr/bin/env python3
"""Sinh dữ liệu Super Hanzi (3.000 chữ HSK 3.0) từ:
 - hsk30-chars.csv  (danh sách 3.000 chữ theo cấp, đối chiếu GF 0025-2021)
 - MakeMeAHanzi (dictionary.txt, graphics.txt): pinyin, nghĩa tiếng Anh, cấu tạo, nét viết
 - Unihan: số bộ Khang Hy
 - data/vi/*.txt, data/ety/*.txt (Hán Việt, nghĩa, nguồn gốc lục thư soạn tay trong Super Kanji)
 - data/vi-hsk.txt: Hán Việt + nghĩa soạn riêng cho các chữ chưa có
Chạy: python3 build.py  (cần: pip install opencc-python-reimplemented pypinyin)"""
import csv, glob, json, os, re, sys
from collections import defaultdict, OrderedDict
from opencc import OpenCC
from pypinyin import pinyin as _py, Style

HERE = os.path.dirname(os.path.abspath(__file__))
W = os.environ.get('HANZI_WORK', HERE + '/work/src')
DATA = HERE + '/data'
OUT = HERE + '/../data'
os.makedirs(OUT + '/s', exist_ok=True)
s2t = OpenCC('s2t')
LV = {'1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7-9': 7}

# ---------- danh sách chữ ----------
chars = list(csv.DictReader(open(W + '/hsk30-chars.csv', encoding='utf8')))
order = [r['Hanzi'] for r in chars]
LVL = {r['Hanzi']: LV[r['Level']] for r in chars}
TRAD = {r['Hanzi']: (r['Traditional'] or r['Hanzi']) for r in chars}
WLV = {r['Hanzi']: r['WritingLevel'] for r in chars}

# ---------- Hán Việt + nghĩa ----------
VI = {}
for f in sorted(glob.glob(DATA + '/vi/*.txt')):
    for l in open(f, encoding='utf8'):
        if l.strip():
            k, hv, m = l.rstrip('\n').split('|'); VI[k] = (hv.strip(), m.strip())
VIH = {}                                   # soạn riêng cho chữ HSK
if os.path.exists(DATA + '/vi-hsk.txt'):
    for l in open(DATA + '/vi-hsk.txt', encoding='utf8'):
        l = l.rstrip('\n')
        if l.strip() and not l.startswith('#'):
            k, hv, m = l.split('|', 2); VIH[k] = (hv.strip(), m.strip())
def cands(c):
    return [c] + [x for x in dict.fromkeys([TRAD.get(c, c), s2t.convert(c)]) if x != c]
def vi_of(c):
    if c in VIH: return VIH[c]
    for x in cands(c):
        if x in VI: return VI[x]
    return None
HVU = json.load(open(DATA + '/hv_unihan.json'))
def hv_guess(c):
    for x in cands(c):
        if x in HVU: return HVU[x][0].upper()
    return ''

# ---------- nguồn gốc lục thư ----------
ETY = {}
for f in sorted(glob.glob(DATA + '/ety/*.txt')):
    for l in open(f, encoding='utf8'):
        l = l.rstrip('\n')
        if not l.strip() or l.startswith('#'): continue
        k, ls, tx = l.split('|', 2); ETY[k] = (ls.strip(), tx.strip())
ETYH = {}
if os.path.exists(DATA + '/ety-hsk.txt'):
    for l in open(DATA + '/ety-hsk.txt', encoding='utf8'):
        l = l.rstrip('\n')
        if l.strip() and not l.startswith('#'):
            k, ls, tx = l.split('|', 2); ETYH[k] = (ls.strip(), tx.strip())
def ety_of(c):
    if c in ETYH: return ETYH[c]
    for x in cands(c):
        if x in ETY: return ETY[x]
    return None

# ---------- bộ thủ ----------
RAD = {}
for l in open(DATA + '/radicals.txt', encoding='utf8'):
    n, g, hv, m = l.rstrip('\n').split('|'); RAD[int(n)] = (g, hv, m)
def rstrokes(n):
    for lim, s in [(6, 1), (29, 2), (60, 3), (94, 4), (117, 5), (146, 6), (166, 7), (175, 8), (186, 9), (194, 10), (200, 11), (204, 12), (208, 13), (210, 14), (211, 15), (213, 16), (214, 17)]:
        if n <= lim: return s
RADMAP = {g: n for n, (g, hv, m) in RAD.items()}
for n in range(0x2F00, 0x2FD6):
    RADMAP[chr(n)] = n - 0x2F00 + 1
VAR = {9: '亻⺅', 18: '刂⺉', 61: '忄⺖㣺⺗', 64: '扌⺘', 85: '氵⺡氺', 86: '灬⺣', 94: '犭⺨', 130: '⺼', 140: '艹⺾', 162: '辶⻌⻍', 163: '⻏', 170: '⻖',
       145: '衤', 113: '礻', 122: '罒⺲罓', 125: '耂⺹', 120: '纟糹', 184: '饣飠', 167: '钅釒', 149: '讠訁', 96: '王', 118: '⺮', 93: '牜', 66: '攵',
       87: '爫⺤', 47: '巛巜', 71: '旡', 103: '⺪', 43: '尣', 78: '歺', 63: '戶', 168: '长镸', 80: '母', 5: '乚⺄', 58: '⺕彑', 4: '⺁丿',
       154: '贝', 159: '车', 147: '见', 169: '门', 182: '风', 183: '飞', 181: '页', 196: '鸟', 195: '鱼', 187: '马', 178: '韦', 211: '齿',
       212: '龙', 213: '龟', 199: '麦', 186: '香', 203: '黑', 205: '黾', 197: '卤', 132: '自', 38: '女', 10: '⺈', 75: '朩', 44: '尸', 53: '广'}
for n, s in VAR.items():
    for c in s: RADMAP.setdefault(c, n)
RADMAP.update({'⺈': 20, '勹': 20, '阝': 170, '网': 122, '冈': 13, '廿': 24, '丷': 12, '⺌': 42, '小': 42, '屮': 45, '艹': 140, '辶': 162, '氵': 85,
               '亻': 9, '扌': 64, '忄': 61, '讠': 149, '钅': 167, '饣': 184, '纟': 120, '𠂉': 4, '龙': 212, '长': 168})
AMBIG = {'月': (74, 130), '阝': (163, 170)}
def radof(c, krad):
    if c in AMBIG and krad in AMBIG[c]: return krad
    return RADMAP.get(c)

KRS = {}                                   # bộ Khang Hy theo Unihan
for l in open(W + '/Unihan_RadicalStrokeCounts.txt', encoding='utf8'):
    if l.startswith('#') or not l.strip(): continue
    u, f, v = l.rstrip('\n').split('\t')
    if f == 'kRSUnicode':
        KRS[chr(int(u[2:], 16))] = int(v.split()[0].split('.')[0].rstrip("'"))

# ---------- MakeMeAHanzi ----------
MM = {}
for l in open(W + '/dictionary.txt', encoding='utf8'):
    d = json.loads(l); MM[d['character']] = d
IDC = set('⿰⿱⿲⿳⿴⿵⿶⿷⿸⿹⿺⿻')
def children(c):
    d = MM.get(c)
    if not d: return []
    t = [x for x in d.get('decomposition', '') if x not in IDC and x != '？']
    return [] if t == [c] else t
def desc_rad(k, krad, depth=0, acc=None):
    if acc is None: acc = set()
    if depth > 4: return acc
    for c in children(k):
        rn = radof(c, krad)
        if rn: acc.add(rn)
        else: desc_rad(c, krad, depth + 1, acc)
    return acc
def pinyin_of(c):
    d = MM.get(c, {})
    py = [p for p in d.get('pinyin', []) if p]
    if not py:
        py = [x[0] for x in _py(c, style=Style.TONE, heteronym=True)]
    return list(dict.fromkeys(py))

def short(m):
    return m.split(';')[0].strip().lower() if m else ''
def comp_info(c):
    r = vi_of(c)
    if r: return r[0], r[1]
    n = RADMAP.get(c)
    if n:
        g, hv, m = RAD[n]; return hv, m
    h = hv_guess(c)
    return (h, '')

# ---------- nét viết ----------
def r1(v):
    v = round(v, 1)
    return str(int(v)) if v == int(v) else str(v)
def sc(x, y): return (x * 109 / 1024, (900 - y) * 109 / 1024)
def smooth(pts):
    P = [sc(*p) for p in pts]
    if len(P) == 1: P = [P[0], (P[0][0] + .1, P[0][1])]
    d = 'M' + r1(P[0][0]) + ',' + r1(P[0][1])
    if len(P) == 2:
        return d + 'L' + r1(P[1][0]) + ',' + r1(P[1][1])
    for i in range(len(P) - 1):
        p0 = P[i - 1] if i > 0 else P[i]; p1 = P[i]; p2 = P[i + 1]; p3 = P[i + 2] if i + 2 < len(P) else P[i + 1]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += 'C' + ','.join(r1(v) for v in (c1[0], c1[1], c2[0], c2[1], p2[0], p2[1]))
    return d
GFX = {}
need = set(order)
for l in open(W + '/graphics.txt', encoding='utf8'):
    d = json.loads(l)
    if d['character'] in need: GFX[d['character']] = d

# ---------- dựng bản ghi ----------
recs = OrderedDict()
auto_cnt = 0
for k in order:
    d = MM.get(k, {})
    vm = vi_of(k)
    hv, m = vm if vm else (hv_guess(k), '')
    rad = KRS.get(k)
    comps = children(k)
    selfrad = RADMAP.get(k) == rad and k in RADMAP
    rd = set() if selfrad else {x for x in desc_rad(k, rad) if x > 6}
    if rad: rd.add(rad)
    parts = []
    for c in comps:
        rn = radof(c, rad)
        if rn:
            g, rhv, rm_ = RAD[rn]; parts.append([c, rhv, rm_, g if g != c else ''])
        else:
            h, mm = comp_info(c); parts.append([c, h, mm, ''])
    if not parts and rad and not selfrad:
        g, rhv, rm_ = RAD[rad]; parts.append([g, rhv, rm_, ''])
    et = ety_of(k)
    ls, org, auto = '', '', 0
    if et:
        ls, org = et
    else:
        auto = 1
        e = d.get('etymology') or {}
        rg, rhv, rm = RAD.get(rad, ('', '', '')) if rad else ('', '', '')
        def lab(c):
            rn = radof(c, rad)
            if rn:
                g2, h2, m2 = RAD[rn]
                return f'{c} (dạng biến của {g2} {h2}: {short(m2).lower()})' if g2 != c else f'{c} ({h2}: {short(m2).lower()})'
            h, mm = comp_info(c)
            if h and mm: return f'{c} ({h}: {short(mm).lower()})'
            return f'{c} ({h})' if h else c
        if selfrad:
            org = f'Chữ này chính là bộ thủ số {rad} ({rhv}), nghĩa gốc là “{short(rm).lower()}”.'; ls = 'TH' if e.get('type') == 'pictographic' else ''
        elif e.get('type') == 'pictophonetic' and e.get('phonetic') and e.get('semantic'):
            ls = 'HT'; s_, p_ = e['semantic'], e['phonetic']
            pp = '・'.join(pinyin_of(p_)[:2]) if p_ in MM else ''
            org = f'Cấu tạo hình thanh: {lab(s_)} chỉ phạm trù nghĩa, {lab(p_)} gợi âm đọc' + (f' ({pp})' if pp else '') + '.'
        elif e.get('type') == 'ideographic' and comps:
            ls = 'HY'; org = 'Cấu tạo hội ý: ' + ' + '.join(lab(c) for c in comps) + ', hợp ý lại thành nghĩa của chữ.'
        elif e.get('type') == 'pictographic':
            ls = 'TH'; org = 'Chữ tượng hình (象形): vốn là hình vẽ của sự vật được mô tả.'
        elif comps:
            org = 'Cấu tạo: ' + ' + '.join(lab(c) for c in comps) + '.'
    en = [x.strip() for x in (d.get('definition') or '').split(';') if x.strip()][:3]
    recs[k] = {'k': k, 'l': LVL[k], 'hv': hv, 'm': m, 'py': pinyin_of(k), 's': len(GFX[k]['strokes']) if k in GFX else 0, 'r': rad or 0,
               'rd': sorted(rd), 'p': parts, 'ls': ls, 'o': org, 'a': auto, 'en': en, 'tr': TRAD[k] if TRAD[k] != k else '', 'wl': WLV[k]}

# ---------- gia đình chữ ----------
kset = set(order)
heads = defaultdict(set); fkind = defaultdict(set)
for k in order:
    e = MM.get(k, {}).get('etymology') or {}
    if e.get('type') == 'pictophonetic' and e.get('phonetic') and len(e['phonetic']) == 1 and e['phonetic'] != k:
        heads[e['phonetic']].add(k); fkind[e['phonetic']].add('HT')
    for c in set(children(k)):
        if len(c) != 1 or c == k or c not in MM: continue
        st = len(GFX[c]['strokes']) if c in GFX else 3
        if st <= 2: continue
        heads[c].add(k)
fams = []
for h, ms in heads.items():
    mem = sorted(ms, key=order.index)
    if h in kset and h not in mem: mem.insert(0, h)
    if 3 <= len(mem) <= 36: fams.append((h, mem))
byset = {}
for h, mem in fams:
    key = frozenset(mem); cand = byset.get(key)
    if cand is None or (h in kset and cand[0] not in kset): byset[key] = (h, mem)
fams = list(byset.values())
fam_of = defaultdict(list)
for h, mem in sorted(fams, key=lambda x: (0 if 'HT' in fkind.get(x[0], ()) else 1, len(x[1]), x[0])):
    for k in mem:
        if len(fam_of[k]) < 4: fam_of[k].append(h)
famout = []
for h, mem in fams:
    mem2 = [k for k in mem if h in fam_of[k]]
    if len(mem2) >= 3:
        if h in kset and h not in mem2: mem2.insert(0, h)
        famout.append((h, mem2))
famout.sort(key=lambda x: (-len(x[1]), x[0]))
for k in recs: recs[k]['f'] = [h for h, mem in sorted(famout, key=lambda x: len(x[1])) if k in mem][:4]
famjs = []
for h, mem in famout:
    hh, hm = comp_info(h)
    lv = sorted({recs[k]['l'] for k in mem if k in recs}, reverse=True)
    famjs.append({'h': h, 'hv': hh, 'hm': hm, 'ks': ''.join(mem), 'l': lv[0] if lv else 1, 'kd': ''.join(sorted(fkind.get(h, []))), 's': len(GFX[h]['strokes']) if h in GFX else 0})
famjs.sort(key=lambda f: (-f['l'], -len(f['ks']), f['h']))

# ---------- ghi file ----------
byl = defaultdict(list)
for k in order: byl[recs[k]['l']].append(recs[k])
def js(o): return json.dumps(o, ensure_ascii=False, separators=(',', ':'))
for l, lst in byl.items():
    with open(f'{OUT}/k{l}.js', 'w', encoding='utf8') as f:
        f.write(f'HANZI.add({l},{js(lst)});\n')
radjs = [{'n': n, 'g': g, 'hv': hv, 'm': m, 's': rstrokes(n)} for n, (g, hv, m) in sorted(RAD.items())]
with open(f'{OUT}/meta.js', 'w', encoding='utf8') as f:
    f.write('HANZI.meta(' + js({'rad': radjs, 'fam': famjs}) + ');\n')
nostroke = []
for l, lst in byl.items():
    out = {}
    for r in lst:
        g = GFX.get(r['k'])
        if not g: nostroke.append(r['k']); continue
        paths, nums = [], []
        for med in g['medians']:
            paths.append(smooth(med))
            x, y = sc(*med[0]); nums.append([round(x - 3.2, 1), round(y - 1.5, 1)])
        out[r['k']] = [paths, nums]
    with open(f'{OUT}/s/s{l}.js', 'w', encoding='utf8') as f:
        f.write(f'HANZI.strokes({js(out)});\n')
print('chữ:', len(order), {l: len(v) for l, v in sorted(byl.items())})
print('gia đình:', len(famjs), 'chữ có gia đình:', sum(1 for r in recs.values() if r['f']))
print('thiếu nét:', nostroke)
print('chưa có nghĩa tiếng Việt:', sum(1 for r in recs.values() if not r['m']), ' chưa có Hán Việt:', sum(1 for r in recs.values() if not r['hv']))
print('nguồn gốc soạn tay:', sum(1 for r in recs.values() if not r['a']), ' tự động:', sum(r['a'] for r in recs.values()))
json.dump({k: [r['hv'], r['m']] for k, r in recs.items()}, open(HERE + '/work/hv_m.json', 'w', encoding='utf8'), ensure_ascii=False)
