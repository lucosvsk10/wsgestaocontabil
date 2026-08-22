export interface HistoricalPurchaseMonth {
  competence: string;
  quantity: number;
  totalAmountInCents: number;
}

export interface HistoricalRevenueMonth {
  competence: string;
  serviceAmountInCents: number;
  merchandiseAmountInCents: number;
  totalAmountInCents: number;
  pgdasAmountInCents: number;
}

const brl = (value: number) => Math.round(value * 100);

export const historicalPurchases: HistoricalPurchaseMonth[] = [
  { competence: "01/2024", quantity: 15, totalAmountInCents: brl(226281.71) },
  { competence: "02/2024", quantity: 9, totalAmountInCents: brl(125108.95) },
  { competence: "03/2024", quantity: 10, totalAmountInCents: brl(78197.11) },
  { competence: "04/2024", quantity: 8, totalAmountInCents: brl(76413.94) },
  { competence: "05/2024", quantity: 8, totalAmountInCents: brl(48258.19) },
  { competence: "06/2024", quantity: 14, totalAmountInCents: brl(93268.50) },
  { competence: "07/2024", quantity: 2, totalAmountInCents: brl(23474.23) },
  { competence: "08/2024", quantity: 10, totalAmountInCents: brl(136117.70) },
  { competence: "09/2024", quantity: 7, totalAmountInCents: brl(3113.08) },
  { competence: "10/2024", quantity: 17, totalAmountInCents: brl(195613.18) },
  { competence: "11/2024", quantity: 8, totalAmountInCents: brl(63860.77) },
  { competence: "12/2024", quantity: 11, totalAmountInCents: brl(59879.92) },
  { competence: "01/2025", quantity: 10, totalAmountInCents: brl(70937.95) },
  { competence: "02/2025", quantity: 8, totalAmountInCents: brl(11771.56) },
  { competence: "03/2025", quantity: 12, totalAmountInCents: brl(131014.98) },
  { competence: "04/2025", quantity: 7, totalAmountInCents: brl(212718.60) },
  { competence: "05/2025", quantity: 6, totalAmountInCents: brl(16635.67) },
  { competence: "06/2025", quantity: 9, totalAmountInCents: brl(19735.47) },
  { competence: "07/2025", quantity: 8, totalAmountInCents: brl(68645.38) },
  { competence: "08/2025", quantity: 11, totalAmountInCents: brl(148284.58) },
  { competence: "09/2025", quantity: 4, totalAmountInCents: brl(201743.50) },
  { competence: "10/2025", quantity: 12, totalAmountInCents: brl(327980.92) },
  { competence: "11/2025", quantity: 0, totalAmountInCents: 0 },
  { competence: "12/2025", quantity: 0, totalAmountInCents: 0 },
];

export const historicalRevenue: HistoricalRevenueMonth[] = [
  { competence: "01/2024", serviceAmountInCents: brl(197535.98), merchandiseAmountInCents: brl(7557.45), totalAmountInCents: brl(205093.43), pgdasAmountInCents: brl(27726.48) },
  { competence: "02/2024", serviceAmountInCents: brl(201352.34), merchandiseAmountInCents: brl(6028.00), totalAmountInCents: brl(207380.34), pgdasAmountInCents: brl(28130.48) },
  { competence: "03/2024", serviceAmountInCents: brl(207559.15), merchandiseAmountInCents: brl(350.00), totalAmountInCents: brl(207909.15), pgdasAmountInCents: brl(28447.03) },
  { competence: "04/2024", serviceAmountInCents: brl(213061.15), merchandiseAmountInCents: 0, totalAmountInCents: brl(213061.15), pgdasAmountInCents: brl(29379.51) },
  { competence: "05/2024", serviceAmountInCents: brl(230650.19), merchandiseAmountInCents: brl(4719.00), totalAmountInCents: brl(235369.19), pgdasAmountInCents: brl(32546.20) },
  { competence: "06/2024", serviceAmountInCents: brl(232351.31), merchandiseAmountInCents: 0, totalAmountInCents: brl(232351.31), pgdasAmountInCents: brl(32541.59) },
  { competence: "07/2024", serviceAmountInCents: brl(220135.96), merchandiseAmountInCents: 0, totalAmountInCents: brl(220135.96), pgdasAmountInCents: brl(31063.98) },
  { competence: "08/2024", serviceAmountInCents: brl(205256.06), merchandiseAmountInCents: brl(5992.00), totalAmountInCents: brl(211248.06), pgdasAmountInCents: brl(29786.61) },
  { competence: "09/2024", serviceAmountInCents: brl(254917.07), merchandiseAmountInCents: brl(1270.00), totalAmountInCents: brl(256187.07), pgdasAmountInCents: brl(36582.70) },
  { competence: "10/2024", serviceAmountInCents: brl(243765.44), merchandiseAmountInCents: 0, totalAmountInCents: brl(243765.44), pgdasAmountInCents: brl(35087.89) },
  { competence: "11/2024", serviceAmountInCents: brl(215330.45), merchandiseAmountInCents: brl(4033.00), totalAmountInCents: brl(219363.45), pgdasAmountInCents: brl(31603.65) },
  { competence: "12/2024", serviceAmountInCents: brl(222876.62), merchandiseAmountInCents: brl(2540.00), totalAmountInCents: brl(225416.62), pgdasAmountInCents: 0 },
  { competence: "01/2025", serviceAmountInCents: brl(215823.10), merchandiseAmountInCents: brl(300.00), totalAmountInCents: brl(216123.10), pgdasAmountInCents: brl(31431.46) },
  { competence: "02/2025", serviceAmountInCents: brl(202251.24), merchandiseAmountInCents: 0, totalAmountInCents: brl(202251.24), pgdasAmountInCents: brl(29447.80) },
  { competence: "03/2025", serviceAmountInCents: brl(203079.17), merchandiseAmountInCents: 0, totalAmountInCents: brl(203079.17), pgdasAmountInCents: brl(29860.27) },
  { competence: "04/2025", serviceAmountInCents: brl(249813.58), merchandiseAmountInCents: 0, totalAmountInCents: brl(249813.58), pgdasAmountInCents: brl(36599.79) },
  { competence: "05/2025", serviceAmountInCents: brl(222039.43), merchandiseAmountInCents: 0, totalAmountInCents: brl(222039.43), pgdasAmountInCents: brl(32444.18) },
  { competence: "06/2025", serviceAmountInCents: brl(209680.69), merchandiseAmountInCents: 0, totalAmountInCents: brl(209680.69), pgdasAmountInCents: brl(30781.43) },
  { competence: "07/2025", serviceAmountInCents: brl(207031.48), merchandiseAmountInCents: 0, totalAmountInCents: brl(207031.48), pgdasAmountInCents: brl(30120.22) },
  { competence: "08/2025", serviceAmountInCents: brl(235214.63), merchandiseAmountInCents: 0, totalAmountInCents: brl(235214.63), pgdasAmountInCents: brl(34218.60) },
  { competence: "09/2025", serviceAmountInCents: brl(221954.98), merchandiseAmountInCents: 0, totalAmountInCents: brl(221954.98), pgdasAmountInCents: brl(32347.65) },
  { competence: "10/2025", serviceAmountInCents: brl(258006.38), merchandiseAmountInCents: 0, totalAmountInCents: brl(258006.38), pgdasAmountInCents: brl(37486.81) },
  { competence: "11/2025", serviceAmountInCents: brl(202944.33), merchandiseAmountInCents: 0, totalAmountInCents: brl(202944.33), pgdasAmountInCents: brl(30640.97) },
  { competence: "12/2025", serviceAmountInCents: brl(250131.65), merchandiseAmountInCents: 0, totalAmountInCents: brl(250131.65), pgdasAmountInCents: brl(36310.04) },
];
