const cloudIdle = (data, frameData) => {
  const inCloud = (cx, cy, r) => Math.hypot(data.x - cx, data.y - cy) <= r;
  
  let isCloud = false;
  if (inCloud(6, 3, 1.5) || inCloud(8, 2.5, 2) || inCloud(10, 3, 1.5)) isCloud = true;
  if (inCloud(18, 2.5, 1.8) || inCloud(21, 2, 2.2) || inCloud(23, 2.8, 1.5)) isCloud = true;
  
  if (data.y > 3.5) isCloud = false;

  let baseH, baseM, weight = 0;

  if (isCloud) {
    baseH = H.h; baseM = H.m;
    weight = 1;
  } else {
    const dropSpacing = 4;
    const dropY = (frameData.cloudDropYBase + data.x * 1.3) % dropSpacing;
    
    const underCloud = (data.x >= 4 && data.x <= 12) || (data.x >= 16 && data.x <= 25);
    
    if (underCloud && data.y > 3.5 && Math.abs(data.y - dropY - 3.5) < 0.5) {
      baseH = V.h; baseM = V.m;
      weight = 1;
    }
  }

  const isBird = (bx, by) => Math.abs(data.x - bx) < 0.5 && Math.abs(data.y - by) < 0.5;
  
  if (isBird(frameData.cloudBird1X, 2) || isBird(frameData.cloudBird2X, 1) || isBird(frameData.cloudBird3X, 3)) {
    const wiggle = frameData.cloudWiggle;
    baseH = H.h + wiggle;
    baseM = H.m - wiggle;
    weight = 1;
  }

  if (weight === 0) {
    data.out.h = 225;
    data.out.m = 225;
    data.out.ringWeight = 1;
    return;
  }

  data.out.h = baseH;
  data.out.m = baseM;
  data.out.ringWeight = weight;
};
