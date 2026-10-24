#!/usr/bin/env node
// Usage: node scripts/reader-hash-password.mjs <username> <password>
// Prints one READER_USERS entry. Join several entries with ";" and paste into Vercel → Settings → Environment Variables.
import { randomBytes, scryptSync } from "crypto";
const [name, pw] = process.argv.slice(2);
if (!name || !pw) { console.error("usage: node scripts/reader-hash-password.mjs <username> <password>"); process.exit(1); }
if (!/^[a-zA-Z0-9_.-]{2,32}$/.test(name)) { console.error("username: 2-32 chars a-z 0-9 _ . -"); process.exit(1); }
const salt = randomBytes(16);
console.log(`${name.toLowerCase()}:scrypt$${salt.toString("base64url")}$${scryptSync(pw, salt, 32).toString("base64url")}`);
