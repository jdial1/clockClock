let dDigits = [10, 10, 10, 10, 10, 10];

const updateDateDigits = () => {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const yy = String(now.getFullYear() % 100).padStart(2, '0');
  dDigits[0] = +mm[0];
  dDigits[1] = +mm[1];
  dDigits[2] = +dd[0];
  dDigits[3] = +dd[1];
  dDigits[4] = +yy[0];
  dDigits[5] = +yy[1];
  
  if (typeof clocksCache !== 'undefined') {
    for (let i = 0; i < clocksCache.length; i++) clocksCache[i].drawKeyH = undefined;
  }
};

updateDateDigits();
setInterval(updateDateDigits, 60 * 1000);

const dateIdle = (data, frameData) => {
  if (data.isRing) {
    let pos;
    if (data.x === 0 && data.y === 0) pos = BR;
    else if (data.x === 27 && data.y === 0) pos = BL;
    else if (data.x === 0 && data.y === 7) pos = TR;
    else if (data.x === 27 && data.y === 7) pos = TL;
    else if (data.y === 0 || data.y === 7) pos = H;
    else pos = V;
    const wave = Math.sin(frameData.dateT2 + data.ringP * 0.4) * 20;
    data.out.h = pos.h + wave;
    data.out.m = pos.m - wave;
    data.out.ringWeight = 1;
    return;
  }

  if (data.isColon) {
    if (data.y === 3) {
      data.out.h = H.h;
      data.out.m = H.m;
      data.out.ringWeight = 1;
      return;
    }
    data.out.h = 225;
    data.out.m = 225;
    data.out.ringWeight = 1;
    return;
  }

  const c = digits[dDigits[data.digitIdx]][data.clockIdx];
  if (c.isIdle) {
    // Meditative mechanical escapement sway for the astronomical calendar background
    const gearSway = Math.sin(frameData.t * 0.45 + (data.x - data.y) * 0.12) * 8;
    data.out.h = 225 + gearSway;
    data.out.m = 225 + gearSway;
    data.out.ringWeight = 1;
    return;
  }
  
  data.out.h = c.h;
  data.out.m = c.m;
  data.out.ringWeight = 1;
};
