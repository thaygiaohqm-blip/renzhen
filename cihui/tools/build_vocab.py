import csv,json,re,collections,sys,glob,os
from pypinyin import pinyin,Style
SRC='/home/claude/src'; OUT='../data'
hv={}
for f in glob.glob('../../hanzi/data/k*.js'):
    t=open(f,encoding='utf-8').read(); t=t[t.index(',[')+1:t.rindex(')')]
    for r in json.loads(t): hv[r['k']]=(r['hv'],r['m'])
comp=collections.defaultdict(list)
for e in json.load(open(SRC+'/complete.json')): comp[e['simplified']].append(e)
TONE=str.maketrans('āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüńňḿ','aaaaeeeeiiiioooouuuuvvvvvnnm')
def plain(s): return s.translate(TONE).lower()
H=re.compile(r'[㐀-鿿]')
def split_syl(w,py):
    # py từ ivankra: "xuéxí" hoặc "àihào" - dùng complete.json (có khoảng trắng) hoặc pypinyin
    n=sum(1 for c in w if H.match(c))
    for e in comp.get(w,[]):
        for f in e['forms']:
            s=f['transcriptions']['pinyin'].replace('’',"'").split()
            if len(s)==n and plain(''.join(s)).replace("'",'')==plain(py).replace("'",'').replace(' ','').replace('·',''):
                return [x.lower() if not x[0].isupper() or True else x for x in s]
    p=[x[0] for x in pinyin(w,style=Style.TONE,heteronym=False)]
    if len(p)==n and plain(''.join(p))==plain(py).replace("'",''): return p
    return None
def ruby(w,py):
    s=split_syl(w,py)
    if s and all(H.match(c) or True for c in w):
        out=[];i=0
        # nhóm chữ Hán liên tiếp kèm bracket từng chữ
        for c in w:
            if H.match(c): out.append(f'{c}[{s[i]}]'); i+=1
            else: out.append(c)
        return ''.join(out),True
    return (f'{w}[{py}]' if H.search(w) else w),False
BAD=re.compile(r'^(surname|variant of|old variant|erhua variant|abbr\. for|also pr\.|\(loanword\))',re.I)
def gloss(w,py):
    best=''
    for e in comp.get(w,[]):
        for f in e['forms']:
            m=[x for x in f['meanings'] if x and not BAD.match(x)]
            if m: return '; '.join(m[:3])
            if not best and f['meanings']: best=f['meanings'][0]
    return best
VI={}
for f in glob.glob('data/vi-h*.txt'):
    for ln in open(f,encoding='utf-8'):
        p=ln.rstrip('\n').split('|',2)
        if len(p)==3: VI[(p[0],p[1])]=p[2]
IC={'n':'n','v':'v','a':'adj','d':'adv','m':'num','q':'m','r':'pron','p':'prep','c':'conj','u':'aux','e':'intj','y':'aux','o':'intj','h':'prefix','k':'suffix'}
def posof(r,w):
    p=r['POS'].lower().replace('/',',').replace(' ',',')
    if p: return p
    for e in comp.get(w,[]):
        for x in e.get('pos',[]):
            c=IC.get(x[0])
            if c: return c
    return 'exp'
rows=list(csv.DictReader(open(SRC+'/ivankra_hsk30.csv',encoding='utf-8')))
by=collections.defaultdict(list); nr=0; miss_gloss=0; miss_hv=0
for r in rows:
    lv=7 if r['Level'] in('7-9','7','8','9') else int(r['Level'])
    sw=r['Simplified'].split('|'); sp=r['Pinyin'].split('|')
    w=sw[0]; py=sp[0]
    rb,ok=ruby(w,py);  nr+= (not ok)
    chars=[c for c in w if H.match(c)]
    hvs=[hv[c][0] for c in chars if c in hv and hv[c][0] not in('—','')]
    hvs=' '.join(x.title() if False else x for x in hvs) if len(hvs)==len(chars) else ''
    if not hvs: miss_hv+=1
    g=gloss(w,py)
    if not g: miss_gloss+=1
    alt=[ (sw[i],sp[i] if i<len(sp) else '') for i in range(1,len(sw))]
    by[lv].append({'w':rb,'r':py,'rm':plain(py),'p':posof(r,w),'hv':hvs,'vi':VI.get((w,py),''),'en':g,
        'alt':[a[0] for a in alt],'c':'','cr':'','cv':'','e':'','ev':'','sid':r['ID']})
size=30; tot=0
for lv in range(1,8):
    L=by[lv]; topics=[]
    for i in range(0,len(L),size):
        ch=L[i:i+size]; k=i//size+1
        a=re.sub(r'[^a-z]','',ch[0]['rm'])[:1].upper() or '#'; b=re.sub(r'[^a-z]','',ch[-1]['rm'])[:1].upper() or '#'
        for j,e in enumerate(ch): e['id']=f'h{lv}-t{k:03d}-{j+1:03d}'
        topics.append({'id':f't{k:03d}','ja':f'第{k}组','vi':f'Nhóm {k} ({a}–{b})','desc':'','items':ch})
    tot+=len(L)
    open(f'{OUT}/h{lv}.js','w',encoding='utf-8').write('MD.register('+json.dumps({'level':f'h{lv}','topics':topics},ensure_ascii=False,separators=(',',':'))+');')
    print(lv,len(L),len(topics))
print('vi',sum(1 for L in by.values() for e in L if e['vi']))
print('total',tot,'whole-word ruby',nr,'no hv',miss_hv,'no gloss',miss_gloss)
