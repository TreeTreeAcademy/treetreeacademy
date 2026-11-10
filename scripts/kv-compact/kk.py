import hashlib, re
def kk_norm(t):
    s = re.sub(r"\s+", " ", str(t or "")).strip()[:300]
    m = re.match(r"^[\"“'‘(]*([A-Za-z]+(?:['’][A-Za-z]+)?)[\"”'’).,!?;:]*$", s)
    if m:
        return m.group(1).lower().replace("’", "'")
    return s.replace("“", '"').replace("”", '"').replace("‘", "'").replace("’", "'")
def norm_text(t):
    return re.sub(r"\s+", " ", str(t or "")).strip()[:300]
def kk_key(t, v):
    n = kk_norm(t)
    return "reader:kk:v1:" + hashlib.sha1(f"{v}\n{n}".encode()).hexdigest()[:24]
def tts_key(t, v):
    n = norm_text(t)
    return "reader:tts:v3:" + hashlib.sha1(f"{v}\n{n}".encode()).hexdigest()[:24]
def talk_key(tid):
    return "reader:talk:v2:" + hashlib.sha1(tid.encode()).hexdigest()[:24]
