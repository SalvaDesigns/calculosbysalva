
const ratio = 1; // Full time
const base = 753.79;
const conv = 111.55;
const dist = 153.10;
const extrasValue = 753.79; // From JSON
const nExtras = 4;

const bolsaProp = 17.79;
const igualaProp = 32.0;
const distProp = 12.76;
const adjustment = bolsaProp + igualaProp - distProp; // 37.03

console.log("--- 16 Pagas ---");
const target16 = 1036;
const bruto16 = base + conv + dist;
const gap16 = target16 - bruto16;
const result16 = gap16 + adjustment;
console.log("Result 16:", result16.toFixed(2)); // Expect 54.59

console.log("\n--- 12 Pagas (Interpretation A: Prorrata = Base/3) ---");
const target12 = 1381.33;
const prorrataA = (extrasValue * nExtras) / 12; // 251.26
const bruto12A = bruto16 + prorrataA;
const gap12A = target12 - bruto12A;
const result12A = gap12A + adjustment;
console.log("Result 12A:", result12A.toFixed(2));

console.log("\n--- 12 Pagas (Interpretation B: Prorrata = Target16/3) ---");
const prorrataB = target16 / 3; // 345.33
const bruto12B = bruto16 + prorrataB;
const gap12B = target12 - bruto12B;
const result12B = gap12B + adjustment;
console.log("Result 12B:", result12B.toFixed(2));

console.log("\n--- 12 Pagas (Interpretation C: SMI for 12 is Target16 * 1.333...) ---");
// Maybe Target12 is slightly different?
// 1381.33 vs 1381.333...
const target12C = 16576 / 12; // 1381.333
const result12C = (target12C - (bruto16 + prorrataB)) + adjustment;
console.log("Result 12C:", result12C.toFixed(2));

console.log("\n--- Seeking 55.41 ---");
const targetResult = 55.41;
const requiredGap = targetResult - adjustment;
console.log("Required Gap:", requiredGap.toFixed(2));
const requiredBruto = target12 - requiredGap;
console.log("Required Bruto (Prorated):", requiredBruto.toFixed(2));
const requiredProrrata = requiredBruto - bruto16;
console.log("Required Prorrata:", requiredProrrata.toFixed(2));
const requiredExtraValue = requiredProrrata * 3;
console.log("Required Extra Value (x4):", requiredExtraValue.toFixed(2));
