/* PIN gate for AI2. Runs before anything else on the page.
   Note: this is a client-side gate on a static site. It keeps casual visitors out, it is not real security. */
(function () {
  'use strict';
  var HASH = 'f0e2a0c10d53498d2b70477ffeabb1b331603729e6ce9c9ca441fd122a9ba694', KEY = 'ai2-pin-ok';
  function sha256(str) {
    var K = [], i, j, p = 2;
    function frac(x) { return ((x - Math.floor(x)) * 4294967296) | 0; }
    for (i = 0; K.length < 64; p++) { var ok = true; for (j = 2; j * j <= p; j++) if (p % j === 0) { ok = false; break; } if (ok) K.push(frac(Math.pow(p, 1 / 3))); }
    var H0 = [], q = 2; while (H0.length < 8) { var ok2 = true; for (j = 2; j * j <= q; j++) if (q % j === 0) { ok2 = false; break; } if (ok2) H0.push(frac(Math.sqrt(q))); q++; }
    var bytes = unescape(encodeURIComponent(str)).split('').map(function (c) { return c.charCodeAt(0); }), len = bytes.length * 8;
    bytes.push(0x80); while (bytes.length % 64 !== 56) bytes.push(0);
    for (i = 7; i >= 0; i--) bytes.push(i >= 4 ? 0 : (len >>> (i * 8)) & 255);
    function rr(x, n) { return (x >>> n) | (x << (32 - n)); }
    for (var o = 0; o < bytes.length; o += 64) {
      var w = [], a = H0.slice();
      for (i = 0; i < 16; i++) w[i] = (bytes[o + 4 * i] << 24) | (bytes[o + 4 * i + 1] << 16) | (bytes[o + 4 * i + 2] << 8) | bytes[o + 4 * i + 3];
      for (i = 16; i < 64; i++) { var s0 = rr(w[i - 15], 7) ^ rr(w[i - 15], 18) ^ (w[i - 15] >>> 3), s1 = rr(w[i - 2], 17) ^ rr(w[i - 2], 19) ^ (w[i - 2] >>> 10); w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0; }
      var A = a[0], B = a[1], C = a[2], D = a[3], E = a[4], F = a[5], G = a[6], Hh = a[7];
      for (i = 0; i < 64; i++) {
        var S1 = rr(E, 6) ^ rr(E, 11) ^ rr(E, 25), ch = (E & F) ^ (~E & G), t1 = (Hh + S1 + ch + K[i] + w[i]) | 0, S0 = rr(A, 2) ^ rr(A, 13) ^ rr(A, 22), mj = (A & B) ^ (A & C) ^ (B & C), t2 = (S0 + mj) | 0;
        Hh = G; G = F; F = E; E = (D + t1) | 0; D = C; C = B; B = A; A = (t1 + t2) | 0;
      }
      var r = [A, B, C, D, E, F, G, Hh]; for (i = 0; i < 8; i++) H0[i] = (H0[i] + r[i]) | 0;
    }
    return H0.map(function (x) { return ('00000000' + (x >>> 0).toString(16)).slice(-8); }).join('');
  }
  window.AI2GATE = { sha256: sha256 };
  function stored() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  if (stored() === HASH) return;
  var st = document.createElement('style');
  st.id = 'gate-style';
  st.textContent = 'html.locked body>*:not(.gate){display:none!important}.gate{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;padding:16px;background:#5b8def;font-family:Nunito,system-ui,sans-serif}.gate form{background:#fff;color:#231a52;border:4px solid #231a52;box-shadow:8px 8px 0 #231a52;padding:24px;width:min(420px,100%);display:grid;gap:14px}.gate h1{font:400 1rem/1.5 "Press Start 2P",monospace;margin:0}.gate p{margin:0;font-weight:700;line-height:1.5}.gate input{font:800 1.2rem Nunito,system-ui,sans-serif;padding:.7rem .8rem;border:3px solid #231a52;width:100%;box-sizing:border-box}.gate button{font:400 .7rem "Press Start 2P",monospace;padding:.9rem 1rem;background:#ffd23f;color:#231a52;border:3px solid #231a52;box-shadow:0 4px 0 #231a52;cursor:pointer}.gate .err{color:#b3123b;min-height:1.4em}';
  document.head.appendChild(st);
  document.documentElement.classList.add('locked');
  function mount() {
    var g = document.createElement('div'); g.className = 'gate';
    g.innerHTML = '<form autocomplete="off"><h1>AI2 World</h1><p>This area is for my students. Enter the PIN you were given in class.</p><label for="gate-pin" style="font-weight:800">PIN</label><input id="gate-pin" type="password" autocomplete="off" autofocus><p class="err" role="alert"></p><button type="submit">Enter</button><p style="font-size:.85rem;font-weight:600"><a href="../index.html" style="color:#231a52">Back to the main page</a></p></form>';
    document.body.appendChild(g);
    var f = g.querySelector('form'), inp = g.querySelector('input'), err = g.querySelector('.err');
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (sha256(inp.value.trim()) === HASH) { try { localStorage.setItem(KEY, HASH); } catch (x) {} document.documentElement.classList.remove('locked'); g.remove(); }
      else { err.textContent = 'That PIN is not right. Check the spelling and capital letters.'; inp.select(); }
    });
    inp.focus();
  }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})();
