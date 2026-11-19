/*
 * Fantasy Realms: Greek Legends — scoring engine.
 *
 * End-of-game order (from the rulebook):
 *   1. Bonuses that CLEAR (optional)      – Moly, Charmed Bridle
 *   2. Penalties that CLEAR (mandatory)   – Circe, Lotus Field, Dionysus
 *   3. Bonuses that ADD tags              – Athena, Chiron, Pegasus, Winged Sandals
 *   4. ENDGAME effects                    – Monsters, Herakles, Pomegranate (Helm of Darkness protects)
 *   5. Score every card (hand and Afterlife), then −10 for each card in the Afterlife.
 *
 * Definitions used here:
 *   - A Living HERO is a Hero in the hand.
 *   - Cards in the Afterlife keep their base value, tags, bonus and penalty.
 *   - CLEAR removes tags / bonus / penalty, but the card keeps its suit and base value.
 *   - Effects in the same step are simultaneous: their conditions read the state at the
 *     start of the step.
 */
(function (root) {
  'use strict';

  const data = typeof module !== 'undefined' && module.exports ? require('./cards.js') : root.GLCards;
  const { CARDS, TAGS, ATHENA_TAGS, hasPenalty } = data;

  const AFTERLIFE_PENALTY = -10;
  const HAND_SIZE = 7;
  const byId = Object.fromEntries(CARDS.map((c) => [c.id, c]));

  const isHero = (i) => i.card.suit === 'heroes';
  const isLivingHero = (i) => isHero(i) && i.zone === 'hand';

  // ── Choice targets ──────────────────────────────────────────────────────────
  const CHOICE_KINDS = {
    livingHero: (i) => isLivingHero(i),
    anyHero: (i) => isHero(i),
    handGod: (i) => i.card.suit === 'gods' && i.zone === 'hand',
    monsterWithPenalty: (i) => i.card.suit === 'monsters' && hasPenalty(i.card),
    penaltyCard: (i) => hasPenalty(i.card),
    athenaTag: ATHENA_TAGS,
    anyTag: TAGS,
  };

  const optionsFor = (self, all, kind) => {
    const k = CHOICE_KINDS[kind];
    return Array.isArray(k) ? k.slice() : all.filter((i) => i !== self && k(i)).map((i) => i.card.id);
  };

  // ── Instances ───────────────────────────────────────────────────────────────
  const makeInstances = (hand, afterlife) => [
    ...hand.map((id) => ({ id, zone: 'hand' })),
    ...afterlife.map((id) => ({ id, zone: 'afterlife' })),
  ].filter(({ id }) => byId[id]).map(({ id, zone }) => ({
    card: byId[id],
    zone,
    startZone: zone,
    tags: new Set(byId[id].tags),
    off: { tags: false, bonus: false, penalty: false },
    notes: [],
  }));

  // River Lethe: while its penalty is active, Heroes in the Afterlife have no bonus and no tags.
  const lethe = (all) => all.some((i) => i.card.forgetsDeadHeroes && !i.off.penalty);
  const forgotten = (i, all) => isHero(i) && i.zone === 'afterlife' && lethe(all);

  function makeCtx(self, all, choices, state, snapshot) {
    const others = all.filter((i) => i !== self);
    const tagsOf = (i) => (i && !forgotten(i, all) ? i.tags : new Set());
    const hasTag = (i, t) => tagsOf(i).has(t);
    const count = (pred) => others.filter(pred).length;
    const bonusActive = (i) => Boolean(i.card.bonus) && !i.off.bonus && !forgotten(i, all);
    const find = (id) => all.find((i) => i.card.id === id) || null;

    const ctx = {
      self,
      tagsOf,
      hasTag,
      hadTag: (i, t) => Boolean(i) && !forgotten(i, all) && (snapshot ? snapshot.get(i) : i.tags).has(t),
      count,
      countTag: (t) => count((i) => hasTag(i, t)),
      countSuit: (s) => count((i) => i.card.suit === s),
      hasSuit: (s) => others.some((i) => i.card.suit === s),
      has: (id) => others.some((i) => i.card.id === id),
      living: () => others.filter(isLivingHero),
      get livingAtEndgame() { return state.livingAtEndgame; },
      afterlifeCount: () => count((i) => i.zone === 'afterlife'),
      deadHeroes: () => count((i) => isHero(i) && i.zone === 'afterlife'),
      hostileMonsters: () => count((i) => i.card.suit === 'monsters' && hasTag(i, 'hostile')),
      maxBase: (pred) => Math.max(0, ...others.filter(pred).map((i) => i.card.base)),
      isPlain: (i) => tagsOf(i).size === 0 && !bonusActive(i),

      // Resolved target for one of this card's choices (instance for cards, string for tags).
      choice: (key) => {
        const v = state.resolved[self.card.id] && state.resolved[self.card.id][key];
        if (v === undefined || v === null) return null;
        return TAGS.includes(v) ? v : find(v);
      },
      clear: (i, what) => {
        if (!i) return;
        const parts = [];
        if (what.tags && !i.off.tags) { i.off.tags = true; i.tags = new Set(); parts.push('tags'); }
        if (what.bonus && !i.off.bonus) { i.off.bonus = true; parts.push('bonus'); }
        if (what.penalty && !i.off.penalty) { i.off.penalty = true; parts.push('penalty'); }
        if (parts.length) i.notes.push({ type: 'clear', by: self.card.name, parts });
      },
      addTag: (i, t) => {
        if (!i || !t || i.tags.has(t)) return;
        i.tags.add(t);
        i.notes.push({ type: 'addTag', by: self.card.name, tag: t });
      },
      sendAllLivingHeroes: () => { if (!state.sendAll) state.sendAll = self; },
      sendLater: (i) => { if (i) state.moves.push({ target: i, by: self }); },
      protect: (i) => { if (i) state.guarded.set(i, self); },
    };
    return ctx;
  }

  // Fill in choices the player left on "auto" with the first legal option (the optimiser
  // in bestChoices() replaces those with the best ones).
  function resolveChoices(all, choices) {
    const resolved = {};
    all.forEach((self) => {
      (self.card.choices || []).forEach((spec) => {
        const opts = optionsFor(self, all, spec.kind);
        const wanted = choices[self.card.id] && choices[self.card.id][spec.key];
        let v;
        if (wanted === null && spec.optional) v = null;
        else if (wanted !== undefined && wanted !== null && opts.includes(wanted)) v = wanted;
        else v = spec.optional ? null : (opts[0] ?? null);
        (resolved[self.card.id] = resolved[self.card.id] || {})[spec.key] = v;
      });
    });
    return resolved;
  }

  function runStep(all, choices, state, effect, kind) {
    const snapshot = new Map(all.map((i) => [i, new Set(i.tags)]));
    // Decide who acts before anyone acts, so effects in one step are simultaneous.
    all.filter((self) => self.card[effect] && !self.off[kind])
      .forEach((self) => self.card[effect](makeCtx(self, all, choices, state, snapshot)));
  }

  function moveToAfterlife(target, by, state) {
    if (target.zone !== 'hand') return;
    if (isHero(target) && state.guarded.has(target)) {
      target.notes.push({ type: 'saved', by: state.guarded.get(target).card.name, from: by.card.name });
      return;
    }
    target.zone = 'afterlife';
    target.notes.push({ type: 'sent', by: by.card.name });
  }

  /**
   * Score a hand.
   * @param {string[]} hand       card ids in hand
   * @param {string[]} afterlife  card ids in the Afterlife
   * @param {object}   choices    { cardId: { key: value | null } } — missing = auto
   */
  function score(hand, afterlife, choices = {}) {
    const all = makeInstances(hand, afterlife);
    const state = { resolved: resolveChoices(all, choices), livingAtEndgame: [], sendAll: null, moves: [], guarded: new Map() };

    runStep(all, choices, state, 'optionalClear', 'bonus');
    runStep(all, choices, state, 'forcedClear', 'penalty');
    runStep(all, choices, state, 'addTags', 'bonus');

    state.livingAtEndgame = all.filter(isLivingHero);
    runStep(all, choices, state, 'guard', 'bonus');
    runStep(all, choices, state, 'endgame', 'penalty');
    if (state.sendAll) state.livingAtEndgame.forEach((h) => moveToAfterlife(h, state.sendAll, state));
    // A Hero's own ENDGAME effect only works if that Hero is still Living (Herakles).
    state.moves
      .filter(({ by }) => !isHero(by) || by.zone === 'hand')
      .forEach(({ target, by }) => moveToAfterlife(target, by, state));

    const cards = all.map((i) => {
      const ctx = makeCtx(i, all, choices, state);
      const bonus = i.card.bonus && !i.off.bonus && !forgotten(i, all) ? i.card.bonus(ctx) : 0;
      const penalty = i.card.penalty && !i.off.penalty ? i.card.penalty(ctx) : 0;
      if (forgotten(i, all)) i.notes.push({ type: 'forgotten' });
      return {
        id: i.card.id,
        card: i.card,
        startZone: i.startZone,
        zone: i.zone,
        tags: [...tagsOfFinal(i, all)],
        off: { ...i.off },
        notes: i.notes,
        base: i.card.base,
        bonus,
        penalty,
        total: i.card.base + bonus + penalty,
      };
    });

    const afterlifeCount = all.filter((i) => i.zone === 'afterlife').length;
    const afterlifeScore = afterlifeCount * AFTERLIFE_PENALTY;
    const total = cards.reduce((s, c) => s + c.total, 0) + afterlifeScore;
    return { cards, afterlifeCount, afterlifeScore, total, resolved: state.resolved };
  }

  function tagsOfFinal(i, all) { return forgotten(i, all) ? new Set() : i.tags; }

  // ── Optimiser: the player picks targets, so try them all and keep the best ──
  const SEARCH_LIMIT = 4000;

  function choiceSlots(hand, afterlife) {
    const all = makeInstances(hand, afterlife);
    return all.flatMap((self) => (self.card.choices || []).map((spec) => {
      const opts = optionsFor(self, all, spec.kind);
      return { cardId: self.card.id, key: spec.key, kind: spec.kind, optional: !!spec.optional,
        values: spec.optional || !opts.length ? [null, ...opts] : opts };
    }));
  }

  const withChoice = (choices, slot, v) => ({ ...choices, [slot.cardId]: { ...(choices[slot.cardId] || {}), [slot.key]: v } });

  function bestChoices(hand, afterlife, fixed = {}) {
    const isFixed = (s) => fixed[s.cardId] && Object.prototype.hasOwnProperty.call(fixed[s.cardId], s.key)
      && s.values.includes(fixed[s.cardId][s.key]);
    const free = choiceSlots(hand, afterlife).filter((s) => !isFixed(s));
    const totalOf = (ch) => score(hand, afterlife, ch).total;
    const combos = free.reduce((n, s) => n * s.values.length, 1);

    if (combos <= SEARCH_LIMIT) {
      let best = { choices: fixed, total: -Infinity };
      const walk = (k, ch) => {
        if (k === free.length) {
          const t = totalOf(ch);
          if (t > best.total) best = { choices: ch, total: t };
          return;
        }
        free[k].values.forEach((v) => walk(k + 1, withChoice(ch, free[k], v)));
      };
      walk(0, fixed);
      return best.choices;
    }
    // Too many combinations: improve one choice at a time.
    let ch = free.reduce((acc, s) => withChoice(acc, s, s.values[0]), fixed);
    for (let pass = 0; pass < 4; pass++) {
      free.forEach((s) => {
        let top = { v: s.values[0], t: -Infinity };
        s.values.forEach((v) => { const t = totalOf(withChoice(ch, s, v)); if (t > top.t) top = { v, t }; });
        ch = withChoice(ch, s, top.v);
      });
    }
    return ch;
  }

  /** Score with the player's fixed choices and the best values for the rest. */
  function scoreBest(hand, afterlife, fixed = {}) {
    return score(hand, afterlife, bestChoices(hand, afterlife, fixed));
  }

  const api = { score, scoreBest, bestChoices, choiceSlots, AFTERLIFE_PENALTY, HAND_SIZE, byId };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GLEngine = api;
})(this);
