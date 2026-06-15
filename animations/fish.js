const CHAR_MAP = {
  '>': { h: 225, m: 135 },
  '<': { h: 315, m: 45 },
  '-': { h: 0, m: 180 },
  '=': { h: 0, m: 180 },
  '{': { h: 225, m: 135 },
  '}': { h: 315, m: 45 },
  '0': { h: 270, m: 90 },
  'O': { h: 270, m: 90 },
  '@': { h: 225, m: 315 },
  'o': { h: 270, m: 270 },
  '^': { h: 225, m: 315 },
  'v': { h: 135, m: 45 },
  '/': { h: 135, m: 315 },
  '\\': { h: 225, m: 45 }
};

const CRAB_WALK_A = [">@==@<", "/ \\/ \\"];
const CRAB_WALK_B = [">@==@<", "\\ /\\ /"];
const CRAB_DANCE_A = ["v@==@v", "\\    /"];
const CRAB_DANCE_B = ["^@==@^", "/    \\"];

let bubbles = [];
let lastFishT = 0;

const fishGrid = Array(28).fill(0).map(() => Array(8).fill(null));
const fishCellPool = Array.from({ length: 256 }, () => ({ color: '', char: '' }));
let fishCellPoolIndex = 0;

const takeFishCell = (color, char) => {
  const cell = fishCellPool[fishCellPoolIndex++];
  cell.color = color;
  cell.char = char;
  return cell;
};

let crabEncounter = {
  active: false,
  state: 'idle',
  danceTimer: 0,
  crabs: []
};

const updateFishes = (t) => {
  let dt = t - lastFishT;
  if (dt > 0.1) dt = 0.1;
  lastFishT = t;
  fishCellPoolIndex = 0;

  for (let x = 0; x < 28; x++) {
    for (let y = 0; y < 8; y++) {
      fishGrid[x][y] = null;
    }
  }

  if (!crabEncounter.active && Math.random() < 0.005) {
    crabEncounter.active = true;
    crabEncounter.state = 'walking_in';
    crabEncounter.crabs = [
      { x: -6, y: 6, vx: 1.5, color: '#FF4444', isLeft: true, danceOffset: 0 },
      { x: 28, y: 6, vx: -1.5, color: '#FF2222', isLeft: false, danceOffset: Math.PI }
    ];
  }

  if (Math.random() < 0.05) {
    bubbles.push({
      x: Math.floor(Math.random() * 28),
      y: 8,
      vy: -(1 + Math.random() * 1.5)
    });
  }

  if (crabEncounter.active) {
    let allInPosition = true;
    const walkSprite = Math.floor(t * 3) % 2 === 0 ? CRAB_WALK_A : CRAB_WALK_B;

    for (let c of crabEncounter.crabs) {
      if (crabEncounter.state === 'walking_in') {
        c.x += c.vx * dt;
        c.sprite = walkSprite;
        const targetX = c.isLeft ? 7 : 15;
        if ((c.isLeft && c.x >= targetX) || (!c.isLeft && c.x <= targetX)) {
          c.x = targetX;
        } else {
          allInPosition = false;
        }
      } else if (crabEncounter.state === 'dancing') {
        c.y = 6 - Math.abs(Math.sin(t * 4 + c.danceOffset)) * 0.5;
        c.sprite = Math.floor(t * 4 + c.danceOffset) % 2 === 0 ? CRAB_DANCE_A : CRAB_DANCE_B;
      } else if (crabEncounter.state === 'walking_out') {
        c.y = 6;
        c.x += c.vx * dt;
        c.sprite = walkSprite;
      }
    }

    if (crabEncounter.state === 'walking_in' && allInPosition) {
      crabEncounter.state = 'dancing';
      crabEncounter.danceTimer = 10 + Math.random() * 20;
    } else if (crabEncounter.state === 'dancing') {
      crabEncounter.danceTimer -= dt;
      if (crabEncounter.danceTimer <= 0) {
        crabEncounter.state = 'walking_out';
      }
    } else if (crabEncounter.state === 'walking_out') {
      if (crabEncounter.crabs[0].x > 30 && crabEncounter.crabs[1].x < -10) {
        crabEncounter.active = false;
        crabEncounter.crabs = [];
      }
    }

    for (let c of crabEncounter.crabs) {
      const ix = Math.floor(c.x);
      const iy = Math.floor(c.y);
      for (let r = 0; r < c.sprite.length; r++) {
        for (let col = 0; col < c.sprite[r].length; col++) {
          const char = c.sprite[r][col];
          if (char !== ' ') {
            const gx = ix + col;
            const gy = iy + r;
            if (gx >= 0 && gx < 28 && gy >= 0 && gy < 8) {
              fishGrid[gx][gy] = takeFishCell(c.color, char);
            }
          }
        }
      }
    }
  }

  for (let i = bubbles.length - 1; i >= 0; i--) {
    const b = bubbles[i];
    b.y += b.vy * dt;
    const bx = Math.floor(b.x + Math.sin(t * 2 + b.y) * 0.5);
    const by = Math.floor(b.y);

    if (by < -1) {
      bubbles.splice(i, 1);
      continue;
    }

    if (bx >= 0 && bx < 28 && by >= 0 && by < 8 && !fishGrid[bx][by]) {
      fishGrid[bx][by] = takeFishCell('#88CCFF', 'o');
    }
  }
};

const fishIdle = (data, frameData) => {
  if (frameData.t !== lastFishT) {
    updateFishes(frameData.t);
  }

  const cell = fishGrid[data.x]?.[data.y];

  if (data.fishH === undefined) {
    data.fishH = 225;
    data.fishM = 225;
  }

  let targetH, targetM;

  if (cell && CHAR_MAP[cell.char]) {
    targetH = CHAR_MAP[cell.char].h;
    targetM = CHAR_MAP[cell.char].m;
    data.out.color = cell.color;
    data.out.colorH = data.out.colorS = data.out.colorL = null;
  } else {
    const wave = Math.sin(data.x * 0.3 + frameData.t * 1.5) + Math.cos(data.y * 0.4 + frameData.t * 1.2);
    targetH = 45 + wave * 25;
    targetM = 225 - wave * 25;
    data.out.colorH = 215;
    data.out.colorS = 80;
    data.out.colorL = 6 + Math.floor((wave + 2) * 3);
    data.out.color = null;
  }

  const easing = 0.4;
  let diffH = targetH - data.fishH;
  let diffM = targetM - data.fishM;
  diffH = ((diffH + 540) % 360) - 180;
  diffM = ((diffM + 540) % 360) - 180;

  data.fishH += diffH * easing;
  data.fishM += diffM * easing;
  data.fishH = (data.fishH + 360) % 360;
  data.fishM = (data.fishM + 360) % 360;

  data.out.h = data.fishH;
  data.out.m = data.fishM;
  data.out.ringWeight = 1;
};
