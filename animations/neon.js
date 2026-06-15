const neonIdle = (data, frameData) => {
  const d1 = Math.hypot(data.dx - frameData.neonCx1, data.dy - frameData.neonCy1);
  const d2 = Math.hypot(data.dx - frameData.neonCx2, data.dy - frameData.neonCy2);
  
  const angle = (d1 - d2) * 30 + frameData.t * 50;
  const spread = 45 + Math.sin(d1 * 0.5 + frameData.dateT2) * 45;
  
  data.out.h = angle + spread;
  data.out.m = angle - spread;
  const colorCycle = (angle + frameData.t * 30) % 360;
  data.out.colorH = 190 + Math.abs(Math.sin(colorCycle * Math.PI / 180)) * 110;
  data.out.colorS = 100;
  data.out.colorL = 60;
  data.out.color = null;
  data.out.ringWeight = 1;
};
