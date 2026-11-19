const test = require('node:test');
const assert = require('node:assert/strict');
const { CARDS } = require('../js/cards.js');
const { score, scoreBest } = require('../js/engine.js');

const card = (r, id) => r.cards.find((c) => c.id === id);

test('deck has 79 cards plus the Dionysus promo, with unique ids', () => {
  assert.equal(CARDS.filter((c) => !c.promo).length, 79);
  assert.equal(new Set(CARDS.map((c) => c.id)).size, CARDS.length);
});

test('plain base values add up', () => {
  const r = score(['agamemnon', 'atalanta', 'tiresias'], []);
  assert.equal(r.total, 9 + 12 + 11);
});

test('Hades: 3 + 3 per other Afterlife card, −10 per Afterlife card', () => {
  const r = score(['hades'], ['fates', 'cornucopia', 'oracle_delphi', 'cerberus', 'river_lethe', 'river_styx']);
  assert.equal(card(r, 'hades').total, 3 + 3 * 6); // 21, as in the GeekDad example
  assert.equal(r.afterlifeScore, -60);
});

test('Apollo counts other ARTISTIC cards, not itself', () => {
  const r = score(['apollo', 'muses', 'homer'], []);
  assert.equal(card(r, 'apollo').bonus, 10);
  assert.equal(card(r, 'muses').bonus, 16);
});

test('Medusa sends all heroes to the Afterlife without a CLEVER or NIMBLE hero', () => {
  const r = score(['medusa', 'agamemnon', 'tiresias'], []);
  assert.equal(card(r, 'agamemnon').zone, 'afterlife');
  assert.equal(card(r, 'tiresias').zone, 'afterlife');
  assert.equal(r.total, 15 + 9 + 11 - 20);
});

test('Medusa is stopped by a NIMBLE hero', () => {
  const r = score(['medusa', 'agamemnon', 'atalanta'], []);
  assert.equal(r.afterlifeCount, 0);
});

test('Helm of Darkness keeps one hero alive', () => {
  const r = score(['medusa', 'agamemnon', 'tiresias', 'helm_darkness'], [], { helm_darkness: { hero: 'agamemnon' } });
  assert.equal(card(r, 'agamemnon').zone, 'hand');
  assert.equal(card(r, 'tiresias').zone, 'afterlife');
});

test('Moly can clear a monster penalty', () => {
  const r = score(['medusa', 'agamemnon', 'moly'], [], { moly: { target: 'medusa' } });
  assert.equal(r.afterlifeCount, 0);
});

test('optimiser picks the best Moly target automatically', () => {
  const r = scoreBest(['river_styx', 'moly', 'atalanta'], []);
  assert.equal(r.resolved.moly.target, 'river_styx');
  assert.equal(card(r, 'river_styx').penalty, 0);
});

test('Winged Sandals adds NIMBLE, which saves heroes from Scylla and Charybdis', () => {
  const r = scoreBest(['scylla_charybdis', 'winged_sandals', 'tiresias'], []);
  assert.equal(r.resolved.winged_sandals.hero, 'tiresias');
  assert.equal(card(r, 'tiresias').zone, 'hand');
  assert.ok(card(r, 'tiresias').tags.includes('nimble'));
});

test('Circe clears other living heroes unless one is CLEVER; cleared cards keep base value', () => {
  let r = score(['circe', 'helen', 'agamemnon'], []);
  assert.equal(card(r, 'helen').bonus, 0);
  assert.equal(card(r, 'helen').total, 2);
  assert.equal(card(r, 'agamemnon').tags.length, 0);
  r = score(['circe', 'helen', 'agamemnon', 'medea'], []);
  assert.equal(card(r, 'helen').bonus, 10);
});

test('Herakles moves another hero; Hydra condition reads tags after ADD step', () => {
  const r = score(['herakles', 'atalanta'], [], { herakles: { hero: 'atalanta' } });
  assert.equal(card(r, 'atalanta').zone, 'afterlife');
  const h = scoreBest(['hydra', 'odysseus'], []);
  assert.equal(card(h, 'odysseus').zone, 'hand'); // 3 tags already
});

test('River Lethe ignores bonuses and tags of heroes in the Afterlife', () => {
  const r = score(['river_lethe', 'apollo'], ['homer']);
  assert.equal(card(r, 'apollo').bonus, 0);
  assert.equal(card(r, 'homer').bonus, 0);
});

test('Quests requiring a Living HERO score nothing without one', () => {
  assert.equal(card(score(['long_journey', 'temple'], []), 'long_journey').bonus, 0);
  assert.equal(card(score(['long_journey', 'temple', 'atalanta'], []), 'long_journey').bonus, 11);
});

test('Argo counts itself as AQUATIC', () => {
  const r = score(['argo', 'poseidon', 'atalanta', 'agamemnon'], []);
  assert.equal(card(r, 'argo').bonus, 5 * 2 * 2);
});

test('Dionysus clears a hero and adds its base value', () => {
  const r = scoreBest(['dionysus', 'atalanta'], []);
  assert.equal(card(r, 'dionysus').bonus, 12);
  assert.equal(card(r, 'atalanta').total, 12);
});
