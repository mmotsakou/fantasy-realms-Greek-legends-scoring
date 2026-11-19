/*
 * Fantasy Realms: Greek Legends — card definitions.
 *
 * Each card:
 *   id, n (printed number), name, suit, base, tags, text (rule text)
 *   canAfterlife   card text says "May be discarded to Afterlife"
 *   promo          promotional card (not part of the 79-card deck)
 *   choices        targets the player picks: [{ key, kind, optional }]
 *   optionalClear  step 1 — optional CLEAR bonuses (Moly, Charmed Bridle)
 *   forcedClear    step 2 — mandatory CLEAR penalties (Circe, Lotus Field, Dionysus)
 *   addTags        step 3 — ADD tag bonuses (Athena, Chiron, Pegasus, Winged Sandals)
 *   endgame        step 4 — ENDGAME penalties that move cards to the Afterlife
 *   guard          step 4 — ENDGAME bonus that keeps a Hero alive (Helm of Darkness)
 *   bonus(ctx)     number >= 0
 *   penalty(ctx)   number <= 0
 *
 * Unless the text says otherwise, a card never counts itself ("for each other X").
 * The context object `ctx` is documented in engine.js.
 */
(function (root) {
  'use strict';

  const SUITS = [
    { id: 'gods', name: 'Gods' },
    { id: 'heroes', name: 'Heroes' },
    { id: 'items', name: 'Items' },
    { id: 'locations', name: 'Locations' },
    { id: 'monsters', name: 'Monsters' },
    { id: 'quests', name: 'Quests' },
  ];

  const TAGS = [
    'divine', 'aquatic', 'plant', 'magic', 'artistic', 'clever', 'warrior',
    'wise', 'monarch', 'nimble', 'strong', 'friendly', 'hostile',
  ];

  const ATHENA_TAGS = ['clever', 'wise', 'artistic', 'warrior'];

  const over1 = (n) => Math.max(0, n - 1);

  // Monster ENDGAME penalty: all Living Heroes go to the Afterlife unless `safe` holds.
  const allHeroesUnless = (safe) => (ctx) => {
    if (!safe(ctx)) ctx.sendAllLivingHeroes();
  };
  const livingHeroIs = (...tags) => (ctx) =>
    ctx.livingAtEndgame.some((h) => tags.some((t) => ctx.hasTag(h, t)));

  const CARDS = [
    // ───────────── Gods ─────────────
    { id: 'apollo', n: 1, name: 'Apollo', suit: 'gods', base: 5, tags: ['artistic'],
      text: '+5 for each other ARTISTIC.',
      bonus: (c) => 5 * c.countTag('artistic') },
    { id: 'ares', n: 2, name: 'Ares', suit: 'gods', base: 7, tags: ['warrior'],
      text: '+7 for each other WARRIOR.',
      bonus: (c) => 7 * c.countTag('warrior') },
    { id: 'artemis', n: 3, name: 'Artemis', suit: 'gods', base: 7, tags: [],
      text: '+7 for each HOSTILE MONSTER.',
      bonus: (c) => 7 * c.hostileMonsters() },
    { id: 'athena', n: 4, name: 'Athena', suit: 'gods', base: 4, tags: ATHENA_TAGS,
      text: '+4 for each Living HERO with one or more of Athena’s tags. Athena may ADD one of her tags to a Living HERO.',
      choices: [{ key: 'hero', kind: 'livingHero', optional: true }, { key: 'tag', kind: 'athenaTag' }],
      addTags: (c) => c.addTag(c.choice('hero'), c.choice('tag')),
      bonus: (c) => 4 * c.living().filter((h) => ATHENA_TAGS.some((t) => c.hasTag(h, t))).length },
    { id: 'demeter', n: 5, name: 'Demeter', suit: 'gods', base: 5, tags: ['plant'],
      text: '+5 for each other PLANT.',
      bonus: (c) => 5 * c.countTag('plant') },
    { id: 'fates', n: 6, name: 'Fates', suit: 'gods', base: 3, tags: [], canAfterlife: true,
      text: 'May be discarded to Afterlife. If so, you may discard another card from your hand. Name a suit or tag, reveal cards from the deck until one has it and take it; reshuffle the rest into the deck.' },
    { id: 'hades', n: 7, name: 'Hades', suit: 'gods', base: 3, tags: [], canAfterlife: true,
      text: '+3 for each other card in Afterlife. May be discarded to Afterlife.',
      bonus: (c) => 3 * c.afterlifeCount() },
    { id: 'hecate', n: 8, name: 'Hecate', suit: 'gods', base: 3, tags: ['magic'],
      text: '+9 for each other MAGIC.',
      bonus: (c) => 9 * c.countTag('magic') },
    { id: 'hephaestus', n: 9, name: 'Hephaestus', suit: 'gods', base: 5, tags: ['artistic'],
      text: '+10 for each ITEM.',
      bonus: (c) => 10 * c.countSuit('items') },
    { id: 'hera', n: 10, name: 'Hera', suit: 'gods', base: 6, tags: [],
      text: '+12 for each pair of Living HEROES.',
      bonus: (c) => 12 * Math.floor(c.living().length / 2) },
    { id: 'hermes', n: 11, name: 'Hermes', suit: 'gods', base: 5, tags: ['magic'],
      text: '+5 for each LOCATION, each Living NIMBLE HERO, and each HERO in Afterlife.',
      bonus: (c) => 5 * (c.countSuit('locations')
        + c.living().filter((h) => c.hasTag(h, 'nimble')).length + c.deadHeroes()) },
    { id: 'muses', n: 12, name: 'Muses', suit: 'gods', base: 3, tags: ['artistic'],
      text: '+8 for each other ARTISTIC.',
      bonus: (c) => 8 * c.countTag('artistic') },
    { id: 'persephone', n: 13, name: 'Persephone', suit: 'gods', base: 3, tags: ['plant'], canAfterlife: true,
      text: '+6 for each set of one other card in Afterlife and one other PLANT. May be discarded to Afterlife.',
      bonus: (c) => 6 * Math.min(c.afterlifeCount(), c.countTag('plant')) },
    { id: 'poseidon', n: 14, name: 'Poseidon', suit: 'gods', base: 5, tags: ['aquatic'],
      text: '+5 for each other AQUATIC and for each MONSTER.',
      bonus: (c) => 5 * (c.countTag('aquatic') + c.countSuit('monsters')) },
    { id: 'zeus', n: 15, name: 'Zeus', suit: 'gods', base: 8, tags: ['wise'],
      text: '+4 for each other GOD and for each MONARCH.',
      bonus: (c) => 4 * (c.countSuit('gods') + c.countTag('monarch')) },
    { id: 'dionysus', n: 'P', name: 'Dionysus', suit: 'gods', base: 4, tags: ['plant'], promo: true,
      text: 'PENALTY: CLEAR all bonuses and tags from one HERO. BONUS: add the base value of one HERO with no tags or bonuses.',
      choices: [{ key: 'hero', kind: 'anyHero' }],
      forcedClear: (c) => c.clear(c.choice('hero'), { tags: true, bonus: true }),
      bonus: (c) => c.maxBase((i) => i.card.suit === 'heroes' && c.isPlain(i)) },

    // ───────────── Heroes ─────────────
    { id: 'achilles', n: 16, name: 'Achilles', suit: 'heroes', base: 7, tags: ['warrior', 'strong'],
      text: '+5 with Athena, Hera, Poseidon, or River Styx.',
      bonus: (c) => (['athena', 'hera', 'poseidon', 'river_styx'].some(c.has) ? 5 : 0) },
    { id: 'agamemnon', n: 17, name: 'Agamemnon', suit: 'heroes', base: 9, tags: ['monarch', 'warrior'], text: '' },
    { id: 'andromeda', n: 18, name: 'Andromeda', suit: 'heroes', base: 3, tags: [],
      text: '+17 with both a QUEST and a HOSTILE MONSTER.',
      bonus: (c) => (c.hasSuit('quests') && c.hostileMonsters() > 0 ? 17 : 0) },
    { id: 'arachne', n: 19, name: 'Arachne', suit: 'heroes', base: 3, tags: ['artistic'],
      text: '+10 with more HEROES (Living and in Afterlife) than GODS.',
      // Arachne is a Hero herself, so she counts on the Hero side.
      bonus: (c) => (c.countSuit('heroes') + 1 > c.countSuit('gods') ? 10 : 0) },
    { id: 'atalanta', n: 20, name: 'Atalanta', suit: 'heroes', base: 12, tags: ['nimble'], text: '' },
    { id: 'circe', n: 21, name: 'Circe', suit: 'heroes', base: 14, tags: ['magic', 'wise'],
      text: 'PENALTY: CLEAR all bonuses and tags from all other Living HEROES unless one of them is CLEVER.',
      forcedClear: (c) => {
        const others = c.living();
        if (others.some((h) => c.hadTag(h, 'clever'))) return;
        others.forEach((h) => c.clear(h, { tags: true, bonus: true }));
      } },
    { id: 'hector', n: 22, name: 'Hector', suit: 'heroes', base: 6, tags: ['warrior', 'strong'],
      text: '+6 with Ares, Apollo, or Artemis.',
      bonus: (c) => (['ares', 'apollo', 'artemis'].some(c.has) ? 6 : 0) },
    { id: 'helen', n: 23, name: 'Helen', suit: 'heroes', base: 2, tags: [],
      text: '+10 for each WARRIOR.',
      bonus: (c) => 10 * c.countTag('warrior') },
    { id: 'herakles', n: 24, name: 'Herakles', suit: 'heroes', base: 12, tags: ['strong'],
      text: '+5 for each HOSTILE MONSTER. PENALTY: ENDGAME: if Herakles is Living, move one other HERO from your hand to the Afterlife.',
      choices: [{ key: 'hero', kind: 'livingHero' }],
      endgame: (c) => c.sendLater(c.choice('hero')),
      bonus: (c) => 5 * c.hostileMonsters() },
    { id: 'hippolyta', n: 25, name: 'Hippolyta', suit: 'heroes', base: 10, tags: ['monarch', 'strong'], text: '' },
    { id: 'homer', n: 26, name: 'Homer', suit: 'heroes', base: 6, tags: ['artistic'],
      text: '+6 for each WARRIOR and for each QUEST.',
      bonus: (c) => 6 * (c.countTag('warrior') + c.countSuit('quests')) },
    { id: 'jason', n: 27, name: 'Jason', suit: 'heroes', base: 4, tags: ['nimble'],
      text: '+4 for each QUEST and for each other Living HERO.',
      bonus: (c) => 4 * (c.countSuit('quests') + c.living().length) },
    { id: 'medea', n: 28, name: 'Medea', suit: 'heroes', base: 7, tags: ['magic', 'clever'], text: '' },
    { id: 'odysseus', n: 29, name: 'Odysseus', suit: 'heroes', base: 4, tags: ['clever', 'monarch', 'warrior'],
      text: '+4 for each AQUATIC.',
      bonus: (c) => 4 * c.countTag('aquatic') },
    { id: 'orpheus', n: 30, name: 'Orpheus', suit: 'heroes', base: 6, tags: ['artistic'],
      text: 'If Orpheus is Living, add the base value of any one card in Afterlife.',
      bonus: (c) => (c.self.zone === 'hand' ? c.maxBase((i) => i.zone === 'afterlife') : 0) },
    { id: 'penelope', n: 31, name: 'Penelope', suit: 'heroes', base: 5, tags: ['clever', 'monarch', 'artistic'], text: '' },
    { id: 'perseus', n: 32, name: 'Perseus', suit: 'heroes', base: 5, tags: ['nimble'],
      text: '+5 with a GOD, +5 with an ITEM.',
      bonus: (c) => (c.hasSuit('gods') ? 5 : 0) + (c.hasSuit('items') ? 5 : 0) },
    { id: 'theseus', n: 33, name: 'Theseus', suit: 'heroes', base: 10, tags: ['strong', 'nimble'], text: '' },
    { id: 'tiresias', n: 34, name: 'Tiresias', suit: 'heroes', base: 11, tags: ['wise'], text: '' },

    // ───────────── Items ─────────────
    { id: 'apple_discord', n: 35, name: 'Apple of Discord', suit: 'items', base: 25, tags: ['plant'],
      text: 'PENALTY: −5 for each GOD, Living HERO, and MONSTER beyond the first of each type.',
      penalty: (c) => -5 * (over1(c.countSuit('gods')) + over1(c.living().length) + over1(c.countSuit('monsters'))) },
    { id: 'argo', n: 36, name: 'Argo', suit: 'items', base: 0, tags: ['aquatic'],
      text: '+5 × (number of AQUATIC, including Argo) × (number of Living HEROES).',
      bonus: (c) => 5 * (c.countTag('aquatic') + (c.hasTag(c.self, 'aquatic') ? 1 : 0)) * c.living().length },
    { id: 'charmed_bridle', n: 37, name: 'Charmed Bridle', suit: 'items', base: 11, tags: ['magic'],
      text: 'CLEAR the PENALTY from any one MONSTER.',
      choices: [{ key: 'target', kind: 'monsterWithPenalty', optional: true }],
      optionalClear: (c) => c.clear(c.choice('target'), { penalty: true }) },
    { id: 'cornucopia', n: 38, name: 'Cornucopia', suit: 'items', base: 2, tags: ['plant'], canAfterlife: true,
      text: 'May be discarded to Afterlife. If so, draw 2 cards, then discard 2 cards to the discard area.' },
    { id: 'golden_apples', n: 39, name: 'Golden Apples', suit: 'items', base: 3, tags: ['plant'],
      text: '+14 with a QUEST.',
      bonus: (c) => (c.hasSuit('quests') ? 14 : 0) },
    { id: 'golden_fleece', n: 40, name: 'Golden Fleece', suit: 'items', base: 6, tags: ['divine'],
      text: '+12 with a Living HERO and MAGIC.',
      bonus: (c) => (c.living().length && c.countTag('magic') ? 12 : 0) },
    { id: 'helm_darkness', n: 41, name: 'Helm of Darkness', suit: 'items', base: 13, tags: ['magic'],
      text: 'ENDGAME: keep alive one HERO that would otherwise be sent to the Afterlife.',
      choices: [{ key: 'hero', kind: 'livingHero', optional: true }],
      guard: (c) => c.protect(c.choice('hero')) },
    { id: 'moly', n: 42, name: 'Moly', suit: 'items', base: 4, tags: ['magic', 'plant'],
      text: 'CLEAR any one PENALTY.',
      choices: [{ key: 'target', kind: 'penaltyCard', optional: true }],
      optionalClear: (c) => c.clear(c.choice('target'), { penalty: true }) },
    { id: 'pomegranate', n: 43, name: 'Pomegranate', suit: 'items', base: 6, tags: ['plant'], canAfterlife: true,
      text: 'May be discarded to Afterlife. PENALTY: ENDGAME: move one GOD from your hand to the Afterlife.',
      choices: [{ key: 'god', kind: 'handGod' }],
      endgame: (c) => c.sendLater(c.choice('god')) },
    { id: 'trojan_horse', n: 44, name: 'Trojan Horse', suit: 'items', base: 4, tags: ['warrior'],
      text: '+15 with CLEVER and two or more Living HEROES.',
      bonus: (c) => (c.countTag('clever') && c.living().length >= 2 ? 15 : 0) },
    { id: 'winged_sandals', n: 45, name: 'Winged Sandals', suit: 'items', base: 10, tags: ['divine'],
      text: '+15 with a Living HERO and two or more LOCATIONS. ADD NIMBLE to one Living HERO.',
      choices: [{ key: 'hero', kind: 'livingHero', optional: true }],
      addTags: (c) => c.addTag(c.choice('hero'), 'nimble'),
      bonus: (c) => (c.living().length && c.countSuit('locations') >= 2 ? 15 : 0) },

    // ───────────── Locations ─────────────
    { id: 'daphnes_river', n: 46, name: 'Daphne’s River', suit: 'locations', base: 12, tags: ['plant', 'aquatic'], text: '' },
    { id: 'garden_hesperides', n: 47, name: 'Garden of the Hesperides', suit: 'locations', base: 17, tags: ['plant', 'divine', 'magic'],
      text: 'PENALTY: −12 unless with a HOSTILE MONSTER.',
      penalty: (c) => (c.hostileMonsters() ? 0 : -12) },
    { id: 'lotus_field', n: 48, name: 'Lotus Field', suit: 'locations', base: 23, tags: ['plant'],
      text: 'PENALTY: CLEAR all tags, bonuses, and penalties from all your Living HEROES.',
      forcedClear: (c) => c.living().forEach((h) => c.clear(h, { tags: true, bonus: true, penalty: true })) },
    { id: 'mount_olympus', n: 49, name: 'Mount Olympus', suit: 'locations', base: 6, tags: ['divine'],
      text: '+6 for each GOD.',
      bonus: (c) => 6 * c.countSuit('gods') },
    { id: 'oracle_delphi', n: 50, name: 'Oracle at Delphi', suit: 'locations', base: 7, tags: ['divine'], canAfterlife: true,
      text: 'May be discarded to Afterlife. If so, look at the top 5 cards of the deck, put any number on the bottom and the rest back on top in order.' },
    { id: 'palace', n: 51, name: 'Palace', suit: 'locations', base: 7, tags: [],
      text: '+7 with a MONARCH, +7 for each ARTISTIC.',
      bonus: (c) => (c.countTag('monarch') ? 7 : 0) + 7 * c.countTag('artistic') },
    { id: 'persephones_garden', n: 52, name: 'Persephone’s Garden', suit: 'locations', base: 4, tags: ['divine', 'plant'], canAfterlife: true,
      text: '+4 for each PLANT ITEM. May be discarded to Afterlife.',
      bonus: (c) => 4 * c.count((i) => i.card.suit === 'items' && c.hasTag(i, 'plant')) },
    { id: 'river_lethe', n: 53, name: 'River Lethe', suit: 'locations', base: 6, tags: ['aquatic', 'divine'], canAfterlife: true,
      text: 'May be discarded to Afterlife. PENALTY: −20 unless in Afterlife. At game end, ignore bonuses and tags of HEROES in Afterlife.',
      forgetsDeadHeroes: true,
      penalty: (c) => (c.self.zone === 'afterlife' ? 0 : -20) },
    { id: 'river_styx', n: 54, name: 'River Styx', suit: 'locations', base: 0, tags: ['aquatic', 'divine', 'magic'], canAfterlife: true,
      text: '+5 with a GOD and a Living HERO. May be discarded to Afterlife. PENALTY: −20 unless in Afterlife.',
      bonus: (c) => (c.hasSuit('gods') && c.living().length ? 5 : 0),
      penalty: (c) => (c.self.zone === 'afterlife' ? 0 : -20) },
    { id: 'sacrificial_altar', n: 55, name: 'Sacrificial Altar', suit: 'locations', base: 0, tags: ['divine'], canAfterlife: true,
      text: '+7 for each HERO in Afterlife. May be discarded to Afterlife. If so, you may discard a HERO from your hand to the Afterlife, then draw the top card of the deck.',
      bonus: (c) => 7 * c.deadHeroes() },
    { id: 'temple', n: 56, name: 'Temple', suit: 'locations', base: 6, tags: ['divine'],
      text: '+6 with a GOD, +6 for each ARTISTIC.',
      bonus: (c) => (c.hasSuit('gods') ? 6 : 0) + 6 * c.countTag('artistic') },
    { id: 'labyrinth', n: 57, name: 'The Labyrinth', suit: 'locations', base: 3, tags: [],
      text: '+10 with a HOSTILE MONSTER, +10 with a CLEVER Living HERO.',
      bonus: (c) => (c.hostileMonsters() ? 10 : 0) + (c.living().some((h) => c.hasTag(h, 'clever')) ? 10 : 0) },

    // ───────────── Monsters ─────────────
    { id: 'antaeus', n: 58, name: 'Antaeus', suit: 'monsters', base: 18, tags: ['hostile'],
      text: 'PENALTY: ENDGAME: all HEROES go to Afterlife unless a Living HERO is STRONG.',
      endgame: allHeroesUnless(livingHeroIs('strong')) },
    { id: 'calydonian_boar', n: 59, name: 'Calydonian Boar', suit: 'monsters', base: 24, tags: ['hostile'],
      text: 'PENALTY: ENDGAME: all HEROES go to Afterlife unless there are three or more Living HEROES.',
      endgame: allHeroesUnless((c) => c.livingAtEndgame.length >= 3) },
    { id: 'cerberus', n: 60, name: 'Cerberus', suit: 'monsters', base: 5, tags: ['hostile'], canAfterlife: true,
      text: '+5 for each HERO in Afterlife. May be discarded to Afterlife. PENALTY: −5 unless in Afterlife.',
      bonus: (c) => 5 * c.deadHeroes(),
      penalty: (c) => (c.self.zone === 'afterlife' ? 0 : -5) },
    { id: 'chiron', n: 61, name: 'Chiron', suit: 'monsters', base: 6, tags: ['wise', 'friendly'],
      text: 'ADD any one tag to a Living HERO.',
      choices: [{ key: 'hero', kind: 'livingHero', optional: true }, { key: 'tag', kind: 'anyTag' }],
      addTags: (c) => c.addTag(c.choice('hero'), c.choice('tag')) },
    { id: 'dryads', n: 62, name: 'Dryads', suit: 'monsters', base: 14, tags: ['friendly', 'plant', 'wise'], text: '' },
    { id: 'hydra', n: 63, name: 'Lernaean Hydra', suit: 'monsters', base: 17, tags: ['hostile'],
      text: 'PENALTY: ENDGAME: all HEROES go to Afterlife unless a Living HERO has three different tags.',
      endgame: allHeroesUnless((c) => c.livingAtEndgame.some((h) => c.tagsOf(h).size >= 3)) },
    { id: 'medusa', n: 64, name: 'Medusa', suit: 'monsters', base: 15, tags: ['hostile'],
      text: 'PENALTY: ENDGAME: all HEROES go to Afterlife unless a Living HERO is CLEVER or NIMBLE.',
      endgame: allHeroesUnless(livingHeroIs('clever', 'nimble')) },
    { id: 'minotaur', n: 65, name: 'Minotaur', suit: 'monsters', base: 15, tags: ['hostile'],
      text: 'PENALTY: ENDGAME: all HEROES go to Afterlife unless a Living HERO is CLEVER or STRONG.',
      endgame: allHeroesUnless(livingHeroIs('clever', 'strong')) },
    { id: 'pegasus', n: 66, name: 'Pegasus', suit: 'monsters', base: 20, tags: ['friendly'],
      text: 'ADD ARTISTIC and NIMBLE to one Living HERO. PENALTY: −10 unless with WISE.',
      choices: [{ key: 'hero', kind: 'livingHero', optional: true }],
      addTags: (c) => { c.addTag(c.choice('hero'), 'artistic'); c.addTag(c.choice('hero'), 'nimble'); },
      penalty: (c) => (c.countTag('wise') ? 0 : -10) },
    { id: 'scylla_charybdis', n: 67, name: 'Scylla and Charybdis', suit: 'monsters', base: 17, tags: ['hostile', 'aquatic'],
      text: 'PENALTY: ENDGAME: all HEROES go to Afterlife unless a Living HERO is NIMBLE.',
      endgame: allHeroesUnless(livingHeroIs('nimble')) },
    { id: 'sirens', n: 68, name: 'Sirens', suit: 'monsters', base: 16, tags: ['artistic', 'aquatic', 'hostile'],
      text: 'PENALTY: ENDGAME: all HEROES go to Afterlife unless a Living HERO is CLEVER.',
      endgame: allHeroesUnless(livingHeroIs('clever')) },

    // ───────────── Quests ─────────────
    { id: 'twelve_labors', n: 69, name: '12 Labors', suit: 'quests', base: 0, tags: [],
      text: '+12 for each STRONG and for each HOSTILE MONSTER. Requires a Living HERO.',
      bonus: (c) => (c.living().length ? 12 * (c.countTag('strong') + c.hostileMonsters()) : 0) },
    { id: 'apotheosis', n: 70, name: 'Apotheosis', suit: 'quests', base: 0, tags: [],
      text: '+28 with a HERO (Living or in Afterlife), a GOD, DIVINE, and MAGIC.',
      bonus: (c) => (c.hasSuit('heroes') && c.hasSuit('gods') && c.countTag('divine') && c.countTag('magic') ? 28 : 0) },
    { id: 'eleusinian_mysteries', n: 71, name: 'Eleusinian Mysteries', suit: 'quests', base: 0, tags: [],
      text: '+27 with a Living HERO, PLANT, ARTISTIC, and MAGIC.',
      bonus: (c) => (c.living().length && c.countTag('plant') && c.countTag('artistic') && c.countTag('magic') ? 27 : 0) },
    { id: 'epic_quest', n: 72, name: 'Epic Quest', suit: 'quests', base: 0, tags: [],
      text: '+30 with a Living HERO, a GOD, a LOCATION, a MONSTER, and an ITEM.',
      bonus: (c) => (c.living().length && ['gods', 'locations', 'monsters', 'items'].every(c.hasSuit) ? 30 : 0) },
    { id: 'glimpse_divine', n: 73, name: 'Glimpse of the Divine', suit: 'quests', base: 0, tags: [],
      text: '+8 for each GOD and each DIVINE. Requires a Living HERO.',
      bonus: (c) => (c.living().length ? 8 * (c.countSuit('gods') + c.countTag('divine')) : 0) },
    { id: 'long_journey', n: 74, name: 'Long Journey', suit: 'quests', base: 0, tags: [],
      text: '+11 for each LOCATION. Requires a Living HERO.',
      bonus: (c) => (c.living().length ? 11 * c.countSuit('locations') : 0) },
    { id: 'lost_knowledge', n: 75, name: 'Lost Knowledge', suit: 'quests', base: 0, tags: [],
      text: '+7 for each ARTISTIC, MAGIC, and WISE. Requires a Living HERO.',
      bonus: (c) => (c.living().length ? 7 * (c.countTag('artistic') + c.countTag('magic') + c.countTag('wise')) : 0) },
    { id: 'olympic_games', n: 76, name: 'Olympic Games', suit: 'quests', base: 0, tags: [],
      text: '+11 for each Living HERO that is STRONG and/or NIMBLE.',
      bonus: (c) => 11 * c.living().filter((h) => c.hasTag(h, 'strong') || c.hasTag(h, 'nimble')).length },
    { id: 'rebellious_kingdom', n: 77, name: 'Rebellious Kingdom', suit: 'quests', base: 0, tags: [],
      text: '+27 with both a Living MONARCH HERO and WISE.',
      bonus: (c) => (c.living().some((h) => c.hasTag(h, 'monarch')) && c.countTag('wise') ? 27 : 0) },
    { id: 'trojan_war', n: 78, name: 'Trojan War', suit: 'quests', base: 0, tags: [],
      text: '+13 for each WARRIOR. Requires a Living HERO.',
      bonus: (c) => (c.living().length ? 13 * c.countTag('warrior') : 0) },
    { id: 'visit_underworld', n: 79, name: 'Visit to the Underworld', suit: 'quests', base: 0, tags: [],
      text: '+6 for each card in Afterlife. Requires a Living HERO.',
      bonus: (c) => (c.living().length ? 6 * c.afterlifeCount() : 0) },
  ];

  const hasPenalty = (card) => Boolean(card.penalty || card.forcedClear || card.endgame);

  const api = { SUITS, TAGS, ATHENA_TAGS, CARDS, hasPenalty };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GLCards = api;
})(this);
