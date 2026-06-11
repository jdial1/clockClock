const vortexIdle = (data, frameData) => {
  const baseAngle = data.angleVortex + data.distVortex * 25 - frameData.vortexTimeEffect;
  const spread = 45 + Math.sin(frameData.vortexSpreadTimeEffect - data.distVortex * 0.8) * 45;

  data.out.h = baseAngle + spread;
  data.out.m = baseAngle - spread + 180;
  data.out.ringWeight = 1;
};
