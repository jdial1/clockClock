const CHAR_MAP = {
  '>': { h: 225, m: 135 },  // Top-Left, Bottom-Left (forms >)
  '<': { h: 315, m: 45 },   // Top-Right, Bottom-Right (forms <)
  '-': { h: 0, m: 180 },    // Right, Left (Horizontal)
  '=': { h: 0, m: 180 },    // Right, Left (Horizontal)
  '{': { h: 225, m: 135 },  // Top-Left, Bottom-Left (forms >)
  '}': { h: 315, m: 45 },   // Top-Right, Bottom-Right (forms <)
  '0': { h: 270, m: 90 },   // Up, Down (Vertical)
  'O': { h: 270, m: 90 },   // Up, Down (Vertical)
  '@': { h: 225, m: 315 },  // Top-Left, Top-Right (Crab eyes pointing up)
  'o': { h: 270, m: 270 },  // Both pointing Up for bubbles
  '^': { h: 225, m: 315 },  // Top-Left, Top-Right (forms ^)
  'v': { h: 135, m: 45 },   // Bottom-Left, Bottom-Right (forms v)
  '/': { h: 135, m: 315 },  // Bottom-Left, Top-Right (forms /)
  '\\': { h: 225, m: 45 }   // Top-Left, Bottom-Right (forms \)
};

  // Not needed anymore since we hardcode the crab sprites
  // const FISH_TYPES = [ ... ];

let bubbles = [];
let lastFishT = 0;
let fishGrid = [];

let crabEncounter = {
  active: false,
  state: 'idle', // idle, walking_in, dancing, walking_out
  danceTimer: 0,
  crabs: []
};

const updateFishes = (t) => {
  let dt = t - lastFishT;
  if (dt > 0.1) dt = 0.1; // Cap dt if tab was inactive
  lastFishT = t;
  
  fishGrid = Array(28).fill(0).map(() => Array(8).fill(null));
  
  // Spawn crab encounter
  if (!crabEncounter.active && Math.random() < 0.005) {
    crabEncounter.active = true;
    crabEncounter.state = 'walking_in';
    crabEncounter.crabs = [
      {
        x: -6, y: 6, vx: 1.5, sprite: [">@==@<", "/ \\/ \\"], color: '#FF4444', isLeft: true, danceOffset: 0
      },
      {
        x: 28, y: 6, vx: -1.5, sprite: [">@==@<", "\\ /\\ /"], color: '#FF2222', isLeft: false, danceOffset: Math.PI
      }
    ];
  }
  
  // Spawn bubbles
  if (Math.random() < 0.05) {
    bubbles.push({
      x: Math.floor(Math.random() * 28),
      y: 8,
      vy: -(1 + Math.random() * 1.5)
    });
  }
  
  // Update crab encounter
  if (crabEncounter.active) {
    let allInPosition = true;
    
    for (let c of crabEncounter.crabs) {
      if (crabEncounter.state === 'walking_in') {
        c.x += c.vx * dt;
        
        if (Math.floor(t * 3) % 2 === 0) {
          c.sprite = [">@==@<", "/ \\/ \\"];
        } else {
          c.sprite = [">@==@<", "\\ /\\ /"];
        }

        // Target positions: left crab at x=7, right crab at x=15
        const targetX = c.isLeft ? 7 : 15;
        if ((c.isLeft && c.x >= targetX) || (!c.isLeft && c.x <= targetX)) {
          c.x = targetX;
        } else {
          allInPosition = false;
        }
      } else if (crabEncounter.state === 'dancing') {
        // Bob up and down
        c.y = 6 - Math.abs(Math.sin(t * 4 + c.danceOffset)) * 0.5;
        // Alternate claws up and down
        if (Math.floor(t * 4 + c.danceOffset) % 2 === 0) {
           c.sprite = ["v@==@v", "\\    /"]; // Claws down, legs in
        } else {
           c.sprite = ["^@==@^", "/    \\"]; // Claws up, legs out
        }
      } else if (crabEncounter.state === 'walking_out') {
        c.y = 6;
        c.x += c.vx * dt;
        
        if (Math.floor(t * 3) % 2 === 0) {
          c.sprite = [">@==@<", "/ \\/ \\"];
        } else {
          c.sprite = [">@==@<", "\\ /\\ /"];
        }
      }
    }

    if (crabEncounter.state === 'walking_in' && allInPosition) {
      crabEncounter.state = 'dancing';
      crabEncounter.danceTimer = 10 + Math.random() * 20; // 10 to 30 seconds
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

    // Draw crabs
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
              fishGrid[gx][gy] = { color: c.color, char: char };
            }
          }
        }
      }
    }
  }
  
  // Move and draw bubbles
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
      fishGrid[bx][by] = { color: '#88CCFF', char: 'o' }; // Light blue bubble
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
  } else {
    // Water effect (gentle waves)
    const wave = Math.sin(data.x * 0.3 + frameData.t * 1.5) + Math.cos(data.y * 0.4 + frameData.t * 1.2);
    targetH = 45 + wave * 25;
    targetM = 225 - wave * 25;
    const lightness = 6 + Math.floor((wave + 2) * 3);
    data.out.color = `hsl(215, 80%, ${lightness}%)`;
  }
  
  // Faster easing so the shapes don't get jumbled as they move
  const easing = 0.4;
  
  // Handle shortest path for rotation
  let diffH = targetH - data.fishH;
  let diffM = targetM - data.fishM;
  
  // Normalize diff to -180 to 180 for shortest rotation
  diffH = ((diffH + 540) % 360) - 180;
  diffM = ((diffM + 540) % 360) - 180;
  
  data.fishH += diffH * easing;
  data.fishM += diffM * easing;
  
  // Keep angles in 0-360 range
  data.fishH = (data.fishH + 360) % 360;
  data.fishM = (data.fishM + 360) % 360;
  
  data.out.h = data.fishH;
  data.out.m = data.fishM;
  data.out.ringWeight = 1;
};
