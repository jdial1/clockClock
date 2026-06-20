const WARP_SPEED = 12;
const WARP_MAX_DIST = 14;
const WARP_GLOW_DECAY = 0.72;
const warpTicker = createTicker(0.1);

const warpStars = [];
const warpGlow = new Float32Array(GRID_COLS * GRID_ROWS);
const warpGlowHue = new Float32Array(GRID_COLS * GRID_ROWS);
let warpMutateTimer = 0;

const warpRand = (seed) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const warpCellSeed = (x, y) => warpRand(x * 17.3 + y * 41.9);

const warpIdx = (x, y) => y * GRID_COLS + x;

const initWarpStars = () => {
  warpStars.length = 0;
  const laneCount = 22 + Math.floor(Math.random() * 12);
  let id = 0;

  for (let lane = 0; lane < laneCount; lane++) {
    const baseAngle = (lane / laneCount) * Math.PI * 2;
    const starsInLane = 1 + Math.floor(warpRand(id++) * 2);
    for (let s = 0; s < starsInLane; s++) {
      const seed = id++;
      warpStars.push({
        angle: baseAngle + (warpRand(seed) - 0.5) * 0.22,
        phase: warpRand(seed + 1) * 28,
        speed: 0.85 + warpRand(seed + 2) * 0.45,
        gap: 4 + warpRand(seed + 3) * 10,
        sigma: 0.7 + warpRand(seed + 4) * 0.5,
        sigmaAngle: 2.2 + warpRand(seed + 5) * 2,
        bright: 0.55 + warpRand(seed + 6) * 0.55,
        hueShift: (warpRand(seed + 7) - 0.5) * 45
      });
    }
  }

  const rogueCount = 12 + Math.floor(Math.random() * 12);
  for (let r = 0; r < rogueCount; r++) {
    const seed = id + r * 13;
    warpStars.push({
      angle: warpRand(seed) * Math.PI * 2,
      phase: warpRand(seed + 1) * 32,
      speed: 0.75 + warpRand(seed + 2) * 0.55,
      gap: 5 + warpRand(seed + 3) * 12,
      sigma: 0.6 + warpRand(seed + 4) * 0.6,
      sigmaAngle: 2.5 + warpRand(seed + 5) * 3,
      bright: 0.4 + warpRand(seed + 6) * 0.7,
      hueShift: (warpRand(seed + 7) - 0.5) * 70
    });
  }
};

const warpMutateStars = () => {
  const count = 2 + Math.floor(Math.random() * 3);
  for (let i = 0; i < count; i++) {
    const star = warpStars[Math.floor(Math.random() * warpStars.length)];
    star.gap += (Math.random() - 0.5) * 4;
    star.speed = Math.max(0.55, Math.min(1.05, star.speed * (0.92 + Math.random() * 0.12)));
  }
};

const warpRadialAngle = (dx, dy) => Math.atan2(dy, dx) * (180 / Math.PI);

const warpTowardCenter = (radial) => (radial + 180) % 360;

const warpAngleDelta = (a, b) => Math.abs(((a - b + 540) % 360) - 180);

const warpAmbientGlow = (radial, dist, t) => {
  const ripple = Math.sin(radial * 0.08 + t * 0.08 + dist * 0.35) * 0.5 + 0.5;
  const drift = Math.sin(t * 0.04 + radial * 0.04) * 0.5 + 0.5;
  return ripple * 0.05 + drift * 0.03;
};

const warpInstantHit = (dist, radial, t) => {
  let hit = 0;
  let hueShift = 0;

  for (let i = 0; i < warpStars.length; i++) {
    const star = warpStars[i];
    const starDeg = star.angle * (180 / Math.PI);
    const dAngle = warpAngleDelta(starDeg, radial);
    const across = Math.exp(-((dAngle / star.sigmaAngle) ** 2));
    if (across < 0.08) continue;

    const cycle = WARP_MAX_DIST + star.gap;
    const travel = t * WARP_SPEED * star.speed + star.phase;
    const radius = travel % cycle;
    if (radius > WARP_MAX_DIST) continue;

    const dr = Math.abs(radius - dist);
    const along = Math.exp(-((dr / star.sigma) ** 2));
    const h = along * across * star.bright;
    if (h > hit) {
      hit = h;
      hueShift = star.hueShift;
    }
  }

  return { hit, hueShift };
};

const updatePulse = (t) => {
  warpTicker.tick(t, (dt) => {
    const decay = Math.exp(-WARP_GLOW_DECAY * dt);
    for (let i = 0; i < warpGlow.length; i++) {
      warpGlow[i] *= decay;
      if (warpGlow[i] < 0.01) warpGlow[i] = 0;
    }

    for (let y = 0; y < GRID_ROWS; y++) {
      const dy = y - 3.5;
      for (let x = 0; x < GRID_COLS; x++) {
        const dx = x - 13.5;
        const dist = Math.hypot(dx, dy);
        const radial = Math.atan2(dy, dx) * (180 / Math.PI);
        const { hit, hueShift } = warpInstantHit(dist, radial, t);
        if (hit <= 0) continue;
        const idx = warpIdx(x, y);
        if (hit > warpGlow[idx]) {
          warpGlow[idx] = hit;
          warpGlowHue[idx] = hueShift;
        }
      }
    }

    warpMutateTimer += dt;
    if (warpMutateTimer > 22 + Math.random() * 18) {
      warpMutateTimer = 0;
      warpMutateStars();
    }
  });
};

const pulseIdle = (data, frameData) => {
  const dist = Math.hypot(data.dx, data.dy);
  const radial = warpRadialAngle(data.dx, data.dy);
  const jitter = warpCellSeed(data.x, data.y);
  const idx = warpIdx(data.x, data.y);
  const glow = warpGlow[idx];
  const axis = warpTowardCenter(radial);
  const edge = Math.min(1, dist / 12);
  const ambient = warpAmbientGlow(radial, dist, frameData.t);
  const blur = glow * (22 + edge * 12 + jitter * 8);
  const h = glow > 0.03 ? axis + blur : axis;
  const m = glow > 0.03 ? axis - blur * (0.8 + jitter * 0.2) : axis;
  const light = 2 + ambient * 16 + edge * 7 + glow * 70;
  const hue = 218 + warpGlowHue[idx] - edge * 18 + jitter * 4;
  const sat = 26 + ambient * 25 + glow * 55;
  setOut(data, h, m, [hue, sat, light]);
};

pulseIdle.update = updatePulse;
pulseIdle.onEnter = () => {
  warpMutateTimer = 0;
  warpGlow.fill(0);
  warpGlowHue.fill(0);
  initWarpStars();
};
initWarpStars();
