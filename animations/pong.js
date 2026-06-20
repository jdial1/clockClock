const pongTicker = createTicker(0.1);

const PONG_DARK = [210, 45, 2];
const PONG_BALL_HSL = [52, 100, 88];
const PONG_TRAIL_HSL = [48, 95, 0];
const PONG_IMPACT_HSL = [38, 100, 0];
const PONG_PADDLE_HSL = [205, 88, 62];
const PONG_SCORE_HSL = [205, 35, 42];

const PADDLE_X_LEFT = 1;
const PADDLE_X_RIGHT = 26;
const PADDLE_HALF = 1.5;
const PLAY_Y_MIN = 1;
const PLAY_Y_MAX = 6;
const PADDLE_TRACK = 5.5;
const PADDLE_MAX_V = 7.5;

const pongGlow = new Float32Array(GRID_COLS * GRID_ROWS);
const pongDir = new Float32Array(GRID_COLS * GRID_ROWS);
const pongImpact = new Float32Array(GRID_COLS * GRID_ROWS);

const pongBall = { x: 14, y: 3.5, vx: 9, vy: 0, omega: 0, handSpin: 0 };
const pongLeftPaddle = { y: 3.5, vy: 0 };
const pongRightPaddle = { y: 3.5, vy: 0 };
let pongScoreLeft = 0;
let pongScoreRight = 0;
let pongLastCellX = -1;
let pongLastCellY = -1;

const PONG_SCORE_REGIONS = [
  { x0: 2, x1: 5, score: () => pongScoreLeft },
  { x0: 22, x1: 25, score: () => pongScoreRight }
];

const pongIdx = (x, y) => y * GRID_COLS + x;

const pongTravelAngle = () => Math.atan2(pongBall.vy, pongBall.vx) * (180 / Math.PI);

const pongBallCell = () => ({
  x: Math.max(0, Math.min(GRID_COLS - 1, Math.round(pongBall.x))),
  y: Math.max(0, Math.min(GRID_ROWS - 1, Math.round(pongBall.y)))
});

const pongClampPaddleY = (paddle) => {
  const minY = PLAY_Y_MIN + PADDLE_HALF - 0.5;
  const maxY = PLAY_Y_MAX - PADDLE_HALF + 0.5;
  paddle.y = Math.max(minY, Math.min(maxY, paddle.y));
};

const pongScoreClock = (x, y) => {
  if (y < PLAY_Y_MIN || y > PLAY_Y_MAX) return null;
  for (let i = 0; i < PONG_SCORE_REGIONS.length; i++) {
    const region = PONG_SCORE_REGIONS[i];
    if (x < region.x0 || x > region.x1) continue;
    return {
      digit: Math.min(9, region.score()),
      clockIdx: (y - PLAY_Y_MIN) * 4 + (x - region.x0)
    };
  }
  return null;
};

const pongPaddleSide = (x, y) => {
  if (x === PADDLE_X_LEFT && Math.abs(y - pongLeftPaddle.y) <= PADDLE_HALF) return 'left';
  if (x === PADDLE_X_RIGHT && Math.abs(y - pongRightPaddle.y) <= PADDLE_HALF) return 'right';
  return null;
};

const pongFlareImpact = (x, y, inwardX, inwardY, hitCoord) => {
  for (let d = -2; d <= 2; d++) {
    const falloff = 1 - Math.abs(d) * 0.22;
    if (x !== null) {
      const py = hitCoord + d;
      if (py >= PLAY_Y_MIN && py <= PLAY_Y_MAX) {
        pongImpact[pongIdx(x, py)] = Math.max(pongImpact[pongIdx(x, py)], falloff);
        const innerY = py + inwardY;
        if (innerY >= PLAY_Y_MIN && innerY <= PLAY_Y_MAX) {
          pongImpact[pongIdx(x, innerY)] = Math.max(pongImpact[pongIdx(x, innerY)], falloff * 0.65);
        }
      }
    }
    if (y !== null) {
      const px = hitCoord + d;
      if (px >= 0 && px < GRID_COLS) {
        pongImpact[pongIdx(px, y)] = Math.max(pongImpact[pongIdx(px, y)], falloff);
        const innerX = px + inwardX;
        if (innerX >= 0 && innerX < GRID_COLS) {
          pongImpact[pongIdx(innerX, y)] = Math.max(pongImpact[pongIdx(innerX, y)], falloff * 0.65);
        }
      }
    }
  }
};

const pongFlarePaddle = (paddleX, paddleY) => {
  const py = Math.round(paddleY);
  for (let d = -2; d <= 2; d++) {
    const y = py + d;
    if (y < PLAY_Y_MIN || y > PLAY_Y_MAX) continue;
    const falloff = 1 - Math.abs(d) * 0.25;
    const inward = paddleX === PADDLE_X_LEFT ? 1 : -1;
    pongImpact[pongIdx(paddleX, y)] = Math.max(pongImpact[pongIdx(paddleX, y)], falloff);
    pongImpact[pongIdx(paddleX + inward, y)] = Math.max(pongImpact[pongIdx(paddleX + inward, y)], falloff * 0.7);
  }
};

const pongLeaveTrail = (x, y) => {
  const idx = pongIdx(x, y);
  pongGlow[idx] = 1;
  pongDir[idx] = pongTravelAngle();
};

const pongServe = (toward) => {
  pongBall.x = 14;
  pongBall.y = 3.5;
  pongBall.vx = (toward === 'left' ? -1 : 1) * (8 + Math.random() * 2);
  pongBall.vy = (Math.random() - 0.5) * 5;
  pongBall.omega = (Math.random() - 0.5) * 5;
  pongBall.handSpin = 0;
  pongLastCellX = -1;
  pongLastCellY = -1;
};

const pongHitPaddle = (paddle, paddleX, dir) => {
  const hitOffset = (pongBall.y - paddle.y) / PADDLE_HALF;
  pongBall.vx = dir * Math.max(7, Math.abs(pongBall.vx) * 1.03);
  pongBall.vy += hitOffset * 4.5 + paddle.vy * 0.45 + pongBall.omega * 0.4;
  pongBall.omega += hitOffset * 7 - paddle.vy * 0.55;
  pongBall.x = paddleX + dir * 0.6;
  pongFlarePaddle(paddleX, paddle.y);
};

const pongTryPaddleHit = (paddle, paddleX, dir) => {
  if (Math.abs(pongBall.y - paddle.y) > PADDLE_HALF + 0.45) return false;
  if (dir > 0 && (pongBall.vx >= 0 || pongBall.x > paddleX + 0.65)) return false;
  if (dir < 0 && (pongBall.vx <= 0 || pongBall.x < paddleX - 0.65)) return false;
  pongHitPaddle(paddle, paddleX, dir);
  return true;
};

const pongUpdatePaddle = (paddle, dt) => {
  const target = pongBall.y + pongBall.omega * 0.08;
  const diff = target - paddle.y;
  paddle.vy = Math.max(-PADDLE_MAX_V, Math.min(PADDLE_MAX_V, diff * PADDLE_TRACK));
  paddle.y += paddle.vy * dt;
  pongClampPaddleY(paddle);
};

const resetPong = () => {
  pongGlow.fill(0);
  pongDir.fill(0);
  pongImpact.fill(0);
  pongScoreLeft = 0;
  pongScoreRight = 0;
  pongLeftPaddle.y = 3.5;
  pongLeftPaddle.vy = 0;
  pongRightPaddle.y = 3.5;
  pongRightPaddle.vy = 0;
  pongServe(Math.random() < 0.5 ? 'left' : 'right');
};

const updatePong = (t) => {
  pongTicker.tick(t, (dt) => {
    pongUpdatePaddle(pongLeftPaddle, dt);
    pongUpdatePaddle(pongRightPaddle, dt);

    pongBall.x += pongBall.vx * dt;
    pongBall.y += pongBall.vy * dt;
    pongBall.handSpin = (pongBall.handSpin + pongBall.omega * dt * 95) % 360;

    if (pongBall.y < PLAY_Y_MIN) {
      pongBall.y = PLAY_Y_MIN;
      pongBall.vy = Math.abs(pongBall.vy);
      pongBall.omega *= 0.85;
      pongFlareImpact(null, PLAY_Y_MIN, 0, 1, Math.round(pongBall.x));
    } else if (pongBall.y > PLAY_Y_MAX) {
      pongBall.y = PLAY_Y_MAX;
      pongBall.vy = -Math.abs(pongBall.vy);
      pongBall.omega *= 0.85;
      pongFlareImpact(null, PLAY_Y_MAX, 0, -1, Math.round(pongBall.x));
    }

    if (!pongTryPaddleHit(pongLeftPaddle, PADDLE_X_LEFT, 1)) {
      pongTryPaddleHit(pongRightPaddle, PADDLE_X_RIGHT, -1);
    }

    if (pongBall.x < 0) {
      pongScoreRight = Math.min(9, pongScoreRight + 1);
      pongServe('right');
    } else if (pongBall.x > GRID_COLS - 1) {
      pongScoreLeft = Math.min(9, pongScoreLeft + 1);
      pongServe('left');
    }

    const { x: cellX, y: cellY } = pongBallCell();
    if (cellX !== pongLastCellX || cellY !== pongLastCellY) {
      pongLeaveTrail(cellX, cellY);
      pongLastCellX = cellX;
      pongLastCellY = cellY;
    }

    pongBall.omega *= Math.pow(0.992, dt * 60);

    for (let i = 0; i < pongGlow.length; i++) {
      if (pongGlow[i] > 0) pongGlow[i] = Math.max(0, pongGlow[i] - dt * 1.15);
      if (pongImpact[i] > 0) pongImpact[i] = Math.max(0, pongImpact[i] - dt * 2.8);
    }
  });
};

const pongIdle = (data, frameData) => {
  const idx = pongIdx(data.x, data.y);
  const scoreClock = pongScoreClock(data.x, data.y);
  const paddleSide = pongPaddleSide(data.x, data.y);
  const { x: ballX, y: ballY } = pongBallCell();
  const isBall = data.x === ballX && data.y === ballY;
  const impact = pongImpact[idx];
  const trail = pongGlow[idx];

  if (scoreClock) {
    const c = digits[scoreClock.digit][scoreClock.clockIdx];
    setOut(data, c.h, c.m, PONG_SCORE_HSL);
    return;
  }

  if (isBall) {
    const speed = Math.hypot(pongBall.vx, pongBall.vy);
    const spin = pongBall.handSpin + frameData.t * speed * 55;
    setOut(data, spin % 360, (360 - (spin % 360)) % 360, PONG_BALL_HSL);
    return;
  }

  if (paddleSide) {
    const paddle = paddleSide === 'left' ? pongLeftPaddle : pongRightPaddle;
    const centerBias = 1 - Math.min(1, Math.abs(data.y - paddle.y) / (PADDLE_HALF + 0.5)) * 0.25;
    const light = PONG_PADDLE_HSL[2] * centerBias;
    setBorderOut(data, 270, 90, [PONG_PADDLE_HSL[0], PONG_PADDLE_HSL[1], light]);
    return;
  }

  if (impact > 0.02) {
    const light = PONG_IMPACT_HSL[2] + impact * 72;
    const spread = 28 * impact * Math.sin(frameData.t * 18 + data.x);
    const hands = dualSpread(pongTravelAngle(), spread);
    setOut(data, hands.h, hands.m, [PONG_IMPACT_HSL[0], PONG_IMPACT_HSL[1], light]);
    return;
  }

  if (trail > 0.02) {
    const dir = pongDir[idx];
    const light = PONG_TRAIL_HSL[2] + trail * 58;
    setOut(data, dir, dir, [PONG_TRAIL_HSL[0], PONG_TRAIL_HSL[1], light]);
    return;
  }

  setArmsOut(data, 0, PONG_DARK);
};

pongIdle.update = updatePong;
pongIdle.onEnter = resetPong;
