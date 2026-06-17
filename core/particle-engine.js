const createParticleEngine = (defaults, updateEntityFn, spawnRate, spawnFn, maxEntities = Infinity) => {
  const pool = createPool(defaults);
  const entities = [];
  return {
    entities,
    tick(dt, t) {
      if (entities.length < maxEntities && Math.random() < spawnRate) {
        entities.push(pool.take(spawnFn()));
      }
      for (let i = entities.length - 1; i >= 0; i--) {
        if (!updateEntityFn(entities[i], dt, t)) pool.release(entities, i);
      }
    }
  };
};
