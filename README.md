# Fantasy Realms: Greek Legends — Scoring

An unofficial, fan-made score calculator for **Fantasy Realms: Greek Legends** (WizKids).
Modelled on the [Fantasy Realms scoring app](https://fantasy-realms.github.io/) for the original game.

Live version: https://claude.ai/artifact/HYYxSV3oZzLehaAyS51RVT

Pick the cards in your hand and in your Afterlife. The app scores every bonus, penalty, CLEAR, ADD and
ENDGAME effect, including Heroes sent to the Afterlife by Monsters. Targets such as Moly, Athena, Chiron,
Herakles or the Helm of Darkness default to **Auto**, which picks the option that gives the best score.
You can also set them yourself.

It is plain HTML/CSS/JS with no build step and no dependencies.

## Run locally

```sh
npm start          # or: python3 -m http.server 8000
# open http://localhost:8000
npm test           # engine unit tests (Node 18+)
```

## Publish on GitHub Pages

Settings → Pages → *Deploy from a branch* → pick the branch and `/ (root)`.

## Files

| File | Purpose |
| --- | --- |
| `js/cards.js` | The 79 cards plus the Dionysus promo: suit, base value, tags, rule text, scoring functions |
| `js/engine.js` | Scoring engine (end-of-game order, Afterlife, best-choice optimiser) |
| `js/app.js` | User interface (state is kept in `localStorage`; **Share** copies a link to the hand) |
| `test/engine.test.js` | Unit tests for the engine |

## Scoring order used

1. Bonuses that CLEAR (optional): Moly, Charmed Bridle
2. Penalties that CLEAR (mandatory): Circe, Lotus Field, Dionysus
3. Bonuses that ADD tags: Athena, Chiron, Pegasus, Winged Sandals
4. ENDGAME effects: Monsters, Herakles, Pomegranate (Helm of Darkness can save one Hero)
5. Every card scores (hand and Afterlife), then −10 for each card in the Afterlife

Interpretations:
- A *Living* Hero is a Hero in your hand.
- Afterlife cards keep their value, tags, bonus and penalty.
- A CLEARED card keeps its suit and base value.
- Effects in the same step are simultaneous.

If a card's printed text differs from `js/cards.js`, please open an issue.

Fantasy Realms is a trademark of WizKids. This project is not affiliated with WizKids.
