const globalGridBuffer = new Float32Array(GRID_COLS * GRID_ROWS * 3);
const gridFlags = new Uint8Array(GRID_COLS * GRID_ROWS);

const CELL_HEAD = 1;
const CELL_BUBBLE = 2;

const cellIdx = (x, y) => (y * GRID_COLS + x) * 3;
const flagIdx = (x, y) => y * GRID_COLS + x;

const clearPhysicsGrid = () => {
  globalGridBuffer.fill(0);
  gridFlags.fill(0);
};

const clearGridLife = () => {
  for (let i = 2; i < globalGridBuffer.length; i += 3) globalGridBuffer[i] = 0;
  gridFlags.fill(0);
};

const decayCellLife = (rate, dt = 1) => {
  const factor = Math.pow(rate, dt);
  for (let i = 2; i < globalGridBuffer.length; i += 3) {
    const v = globalGridBuffer[i] * factor;
    globalGridBuffer[i] = v < 0.01 ? 0 : v;
  }
};

const _cell = { _i: 0 };
Object.defineProperties(_cell, {
  vX: {
    get() { return globalGridBuffer[this._i]; },
    set(v) { globalGridBuffer[this._i] = v; }
  },
  vY: {
    get() { return globalGridBuffer[this._i + 1]; },
    set(v) { globalGridBuffer[this._i + 1] = v; }
  },
  life: {
    get() { return globalGridBuffer[this._i + 2]; },
    set(v) { globalGridBuffer[this._i + 2] = v; }
  }
});

const getCellState = (x, y) => {
  _cell._i = cellIdx(x, y);
  return _cell;
};

const stepSpring = (angle, vel, equilibrium, omega, damp, dt) => {
  const deltaRad = (angle - equilibrium - 360 * Math.round((angle - equilibrium) / 360)) * Math.PI / 180;
  const velRad = vel * Math.PI / 180;
  const accelRad = -omega * omega * Math.sin(deltaRad) - damp * velRad;
  const newVelRad = velRad + accelRad * dt;
  return [
    angle + newVelRad * dt * 180 / Math.PI,
    newVelRad * 180 / Math.PI
  ];
};
