#!/usr/bin/env python3
"""Minimal SigV4 client for private Cloudflare R2. Never prints credentials or object bodies."""
import hashlib, hmac, os, urllib.request, urllib.error, urllib.parse
from datetime import datetime, timezone

EMPTY = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

def configured():
    return all(os.environ.get(k) for k in ("R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"))

def _cfg():
    account = os.environ["R2_ACCOUNT_ID"]
    return {
        "bucket": os.environ["R2_BUCKET"],
        "endpoint": (os.environ.get("R2_ENDPOINT") or f"https://{account}.r2.cloudflarestorage.com").rstrip("/"),
        "region": os.environ.get("R2_REGION") or "auto",
        "access": os.environ["R2_ACCESS_KEY_ID"],
        "secret": os.environ["R2_SECRET_ACCESS_KEY"],
    }

def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def _hmac(key, msg: str) -> bytes:
    if isinstance(key, str):
        key = key.encode()
    return hmac.new(key, msg.encode(), hashlib.sha256).digest()

def _rfc3986(s: str) -> str:
    from urllib.parse import quote
    return quote(s, safe="-._~")

def signed(method: str, key: str, body: bytes | None = None, content_type: str | None = None):
    c = _cfg()
    now = datetime.now(timezone.utc)
    amz = now.strftime("%Y%m%dT%H%M%SZ")
    day = amz[:8]
    path = "/" + c["bucket"] + "/" + "/".join(_rfc3986(p) for p in key.split("/"))
    host = urllib.parse.urlparse(c["endpoint"]).netloc
    payload = _sha256(body) if body is not None else EMPTY
    headers = {
        "host": host,
        "x-amz-date": amz,
        "x-amz-content-sha256": payload,
    }
    if content_type:
        headers["content-type"] = content_type
    names = sorted(headers)
    canonical = "\n".join([
        method, path, "",
        "".join(f"{n}:{headers[n].strip()}\n" for n in names),
        ";".join(names),
        payload,
    ])
    scope = f"{day}/{c['region']}/s3/aws4_request"
    string_to_sign = f"AWS4-HMAC-SHA256\n{amz}\n{scope}\n{_sha256(canonical.encode())}"
    k_date = _hmac("AWS4" + c["secret"], day)
    k_region = _hmac(k_date, c["region"])
    k_service = _hmac(k_region, "s3")
    k_signing = _hmac(k_service, "aws4_request")
    sig = hmac.new(k_signing, string_to_sign.encode(), hashlib.sha256).hexdigest()
    headers["authorization"] = (
        f"AWS4-HMAC-SHA256 Credential={c['access']}/{scope}, "
        f"SignedHeaders={';'.join(names)}, Signature={sig}"
    )
    req = urllib.request.Request(c["endpoint"] + path, data=body, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.status, r.read(), dict(r.headers)
    except urllib.error.HTTPError as e:
        return e.code, e.read(), dict(e.headers)

def put(key: str, body: bytes, content_type: str):
    status, _, _ = signed("PUT", key, body, content_type)
    if status not in (200, 201):
        raise RuntimeError(f"r2 put {status}")

def get(key: str):
    status, body, headers = signed("GET", key)
    if status == 404:
        return None
    if status != 200:
        raise RuntimeError(f"r2 get {status}")
    return body, headers.get("Content-Type") or headers.get("content-type") or "application/octet-stream"

def head(key: str):
    status, _, _ = signed("HEAD", key)
    return status == 200
