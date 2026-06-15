let matrixDrops = [];
let matrixGrid = Array(28).fill(0).map(() => Array(8).fill(0).map(() => ({
  h: Math.floor(Math.random() * 8) * 45,
  m: Math.floor(Math.random() * 8) * 45,
  brightness: 0,
  isHead: false
})));
let lastMatrixT = 0;

const updateMatrix = (t) => {
  let dt = t - lastMatrixT;
  if (dt > 0.1) dt = 0.1;
  lastMatrixT = t;

  // Fade brightness
  for (let x = 0; x < 28; x++) {
    for (let y = 0; y < 8; y++) {
      matrixGrid[x][y].brightness -= dt * 0.4; // Fade out over 2.5 seconds
      if (matrixGrid[x][y].brightness < 0) matrixGrid[x][y].brightness = 0;
      matrixGrid[x][y].isHead = false;

      // Randomly mutate symbols if visible
      if (matrixGrid[x][y].brightness > 0.3 && Math.random() < 0.05) {
        matrixGrid[x][y].h = Math.floor(Math.random() * 8) * 45;
        matrixGrid[x][y].m = Math.floor(Math.random() * 8) * 45;
      }
    }
  }

  // Spawn drops
  if (matrixDrops.length < 20 && Math.random() < 0.3) {
    matrixDrops.push({
      x: Math.floor(Math.random() * 28),
      y: -Math.random() * 8, // Start above
      speed: 3 + Math.random() * 5 // Cells per second
    });
  }

  // Move drops
  for (let i = matrixDrops.length - 1; i >= 0; i--) {
    const drop = matrixDrops[i];
    const oldY = Math.floor(drop.y);
    drop.y += drop.speed * dt;
    const newY = Math.floor(drop.y);

    if (newY >= 0 && newY < 8) {
      matrixGrid[drop.x][newY].brightness = 1.0;
      matrixGrid[drop.x][newY].isHead = true;
      if (newY !== oldY) {
        // New cell, randomize symbol
        matrixGrid[drop.x][newY].h = Math.floor(Math.random() * 8) * 45;
        matrixGrid[drop.x][newY].m = Math.floor(Math.random() * 8) * 45;
      }
    }

    if (drop.y > 16) { 
      matrixDrops.splice(i, 1);
    }
  }
};

const matrixIdle = (data, frameData) => {
  if (frameData.t !== lastMatrixT) {
    updateMatrix(frameData.t);
  }

  const cell = matrixGrid[data.x]?.[data.y];
  if (!cell) return;

  if (data.matrixH === undefined) {
    data.matrixH = cell.h;
    data.matrixM = cell.m;
  }

  // Pull hands downward if a head droplet is directly passing, creating a physical downward trail
  const targetH = cell.isHead ? 90 : cell.h;
  const targetM = cell.isHead ? 270 : cell.m;
  const easing = cell.isHead ? 0.8 : 0.25;
  let diffH = targetH - data.matrixH;
  let diffM = targetM - data.matrixM;
  diffH = ((diffH + 540) % 360) - 180;
  diffM = ((diffM + 540) % 360) - 180;
  
  data.matrixH += diffH * easing;
  data.matrixM += diffM * easing;
  data.matrixH = (data.matrixH + 360) % 360;
  data.matrixM = (data.matrixM + 360) % 360;

  data.out.h = data.matrixH;
  data.out.m = data.matrixM;

  if (cell.brightness > 0) {
    if (cell.isHead) {
      data.out.colorH = 120;
      data.out.colorS = 100;
      data.out.colorL = 95;
      data.out.color = null;
    } else {
      data.out.colorH = 128;
      data.out.colorS = Math.floor(60 + cell.brightness * 40);
      data.out.colorL = Math.floor(4 + cell.brightness * 40);
      data.out.color = null;
    }
  } else {
    data.out.colorH = 130;
    data.out.colorS = 100;
    data.out.colorL = 2;
    data.out.color = null;
  }

  data.out.ringWeight = 1;
};