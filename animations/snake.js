const snakeTicker = createTicker(0.1);

const SNAKE_BODY_COLOR = [120, 100, 58];
const SNAKE_BG_COLOR = [120, 40, 2];
const SNAKE_APPLE_BASE = [330, 100, 62];
const SNAKE_DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const SNAKE_MOVE_INTERVAL = 0.11;

const snakeBody = [];
let snakeApple = null;
let snakeMoveTimer = 0;

const snakeKey = (x, y) => y * GRID_COLS + x;
const snakeGridSize = GRID_COLS * GRID_ROWS;

const buildSerpentinePath = () => {
  const cells = [];
  for (let y = 0; y < GRID_ROWS; y++) {
    if (y % 2 === 0) {
      for (let x = 0; x < GRID_COLS; x++) cells.push({ x, y });
    } else {
      for (let x = GRID_COLS - 1; x >= 0; x--) cells.push({ x, y });
    }
  }
  return cells;
};

const snakeHamiltonPath = buildSerpentinePath();
const snakeHamiltonIndex = new Int32Array(snakeGridSize).fill(-1);
snakeHamiltonPath.forEach((c, i) => {
  snakeHamiltonIndex[snakeKey(c.x, c.y)] = i;
});

const angleBetween = (from, to) => Math.atan2(to.y - from.y, to.x - from.x) * (180 / Math.PI);

const manhattanDist = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

const bodyOccupied = (body, excludeTail = true) => {
  const end = excludeTail ? body.length - 1 : body.length;
  const set = new Set();
  for (let i = 0; i < end; i++) set.add(snakeKey(body[i].x, body[i].y));
  return set;
};

const snakeOccupied = (excludeTail = true) => bodyOccupied(snakeBody, excludeTail);

const inBounds = (x, y) => x >= 0 && x < GRID_COLS && y >= 0 && y < GRID_ROWS;

const isAppleAt = (x, y) => snakeApple && x === snakeApple.x && y === snakeApple.y;

const isOpenCell = (x, y, occupied, allowTail = false) => {
  if (!inBounds(x, y)) return false;
  if (isAppleAt(x, y)) return true;
  if (allowTail && snakeBody.length) {
    const tail = snakeBody[snakeBody.length - 1];
    if (x === tail.x && y === tail.y) return true;
  }
  return !occupied.has(snakeKey(x, y));
};

const canReachTarget = (from, target, occupied, targetKey) => {
  const queue = [from];
  const visited = new Set([snakeKey(from.x, from.y)]);

  while (queue.length) {
    const node = queue.shift();
    if (node.x === target.x && node.y === target.y) return true;

    for (const [dx, dy] of SNAKE_DIRS) {
      const nx = node.x + dx;
      const ny = node.y + dy;
      if (!inBounds(nx, ny)) continue;

      const key = snakeKey(nx, ny);
      if (visited.has(key)) continue;
      if (occupied.has(key) && key !== targetKey) continue;

      visited.add(key);
      queue.push({ x: nx, y: ny });
    }
  }
  return false;
};

const isMoveSafe = (step, willEat) => {
  const body = snakeBody.slice();
  body.unshift(step);
  if (!willEat) body.pop();
  const head = body[0];
  const tail = body[body.length - 1];
  const occupied = bodyOccupied(body, true);
  return canReachTarget(head, tail, occupied, snakeKey(tail.x, tail.y));
};

const spawnSnakeApple = () => {
  const occupied = snakeOccupied(false);
  const empty = [];
  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      if (!occupied.has(snakeKey(x, y))) empty.push({ x, y });
    }
  }
  if (!empty.length) {
    snakeApple = null;
    return;
  }
  snakeApple = empty[Math.floor(Math.random() * empty.length)];
};

const shortestPathSteps = (dst, occupied) => {
  const head = snakeBody[0];
  const dstKey = snakeKey(dst.x, dst.y);
  const queue = [{ x: head.x, y: head.y, path: [] }];
  const visited = new Set([snakeKey(head.x, head.y)]);

  while (queue.length) {
    const node = queue.shift();
    if (snakeKey(node.x, node.y) === dstKey) return node.path;

    for (const [dx, dy] of SNAKE_DIRS) {
      const nx = node.x + dx;
      const ny = node.y + dy;
      if (!isOpenCell(nx, ny, occupied, true)) continue;

      const key = snakeKey(nx, ny);
      if (visited.has(key)) continue;

      visited.add(key);
      queue.push({ x: nx, y: ny, path: node.path.concat({ x: nx, y: ny }) });
    }
  }
  return [];
};

const maxPathSteps = (dst) => {
  const occupied = snakeOccupied(true);
  const minSteps = shortestPathSteps(dst, occupied);
  if (!minSteps.length) return [];

  const visited = new Set([snakeKey(snakeBody[0].x, snakeBody[0].y)]);
  let cur = { x: snakeBody[0].x, y: snakeBody[0].y };
  for (const step of minSteps) {
    visited.add(snakeKey(step.x, step.y));
    cur = step;
  }

  const maxSteps = minSteps.slice();
  cur = { x: snakeBody[0].x, y: snakeBody[0].y };
  let pathIdx = 0;

  while (pathIdx < maxSteps.length) {
    const step = maxSteps[pathIdx];
    const dx = step.x - cur.x;
    const dy = step.y - cur.y;
    const perp = dx === 0 ? [[-1, 0], [1, 0]] : [[0, -1], [0, 1]];
    let extended = false;

    for (const [pdx, pdy] of perp) {
      const curExt = { x: cur.x + pdx, y: cur.y + pdy };
      const nextExt = { x: step.x + pdx, y: step.y + pdy };
      const curKey = snakeKey(curExt.x, curExt.y);
      const nextKey = snakeKey(nextExt.x, nextExt.y);
      const emptyNotVisited = (pos, key) =>
        inBounds(pos.x, pos.y) && !visited.has(key) && !occupied.has(key) && !isAppleAt(pos.x, pos.y);

      if (emptyNotVisited(curExt, curKey) && emptyNotVisited(nextExt, nextKey)) {
        visited.add(curKey);
        visited.add(nextKey);
        maxSteps.splice(pathIdx, 1, curExt, step, { x: step.x - pdx, y: step.y - pdy });
        extended = true;
        break;
      }
    }

    if (!extended) {
      pathIdx++;
      cur = step;
    }
  }

  return maxSteps;
};

const hamiltonDistToFood = (pos) => {
  if (!snakeApple) return snakeGridSize;
  const from = snakeHamiltonIndex[snakeKey(pos.x, pos.y)];
  const to = snakeHamiltonIndex[snakeKey(snakeApple.x, snakeApple.y)];
  if (from < 0 || to < 0) return snakeGridSize;
  return to >= from ? to - from : snakeGridSize - from + to;
};

const hamiltonSeparation = (headIdx, tailIdx) => {
  if (headIdx < tailIdx) return headIdx + snakeGridSize - tailIdx;
  return headIdx - tailIdx;
};

const findSafeAppleStep = () => {
  if (!snakeApple) return null;

  const head = snakeBody[0];
  const tail = snakeBody[snakeBody.length - 1];
  const occupied = snakeOccupied(true);
  const targetKey = snakeKey(snakeApple.x, snakeApple.y);
  const headIdx = snakeHamiltonIndex[snakeKey(head.x, head.y)];
  const tailIdx = snakeHamiltonIndex[snakeKey(tail.x, tail.y)];
  const strictHamilton = snakeBody.length > snakeGridSize * 0.85 && headIdx >= 0 && tailIdx >= 0;
  const minSeparation = snakeBody.length + 4;

  const queue = [{ x: head.x, y: head.y, first: null, depth: 0 }];
  const visited = new Set([snakeKey(head.x, head.y)]);
  let best = null;
  let bestDepth = Infinity;
  let bestFoodDist = Infinity;

  while (queue.length) {
    const node = queue.shift();
    const nodeKey = snakeKey(node.x, node.y);

    if (nodeKey === targetKey) {
      if (!node.first || !isMoveSafe(node.first, true)) continue;

      const stepIdx = snakeHamiltonIndex[snakeKey(node.first.x, node.first.y)];
      if (strictHamilton && hamiltonSeparation(stepIdx, tailIdx) < minSeparation) continue;

      const foodDist = hamiltonDistToFood(node.first);
      if (node.depth < bestDepth || (node.depth === bestDepth && foodDist < bestFoodDist)) {
        bestDepth = node.depth;
        bestFoodDist = foodDist;
        best = node.first;
      }
      continue;
    }

    for (const [dx, dy] of SNAKE_DIRS) {
      const nx = node.x + dx;
      const ny = node.y + dy;
      if (!inBounds(nx, ny)) continue;

      const key = snakeKey(nx, ny);
      if (visited.has(key)) continue;
      if (occupied.has(key) && key !== targetKey) continue;

      visited.add(key);
      const first = node.first ?? { x: nx, y: ny };
      queue.push({ x: nx, y: ny, first, depth: node.depth + 1 });
    }
  }

  return best;
};

const eatAdjacentAppleStep = () => {
  if (!snakeApple) return null;

  const head = snakeBody[0];
  for (const [dx, dy] of SNAKE_DIRS) {
    const nx = head.x + dx;
    const ny = head.y + dy;
    if (nx !== snakeApple.x || ny !== snakeApple.y) continue;
    const step = { x: nx, y: ny };
    if (isMoveSafe(step, true)) return step;
  }
  return null;
};

const greedyTowardFoodStep = () => {
  if (!snakeApple) return null;

  const head = snakeBody[0];
  const occupied = snakeOccupied(true);
  let best = null;
  let bestDist = Infinity;

  for (const [dx, dy] of SNAKE_DIRS) {
    const nx = head.x + dx;
    const ny = head.y + dy;
    if (!isOpenCell(nx, ny, occupied, false)) continue;

    const step = { x: nx, y: ny };
    const ate = isAppleAt(nx, ny);
    if (!isMoveSafe(step, ate)) continue;

    const dist = manhattanDist(step, snakeApple);
    if (dist < bestDist) {
      bestDist = dist;
      best = step;
    }
  }
  return best;
};

const firstSafePathStep = (path) => {
  if (!path.length) return null;
  const step = path[0];
  const ate = isAppleAt(step.x, step.y);
  return isMoveSafe(step, ate) ? step : null;
};

const hamiltonTowardFoodStep = () => {
  if (!snakeApple) return null;

  const head = snakeBody[0];
  const occupied = snakeOccupied(true);
  let best = null;
  let bestDist = Infinity;

  for (const [dx, dy] of SNAKE_DIRS) {
    const nx = head.x + dx;
    const ny = head.y + dy;
    if (!isOpenCell(nx, ny, occupied, false)) continue;

    const step = { x: nx, y: ny };
    const ate = isAppleAt(nx, ny);
    if (!isMoveSafe(step, ate)) continue;

    const dist = hamiltonDistToFood(step);
    if (dist < bestDist) {
      bestDist = dist;
      best = step;
    }
  }
  return best;
};

const hamiltonPathStep = () => {
  const head = snakeBody[0];
  const headIdx = snakeHamiltonIndex[snakeKey(head.x, head.y)];
  if (headIdx < 0) return null;

  const targetIdx = headIdx + 1 < snakeGridSize ? headIdx + 1 : 0;

  for (const [dx, dy] of SNAKE_DIRS) {
    const nx = head.x + dx;
    const ny = head.y + dy;
    if (!inBounds(nx, ny)) continue;
    if (snakeHamiltonIndex[snakeKey(nx, ny)] !== targetIdx) continue;

    const step = { x: nx, y: ny };
    const ate = isAppleAt(nx, ny);
    if (isMoveSafe(step, ate)) return step;
  }
  return null;
};

const findAnySafeStep = () => {
  const head = snakeBody[0];
  const occupied = snakeOccupied(true);

  for (const [dx, dy] of SNAKE_DIRS) {
    const nx = head.x + dx;
    const ny = head.y + dy;
    if (!isOpenCell(nx, ny, occupied, false)) continue;

    const step = { x: nx, y: ny };
    const ate = isAppleAt(nx, ny);
    if (isMoveSafe(step, ate)) return step;
  }
  return null;
};

const pickSnakeStep = () => {
  const tail = snakeBody[snakeBody.length - 1];
  const occupied = snakeOccupied(true);

  return (
    eatAdjacentAppleStep()
    ?? findSafeAppleStep()
    ?? greedyTowardFoodStep()
    ?? firstSafePathStep(shortestPathSteps(snakeApple, occupied))
    ?? hamiltonTowardFoodStep()
    ?? firstSafePathStep(maxPathSteps(tail))
    ?? hamiltonPathStep()
    ?? findAnySafeStep()
  );
};

const resetSnake = () => {
  const cy = Math.floor(GRID_ROWS / 2);
  const cx = Math.floor(GRID_COLS / 2) - 2;
  snakeBody.length = 0;
  for (let i = 0; i < 4; i++) snakeBody.push({ x: cx + i, y: cy });
  snakeMoveTimer = SNAKE_MOVE_INTERVAL;
  spawnSnakeApple();
};

const advanceSnake = () => {
  if (!snakeApple) {
    resetSnake();
    return;
  }

  const step = pickSnakeStep();
  if (!step) {
    resetSnake();
    return;
  }

  snakeBody.unshift(step);
  const ate = step.x === snakeApple.x && step.y === snakeApple.y;

  if (!ate) snakeBody.pop();
  else spawnSnakeApple();

  if (snakeBody.slice(1).some((p) => p.x === step.x && p.y === step.y)) resetSnake();
};

const updateSnake = (t) => {
  snakeTicker.tick(t, (dt) => {
    snakeMoveTimer -= dt;
    if (snakeMoveTimer <= 0) {
      advanceSnake();
      snakeMoveTimer = SNAKE_MOVE_INTERVAL;
    }
  });
};

const snakeIdle = (data, frameData) => {
  if (snakeApple && data.x === snakeApple.x && data.y === snakeApple.y) {
    const pulse = 0.5 + 0.5 * Math.sin(frameData.t * 5);
    const beat = Math.sin(frameData.t * 8) * 12;
    const light = SNAKE_APPLE_BASE[2] + pulse * 28;
    setBorderOut(data, 270 + beat, 90 - beat, [SNAKE_APPLE_BASE[0], SNAKE_APPLE_BASE[1], light]);
    return;
  }

  const segIdx = snakeBody.findIndex((p) => p.x === data.x && p.y === data.y);
  if (segIdx === -1) {
    setArmsOut(data, 0, SNAKE_BG_COLOR);
    return;
  }

  if (segIdx === 0) {
    const spin = frameData.t * 540;
    setBorderOut(data, spin % 360, (360 - (spin % 360)) % 360, [120, 100, 72]);
    return;
  }

  const curr = snakeBody[segIdx];
  const prev = snakeBody[segIdx - 1];
  const next = snakeBody[segIdx + 1];
  const h = angleBetween(curr, prev);
  const m = next ? angleBetween(curr, next) : h;
  const bright = SNAKE_BODY_COLOR[2] + (1 - segIdx / snakeBody.length) * 18;
  setBorderOut(data, h, m, [SNAKE_BODY_COLOR[0], SNAKE_BODY_COLOR[1], bright]);
};

snakeIdle.update = updateSnake;
snakeIdle.onEnter = resetSnake;
