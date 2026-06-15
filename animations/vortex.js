const vortexIdle = (data, frameData) => {
  // Orbit the gravitational epicenter dynamically to simulate fluid vortex precession
  const px = data.dx - frameData.vortexPrecessX;
  const py = data.dy - frameData.vortexPrecessY;
  const distVortex = Math.hypot(px, py * 2);
  const angleVortex = Math.atan2(py * 2, px) * 180 / Math.PI;

  const coreSpeed = distVortex < 3 ? frameData.vortexTimeEffect * 1.5 : frameData.vortexTimeEffect;
  const baseAngle = angleVortex + distVortex * 22 - coreSpeed;
  const spread = 45 + Math.sin(frameData.vortexSpreadTimeEffect - distVortex * 0.6) * 45;

  data.out.h = baseAngle + spread;
  data.out.m = baseAngle - spread + 180;
  const normDist = Math.min(1, distVortex / 14);
  data.out.colorH = 290 - normDist * 100;
  data.out.colorS = 90;
  data.out.colorL = Math.max(10, 80 - normDist * 65);
  data.out.color = null;
  data.out.ringWeight = 1;
};
