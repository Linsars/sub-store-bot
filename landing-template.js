/**
 * 落地页生成函数 — Sub-Store Bot
 * 赛博风订阅链接落地页：在线时显示信息，失效时上演黑客刷屏
 */
function landingPageHTML(raw, id, consumed, ipCount, env) {
  const clipUrl = ((env.CLIP_URL || '').replace(/\/+$/, '')) + '/share/' + id;
  const rawUrl = clipUrl + '?raw=1';
  const maxIPs = raw.maxAccess || 0;
  const ttl = raw.ttl || 0;

  const LANGUAGES = [
    '订阅已失效', '訂閱已失效', 'Subscription Expired',
    'サブスクリプション期限切れ', '구독이 만료되었습니다',
    'Подписка истекла', 'انتهت صلاحية الاشتراك', 'Suscripción caducada',
  ];

  // 计算剩余时间可读文本（根据创建时间和TTL估算）
  let timeInfo;
  const createdAt = raw._createdAt || Date.now();
  const expiresAt = ttl > 0 ? createdAt + ttl * 1000 : 0;
  if (ttl === 0) {
    timeInfo = 'NO LIMIT';
  } else if (expiresAt && Date.now() < expiresAt) {
    const r = Math.round((expiresAt - Date.now()) / 1000);
    if (r < 60) timeInfo = r + 's';
    else if (r < 3600) timeInfo = Math.round(r / 60) + 'm';
    else if (r < 86400) timeInfo = Math.floor(r / 3600) + 'h ' + Math.round((r % 3600) / 60) + 'm';
    else timeInfo = Math.floor(r / 86400) + 'd ' + Math.floor((r % 86400) / 3600) + 'h';
  } else {
    timeInfo = 'EXPIRED';
  }

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${consumed ? '⚠ SECURITY BREACH' : 'STAR.CORE — SUBSCRIPTION GATE'}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
@keyframes scanline{0%{top:0}100%{top:100%}}
@keyframes fade{0%,100%{opacity:.3}50%{opacity:1}}
@keyframes glitch{0%{text-shadow:.05em 0 0 rgba(255,0,0,.75),-.05em 0 0 rgba(0,255,255,.75)}14%{text-shadow:.05em 0 0 rgba(255,0,0,.75),-.05em 0 0 rgba(0,255,255,.75)}15%{text-shadow:-.05em 0 0 rgba(255,0,0,.75),.05em 0 0 rgba(0,255,255,.75)}49%{text-shadow:-.05em 0 0 rgba(255,0,0,.75),.05em 0 0 rgba(0,255,255,.75)}50%{text-shadow:.05em 0 0 rgba(255,0,0,.75),-.05em 0 0 rgba(0,255,255,.75)}99%{text-shadow:.05em 0 0 rgba(255,0,0,.75),-.05em 0 0 rgba(0,255,255,.75)}100%{text-shadow:.05em 0 0 rgba(255,0,0,.75),-.05em 0 0 rgba(0,255,255,.75)}}
@keyframes stream{0%{transform:translateY(-100%)}100%{transform:translateY(100%)}}
@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
body{background:#050510;color:#b5ffb5;font-family:'Courier New',monospace;min-height:100vh;display:flex;flex-direction:column;align-items:center;overflow-x:hidden}
.scanline{position:fixed;left:0;width:100%;height:4px;background:rgba(0,255,65,.08);z-index:9999;pointer-events:none;animation:scanline 3s linear infinite}
.container{width:100%;max-width:560px;padding:20px;z-index:1;position:relative}
.header{text-align:center;padding:30px 0 20px;border-bottom:1px solid rgba(0,255,65,.2)}
.header h1{font-size:1.1em;letter-spacing:4px;color:#0f0;text-shadow:0 0 20px rgba(0,255,0,.5);animation:fade 2s ease-in-out infinite}
.header .sub{font-size:.7em;color:rgba(0,255,65,.5);margin-top:6px;letter-spacing:2px}
.status-panel{background:rgba(0,20,0,.5);border:1px solid rgba(0,255,65,.15);border-radius:4px;padding:16px;margin:20px 0}
.status-panel .stat{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(0,255,65,.05);font-size:.82em}
.status-panel .stat:last-child{border-bottom:none}
.stat .label{color:rgba(0,255,65,.5);text-transform:uppercase;letter-spacing:1px}
.stat .value{color:#0f0;font-weight:700}
.stat .value.alert{color:#ff4444;text-shadow:0 0 10px rgba(255,0,0,.5)}
.node-count{text-align:center;padding:12px;margin:16px 0;background:rgba(0,20,0,.3);border:1px solid rgba(0,255,65,.1);border-radius:4px}
.node-count .big{font-size:2em;color:#0f0;text-shadow:0 0 15px rgba(0,255,0,.4)}
.node-count .small{font-size:.75em;color:rgba(0,255,65,.5);margin-top:4px}
.url-box{background:rgba(0,10,0,.6);border:1px solid rgba(0,255,65,.2);border-radius:4px;padding:12px;margin:16px 0;position:relative}
.url-box code{display:block;font-size:.75em;word-break:break-all;color:#0f0;padding:8px;background:rgba(0,0,0,.4);border-radius:3px;line-height:1.5}
.url-box .copy-btn{display:block;width:100%;padding:10px;margin-top:10px;background:rgba(0,255,65,.08);border:1px solid rgba(0,255,65,.25);color:#0f0;font-family:inherit;font-size:.85em;cursor:pointer;border-radius:3px;letter-spacing:2px;transition:all .2s}
.url-box .copy-btn:hover{background:rgba(0,255,65,.15);text-shadow:0 0 10px #0f0}
.url-box .copy-btn.copied{background:rgba(0,255,65,.2);border-color:#0f0}
.footer{text-align:center;padding:30px 0;font-size:.7em;color:rgba(0,255,65,.3);letter-spacing:1px}
.blink{animation:blink 1s step-end infinite}
/* 病毒刷屏覆盖层 */
.breach-overlay{position:fixed;top:0;left:0;width:100%;height:100%;z-index:100;pointer-events:none;overflow:hidden}
.breach-text{position:absolute;font-size:.65em;line-height:1.2;color:rgba(0,255,65,.12);white-space:nowrap;writing-mode:vertical-lr;animation:stream 8s linear infinite}
.breach-alert{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:200;text-align:center;pointer-events:none}
.breach-alert h2{font-size:2.5em;color:#ff0040;text-shadow:0 0 30px rgba(255,0,64,.6),0 0 60px rgba(255,0,64,.3);animation:glitch .5s infinite;letter-spacing:6px;margin-bottom:10px}
.breach-alert .lang-cycle{font-size:1em;color:rgba(255,0,64,.6);animation:fade 3s ease-in-out infinite;letter-spacing:2px}
.breach-alert .sys-msg{font-size:.75em;color:rgba(255,0,64,.3);margin-top:20px;letter-spacing:1px}
.breach-bar{position:fixed;bottom:0;left:0;width:100%;height:3px;background:linear-gradient(90deg,transparent,#ff0040,transparent);z-index:150;animation:stream 2s linear infinite}
</style>
</head>
<body>
<div class="scanline"></div>
${consumed ? `
<div class="breach-overlay" id="breachOverlay"></div>
<div class="breach-alert">
  <h2 id="alertMain">⚠ 订阅已失效</h2>
  <div class="lang-cycle" id="langCycle">${LANGUAGES[0]}</div>
  <div class="sys-msg">// CRITICAL: SUBSCRIPTION_SIGNAL_LOST //</div>
  <div class="sys-msg" style="margin-top:10px;font-size:.6em">[ SYSTEM BREACH DETECTED — CONTAINMENT PROTOCOL FAILED ]</div>
</div>
<div class="breach-bar"></div>
<script>
const langs = ${JSON.stringify(LANGUAGES)};
let li=0;
setInterval(()=>{li=(li+1)%langs.length;document.getElementById('langCycle').textContent=langs[li]},800);
const chars='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%^&*()_+-=[]{}|;:,.<>?/~\`汉字仮名韓国語русскийعربي';
const overlay=document.getElementById('breachOverlay');
function spawnStream(){const el=document.createElement('div');el.className='breach-text';el.style.left=Math.random()*100+'%';el.style.animationDuration=(4+Math.random()*6)+'s';el.style.fontSize=(.5+Math.random()*.4)+'em';let txt='';const len=20+Math.floor(Math.random()*40);for(let i=0;i<len;i++)txt+=chars[Math.floor(Math.random()*chars.length)]+'\n';el.textContent=txt;overlay.appendChild(el);setTimeout(()=>el.remove(),10000)}
for(let i=0;i<30;i++)setTimeout(spawnStream,i*100);
setInterval(spawnStream,300);
/* 背景随机乱码填充 */
const bgCanvas=document.createElement('div');bgCanvas.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;z-index:99;pointer-events:none;overflow:hidden;opacity:.06';
document.body.appendChild(bgCanvas);
const pre=document.createElement('pre');pre.style.cssText='font-size:.5em;line-height:1.1;color:#0f0';
bgCanvas.appendChild(pre);
setInterval(()=>{let t='';for(let i=0;i<80;i++)t+=chars[Math.floor(Math.random()*chars.length)];t+='\\n';for(let i=0;i<4;i++){for(let j=0;j<50;j++)t+=chars[Math.floor(Math.random()*chars.length)];t+='\\n'}pre.textContent=t},100);
</script>
` : `
<div class="container">
  <div class="header">
    <h1>// STAR.CORE // SUBSCRIPTION_GATE</h1>
    <div class="sub">SECURE TUNNEL ACTIVE · ENCRYPTION: AES-256-GCM</div>
  </div>

  <div class="status-panel">
    <div class="stat">
      <span class="label">NODE COUNT</span>
      <span class="value">${raw.text ? (raw.text.match(/\n/g) || []).length} 节点</span>
    </div>
    <div class="stat">
      <span class="label">DEVICE LIMIT</span>
      <span class="value">${maxIPs > 0 ? maxIPs + ' IP' : 'UNLIMITED'}</span>
    </div>
    <div class="stat">
      <span class="label">TIME REMAINING</span>
      <span class="value">${timeInfo}</span>
    </div>
    <div class="stat">
      <span class="label">ACCESS COUNT</span>
      <span class="value">${ipCount}${maxIPs > 0 ? ' / ' + maxIPs : ''}</span>
    </div>
    <div class="stat">
      <span class="label">STATUS</span>
      <span class="value" style="color:#0f0;text-shadow:0 0 10px rgba(0,255,0,.5)">● ONLINE</span>
    </div>
  </div>

  <div class="url-box">
    <div style="font-size:.7em;color:rgba(0,255,65,.4);margin-bottom:6px;letter-spacing:1px">// SUBSCRIPTION_ENDPOINT</div>
    <code id="subUrl">${rawUrl}</code>
    <button class="copy-btn" id="copyBtn" onclick="copyUrl()">[ COPY LINK ]</button>
  </div>

  <div class="footer">
    <span class="blink">▌</span> SIGNAL ENCRYPTED · P2P SECURE CHANNEL · v3.0
  </div>
</div>
<script>
function copyUrl(){const t=document.getElementById('subUrl').textContent;navigator.clipboard.writeText(t).then(()=>{const b=document.getElementById('copyBtn');b.textContent='[ COPIED ]';b.classList.add('copied');setTimeout(()=>{b.textContent='[ COPY LINK ]';b.classList.remove('copied')},2000)}).catch(()=>{const ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);const b=document.getElementById('copyBtn');b.textContent='[ COPIED ]';setTimeout(()=>b.textContent='[ COPY LINK ]',2000)})}
const chars='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()_+-=[]{}|;:,.<>?/~';
function bgMatrix(){const el=document.createElement('div');el.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;pointer-events:none;overflow:hidden;opacity:.04';const p=document.createElement('pre');p.style.cssText='font-size:.5em;line-height:1.1;color:#0f0';el.appendChild(p);document.body.appendChild(el);setInterval(()=>{let t='';for(let i=0;i<60;i++){for(let j=0;j<40;j++)t+=chars[Math.floor(Math.random()*chars.length)];t+='\\n'}p.textContent=t},150)}bgMatrix();
</script>
`}
</body>
</html>`;
}
