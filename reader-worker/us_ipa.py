import re
_C=None
A={'AA':'ɑ','AE':'æ','AH':'ʌ','AO':'ɔ','AW':'aʊ','AY':'aɪ','EH':'ɛ','ER':'ɝ','EY':'eɪ','IH':'ɪ','IY':'i','OW':'oʊ','OY':'ɔɪ','UH':'ʊ','UW':'u',
 'B':'b','CH':'tʃ','D':'d','DH':'ð','F':'f','G':'ɡ','HH':'h','JH':'dʒ','K':'k','L':'l','M':'m','N':'n','NG':'ŋ','P':'p','R':'r','S':'s','SH':'ʃ','T':'t','TH':'θ','V':'v','W':'w','Y':'j','Z':'z','ZH':'ʒ'}
V=set('AA AE AH AO AW AY EH ER EY IH IY OW OY UH UW'.split())
def us(word):
    global _C
    if _C is None:
        import cmudict; _C=cmudict.dict()
    p=_C.get(word.lower())
    if not p: return ''
    ph=p[0]; out=[]; nv=sum(1 for x in ph if x[:-1] in V or x in V)
    # put stress mark before the onset consonant(s) of the stressed syllable (simple: before last consonant preceding vowel)
    toks=[]
    for x in ph:
        b=re.sub(r'\d','',x); s=x[-1] if x[-1].isdigit() else None
        if b=='AH' and s=='0': sym='ə'
        elif b=='ER' and s=='0': sym='ɚ'
        else: sym=A[b]
        toks.append([sym,b in V,s])
    res=[]
    for i,(sym,isv,s) in enumerate(toks):
        if isv and nv>1 and s in('1','2'):
            j=len(res)
            if j>0 and not toks[i-1][1]:
                j-=1
                # keep clusters like st, pl, tr together
                if j>0 and not toks[i-2][1] and (toks[i-2][0]+toks[i-1][0]) in ('st','sp','sk','pl','pr','tr','kr','kl','bl','br','dr','fl','fr','ɡl','ɡr','θr','str','pj','kj','bj','fj','mj','hj','vj','kw','tw','sw','sl','sm','sn','dw','ɡw'): j-=1
            res.insert(j,'ˈ' if s=='1' else 'ˌ')
        res.append(sym)
    return '/'+''.join(res)+'/'
if __name__=='__main__':
    for w in ['beaver','water','brain','neuron','memory','tooth','predator','waterproof','understand','computer','stream']: print(w,us(w))
