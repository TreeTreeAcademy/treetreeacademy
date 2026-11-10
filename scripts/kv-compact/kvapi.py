#!/usr/bin/env python3
"""Import-token KV helper. Never prints values or book text."""
import json, os, time, urllib.request, urllib.parse
SITE = os.environ.get("READER_SITE", "https://treetreeacademy.com")
def token():
    return open("/workspace/.secrets/READER_IMPORT_TOKEN").read().strip()
def _req(method, path, body=None, timeout=90):
    url = SITE + path
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, method=method, headers={
        "Authorization": "Bearer " + token(),
        "Content-Type": "application/json",
    })
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.load(r)
def keys(match, maxn=100000, lens=False):
    q = urllib.parse.urlencode({"match": match, "max": maxn, **({"len": "1"} if lens else {})})
    return _req("GET", "/api/reader-import/kv?" + q)
def exists(ks):
    return _req("POST", "/api/reader-import/kv", {"exists": ks})
def get(ks):
    return _req("POST", "/api/reader-import/kv", {"get": ks})
def set_many(pairs):
    return _req("POST", "/api/reader-import/kv", {"set": [{"k": k, "v": v} for k, v in pairs]})
def delete(ks):
    out = {"del": 0}
    for i in range(0, len(ks), 400):
        r = _req("POST", "/api/reader-import/kv", {"del": ks[i:i+400]})
        out["del"] += r.get("del") or 0
    return out
def usage():
    return _req("GET", "/api/reader-import/tts?mode=usage", timeout=180)
