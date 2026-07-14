/**
 * Sub-Store Bot — Telegram 剪贴板 + 订阅转换
 * 
 * 依赖:
 *   - proxy-utils.js (Sub-Store 引擎)
 *   - Cloudflare Workers KV — 短链存储
 *   - BOT_TOKEN — Telegram Bot Token
 * 
 * 部署格式: ES Module Worker
 * 需要 CF 兼容性标志: nodejs_compat
 */

import { ProxyUtils } from './proxy-utils.esm.js';

// ==================== 工具函数 ====================

function genId(len = 7) {
  const c = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let r = '';
  for (let i = 0; i < len; i++) r += c[Math.floor(Math.random() * c.length)];
  return r;
}

// ==================== Telegram 工具 ====================

async function tg(method, token, body) {
  const r = await fetch('https://api.telegram.org/bot' + token + '/' + method, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return r.json();
}

function escapeHTML(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ==================== 键盘 ====================

function mainKb() {
  return {
    inline_keyboard: [
      [
        { text: '\u{1F310} 远程订阅', callback_data: 'input_url' },
        { text: '\u{1F4CE} 本地订阅', callback_data: 'input_file' },
      ],
      [
        { text: '\u{1F504} 格式选择', callback_data: 'fmt_menu' },
        { text: '\u23F1 有效期', callback_data: 'ttl_menu' },
      ],
      [
        { text: '\u{1F4CB} 关于', callback_data: 'help' },
      ],
    ],
  };
}

const FORMAT_OPTIONS = [
  { id: 'clashmeta', label: 'Clash Meta' },
  { id: 'qx', label: 'Quantumult X' },
  { id: 'surge', label: 'Surge' },
  { id: 'shadowrocket', label: 'Shadowrocket' },
  { id: 'singbox', label: 'sing-box' },
  { id: 'v2ray', label: 'V2Ray' },
  { id: 'loon', label: 'Loon' },
  { id: 'stash', label: 'Stash' },
  { id: 'surfboard', label: 'Surfboard' },
  { id: 'egern', label: 'Egern' },
  { id: 'uri', label: 'URI 列表' },
  { id: 'json', label: 'JSON' },
];

function fmtKb(custom) {
  const rows = [];
  let row = [];
  for (const f of FORMAT_OPTIONS) {
    const label = custom?.get(f.id) === true ? '\u2705 ' + f.label : f.label;
    row.push({ text: label, callback_data: 'conv_fmt:' + f.id });
    if (row.length === 2) {
      rows.push(row);
      row = [];
    }
  }
  if (row.length) rows.push(row);
  rows.push([{ text: '\u2190 返回', callback_data: 'menu' }]);
  return { inline_keyboard: rows };
}

function ttlKb(current) {
  const opts = [
    { s: 0, l: '\u6C38\u4E0D\u8FC7\u671F' },
    { s: 300, l: '5\u5206\u949F' },
    { s: 900, l: '15\u5206\u949F' },
    { s: 3600, l: '1\u5C0F\u65F6' },
    { s: 21600, l: '6\u5C0F\u65F6' },
    { s: 86400, l: '1\u5929' },
    { s: 604800, l: '7\u5929' },
    { s: 2592000, l: '30\u5929' },
  ];
  const rows = [];
  let row = [];
  for (const o of opts) {
    row.push({ text: o.l, callback_data: 'ttl_set:' + o.s });
    if (row.length === 2) {
      rows.push(row);
      row = [];
    }
  }
  if (row.length) rows.push(row);
  rows.push([{ text: '\u2190 返回', callback_data: 'menu' }]);
  return { inline_keyboard: rows };
}

function backKb() {
  return { inline_keyboard: [[{ text: '\u2190 返回', callback_data: 'menu' }]] };
}

function resultKb(url, content) {
  return {
    inline_keyboard: [
      [
        { text: '\u{1F4CB} \u590D\u5236\u94FE\u63A5', copy_text: { text: url } },
        { text: '\u{1F4E5} \u4E0B\u8F7D\u7ED3\u679C', callback_data: 'dl_result' },
      ],
      [
        { text: '\u{1F4E4} \u5206\u4EAB', switch_inline_query: url },
        { text: '\u{1F517} \u6253\u5F00', url: url },
      ],
      [
        { text: '\u{1F504} \u518D\u6B21\u8F6C\u6362', callback_data: 'conv_again' },
        { text: '\u{1F3E0} \u4E3B\u9875', callback_data: 'menu' },
      ],
    ],
  };
}

// ==================== 用户状态管理 ====================

const state = new Map();

function getState(uid) {
  if (!state.has(uid)) {
    state.set(uid, { ttl: 0 }); // 默认永久
  }
  return state.get(uid);
}

// ==================== 订阅拉取 ====================

const FETCH_UAS = [
  'clashmeta/2.0',
  'Quantumult%20X/1.0',
  'Shadowrocket/2.0',
  'Surge/5.0',
  'Stash/3.0',
  'Loon/3.0',
  'sing-box/1.0',
  'v2rayN/6.0',
  'curl/8.0',
];

async function fetchSub(url) {
  // 并发请求所有 UA，取节点最多的
  const results = await Promise.allSettled(
    FETCH_UAS.map((ua) =>
      fetch(url, { headers: { 'User-Agent': ua } }).then((r) => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      })
    )
  );

  let bestText = '';
  let bestCount = 0;
  let bestUa = '';

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status !== 'fulfilled') continue;

    const text = r.value;
    // 过滤掉非节点内容（错误提示、空白页等）
    if (!text || text.length < 50) continue;
    if (text.includes('访问被拒绝') || text.includes('不支持浏览器')) continue;

    // 解析并统计节点数
    try {
      const proxies = ProxyUtils.parse(text);
      if (proxies && proxies.length > bestCount) {
        bestCount = proxies.length;
        bestText = text;
        bestUa = FETCH_UAS[i];
      }
    } catch {
      // 解析失败可能只是普通文本，跳过
    }
  }

  // 如果所有 UA 都解析不到节点，保底：用内容最长的
  if (!bestText) {
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status !== 'fulfilled') continue;
      const text = r.value;
      if (text.length > bestText.length && !text.includes('访问被拒绝') && !text.includes('不支持浏览器')) {
        bestText = text;
        bestUa = FETCH_UAS[i];
      }
    }
  }

  return { text: bestText, ua: bestUa, count: bestCount };
}

// ==================== 手动解析 socks:// URI（Sub-Store 不识别） ====================

function parseSocksUris(text) {
  const proxies = [];
  const lines = text.split(/\n/);
  for (const line of lines) {
    const s = line.trim();
    if (!s.startsWith('socks://')) continue;
    try {
      const m = s.match(/^socks:\/\/([^?]+)(?:\?(.+))?$/);
      if (!m) continue;
      // 兼容 URL-safe base64（可能含 - _）
      let b64 = m[1].replace(/-/g, '+').replace(/_/g, '/');
      // 补全 padding
      while (b64.length % 4) b64 += '=';
      const decoded = atob(b64);
      const query = m[2] || '';
      const remarksMatch = query.match(/remarks=([^&]+)/);
      const remarks = remarksMatch ? decodeURIComponent(remarksMatch[1]) : ('socks5 ' + (decoded.split('@')[1] || ''));

      // decoded 格式: user:password@host:port
      const atIdx = decoded.lastIndexOf('@');
      if (atIdx < 0) continue;
      const creds = decoded.slice(0, atIdx);
      const hostPort = decoded.slice(atIdx + 1);
      const colonIdx = creds.indexOf(':');
      const username = colonIdx >= 0 ? decodeURIComponent(creds.slice(0, colonIdx)) : decodeURIComponent(creds);
      const password = colonIdx >= 0 ? creds.slice(colonIdx + 1) : '';
      const hp = hostPort.split(':');
      const server = hp[0];
      const port = parseInt(hp[1] || '80', 10);

      const proxy = {
        type: 'socks5',
        name: remarks,
        server,
        port,
      };
      if (username) proxy.username = username;
      if (password) proxy.password = password;
      proxies.push(proxy);
    } catch (e) {
      // 单条解析失败不影响其他
      continue;
    }
  }
  return proxies;
}

// ==================== 节点去重（按特征而非节点名） ====================

function deduplicateProxies(proxies) {
  const seen = new Set();
  return proxies.filter(p => {
    let key;
    switch (p.type) {
      case 'vmess':
      case 'vless':
        key = p.server + ':' + p.port + ':' + p.type + ':' + p.uuid;
        break;
      case 'ss':
        key = p.server + ':' + p.port + ':' + p.type + ':' + p.password + ':' + p.cipher;
        break;
      case 'trojan':
        key = p.server + ':' + p.port + ':' + p.type + ':' + p.password;
        break;
      case 'socks5':
        key = p.server + ':' + p.port + ':' + p.type + ':' + (p.username || '') + ':' + (p.password || '');
        break;
      case 'hysteria2':
      case 'hy2':
        key = p.server + ':' + p.port + ':' + p.type + ':' + (p.password || p.auth || '');
        break;
      default:
        key = p.server + ':' + p.port + ':' + p.type;
    }
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ==================== KV 累计状态（跨实例共享） ====================

async function getAccState(uid, env) {
  try {
    const raw = await env.KV.get('acc:' + uid, { type: 'json' });
    return raw || null;
  } catch { return null; }
}

async function saveAccState(uid, env, data) {
  await env.KV.put('acc:' + uid, JSON.stringify(data), { expirationTtl: 300 });
}

async function clearAccState(uid, env) {
  await env.KV.delete('acc:' + uid);
}

// ==================== 保存到短链 ====================

async function saveToClip(text, ttl, env) {
  // 直接写 KV，不调外部 API
  const id = genId();
  const kvOpts = {};
  if (ttl > 0) kvOpts.expirationTtl = ttl < 60 ? 60 : ttl;
  await env.KV.put('share_' + id, JSON.stringify({ text }), kvOpts);
  return id;
}

// ==================== 用户白名单 ====================

function isAllowed(uid, env) {
  const adminId = env.ADMIN_ID;
  const allowedRaw = env.ALLOWED_USERS;
  // 如果没设任何变量，开放使用（向后兼容）
  if (!adminId && !allowedRaw) return true;
  // 检查管理员
  if (adminId && uid === adminId.trim()) return true;
  // 检查白名单
  if (allowedRaw) {
    const list = allowedRaw.split(',').map((s) => s.trim());
    if (list.includes(uid)) return true;
  }
  return false;
}

// ==================== 消息处理 ====================

async function onMsg(msg, env) {
  const cid = msg.chat.id;
  const uid = String(msg.from.id);
  if (!isAllowed(uid, env)) return;
  const u = getState(uid);

  // /start
  if (msg.text && msg.text.trim() === '/start') {
    await clearAccState(uid, env);
    return tg('sendMessage', env.BOT_TOKEN, {
      chat_id: cid,
      text:
        '<b>\u{1F916} Sub-Store Bot</b>\n\n' +
        '\u{1F310} <b>\u8FDC\u7A0B\u8BA2\u9605</b> \u2014 \u53D1\u9001\u8BA2\u9605\u94FE\u63A5\n' +
        '\u{1F4CE} <b>\u672C\u5730\u8BA2\u9605</b> \u2014 \u53D1\u9001\u8282\u70B9\u6216\u6587\u4EF6\n' +
        '\u{1F504} \u652F\u6301 12 \u79CD\u8F93\u51FA\u683C\u5F0F\n\n' +
        '\u{1F517} \u8F6C\u6362\u7ED3\u679C\u4EE5\u77ED\u94FE\u5F62\u5F0F\u8FD4\u56DE',
      parse_mode: 'HTML',
      reply_markup: mainKb(),
    });
  }

  // 获取输入内容
  let content = '';
  let isRemote = false;

  if (msg.text) {
    content = msg.text.trim();
    // 判断是否为 URL
    if (content.startsWith('http://') || content.startsWith('https://')) {
      isRemote = true;
    }
  } else if (msg.document) {
    const f = await tg('getFile', env.BOT_TOKEN, {
      file_id: msg.document.file_id,
    });
    if (!f.ok) return;
    const r = await fetch(
      'https://api.telegram.org/file/bot' +
        env.BOT_TOKEN +
        '/' +
        f.result.file_path
    );
    content = await r.text();
  } else {
    return;
  }

  if (!content) return;

  const ttl = u.ttl !== undefined ? u.ttl : 0;

  // 远程订阅：拉取内容
  let subText = content;
  if (isRemote) {
    // 支持多条 URL（换行分隔）
    const urls = content.split(/\n/).map(s => s.trim()).filter(s => s.startsWith('http://') || s.startsWith('https://'));

    if (urls.length === 0) {
      return tg('sendMessage', env.BOT_TOKEN, {
        chat_id: cid,
        text: '\u274C \u672A\u68C0\u6D4B\u5230\u6709\u6548\u8BA2\u9605\u94FE\u63A5',
      });
    }

    if (urls.length === 1) {
      try {
        await tg('sendMessage', env.BOT_TOKEN, {
          chat_id: cid,
          text: '\u{1F504} \u6B63\u5728\u62C9\u53D6\u8BA2\u9605...',
        });
        const subResult = await fetchSub(urls[0]);
        subText = subResult.text;
      } catch (e) {
        return tg('sendMessage', env.BOT_TOKEN, {
          chat_id: cid,
          text: '\u274C \u62C9\u53D6\u5931\u8D25: ' + e.message,
        });
      }
    } else {
      await tg('sendMessage', env.BOT_TOKEN, {
        chat_id: cid,
        text: '\u{1F504} \u6B63\u5728\u62C9\u53D6 ' + urls.length + ' \u4E2A\u8BA2\u9605...',
      });

      const results = await Promise.allSettled(urls.map(url => fetchSub(url)));

      const texts = [];
      const errors = [];
      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        if (r.status === 'fulfilled' && r.value.text) {
          texts.push(r.value.text);
        } else {
          const reason = r.status === 'rejected' ? (r.reason?.message || '\u8D85\u65F6') : '\u65E0\u6570\u636E';
          errors.push('\u2022 ' + urls[i] + ': ' + reason);
        }
      }

      if (texts.length === 0) {
        return tg('sendMessage', env.BOT_TOKEN, {
          chat_id: cid,
          text: '\u274C \u6240\u6709\u8BA2\u9605\u90FD\u62C9\u53D6\u5931\u8D25:\n' + errors.join('\n'),
        });
      }

      subText = texts.join('\n');

      let report = '\u2705 ' + texts.length + '/' + urls.length + ' \u4E2A\u8BA2\u9605\u62C9\u53D6\u6210\u529F';
      if (errors.length > 0) {
        report += '\n\n\u26A0\uFE0F \u5931\u8D25\u7684\u8BA2\u9605:\n' + errors.join('\n');
      }
      await tg('sendMessage', env.BOT_TOKEN, {
        chat_id: cid,
        text: report,
      });
    }
  }

  // 解析节点
  let proxies;
  try {
    proxies = ProxyUtils.parse(subText);
  } catch (e) {
    proxies = null;
  }

  // Sub-Store 不解析 socks://，手动补充
  if ((!proxies || proxies.length === 0)) {
    const socksParsed = parseSocksUris(subText);
    if (socksParsed.length > 0) {
      proxies = socksParsed;
    }
  }

  // 去重（基于节点特征而非节点名）
  if (proxies && proxies.length > 0) {
    proxies = deduplicateProxies(proxies);
  }

  // 读取 KV 累计状态
  let accState = isRemote ? null : (await getAccState(uid, env));

  // 远程订阅 → 清累计；本地订阅 → 合并
  if (isRemote) {
    await clearAccState(uid, env);
  } else if (accState && accState.proxies && accState.proxies.length > 0) {
    proxies = deduplicateProxies([...accState.proxies, ...proxies]);
  }

  if (!proxies || proxies.length === 0) {
    // 没有节点 — 当作普通文本保存
    try {
      const id = await saveToClip(subText, ttl, env);
      const clipUrl =
        (env.CLIP_URL || '') + '/share/' + id;
      const preview =
        subText.length > 150
          ? subText.slice(0, 150) + '...'
          : subText;
      const ttlT =
        ttl === 0
          ? '\u6C38\u4E0D\u8FC7\u671F'
          : ttl < 3600
          ? Math.round(ttl / 60) + '\u5206\u949F'
          : Math.round(ttl / 3600) + '\u5C0F\u65F6';
      u._lastContent = subText;
      return tg('sendMessage', env.BOT_TOKEN, {
        chat_id: cid,
        text:
          '\u2705 <b>\u5DF2\u4FDD\u5B58</b>\n\n' +
          '\u{1F517} <code>' + clipUrl + '</code>\n\n' +
          '\u{1F4CB} \u9884\u89C8:\n<code>' + escapeHTML(preview) + '</code>\n\n' +
          '\u23F1 ' + ttlT,
        parse_mode: 'HTML',
        reply_markup: resultKb(clipUrl),
      });
    } catch (e) {
      return tg('sendMessage', env.BOT_TOKEN, {
        chat_id: cid,
        text: '\u274C \u4FDD\u5B58\u5931\u8D25: ' + e.message,
      });
    }
  }

  // 有节点 — 统计类型，弹出格式选择
  const types = {};
  for (const p of proxies) {
    types[p.type] = (types[p.type] || 0) + 1;
  }
  const typeStr = Object.entries(types)
    .map(([k, v]) => k + ': ' + v)
    .join(', ');

  // 缓存订阅内容供后续转换用
  u._lastSubInput = subText;
  u._lastProxies = proxies;

  const accHint = accState && accState.proxies && accState.proxies.length > 0
    ? '\n\u{1F504} <b>\u7D2F\u8BA1\u6A21\u5F0F</b> \u2014 \u53D1\u9001\u66F4\u591A\u8BA2\u9605\u5185\u5BB9\u5C06\u81EA\u52A8\u5408\u5E76\uFF0C\u70B9\u51FB\u683C\u5F0F\u6309\u94AE\u5F00\u59CB\u8F6C\u6362\n'
    : '';

  // 有累计消息则编辑，否则新发
  if (!isRemote && accState && accState.fmtMsg && accState.fmtMsg.id) {
    await tg('editMessageText', env.BOT_TOKEN, {
      chat_id: accState.fmtMsg.cid,
      message_id: accState.fmtMsg.id,
      text:
        '\u{1F504} <b>\u68C0\u6D4B\u5230\u8BA2\u9605\u5185\u5BB9</b>\n\n' +
        '\u{1F4CA} \u8282\u70B9\u6570: <b>' + proxies.length + '</b>\n' +
        '\u{1F4CD} ' + typeStr + '\n' +
        accHint +
        '\u8BF7\u9009\u62E9\u8F93\u51FA\u683C\u5F0F:',
      parse_mode: 'HTML',
      reply_markup: fmtKb(),
    });
    await saveAccState(uid, env, { proxies, fmtMsg: accState.fmtMsg });
  } else {
    const sent = await tg('sendMessage', env.BOT_TOKEN, {
      chat_id: cid,
      text:
        '\u{1F504} <b>\u68C0\u6D4B\u5230\u8BA2\u9605\u5185\u5BB9</b>\n\n' +
        '\u{1F4CA} \u8282\u70B9\u6570: <b>' + proxies.length + '</b>\n' +
        '\u{1F4CD} ' + typeStr + '\n' +
        accHint +
        '\u8BF7\u9009\u62E9\u8F93\u51FA\u683C\u5F0F:',
      parse_mode: 'HTML',
      reply_markup: fmtKb(),
    });
    await saveAccState(uid, env, {
      proxies,
      fmtMsg: (sent && sent.ok && sent.result)
        ? { cid: cid, id: sent.result.message_id }
        : null,
    });
  }
}

// ==================== 回调处理 ====================

async function onCb(q, env) {
  const uid = String(q.from.id);
  if (!isAllowed(uid, env)) return;
  const cid = q.message.chat.id;
  const mid = q.message.message_id;
  const u = getState(uid);
  const d = q.data;

  await tg('answerCallbackQuery', env.BOT_TOKEN, {
    callback_query_id: q.id,
  });

  if (d === 'menu') {
    await clearAccState(uid, env);
    return tg('editMessageText', env.BOT_TOKEN, {
      chat_id: cid,
      message_id: mid,
      text:
        '<b>\u{1F916} Sub-Store Bot</b>\n\n' +
        '\u{1F310} \u8FDC\u7A0B\u8BA2\u9605: \u53D1\u9001\u8BA2\u9605\u94FE\u63A5\n' +
        '\u{1F4CE} \u672C\u5730\u8BA2\u9605: \u53D1\u9001\u8282\u70B9/\u6587\u4EF6',
      parse_mode: 'HTML',
      reply_markup: mainKb(),
    });
  }

  if (d === 'input_url') {
    u.state = 'URL';
    return tg('editMessageText', env.BOT_TOKEN, {
      chat_id: cid,
      message_id: mid,
      text: '\u{1F310} \u8BF7\u53D1\u9001\u8BA2\u9605\u94FE\u63A5',
      parse_mode: 'HTML',
      reply_markup: backKb(),
    });
  }

  if (d === 'input_file') {
    u.state = 'FILE';
    return tg('editMessageText', env.BOT_TOKEN, {
      chat_id: cid,
      message_id: mid,
      text: '\u{1F4CE} \u8BF7\u53D1\u9001\u8282\u70B9\u6587\u672C\u6216\u6587\u4EF6',
      parse_mode: 'HTML',
      reply_markup: backKb(),
    });
  }

  if (d === 'ttl_menu') {
    return tg('editMessageText', env.BOT_TOKEN, {
      chat_id: cid,
      message_id: mid,
      text: '\u23F1 <b>\u6709\u6548\u671F</b>',
      parse_mode: 'HTML',
      reply_markup: ttlKb(),
    });
  }

  if (d.startsWith('ttl_set:')) {
    u.ttl = parseInt(d.split(':')[1]);
    const lbl =
      u.ttl === 0
        ? '\u6C38\u4E0D\u8FC7\u671F'
        : u.ttl < 3600
        ? Math.round(u.ttl / 60) + '\u5206\u949F'
        : Math.round(u.ttl / 3600) + '\u5C0F\u65F6';
    return tg('editMessageText', env.BOT_TOKEN, {
      chat_id: cid,
      message_id: mid,
      text: '\u2705 \u6709\u6548\u671F: <b>' + lbl + '</b>',
      parse_mode: 'HTML',
      reply_markup: mainKb(),
    });
  }

  if (d === 'fmt_menu') {
    return tg('editMessageText', env.BOT_TOKEN, {
      chat_id: cid,
      message_id: mid,
      text: '\u{1F504} <b>\u9009\u62E9\u8F93\u51FA\u683C\u5F0F</b>\n\n' +
        '\u652F\u6301 12 \u79CD\u5BA2\u6237\u7AEF\u683C\u5F0F',
      parse_mode: 'HTML',
      reply_markup: fmtKb(),
    });
  }

  if (d === 'dl_result') {
    if (!u._lastContent) {
      return tg('answerCallbackQuery', env.BOT_TOKEN, {
        callback_query_id: q.id,
        text: '\u6682\u65E0\u8F6C\u6362\u7ED3\u679C',
        show_alert: true,
      });
    }

    // 发送结果文件 (用 multipart/form-data)
    const formData = new FormData();
    formData.append('chat_id', String(cid));
    formData.append('document', new Blob([u._lastContent], { type: 'text/plain' }), 'config.txt');
    formData.append('caption', '\u{1F4E5} \u8F6C\u6362\u7ED3\u679C');

    await fetch('https://api.telegram.org/bot' + env.BOT_TOKEN + '/sendDocument', {
      method: 'POST',
      body: formData,
    });

    return tg('answerCallbackQuery', env.BOT_TOKEN, {
      callback_query_id: q.id,
      text: '\u5DF2\u53D1\u9001\u6587\u4EF6',
    });
  }

  if (d === 'conv_again') {
    if (!u._lastSubInput) {
      return tg('editMessageText', env.BOT_TOKEN, {
        chat_id: cid,
        message_id: mid,
        text: '\u274C \u6CA1\u6709\u4E0A\u6B21\u7684\u8BA2\u9605\u7F13\u5B58\uFF0C\u8BF7\u91CD\u65B0\u53D1\u9001',
        parse_mode: 'HTML',
        reply_markup: mainKb(),
      });
    }
    let proxies;
    try {
      proxies = ProxyUtils.parse(u._lastSubInput);
    } catch (e) {
      proxies = null;
    }
    if ((!proxies || proxies.length === 0)) {
      const socksParsed = parseSocksUris(u._lastSubInput);
      if (socksParsed.length > 0) {
        proxies = socksParsed;
      }
    }
    proxies = deduplicateProxies(proxies || []);
    await clearAccState(uid, env);
    if (!proxies || proxies.length === 0) {
      return tg('editMessageText', env.BOT_TOKEN, {
        chat_id: cid,
        message_id: mid,
        text: '\u274C \u89E3\u6790\u5931\u8D25',
        parse_mode: 'HTML',
        reply_markup: mainKb(),
      });
    }
    u._lastProxies = proxies;
    return tg('editMessageText', env.BOT_TOKEN, {
      chat_id: cid,
      message_id: mid,
      text:
        '\u{1F504} <b>\u68C0\u6D4B\u5230\u8BA2\u9605\u5185\u5BB9</b>\n\n' +
        '\u{1F4CA} \u8282\u70B9\u6570: <b>' + proxies.length + '</b>\n\n' +
        '\u8BF7\u9009\u62E9\u8F93\u51FA\u683C\u5F0F:',
      parse_mode: 'HTML',
      reply_markup: fmtKb(),
    });
  }

  if (d.startsWith('conv_fmt:')) {
    const fmt = d.split(':')[1];
    const fmtLabel = FORMAT_OPTIONS.find((f) => f.id === fmt)?.label || fmt;

    if (!u._lastProxies || u._lastProxies.length === 0) {
      return tg('editMessageText', env.BOT_TOKEN, {
        chat_id: cid,
        message_id: mid,
        text: '\u274C \u6CA1\u6709\u53EF\u8F6C\u6362\u7684\u8282\u70B9\uFF0C\u8BF7\u91CD\u65B0\u53D1\u9001',
        parse_mode: 'HTML',
        reply_markup: mainKb(),
      });
    }

    // 转换
    let output;
    try {
      output = ProxyUtils.produce(u._lastProxies, fmt);
    } catch (e) {
      return tg('editMessageText', env.BOT_TOKEN, {
        chat_id: cid,
        message_id: mid,
        text: '\u274C \u8F6C\u6362\u5931\u8D25: ' + e.message,
        parse_mode: 'HTML',
        reply_markup: fmtKb(),
      });
    }

    if (!output) {
      return tg('editMessageText', env.BOT_TOKEN, {
        chat_id: cid,
        message_id: mid,
        text: '\u274C \u8F6C\u6362\u7ED3\u679C\u4E3A\u7A7A',
        parse_mode: 'HTML',
        reply_markup: fmtKb(),
      });
    }

    // 先发 "转换中" 提示
    await tg('editMessageText', env.BOT_TOKEN, {
      chat_id: cid,
      message_id: mid,
      text: '\u{1F504} \u8F6C\u6362\u4E2D... (' + fmtLabel + ')',
      parse_mode: 'HTML',
    });

    // 保存到短链
    try {
      const id = await saveToClip(String(output), u.ttl || 300, env);
      u._lastContent = String(output);
      const clipUrl =
        (env.CLIP_URL || '') + '/share/' + id;

      const ttlT =
        (u.ttl === 0)
          ? '\u6C38\u4E0D\u8FC7\u671F'
          : (u.ttl || 300) < 3600
          ? Math.round((u.ttl || 300) / 60) + '\u5206\u949F'
          : Math.round((u.ttl || 300) / 3600) + '\u5C0F\u65F6';

      await tg('editMessageText', env.BOT_TOKEN, {
        chat_id: cid,
        message_id: mid,
        text:
          '\u2705 <b>\u8F6C\u6362\u5B8C\u6210</b>\n' +
          '\u{1F4CA} ' + u._lastProxies.length + ' \u8282\u70B9 \u2192 <b>' + fmtLabel + '</b>\n\n' +
          '\u{1F517} <code>' + clipUrl + '</code>\n\n' +
          '\u23F1 ' + ttlT,
        parse_mode: 'HTML',
        reply_markup: resultKb(clipUrl),
      });
    } catch (e) {
      // 保存失败，直接返回转换结果
      const preview =
        String(output).length > 300
          ? String(output).slice(0, 300) + '...'
          : String(output);

      await tg('editMessageText', env.BOT_TOKEN, {
        chat_id: cid,
        message_id: mid,
        text:
          '\u{1F504} <b>' + fmtLabel + '</b>\n\n' +
          '<code>' + escapeHTML(preview) + '</code>',
        parse_mode: 'HTML',
        reply_markup: mainKb(),
      });
    }
    return;
  }

  if (d === 'help') {
    return tg('editMessageText', env.BOT_TOKEN, {
      chat_id: cid,
      message_id: mid,
      text:
        '\u{1F4CB} <b>\u5173\u4E8E</b>\n\n' +
        '\u{1F310} \u8FDC\u7A0B\u8BA2\u9605: \u53D1\u94FE\u63A5\uFF0C\u81EA\u52A8\u62C9\u53D6\u8F6C\u6362\n' +
        '\u{1F4CE} \u672C\u5730\u8BA2\u9605: \u53D1\u8282\u70B9/\u6587\u4EF6\uFF0C\u81EA\u52A8\u89E3\u6790\u8F6C\u6362\n' +
        '\u2705 \u666E\u901A\u6587\u672C: \u81EA\u52A8\u4FDD\u5B58\u4E3A\u77ED\u94FE\n\n' +
        '\u{1F4E6} \u8F93\u51FA\u683C\u5F0F (12\u79CD):\n' +
        'Clash Meta / QX / Surge / Shadowrocket\n' +
        'sing-box / V2Ray / Loon / Stash\n' +
        'Surfboard / Egern / URI / JSON',
      parse_mode: 'HTML',
      reply_markup: mainKb(),
    });
  }
}

// ==================== Worker 入口 ====================

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

    // Webhook
    // POST /save — 剪贴板保存 (jtb-clip 兼容接口)
    if (path === '/save' && request.method === 'POST') {
      try {
        const body = await request.json();
        const text = body.text;
        const ttl = body.ttl !== undefined ? body.ttl : 0;
        if (!text) {
          return new Response(JSON.stringify({ error: 'text required' }), {
            status: 400, headers: { 'Content-Type': 'application/json', ...cors },
          });
        }
        const id = await saveToClip(text, ttl, env);
        return new Response(JSON.stringify({ id, ttl }), {
          headers: { 'Content-Type': 'application/json', ...cors },
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message, stack: e.stack }), {
          status: 500, headers: { 'Content-Type': 'application/json', ...cors },
        });
      }
    }

    // GET /share/:id — 获取剪贴板内容 (原始内容，供代理客户端导入)
    const shareMatch = path.match(/^\/share\/([a-zA-Z0-9]+)$/);
    if (request.method === 'GET' && shareMatch) {
      const id = shareMatch[1];
      try {
        const raw = await env.KV.get('share_' + id);
        if (!raw) {
          return new Response('Not found', { status: 404 });
        }
        const data = JSON.parse(raw);
        return new Response(data.text, {
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      } catch (e) {
        return new Response(raw || 'Error', { status: 500 });
      }
    }

    if (path === '/webhook' && request.method === 'POST') {
      try {
        const u = await request.json();
        if (u.message) ctx.waitUntil(onMsg(u.message, env));
        if (u.callback_query) ctx.waitUntil(onCb(u.callback_query, env));
      } catch (e) {
        console.error('webhook error:', e);
      }
      return new Response('ok');
    }

    // API: 订阅转换 (给外部调)
    if (path === '/api/convert' && request.method === 'POST') {
      try {
        const body = await request.json();
        const input = body.input;
        const target = body.target || 'clashmeta';
        if (!input) {
          return new Response(JSON.stringify({ error: 'input required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...cors },
          });
        }
        let proxies;
        try {
          proxies = ProxyUtils.parse(input);
        } catch (e) {
          proxies = null;
        }
        if ((!proxies || proxies.length === 0)) {
          const socksParsed = parseSocksUris(input);
          if (socksParsed.length > 0) {
            proxies = socksParsed;
          }
        }
        if (!proxies || proxies.length === 0) {
          return new Response(
            JSON.stringify({ success: false, count: 0, output: '' }),
            { headers: { 'Content-Type': 'application/json', ...cors } }
          );
        }
        const output = ProxyUtils.produce(proxies, target);
        return new Response(
          JSON.stringify({ success: true, count: proxies.length, output: String(output), target }),
          { headers: { 'Content-Type': 'application/json', ...cors } }
        );
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...cors },
        });
      }
    }

    // Health
    return new Response(
      JSON.stringify({
        service: 'sub-store-bot',
        version: '3.0',
        bot: typeof env.BOT_TOKEN !== 'undefined',
        clipUrl: env.CLIP_URL || '',
        engine: 'Sub-Store',
        formats: FORMAT_OPTIONS.map(f => f.id),
      }),
      { headers: { 'Content-Type': 'application/json', ...cors } }
    );
  },
};
