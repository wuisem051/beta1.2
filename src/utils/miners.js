export const countMinersByUser = (miners) => {
  const counts = {};
  miners.forEach(miner => {
    counts[miner.user] = (counts[miner.user] || 0) + 1;
  });
  return counts;
};
