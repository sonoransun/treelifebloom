// Toolbar — view switch, layer toggles, panel buttons, the era badge, the narrow-screen drawer's
// open state and the phone menu that folds the layer and panel toggles away.
// All markup is static in index.html; this class only wires it to the app.

const VIEW_BUTTONS = { map: 'btn-view-map', globe: 'btn-view-globe', tree: 'btn-view-tree' };
const LAYER_BUTTONS = { plates: 'btn-plates', labels: 'btn-labels' };
const PANEL_BUTTONS = { chapters: 'btn-chapters', legend: 'btn-legend', help: 'btn-help', sidebar: 'btn-sidebar' };

// Must match the breakpoints in css/styles.css (drawer: ≤ 900px, phone menu: ≤ 720px).
const NARROW_QUERY = '(max-width: 900px)';
const PHONE_QUERY = '(max-width: 720px)';

export class Toolbar {
  constructor(app) {
    this.app = app;
    this.eraSwatch = document.getElementById('era-swatch');
    this.eraPath = document.getElementById('era-path');
    this.eraName = document.getElementById('era-name');
    this.brand = document.getElementById('brand');
    this.toolbarEl = document.getElementById('toolbar');
    this._periodKey = null;
    this._narrow = window.matchMedia(NARROW_QUERY);

    // Brand = "back to the beginning" without a page reload. Modified and middle clicks keep
    // their browser meaning (a new tab or window on the start of the story).
    this.brand.addEventListener('click', (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      app.restart();
    });

    for (const [mode, id] of Object.entries(VIEW_BUTTONS)) {
      document.getElementById(id).addEventListener('click', () => app.setView(mode));
    }
    this._layerTitles = {};
    for (const [name, id] of Object.entries(LAYER_BUTTONS)) {
      const btn = document.getElementById(id);
      this._layerTitles[name] = btn.title;
      btn.addEventListener('click', () => {
        if (btn.getAttribute('aria-disabled') === 'true') return; // Tree view: no map layers
        app.toggleLayer(name);
      });
    }
    for (const [name, id] of Object.entries(PANEL_BUTTONS)) {
      const btn = document.getElementById(id);
      btn.addEventListener('click', () => {
        // Opened from the phone menu: fold the menu first and park focus on its button, so the
        // panel hands focus back to something visible when it closes.
        if (this._moreOpen && this.moreEl.contains(btn)) this._setMore(false, { focus: document.activeElement === btn });
        app.bus.emit('panel:toggle', { name });
      });
    }

    app.bus.on('view:changed', ({ mode }) => this._syncView(mode));
    app.bus.on('layer:changed', ({ name, on }) => this._syncLayer(name, on));
    // Panels report their own open state so the buttons can reflect it.
    app.bus.on('panel:changed', ({ name, open }) => this._syncPanel(name, open));

    // The narrow-screen drawer is plain DOM state, so the toolbar owns it and reports it like any
    // other panel. js/ui/sidebar.js keeps the closed drawer inert and closes it on Escape.
    this.sidebarEl = document.getElementById('sidebar');
    app.bus.on('panel:toggle', ({ name, open }) => {
      if (name !== 'sidebar') return;
      const was = this.sidebarEl.classList.contains('open');
      const next = open ?? !was;
      if (next === was) return;
      this.sidebarEl.classList.toggle('open', next);
      app.bus.emit('panel:changed', { name: 'sidebar', open: next });
    });
    // Fallback only: once every close-all listener has run, a drawer still open on a narrow screen
    // means nobody else closed it.
    app.bus.on('panel:close-all', () => queueMicrotask(() => {
      if (this._narrow.matches && this.sidebarEl.classList.contains('open')) {
        app.bus.emit('panel:toggle', { name: 'sidebar', open: false });
      }
    }));

    this._wireMoreMenu();

    this._syncView(app.state.view);
    for (const [name, on] of Object.entries(app.state.layers)) this._syncLayer(name, on);
  }

  // ---- phone menu ------------------------------------------------------------------------------
  // Below 720px the layer and panel toggles live in #toolbar-more, a drop-down shown by #btn-more.
  // It is a disclosure (not an ARIA menu): the real buttons, in their usual tab order. Escape, a
  // press elsewhere, tabbing out, or opening a panel from it closes it.

  _wireMoreMenu() {
    this.moreBtn = document.getElementById('btn-more');
    this.moreEl = document.getElementById('toolbar-more');
    this._moreOpen = false;
    if (!this.moreBtn || !this.moreEl) {
      this.moreEl = null; // older markup: no menu, the toggles always sit in the bar
      return;
    }
    this._phone = window.matchMedia(PHONE_QUERY);

    this.moreBtn.addEventListener('click', () => this._setMore(!this._moreOpen));

    const onKey = (e) => {
      if (!this._moreOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault(); // one Escape closes only the menu (the global shortcut skips it)
        this._setMore(false, { focus: true });
      } else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && this.moreEl.contains(e.target)) {
        const items = [...this.moreEl.querySelectorAll('button')].filter((b) => b.getClientRects().length);
        const i = items.indexOf(e.target);
        const next = items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length];
        if (next) {
          e.preventDefault();
          next.focus();
        }
      }
    };
    this.moreBtn.addEventListener('keydown', onKey);
    this.moreEl.addEventListener('keydown', onKey);

    // Capture phase: views may stop pointer events from bubbling.
    document.addEventListener('pointerdown', (e) => {
      if (this._moreOpen && !this.moreEl.contains(e.target) && !this.moreBtn.contains(e.target)) this._setMore(false);
    }, true);
    this.moreEl.addEventListener('focusout', (e) => {
      const to = e.relatedTarget;
      if (this._moreOpen && to && !this.moreEl.contains(to) && to !== this.moreBtn) this._setMore(false);
    });
    this.app.bus.on('panel:close-all', () => {
      this._setMore(false, { focus: this.moreEl.contains(document.activeElement) });
    });
    // Above the breakpoint the groups sit in the bar again.
    this._phone.addEventListener('change', () => this._setMore(false));
  }

  _setMore(open, { focus = false } = {}) {
    if (!this.moreEl) return;
    const next = !!open && this._phone.matches;
    if (next !== this._moreOpen) {
      this._moreOpen = next;
      this.moreEl.classList.toggle('is-open', next);
      this.toolbarEl.classList.toggle('is-menu-open', next);
      this.moreBtn.setAttribute('aria-expanded', String(next));
    }
    if (!next && focus && this.moreBtn.getClientRects().length) this.moreBtn.focus({ preventScroll: true });
  }

  // ---- state sync ------------------------------------------------------------------------------

  _syncView(mode) {
    for (const [m, id] of Object.entries(VIEW_BUTTONS)) {
      const btn = document.getElementById(id);
      const active = m === mode;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
    }
    // Layer toggles only apply to the geographic views. aria-disabled (not the disabled
    // attribute) keeps a focused chip focused when the Tree takes over.
    const geographic = mode !== 'tree';
    for (const [name, id] of Object.entries(LAYER_BUTTONS)) {
      const btn = document.getElementById(id);
      if (geographic) {
        btn.removeAttribute('aria-disabled');
        btn.title = this._layerTitles[name];
      } else {
        btn.setAttribute('aria-disabled', 'true');
        btn.title = `${this._layerTitles[name]} — on the Map and Globe`;
      }
    }
  }

  _syncLayer(name, on) {
    const id = LAYER_BUTTONS[name];
    if (!id) return;
    const btn = document.getElementById(id);
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-pressed', String(on));
  }

  _syncPanel(name, open) {
    const id = PANEL_BUTTONS[name];
    if (!id) return;
    const btn = document.getElementById(id);
    btn.classList.toggle('active', open);
    if (btn.hasAttribute('aria-expanded')) btn.setAttribute('aria-expanded', String(open));
  }

  update(frame) {
    const period = frame.period;
    if (!period) return;
    const key = period.period;
    if (key === this._periodKey) return;
    this._periodKey = key;
    const path = [period.eon, period.era && period.era !== period.eon ? period.era : null, period.parentPeriod]
      .filter((p) => p && p !== (period.label || period.period));
    this.eraPath.textContent = path.length ? `${path.join(' › ')} ›` : '';
    this.eraName.textContent = period.label || period.period;
    this.eraSwatch.style.backgroundColor = period.color;
  }
}
