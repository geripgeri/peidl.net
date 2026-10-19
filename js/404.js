// peidl.net · 404 — the k9s screen's behaviour.
//
// The layout is static in 404.html, so the page still reads with JavaScript
// off: this swaps the requested path in, pads the table's columns the way k9s
// does, and binds the keys the screen advertises. The CSP is script-src
// 'self' with no inline styles, so nothing lives inline in the markup.

(function () {
  'use strict';

  var doc = document;

  // -------------------------------------------------- the requested resource

  // k9s addresses a resource by name, not by path, so the requested path is
  // presented the same way: its last segment, cleaned up.
  function resourceName(pathname) {
    var parts = pathname.split('/').filter(Boolean);
    var last = parts.length ? parts[parts.length - 1] : '';
    try {
      last = decodeURIComponent(last);
    } catch (e) {}
    // Keep letters and digits in any script, drop the rest. This is about
    // looking like a resource name; the value only ever meets textContent.
    last = last.replace(/[^\p{L}\p{N}._~-]+/gu, '-').replace(/^-+|-+$/g, '');
    if (last.length > 48) last = last.slice(0, 45) + '...';
    return last || 'this-page';
  }

  var request = window.location.pathname + window.location.search;
  if (request.length > 60) request = '...' + request.slice(-57);

  var name = resourceName(window.location.pathname);

  function fill(selector, value) {
    var nodes = doc.querySelectorAll(selector);
    for (var i = 0; i < nodes.length; i++) nodes[i].textContent = value;
  }

  fill('[data-path]', name);
  fill('[data-request]', request);
  if (name !== 'this-page') {
    doc.title = '404 · no resources found · ' + name + ' · peidl.net';
  }

  // ------------------------------------------------------------- flash line

  // The k9s message (internal/view/browser.go) is this page's resting state
  // rather than something that clears: it is the whole point of the page.
  // The Farnsworth prefix is the one deliberate voice gag, kept user-visible.
  var RESTING = 'All glory to the Hypnotoad: no resources found for ' + name + ' in "peidl.net" namespace';
  var FLASH_DELAY = 6000; // model.DefaultFlashDelay
  var EMOJI = { info: '😎', warn: '😵‍💫', err: '😡' };

  var flashEl = doc.getElementById('k9s-flash');
  var flashText = flashEl && flashEl.querySelector('.k9s-flash-text');
  var flashEmoji = flashEl && flashEl.querySelector('.k9s-flash-emoji');
  var flashTimer = 0;

  function setFlash(text, level) {
    if (!flashEl) return;
    flashEl.dataset.level = level;
    if (flashEmoji) flashEmoji.textContent = EMOJI[level] || EMOJI.warn;
    if (flashText) flashText.textContent = text;
  }

  function clearFlash() {
    if (!flashEl) return;
    if (flashTimer) window.clearTimeout(flashTimer);
    flashTimer = 0;
    flashEl.classList.add('is-clear');
  }

  function rest() {
    if (flashEl) flashEl.classList.remove('is-clear');
    if (flashTimer) window.clearTimeout(flashTimer);
    flashTimer = 0;
    setFlash(RESTING, 'warn');
  }

  function flash(text, level) {
    if (flashEl) flashEl.classList.remove('is-clear');
    setFlash(text, level);
    if (flashTimer) window.clearTimeout(flashTimer);
    flashTimer = window.setTimeout(rest, FLASH_DELAY);
  }

  // ------------------------------------------------------------------ views

  var VIEWS = ['pages', 'describe', 'xray'];

  // The crumb strings mirror internal/ui/crumbs.go: one badge per view along
  // the drill-down, the deepest one highlighted in crumbs.activeColor.
  var CRUMBS = {
    pages: [['<pages>', true]],
    describe: [['<pages>', false], ['<describe>', true]],
    xray: [['<xray>', true]]
  };

  function setCrumbs(which) {
    var nav = doc.querySelector('.k9s-crumbs');
    var list = CRUMBS[which] || CRUMBS.pages;
    while (nav.firstChild) nav.removeChild(nav.firstChild);
    for (var i = 0; i < list.length; i++) {
      var crumb = doc.createElement('span');
      crumb.className = 'k9s-crumb' + (list[i][1] ? ' is-active' : '');
      crumb.textContent = list[i][0];
      nav.appendChild(crumb);
    }
  }

  function showView(which) {
    for (var i = 0; i < VIEWS.length; i++) {
      var view = doc.getElementById('view-' + VIEWS[i]);
      if (view) view.hidden = VIEWS[i] !== which;
    }
    setCrumbs(which);
    if (doc.body.classList) {
      doc.body.classList.toggle('k9s-describe', which === 'describe');
    }
    // k9s blanks the flash line while a view besides the table holds focus.
    if (which === 'pages') {
      rest();
    } else {
      clearFlash();
    }
  }

  // ----------------------------------------------------------- table cursor

  var CURSOR = '#view-pages tbody tr';

  function cursorRow() {
    return doc.querySelector(CURSOR + '.is-cursor');
  }

  function move(delta) {
    var rows = doc.querySelectorAll(CURSOR);
    if (!rows.length) return;
    var at = -1;
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].classList.contains('is-cursor')) at = i;
    }
    var next = Math.min(rows.length - 1, Math.max(0, (at < 0 ? 0 : at) + delta));
    if (next === at) return;
    if (at >= 0) rows[at].classList.remove('is-cursor');
    rows[next].classList.add('is-cursor');
    rows[next].scrollIntoView({ block: 'nearest' });
  }

  function activate() {
    var row = cursorRow();
    if (!row) return;
    var link = row.querySelector('a');
    if (link) {
      link.click();
      return;
    }
    flash('unable to view "peidl.net/' + name + '": not found', 'err');
  }

  function help() {
    flash('Help: <enter> open  <d> describe  <x> xray  <esc> back  <q> quit', 'info');
  }

  // --------------------------------------------------- k9s column pads

  // ui/table.go ComputeMaxColumns: each column pads to
  //   max(len(header) (+2 when sorted), max cell length + 1),
  // and tview's column expansion then splits every leftover cell evenly, so
  // the table spreads across the whole frame like a real terminal table.
  function padColumns() {
    var table = doc.querySelector('#view-pages .k9s-table');
    var probe = doc.querySelector('.k9s-ch');
    if (!table || !probe) return;

    var ch = probe.getBoundingClientRect().width / probe.textContent.length;
    if (!ch) return;

    var head = table.tHead.rows[0];
    var body = table.tBodies[0];
    var ncols = head.cells.length;
    var widths = [];
    var total = 0;

    for (var c = 0; c < ncols; c++) {
      // Hidden columns (the squeezed mobile layout) collapse to nothing.
      if (getComputedStyle(head.cells[c]).display === 'none') {
        widths.push(0);
        continue;
      }
      var label = head.cells[c].textContent.replace('↑', '').trim();
      var base = label.length + (c === 0 ? 2 : 0); // NAME holds the sort arrow
      for (var r = 0; r < body.rows.length; r++) {
        var cell = body.rows[r].cells[c];
        if (cell) base = Math.max(base, cell.textContent.length + 1);
      }
      widths.push(base);
      total += base;
    }

    // tview (table.go): every cell carries expansion 1, so each visible
    // column takes floor(leftover / remaining columns); the last one sweeps
    // whatever the integer floors dropped.
    var view = table.parentElement;
    var box = getComputedStyle(view);
    var avail = view.clientWidth - parseFloat(box.paddingLeft) - parseFloat(box.paddingRight);
    var cells = Math.floor(avail / ch);
    var toDistribute = cells - total;
    if (toDistribute > 0) {
      var visible = widths.filter(function (w) { return w > 0; }).length;
      for (var i = 0; i < widths.length && toDistribute > 0; i++) {
        if (!widths[i]) continue;
        var expWidth = Math.floor(toDistribute / visible);
        widths[i] += expWidth;
        toDistribute -= expWidth;
        visible -= 1;
      }
      for (var k = widths.length - 1; k >= 0 && toDistribute > 0; k--) {
        if (widths[k]) {
          widths[k] += toDistribute;
          toDistribute = 0;
        }
      }
    }

    // Apply: fixed layout, widths live on the colgroup, cells without pad.
    // Display:none columns (the squeezed mobile layout) free their cells,
    // which remap onto the leading columns, so the pads pack left and the
    // rest of the group collapses to nothing.
    var colgroup = table.tHead.previousSibling;
    if (!colgroup || colgroup.tagName !== 'COLGROUP') {
      colgroup = doc.createElement('colgroup');
      table.insertBefore(colgroup, table.tHead);
      for (var g = 0; g < widths.length; g++) colgroup.appendChild(doc.createElement('col'));
    }
    var cols = colgroup.children;
    var col = 0;
    for (var j = 0; j < widths.length; j++) {
      if (widths[j]) cols[col++].style.width = widths[j] + 'ch';
    }
    for (var z = col; z < cols.length; z++) cols[z].style.width = '0ch';
    table.classList.add('is-padded');
  }


  // ------------------------------------------------------------------- keys

  var ACTIONS = {
    view: activate,
    back: function () {
      showView('pages');
    },
    help: help,
    describe: function () {
      showView('describe');
    },
    xray: function () {
      showView('xray');
    },
    quit: function () {
      window.location.assign('/');
    }
  };

  var hints = doc.querySelectorAll('.k9s-hint[data-action]');
  for (var h = 0; h < hints.length; h++) {
    hints[h].addEventListener('click', function (e) {
      var fn = ACTIONS[e.currentTarget.dataset.action];
      if (fn) fn();
    });
  }

  doc.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var tag = e.target && e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    // Leave Enter and Space to a focused link or button.
    if ((tag === 'A' || tag === 'BUTTON') && (e.key === 'Enter' || e.key === ' ')) return;

    switch (e.key) {
      case 'j':
      case 'ArrowDown':
        e.preventDefault();
        move(1);
        return;
      case 'k':
      case 'ArrowUp':
        e.preventDefault();
        move(-1);
        return;
      case 'Enter':
        e.preventDefault();
        activate();
        return;
      case 'd':
        e.preventDefault();
        showView('describe');
        return;
      case 'x':
        e.preventDefault();
        showView('xray');
        return;
      case 'Escape':
        showView('pages');
        return;
      case '?':
        e.preventDefault();
        help();
        return;
      case 'q':
        window.location.assign('/');
        return;
      default:
    }
  });

  showView('pages');
  padColumns();
  // Resize lands before Chrome has laid out the new viewport; recompute on
  // the next frame instead, and again once the webfont settles.
  window.addEventListener('resize', function () { window.requestAnimationFrame(padColumns); });
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(padColumns);
})();
