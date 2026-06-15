const timeAngles = (data, dA, dB, pSec, nSec, steppedT, now = Date.now()) => {
  const out = data.timeOut;

  if (data.isRing) {
    const { x, y } = data;
    let pos;
    if (x === 0 && y === 0) pos = BR;
    else if (x === 27 && y === 0) pos = BL;
    else if (x === 0 && y === 7) pos = TR;
    else if (x === 27 && y === 7) pos = TL;
    else if (y === 0 || y === 7) pos = H;
    else pos = V;
    out.h = pos.h;
    out.m = pos.m;
    return out;
  }

  if (data.isColon) {
    if (data.colonFill) {
      const spinA = pSec * 6 + 270;
      const spinB = nSec * 6 + 270;
      out.h = lerp(spinA, spinB, steppedT);
      out.m = lerp(spinA, spinB, steppedT);
      return out;
    }
    const slot = data.colonSlot;
    const secElapsed = now % 1000;

    const tW = secElapsed / 450;
    const wobble = tW < 1 ? Math.exp(-tW * 5.5) * Math.sin(tW * Math.PI * 3.5) * 22 : 0;
    const base = slot % 2 !== 0 ? NW : SE;
    out.h = base.h + wobble;
    out.m = base.m - wobble;
    return out;
  }

  const dIdx = data.digitIdx;
  const cIdx = data.clockIdx;
  const cA = digits[dA[dIdx]][cIdx];
  const cB = digits[dB[dIdx]][cIdx];
  const hA = cA.isIdle ? pSec * 6 + 270 : cA.h;
  const mA = cA.isIdle ? pSec * 6 + 270 : cA.m;
  const hB = cB.isIdle ? nSec * 6 + 270 : cB.h;
  const mB = cB.isIdle ? nSec * 6 + 270 : cB.m;
  out.h = lerp(hA, hB, steppedT);
  out.m = lerp(mA, mB, steppedT);
  return out;
};
