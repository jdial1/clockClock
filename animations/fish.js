const CHAR_MAP = {
  '>': { h: 225, m: 135 }, '<': { h: 315, m: 45 }, '-': { h: 0, m: 180 },
  '=': { h: 0, m: 180 }, '{': { h: 225, m: 135 }, '}': { h: 315, m: 45 },
  '0': { h: 270, m: 90 }, 'O': { h: 270, m: 90 }, '@': { h: 225, m: 315 },
  'o': { h: 270, m: 270 }, '^': { h: 225, m: 315 }, 'v': { h: 135, m: 45 },
  '/': { h: 135, m: 315 }, '\\': { h: 225, m: 45 }
};

const CRAB_WALK_A = [">@==@<", "/ \\/ \\"];
const CRAB_WALK_B = [">@==@<", "\\ /\\ /"];
const CRAB_DANCE_A = ["v@==@v", "\\    /"];
const CRAB_DANCE_B = ["^@==@^", "/    \\"];
const BUBBLE_COLOR = { colorH: 200, colorS: 100, colorL: 80 };

const fishTicker = createTicker(0.1);
const fishGrid = new Array(GRID_COLS * GRID_ROWS).fill(null);
const fishCellPool = Array.from({ length: 256 }, () => ({ colorH: 0, colorS: 0, colorL: 0, char: '' }));
let fishCellPoolIndex = 0;

const takeFishCell = (colorH, colorS, colorL, char) => {
  const cell = fishCellPool[fishCellPoolIndex++ % fishCellPool.length];
  cell.colorH = colorH; cell.colorS = colorS; cell.colorL = colorL; cell.char = char;
  return cell;
};

class CrabDirector {
  constructor() {
    this.active = false;
    this.state = 'idle';
    this.timer = 0;
    this.crabs = [];
  }
  
  tick(t, dt) {
    if (!this.active) {
      if (Math.random() < 0.005) {
        this.active = true;
        this.state = 'walking_in';
        this.crabs = [
          { x: -6, y: 6, vx: 1.5, colorH: 0, colorS: 100, colorL: 63, isLeft: true, danceOffset: 0 },
          { x: 28, y: 6, vx: -1.5, colorH: 0, colorS: 100, colorL: 56, isLeft: false, danceOffset: Math.PI }
        ];
      }
      return;
    }

    let allInPosition = true;
    const walkSprite = Math.floor(t * 3) % 2 === 0 ? CRAB_WALK_A : CRAB_WALK_B;

    for (const c of this.crabs) {
      if (this.state === 'walking_in') {
        c.x += c.vx * dt;
        c.sprite = walkSprite;
        const targetX = c.isLeft ? 7 : 15;
        if ((c.isLeft && c.x >= targetX) || (!c.isLeft && c.x <= targetX)) c.x = targetX;
        else allInPosition = false;
      } else if (this.state === 'dancing') {
        c.y = 6 - Math.abs(Math.sin(t * 4 + c.danceOffset)) * 0.5;
        c.sprite = Math.floor(t * 4 + c.danceOffset) % 2 === 0 ? CRAB_DANCE_A : CRAB_DANCE_B;
      } else if (this.state === 'walking_out') {
        c.y = 6;
        c.x += c.vx * dt;
        c.sprite = walkSprite;
      }
    }

    if (this.state === 'walking_in' && allInPosition) {
      this.state = 'dancing';
      this.timer = 10 + Math.random() * 20;
    } else if (this.state === 'dancing') {
      this.timer -= dt;
      if (this.timer <= 0) this.state = 'walking_out';
    } else if (this.state === 'walking_out' && this.crabs[0].x > 30 && this.crabs[1].x < -10) {
      this.active = false;
      this.crabs = [];
    }

    for (const c of this.crabs) {
      const ix = Math.floor(c.x);
      const iy = Math.floor(c.y);
      for (let r = 0; r < c.sprite.length; r++) {
        for (let col = 0; col < c.sprite[r].length; col++) {
          const char = c.sprite[r][col];
          if (char === ' ') continue;
          const gx = ix + col;
          const gy = iy + r;
          if (gx >= 0 && gx < GRID_COLS && gy >= 0 && gy < GRID_ROWS) {
            fishGrid[flagIdx(gx, gy)] = takeFishCell(c.colorH, c.colorS, c.colorL, char);
          }
        }
      }
    }
  }
}

const crabDirector = new CrabDirector();

const bubbleEngine = createParticleEngine(
  { x: 0, y: 0, vy: 0 },
  (b, dt, t) => {
    b.y += b.vy * dt;
    const bx = Math.floor(b.x + Math.sin(t * 2 + b.y) * 0.5);
    const by = Math.floor(b.y);
    if (bx >= 0 && bx < GRID_COLS && by >= 0 && by < GRID_ROWS && !fishGrid[flagIdx(bx, by)]) {
      const fi = flagIdx(bx, by);
      gridFlags[fi] = CELL_BUBBLE;
      globalGridBuffer[cellIdx(bx, by) + 1] = b.vy;
      globalGridBuffer[cellIdx(bx, by) + 2] = 1;
    }
    return by >= -1;
  },
  0.05,
  () => ({ x: Math.floor(Math.random() * GRID_COLS), y: 8, vy: -(1 + Math.random() * 1.5) })
);

const updateFishes = (t) => {
  fishTicker.tick(t, (dt) => {
    fishCellPoolIndex = 0;
    clearGridLife();
    fishGrid.fill(null);
    crabDirector.tick(t, dt);
    bubbleEngine.tick(dt, t);
  });
};

const fishIdle = (data, frameData) => {
  let cell = fishGrid[flagIdx(data.x, data.y)];
  if (!cell && gridFlags[flagIdx(data.x, data.y)] === CELL_BUBBLE) {
    cell = { colorH: BUBBLE_COLOR.colorH, colorS: BUBBLE_COLOR.colorS, colorL: BUBBLE_COLOR.colorL, char: 'o' };
  }

  if (data.fishH === undefined) {
    data.fishH = 225;
    data.fishM = 225;
  }

  let targetH, targetM, hsl;
  if (cell && CHAR_MAP[cell.char]) {
    targetH = CHAR_MAP[cell.char].h;
    targetM = CHAR_MAP[cell.char].m;
    hsl = [cell.colorH, cell.colorS, cell.colorL];
  } else {
    const wave = Math.sin(data.x * 0.3 + frameData.t * 1.5) + Math.cos(data.y * 0.4 + frameData.t * 1.2);
    targetH = 45 + wave * 25;
    targetM = 225 - wave * 25;
    hsl = [215, 80, 6 + Math.floor((wave + 2) * 3)];
  }

  easeAnglePair(data, 'fishH', 'fishM', targetH, targetM, 0.4);
  setOut(data, data.fishH, data.fishM, hsl);
};

fishIdle.update = updateFishes;
