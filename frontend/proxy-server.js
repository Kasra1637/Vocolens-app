/**
 * VocoLens – Phone Mockup + QR Code Server (port 3000)
 *
 * GET /           → side-by-side: iPhone mockup (web) + Expo Go QR code
 * GET /app.html   → proxy to Metro:3001 root (Expo web app)
 * GET /*          → proxy to Metro:3001 as-is (assets, bundles)
 * GET /tunnel-url → JSON { ready, tunnelUrl, expoUrl }
 * WS  upgrade     → proxy to Metro:3001 (HMR hot-reload)
 */

const http = require('http');
const net = require('net');

// ── Configuration ─────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT) || 3000;
const METRO_PORT = 3001;
const NGROK_API_PORT = 4040;
const NGROK_API_PATH = '/api/tunnels';
const NGROK_API_TIMEOUT_MS = 2000;
const HTTP_OK = 200;
const BAD_GATEWAY = 502;

// ── Fetch current ngrok tunnel info ──────────────────────────────────────────
function getTunnelInfo(cb) {
  const req = http.get(
    {
      hostname: '127.0.0.1',
      port: NGROK_API_PORT,
      path: NGROK_API_PATH,
      timeout: NGROK_API_TIMEOUT_MS,
    },
    (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const tunnels = json.tunnels || [];
          const t = tunnels.find((t) => t.public_url && t.public_url.startsWith('https://'))
            || tunnels.find((t) => t.public_url);
          if (t) {
            const host = t.public_url.replace(/^https?:\/\//, '');
            cb(null, { tunnelUrl: t.public_url, expoUrl: 'exp://' + host });
          } else {
            cb(new Error('no tunnels'));
          }
        } catch (e) { cb(e); }
      });
    }
  );
  req.on('error', cb);
  req.on('timeout', () => { req.destroy(); cb(new Error('timeout')); });
}

// ── HTML component builders ───────────────────────────────────────────────────

// Reset + page chrome (body, layout)
function buildResetStyles() {
  return `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      height: 100%;
      background: #0a0a0a;
      display: flex; align-items: center; justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: white; overflow: hidden;
    }
    .layout { display: flex; align-items: center; justify-content: center; gap: 48px; height: 100%; padding: 24px; }`;
}

// iPhone-style mockup frame + screen + loading overlay
function buildPhoneFrameStyles() {
  return `
    .phone {
      position: relative; width: 393px; height: 852px;
      background: #1c1c1e; border-radius: 54px;
      box-shadow: 0 0 0 2px #3a3a3c, 0 0 0 7px #111, 0 50px 100px rgba(0,0,0,0.9), inset 0 0 0 1px #2c2c2e;
      flex-shrink: 0;
    }
    .phone::before {
      content: ''; position: absolute; left: -5px; top: 160px;
      width: 4px; height: 36px; background: #3a3a3c; border-radius: 2px 0 0 2px;
      box-shadow: 0 54px 0 #3a3a3c, 0 100px 0 #3a3a3c;
    }
    .phone::after {
      content: ''; position: absolute; right: -5px; top: 210px;
      width: 4px; height: 72px; background: #3a3a3c; border-radius: 0 2px 2px 0;
    }
    .screen { position: absolute; inset: 0; border-radius: 54px; overflow: hidden; background: #000; }
    .dynamic-island { position: absolute; top: 14px; left: 50%; transform: translateX(-50%); width: 126px; height: 37px; background: #000; border-radius: 20px; z-index: 10; }
    .home-bar { position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%); width: 134px; height: 5px; background: rgba(255,255,255,0.28); border-radius: 3px; z-index: 10; }
    .screen iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: none; border-radius: 54px; }
    #loading {
      position: absolute; inset: 0; background: #1c0b3e;
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px;
      z-index: 20; border-radius: 54px; transition: opacity 0.5s;
    }
    #loading.gone { opacity: 0; pointer-events: none; }
    .spinner { width: 30px; height: 30px; border: 3px solid rgba(255,255,255,0.15); border-top-color: #a78bfa; border-radius: 50%; animation: spin 0.7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .loading-label { color: rgba(255,255,255,0.6); font-size: 14px; }`;
}

// Right-hand panel: title, QR card, expo URL
function buildPanelStyles() {
  return `
    .panel { width: 300px; flex-shrink: 0; display: flex; flex-direction: column; gap: 28px; }
    .app-title { font-size: 26px; font-weight: 700; letter-spacing: -0.5px; }
    .app-sub { font-size: 14px; color: rgba(255,255,255,0.5); margin-top: 4px; line-height: 1.5; }
    .qr-card { background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12); border-radius: 20px; padding: 24px; display: flex; flex-direction: column; align-items: center; gap: 14px; }
    .qr-card-title { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: rgba(255,255,255,0.5); }
    #qr-box { background: #fff; border-radius: 12px; padding: 14px; display: flex; align-items: center; justify-content: center; width: 176px; height: 176px; }
    #qr-box canvas { display: block; }
    .qr-status { font-size: 13px; text-align: center; line-height: 1.4; }
    .qr-status.ready { color: #86efac; }
    .qr-status.loading { color: rgba(255,255,255,0.45); }
    .expo-url { font-family: 'SF Mono', 'Menlo', monospace; font-size: 11px; color: rgba(255,255,255,0.35); text-align: center; word-break: break-all; line-height: 1.4; display: none; }
    .expo-url.show { display: block; }`;
}

// Numbered onboarding steps
function buildStepsStyles() {
  return `
    .steps { display: flex; flex-direction: column; gap: 12px; }
    .step { display: flex; gap: 12px; align-items: flex-start; }
    .step-n { background: rgba(167,139,250,0.2); color: #c4b5fd; border-radius: 50%; width: 24px; height: 24px; min-width: 24px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; }
    .step-t { font-size: 13px; line-height: 1.5; color: rgba(255,255,255,0.7); }
    .step-t a { color: #a78bfa; text-decoration: none; }
    .step-t a:hover { text-decoration: underline; }`;
}

// Responsive breakpoints for phone scaling and small viewports
function buildResponsiveStyles() {
  return `
    @media (max-height: 920px) { .phone { transform: scale(0.88); transform-origin: center; } .layout { gap: 32px; } }
    @media (max-height: 800px) { .phone { transform: scale(0.76); transform-origin: center; } }
    @media (max-width: 800px) { .layout { flex-direction: column; overflow-y: auto; } .phone { transform: scale(0.7); transform-origin: top center; } .panel { width: 340px; } }
    @media (max-width: 450px) {
      .phone { width: 100vw; height: 100svh; border-radius: 0; box-shadow: none; transform: none; }
      .phone::before, .phone::after, .dynamic-island, .home-bar { display: none; }
      .screen, .screen iframe, #loading { border-radius: 0; }
      .panel { display: none; }
    }`;
}

function buildPageStyles() {
  return (
    buildResetStyles() +
    buildPhoneFrameStyles() +
    buildPanelStyles() +
    buildStepsStyles() +
    buildResponsiveStyles()
  );
}

function buildPhoneMockup() {
  return `
    <div class="phone">
      <div class="screen">
        <div id="loading">
          <div class="spinner"></div>
          <span class="loading-label">Starting VocoLens&hellip;</span>
        </div>
        <iframe src="/app.html" id="app-iframe"
          allow="microphone; camera; autoplay; clipboard-write"
          allowfullscreen>
        </iframe>
      </div>
      <div class="dynamic-island"></div>
      <div class="home-bar"></div>
    </div>`;
}

function buildQRPanel(ready, expoUrl) {
  const safeUrl = expoUrl
    ? expoUrl.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    : '';
  return `
    <div class="panel">
      <div>
        <div class="app-title">VocoLens</div>
        <div class="app-sub">Voice Journal with<br/>AI Emotion Analysis</div>
      </div>
      <div class="qr-card">
        <div class="qr-card-title">Test on your device</div>
        <div id="qr-box">
          <div class="spinner" style="border-top-color:#6B3FA0;"></div>
        </div>
        <div id="qr-status" class="qr-status ${ready ? 'ready' : 'loading'}">
          ${ready ? '&#10003; Scan with Expo Go' : '&#8987; Starting tunnel&hellip;'}
        </div>
        <div id="expo-url" class="expo-url ${ready ? 'show' : ''}">${safeUrl}</div>
      </div>
      <div class="steps">
        <div class="step">
          <div class="step-n">1</div>
          <div class="step-t">
            Install <strong>Expo Go</strong>:<br/>
            <a href="https://apps.apple.com/app/expo-go/id982107779" target="_blank" rel="noopener">App Store</a>
            &nbsp;&middot;&nbsp;
            <a href="https://play.google.com/store/apps/details?id=host.exp.exponent" target="_blank" rel="noopener">Google Play</a>
          </div>
        </div>
        <div class="step">
          <div class="step-n">2</div>
          <div class="step-t">Open Expo Go &rarr; tap <strong>Scan QR Code</strong></div>
        </div>
        <div class="step">
          <div class="step-n">3</div>
          <div class="step-t">VocoLens loads natively &mdash; mic &amp; all features work</div>
        </div>
      </div>
    </div>`;
}

function buildPageScript(expoUrl) {
  return `
  <script>
    // Hide loading overlay when iframe loads
    document.getElementById('app-iframe').addEventListener('load', function() {
      setTimeout(function() { document.getElementById('loading').classList.add('gone'); }, 400);
    });
    setTimeout(function() { document.getElementById('loading').classList.add('gone'); }, 20000);

    var currentExpoUrl = ${JSON.stringify(expoUrl)};

    function renderQR(url) {
      var box = document.getElementById('qr-box');
      // Safe DOM clearing — no innerHTML
      while (box.firstChild) box.removeChild(box.firstChild);
      new QRCode(box, { text: url, width: 148, height: 148, colorDark: '#000', colorLight: '#fff', correctLevel: QRCode.CorrectLevel.M });
      document.getElementById('qr-status').className = 'qr-status ready';
      document.getElementById('qr-status').textContent = '\\u2713 Scan with Expo Go';
      var urlEl = document.getElementById('expo-url');
      urlEl.textContent = url;
      urlEl.className = 'expo-url show';
    }

    if (currentExpoUrl) { renderQR(currentExpoUrl); }

    function poll() {
      fetch('/tunnel-url')
        .then(function(r) { return r.json(); })
        .then(function(d) {
          if (d.expoUrl && d.expoUrl !== currentExpoUrl) {
            currentExpoUrl = d.expoUrl;
            renderQR(d.expoUrl);
          }
          if (!d.ready && currentExpoUrl) {
            currentExpoUrl = null;
            document.getElementById('qr-status').className = 'qr-status loading';
            document.getElementById('qr-status').textContent = '\\u231b Tunnel reconnecting\\u2026';
            document.getElementById('expo-url').className = 'expo-url';
          }
        })
        .catch(function() {});
    }

    poll();
    setInterval(poll, 3000);
  </script>`;
}

// ── Main page assembler ───────────────────────────────────────────────────────

function buildPage(tunnelInfo) {
  const ready = !!tunnelInfo;
  const expoUrl = tunnelInfo ? tunnelInfo.expoUrl : null;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>VocoLens Preview</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
  <style>${buildPageStyles()}</style>
</head>
<body>
  <div class="layout">
    ${buildPhoneMockup()}
    ${buildQRPanel(ready, expoUrl)}
  </div>
  ${buildPageScript(expoUrl)}
</body>
</html>`;
}

// ── Proxy helper ──────────────────────────────────────────────────────────────
function proxyReq(req, res, metroPath) {
  const opts = {
    hostname: 'localhost',
    port: METRO_PORT,
    path: metroPath,
    method: req.method,
    headers: { ...req.headers, host: 'localhost:' + METRO_PORT },
  };
  const pr = http.request(opts, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });
  pr.on('error', (err) => {
    if (!res.headersSent) res.writeHead(BAD_GATEWAY);
    res.end('Metro not ready: ' + err.message);
  });
  req.pipe(pr, { end: true });
}

// ── HTTP server ───────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const url = req.url || '/';

  // Internal: tunnel URL for polling
  if (url === '/tunnel-url') {
    getTunnelInfo((err, info) => {
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(HTTP_OK);
      res.end(JSON.stringify(info ? { ready: true, ...info } : { ready: false }));
    });
    return;
  }

  // Root → phone mockup page (server-side renders QR if tunnel already up)
  if (url === '/' || url === '') {
    getTunnelInfo((err, info) => {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.writeHead(HTTP_OK);
      res.end(buildPage(info || null));
    });
    return;
  }

  // /app.html → proxy to Metro root
  if (url === '/app.html') {
    proxyReq(req, res, '/');
    return;
  }

  // Everything else → proxy to Metro as-is
  proxyReq(req, res, url);
});

// ── WebSocket proxy (HMR hot-reload) ─────────────────────────────────────────
server.on('upgrade', (req, socket, head) => {
  const target = net.createConnection({ host: 'localhost', port: METRO_PORT });
  target.on('connect', () => {
    const hdrs = Object.entries(req.headers).map(([k, v]) => k + ': ' + v).join('\r\n');
    target.write(req.method + ' ' + req.url + ' HTTP/' + req.httpVersion + '\r\n' + hdrs + '\r\n\r\n');
    if (head && head.length) target.write(head);
    target.pipe(socket, { end: false });
    socket.pipe(target, { end: false });
  });
  target.on('error', () => socket.destroy());
  socket.on('error', () => target.destroy());
});

// Supervisor + container runtime already record process startup; no need to
// emit our own log line here.
server.listen(PORT, '0.0.0.0');
