const vortexIdle = (data, frameData) => {
  const { dist, angle } = vortexField(data, frameData);
  const coreSpeed = dist < 3 ? frameData.vortexTimeEffect * 1.5 : frameData.vortexTimeEffect;
  const baseAngle = angle + dist * 22 - coreSpeed;
  const hands = dualSpread(baseAngle, oscillatingSpread(frameData.vortexSpreadTimeEffect - dist * 0.6), 180);
  const normDist = Math.min(1, dist / 14);
  setOut(data, hands.h, hands.m, [290 - normDist * 100, 90, Math.max(10, 80 - normDist * 65)]);
};
