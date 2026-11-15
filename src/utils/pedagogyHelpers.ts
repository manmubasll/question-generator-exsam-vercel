import { ExamData, MultipleChoiceQuestion, EssayQuestion } from "../types";

export interface ExamStatistics {
  totalQuestions: number;
  totalPg: number;
  totalEssay: number;
  totalTf: number;
  totalMatching: number;
  totalLiteracy: number;
  cognitiveStats: {
    l1Count: number;
    l1Percent: number;
    l2Count: number;
    l2Percent: number;
    l3Count: number;
    l3Percent: number;
  };
  difficultyStats: {
    mudahCount: number;
    mudahPercent: number;
    sedangCount: number;
    sedangPercent: number;
    sukarCount: number;
    sukarPercent: number;
  };
  keyDistribution: Record<string, { count: number; percent: number }>;
}

/**
 * Infer educational competency (CP/KD) based on subject and grade
 */
function getDefaultCompetency(subjectName: string, grade: number, gradeLevel: string, isArabic: boolean): string {
  const s = subjectName.toLowerCase();

  if (isArabic) {
    return `فَهْمُ وَتَحْلِيلُ النُّصُوصِ اللُّغَوِيَّةِ وَالْمَفَاهِيمِ الْأَسَاسِيَّةِ لِمَادَّةِ (${subjectName}) لِلصَّفِّ ${grade}`;
  }

  if (s.includes("qur'an") || s.includes("hadis") || s.includes("hadits")) {
    return `Memahami, menerapkan, dan menganalisis makna serta kandungan ayat Al-Qur'an dan Hadis terkait akhlak dan ibadah kelas ${grade}`;
  }
  if (s.includes("akidah") || s.includes("akhlak")) {
    return `Menganalisis prinsip-prinsip akidah Islamiyah, sifat-sifat Allah, serta penerapan akhlak mulia dalam kehidupan sehari-hari kelas ${grade}`;
  }
  if (s.includes("fikih") || s.includes("fiqih")) {
    return `Menganalisis dan mempraktikkan ketentuan hukum Islam (ibadah dan muamalah) sesuai syariat Islam kelas ${grade}`;
  }
  if (s.includes("ski") || s.includes("sejarah kebudayaan")) {
    return `Menganalisis sejarah peradaban Islam, strategi dakwah Rasulullah SAW, Khulafaur Rasyidin, dan perkembangan Islam kelas ${grade}`;
  }
  if (s.includes("bahasa indonesia") || s.includes("indonesia")) {
    return `Memahami, mengevaluasi informasi, dan menganalisis gagasan pikiran serta struktur kebahasaan teks fiksi/nonfiksi kelas ${grade}`;
  }
  if (s.includes("bahasa inggris") || s.includes("english")) {
    return `Analyze and apply language elements, communicative purpose, and text structures of transactional/interpersonal texts Grade ${grade}`;
  }
  if (s.includes("matematika") || s.includes("math")) {
    return `Memahami konsep bilangan, aljabar, geometri, serta menerapkan pemodelan matematika dalam memecahkan masalah kontekstual kelas ${grade}`;
  }
  if (s.includes("ipa") || s.includes("biologi") || s.includes("fisika") || s.includes("kimia")) {
    return `Menganalisis fenomena sains, sistem organisasi kehidupan, interaksi makhluk hidup, materi serta perubahannya kelas ${grade}`;
  }
  if (s.includes("ips") || s.includes("sejarah") || s.includes("geografi") || s.includes("ekonomi")) {
    return `Menganalisis dinamika interaksi keruangan, interaksi sosial budaya, aktivitas ekonomi, dan sejarah kebangsaan kelas ${grade}`;
  }
  if (s.includes("pkn") || s.includes("pancasila")) {
    return `Menganalisis nilai-nilai Pancasila, konstitusi negara, norma hukum, serta kedaulatan Negara Kesatuan Republik Indonesia kelas ${grade}`;
  }

  return `Menguasai capaian pembelajaran dan menganalisis kompetensi esensial materi pokok ${subjectName} untuk Kelas ${grade} (${gradeLevel})`;
}

/**
 * Infer item indicator based on question text and passage context
 */
function inferIndicator(
  qText: string,
  subjectName: string,
  hasPassage: boolean,
  isEssay: boolean,
  isArabic: boolean
): string {
  if (isArabic) {
    if (hasPassage) {
      return `مِنْ خِلَالِ النَّصِّ الْمَقْرُوءِ، يَسْتَطِيعُ الطَّالِبُ اسْتِخْرَاجَ الْفِكْرَةِ الرَّئِيسِيَّةِ وَتَحْلِيلَ الْمَعْنَى الْمَقْصُودِ بِدِقَّةٍ.`;
    }
    return isEssay
      ? `يَسْتَطِيعُ الطَّالِبُ بَيَانَ وَشَرْحَ الْمَفَاهِيمِ الْأَسَاسِيَّةِ مَعَ إِعْطَاءِ الْأَمْثِلَةِ الْمُنَاسِبَةِ فِي الْحَيَاةِ.`
      : `يَسْتَطِيعُ الطَّالِبُ تَحْدِيدَ الْإِجَابَةِ الصَّحِيحَةِ الْمُتَعَلِّقَةِ بِقَوَاعِدِ وَمَفَاهِيمِ الدَّرْسِ بِشَكْلٍ صَحِيحٍ.`;
  }

  if (hasPassage) {
    return "Disajikan kutipan teks wacana bacaan, peserta didik dapat menganalisis informasi tersurat/tersirat dan menentukan pesan pokok teks dengan tepat.";
  }

  const lower = qText.toLowerCase();
  if (lower.includes("hitung") || lower.includes("rumus") || lower.includes("berapa") || lower.includes("nilai")) {
    return "Disajikan besaran nilai atau persoalan hitungan, peserta didik dapat melakukan perhitungan dan menentukan hasil yang benar.";
  }
  if (lower.includes("mengapa") || lower.includes("faktor") || lower.includes("penyebab") || lower.includes("analis")) {
    return "Disajikan ilustrasi permasalahan kontekstual, peserta didik dapat menganalisis faktor penyebab dan implikasinya secara kritis.";
  }
  if (lower.includes("contoh") || lower.includes("penerapan") || lower.includes("sikap") || lower.includes("tindakan")) {
    return "Disajikan situasi nyata dalam kehidupan sehari-hari, peserta didik dapat menentukan contoh penerapan konsep yang paling tepat.";
  }
  if (lower.includes("urutan") || lower.includes("tahapan") || lower.includes("langkah")) {
    return "Disajikan rangkaian proses atau prosedur, peserta didik dapat mengurutkan tahapan secara kronologis dan tepat.";
  }
  if (isEssay) {
    return "Disajikan permasalahan komprehensif, peserta didik dapat menguraikan argumentasi, konsep pokok, dan solusi aplikatif secara terstruktur.";
  }

  return `Disajikan stimulus/pertanyaan terkait materi ${subjectName}, peserta didik dapat mengidentifikasi konsep yang tepat secara mandiri.`;
}

/**
 * Infer cognitive level and difficulty based on question index, keywords, and Bloom's taxonomy
 */
function inferCognitiveLevelAndDifficulty(
  qText: string,
  index: number,
  isEssay: boolean
): { cognitiveLevel: string; difficulty: 'Mudah' | 'Sedang' | 'Sukar' } {
  const lower = qText.toLowerCase();

  // Explicit HOTS keywords
  const isHots =
    lower.includes("analis") ||
    lower.includes("evaluasi") ||
    lower.includes("simpulkan") ||
    lower.includes("bandingkan") ||
    lower.includes("kritik") ||
    lower.includes("rumuskan") ||
    lower.includes("kembangkan") ||
    lower.includes("mengapa") ||
    lower.includes("حلّل") ||
    lower.includes("استنتج") ||
    lower.includes("قارن");

  // Basic Recall keywords
  const isRecall =
    lower.includes("sebutkan") ||
    lower.includes("siapakah") ||
    lower.includes("kapan") ||
    lower.includes("arti dari") ||
    lower.includes("apa yang dimaksud") ||
    lower.includes("di manakah") ||
    lower.includes("اذكر") ||
    lower.includes("ما معنى") ||
    lower.includes("مَن هو");

  if (isEssay) {
    // Essays are weighted towards application (L2) and HOTS (L3)
    if (index % 3 === 0 || isHots) {
      return { cognitiveLevel: "L3 (Penalaran / C4-C6)", difficulty: "Sukar" };
    }
    if (index % 3 === 1) {
      return { cognitiveLevel: "L2 (Aplikasi / C3)", difficulty: "Sedang" };
    }
    return { cognitiveLevel: "L1 (Pemahaman / C2)", difficulty: "Sedang" };
  }

  // Multiple Choice Questions Distribution (~30% L1, ~50% L2, ~20% L3)
  if (isHots) {
    return { cognitiveLevel: "L3 (Penalaran / C4-C5)", difficulty: "Sukar" };
  }
  if (isRecall) {
    return { cognitiveLevel: "L1 (Pengetahuan & Pemahaman / C1-C2)", difficulty: "Mudah" };
  }

  const mod = (index + 1) % 5;
  if (mod === 1 || mod === 2) {
    return { cognitiveLevel: "L1 (Pengetahuan & Pemahaman / C1-C2)", difficulty: "Mudah" };
  }
  if (mod === 3 || mod === 4) {
    return { cognitiveLevel: "L2 (Aplikasi & Penerapan / C3)", difficulty: "Sedang" };
  }
  return { cognitiveLevel: "L3 (Penalaran & Analisis / C4-C5)", difficulty: "Sukar" };
}

/**
 * Ensures all MultipleChoiceQuestion and EssayQuestion objects contain valid pedagogical fields
 */
export function enrichExamPedagogy(examData: ExamData): ExamData {
  const { metadata, readingPassages = [] } = examData;
  const isArabic =
    metadata.examLanguage === "ar" ||
    metadata.subjectName.toLowerCase().includes("bahasa arab") ||
    metadata.subjectName.toLowerCase().includes("arab");

  const defaultCompetency = getDefaultCompetency(
    metadata.subjectName,
    metadata.grade,
    metadata.gradeLevel,
    isArabic
  );

  const enrichedPg: MultipleChoiceQuestion[] = (examData.multipleChoiceQuestions || []).map((q, idx) => {
    const hasPassage = !!(
      q.readingPassageId ||
      readingPassages.some((p) => Array.isArray(p.questionNumbers) && p.questionNumbers.includes(q.number))
    );

    const passage = readingPassages.find(
      (p) => p.id === q.readingPassageId || (Array.isArray(p.questionNumbers) && p.questionNumbers.includes(q.number))
    );

    const { cognitiveLevel, difficulty } = inferCognitiveLevelAndDifficulty(q.questionText || "", idx, false);

    const material =
      q.material ||
      (passage ? passage.title : `${metadata.subjectName} - Materi Pokok Pembelajaran`);

    return {
      ...q,
      basicCompetency: q.basicCompetency || defaultCompetency,
      material,
      indicator: q.indicator || inferIndicator(q.questionText || "", metadata.subjectName, hasPassage, false, isArabic),
      cognitiveLevel: q.cognitiveLevel || cognitiveLevel,
      difficulty: q.difficulty || difficulty,
      scoreWeight: q.scoreWeight || 1,
    };
  });

  const enrichedEssay: EssayQuestion[] = (examData.essayQuestions || []).map((eq, idx) => {
    const hasPassage = !!(
      eq.readingPassageId ||
      readingPassages.some((p) => Array.isArray(p.essayQuestionNumbers) && p.essayQuestionNumbers.includes(eq.number))
    );

    const passage = readingPassages.find(
      (p) =>
        p.id === eq.readingPassageId ||
        (Array.isArray(p.essayQuestionNumbers) && p.essayQuestionNumbers.includes(eq.number))
    );

    const { cognitiveLevel, difficulty } = inferCognitiveLevelAndDifficulty(eq.questionText || "", idx, true);

    const material =
      eq.material ||
      (passage ? passage.title : `${metadata.subjectName} - Uraian dan Analisis Materi`);

    return {
      ...eq,
      basicCompetency: eq.basicCompetency || defaultCompetency,
      material,
      indicator: eq.indicator || inferIndicator(eq.questionText || "", metadata.subjectName, hasPassage, true, isArabic),
      cognitiveLevel: eq.cognitiveLevel || cognitiveLevel,
      difficulty: eq.difficulty || difficulty,
      maxScore: eq.maxScore || 10,
    };
  });

  const enrichedTrueFalse = (examData.trueFalseQuestions || []).map((tf, idx) => {
    return {
      ...tf,
      basicCompetency: tf.basicCompetency || defaultCompetency,
      material: tf.material || `${metadata.subjectName} - Verifikasi Konseptual`,
      indicator: tf.indicator || (isArabic
        ? "يَسْتَطِيعُ الطَّالِبُ التَّمْيِيزَ بَيْنَ الْعِبَارَاتِ الصَّحِيحَةِ وَالْخَاطِئَةِ بِدِقَّةٍ."
        : "Disajikan sejumlah pernyataan konseptual, peserta didik dapat memverifikasi kebenaran (Benar/Salah) masing-masing pernyataan dengan tepat."),
      cognitiveLevel: tf.cognitiveLevel || (idx % 2 === 0 ? "L1 (Pengetahuan/C2)" : "L2 (Aplikasi/C3)"),
      difficulty: tf.difficulty || (idx % 2 === 0 ? "Mudah" : "Sedang"),
      scoreWeight: tf.scoreWeight || tf.statements?.length || 2,
    };
  });

  const enrichedMatching = (examData.matchingQuestions || []).map((m, idx) => {
    return {
      ...m,
      basicCompetency: m.basicCompetency || defaultCompetency,
      material: m.material || `${metadata.subjectName} - Relasi Konsep dan Definisi`,
      indicator: m.indicator || (isArabic
        ? "يَسْتَطِيعُ الطَّالِبُ الرَّبْطَ وَالتَّوْفِيقَ بَيْنَ الْمَفَاهِيمِ وَتَعْرِيفَاتِهَا الْمُنَاسِبَةِ."
        : "Disajikan daftar konsep pada kolom kiri dan pilihan pada kolom kanan, peserta didik dapat menjodohkan pasangan yang tepat."),
      cognitiveLevel: m.cognitiveLevel || "L2 (Aplikasi & Relasi / C3)",
      difficulty: m.difficulty || "Sedang",
      scoreWeight: m.scoreWeight || m.premises?.length || 3,
    };
  });

  const enrichedLiteracy = (examData.literacyQuestions || []).map((lit, idx) => {
    return {
      ...lit,
      basicCompetency: lit.basicCompetency || defaultCompetency,
      material: lit.material || `${metadata.subjectName} - Literasi Teks & Analisis Data`,
      indicator: lit.indicator || (isArabic
        ? "مِنْ خِلَالِ تَحْلِيلِ النَّصِّ وَالْبَيَانَاتِ الْمُعْطَاةِ، يَسْتَطِيعُ الطَّالِبُ اسْتِخْلَاصَ النَّتَائِجِ بِدِقَّةٍ."
        : "Disajikan stimulus berbasis data statistik/infografis kontekstual, peserta didik dapat menelaah informasi tersirat dan menarik kesimpulan berbasis data."),
      cognitiveLevel: lit.cognitiveLevel || "L3 (Penalaran, Interpretasi & Evaluasi Data / C4-C5)",
      difficulty: lit.difficulty || "Sukar",
      scoreWeight: lit.scoreWeight || 2,
    };
  });

  return {
    ...examData,
    multipleChoiceQuestions: enrichedPg,
    essayQuestions: enrichedEssay,
    trueFalseQuestions: enrichedTrueFalse,
    matchingQuestions: enrichedMatching,
    literacyQuestions: enrichedLiteracy,
  };
}

/**
 * Calculates statistical distribution for Exam Blueprint and Item Analysis
 */
export function calculateExamStatistics(examData: ExamData): ExamStatistics {
  const pgs = examData.multipleChoiceQuestions || [];
  const essays = examData.essayQuestions || [];
  const trueFalses = examData.trueFalseQuestions || [];
  const matchings = examData.matchingQuestions || [];
  const literacies = examData.literacyQuestions || [];

  const allQuestions: any[] = [...pgs, ...trueFalses, ...matchings, ...literacies, ...essays];
  const total = allQuestions.length || 1;

  let l1 = 0;
  let l2 = 0;
  let l3 = 0;

  let mudah = 0;
  let sedang = 0;
  let sukar = 0;

  const keyCount: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };

  allQuestions.forEach((q) => {
    const cog = (q.cognitiveLevel || "").toUpperCase();
    if (cog.includes("L1") || cog.includes("C1") || cog.includes("C2") || cog.includes("PENGETAHUAN")) {
      l1++;
    } else if (cog.includes("L3") || cog.includes("C4") || cog.includes("C5") || cog.includes("C6") || cog.includes("PENALARAN") || cog.includes("HOTS")) {
      l3++;
    } else {
      l2++;
    }

    const diff = (q.difficulty || "").toLowerCase();
    if (diff.includes("mudah")) {
      mudah++;
    } else if (diff.includes("sukar") || diff.includes("sulit")) {
      sukar++;
    } else {
      sedang++;
    }
  });

  pgs.forEach((q) => {
    const k = (q.correctAnswer || "A").trim().toUpperCase();
    if (keyCount[k] !== undefined) {
      keyCount[k]++;
    } else {
      keyCount[k] = (keyCount[k] || 0) + 1;
    }
  });

  const totalPgCount = pgs.length || 1;
  const keyDist: Record<string, { count: number; percent: number }> = {};
  Object.keys(keyCount).forEach((k) => {
    keyDist[k] = {
      count: keyCount[k],
      percent: Math.round((keyCount[k] / totalPgCount) * 100),
    };
  });

  return {
    totalQuestions: allQuestions.length,
    totalPg: pgs.length,
    totalEssay: essays.length,
    totalTf: trueFalses.length,
    totalMatching: matchings.length,
    totalLiteracy: literacies.length,
    cognitiveStats: {
      l1Count: l1,
      l1Percent: Math.round((l1 / total) * 100),
      l2Count: l2,
      l2Percent: Math.round((l2 / total) * 100),
      l3Count: l3,
      l3Percent: Math.round((l3 / total) * 100),
    },
    difficultyStats: {
      mudahCount: mudah,
      mudahPercent: Math.round((mudah / total) * 100),
      sedangCount: sedang,
      sedangPercent: Math.round((sedang / total) * 100),
      sukarCount: sukar,
      sukarPercent: Math.round((sukar / total) * 100),
    },
    keyDistribution: keyDist,
  };
}
