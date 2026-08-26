(function () {
  'use strict';

  var doc = document.documentElement;
  doc.classList.add('js');

  var THEME_KEY = 'peidl-theme';
  var media = window.matchMedia('(prefers-color-scheme: dark)');

  function resolved() {
    var t = doc.dataset.theme;
    if (t === 'light' || t === 'dark') return t;
    return media.matches ? 'dark' : 'light';
  }

  function applyMetaTheme() {
    var metas = document.querySelectorAll('meta[name="theme-color"]');
    for (var i = metas.length - 1; i >= 0; i--) metas[i].remove();
    var meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = resolved() === 'dark' ? '#282828' : '#fbf1c7';
    document.head.appendChild(meta);
    if (toggle) toggle.textContent = 'bg=' + resolved();
  }

  var toggle = document.querySelector('.theme-toggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = resolved() === 'dark' ? 'light' : 'dark';
      doc.dataset.theme = next;
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch (e) {}
      applyMetaTheme();
    });
  }

  media.addEventListener &&
    media.addEventListener('change', function () {
      var stored = null;
      try {
        stored = localStorage.getItem(THEME_KEY);
      } catch (e) {}
      if (stored !== 'light' && stored !== 'dark') {
        doc.dataset.theme = media.matches ? 'dark' : 'light';
        applyMetaTheme();
      }
    });

  applyMetaTheme();

  var links = Array.prototype.slice.call(document.querySelectorAll('.nav-links a'));
  var sections = links
    .map(function (a) {
      var id = a.getAttribute('href').slice(1);
      return document.getElementById(id);
    })
    .filter(Boolean);

  var smooth = function () {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  };

  var fileNames = {
    about: 'about.md',
    experience: 'experience.md',
    stack: 'stack.md',
    homelab: 'homelab.md',
    automation: 'automation.md',
    contact: 'contact.md'
  };
  var fileEl = document.getElementById('sl-file');
  var currentId = '';
  var pageStats = null;
  var sizeEl = document.createElement('span');
  sizeEl.className = 'sl-file-size';
  if (fileEl) fileEl.appendChild(sizeEl);

  function fmtKiB(bytes) {
    var kib = Math.round((bytes / 1024) * 10) / 10;
    return (kib % 1 === 0 ? kib.toFixed(0) : kib.toFixed(1)) + 'KiB';
  }

  function renderFile() {
    if (!fileEl) return;
    fileEl.textContent = fileNames[currentId] || 'whoami';
    var bytes = pageStats && pageStats.sections && pageStats.sections[currentId];
    if (bytes) {
      sizeEl.textContent = ' \u00b7 ' + fmtKiB(bytes);
      fileEl.appendChild(sizeEl);
    }
  }

  function setCurrent(id) {
    links.forEach(function (a) {
      a.classList.toggle(
        'is-active',
        a.getAttribute('href') === '#' + id
      );
    });
    currentId = id;
    renderFile();
  }

  if ('IntersectionObserver' in window && sections.length) {
    var visible = {};
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          visible[en.target.id] = en.isIntersecting ? en.intersectionRatio : 0;
        });
        var best = null;
        var bestRatio = 0;
        sections.forEach(function (s) {
          var r = visible[s.id] || 0;
          if (r > bestRatio) {
            bestRatio = r;
            best = s.id;
          }
        });
        if (best) setCurrent(best);
        else {
          links.forEach(function (a) {
            a.classList.remove('is-active');
          });
          currentId = '';
          renderFile();
        }
      },
      { threshold: [0, 0.15, 0.4], rootMargin: '-20% 0px -35% 0px' }
    );
    sections.forEach(function (s) {
      io.observe(s);
    });
  }

  var year = document.querySelector('[data-year]');
  if (year) year.textContent = String(new Date().getFullYear());

  var counters = Array.prototype.slice.call(document.querySelectorAll('[data-counter]'));
  if (counters.length) {
    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var setTarget = function (el) {
      el.textContent = String(parseInt(el.dataset.counter, 10) || 0);
    };
    var animateCounter = function (el) {
      var target = parseInt(el.dataset.counter, 10) || 0;
      if (reducedMotion || target === 0 || typeof window.requestAnimationFrame !== 'function') {
        setTarget(el);
        return;
      }
      var started = null;
      var dur = 900;
      var step = function (ts) {
        if (started === null) started = ts;
        var p = Math.min((ts - started) / dur, 1);
        el.textContent = String(Math.round((1 - Math.pow(1 - p, 3)) * target));
        if (p < 1) window.requestAnimationFrame(step);
      };
      window.requestAnimationFrame(step);
    };
    var startCounters = function () {
      if (!('IntersectionObserver' in window)) {
        counters.forEach(setTarget);
        return;
      }
      var cio = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting || en.target.dataset.done) return;
          en.target.dataset.done = '1';
          cio.unobserve(en.target);
          animateCounter(en.target);
        });
      });
      counters.forEach(function (el) {
        cio.observe(el);
      });
    };
    var applyStats = function (data) {
      if (!data || typeof data !== 'object') return;
      pageStats = data;
      renderFile();
      counters.forEach(function (el) {
        var v = el.dataset.counterKey ? data[el.dataset.counterKey] : undefined;
        if (typeof v === 'number' && isFinite(v) && v >= 0) {
          el.dataset.counter = String(Math.floor(v));
        }
      });
    };
    if (typeof window.fetch === 'function') {
      fetch('site-stats.json', { headers: { Accept: 'application/json' } })
        .then(function (r) {
          return r.ok ? r.json() : null;
        })
        .then(applyStats)
        .catch(function () {})
        .then(startCounters);
    } else {
      startCounters();
    }
  }

  var modeEl = document.getElementById('sl-mode');
  var eggBuf = '';
  var updateMode = null;

  var SECTION_IDS = ['about', 'experience', 'stack', 'homelab', 'automation', 'contact'];

  function scrollToSection(id) {
    var el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: smooth(), block: 'start' });
  }

  function sectionIndex(id) {
    return SECTION_IDS.indexOf(id);
  }

  function nextSection() {
    var i = sectionIndex(currentId);
    if (i >= 0 && i < SECTION_IDS.length - 1) scrollToSection(SECTION_IDS[i + 1]);
    else if (i === -1 && SECTION_IDS.length) scrollToSection(SECTION_IDS[0]);
  }

  function prevSection() {
    var i = sectionIndex(currentId);
    if (i > 0) scrollToSection(SECTION_IDS[i - 1]);
  }

  function scrollHalfPage(down) {
    window.scrollBy({ top: down ? window.innerHeight / 2 : -window.innerHeight / 2, behavior: smooth() });
  }

  function scrollLines(down, instant) {
    window.scrollBy({ top: down ? 60 : -60, behavior: instant ? 'instant' : smooth() });
  }

  var arrowToast = document.getElementById('arrow-toast');
  if (modeEl) {
    document.addEventListener('selectionchange', function () {
      if (Date.now() < findSelUntil) return;
      if (typeof updateMode === 'function' && (eggBuf.charAt(0) === ':' || eggBuf.charAt(0) === '/')) return;
      var s = window.getSelection ? window.getSelection() : null;
      var visual = !!(s && !s.isCollapsed && String(s).length > 0);
      modeEl.textContent = visual ? 'VISUAL' : 'NORMAL';
      modeEl.classList.toggle('is-visual', visual);
    });
  }

  var posEl = document.getElementById('sl-pos');
  if (posEl) {
    var posQueued = false;
    var updatePos = function () {
      posQueued = false;
      var h = document.documentElement;
      var max = h.scrollHeight - window.innerHeight;
      if (max <= 0) {
        posEl.textContent = 'Top';
        return;
      }
      var p = (window.pageYOffset || h.scrollTop) / max;
      posEl.textContent = p <= 0.02 ? 'Top' : p >= 0.98 ? 'Bot' : Math.round(p * 100) + '%';
    };
    window.addEventListener(
      'scroll',
      function () {
        if (!posQueued) {
          posQueued = true;
          window.requestAnimationFrame(updatePos);
        }
      },
      { passive: true }
    );
    updatePos();
  }

  var egg = document.getElementById('vim-egg');
  if (egg && typeof egg.showModal === 'function') {
    var exitCmds = [':q', ':q!', ':wq', ':wq!', ':x', ':x!', ':qa!', ':qall', 'ZZ', 'ZQ'];
    var knownCmds = exitCmds.concat([':smile', ':h', ':e!']);
    var eggCmdEl = document.getElementById('vim-egg-cmd');
    var smileBox = document.getElementById('vim-smile');
    var helpBox = document.getElementById('vim-help');
    var errTimer = null;
    var lastQuery = '';
    var findSelUntil = 0;

    var anyOpen = function () {
      return !!(egg.open || (smileBox && smileBox.open) || (helpBox && helpBox.open));
    };

    updateMode = function () {
      if (!modeEl || modeEl.classList.contains('is-error')) return;
      if (eggBuf.charAt(0) === ':' || eggBuf.charAt(0) === '/') {
        modeEl.textContent = eggBuf;
        modeEl.classList.add('is-cmdline');
        modeEl.classList.remove('is-visual');
      } else {
        modeEl.textContent = 'NORMAL';
        modeEl.classList.remove('is-cmdline');
      }
    };

    var flashError = function (msg) {
      if (!modeEl) return;
      if (errTimer) clearTimeout(errTimer);
      modeEl.textContent = msg;
      modeEl.classList.remove('is-cmdline');
      modeEl.classList.add('is-error');
      errTimer = setTimeout(function () {
        modeEl.classList.remove('is-error');
        updateMode();
      }, 2600);
    };

    var e492 = function (buf) {
      var msg = 'E492: Not an editor command' + (buf.length > 1 ? ': ' + buf : '');
      if (buf.charAt(0) === ':') {
        for (var k = 0; k < knownCmds.length; k++) {
          var c = knownCmds[k];
          if (c !== buf && c.slice(0, 2) === buf.slice(0, 2)) {
            msg += ' did you mean ' + c + '?';
            break;
          }
        }
      }
      flashError(msg);
    };

    var showEgg = function (cmd) {
      eggBuf = '';
      updateMode();
      if (eggCmdEl) eggCmdEl.textContent = cmd;
      if (!egg.open) egg.showModal();
    };

    var openBox = function (box) {
      eggBuf = '';
      updateMode();
      if (box && !box.open) box.showModal();
    };

    var doSearch = function (backwards) {
      var query = eggBuf.charAt(0) === '/' ? eggBuf.slice(1) : lastQuery;
      eggBuf = '';
      updateMode();
      if (!query) {
        flashError('E35: No previous regular expression');
        return;
      }
      lastQuery = query;
      if (typeof window.find !== 'function') {
        flashError('E319: Sorry, the command is not available in this version');
        return;
      }
      findSelUntil = Date.now() + 350;
      if (!window.find(query, false, !!backwards, true)) {
        flashError('E486: Pattern not found: ' + query);
      }
    };

    window.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        var s = window.getSelection ? window.getSelection() : null;
        if (!s || s.isCollapsed || String(s).length === 0) {
          e.preventDefault();
          showEgg('^C');
        }
        return;
      }
      if (anyOpen()) return;
      if (e.key === 'Escape') {
        eggBuf = '';
        updateMode();
        return;
      }
      if (e.key === 'Enter' && eggBuf.charAt(0) === ':') {
        e.preventDefault();
        var matched = false;
        for (var m = 0; m < exitCmds.length; m++) {
          if (eggBuf === exitCmds[m]) matched = true;
        }
        var cmd = eggBuf;
        eggBuf = '';
        if (matched) showEgg(cmd);
        else if (cmd === ':smile' || cmd === ':h') openBox(cmd === ':smile' ? smileBox : helpBox);
        else if (cmd === ':e!') location.reload();
        else e492(cmd);
        updateMode();
        return;
      }
      if (e.key === 'Enter' && eggBuf.charAt(0) === '/') {
        e.preventDefault();
        doSearch(false);
        return;
      }
      if (e.key === 'Backspace') {
        eggBuf = eggBuf.slice(0, -1);
        updateMode();
        return;
      }
      if (e.key === 'n' && !eggBuf && lastQuery) {
        doSearch(false);
        return;
      }
      if (e.key === 'N' && !eggBuf && lastQuery) {
        doSearch(true);
        return;
      }
      if (!eggBuf && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === 'j') { e.preventDefault(); scrollLines(true, e.repeat); return; }
        if (e.key === 'k') { e.preventDefault(); scrollLines(false, e.repeat); return; }
        if (e.key === 'w') { e.preventDefault(); nextSection(); return; }
        if (e.key === 'b') { e.preventDefault(); prevSection(); return; }
        if (e.key === '{') { e.preventDefault(); prevSection(); return; }
        if (e.key === '}') { e.preventDefault(); nextSection(); return; }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && !eggBuf) {
        e.preventDefault(); scrollHalfPage(true); return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'u' && !eggBuf) {
        e.preventDefault(); scrollHalfPage(false); return;
      }
      if (e.key && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === 'G' && eggBuf.charAt(0) !== ':' && eggBuf.charAt(0) !== '/') {
          eggBuf = '';
          updateMode();
          window.scrollTo({ top: document.documentElement.scrollHeight, behavior: smooth() });
          return;
        }
        eggBuf = (eggBuf + e.key).slice(-8);
        if (eggBuf === 'ZZ' || eggBuf === 'ZQ') {
          showEgg(eggBuf);
          return;
        }
        if (eggBuf === 'gg') {
          eggBuf = '';
          updateMode();
          window.scrollTo({ top: 0, behavior: smooth() });
          return;
        }
        updateMode();
      }
    });
    egg.addEventListener('close', function () {
      eggBuf = '';
      updateMode();
    });
    var eggWq = document.getElementById('vim-egg-wq');
    var eggQ = document.getElementById('vim-egg-q');
    if (eggWq) eggWq.addEventListener('click', function () { egg.close(); });
    if (eggQ) eggQ.addEventListener('click', function () { egg.close(); });
    var smileQ = document.getElementById('vim-smile-q');
    if (smileQ) smileQ.addEventListener('click', function () { smileBox.close(); });
    var helpQ = document.getElementById('vim-help-q');
    if (helpQ) helpQ.addEventListener('click', function () { helpBox.close(); });
  }

  var arrowTimer = null;
  window.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      var ae = document.activeElement;
      if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable)) return;
      var dialog = document.querySelector('dialog[open]');
      if (dialog) return;
      if (arrowToast) {
        if (arrowTimer) clearTimeout(arrowTimer);
        arrowToast.hidden = false;
        arrowTimer = setTimeout(function () { arrowToast.hidden = true; arrowTimer = null; }, 2200);
      }
    }
  });

  var clockEl = document.getElementById('sl-clock');
  if (clockEl && typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
    try {
      var clockFmt = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Budapest',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      var tick = function () {
        clockEl.textContent = 'BUD ' + clockFmt.format(new Date());
      };
      tick();
      setInterval(tick, 30000);
    } catch (e) {}
  }

  try {
    console.log(
      '%c:h',
      'font-family:monospace; font-size:1.4em; font-weight:bold; color:#b8bb26;',
      'vim commands work on the page. start there.'
    );
  } catch (e) {}

})();