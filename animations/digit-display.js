const digitDisplayIdle = (sourceKey, ambientFn, colonH = false, ringWaveFn = () => 0) => {
  const fn = (data, frameData) => {
    if (data.isRing) {
      const pos = ringPos(data);
      const wave = ringWaveFn(data, frameData);
      setOut(data, pos.h + wave, pos.m - wave);
      return;
    }
    if (data.isColon) {
      if (colonH && data.y === 3) {
        setOut(data, H.h, H.m);
        return;
      }
      setOut(data, 225, 225);
      return;
    }
    const c = digits[dataProvider.state[sourceKey][data.digitIdx]][data.clockIdx];
    if (c.isIdle) {
      const ambient = ambientFn(data, frameData);
      setOut(data, 225 + ambient.h, 225 + ambient.m);
      return;
    }
    setOut(data, c.h, c.m);
  };
  fn.digitSource = dataProvider.state[sourceKey];
  return fn;
};

const dateIdle = digitDisplayIdle(
  'date',
  (data, frameData) => {
    const sway = Math.sin(frameData.t * 0.45 + (data.x - data.y) * 0.12) * 8;
    return { h: sway, m: sway };
  },
  true,
  (data, frameData) => Math.sin(frameData.dateT2 + data.ringP * 0.4) * 20
);

const weatherIdle = digitDisplayIdle(
  'weather',
  (data, frameData) => {
    const wind = Math.sin(frameData.t * 0.7 + data.x * 0.15 + data.y * 0.1) * 12;
    return { h: wind, m: -wind };
  }
);
