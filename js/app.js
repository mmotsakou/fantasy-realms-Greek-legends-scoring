(function () {
  'use strict';

  const { SUITS, TAGS, CARDS } = window.GLCards;
  const { scoreBest, choiceSlots, byId, HAND_SIZE } = window.GLEngine;

  const STORAGE_KEY = 'fr-greek-legends-scoring';
  const $ = (sel) => document.querySelector(sel);
  const el = (tag, attrs = {}, ...children) => {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (v === undefined || v === null || v === false) return;
      if (k === 'class') node.className = v;
      else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v === true ? '' : v);
    });
    children.flat().forEach((c) => c !== null && c !== undefined && node.append(c));
    return node;
  };
  const SINGULAR = { gods: 'God', heroes: 'Hero', items: 'Item', locations: 'Location', monsters: 'Monster', quests: 'Quest' };
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const signed = (n) => (n > 0 ? `+${n}` : `${n}`);

  // ── State ───────────────────────────────────────────────────────────────────
  let state = { hand: [], afterlife: [], choices: {}, target: 'hand', query: '' };

  const valid = (ids) => (Array.isArray(ids) ? ids.filter((id) => byId[id]) : []);

  function load() {
    const fromHash = parseHash();
    if (fromHash) { Object.assign(state, fromHash); try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* ignore */ } return; }
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (saved) Object.assign(state, { hand: valid(saved.hand), afterlife: valid(saved.afterlife), choices: saved.choices || {} });
    } catch (e) { /* storage unavailable */ }
  }
  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ hand: state.hand, afterlife: state.afterlife, choices: state.choices }));
    } catch (e) { /* storage unavailable */ }
  }

  // Share links use a hash of letters, digits and hyphens only: "h" + two base-36 digits per
  // hand card, then "-a" + the Afterlife cards (e.g. #h0a1b-a06). Target choices reset to Auto.
  const code = (id) => CARDS.findIndex((c) => c.id === id).toString(36).padStart(2, '0');
  const decode = (str) => valid((str.match(/[0-9a-z]{2}/g) || []).map((x) => (CARDS[parseInt(x, 36)] || {}).id));

  function parseHash() {
    const m = /^#h([0-9a-z]*)(?:-a([0-9a-z]*))?$/.exec(location.hash || '');
    if (!m) return null;
    return { hand: decode(m[1] || ''), afterlife: decode(m[2] || ''), choices: {} };
  }
  function shareUrl() {
    const hash = `h${state.hand.map(code).join('')}-a${state.afterlife.map(code).join('')}`;
    return `${location.origin}${location.pathname}${location.search}#${hash}`;
  }

  // ── Actions ─────────────────────────────────────────────────────────────────
  const zoneOf = (id) => (state.hand.includes(id) ? 'hand' : state.afterlife.includes(id) ? 'afterlife' : null);

  function add(id, zone) {
    if (zoneOf(id)) return;
    state[zone].push(id);
    update();
  }
  function remove(id) {
    state.hand = state.hand.filter((x) => x !== id);
    state.afterlife = state.afterlife.filter((x) => x !== id);
    delete state.choices[id];
    update();
  }
  function move(id) {
    const from = zoneOf(id);
    const to = from === 'hand' ? 'afterlife' : 'hand';
    state[from] = state[from].filter((x) => x !== id);
    state[to].push(id);
    update();
  }
  function setChoice(id, key, raw) {
    const c = { ...(state.choices[id] || {}) };
    if (raw === '__auto') delete c[key];
    else c[key] = raw === '__none' ? null : raw;
    if (Object.keys(c).length) state.choices[id] = c; else delete state.choices[id];
    update();
  }
  function reset() {
    state.hand = []; state.afterlife = []; state.choices = {};
    update();
  }

  // ── Rendering ───────────────────────────────────────────────────────────────
  const tagChip = (tag, extra = '') => el('span', { class: `tag tag-${tag} ${extra}`.trim() }, cap(tag));

  function noteText(n) {
    switch (n.type) {
      case 'clear': return `${cap(n.parts.join(', '))} cleared by ${n.by}`;
      case 'addTag': return `${cap(n.tag)} added by ${n.by}`;
      case 'sent': return `Sent to the Afterlife by ${n.by}`;
      case 'saved': return `Kept alive by ${n.by} (vs ${n.from})`;
      case 'forgotten': return 'Bonus and tags ignored (River Lethe)';
      default: return '';
    }
  }

  function choiceControls(cardId, slots, result) {
    const mine = slots.filter((s) => s.cardId === cardId);
    if (!mine.length) return null;
    return el('div', { class: 'choices' }, mine.map((slot) => {
      const chosen = state.choices[cardId] && Object.prototype.hasOwnProperty.call(state.choices[cardId], slot.key)
        ? state.choices[cardId][slot.key] : undefined;
      const auto = result.resolved[cardId] ? result.resolved[cardId][slot.key] : null;
      const label = (v) => (v === null ? 'None' : TAGS.includes(v) ? cap(v) : byId[v].name);
      const select = el('select', {
        'aria-label': `${byId[cardId].name}: ${slot.key}`,
        onchange: (e) => setChoice(cardId, slot.key, e.target.value),
      },
      el('option', { value: '__auto', selected: chosen === undefined }, `Auto (${label(auto)})`),
      slot.values.map((v) => el('option', { value: v === null ? '__none' : v, selected: chosen !== undefined && chosen === v }, label(v))));
      return el('label', { class: 'choice' }, el('span', {}, cap(slot.key)), select);
    }));
  }

  function cardTile(c, slots, result) {
    const card = c.card;
    const zone = zoneOf(card.id);
    const original = card.tags;
    const tagRow = [
      ...original.map((t) => tagChip(t, c.tags.includes(t) ? '' : 'off')),
      ...c.tags.filter((t) => !original.includes(t)).map((t) => tagChip(t, 'added')),
    ];
    const notes = c.notes.map(noteText).filter(Boolean);
    const sent = c.startZone === 'hand' && c.zone === 'afterlife';

    return el('article', { class: `tile suit-${card.suit}${sent ? ' sent' : ''}` },
      el('div', { class: 'tile-head' },
        el('span', { class: 'base', title: 'Base value' }, String(card.base)),
        el('div', { class: 'title' },
          el('strong', {}, card.name),
          el('small', {}, `${SINGULAR[card.suit]}${card.promo ? ' · promo' : ''}`)),
        el('span', { class: 'points', title: 'Points for this card' }, String(c.total))),
      tagRow.length ? el('div', { class: 'tags' }, tagRow) : null,
      card.text ? el('p', { class: 'text' }, card.text) : null,
      el('div', { class: 'breakdown' },
        el('span', {}, `base ${c.base}`),
        c.bonus ? el('span', { class: 'pos' }, `bonus ${signed(c.bonus)}`) : null,
        c.penalty ? el('span', { class: 'neg' }, `penalty ${signed(c.penalty)}`) : null,
        c.zone === 'afterlife' ? el('span', { class: 'neg' }, 'Afterlife −10') : null),
      notes.length ? el('ul', { class: 'notes' }, notes.map((n) => el('li', {}, n))) : null,
      choiceControls(card.id, slots, result),
      el('div', { class: 'actions' },
        el('button', { type: 'button', class: 'btn small', onclick: () => move(card.id) },
          zone === 'hand' ? '→ Afterlife' : '→ Hand'),
        el('button', { type: 'button', class: 'btn small danger', onclick: () => remove(card.id), 'aria-label': `Remove ${card.name}` }, 'Remove')));
  }

  function renderPicker() {
    const q = state.query.trim().toLowerCase();
    const match = (card) => !q || card.name.toLowerCase().includes(q)
      || card.tags.some((t) => t.includes(q)) || card.suit.includes(q) || (card.text || '').toLowerCase().includes(q);
    const groups = SUITS.map((suit) => {
      const cards = CARDS.filter((c) => c.suit === suit.id && match(c));
      if (!cards.length) return null;
      return el('div', { class: `suit-group suit-${suit.id}` },
        el('h3', {}, suit.name),
        el('div', { class: 'pick-grid' }, cards.map((card) => {
          const zone = zoneOf(card.id);
          return el('button', {
            type: 'button',
            class: `pick${zone ? ` in-${zone}` : ''}`,
            title: card.text || 'No bonus or penalty',
            'aria-pressed': zone ? 'true' : 'false',
            onclick: () => (zone ? remove(card.id) : add(card.id, state.target)),
          },
          el('span', { class: 'pick-base' }, String(card.base)),
          el('span', { class: 'pick-name' }, card.name,
            zone ? el('small', { class: 'pick-zone' }, zone === 'hand' ? 'In hand' : 'In Afterlife') : null));
        })));
    }).filter(Boolean);
    $('#picker').replaceChildren(...(groups.length ? groups : [el('p', { class: 'empty' }, 'No card matches your search.')]));
  }

  function update() {
    save();
    const result = scoreBest(state.hand, state.afterlife, state.choices);
    const slots = choiceSlots(state.hand, state.afterlife);
    const byStart = (z) => result.cards.filter((c) => c.startZone === z);

    $('#total').textContent = String(result.total);

    const hand = byStart('hand');
    $('#hand-count').textContent = `${hand.length}/${HAND_SIZE}`;
    $('#hand').replaceChildren(...(hand.length ? hand.map((c) => cardTile(c, slots, result))
      : [el('p', { class: 'empty' }, 'Tap cards on the right (or below) to add them to your hand.')]));

    const warn = $('#hand-warning');
    warn.hidden = hand.length === HAND_SIZE || hand.length === 0;
    warn.textContent = `A final hand normally has ${HAND_SIZE} cards (you have ${hand.length}).`;

    const after = byStart('afterlife');
    $('#afterlife-count').textContent = result.afterlifeCount
      ? `${result.afterlifeCount} × −10 = ${result.afterlifeScore}` : '';
    $('#afterlife').replaceChildren(...(after.length ? after.map((c) => cardTile(c, slots, result))
      : [el('p', { class: 'empty' }, 'No cards in the Afterlife. Switch to “Add to Afterlife” to add some.')]));

    renderPicker();
  }

  function toast(msg, ms = 2200) {
    const t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { t.hidden = true; }, ms);
  }

  // ── Wiring ──────────────────────────────────────────────────────────────────
  document.querySelectorAll('.segmented button').forEach((b) => b.addEventListener('click', () => {
    state.target = b.dataset.target;
    document.querySelectorAll('.segmented button').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
  }));
  $('#search').addEventListener('input', (e) => { state.query = e.target.value; renderPicker(); });
  $('#reset').addEventListener('click', () => { if (!state.hand.length && !state.afterlife.length) return; reset(); });
  $('#share').addEventListener('click', async () => {
    const url = shareUrl();
    try { await navigator.clipboard.writeText(url); toast('Link copied to clipboard'); } catch (e) { toast(`Copy this link: ${url}`, 8000); }
  });

  load();
  update();
})();
