const hash = (n) => {
  let x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

let lastRidgeT = -1;
const heightCache = new Float32Array(32); // Covers columns -1 to 30

const ridgelineIdle = (data, frameData) => {
  const t = frameData.t;
  const x = data.x;
  const y = data.y;
  
  const getHColumn = (px, t, y) => {
    let h = 0;
    for (let i = 0; i < 3; i++) {
      const seed = y * 10 + i + 1;
      // Speed between 1.0 and 3.0
      const speed = (hash(seed) * 2.0 + 1.0) * (hash(seed + 1) > 0.5 ? 1 : -1); 
      const offset = hash(seed + 2) * 100;
      // Height between 0.6 and 1.8
      const height = hash(seed + 3) * 1.2 + 0.6; 
      // Type: 0 for / \, 1 for / - \
      const type = hash(seed + 4) > 0.5 ? 1 : 0; 
      
      let pos = ((offset + t * speed) % 40 + 40) % 40 - 5;
      
      let dist = Math.abs(px - pos);
      let spikeH = 0;
      
      if (type === 0) {
        // Triangle shape / \
        spikeH = Math.max(0, height * (1 - dist / 1.5));
      } else {
        // Trapezoid shape / - \
        if (dist < 0.5) {
          spikeH = height;
        } else {
          spikeH = Math.max(0, height * (1 - (dist - 0.5) / 1.5));
        }
      }
      
      h += spikeH;
    }
    
    // Apply envelope so it flattens out smoothly at the edges
    const distFromCenter = Math.abs(px - 13.5);
    let envelope = 0;
    if (distFromCenter < 12) {
      envelope = Math.cos((distFromCenter / 12) * Math.PI / 2);
      envelope *= envelope; 
    }
    
    return h * envelope;
  };

  if (t !== lastRidgeT) {
    lastRidgeT = t;
    for (let col = -1; col <= 29; col++) {
      heightCache[col + 1] = getHColumn(col, t, y);
    }
  }

  const h_center = heightCache[x + 1];
  const h_left = heightCache[x];
  const h_right = heightCache[x + 2];
  
  // Left hand points to left neighbor
  const dy_left = h_center - h_left;
  const dx_left = -1;
  const angle_left = Math.atan2(dy_left, dx_left) * 180 / Math.PI;
  
  // Right hand points to right neighbor
  const dy_right = h_center - h_right;
  const dx_right = 1;
  const angle_right = Math.atan2(dy_right, dx_right) * 180 / Math.PI;
  
  data.out.h = angle_left;
  data.out.m = angle_right;
  const elevation = Math.min(1.5, h_center) / 1.5;
  // Glowing cyan-white peak highlights scaling down to deep mountain slate-blues in valleys
  const hue = 175 + elevation * 55;
  data.out.color = `hsl(${hue}, 85%, ${12 + elevation * 58}%)`;
  data.out.ringWeight = 1;
};
