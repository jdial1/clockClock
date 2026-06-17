const H =  { h: 0,   m: 180 },
      V =  { h: 270, m: 90 },
      TL = { h: 180, m: 270 },
      TR = { h: 0,   m: 270 },
      BL = { h: 180, m: 90 },
      BR = { h: 0,   m: 90 },
      NW = { h: 45,  m: 135 },
      NE = { h: 315, m: 225 },
      SE = { h: 225, m: 315 },
      SL = { h: 315, m: 135 },
      E =  { isIdle: true };

const digits = [
  [BR, H, H, BL, V, BR, BL, V, V, V, V, V, V, V, V, V, V, TR, TL, V, TR, H, H, TL],
  [BR, H, BL, E, TR, BL, V, E, E, V, V, E, E, V, V, E, BR, TL, TR, BL, TR, H, H, TL],
  [BR, H, H, BL, TR, H, BL, V, BR, H, TL, V, V, BR, H, TL, V, TR, H, BL, TR, H, H, TL],
  [BR, H, H, BL, TR, H, BL, V, E, BR, TL, V, E, TR, BL, V, BR, H, TL, V, TR, H, H, TL],
  [BR, BL, BR, BL, V, V, V, V, V, TR, TL, V, TR, H, BL, V, E, E, V, V, E, E, TR, TL],
  [BR, H, H, BL, V, BR, H, TL, V, TR, H, BL, TR, H, BL, V, BR, H, TL, V, TR, H, H, TL],
  [BR, H, H, BL, V, BR, H, TL, V, TR, H, BL, V, BR, BL, V, V, TR, TL, V, TR, H, H, TL],
  [BR, H, H, BL, TR, H, BL, V, E, E, V, V, E, E, V, V, E, E, V, V, E, E, TR, TL],
  [BR, H, H, BL, V, BR, BL, V, V, TR, TL, V, V, BR, BL, V, V, TR, TL, V, TR, H, H, TL],
  [BR, H, H, BL, V, BR, BL, V, V, TR, TL, V, TR, H, BL, V, BR, H, TL, V, TR, H, H, TL],
  [E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E],
  [BR, BL, E, E, TR, TL, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E],
  [BR, H, H, BL, V, BR, H, TL, V, TR, H, BL, V, E, E, E, V, E, E, E, TR, TL, E, E],
  [BR, H, H, BL, V, BR, H, TL, V, E, E, E, V, E, E, E, V, TR, H, BL, TR, H, H, TL],
  [BR, BL, E, SL, TR, TL, SL, E, E, E, SL, E, E, SL, E, E, E, SL, BR, BL, SL, E, TR, TL],
  [E, E, E, E, E, E, E, E, E, H, H, E, E, E, E, E, E, E, E, E, E, E, E, E]
];

const COLON_DOTS = new Set([1, 2, 3, 4]);
const BG = {
  deep: '#140f0c',
  face: '#181210',
  faceHi: '#1e1814',
  cap: '#120e0b',
  capStroke: '#2a221c',
  rim: '#3a2c24',
  tick: '#2a2018'
};
const GRID_COLS = 28;
const GRID_ROWS = 8;
const RING_LENGTH = 15000;
const TIME_LENGTH = 5000;
const CYCLE = RING_LENGTH + TIME_LENGTH;
const IDLE_FADE = 500;
const HAND_TURNS = 4;
const HAND_MIN = -360 * HAND_TURNS;
const HAND_MAX = 360 * HAND_TURNS;
const HAND_SPAN = HAND_MAX - HAND_MIN;

const REGIONS = [
  { x0: 0, x1: 3, digit: 0 },
  { x0: 4, x1: 7, digit: 1 },
  { x0: 8, x1: 8, colon: true },
  { x0: 9, x1: 12, digit: 2 },
  { x0: 13, x1: 16, digit: 3 },
  { x0: 17, x1: 17, colon: true },
  { x0: 18, x1: 21, digit: 4 },
  { x0: 22, x1: 25, digit: 5 }
];
