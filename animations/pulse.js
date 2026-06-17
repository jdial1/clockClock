const pulseIdle = (data, frameData) => {
  const { hexDist, hexAngle } = getSpatialMetrics(data, frameData);
  const blend = waveBlend(Math.sin(hexDist * 0.75 - frameData.pulseHeartbeat));
  setOut(data, hexAngle + 90 * blend, hexAngle + 360 - 90 * blend, [270 - blend * 230, 95, 15 + blend * 50]);
};
