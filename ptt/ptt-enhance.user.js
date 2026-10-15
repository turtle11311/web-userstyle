// ==UserScript==
// @name         PTT 閱讀增強
// @namespace    ptt-reader-theme
// @version      1.3.0
// @homepageURL  https://github.com/turtle11311/web-userstyle
// @supportURL   https://github.com/turtle11311/web-userstyle/issues
// @updateURL    https://raw.githubusercontent.com/turtle11311/web-userstyle/main/ptt/ptt-enhance.user.js
// @downloadURL  https://raw.githubusercontent.com/turtle11311/web-userstyle/main/ptt/ptt-enhance.user.js
// @description  文章頁：推文依 ID 上色、標出原PO、同一人連續推文淡化重複 ID；發信站／文章網址整理成資訊卡；原PO補充與編輯紀錄融入推文時間軸。清單頁：作者 ID 同色、Re:/Fw: 標籤、標出原PO回覆。樣式由 Stylus「PTT 閱讀改版」負責。
// @match        https://www.ptt.cc/bbs/*
// @match        https://www.ptt.cc/cls/*
// @run-at       document-end
// @grant        none
// ==/UserScript==

/*
 * 分工：這支腳本只做 CSS 做不到的事——讀文字、加 class / data 屬性、重組 DOM。
 * 所有外觀都寫在 Stylus「PTT 閱讀改版」裡，選擇器都以 .ptt-* 或 [data-uid] 開頭，
 * 所以沒裝這支腳本時，樣式不會作用在任何東西上。
 */
(() => {
  'use strict';

  // ───────────── 工具 ─────────────

  // 同一個 ID 永遠得到同一個色相（FNV-1a 雜湊 → 0–359）
  const hueOf = (id) => {
    let h = 0x811c9dc5;
    for (const ch of id.toLowerCase()) {
      h ^= ch.codePointAt(0);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h % 360;
  };

  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };

  const uidChip = (id) => {
    const s = el('span', 'ptt-uid', id);
    s.style.setProperty('--uid-hue', hueOf(id));
    return s;
  };

  // ═════════════ 文章清單頁 ═════════════

  const enhanceList = (list) => {
    const PREFIX = /^((?:(?:Re|Fw)\s*:\s*)+)(.*)$/i;
    const ents = [...list.querySelectorAll('.r-ent')];
    const info = ents.map((ent) => {
      const a = ent.querySelector('.title a');
      const authorEl = ent.querySelector('.meta .author');
      const author = authorEl?.textContent.trim() || '';
      const title = a?.textContent.trim() || '';
      const m = title.match(PREFIX);
      return { ent, a, authorEl, author, title, prefix: m?.[1] || '', base: (m ? m[2] : title).trim() };
    });

    // 同一頁裡「不是 Re:/Fw:」的文章 → 原文標題對應原文作者
    const originAuthor = new Map();
    info.forEach((x) => { if (x.a && !x.prefix) originAuthor.set(x.base, x.author.toLowerCase()); });

    info.forEach((x) => {
      if (x.authorEl && x.author && x.author !== '-') {
        x.authorEl.dataset.uid = x.author;
        x.authorEl.style.setProperty('--uid-hue', hueOf(x.author));
      }
      if (!x.a || !x.prefix) return;

      // 「Re: Re: Fw: 標題」→ 一個標籤 +標題
      const kinds = [...x.prefix.matchAll(/(Re|Fw)/gi)].map((k) => k[1].toLowerCase());
      const kind = kinds.includes('fw') ? 'fw' : 're';
      const chip = el('span', `ptt-prefix ptt-prefix-${kind}`, kinds.length > 1 ? `${kind === 'fw' ? 'Fw' : 'Re'}×${kinds.length}` : (kind === 'fw' ? 'Fw' : 'Re'));
      x.a.textContent = '';
      x.a.append(chip, x.base);

      // 原文在同一頁、而且回文的人就是原文作者 → 原PO回覆
      if (kind === 're' && originAuthor.get(x.base) === x.author.toLowerCase()) {
        x.ent.classList.add('is-self-reply');
      }
    });
  };

  // ═════════════ 看板清單頁（熱門看板 /bbs/hotboards.html、分類看板 /cls/*） ═════════════

  const enhanceBoards = (list) => {
    const ents = [...list.querySelectorAll('.b-ent')];
    const isHot = /\/hotboards\.html$/.test(location.pathname);

    ents.forEach((ent, i) => {
      const a = ent.querySelector('a.board');
      if (!a) return;
      const nameEl = ent.querySelector('.board-name');
      const classEl = ent.querySelector('.board-class');
      const titleEl = ent.querySelector('.board-title');
      const name = nameEl?.textContent.trim() || '';
      const cls = classEl?.textContent.trim() || '';

      // 「◎[股票] 說明」「◎批踢踢公布欄」「Σ市民廣場     報告站長 PTT咬我」
      // → 中文名 + 說明。開頭的 ◎ / Σ 是 BBS 用來分辨看板 / 分類的符號，改由卡片樣式表達。
      const raw = (titleEl?.textContent || '').trim().replace(/^[◎Σ●○]\s*/, '');
      // 看板：「[中文名] 說明」。分類的標題是自由文字，空白數量不固定、還可能有「<< … >>」裝飾，
      // 所以只在「開頭 2～8 個漢字 + 空白」時才切成名稱與說明，其他情況整串當名稱。
      let zh = raw, desc = '', m;
      if ((m = raw.match(/^\[([^\]]+)\]\s*(.*)$/))) [, zh, desc] = m;
      else if ((m = raw.match(/^(\p{Script=Han}{2,8})\s+(.+)$/u))) [, zh, desc] = m;
      zh = zh.trim() || name;                // 標題空白時，用英文板名頂上
      desc = desc.replace(/\s{2,}/g, ' ').trim();
      if (titleEl) {
        titleEl.textContent = '';
        titleEl.append(el('span', 'ptt-board-zh', zh));
        if (desc) titleEl.append(el('span', 'ptt-board-desc', desc));
        titleEl.title = desc ? `${zh}　${desc}` : zh;
      }

      // 分類的類別欄固定是「一一」，沒有意義
      if (classEl && /^一+$/.test(cls)) classEl.classList.add('is-empty');
      if (isHot && nameEl) nameEl.dataset.rank = i + 1;
      ent.dataset.search = [name, zh, desc, cls].join(' ').toLowerCase();
    });

    // ── 即時篩選 ──
    const bar = el('div', 'ptt-board-filter');
    const input = el('input');
    input.type = 'search';
    input.placeholder = `篩選 ${ents.length} 個${isHot ? '熱門看板' : '項目'}：英文名、中文名、類別、說明（按 / 開始）`;
    const count = el('span', 'ptt-board-count');
    bar.append(input, count);
    list.prepend(bar);
    const empty = el('div', 'ptt-board-empty', '沒有符合的看板');
    empty.hidden = true;
    list.append(empty);

    const visible = () => ents.filter((e) => !e.hidden);
    input.addEventListener('input', () => {
      const terms = input.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
      ents.forEach((e) => { e.hidden = !terms.every((t) => e.dataset.search.includes(t)); });
      const n = visible().length;
      count.textContent = terms.length ? `${n} / ${ents.length}` : '';
      empty.hidden = n > 0;
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {               // Enter：直接進第一個結果
        const first = visible()[0]?.querySelector('a.board');
        if (first) location.href = first.href;
      } else if (e.key === 'Escape') {       // Esc：清空
        input.value = '';
        input.dispatchEvent(new Event('input'));
        input.blur();
      }
    });
    document.addEventListener('keydown', (e) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '');
      if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey) { e.preventDefault(); input.focus(); }
    });
  };

  // ═════════════ 文章頁 ═════════════

  const list = document.querySelector('.r-list-container');
  if (list) { enhanceList(list); document.documentElement.classList.add('ptt-enhanced'); return; }

  const boardList = document.querySelector('.b-list-container');
  if (boardList) { enhanceBoards(boardList); document.documentElement.classList.add('ptt-enhanced'); return; }

  const main = document.getElementById('main-content');
  if (!main) return;

  // ───────────── 作者 ─────────────

  // 標頭「作者」：someid (暱稱)
  let authorId = null;
  const authorLine = [...main.querySelectorAll('.article-metaline')]
    .find((l) => l.querySelector('.article-meta-tag')?.textContent.trim() === '作者');
  const authorValue = authorLine?.querySelector('.article-meta-value');
  if (authorValue) {
    const m = authorValue.textContent.match(/^(\S+)(\s*\(.*\))?$/);
    if (m) {
      authorId = m[1];
      authorValue.textContent = '';
      authorValue.append(uidChip(authorId));
      if (m[2]) authorValue.append(el('span', 'ptt-nick', m[2].trim()));
    }
  }

  // ───────────── 推文 ─────────────

  let prevUid = null;
  let floor = 0;          // 樓層：每一則推 / 噓 / → 都算一樓，依出現順序編號
  const decoratePush = (push) => {
    if (push.dataset.uid) return;
    const uid = push.querySelector('.push-userid')?.textContent.trim();
    if (!uid) return;
    push.dataset.uid = uid;
    push.dataset.floor = ++floor;   // 簽名檔裡的假推文不會進到這裡，所以不佔樓層
    push.style.setProperty('--uid-hue', hueOf(uid));

    // 推 / 噓 / → 在 HTML 上 class 一樣，只能靠文字分
    const tag = push.querySelector('.push-tag')?.textContent.trim();
    push.classList.add(tag === '推' ? 'push-up' : tag === '噓' ? 'push-down' : 'push-arrow');

    if (authorId && uid.toLowerCase() === authorId.toLowerCase()) push.classList.add('is-op');
    // 同一人連續推文：後面幾行的 ID 淡化，一眼看出是同一段話
    if (uid === prevUid) push.classList.add('same-uid');
    prevUid = uid;
  };

  // ───────────── ※ 系統行 ─────────────

  const RE = {
    from:    /^※ 發信站: (.+?)(?:, 來自: ([\d.:a-fA-F]+)(?: \((.+?)\))?)?\s*$/,
    url:     /^※ 文章網址: (\S+)/,
    edit:    /^※ 編輯: (\S+) \(([\d.:a-fA-F]+)(?: (.+?))?\)(?:, (\d\d\/\d\d\/\d{4} \d\d:\d\d:\d\d))?/,
    repost:  /^※ 轉錄者: (\S+) \(([\d.:a-fA-F]+)(?: (.+?))?\)(?:, (\d\d\/\d\d\/\d{4} \d\d:\d\d:\d\d))?/,
    origin:  /^※ \[本文轉錄自 /,
  };
  const sysText = (n) => n.nodeType === 1 && n.matches('span.f2') ? n.textContent.trim() : '';

  // 「10/06/2026 00:45:05」→「2026/10/06 00:45」
  const prettyTime = (t) => {
    const m = t?.match(/^(\d\d)\/(\d\d)\/(\d{4}) (\d\d:\d\d)/);
    return m ? `${m[3]}/${m[1]}/${m[2]} ${m[4]}` : (t || '');
  };

  const metaRow = (label, ...content) => {
    const row = el('div', 'ptt-sig-row');
    row.append(el('span', 'ptt-sig-label', label));
    const v = el('span', 'ptt-sig-value');
    v.append(...content);
    row.append(v);
    return row;
  };

  // 編輯 / 轉錄 紀錄 → 一列「誰 · 什麼時候 · 哪裡」
  const actionRow = (label, m) => {
    const parts = [uidChip(m[1])];
    if (m[4]) parts.push(el('span', 'ptt-sig-time', prettyTime(m[4])));
    if (m[3]) parts.push(el('span', 'ptt-sig-loc', m[3]));
    parts.push(el('span', 'ptt-sig-ip', m[2]));
    return metaRow(label, ...parts);
  };

  const copyButton = (url) => {
    const b = el('button', 'ptt-copy', '複製');
    b.type = 'button';
    b.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(url);
        b.textContent = '已複製';
      } catch {
        b.textContent = '複製失敗';
      }
      setTimeout(() => (b.textContent = '複製'), 1500);
    });
    return b;
  };

  // ───────────── 簽名檔 ─────────────
  //
  // 「--」到「※ 發信站」之間是簽名檔。簽名檔常放假文章截圖之類的 ANSI 圖，
  // 裡面「噓 ID: 內容」這種行會被 PTT 網頁版當成真的推文輸出成 .push，
  // 所以要在處理推文之前先把整段包起來，裡面的 .push 不當推文看。

  const lastFrom = (() => {
    const list = [...main.childNodes];
    for (let i = list.length - 1; i >= 0; i--) if (RE.from.test(sysText(list[i]))) return list[i];
    return null;
  })();

  if (lastFrom) {
    // PTT 簽名檔最多 6 行；簽名檔本身也可能以「--」結尾（例如假文章截圖梗），
    // 所以在發信站往前 SIG_MAX_LINES 行以內，找「最遠」的那個「--」整行當簽名檔起點。
    const SIG_MAX_LINES = 12;
    let dashNode = null, dashAt = -1, linesAfter = 0;
    for (let n = lastFrom.previousSibling; n && linesAfter <= SIG_MAX_LINES; n = n.previousSibling) {
      const t = n.textContent;
      if (n.nodeType === 3) {
        // 這個節點裡每個「--」整行，從後往前看
        const hits = [...t.matchAll(/(?:^|\n)--(?=\n)/g)].map((h) => h.index + (t[h.index] === '\n' ? 1 : 0)).reverse();
        for (const at of hits) {
          const lines = linesAfter + (t.slice(at).match(/\n/g) || []).length;
          if (lines > SIG_MAX_LINES) break;
          dashNode = n; dashAt = at;
        }
      }
      linesAfter += (t.match(/\n/g) || []).length;
    }
    if (dashNode) {
      const sigStart = dashNode.splitText(dashAt);          // 「--\n…」開頭的新節點
      sigStart.textContent = sigStart.textContent.replace(/^--\n/, '');
      // 簽名檔結尾、緊貼發信站的那個「--」也拿掉
      const tail = lastFrom.previousSibling;
      if (tail?.nodeType === 3 && tail !== dashNode) tail.textContent = tail.textContent.replace(/(?:^|\n)--\n?$/, '\n');
      const sigNodes = [];
      for (let n = sigStart; n && n !== lastFrom; n = n.nextSibling) sigNodes.push(n);
      dashNode.textContent = dashNode.textContent.replace(/\n+$/, '\n'); // 內文結尾多餘的空行收掉
      if (sigNodes.some((n) => n.textContent.trim())) {
        const sig = el('div', 'ptt-signature');
        main.insertBefore(sig, sigStart);
        sig.append(...sigNodes);
        sig.querySelectorAll('.push').forEach((p) => p.classList.add('ptt-fake-push'));
        const first = sig.firstChild;
        if (first?.nodeType === 3) first.textContent = first.textContent.replace(/^\n+/, '');
        const last = sig.lastChild;
        if (last?.nodeType === 3) last.textContent = last.textContent.replace(/\n+$/, '');
      } else {
        sigNodes.forEach((n) => n.remove()); // 只有「--」沒有簽名：交給下面的資訊卡當分隔
      }
    }
  }

  // ───────────── 走過 #main-content 的子節點，重組 ─────────────

  const nodes = [...main.childNodes];
  // 推文區 = 「最後一個 ※ 發信站」之後的第一則推文開始。
  // 發信站和第一則推文之間的「※ 編輯」還算文末資訊，進資訊卡；
  // 沒有發信站的舊文章就直接從第一則推文開始。
  const fromIdx = lastFrom ? nodes.indexOf(lastFrom) : -1;
  const pushStartIdx = nodes.findIndex((n, i) => i > fromIdx && n.nodeType === 1 && n.classList.contains('push'));
  let card = null;        // 文末資訊卡（發信站 / 網址 / 推文前的編輯）
  let pending = [];       // 推文之間、還沒遇到「※ 編輯」的原PO補充內容

  const ensureCard = (beforeNode) => {
    if (!card) {
      card = el('div', 'ptt-sigcard');
      main.insertBefore(card, beforeNode);
    }
    return card;
  };

  nodes.forEach((node, i) => {
    const inPushes = pushStartIdx !== -1 && i > pushStartIdx;
    const text = sysText(node);
    let m;

    if (node.nodeType === 1 && node.classList.contains('push')) {
      // 推文之間夾了沒接「※ 編輯」的文字（少見）：也包成補充區塊，不讓它散在外面
      if (pending.length) flushAddendum(null, node);
      decoratePush(node);
      return;
    }

    if ((m = text.match(RE.from))) {
      const c = ensureCard(node);
      const site = el('span', 'ptt-sig-site', m[1]);
      const from = m[2]
        ? [el('span', 'ptt-sig-loc', m[3] || ''), el('span', 'ptt-sig-ip', m[2])]
        : [];
      c.append(metaRow('發信站', site, ...from));
      node.remove();
      return;
    }

    if ((m = text.match(RE.url))) {
      const c = ensureCard(node);
      const a = node.querySelector('a') || el('a', null, m[1]);
      a.classList.add('ptt-sig-url');
      c.append(metaRow('文章網址', a, copyButton(a.href || m[1])));
      node.remove();
      return;
    }

    if ((m = text.match(RE.edit)) || (m = text.match(RE.repost))) {
      const isEdit = text.startsWith('※ 編輯');
      if (inPushes) {
        // 推文區裡的編輯：連同前面那段補充文字，變成時間軸上的一張卡片
        flushAddendum(m, node, isEdit ? '編輯' : '轉錄');
      } else {
        ensureCard(node).append(actionRow(isEdit ? '編輯' : '轉錄者', m));
        node.remove();
      }
      return;
    }

    if (RE.origin.test(text)) {
      node.classList.add('ptt-origin');
      return;
    }

    // 推文裡有圖片連結時，PTT 會在那則推文後面插一個 .richcontent 預覽。
    // 還沒開始收集補充內容時遇到它，它屬於上一則推文，留在原位就好。
    if (inPushes && !pending.length && node.nodeType === 1 && node.classList.contains('richcontent')) {
      node.classList.add('ptt-push-embed');
      return;
    }

    // 推文區裡其他東西（原PO補充的文字、連結、圖片預覽）先收集起來
    if (inPushes) {
      if (node.nodeType === 3 && !node.textContent.trim()) return; // 純空白
      pending.push(node);
    }
  });
  if (pending.length) flushAddendum(null, null);

  function flushAddendum(m, anchor, verb = '編輯') {
    const box = el('div', 'ptt-addendum');
    // 卡片用「編輯者」的 ID 色（通常就是作者），跟標頭作者、原PO推文同一個顏色
    const who = m?.[1] || authorId;
    if (who) box.style.setProperty('--uid-hue', hueOf(who));
    if (who && authorId && who.toLowerCase() === authorId.toLowerCase()) box.classList.add('is-op');
    const head = el('div', 'ptt-addendum-head');
    if (m) {
      head.append(uidChip(m[1]), el('span', 'ptt-addendum-verb', pending.length ? `補充並${verb}了文章` : `${verb}了文章`));
      if (m[4]) head.append(el('span', 'ptt-sig-time', prettyTime(m[4])));
      if (m[3]) head.append(el('span', 'ptt-sig-loc', m[3]));
    } else {
      head.append(el('span', 'ptt-addendum-verb', '原PO補充'));
    }
    box.append(head);
    if (pending.length) {
      const body = el('div', 'ptt-addendum-body');
      // 補充內容的頭尾換行去掉，避免卡片裡多空行
      const first = pending[0], last = pending[pending.length - 1];
      if (first.nodeType === 3) first.textContent = first.textContent.replace(/^\n+/, '');
      if (last.nodeType === 3) last.textContent = last.textContent.replace(/\n+$/, '');
      body.append(...pending);
      box.append(body);
    }
    if (!pending.length) box.classList.add('is-bare');
    if (anchor && anchor.parentNode) {
      anchor.parentNode.insertBefore(box, anchor);
      if (m) anchor.remove();
    } else {
      main.append(box);
    }
    pending = [];
    prevUid = null; // 補充卡片把推文切開了，之後的推文重新計算「連續」
  }

  // ───────────── 互動：滑過 ID，高亮同一人的所有推文 ─────────────

  main.addEventListener('mouseover', (e) => {
    const uidEl = e.target.closest('.push-userid, .ptt-uid');
    const uid = uidEl?.closest('.push')?.dataset.uid || (uidEl?.classList.contains('ptt-uid') ? uidEl.textContent : undefined);
    if (uid === main.dataset.hlUid) return; // 沒換人就不重跑，mouseover 觸發得很頻繁
    main.querySelectorAll('.uid-hl').forEach((p) => p.classList.remove('uid-hl'));
    if (uid) {
      main.dataset.hlUid = uid;
      main.querySelectorAll('.push[data-uid]').forEach((p) => {
        if (p.dataset.uid.toLowerCase() === uid.toLowerCase()) p.classList.add('uid-hl');
      });
      main.classList.add('has-uid-hl');
    } else {
      delete main.dataset.hlUid;
      main.classList.remove('has-uid-hl');
    }
  });

  // ───────────── 新推文（點「有新推文」時 PTT 會動態加進來） ─────────────

  new MutationObserver((records) => {
    for (const r of records) {
      r.addedNodes.forEach((n) => {
        if (n.nodeType === 1 && n.classList.contains('push')) decoratePush(n);
      });
    }
  }).observe(main, { childList: true });

  document.documentElement.classList.add('ptt-enhanced');
})();
