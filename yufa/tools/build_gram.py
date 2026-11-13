import json,re,os,jieba,logging
jieba.setLogLevel(logging.ERROR)
from pypinyin import pinyin,Style
src=json.load(open('/home/claude/pdfwork/grammar_final.json'))
GV={'词类':'Từ loại','句子的类型':'Loại câu','短语':'Cụm từ','口语格式':'Cách nói khẩu ngữ','句子成分':'Thành phần câu','固定格式':'Cấu trúc cố định','强调的方法':'Cách nhấn mạnh','提问的方法':'Cách đặt câu hỏi','特殊表达法':'Cách biểu đạt đặc biệt','句群':'Nhóm câu','动作的态':'Thể của động tác','语素':'Hình vị'}
GE={'词类':'词类','句子的类型':'句子类型','短语':'短语','口语格式':'口语格式','句子成分':'句子成分','固定格式':'固定格式','强调的方法':'强调','提问的方法':'提问','特殊表达法':'特殊表达','句群':'句群','动作的态':'动态','语素':'语素'}
CV={'名词':'Danh từ','动词':'Động từ','代词':'Đại từ','数词':'Số từ','量词':'Lượng từ','副词':'Phó từ','介词':'Giới từ','连词':'Liên từ','助词':'Trợ từ','形容词':'Tính từ','叹词':'Thán từ','拟声词':'Từ tượng thanh','结构类型':'Loại cấu trúc','功能类型':'Loại chức năng','固定短语':'Cụm cố định','主语':'Chủ ngữ','谓语':'Vị ngữ','宾语':'Tân ngữ','定语':'Định ngữ','状语':'Trạng ngữ','补语':'Bổ ngữ','句型':'Mẫu câu','句类':'Loại câu theo mục đích','特殊句型':'Mẫu câu đặc biệt','复句':'Câu phức','数的表示法':'Cách biểu thị số','时间表示法':'Cách biểu thị thời gian','前缀':'Tiền tố','后缀':'Hậu tố','动作的态':'Thể của động tác'}
def ruby(t):
    out=[];
    for seg in re.findall(r'[㐀-鿿]+|[^㐀-鿿]+',t):
        if re.match(r'[㐀-鿿]',seg):
            for c,p in zip(seg,pinyin(seg,style=Style.TONE)): out.append(f'{c}[{p[0]}]')
        else: out.append(seg)
    return ''.join(out)
def clean(t): return re.sub(r'\s+','',t).strip()
VI={}
for f in ['data/vi-gram.txt']:
    if os.path.exists(f):
        for ln in open(f,encoding='utf-8'):
            p=ln.rstrip('\n').split('|',1)
            if len(p)==2: VI[int(p[0])]=p[1]
EXL=open('data/ex-list.txt',encoding='utf-8').read().split('\n')
EXV={}
for ln in open('data/vi-ex.txt',encoding='utf-8'):
    p=ln.rstrip('\n').split('|',1)
    if len(p)==2 and p[0].isdigit() and int(p[0])<len(EXL): EXV[EXL[int(p[0])]]=p[1]
cats={}
out=[]
for o in src:
    if not o['content'].strip() and o['pdftitle']:
        key=re.sub(r'[^\u3400-\u9fff]','',o['cat'])[:3]
        if key and key not in re.sub(r'[^\u3400-\u9fff]','',o['pdftitle']): o['ex']=[]; o['subs']=[]
    ex=[clean(e) for e in o['ex'] for e in [e] if clean(e)]
    for s in o['subs']: ex+= [clean(e) for e in s['ex']]
    sents=[e for e in ex if re.search(r'[。！？]$',e) and re.search(r'[㐀-鿿]',e)]
    forms=[e for e in ex if e not in sents and re.search(r'[㐀-鿿]',e)][:14]
    cat=o['cat'].split('\n')[0].strip()
    k=(o['group'],cat); cats.setdefault(k,len(cats)+1)
    out.append({'id':f"h{o['lv']}-{o['id']:03d}",'n':o['id'],'lv':o['lv'],'g':o['group'],'c':cat,'d':o['det'].strip(),'p':clean(o['content']) if o['content'] else clean(o['pdftitle'] or ''),
      'vi':VI.get(o['id'],''),'forms':[ruby(f) for f in forms],'ex':[{'zh':ruby(s),'plain':s,'vi':EXV.get(s,''),'seg':([ruby(t) for t in jieba.lcut(s.rstrip('。！？')) if t.strip()] if 3<=len(jieba.lcut(s.rstrip('。！？')))<=11 and not re.search(r'[，、；：“”（）]',s) else [])} for s in sents[:10]]})
meta={'groups':[{'id':g,'vi':GV[g],'zh':GE[g]} for g in GV],'cv':CV}
open('../data/gram.js','w',encoding='utf-8').write('window.YF='+json.dumps({'meta':meta,'pats':out},ensure_ascii=False,separators=(',',':'))+';')
print(len(out),sum(1 for x in out if x['ex']),sum(len(x['ex']) for x in out),sum(1 for x in out if x['vi']))
