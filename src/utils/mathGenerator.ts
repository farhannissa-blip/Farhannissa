import { DivisionCategoryId, GasingStep, MathQuestion } from '../types/game';

const recentQuestions: string[] = [];
const MAX_RECENT_HISTORY = 35;

// All valid 1-digit ÷ 1-digit pairs that produce a non-zero remainder < divisor
const SINGLE_DIGIT_REMAINDER_PAIRS: [number, number][] = [
  [7, 2],
  [8, 3],
  [9, 4],
  [9, 5],
  [7, 3],
  [8, 5],
  [9, 6],
  [5, 2],
  [9, 2],
  [5, 3],
  [7, 4],
  [6, 4],
  [6, 5],
  [7, 5],
  [7, 6],
  [8, 6],
  [8, 7],
  [9, 7],
  [9, 8],
  [4, 3],
  [5, 4],
  [3, 2],
];

function formatNumberID(num: number): string {
  return num.toLocaleString('id-ID');
}

export function formatAnswerText(
  quotient: number,
  remainder: number,
  categoryRequiresRemainderDisplay: boolean
): string {
  if (remainder > 0 || categoryRequiresRemainderDisplay) {
    return `${formatNumberID(quotient)} sisa ${remainder}`;
  }
  return `${formatNumberID(quotient)}`;
}

function buildGasingExplanation(
  dividend: number,
  divisor: number,
  quotient: number,
  remainder: number
): { steps: GasingStep[]; summary: string } {
  const steps: GasingStep[] = [];
  const exactPart = dividend - remainder;

  if (remainder === 0) {
    const tenMultiple = divisor * 10;
    if (quotient >= 6 && quotient <= 9) {
      const diff = tenMultiple - dividend;
      const diffQuot = diff / divisor;
      steps.push({
        label: 'Langkah 1: Dekatkan ke Kelipatan 10',
        equation: `${formatNumberID(dividend)} = ${formatNumberID(tenMultiple)} - ${formatNumberID(diff)}`,
        explanation: `Ubah ${formatNumberID(dividend)} menjadi pengurangan dari ${formatNumberID(tenMultiple)} (10 × ${divisor}).`,
      });
      steps.push({
        label: 'Langkah 2: Bagi Masing-Masing Bagian',
        equation: `${formatNumberID(tenMultiple)} ÷ ${divisor} = 10  dan  ${formatNumberID(diff)} ÷ ${divisor} = ${diffQuot}`,
        explanation: `Hitung pembagian mudah puluhan dan sisanya.`,
      });
      steps.push({
        label: 'Langkah 3: Kurangkan Hasilnya',
        equation: `10 - ${diffQuot} = ${quotient}`,
        explanation: `Jadi ${formatNumberID(dividend)} ÷ ${divisor} = ${quotient}.`,
      });
    } else if (quotient > 10) {
      const roundQuotient =
        quotient >= 100
          ? Math.floor(quotient / 100) * 100
          : Math.floor(quotient / 10) * 10;
      const restQuotient = quotient - roundQuotient;
      const partA = roundQuotient * divisor;
      const partB = restQuotient * divisor;

      if (restQuotient === 0) {
        steps.push({
          label: 'Langkah 1: Pembagian Kelipatan Bulat',
          equation: `${divisor} × ${formatNumberID(quotient)} = ${formatNumberID(dividend)}`,
          explanation: `Perhatikan bahwa ${formatNumberID(dividend)} adalah kelipatan bulat dari ${divisor}.`,
        });
        steps.push({
          label: 'Langkah 2: Hasil Akhir',
          equation: `${formatNumberID(dividend)} ÷ ${divisor} = ${formatNumberID(quotient)}`,
          explanation: `Jadi hasilnya adalah ${formatNumberID(quotient)} tanpa sisa.`,
        });
      } else {
        steps.push({
          label: 'Langkah 1: Pecah Menjadi Kelipatan Mudah (Metode GASING)',
          equation: `${formatNumberID(dividend)} = ${formatNumberID(partA)} + ${formatNumberID(partB)}`,
          explanation: `Pecah ${formatNumberID(dividend)} menjadi ${formatNumberID(partA)} (${formatNumberID(roundQuotient)} × ${divisor}) dan ${formatNumberID(partB)}.`,
        });
        steps.push({
          label: 'Langkah 2: Bagi Tiap Kelompok',
          equation: `${formatNumberID(partA)} ÷ ${divisor} = ${formatNumberID(roundQuotient)}   |   ${formatNumberID(partB)} ÷ ${divisor} = ${formatNumberID(restQuotient)}`,
          explanation: `Bagi masing-masing bagian dengan ${divisor}.`,
        });
        steps.push({
          label: 'Langkah 3: Jumlahkan Hasil Bagi',
          equation: `${formatNumberID(roundQuotient)} + ${formatNumberID(restQuotient)} = ${formatNumberID(quotient)}`,
          explanation: `Jadi ${formatNumberID(dividend)} ÷ ${divisor} = ${formatNumberID(quotient)}.`,
        });
      }
    } else {
      steps.push({
        label: 'Langkah 1: Ingat Pasangan Perkalian GASING',
        equation: `${divisor} × ${quotient} = ${formatNumberID(dividend)}`,
        explanation: `Cari bilangan yang jika dikali ${divisor} hasilnya ${formatNumberID(dividend)}.`,
      });
      steps.push({
        label: 'Langkah 2: Tentukan Hasil Bagi',
        equation: `${formatNumberID(dividend)} ÷ ${divisor} = ${quotient}`,
        explanation: `Karena ${divisor} × ${quotient} = ${formatNumberID(dividend)}, maka hasilnya ${quotient} tanpa sisa.`,
      });
    }

    return {
      steps,
      summary: `Jadi ${formatNumberID(dividend)} ÷ ${divisor} = ${formatNumberID(quotient)}.`,
    };
  } else {
    // Division with remainder
    if (dividend < 10) {
      // Special kid-friendly Captain Astro GASING grouping steps for 1-digit ÷ 1-digit
      const sumString = Array.from({ length: quotient }, () => divisor).join(' + ');
      steps.push({
        label: 'Langkah 1: Bentuk Kelompok Sama Banyak (Captain Astro GASING)',
        equation: `${quotient} kelompok × ${divisor} bola = ${exactPart}`,
        explanation: `Bagikan ${dividend} bola energi ke dalam kelompok berisi ${divisor} bola: ${sumString} = ${exactPart}.`,
      });
      steps.push({
        label: 'Langkah 2: Hitung Bola Energi yang Tersisa',
        equation: `${dividend} - ${exactPart} = ${remainder}`,
        explanation: `Tersisa ${remainder} bola yang tidak cukup membentuk kelompok berisi ${divisor} (karena ${remainder} < ${divisor}).`,
      });
      steps.push({
        label: 'Langkah 3: Kesimpulan Hasil Bagi & Sisa',
        equation: `${dividend} ÷ ${divisor} = ${quotient} sisa ${remainder}`,
        explanation: `Ada ${quotient} kelompok utuh dan sisa ${remainder} bola energi.`,
      });
    } else if (quotient > 10) {
      const roundQuot =
        quotient >= 100
          ? Math.floor(quotient / 100) * 100
          : Math.floor(quotient / 10) * 10;
      const subQuot = quotient - roundQuot;
      const partA = roundQuot * divisor;
      const partB = subQuot * divisor;

      steps.push({
        label: 'Langkah 1: Pecah Kelipatan Terdekat (Metode GASING)',
        equation: `${divisor} × ${formatNumberID(quotient)} = ${formatNumberID(partA)} + ${formatNumberID(partB)} = ${formatNumberID(exactPart)}`,
        explanation: `Kelipatan ${divisor} terbesar yang tidak melebihi ${formatNumberID(dividend)} adalah ${formatNumberID(exactPart)}.`,
      });
      steps.push({
        label: 'Langkah 2: Kurangkan untuk Mencari Sisa',
        equation: `${formatNumberID(dividend)} - ${formatNumberID(exactPart)} = ${remainder}`,
        explanation: `Sisa pembagian adalah ${remainder} (sisa ${remainder} < pembagi ${divisor}).`,
      });
      steps.push({
        label: 'Langkah 3: Gabungkan Hasil Bagi dan Sisa',
        equation: `${formatNumberID(dividend)} ÷ ${divisor} = ${formatNumberID(quotient)} sisa ${remainder}`,
        explanation: `Hasil bagi = ${formatNumberID(quotient)} dan Sisa = ${remainder}.`,
      });
    } else {
      steps.push({
        label: 'Langkah 1: Cari Kelipatan Terdekat',
        equation: `${divisor} × ${formatNumberID(quotient)} = ${formatNumberID(exactPart)}`,
        explanation: `Cari hasil kali ${divisor} terbesar yang ≤ ${formatNumberID(dividend)}, yaitu ${formatNumberID(exactPart)}.`,
      });
      steps.push({
        label: 'Langkah 2: Kurangkan untuk Mencari Sisa',
        equation: `${formatNumberID(dividend)} - ${formatNumberID(exactPart)} = ${remainder}`,
        explanation: `Sisa pembagian adalah ${remainder} (sisa ${remainder} < pembagi ${divisor}).`,
      });
      steps.push({
        label: 'Langkah 3: Gabungkan Hasil Bagi dan Sisa',
        equation: `${formatNumberID(dividend)} ÷ ${divisor} = ${formatNumberID(quotient)} sisa ${remainder}`,
        explanation: `Hasil bagi = ${formatNumberID(quotient)} dan Sisa = ${remainder}.`,
      });
    }

    return {
      steps,
      summary: `Jadi hasilnya ${formatNumberID(quotient)} sisa ${remainder}.`,
    };
  }
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateMathQuestion(
  categoryId: DivisionCategoryId,
  level: number = 1
): MathQuestion {
  let dividend = 8;
  let divisor = 3;
  let quotient = 2;
  let remainder = 2;

  const difficultyFactor = Math.min(1, (level - 1) / 25);

  for (let attempt = 0; attempt < 60; attempt++) {
    if (categoryId === 1) {
      // NEW Category 1: 1-digit ÷ 1-digit WITH REMAINDER
      const pair =
        SINGLE_DIGIT_REMAINDER_PAIRS[randInt(0, SINGLE_DIGIT_REMAINDER_PAIRS.length - 1)];
      dividend = pair[0];
      divisor = pair[1];
      quotient = Math.floor(dividend / divisor);
      remainder = dividend % divisor;
    } else if (categoryId === 2) {
      // Category 2: 2 angka ÷ 1 digit tanpa sisa
      divisor = randInt(2, 9);
      const minQ = Math.max(2, Math.ceil(10 / divisor));
      const maxQ = Math.min(25, Math.floor(99 / divisor));
      quotient = randInt(minQ, maxQ);
      remainder = 0;
      dividend = divisor * quotient;
    } else if (categoryId === 3) {
      // Category 3: 2 angka ÷ 1 digit dengan sisa
      divisor = randInt(3, 9);
      const minQ = Math.max(2, Math.ceil(11 / divisor));
      const maxQ = Math.min(18, Math.floor((99 - (divisor - 1)) / divisor));
      quotient = randInt(minQ, maxQ);
      remainder = randInt(1, divisor - 1);
      dividend = divisor * quotient + remainder;
    } else if (categoryId === 4) {
      // Category 4: 3 angka ÷ 1 digit (campuran)
      divisor = randInt(3, 9);
      const wantRemainder = Math.random() < 0.45;
      remainder = wantRemainder ? randInt(1, divisor - 1) : 0;
      const minQ = Math.ceil((100 - remainder) / divisor);
      const maxQ = Math.floor((999 - remainder) / divisor);
      const scaledMaxQ = Math.floor(minQ + (maxQ - minQ) * (0.4 + 0.6 * difficultyFactor));
      quotient = randInt(minQ, Math.max(minQ + 10, scaledMaxQ));
      dividend = divisor * quotient + remainder;
    } else if (categoryId === 5) {
      // Category 5: 4 angka ÷ 1 digit (campuran)
      divisor = randInt(3, 9);
      const wantRemainder = Math.random() < 0.45;
      remainder = wantRemainder ? randInt(1, divisor - 1) : 0;
      const minQ = Math.ceil((1000 - remainder) / divisor);
      const maxQ = Math.floor((4999 - remainder) / divisor);
      quotient = randInt(minQ, maxQ);
      dividend = divisor * quotient + remainder;
    } else if (categoryId === 6) {
      // Category 6: 3 angka ÷ 2 digit (campuran)
      divisor = randInt(11, 24);
      const wantRemainder = Math.random() < 0.45;
      remainder = wantRemainder ? randInt(1, divisor - 1) : 0;
      const minQ = Math.max(10, Math.ceil((120 - remainder) / divisor));
      const maxQ = Math.floor((999 - remainder) / divisor);
      quotient = randInt(minQ, Math.max(minQ + 2, maxQ));
      dividend = divisor * quotient + remainder;
    } else {
      // Category 7: 4 angka ÷ 2 digit (campuran)
      divisor = randInt(11, 25);
      const wantRemainder = Math.random() < 0.45;
      remainder = wantRemainder ? randInt(1, divisor - 1) : 0;
      const minQ = Math.max(85, Math.ceil((1000 - remainder) / divisor));
      const maxQ = Math.min(250, Math.floor((5000 - remainder) / divisor));
      quotient = randInt(minQ, Math.max(minQ + 5, maxQ));
      dividend = divisor * quotient + remainder;
    }

    const verifiedQuotient = Math.floor(dividend / divisor);
    const verifiedRemainder = dividend % divisor;
    const key = `${categoryId}:${dividend}:${divisor}`;

    // For Category 1, history window is smaller so 22 pairs don't exhaust
    const recentSlice =
      categoryId === 1 ? recentQuestions.slice(-12) : recentQuestions;

    if (
      verifiedQuotient === quotient &&
      verifiedRemainder === remainder &&
      remainder >= 0 &&
      remainder < divisor &&
      !recentSlice.includes(key)
    ) {
      recentQuestions.push(key);
      if (recentQuestions.length > MAX_RECENT_HISTORY) {
        recentQuestions.shift();
      }
      break;
    }
  }

  quotient = Math.floor(dividend / divisor);
  remainder = dividend % divisor;
  const hasRemainder = remainder > 0;
  const showRemainderInChoices =
    categoryId !== 2 && (hasRemainder || categoryId === 1 || categoryId === 3);

  const correctOptionText = formatAnswerText(quotient, remainder, showRemainderInChoices);

  // Build 3 distinct plausible distractors
  const distractorsMap = new Map<string, { quotient: number; remainder: number }>();

  const candidateOffsets = [
    { dq: 1, dr: 0 },
    { dq: -1, dr: 0 },
    { dq: 0, dr: remainder > 0 ? Math.max(1, ((remainder + 1) % divisor) || 1) : 1 },
    { dq: 1, dr: remainder > 0 ? Math.max(1, remainder - 1) : 2 },
    { dq: -1, dr: remainder > 0 ? Math.min(divisor - 1, remainder + 1) : 1 },
    { dq: 2, dr: 0 },
    { dq: -2, dr: 0 },
  ];

  for (const offset of candidateOffsets) {
    if (distractorsMap.size >= 3) break;
    const candQ = Math.max(1, quotient + offset.dq);
    let candR = showRemainderInChoices ? offset.dr : 0;
    if (showRemainderInChoices && offset.dr === 0) {
      candR = remainder;
    }
    if (candR >= divisor) {
      candR = Math.max(1, divisor - 1);
    }
    if (categoryId === 1 && candR === 0) {
      candR = 1;
    }
    if (candQ === quotient && candR === remainder) continue;

    const text = formatAnswerText(candQ, candR, showRemainderInChoices);
    if (text !== correctOptionText && !distractorsMap.has(text)) {
      distractorsMap.set(text, { quotient: candQ, remainder: candR });
    }
  }

  let fallbackStep = 1;
  while (distractorsMap.size < 3) {
    const candQ = quotient + fallbackStep;
    const candR = showRemainderInChoices ? Math.max(1, ((remainder + fallbackStep) % divisor) || 1) : 0;
    const text = formatAnswerText(candQ, candR, showRemainderInChoices);
    if (text !== correctOptionText && !distractorsMap.has(text)) {
      distractorsMap.set(text, { quotient: candQ, remainder: candR });
    }
    fallbackStep++;
  }

  const rawOptions = [
    {
      text: correctOptionText,
      quotient,
      remainder,
      isCorrect: true,
    },
    ...Array.from(distractorsMap.entries()).map(([text, val]) => ({
      text,
      quotient: val.quotient,
      remainder: val.remainder,
      isCorrect: false,
    })),
  ];

  for (let i = rawOptions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rawOptions[i], rawOptions[j]] = [rawOptions[j], rawOptions[i]];
  }

  const prefixes = ['A', 'B', 'C', 'D'];
  const allOptions = rawOptions.map((opt, idx) => ({
    ...opt,
    labelPrefix: prefixes[idx] || String(idx + 1),
  }));

  const { steps, summary } = buildGasingExplanation(dividend, divisor, quotient, remainder);

  return {
    id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    categoryId,
    dividend,
    divisor,
    quotient,
    remainder,
    hasRemainder,
    displayText: `${formatNumberID(dividend)} ÷ ${divisor} = ?`,
    correctOptionText,
    options: allOptions,
    gasingSteps: steps,
    gasingSummary: summary,
    visualGroupCount: Math.min(divisor, 10),
    visualItemsPerGroup: Math.min(quotient, 12),
    visualRemainder: remainder,
  };
}
