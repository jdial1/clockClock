const timeAngles = (data, dA, dB, pSec, nSec, steppedT, now = Date.now()) => {
  if (data.isRing) {
    const { x, y } = data;
    let pos;
    if (x === 0 && y === 0) pos = BR;
    else if (x === 27 && y === 0) pos = BL;
    else if (x === 0 && y === 7) pos = TR;
    else if (x === 27 && y === 7) pos = TL;
    else if (y === 0 || y === 7) pos = H;
    else pos = V;
    return { h: pos.h, m: pos.m };
  }

  if (data.isColon) {
    if (data.colonFill) {
      const spinA = pSec * 6 + 270;
      const spinB = nSec * 6 + 270;
      return {
        h: lerp(spinA, spinB, steppedT),
        m: lerp(spinA, spinB, steppedT)
      };
    }
    const slot = data.colonSlot;
    const secElapsed = now % 1000;

    // Decay spring recoil: starts strong on the second transition, then dissipates
    const tW = secElapsed / 450;
    const wobble = tW < 1 ? Math.exp(-tW * 5.5) * Math.sin(tW * Math.PI * 3.5) * 22 : 0;
    const base = slot % 2 !== 0 ? NW : SE;
    return {
      h: base.h + wobble,
      m: base.m - wobble
    };
  }

  const dIdx = data.digitIdx;
  const cIdx = data.clockIdx;
  const cA = digits[dA[dIdx]][cIdx];
  const cB = digits[dB[dIdx]][cIdx];
  const hA = cA.isIdle ? pSec * 6 + 270 : cA.h;
  const mA = cA.isIdle ? pSec * 6 + 270 : cA.m;
  const hB = cB.isIdle ? nSec * 6 + 270 : cB.h;
  const mB = cB.isIdle ? nSec * 6 + 270 : cB.m;
  return {
    h: lerp(hA, hB, steppedT),
    m: lerp(mA, mB, steppedT)
  };
};
