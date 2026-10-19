/* Shared menu bubble for the whole site. Lives in the site root, next to the main index.html.
   To add a page: add one line to PAGES (href is relative to this file), upload the page, done.
   Every page loads it with <script src="nav.js"></script> (use ../nav.js from inside a folder).
   The page you are on is left out of the list, so the menu always shows the other places to go. */
(function () {
  var PAGES = [
    { label: 'HOME', href: 'index.html', color: '#ffcc2e', text: '#231a52' },
    { label: 'AI2', href: 'ai2/index.html', color: '#6a3df0', text: '#ffffff' },
    { label: 'MEET MY STUDENTS', href: 'students/index.html', color: '#ff4f6d', text: '#231a52' }
    /* , { label: 'NEW PAGE', href: 'newpage/index.html', color: '#2ee6a6', text: '#231a52' } */
  ];

  var INK = '#231a52';
  var script = document.currentScript;
  var base = script && script.src ? script.src : location.href;
  var below = script && script.getAttribute('data-below');

  var css = [
    '.wn{position:fixed;top:calc(var(--wn-top,12px) + env(safe-area-inset-top,0px));right:16px;z-index:40;display:flex;flex-direction:column;align-items:flex-end;font-family:"Press Start 2P",ui-monospace,Menlo,Consolas,monospace}',
    '.wn *{box-sizing:border-box}',
    '.wn-btn{position:relative;width:60px;height:60px;padding:0;border-radius:50%;border:4px solid ' + INK + ';background:#fcb83c;box-shadow:inset 4px 4px 0 #ffe08a,inset -4px -4px 0 #b8700c,0 5px 0 ' + INK + ';cursor:pointer;display:grid;place-items:center;animation:wn-bob 2.4s ease-in-out infinite}',
    '.wn-btn::after{content:"";position:absolute;top:8px;left:11px;width:8px;height:6px;background:#fff;opacity:.85}',
    '.wn-btn:focus-visible,.wn-link:focus-visible{outline:4px solid #fff;outline-offset:3px;box-shadow:0 0 0 8px ' + INK + '}',
    '.wn-btn svg{width:28px;height:28px;display:block}',
    '.wn.open .wn-btn{animation:none;background:#ffd23c}',
    '@keyframes wn-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}',
    '.wn-hint{margin-top:10px;font-size:.55rem;line-height:1;color:#fff;text-shadow:2px 0 0 ' + INK + ',-2px 0 0 ' + INK + ',0 2px 0 ' + INK + ',0 -2px 0 ' + INK + ';transition:opacity .1s}',
    '.wn.open .wn-hint{opacity:0}',
    '.wn-menu{list-style:none;margin:0;padding:12px 0 0;display:flex;flex-direction:column;align-items:flex-end;gap:10px;max-width:calc(100vw - 32px);visibility:hidden;pointer-events:none}',
    '.wn.open .wn-menu{visibility:visible;pointer-events:auto}',
    '.wn-item{opacity:0;transform:translateY(-14px) scale(.92);transform-origin:top right;transition:opacity .16s steps(3),transform .16s steps(3);transition-delay:calc(var(--i) * 60ms)}',
    '.wn.open .wn-item{opacity:1;transform:none}',
    '.wn-link{display:block;font-size:.65rem;line-height:1.6;text-align:right;text-decoration:none;color:var(--t);background:var(--c);border:4px solid ' + INK + ';box-shadow:0 5px 0 ' + INK + ';padding:12px 14px;cursor:pointer}',
    '.wn-link:hover{transform:translateY(-2px);filter:brightness(1.1)}',
    '.wn-link:active{transform:translateY(3px);box-shadow:0 2px 0 ' + INK + '}',
    '@media (max-width:480px){.wn{right:12px}.wn-btn{width:52px;height:52px}.wn-btn svg{width:24px;height:24px}}',
    '@media (prefers-reduced-motion:reduce){.wn-btn{animation:none}.wn-item{transition:none}}'
  ].join('\n');

  /* pixel star */
  var STAR = ['...X...', '..XXX..', 'XXXXXXX', '.XXXXX.', '..XXX..', '.XX.XX.', '.X...X.'];
  var star = '<svg viewBox="0 0 7 7" shape-rendering="crispEdges" aria-hidden="true" focusable="false">';
  STAR.forEach(function (row, y) {
    row.split('').forEach(function (ch, x) {
      if (ch === 'X') star += '<rect x="' + x + '" y="' + y + '" width="1" height="1" fill="' + INK + '"/>';
    });
  });
  star += '</svg>';

  function norm(p) {
    return p.replace(/\.html$/, '').replace(/index$/, '').replace(/\/$/, '');
  }

  function build() {
    if (document.getElementById('wn-root')) return;
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    var here = norm(location.pathname);
    var shown = PAGES.map(function (p) {
      var url = new URL(p.href, base);
      return { p: p, url: url.href, current: norm(url.pathname) === here };
    }).filter(function (x) { return !x.current; });

    var root = document.createElement('nav');
    root.className = 'wn';
    root.id = 'wn-root';
    root.setAttribute('aria-label', 'Pages');

    var items = shown.map(function (x, i) {
      return '<li class="wn-item" style="--i:' + i + '"><a class="wn-link" href="' + x.url + '" style="--c:' + x.p.color + ';--t:' + x.p.text + '">' + x.p.label + '</a></li>';
    }).join('');

    root.innerHTML =
      '<button class="wn-btn" type="button" aria-expanded="false" aria-controls="wn-menu" aria-label="Open pages menu">' + star + '</button>' +
      '<span class="wn-hint" aria-hidden="true">MENU</span>' +
      '<ul class="wn-menu" id="wn-menu">' + items + '</ul>';
    document.body.appendChild(root);

    /* sit just under a sticky top bar when the page has one */
    if (below) {
      var bar = document.querySelector(below);
      if (bar) {
        var fit = function () { document.documentElement.style.setProperty('--wn-top', (bar.offsetHeight + 10) + 'px'); };
        fit();
        window.addEventListener('resize', fit);
        if (window.ResizeObserver) new ResizeObserver(fit).observe(bar);
      }
    }

    var btn = root.querySelector('.wn-btn');
    var hoverable = window.matchMedia && matchMedia('(hover: hover)').matches;
    var timer;

    function set(open) {
      root.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? 'Close pages menu' : 'Open pages menu');
    }

    root.addEventListener('mouseenter', function () {
      if (!hoverable) return;
      clearTimeout(timer);
      set(true);
    });
    root.addEventListener('mouseleave', function () {
      if (!hoverable) return;
      timer = setTimeout(function () { set(false); }, 250);
    });
    /* click toggles for touch screens and keyboards; with a mouse the hover has already opened it */
    btn.addEventListener('click', function (e) {
      if (hoverable && e.detail > 0) return;
      set(!root.classList.contains('open'));
    });
    root.addEventListener('focusin', function (e) {
      if (e.target.matches && e.target.matches(':focus-visible')) set(true);
    });
    root.addEventListener('focusout', function (e) {
      if (!e.relatedTarget || !root.contains(e.relatedTarget)) set(false);
    });
    document.addEventListener('pointerdown', function (e) {
      if (!root.contains(e.target)) set(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && root.classList.contains('open')) {
        set(false);
        btn.focus();
      }
    });
  }

  if (document.body) build();
  else document.addEventListener('DOMContentLoaded', build);
})();
