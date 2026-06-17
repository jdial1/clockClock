const timeHandEndpoints = (data, dA, dB, pSec, nSec) => {
  if (data.isRing) {
    const pos = ringPos(data);
    return { hA: pos.h, hB: pos.h, mA: pos.m, mB: pos.m };
  }

  if (data.isColon) {
    if (data.colonFill) {
      const spinA = pSec * 6 + 270;
      const spinB = nSec * 6 + 270;
      return { hA: spinA, hB: spinB, mA: spinA, mB: spinB, spin: true };
    }
    return { wobble: true };
  }

  const cA = digits[dA[data.digitIdx]][data.clockIdx];
  const cB = digits[dB[data.digitIdx]][data.clockIdx];
  const idle = cA.isIdle || cB.isIdle;
  const hA = cA.isIdle ? pSec * 6 + 270 : cA.h;
  const mA = cA.isIdle ? pSec * 6 + 270 : cA.m;
  const hB = cB.isIdle ? nSec * 6 + 270 : cB.h;
  const mB = cB.isIdle ? nSec * 6 + 270 : cB.m;
  return { hA, hB, mA, mB, idle };
};

const timeUsesHandTracking = (ep) => ep && !ep.wobble && !ep.spin;

const timeAngles = (data, dA, dB, pSec, nSec, steppedT, now = Date.now()) => {
  const out = data.timeOut;
  const ep = timeHandEndpoints(data, dA, dB, pSec, nSec);

  if (ep.wobble) {
    const slot = data.colonSlot;
    const secElapsed = now % 1000;
    const tW = secElapsed / 450;
    const wobble = tW < 1 ? Math.exp(-tW * 5.5) * Math.sin(tW * Math.PI * 3.5) * 22 : 0;
    const base = slot % 2 !== 0 ? NW : SE;
    out.h = base.h + wobble;
    out.m = base.m - wobble;
    return out;
  }

  out.h = lerp(ep.hA, ep.hB, steppedT);
  out.m = lerp(ep.mA, ep.mB, steppedT);
  return out;
};
