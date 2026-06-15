const pulseIdle = (data, frameData) => {
  const wave = Math.sin(data.hexDist * 0.75 - frameData.pulseHeartbeat);
  const blend = Math.pow((wave + 1) * 0.5, 3);
  
  data.out.h = data.hexAngle + 90 * blend;
  data.out.m = data.hexAngle + 360 - 90 * blend;
  // Shockwave glow propagating from golden amber (40) to high-energy violet (270)
  const hue = 270 - (blend * 230);
  data.out.color = `hsl(${hue}, 95%, ${15 + blend * 50}%)`;
  data.out.ringWeight = 1;
};
