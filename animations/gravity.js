const GRAV_CONSTS = { omegaH: 4.2, omegaM: 5.8, dampH: 1.1, dampM: 1.4, interval: 5 };
const GRAV_DIRECTIONS = [0, 45, 90, 135, 180, 225, 270, 315];
const gravTicker = createTicker(0.05);
let gravEquilibrium = 90;
let gravDirEpoch = -1;

const pickGravDirection = (t) => {
  const epoch = Math.floor(t / GRAV_CONSTS.interval);
  if (epoch === gravDirEpoch) return;
  gravDirEpoch = epoch;
  const prev = gravEquilibrium;
  let next = GRAV_DIRECTIONS[Math.floor(Math.random() * GRAV_DIRECTIONS.length)];
  if (GRAV_DIRECTIONS.length > 1) {
    while (next === prev) {
      next = GRAV_DIRECTIONS[Math.floor(Math.random() * GRAV_DIRECTIONS.length)];
    }
  }
  gravEquilibrium = next;
};

const resetGravity = () => {
  gravTicker.reset();
  gravEquilibrium = 90;
  gravDirEpoch = -1;
  for (let i = 0; i < clocksCache.length; i++) {
    const data = clocksCache[i];
    data.gravH = undefined;
    data.gravM = undefined;
    data.gravVelH = undefined;
    data.gravVelM = undefined;
  }
};

const updateGravity = (t) => {
  gravTicker.tick(t, (dt) => {
    pickGravDirection(t);
    for (let i = 0; i < clocksCache.length; i++) {
      const data = clocksCache[i];
      if (data.gravH === undefined) {
        data.gravH = data.timeOut.h;
        data.gravM = data.timeOut.m;
        const stagger = (data.x * 0.07 + data.y * 0.11) % 1;
        data.gravVelH = (Math.random() - 0.5) * 12 * (1 - stagger * 0.6);
        data.gravVelM = (Math.random() - 0.5) * 18 * (1 - stagger * 0.5);
      }
      [data.gravH, data.gravVelH] = stepSpring(data.gravH, data.gravVelH, gravEquilibrium, GRAV_CONSTS.omegaH, GRAV_CONSTS.dampH, dt);
      [data.gravM, data.gravVelM] = stepSpring(data.gravM, data.gravVelM, gravEquilibrium, GRAV_CONSTS.omegaM, GRAV_CONSTS.dampM, dt);
    }
  });
};

const gravityIdle = (data, frameData) => {
  if (data.gravH === undefined) {
    data.gravH = data.timeOut.h;
    data.gravM = data.timeOut.m;
    data.gravVelH = 0;
    data.gravVelM = 0;
  }
  setOut(data, data.gravH, data.gravM, [40, 55, 38]);
};

gravityIdle.update = updateGravity;
