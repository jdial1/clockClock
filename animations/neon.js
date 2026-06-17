const neonIdle = (data, frameData) => {
  const { d1, d2 } = neonField(data, frameData);
  const { distFromCenter } = getSpatialMetrics(data, frameData);
  const angle = (d1 - d2) * 30 + frameData.t * 50;
  const hands = dualSpread(angle, oscillatingSpread(d1 * 0.5 + frameData.dateT2));
  const hue = Math.round(190 + Math.abs(Math.sin(frameData.t + distFromCenter * 0.15)) * 110) % 360;
  setOut(data, hands.h, hands.m, [hue, 95, 55]);
};
