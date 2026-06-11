const timeAngles = (data, dA, dB, pSec, nSec, steppedT) => {
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
    const evenA = pSec % 2 === 0;
    const evenB = nSec % 2 === 0;
    const posA = evenA ? (slot % 2 !== 0 ? NW : SE) : H;
    const posB = evenB ? (slot % 2 !== 0 ? NW : SE) : H;
    return {
      h: lerp(posA.h, posB.h, steppedT),
      m: lerp(posA.m, posB.m, steppedT)
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
