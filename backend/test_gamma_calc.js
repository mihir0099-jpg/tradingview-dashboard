const calculateBSGamma = (S, K, T, sigma, r) => {
  if (T <= 0 || sigma <= 0 || S <= 0 || K <= 0) return 0;
  const d1 = (Math.log(S / K) + (r + (sigma * sigma) / 2) * T) / (sigma * Math.sqrt(T));
  const pdf = Math.exp(-0.5 * d1 * d1) / Math.sqrt(2 * Math.PI);
  return pdf / (S * sigma * Math.sqrt(T));
};

const S = 24272.20;
const K = 24250;
const T = 4 / 365;

const rawGamma = calculateBSGamma(S, K, T, 0.15, 0.065);
console.log('rawGamma:', rawGamma);
console.log('rawGamma * 1000:', rawGamma * 1000);
console.log('rawGamma * 100:', rawGamma * 100);
