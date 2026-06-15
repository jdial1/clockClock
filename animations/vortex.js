const vortexIdle = (data, frameData) => {
  // Orbit the gravitational epicenter dynamically to simulate fluid vortex precession
  const px = data.dx - Math.sin(frameData.t * 0.5) * 1.2;
  const py = data.dy - Math.cos(frameData.t * 0.3) * 0.5;
  const distVortex = Math.hypot(px, py * 2);
  const angleVortex = Math.atan2(py * 2, px) * 180 / Math.PI;

  const coreSpeed = distVortex < 3 ? frameData.vortexTimeEffect * 1.5 : frameData.vortexTimeEffect;
  const baseAngle = angleVortex + distVortex * 22 - coreSpeed;
  const spread = 45 + Math.sin(frameData.vortexSpreadTimeEffect - distVortex * 0.6) * 45;

  data.out.h = baseAngle + spread;
  data.out.m = baseAngle - spread + 180;
  // White-hot accretion disk core shifting out to cool cosmic indigo on the periphery
  const normDist = Math.min(1, distVortex / 14);
  const hue = 290 - normDist * 100;
  const lightness = Math.max(10, 80 - normDist * 65);
  data.out.color = `hsl(${hue}, 90%, ${lightness}%)`;
  data.out.ringWeight = 1;
};
