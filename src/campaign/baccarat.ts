// Baccarat (punto banco) as the casino table plays it: docs/WORLD_DESIGN.md 5b, the owner's rule
// "el bacará se juega exactamente como el bacará". Pure, deterministic (a seeded shoe), no React.

import { Rng } from '../rules/rng';

export type Suit = 'hearts' | 'diamonds' | 'spades' | 'clubs';
export interface Card { rank: number; suit: Suit } // rank 1..13 (ace..king)
export type MainBet = 'player' | 'banker' | 'tie';
/** The owner's three bonus bets (2026-10-28): his names; the 8 is the one real casinos call Panda 8. */
export type BonusBet = 'blazing7' | 'panda8' | 'heavenly9';
export type Bet = MainBet | BonusBet;

/** Pips: faces and tens count 0, the ace 1. A hand is the last digit of its sum. */
export const pips = (c: Card): number => (c.rank >= 10 ? 0 : c.rank);
export const total = (cards: Card[]): number => cards.reduce((s, c) => s + pips(c), 0) % 10;

export function shoe(rng: Rng, decks = 8): Card[] {
  const cards: Card[] = [];
  for (let d = 0; d < decks; d++) for (const suit of ['hearts', 'diamonds', 'spades', 'clubs'] as Suit[]) for (let rank = 1; rank <= 13; rank++) cards.push({ rank, suit });
  for (let i = cards.length - 1; i > 0; i--) { // Fisher-Yates on the seeded rng
    const j = Math.floor(rng() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

export interface Hand {
  player: Card[];
  banker: Card[];
  /** 'player' | 'banker' | 'tie' */
  winner: MainBet;
  /** What happened, in order, for the narrator and the deal animation. */
  log: string[];
}

/**
 * One coup by the punto banco rules: two cards each; a natural 8 or 9 ends it; otherwise the player
 * draws on 0-5 and stands on 6-7, and the banker draws by the table (on its own total and the
 * player's third card).
 */
export function deal(cards: Card[]): Hand {
  const take = (): Card => { const c = cards.shift(); if (!c) throw new Error('the shoe is empty'); return c; };
  const player = [take(), take()];
  const banker = [take(), take()];
  const log: string[] = [];
  let p = total(player), b = total(banker);
  if (p >= 8 || b >= 8) {
    log.push(p >= 8 && b >= 8 ? 'both natural' : p >= 8 ? 'player natural' : 'banker natural');
  } else {
    let third: Card | undefined;
    if (p <= 5) { third = take(); player.push(third); p = total(player); log.push(`player draws ${pips(third)}`); } else log.push('player stands');
    const t = third ? pips(third) : -1;
    const bankerDraws = third === undefined ? b <= 5
      : b <= 2 ? true
      : b === 3 ? t !== 8
      : b === 4 ? t >= 2 && t <= 7
      : b === 5 ? t >= 4 && t <= 7
      : b === 6 ? t === 6 || t === 7
      : false;
    if (bankerDraws) { const c = take(); banker.push(c); b = total(banker); log.push(`banker draws ${pips(c)}`); } else log.push('banker stands');
  }
  const winner: MainBet = p > b ? 'player' : b > p ? 'banker' : 'tie';
  log.push(`${winner} wins ${p}-${b}`);
  return { player, banker, winner, log };
}

/** What a bet of `stake` chips returns (stake included), 0 when it loses; main bets are given back on a tie. */
export function payout(bet: Bet, stake: number, h: Hand): number {
  const p = total(h.player), b = total(h.banker);
  switch (bet) {
    case 'player': return h.winner === 'player' ? stake * 2 : h.winner === 'tie' ? stake : 0;
    case 'banker': return h.winner === 'banker' ? stake + Math.floor(stake * 0.95) : h.winner === 'tie' ? stake : 0; // 5 % commission, rounded down, never to zero
    case 'tie': return h.winner === 'tie' ? stake * 9 : 0;
    case 'blazing7': return h.winner === 'banker' && h.banker.length === 3 && b === 7 ? stake * 41 : 0; // the banker wins with a three-card 7
    case 'panda8': return h.winner === 'player' && h.player.length === 3 && p === 8 ? stake * 26 : 0; // the player wins with a three-card 8
    case 'heavenly9': return (p === 9 && h.player.length === 2) || (b === 9 && h.banker.length === 2) ? stake * 9 : 0; // a natural 9 on either side
  }
}

export const BET_PAYS: Record<Bet, string> = { player: '1:1', banker: '1:1 − 5 %', tie: '8:1', blazing7: '40:1', panda8: '25:1', heavenly9: '8:1' };
