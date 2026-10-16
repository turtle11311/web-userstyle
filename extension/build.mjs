#!/usr/bin/env node
/*
 * 把 ptt/ 底下的 Stylus 樣式和 userscript 包成 MV3 擴充功能（Chrome / Safari 共用）。
 *
 *   node extension/build.mjs        → extension/dist/
 *
 * 單一來源：樣式、腳本照舊只改 ptt/*.user.css、ptt/*.user.js，這裡只負責轉換：
 * - 拿掉 ==UserStyle== 標頭和 @-moz-document 外殼（擴充功能用 manifest 的 matches 限定網域）
 * - 把 @var 解析成設定表（settings-schema.js），預設值寫成 :root 變數放在 CSS 最前面
 * - 版本號取 userstyle 的 @version，Chrome / Safari 兩邊一致
 */
import { readFileSync, writeFileSync, rmSync, mkdirSync, cpSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, 'src');
const dist = join(here, 'dist');
const ptt = join(here, '..', 'ptt');

const css = readFileSync(join(ptt, 'ptt-reader-theme.user.css'), 'utf8');
const js = readFileSync(join(ptt, 'ptt-enhance.user.js'), 'utf8');

// ───────────── 解析 UserStyle 標頭 ─────────────

const header = css.match(/\/\*\s*==UserStyle==([\s\S]*?)==\/UserStyle==\s*\*\//);
if (!header) throw new Error('找不到 ==UserStyle== 標頭');
const meta = (key) => header[1].match(new RegExp(`^@${key}\\s+(.+)$`, 'm'))?.[1].trim();

// @var <type> <name> "<label>" <default>
const schema = [];
for (const line of header[1].split('\n')) {
  const m = line.trim().match(/^@var\s+(\w+)\s+(\w+)\s+("(?:[^"\\]|\\.)*")\s+(.+)$/);
  if (!m) continue;
  const [, type, name, label, rest] = m;
  const v = { type, name, label: JSON.parse(label) };
  if (type === 'text' || type === 'color') {
    v.default = JSON.parse(rest);
  } else if (type === 'select') {
    // {"顯示名稱": "值"}；顯示名稱結尾加 * 代表預設，否則第一個
    const opts = JSON.parse(rest);
    v.options = Object.entries(opts).map(([k, val]) => ({ label: k.replace(/\*$/, ''), value: val }));
    const star = Object.keys(opts).findIndex((k) => k.endsWith('*'));
    v.default = v.options[Math.max(star, 0)].value;
  } else if (type === 'range' || type === 'number') {
    const [def, min, max, step, unit = ''] = JSON.parse(rest);
    Object.assign(v, { default: def, min, max, step, unit });
  } else if (type === 'checkbox') {
    v.default = rest.trim() === '1';
  } else {
    throw new Error(`還沒支援的 @var 類型：${type}`);
  }
  schema.push(v);
}

// 存的值 → CSS 變數值（跟 Stylus default preprocessor 一樣：range 接上單位、checkbox 變 1/0）
const cssValue = (v, val) =>
  v.type === 'range' || v.type === 'number' ? `${val}${v.unit}` : v.type === 'checkbox' ? (val ? '1' : '0') : val;

// ───────────── 樣式：拿掉標頭與 @-moz-document 外殼 ─────────────

let body = css.replace(header[0], '');
const doc = body.match(/@-moz-document[^{]*\{/);
if (!doc) throw new Error('找不到 @-moz-document');
body = body.slice(0, doc.index) + body.slice(doc.index + doc[0].length);
body = body.replace(/\}\s*$/, '\n'); // 外殼的最後一個 }

const defaults = schema.map((v) => `  --${v.name}: ${cssValue(v, v.default)};`).join('\n');
const themeCss = `/* 由 build.mjs 從 ptt/ptt-reader-theme.user.css 產生，請改原始檔 */\n:root {\n${defaults}\n}\n${body}`;

// ───────────── 輸出 ─────────────

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
cpSync(src, dist, { recursive: true });

writeFileSync(join(dist, 'ptt-theme.css'), themeCss);
writeFileSync(join(dist, 'ptt-enhance.js'), js);
writeFileSync(
  join(dist, 'settings-schema.js'),
  `// 由 build.mjs 從 @var 產生\nglobalThis.PTT_SCHEMA = ${JSON.stringify(schema, null, 2)};\n`,
);

const manifest = JSON.parse(readFileSync(join(src, 'manifest.json'), 'utf8'));
manifest.version = meta('version');
writeFileSync(join(dist, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

console.log(`built extension/dist  v${manifest.version}  (${schema.length} settings)`);
