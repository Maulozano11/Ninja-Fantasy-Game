import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { rngFor } from '../rules/rng';
import { Card, deal, payout, pips, shoe, total } from './baccarat';

const c = (rank: number): Card => ({ rank, suit: 'spades' });

describe('baccarat', () => {
  it('counts pips as the table does', () => {
    assert.equal(total([c(7), c(8)]), 5);
    assert.deepEqual([pips(c(1)), pips(c(10)), pips(c(13))], [1, 0, 0]);
  });
  it('a natural ends the coup', () => {
    const h = deal([c(9), c(10), c(4), c(2)]); // player 9 (natural): nobody draws
    assert.equal(h.player.length + h.banker.length, 4);
    assert.deepEqual(h.log, ['player natural', 'player wins 9-6']);
  });
  it('the banker draws by the table', () => {
    // player 2+3=5 draws a 6 -> 1; banker 3+3=6 with the player's third 6 -> draws
    const h = deal([c(2), c(3), c(3), c(3), c(6), c(1)]);
    assert.deepEqual(h.log, ['player draws 6', 'banker draws 1', 'banker wins 1-7']);
    // banker 3 and the player's third an 8: stands
    const g = deal([c(2), c(3), c(1), c(2), c(8), c(9)]);
    assert.equal(g.log[1], 'banker stands');
  });
  it('pays as the owner wrote it: banker −5 %, tie 8:1, the bonus bets', () => {
    const h = deal([c(2), c(3), c(3), c(3), c(6), c(1)]); // banker 7 with three cards
    assert.equal(payout('banker', 10, h), 19);
    assert.equal(payout('player', 10, h), 0);
    assert.equal(payout('blazing7', 1, h), 41);
    const nine = deal([c(9), c(10), c(4), c(2)]); // player natural 9
    assert.equal(payout('heavenly9', 2, nine), 18);
    assert.equal(payout('tie', 1, nine), 0);
  });
  it('the shoe is deterministic from the seed and holds 8 decks', () => {
    const a = shoe(rngFor(7, 'casino', 1)), b = shoe(rngFor(7, 'casino', 1));
    assert.equal(a.length, 416);
    assert.deepEqual(a.slice(0, 10), b.slice(0, 10));
    assert.notDeepEqual(a.slice(0, 10), shoe(rngFor(8, 'casino', 1)).slice(0, 10));
  });
  it('over a shoe the house edge is where it should be', () => {
    let player = 0, banker = 0, tie = 0, n = 0;
    for (let s = 0; s < 40; s++) {
      const cards = shoe(rngFor(s, 'casino', 'edge'));
      while (cards.length > 20) { const h = deal(cards); n++; if (h.winner === 'player') player++; else if (h.winner === 'banker') banker++; else tie++; }
    }
    assert.ok(banker / n > 0.44 && banker / n < 0.48, `banker ${banker / n}`);
    assert.ok(player / n > 0.42 && player / n < 0.47, `player ${player / n}`);
    assert.ok(tie / n > 0.07 && tie / n < 0.12, `tie ${tie / n}`);
  });
});
