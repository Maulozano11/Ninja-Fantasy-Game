// The owner's Scarlet's head, his colours (tools/refs/scarlet-head-from-ref.py from
// docs/reference/scarlet-owner-reference.jpg, brought down to our scale). Generated: rerun the script to change it.

import type { PaintedPiece } from './painted';

/** The skin colour he drew the head in: a player's skin moves every colour of it as far. */
export const NOBLE_SKIN = '#f8d4b8';

/** The owner's Scarlet's head (the 'noble' face shape), his colours: his face, its warm shading, his smile, his jaw line and pointed chin, his far temple; his skull and near cheek (under his hair) in our tapered head's outline. The eye shape draws the eyes on it. Its pivot is the cell on the face anchor. */
export const NOBLE_HEAD: PaintedPiece = {
  pivot: [7, 12],
  angle: 0.00,
  rows: [
    '.....aaaaaaaa.....',
    '...aabbbbbbbbaa...',
    '..abbbbbbbbbbbba..',
    '.acbbbbbbbbbbbbca.',
    '.acbbbbbbbbbbbbca.',
    'acbbbbbbbbbbbbbbca',
    'acbbbbbbbbbbbbbbca',
    'acbbbbbbbbbbbbbbca',
    'acbbbbbbbbbbbbbbca',
    'acbbbbbbbbbbbbbbca',
    'accbbbbbbbbbbbbbda',
    '.aaaabbbbbbefbbdca',
    '..abhabbbbbbecciba',
    '..aihacajbbbjcbbba',
    '..abjacejbbbjbbbba',
    '..aabhcebbbbbbbbba',
    '....aacebbbbbbcdfa',
    '.....ahibbbbbbbbca',
    '....adadibbbdddba.',
    '....adhahibbbffja.',
    '....ahihdaibbbia..',
    '.....acbdhaaaaaa..',
  ],
  colors: {
    a: '#040405',
    b: '#f8d4b8',
    c: '#ca9c75',
    d: '#b27758',
    e: '#eabb9d',
    f: '#f2c8aa',
    h: '#9e654b',
    i: '#e2af8c',
    j: '#be8867',
  },
};
