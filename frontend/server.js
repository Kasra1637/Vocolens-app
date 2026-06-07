/**
 * VocoLens - Expo Native Dev Server Landing Page
 * Runs on port 3000. Metro bundler runs on 8081 via ngrok tunnel.
 * Shows QR code for Expo Go once the tunnel is ready.
 */
const http = require('http');

// ── Configuration ─────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT) || 3000;
const NGROK_API_PORT = 4040;
const NGROK_API_PATH = '/api/tunnels';
const NGROK_API_TIMEOUT_MS = 2000;
const HTTP_OK = 200;

// ── HTML component builders ───────────────────────────────────────────────────

// Layout & global page chrome
function buildBaseStyles() {
  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #6B3FA0 0%, #4A2880 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }
    .card {
      background: rgba(255,255,255,0.12);
      border: 2px solid rgba(255,255,255,0.20);
      border-radius: 24px;
      padding: 40px;
      max-width: 440px;
      width: 90%;
      text-align: center;
      backdrop-filter: blur(12px);
    }
    h1 { font-size: 28px; font-weight: 700; margin-bottom: 6px; }
    .subtitle { opacity: 0.75; font-size: 15px; margin-bottom: 28px; }`;
}

// QR card + status pill
function buildQRStyles() {
  return `
    #qr-wrap {
      background: white;
      border-radius: 16px;
      padding: 20px;
      display: inline-block;
      margin-bottom: 24px;
    }
    #qr-wrap canvas, #qr-wrap img { display: block; }
    .status {
      background: rgba(255,255,255,0.1);
      border-radius: 12px;
      padding: 14px 20px;
      font-size: 14px;
      margin-bottom: 20px;
    }
    .status.ready { background: rgba(74,222,128,0.2); color: #86efac; }
    .status.loading { color: rgba(255,255,255,0.7); }
    .url-box {
      background: rgba(0,0,0,0.3);
      border-radius: 8px;
      padding: 8px 12px;
      font-family: monospace;
      font-size: 12px;
      word-break: break-all;
      margin-top: 8px;
      opacity: 0.85;
    }`;
}

// Numbered onboarding steps
function buildStepStyles() {
  return `
    .steps { text-align: left; margin-top: 16px; }
    .step { display: flex; gap: 12px; margin-bottom: 12px; align-items: flex-start; }
    .step-num {
      background: rgba(255,255,255,0.2);
      border-radius: 50%;
      width: 26px; height: 26px; min-width: 26px;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 600;
    }
    .step-text { font-size: 14px; line-height: 1.4; opacity: 0.9; }
    .step-text a { color: #c4b5fd; }`;
}

// Loading spinner
function buildSpinnerStyles() {
  return `
    .spinner {
      display: inline-block;
      width: 200px; height: 200px;
      border: 3px solid rgba(255,255,255,0.2);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }`;
}

function buildStyles() {
  return buildBaseStyles() + buildQRStyles() + buildStepStyles() + buildSpinnerStyles();
}

function buildQRSection(isReady) {
  return `
    <div id="qr-wrap">
      ${isReady ? '<div id="qr-code"></div>' : '<div class="spinner"></div>'}
    </div>
    <div class="status ${isReady ? 'ready' : 'loading'}" id="status">
      ${isReady ? '&#10003; Dev server ready &mdash; scan QR code with Expo Go' : '&#8987; Starting Metro dev server&hellip; (may take 30&ndash;60s)'}
    </div>`;
}

function buildUrlBox(isReady, expoUrl) {
  if (!isReady || !expoUrl) return '';
  const safe = expoUrl.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<div class="url-box">${safe}</div>`;
}

function buildSteps() {
  return `
    <div class="steps">
      <div class="step">
        <div class="step-num">1</div>
        <div class="step-text">
          Install <strong>Expo Go</strong> on your iPhone or Android:<br/>
          <a href="https://apps.apple.com/app/expo-go/id982107779" target="_blank" rel="noopener">App Store</a>
          &nbsp;&middot;&nbsp;
          <a href="https://play.google.com/store/apps/details?id=host.exp.exponent" target="_blank" rel="noopener">Google Play</a>
        </div>
      </div>
      <div class="step">
        <div class="step-num">2</div>
        <div class="step-text">Open Expo Go &rarr; tap <strong>Scan QR Code</strong> and point at the code above.</div>
      </div>
      <div class="step">
        <div class="step-num">3</div>
        <div class="step-text">VocoLens loads natively on your device. Microphone &amp; all features work.</div>
      </div>
    </div>`;
}

function buildScriptQRHelpers() {
  return `
    function renderQR(url) {
      var wrap = document.getElementById('qr-wrap');
      // Safe DOM clearing — no innerHTML
      while (wrap.firstChild) wrap.removeChild(wrap.firstChild);
      var qrDiv = document.createElement('div');
      qrDiv.id = 'qr-code';
      wrap.appendChild(qrDiv);
      new QRCode(qrDiv, {
        text: url,
        width: 200,
        height: 200,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
      });
    }

    function updateStatus(text, cssClass) {
      var el = document.getElementById('status');
      el.textContent = text;
      el.className = 'status ' + cssClass;
    }

    function updateUrlBox(url) {
      var existing = document.querySelector('.url-box');
      if (!existing) {
        existing = document.createElement('div');
        existing.className = 'url-box';
        document.querySelector('.card').insertBefore(existing, document.querySelector('.steps'));
      }
      existing.textContent = url;
    }`;
}

function buildScriptPoller() {
  return `
    function checkTunnel() {
      fetch('/tunnel-url')
        .then(function(r) { return r.json(); })
        .then(function(d) {
          if (d.expoUrl && d.expoUrl !== EXPO_URL) {
            EXPO_URL = d.expoUrl;
            renderQR(d.expoUrl);
            updateStatus('\\u2713 Dev server ready \u2014 scan QR code with Expo Go', 'ready');
            updateUrlBox(d.expoUrl);
          }
        })
        .catch(function() {});
    }`;
}

function buildScriptBootstrap() {
  return `
    if (EXPO_URL) {
      renderQR(EXPO_URL);
    } else {
      setInterval(checkTunnel, 3000);
      checkTunnel();
    }`;
}

function buildClientScript(expoUrl) {
  return `
  <script>
    var EXPO_URL = ${JSON.stringify(expoUrl || null)};
    ${buildScriptQRHelpers()}
    ${buildScriptPoller()}
    ${buildScriptBootstrap()}
  </script>`;
}

// ── Main page assembler ───────────────────────────────────────────────────────

function getHTML(tunnelUrl, expoUrl) {
  const isReady = !!tunnelUrl;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>VocoLens &ndash; Open in Expo Go</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
  <style>${buildStyles()}</style>
</head>
<body>
  <div class="card">
    <h1>VocoLens</h1>
    <p class="subtitle">Voice Journal with AI Emotion Analysis</p>
    ${buildQRSection(isReady)}
    ${buildUrlBox(isReady, expoUrl)}
    ${buildSteps()}
  </div>
  ${buildClientScript(expoUrl)}
</body>
</html>`;
}

// ── Tunnel info fetcher ───────────────────────────────────────────────────────

function getTunnelInfo(cb) {
  const opts = {
    hostname: '127.0.0.1',
    port: NGROK_API_PORT,
    path: NGROK_API_PATH,
    timeout: NGROK_API_TIMEOUT_MS,
  };
  const req = http.get(opts, (res) => {
    let data = '';
    res.on('data', (c) => { data += c; });
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        const tunnels = json.tunnels || [];
        const tunnel =
          tunnels.find((t) => t.public_url && t.public_url.startsWith('https://')) ||
          tunnels.find((t) => t.public_url);
        if (tunnel) {
          const host = tunnel.public_url.replace(/^https?:\/\//, '');
          cb(null, { tunnelUrl: tunnel.public_url, expoUrl: 'exp://' + host });
        } else {
          cb(new Error('no tunnels'));
        }
      } catch (e) {
        cb(e);
      }
    });
  });
  req.on('error', cb);
  req.on('timeout', () => { req.destroy(); cb(new Error('timeout')); });
}

// ── HTTP server ───────────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  if (req.url === '/tunnel-url') {
    getTunnelInfo((err, info) => {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.writeHead(HTTP_OK);
      res.end(JSON.stringify(info ? { ready: true, ...info } : { ready: false }));
    });
  } else {
    getTunnelInfo((err, info) => {
      res.setHeader('Content-Type', 'text/html');
      res.writeHead(HTTP_OK);
      res.end(getHTML(info ? info.tunnelUrl : null, info ? info.expoUrl : null));
    });
  }
});

// Supervisor + container runtime already record process startup; no need to
// emit our own log line here.
server.listen(PORT, '0.0.0.0');
