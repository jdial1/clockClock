const GRAV_CONSTS = {
  omegaH: 4.2,
  omegaM: 5.8,
  dampH: 1.1,
  dampM: 1.4,
  cycleLength: 6,
  freeFall: 3
};
const GRAV_DIRECTIONS = [0, 45, 90, 135, 180, 225, 270, 315];
const gravTicker = createTicker(0.05);
let gravStartTime = 0;
let gravEquilibrium = 90;
let gravDirEpoch = -1;
let gravFreeFallEpoch = -1;

const gravCyclePos = (t) => (t - gravStartTime) % GRAV_CONSTS.cycleLength;

const kickGravVelocities = (data) => {
  const stagger = (data.x * 0.07 + data.y * 0.11) % 1;
  data.gravVelH = (Math.random() - 0.5) * 12 * (1 - stagger * 0.6);
  data.gravVelM = (Math.random() - 0.5) * 18 * (1 - stagger * 0.5);
};

const nudgeGravToward = (angle, vel, target) => {
  let delta = ((target - angle + 540) % 360) - 180;
  if (Math.abs(delta) < 1) delta = delta >= 0 ? 15 : -15;
  return vel + delta * 0.35;
};

const pickGravDirection = (epoch) => {
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
  const t = Date.now() / 1000;
  gravTicker.state.val = t;
  gravStartTime = t;
  gravEquilibrium = 90;
  gravDirEpoch = -1;
  gravFreeFallEpoch = -1;
  for (let i = 0; i < clocksCache.length; i++) {
    const data = clocksCache[i];
    data.gravH = undefined;
    data.gravM = undefined;
    data.gravVelH = undefined;
    data.gravVelM = undefined;
  }
};

const updateGravity = (t) => {
  if (!gravStartTime) gravStartTime = t;
  gravTicker.tick(t, (dt) => {
    const cyclePos = gravCyclePos(t);
    const inFreeFall = cyclePos < GRAV_CONSTS.freeFall;
    const epoch = Math.floor((t - gravStartTime) / GRAV_CONSTS.cycleLength);

    if (inFreeFall) {
      if (epoch !== gravFreeFallEpoch) {
        gravFreeFallEpoch = epoch;
        for (let i = 0; i < clocksCache.length; i++) {
          const data = clocksCache[i];
          if (data.gravH === undefined) {
            data.gravH = data.timeOut.h;
            data.gravM = data.timeOut.m;
          }
          kickGravVelocities(data);
        }
      }
    } else if (epoch !== gravDirEpoch) {
      pickGravDirection(epoch);
      for (let i = 0; i < clocksCache.length; i++) {
        const data = clocksCache[i];
        if (data.gravH === undefined) continue;
        data.gravVelH = nudgeGravToward(data.gravH, data.gravVelH, gravEquilibrium);
        data.gravVelM = nudgeGravToward(data.gravM, data.gravVelM, gravEquilibrium);
      }
    }

    for (let i = 0; i < clocksCache.length; i++) {
      const data = clocksCache[i];
      if (data.gravH === undefined) {
        data.gravH = data.timeOut.h;
        data.gravM = data.timeOut.m;
        if (inFreeFall) kickGravVelocities(data);
        else {
          data.gravVelH = 0;
          data.gravVelM = 0;
        }
      }
      if (inFreeFall) {
        data.gravH += data.gravVelH * dt;
        data.gravM += data.gravVelM * dt;
      } else {
        [data.gravH, data.gravVelH] = stepSpring(data.gravH, data.gravVelH, gravEquilibrium, GRAV_CONSTS.omegaH, GRAV_CONSTS.dampH, dt);
        [data.gravM, data.gravVelM] = stepSpring(data.gravM, data.gravVelM, gravEquilibrium, GRAV_CONSTS.omegaM, GRAV_CONSTS.dampM, dt);
      }
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
