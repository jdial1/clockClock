const pulseIdle = (data, frameData) => {
  const wave = Math.sin(data.hexDist * 0.8 - frameData.pulseT);
  const blend = Math.pow((wave + 1) * 0.5, 2);
  
  data.out.h = data.hexAngle + 90 * blend;
  data.out.m = data.hexAngle + 360 - 90 * blend;
  data.out.ringWeight = 1;
};
