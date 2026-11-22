import express from "express";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

// Set high limit for uploaded material images and PDF documents
app.use(express.json({ limit: "4mb" }));
app.use(express.urlencoded({ extended: true, limit: "4mb" }));

// Lazy initialize Gemini AI client
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not configured.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Parse Gemini JSON safely, including responses cut off at the end of an object/array.
function safeParseGeminiJson(raw: string): any {
  let cleaned = String(raw || "").trim();
  const fence = String.fromCharCode(96).repeat(3);
  if (cleaned.startsWith(fence)) cleaned = cleaned.slice(3).replace(/^json\s*/i, "").trim();
  const closingFence = cleaned.lastIndexOf(fence);
  if (closingFence >= 0) cleaned = cleaned.slice(0, closingFence).trim();
  const firstBrace = cleaned.indexOf("{");
  if (firstBrace > 0) cleaned = cleaned.slice(firstBrace);
  try { return JSON.parse(cleaned); } catch {
    let inString = false, escaped = false;
    const closers: string[] = [];
    for (const ch of cleaned) {
      if (inString) {
        if (escaped) escaped = false;
        else if (ch === "\\") escaped = true;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') inString = true;
      else if (ch === "{") closers.push("}");
      else if (ch === "[") closers.push("]");
      else if ((ch === "}" || ch === "]") && closers.length) closers.pop();
    }
    let recovered = cleaned;
    if (inString) { if (escaped) recovered = recovered.slice(0, -1); recovered += '"'; }
    recovered = recovered.replace(/,\s*$/, "") + closers.reverse().join("");
    try { return JSON.parse(recovered); }
    catch (error) { throw new Error("Respons AI bukan JSON lengkap atau terpotong dan tidak dapat dipulihkan: " + (error as Error).message); }
  }
}

// Normalization & Strict Count Helpers
function normalizeOptions(
  options: any[],
  targetOptionCount: number,
  isArabic: boolean
): { key: string; text: string }[] {
  const standardKeys = ["A", "B", "C", "D", "E"].slice(0, targetOptionCount);
  const arabicFallbacks: Record<string, string> = {
    A: "الْإِجَابَةُ الصَّحِيحَةُ الْأُولَى",
    B: "الْخِيَارُ الْبَدِيلُ الثَّانِي",
    C: "الْخِيَارُ الْبَدِيلُ الثَّالِثُ",
    D: "كُلُّ مَا سَبَقَ صَحِيحٌ",
    E: "لَا شَيْءَ مِمَّا سَبَقَ",
  };
  const indonesianFallbacks: Record<string, string> = {
    A: "Pernyataan atau jawaban pertama",
    B: "Pilihan jawaban alternatif kedua",
    C: "Pilihan jawaban alternatif ketiga",
    D: "Semua jawaban di atas benar",
    E: "Tidak ada jawaban yang benar",
  };

  const resultMap: Record<string, string> = {};
  if (Array.isArray(options)) {
    options.forEach((opt, idx) => {
      if (!opt) return;
      const keyUpper = String(opt.key || standardKeys[idx] || "").trim().toUpperCase();
      const text = String(opt.text || "").trim();
      if (keyUpper) {
        resultMap[keyUpper] = text;
      }
    });
  }

  return standardKeys.map((k, idx) => {
    let text = resultMap[k];
    if (!text && options && options[idx] && options[idx].text) {
      text = String(options[idx].text).trim();
    }
    if (!text) {
      text = isArabic
        ? arabicFallbacks[k] || "خِيَارٌ بَدِيلٌ"
        : indonesianFallbacks[k] || "Pilihan alternatif";
    }
    return {
      key: k,
      text,
    };
  });
}

function normalizeCorrectAnswer(answer: string, targetOptionCount: number): string {
  const allowed = ["A", "B", "C", "D", "E"].slice(0, targetOptionCount);
  const upper = String(answer || "").trim().toUpperCase();
  if (allowed.includes(upper)) {
    return upper;
  }
  const arabicMap: Record<string, string> = {
    "أ": "A",
    "ب": "B",
    "ج": "C",
    "د": "D",
    "هـ": "E",
    "ه": "E",
  };
  if (arabicMap[upper] && allowed.includes(arabicMap[upper])) {
    return arabicMap[upper];
  }
  return "A";
}

function createFallbackPgQuestion(
  num: number,
  subject: string,
  grade: number,
  optCount: number,
  isArabic: boolean
) {
  const letters = ["A", "B", "C", "D", "E"].slice(0, optCount);
  if (isArabic) {
    return {
      number: num,
      questionText: `مَا هُوَ الْأَمْرُ الْأَسَاسِيُّ الْمُتَعَلِّقُ بِمَفَاهِيمِ مَادَّةِ (${subject}) لِطُلَّابِ الصَّفِّ ${grade}؟`,
      options: letters.map((k, i) => ({
        key: k,
        text:
          i === 0
            ? "تَطْبِيقُ الْقِيَمِ الْفَاضِلَةِ وَالْأَحْكَامِ الصَّحِيحَةِ فِي الْحَيَاةِ"
            : `الْخِيَارُ الْبَدِيلُ ${i + 1}`,
      })),
      correctAnswer: "A",
      explanation: "هَذَا هُوَ الْخِيَارُ الْأَصَحُّ الْمُتَوَافِقُ مَعَ مَفَاهِيمِ الدَّرْسِ.",
    };
  }
  return {
    number: num,
    questionText: `Manakah dari pernyataan berikut yang paling tepat berkaitan dengan konsep materi pokok ${subject} Kelas ${grade}?`,
    options: letters.map((k, i) => ({
      key: k,
      text:
        i === 0
          ? "Memahami prinsip dasar materi dan mengimplementasikannya dalam kehidupan nyata"
          : `Pernyataan pilihan alternatif ${i + 1}`,
    })),
    correctAnswer: "A",
    explanation:
      "Pilihan A mencerminkan pemahaman konsep dasar dan implementasi nyata yang sesuai dengan kurikulum.",
  };
}

function createFallbackEssayQuestion(
  num: number,
  subject: string,
  grade: number,
  isArabic: boolean
) {
  if (isArabic) {
    return {
      number: num,
      questionText: `اشْرَحْ بِإِيجَازٍ أَهَمِّيَّةَ تَعَلُّمِ مَادَّةِ (${subject}) وَكَيْفِيَّةَ تَطْبِيقِهَا فِي الْحَيَاةِ الْيَوْمِيَّةِ لِطُلَّابِ الصَّفِّ ${grade}!`,
      modelAnswer:
        "يَكْتُبُ الطَّالِبُ فِقْرَةً مُتَرَابِطَةً تُوَضِّحُ الْقِيَمَ الْمُسْتَفَادَةَ مِنَ الدَّرْسِ وَأَمْثِلَةً عَمَلِيَّةً فِي الْمَدْرَسَةِ وَالْبَيْتِ.",
      scoringRubric:
        "الدرجة الكاملة (10): إجابة واضحة وشاملة مع التمثيل. (5-9): إجابة مقبولة. (1-4): إجابة غير مكتملة.",
    };
  }
  return {
    number: num,
    questionText: `Jelaskan secara komprehensif konsep utama dan manfaat mempelajari materi ${subject} Kelas ${grade}, serta berikan contoh penerapannya dalam kehidupan sehari-hari!`,
    modelAnswer:
      "Siswa menjelaskan definisi konsep utama secara runtut, menyebutkan minimal dua manfaat nyata, serta memberikan contoh penerapan positif di lingkungan keluarga, sekolah, atau masyarakat.",
    scoringRubric:
      "Skor 10: Penjelasan lengkap, logis, dan disertai contoh konkret. Skor 6-8: Penjelasan cukup namun contoh kurang lengkap. Skor 1-5: Jawaban sangat singkat/kurang tepat.",
  };
}

function createFallbackTrueFalseQuestion(
  num: number,
  subject: string,
  grade: number,
  isArabic: boolean
) {
  if (isArabic) {
    return {
      number: num,
      instruction: `حَدِّدْ مَا إِذَا كَانَتِ الْعِبَارَاتُ التَّالِيَةُ (صَحِيحَةً: ص) أَوْ (خَاطِئَةً: خ) بِنَاءً عَلَى مَفَاهِيمِ مَادَّةِ (${subject}) لِلصَّفِّ ${grade}:`,
      contextOrPassage: `الِالْتِزَامُ بِالْقِيَمِ الْأَخْلَاقِيَّةِ وَالْأَحْكَامِ الصَّحِيحَةِ فِي مَادَّةِ (${subject}).`,
      statements: [
        {
          id: "s1",
          statement: "الِالْتِزَامُ بِالْقِيَمِ الْفَاضِلَةِ وَالسُّلُوكِ الْحَسَنِ يُعَدُّ مِنْ أَهَمِّ رَكَائِزِ التَّرْبِيَةِ الصَّالِحَةِ.",
          isCorrect: true,
          explanation: "عِبَارَةٌ صَحِيحَةٌ تُوَافِقُ مَفْهُومَ الدَّرْسِ وَأَهْدَافَهُ التَّرْبَوِيَّةَ.",
        },
        {
          id: "s2",
          statement: "التَّهَاوُنُ فِي أَدَاءِ الْوَاجِبَاتِ وَالْمَسْؤُولِيَّاتِ أَمْرٌ مَقْبُولٌ فِي سُلُوكِ الطَّالِبِ الْمُسْلِمِ.",
          isCorrect: false,
          explanation: "عِبَارَةٌ خَاطِئَةٌ؛ لِأَنَّ التَّهَاوُنَ فِي الْوَاجِبَاتِ خُلُقٌ مَذْمُومٌ يُنَافِي الْمَسْؤُولِيَّةَ.",
        },
        {
          id: "s3",
          statement: "مُعَامَلَةُ النَّاسِ بِالْحُسْنَى وَالتَّسَامُحِ تُعَزِّزُ الْمَوَدَّةَ وَالِاسْتِقْرَارَ فِي الْمُجْتَمَعِ.",
          isCorrect: true,
          explanation: "عِبَارَةٌ صَحِيحَةٌ تُعَبِّرُ عَنْ قِيمَةِ التَّسَامُحِ وَحُسْنِ الْخُلُقِ.",
        },
      ],
    };
  }
  return {
    number: num,
    instruction: `Tentukan apakah pernyataan berikut BENAR (B) atau SALAH (S) berdasarkan konsep materi pokok ${subject} Kelas ${grade}!`,
    contextOrPassage: `Kajian konsep esensial dan implementasi nyata materi ${subject}.`,
    statements: [
      {
        id: "s1",
        statement: `Pemahaman materi pokok ${subject} menuntun peserta didik untuk mengamalkan nilai-nilai positif dan berakhlak mulia dalam kehidupan sehari-hari.`,
        isCorrect: true,
        explanation: "Pernyataan BENAR karena selaras dengan capaian pembelajaran materi pokok.",
      },
      {
        id: "s2",
        statement: `Sikap acuh tak acuh dan mengabaikan tanggung jawab sosial merupakan perilaku yang sesuai dengan kompetensi ${subject}.`,
        isCorrect: false,
        explanation: "Pernyataan SALAH karena bertentangan dengan norma etika dan tujuan pendidikan karakter.",
      },
      {
        id: "s3",
        statement: `Penerapan sikap saling menghargai, kerja sama, dan toleransi dapat memperkokoh persatuan dan keharmonisan lingkungan.`,
        isCorrect: true,
        explanation: "Pernyataan BENAR karena merupakan wujud nyata implementasi pembelajaran.",
      },
    ],
  };
}

function createFallbackMatchingQuestion(
  num: number,
  subject: string,
  grade: number,
  isArabic: boolean
) {
  if (isArabic) {
    return {
      number: num,
      instruction: `صِلْ بَيْنَ الْمَفَاهِيمِ فِي الْعَمُودِ (أ) وَمَا يُنَاسِبُهَا مِنَ التَّعْرِيفَاتِ فِي الْعَمُودِ (ب) بِنَاءً عَلَى دَرْسِ (${subject}):`,
      premiseColumnTitle: "الْعَمُودُ (أ): الْمَفَاهِيمُ",
      targetColumnTitle: "الْعَمُودُ (ب): الشُّرُوحُ وَالتَّعْرِيفَاتُ",
      premises: [
        { key: "1", text: "التَّوَاضُعُ" },
        { key: "2", text: "التَّسَامُحُ" },
        { key: "3", text: "حُسْنُ الظَّنِّ" },
      ],
      targets: [
        { key: "A", text: "قَبُولُ الِاخْتِلَافِ وَاحْتِرَامُ الْآخَرِينَ فِي الْمُجْتَمَعِ" },
        { key: "B", text: "خَفْضُ الْجَنَاحِ وَعَدَمُ التَّكَبُّرِ عَلَى النَّاسِ" },
        { key: "C", text: "تَوَقُّعُ الْخَيْرِ فِي سُلُوكِ الْآخَرِينَ وَاجْتِنَابُ الشُّكُوكِ" },
      ],
      correctPairs: [
        { premiseKey: "1", targetKey: "B", explanation: "التَّوَاضُعُ يُطَابِقُ خَفْضَ الْجَنَاحِ وَعَدَمَ التَّكَبُّرِ." },
        { premiseKey: "2", targetKey: "A", explanation: "التَّسَامُحُ يَعْنِي قَبُولَ الِاخْتِلَافِ وَاحْتِرَامَ الْغَيْرِ." },
        { premiseKey: "3", targetKey: "C", explanation: "حُسْنُ الظَّنِّ مَعْنَاهُ تَوَقُّعُ الْخَيْرِ وَاجْتِنَابُ الرَّيْبِ." },
      ],
    };
  }
  return {
    number: num,
    instruction: `Jodohkan konsep pada Kolom A dengan definisi atau pasangan yang tepat pada Kolom B mengenai materi ${subject} Kelas ${grade}!`,
    premiseColumnTitle: "Kolom A: Konsep / Istilah",
    targetColumnTitle: "Kolom B: Definisi / Penerapan",
    premises: [
      { key: "1", text: "Tawadhu (Rendah Hati)" },
      { key: "2", text: "Tasamuh (Toleransi)" },
      { key: "3", text: "Husnuzan (Berprasangka Baik)" },
    ],
    targets: [
      { key: "A", text: "Menghormati keragaman dan tidak memaksakan kehendak" },
      { key: "B", text: "Tidak menyombongkan kelebihan di hadapan orang lain" },
      { key: "C", text: "Selalu memandang sisi positif dan optimis pada orang lain" },
    ],
    correctPairs: [
      { premiseKey: "1", targetKey: "B", explanation: "Tawadhu berpasangan dengan sikap rendah hati (B)." },
      { premiseKey: "2", targetKey: "A", explanation: "Tasamuh berpasangan dengan saling menghormati keragaman (A)." },
      { premiseKey: "3", targetKey: "C", explanation: "Husnuzan berpasangan dengan berprasangka baik (C)." },
    ],
  };
}

function createFallbackLiteracyQuestion(
  num: number,
  subject: string,
  grade: number,
  isArabic: boolean
) {
  if (isArabic) {
    return {
      number: num,
      stimulusTitle: `تَحْلِيلُ بَيَانَاتِ الْأَنْشِطَةِ التَّطْبِيقِيَّةِ لِمَادَّةِ (${subject})`,
      stimulusType: "tabel_data" as const,
      stimulusContent: `أَجْرَى قِسْمُ الدِّرَاسَاتِ اسْتِبْيَانًا مَيْدَانِيًّا حَوْلَ مُسْتَوَى مُشَارَكَةِ طُلَّابِ الصَّفِّ ${grade} فِي الْمُبَادَرَاتِ الْعَمَلِيَّةِ لِمَادَّةِ (${subject}) خِلَالَ الْفَصْلِ الدِّرَاسِيِّ.`,
      dataSnippet: `تَوْزِيعُ النِّسَبِ الْمِئَوِيَّةِ لِلْمُشَارَكَةِ:
١. التَّعَاوُنُ وَالْعَمَلُ الْجَمَاعِيُّ: ٩٢٪ (مُمْتَازٌ)
٢. الصِّدْقُ وَالْأَمَانَةُ فِي الْمُعَامَلَةِ: ٨٦٪ (جَيِّدٌ جِدًّا)
٣. الِالْتِزَامُ بِالْوَقْتِ وَالْوَاجِبَاتِ: ٧٨٪ (جَيِّدٌ)
٤. حُسْنُ التَّوَاصُلِ وَالتَّسَامُحِ: ٨٩٪ (مُمْتَازٌ)`,
      questionText: `بِنَاءً عَلَى الْبَيَانَاتِ الْإِحْصَائِيَّةِ فِي الْجَدْوَلِ أَعْلَاهُ، أَيُّ الْمُؤَشِّرَاتِ سَجَّلَ أَعْلَى نِسْبَةِ مُشَارَكَةٍ بَيْنَ الطُّلَّابِ؟`,
      questionType: "multiple_choice" as const,
      options: [
        { key: "A", text: "التَّعَاوُنُ وَالْعَمَلُ الْجَمَاعِيُّ بِنِسْبَةِ (٩٢٪)" },
        { key: "B", text: "الصِّدْقُ وَالْأَمَانَةُ فِي الْمُعَامَلَةِ" },
        { key: "C", text: "الِالْتِزَامُ بِالْوَقْتِ وَالْوَاجِبَاتِ" },
        { key: "D", text: "جَمِيعُ الْمُؤَشِّرَاتِ مُتَسَاوِيَةٌ تَمَامًا" },
      ],
      correctAnswer: "A",
      explanation: "تُظْهِرُ بَيَانَاتُ الْجَدْوَلِ أَنَّ نِسْبَةَ ٩٢٪ هِيَ النِّسْبَةُ الْعُلْيَا لِمُؤَشِّرِ التَّعَاوُنِ وَالْعَمَلِ الْجَمَاعِيِّ.",
      subQuestions: [
        {
          id: "a",
          question: "مَا هُوَ الْمَجَالُ الَّذِي يَحْتَاجُ إِلَى تَطْوِيرٍ وَمُتَابَعَةٍ مُكَرَّرَةٍ بِنَاءً عَلَى نَتَائِجِ الِاسْتِبْيَانِ؟",
          answerKey: "مَجَالُ الِالْتِزَامِ بِالْوَقْتِ وَالْوَاجِبَاتِ (سَجَّلَ ٧٨٪).",
          explanation: "لِأَنَّهُ سَجَّلَ أَدْنَى نِسْبَةٍ بَيْنَ الْمُؤَشِّرَاتِ الْمَدْرُوسَةِ.",
          cognitiveAspect: "تَحْلِيلُ وَاسْتِخْرَاجُ الْبَيَانَاتِ",
        },
      ],
    };
  }
  return {
    number: num,
    stimulusTitle: `Wacana & Tabel Data Analisis Pembelajaran ${subject} Kelas ${grade}`,
    stimulusType: "tabel_data" as const,
    stimulusContent: `Sebuah riset asesmen diagnostik dilakukan terhadap peserta didik Kelas ${grade} untuk mengevaluasi pemahaman konsep, daya analisis, dan implementasi materi ${subject} dalam kehidupan sehari-hari.`,
    dataSnippet: `Tabel Hasil Asesmen Peserta Didik:
1. Sikap Menghargai Perbedaan & Toleransi: 88% (Kategori Sangat Baik)
2. Kejujuran, Integritas, dan Tanggung Jawab: 82% (Kategori Baik)
3. Kerja Sama dan Gotong Royong: 93% (Kategori Sangat Baik)
4. Kedisiplinan Waktu dan Regulasi Diri: 75% (Kategori Cukup Baik)`,
    questionText: `Berdasarkan sajian data tabel asesmen di atas, kesimpulan analitis manakah yang paling valid dan akurat mengenai profil kompetensi peserta didik?`,
    questionType: "multiple_choice" as const,
    options: [
      { key: "A", text: "Aspek Kerja Sama dan Gotong Royong meraih capaian tertinggi (93%) dibanding seluruh aspek lainnya" },
      { key: "B", text: "Aspek Kedisiplinan Waktu telah melampaui seluruh indikator kompetensi yang diuji" },
      { key: "C", text: "Seluruh aspek asesmen menunjukkan persentase angka yang identik tanpa disparitas" },
      { key: "D", text: "Peserta didik belum mampu menerapkan toleransi dan saling menghargai" },
    ],
    correctAnswer: "A",
    explanation: "Berdasarkan data numerik pada tabel, aspek Kerja Sama dan Gotong Royong menempati persentase tertinggi yaitu 93%.",
    subQuestions: [
      {
        id: "a",
        question: "Aspek manakah yang memerlukan program pembinaan atau pendampingan prioritas berdasarkan evaluasi data tersebut?",
        answerKey: "Aspek Kedisiplinan Waktu dan Regulasi Diri (capaian 75%).",
        explanation: "Karena memiliki persentase capaian terendah sehingga memerlukan intervensi pembinaan lebih lanjut.",
        cognitiveAspect: "Evaluasi Data dan Informasi",
      },
      {
        id: "b",
        question: "Rumuskan satu rekomendasi tindakan nyata yang dapat diterapkan guru dalam pembelajaran untuk mengatasi kendala tersebut!",
        answerKey: "Menerapkan metode manajemen waktu proyek berbasis kelompok dengan batas waktu (deadline) bertahap dan refleksi berkala.",
        explanation: "Rekomendasi bersifat solutif, aplikatif, dan melatih penalaran HOTS tingkat tinggi.",
        cognitiveAspect: "Penalaran Solutif (HOTS)",
      },
    ],
  };
}

async function generateSupplementaryPgQuestions(params: {
  ai: any;
  subjectName: string;
  gradeLevel: string;
  grade: number;
  examType: string;
  semester: string;
  targetOptionCount: number;
  optionLetters: string;
  startNumber: number;
  count: number;
  materialDescription: string;
  isArabic: boolean;
  isBilingual: boolean;
  existingQuestionsSummary: string;
}): Promise<any[]> {
  const {
    ai,
    subjectName,
    gradeLevel,
    grade,
    examType,
    semester,
    targetOptionCount,
    optionLetters,
    startNumber,
    count,
    materialDescription,
    isArabic,
    existingQuestionsSummary,
  } = params;

  const prompt = `
Anda adalah Ahli Pembuat Soal Asesmen Nasional dan Kemenag RI.
TUGAS TAMBAHAN KHUSUS:
Lengkapi kekurangan naskah soal pilihan ganda agar TEPAT GENAP sesuai pesanan guru.
- Mata Pelajaran: ${subjectName}
- Jenjang: ${gradeLevel} (Kelas ${grade})
- Jenis Ujian: ${examType} (Semester ${semester})
- Target Tambahan: TEPAT ${count} butir soal pilihan ganda lanjutan, dimulai dari nomor ${startNumber} sampai nomor ${startNumber + count - 1}.
- Jumlah Opsi per Soal: TEPAT ${targetOptionCount} opsi (${optionLetters}).
- Acuan Materi: ${materialDescription || "Kurikulum standar jenjang dan kelas ini"}
${isArabic ? "WAJIB DALAM BAHASA ARAB BAKU BERHARAKAT LENGKAP (اللغة العربية الفصحى مع التشكيل)." : ""}
- Hindari membuat soal yang serupa dengan soal sebelumnya: "${existingQuestionsSummary.slice(0, 300)}".
- Berikan kunci jawaban (${optionLetters}) dan penjelasan padat (1 kalimat).
- BEBAS KODE LATEX. Gunakan simbol Unicode murni.

Format output JSON valid dengan array 'multipleChoiceQuestions' berisi TEPAT ${count} butir soal lanjutan nomor ${startNumber} s.d. ${startNumber + count - 1}.
`;

  const schema = {
    type: Type.OBJECT,
    properties: {
      multipleChoiceQuestions: {
        type: Type.ARRAY,
        description: `Tepat ${count} butir soal pilihan ganda lanjutan`,
        items: {
          type: Type.OBJECT,
          properties: {
            number: { type: Type.INTEGER },
            questionText: { type: Type.STRING },
            options: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  key: { type: Type.STRING },
                  text: { type: Type.STRING },
                },
                required: ["key", "text"],
              },
            },
            correctAnswer: { type: Type.STRING },
            explanation: { type: Type.STRING },
          },
          required: ["number", "questionText", "options", "correctAnswer", "explanation"],
        },
      },
    },
    required: ["multipleChoiceQuestions"],
  };

  const candidateModels = ["gemini-4-hydrogen", "gemini-3.1-flash-lite"];
  for (const m of candidateModels) {
    try {
      const resp = await ai.models.generateContent({
        model: m,
        contents: [{ text: prompt }],
        config: {
          responseMimeType: "application/json",
          responseSchema: schema,
          maxOutputTokens: 65536,
        },
      });
      if (resp.text) {
        const parsed = safeParseGeminiJson(resp.text);
        if (Array.isArray(parsed.multipleChoiceQuestions)) {
          return parsed.multipleChoiceQuestions;
        }
      }
    } catch (e) {
      console.warn(`[Supplementary PG] Model ${m} failed:`, e);
    }
  }
  return [];
}

async function generateSupplementaryEssayQuestions(params: {
  ai: any;
  subjectName: string;
  gradeLevel: string;
  grade: number;
  examType: string;
  semester: string;
  startNumber: number;
  count: number;
  materialDescription: string;
  isArabic: boolean;
  existingEssaysSummary: string;
}): Promise<any[]> {
  const {
    ai,
    subjectName,
    gradeLevel,
    grade,
    startNumber,
    count,
    materialDescription,
    isArabic,
    existingEssaysSummary,
  } = params;

  const prompt = `
Anda adalah Ahli Pembuat Soal Asesmen Nasional dan Kemenag RI.
TUGAS TAMBAHAN KHUSUS:
Lengkapi kekurangan naskah soal essay/uraian agar TEPAT GENAP sesuai pesanan guru.
- Mata Pelajaran: ${subjectName}
- Jenjang: ${gradeLevel} (Kelas ${grade})
- Target Tambahan: TEPAT ${count} butir soal essay lanjutan, dimulai dari nomor ${startNumber} sampai nomor ${startNumber + count - 1}.
- Acuan Materi: ${materialDescription || "Kurikulum standar jenjang dan kelas ini"}
${isArabic ? "WAJIB DALAM BAHASA ARAB BAKU BERHARAKAT LENGKAP (اللغة العربية الفصحى مع التشكيل)." : ""}
- Hindari topik yang sama dengan essay sebelumnya: "${existingEssaysSummary.slice(0, 300)}".
- Berikan model jawaban lengkap dan rubrik penskoran.
- BEBAS KODE LATEX.

Format output JSON valid dengan array 'essayQuestions' berisi TEPAT ${count} butir soal essay lanjutan.
`;

  const schema = {
    type: Type.OBJECT,
    properties: {
      essayQuestions: {
        type: Type.ARRAY,
        description: `Tepat ${count} butir soal essay lanjutan`,
        items: {
          type: Type.OBJECT,
          properties: {
            number: { type: Type.INTEGER },
            questionText: { type: Type.STRING },
            modelAnswer: { type: Type.STRING },
            scoringRubric: { type: Type.STRING },
          },
          required: ["number", "questionText", "modelAnswer", "scoringRubric"],
        },
      },
    },
    required: ["essayQuestions"],
  };

  const candidateModels = ["gemini-4-hydrogen", "gemini-3.1-flash-lite"];
  for (const m of candidateModels) {
    try {
      const resp = await ai.models.generateContent({
        model: m,
        contents: [{ text: prompt }],
        config: {
          responseMimeType: "application/json",
          responseSchema: schema,
          maxOutputTokens: 65536,
        },
      });
      if (resp.text) {
        const parsed = safeParseGeminiJson(resp.text);
        if (Array.isArray(parsed.essayQuestions)) {
          return parsed.essayQuestions;
        }
      }
    } catch (e) {
      console.warn(`[Supplementary Essay] Model ${m} failed:`, e);
    }
  }
  return [];
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Main generate exam endpoint
app.post("/api/generate-exam", async (req, res) => {
  try {
    const {
      subjectName,
      gradeLevel,
      grade,
      examType,
      semester,
      pgCount = 10,
      optionCount = 4,
      essayCount = 5,
      trueFalseCount = 0,
      matchingCount = 0,
      literacyCount = 0,
      materialDescription = "",
      materialImageBase64,
      materialImageMimeType = "image/jpeg",
      uploadedPhotos = [],
      questionsPerPassage = 5,
      includeUploadedAsReadingPassage = false,
      useUploadedAsReference = false,
      schoolIdentity,
      teacherName,
      examDate,
      academicYear,
      timeAllocation,
      examLanguage = "id",
      optionLayout = "auto",
    } = req.body;

    if (!subjectName) {
      return res.status(400).json({ error: "Nama mata pelajaran wajib diisi." });
    }

    const targetPgCount = Math.max(0, Number(pgCount) || 0);
    const targetEssayCount = Math.max(0, Number(essayCount) || 0);
    const targetTfCount = Math.max(0, Number(trueFalseCount) || 0);
    const targetMatchingCount = Math.max(0, Number(matchingCount) || 0);
    const targetLiteracyCount = Math.max(0, Number(literacyCount) || 0);

    const isArabic =
      examLanguage === "ar" ||
      subjectName.toLowerCase().includes("bahasa arab") ||
      subjectName.toLowerCase().includes("arab");
    const isBilingual = examLanguage === "bilingual";
    const isIndonesian =
      subjectName.toLowerCase().includes("bahasa indonesia") ||
      subjectName.toLowerCase().includes("indonesia");
    const isEnglish =
      subjectName.toLowerCase().includes("bahasa inggris") ||
      subjectName.toLowerCase().includes("inggris") ||
      subjectName.toLowerCase().includes("english");
    const isLanguageSubject =
      isArabic || isIndonesian || isEnglish || /bahasa/i.test(subjectName);

    const ai = getGeminiClient();

    // Prepare photos list (up to 10 photos)
    const photosToProcess: { name: string; base64: string; mimeType: string }[] = [];
    if (Array.isArray(uploadedPhotos) && uploadedPhotos.length > 0) {
      photosToProcess.push(...uploadedPhotos.slice(0, 10));
    } else if (materialImageBase64) {
      photosToProcess.push({
        name: "Gambar Materi",
        base64: materialImageBase64,
        mimeType: materialImageMimeType || "image/jpeg",
      });
    }

    const photoCount = photosToProcess.length;
    const qPerPassage = Math.max(1, Math.min(10, Number(questionsPerPassage) || 5));

    // Determine option letters based on optionCount
    const optionLetters =
      optionCount === 3
        ? "A, B, C"
        : optionCount === 4
        ? "A, B, C, D"
        : "A, B, C, D, E";

    const languageInstruction = isArabic
      ? `
PERHATIAN UTAMA & WAJIB - BAHASA NASKAH SOAL: WAJIB MENGGUNAKAN BAHASA ARAB (اللغة العربية الفصحى):
1. Seluruh butir soal ('questionText'), teks opsi jawaban ('options.text'), teks wacana bacaan ('content' dan 'title'), butir soal essay ('questionText'), soal Benar/Salah, soal Menjodohkan, soal Literasi Teks & Data, penjelasan/pembahasan kunci jawaban ('explanation'), dan model jawaban essay ('modelAnswer') WAJIB DITULIS DALAM BAHASA ARAB baku fusha (اللغة العربية الفصحى).
2. LENGKAPI DENGAN TASYKIL / HARAKAT (التشكيل الكامل أو الجزئي الواضح) pada kalimat soal, kosakata bacaan, dan opsi jawaban agar siswa madrasah/sekolah dapat membaca dan memahaminya secara jelas dan fasih tanpa salah harakat!
3. Format huruf kunci opsi tetap menggunakan A, B, C, D, E (atau disandingkan dengan أ، ب، ج، د، هـ) agar sistem kunci jawaban tetap terstandarisasi.
4. Petunjuk Umum ('generalInstructions') disajikan dalam Bahasa Arab resmi madrasah (contoh: "١. اقْرَأِ الْبَسْمَلَةَ قَبْلَ الْبَدْءِ بِالْإِجَابَةِ...", dll).
`
      : isBilingual
      ? `
PERHATIAN KHUSUS - BAHASA NASKAH SOAL: BILINGUAL (ARAB - INDONESIA):
1. Butir soal, opsi jawaban, dan teks wacana bacaan disajikan dalam Bahasa Arab berharakat, disertai terjemahan atau keterangan Bahasa Indonesia di bawahnya.
`
      : "";

    const uploadedMaterialInstructions = photoCount > 0
      ? [
          "MODE PENGGUNAAN DOKUMEN:",
          includeUploadedAsReadingPassage && useUploadedAsReference
            ? "Gunakan dokumen sebagai teks bacaan sekaligus sumber/referensi. Ekstrak isi relevan menjadi readingPassages dan gunakan informasi sebagai dasar fakta soal."
            : includeUploadedAsReadingPassage
            ? "Jadikan dokumen sebagai teks bacaan ujian. Ekstrak isi menjadi readingPassages dan hubungkan soal melalui readingPassageId."
            : useUploadedAsReference
            ? "Gunakan dokumen sebagai sumber/referensi saja. Pelajari isi untuk menyusun soal, tetapi jangan menampilkan dokumen sebagai bacaan panjang pada naskah ujian."
            : "Mode otomatis: AI menentukan apakah dokumen paling tepat digunakan sebagai teks bacaan, sumber/referensi, atau keduanya."
        ].join("\n")
      : "";

    const promptInstructions = `
Anda adalah seorang Ahli Pembuat Soal Ujian dan Asesmen Pendidikan Nasional (Kemendikbudristek dan Kementerian Agama Republik Indonesia) yang sangat profesional, berwawasan luas, dan teliti.

Tugas Anda adalah membuat naskah soal ujian lengkap beserta kunci jawaban dan pedoman penskoran dengan spesifikasi berikut:
1. Mata Pelajaran: ${subjectName}
2. Jenjang: ${gradeLevel} (MI/SD, MTs/SMP, atau MA/SMA)
3. Kelas: Kelas ${grade}
4. Jenis Ujian: ${examType}
5. Semester: Semester ${semester}
6. Jumlah Soal Pilihan Ganda: TEPAT ${targetPgCount} butir soal. ${
  targetPgCount === 0
    ? "(PENTING: Jangan buat soal pilihan ganda, biarkan array multipleChoiceQuestions kosong [])."
    : `(Buat TEPAT ${targetPgCount} butir soal nomor 1 sampai ${targetPgCount}).`
}
7. Jumlah Opsi Pilihan Ganda: TEPAT ${optionCount} pilihan jawaban (${optionLetters}) per butir soal.
   - PENTING: Untuk jenjang SD/MI wajib 3 pilihan (A, B, C). Untuk MTs/SMP wajib 4 pilihan (A, B, C, D). Untuk MA/SMA wajib 5 pilihan (A, B, C, D, E).
8. Jumlah Soal Menentukan Benar / Salah: TEPAT ${targetTfCount} paket butir soal. ${
  targetTfCount === 0
    ? "(PENTING: Biarkan array trueFalseQuestions kosong [])."
    : `(Buat TEPAT ${targetTfCount} paket butir nomor 1 sampai ${targetTfCount}. Tiap butir memuat instruksi, konteks stimulus materi, dan 3 sampai 4 pernyataan 'statements' yang wajib dinilai BENAR (isCorrect: true) atau SALAH (isCorrect: false) beserta pembahasan).`
}
9. Jumlah Soal Mencocokkan Jawaban (Menjodohkan): TEPAT ${targetMatchingCount} paket butir soal. ${
  targetMatchingCount === 0
    ? "(PENTING: Biarkan array matchingQuestions kosong [])."
    : `(Buat TEPAT ${targetMatchingCount} butir nomor 1 sampai ${targetMatchingCount}. Tiap butir memiliki Kolom A 'premises' [1..N], Kolom B 'targets' [A..N], dan array pasangan yang benar 'correctPairs' beserta penjelasan).`
}
10. Jumlah Soal Literasi Teks & Data (AKM/ANBK): TEPAT ${targetLiteracyCount} kasus soal. ${
  targetLiteracyCount === 0
    ? "(PENTING: Biarkan array literacyQuestions kosong [])."
    : `(Buat TEPAT ${targetLiteracyCount} butir nomor 1 sampai ${targetLiteracyCount}. Memuat stimulus cerita kontekstual / studi kasus 'stimulusContent', ringkasan data tabel atau statistik 'dataSnippet', pertanyaan pokok evaluasi 'questionText', opsi jawaban jika pilihan ganda, kunci jawaban, penjelasan, serta sub-pertanyaan analisis 'subQuestions').`
}
11. Jumlah Soal Essay / Uraian: TEPAT ${targetEssayCount} butir soal. ${
  targetEssayCount === 0
    ? "(PENTING: Jangan buat soal essay, biarkan array essayQuestions kosong [])."
    : `(Buat TEPAT ${targetEssayCount} butir soal nomor 1 sampai ${targetEssayCount}).`
}
12. Guru Pengampu: ${teacherName || "Guru Pengampu"}
13. Acuan Materi / Kisi-kisi / Topik:
${materialDescription ? `"${materialDescription}"` : "Sesuaikan dengan kurikulum standar jenjang dan kelas tersebut."}
${languageInstruction}
${uploadedMaterialInstructions}

ATURAN WAJIB & SANGAT KETAT:
1. BEBAS KODE LATEX: DILARANG KERAS menggunakan simbol atau kode LaTeX apa pun (seperti tanda dollar $...$, \\frac, \\sqrt, \\times, \\ge, \\pm, \\text, dll). Gunakan langsung teks dan simbol Unicode sesungguhnya yang siap dibaca siswa!
   Contoh konversi:
   - Pangkat: x², y³, cm³, 10⁵, m²
   - Pecahan: 1/2, 3/4, 2/5 atau ½, ¾
   - Simbol matematika: ×, ÷, +, -, =, ≠, ≤, ≥, ±, √, π, °C, %
   - Kimia: H₂O, CO₂, O₂, H₂SO₄
2. KUALITAS BUTIR SOAL:
   - Mengacu pada Taksonomi Bloom berimbang (C1-C2 mudah, C3-C4 sedang, C5-C6 HOTS/Penalaran).
   - Menggunakan stimulus kontekstual yang mendidik, relevan dengan dunia siswa atau nuansa madrasah/sekolah Indonesia.
   - Kalimat jelas, tidak bermakna ganda (ambigu).
   - Opsi pengecoh (distractor) homogen dan logis.
3. KUNCI JAWABAN & PEMBAHASAN LENGKAP:
   - Untuk setiap soal Pilihan Ganda: Berikan kunci jawaban yang pasti (A, B, C, D, atau E) serta penjelasan singkat mengapa jawaban tersebut benar.
   - Untuk setiap soal Benar / Salah: Berikan status isCorrect (true/false) dan bukti penjelasan pada tiap pernyataan.
   - Untuk setiap soal Menjodohkan: Berikan correctPairs lengkap (premiseKey ke targetKey) beserta penjelasan kesesuaian pasangan.
   - Untuk setiap soal Literasi Teks & Data: Berikan kunci jawaban, pembahasan berbasis bukti data numerik/faktual, serta jawaban sub-pertanyaan.
   - Untuk setiap soal Essay: Berikan pedoman jawaban lengkap / model jawaban dan rubrik penskoran (skor maksimal).
4. PETUNJUK UMUM:
   - Buat 4-5 poin petunjuk umum ujian standar madrasah/sekolah.
5. KELENGKAPAN PEDAGOGIS RESMI (KISI-KISI SOAL, KARTU SOAL & ANALISIS BUTIR SOAL):
   Untuk SETIAP butir soal di semua format, Anda WAJIB menyertakan atribut kurikulum lengkap:
   - 'basicCompetency': Rumusan Capaian Pembelajaran / Kompetensi Dasar (CP/KD) kurikulum jenjang kelas ini
   - 'material': Materi Pokok / Lingkup Bahasan esensial
   - 'indicator': Indikator Soal standar asesmen
   - 'cognitiveLevel': Level Kognitif Asesmen ('L1 (Pengetahuan/Pemahaman)', 'L2 (Aplikasi/Penerapan)', atau 'L3 (Penalaran/HOTS)')
   - 'difficulty': Tingkat Kesukaran butir soal ('Mudah', 'Sedang', atau 'Sukar')
   - Proporsi sebaran kesukaran seimbang: Mudah (~25-30%), Sedang (~50%), Sukar (~20-25%).

Format output WAJIB dalam bentuk JSON valid sesuai schema.
`;

    // Prepare contents (multimodal with all uploaded photos/PDF documents)
    const contents: any[] = [];

    photosToProcess.forEach((photo) => {
      // Strip any Data URL prefix (image or application/pdf)
      const cleanBase64 = photo.base64.replace(/^data:[^;]+;base64,/, "");
      const isPdf =
        photo.mimeType === "application/pdf" ||
        photo.name?.toLowerCase().endsWith(".pdf");
      const mimeType = isPdf ? "application/pdf" : photo.mimeType || "image/jpeg";

      contents.push({
        inlineData: {
          mimeType,
          data: cleanBase64,
        },
      });
    });

    contents.push({
      text: promptInstructions,
    });

    // Model fallback sequence to ensure 100% availability even during Google API peak demand spikes
    const candidateModels = ["gemini-4-hydrogen", "gemini-3.1-flash-lite"];

    let lastError: any = null;
    let responseText: string | null = null;

    const schemaConfig = {
      type: Type.OBJECT,
      properties: {
        generalInstructions: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Daftar petunjuk umum ujian (4-5 butir)",
        },
        readingPassages: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: "ID unik teks bacaan, contoh: 'bacaan-1'" },
              title: { type: Type.STRING, description: "Judul teks wacana bacaan" },
              source: { type: Type.STRING, description: "Sumber naskah wacana" },
              content: { type: Type.STRING, description: "Isi naskah teks bacaan lengkap hasil ekstraksi foto" },
              questionRange: { type: Type.STRING, description: "Contoh: 'Soal PG No. 1 - 5 & Soal Essay No. 1 - 2'" },
              questionNumbers: {
                type: Type.ARRAY,
                items: { type: Type.INTEGER },
                description: "Array nomor-nomor butir soal pilihan ganda yang merujuk pada bacaan ini",
              },
              essayQuestionNumbers: {
                type: Type.ARRAY,
                items: { type: Type.INTEGER },
                description: "Array nomor-nomor butir soal essay yang merujuk pada bacaan ini (contoh: [1, 2])",
              },
            },
            required: ["id", "title", "content", "questionRange"],
          },
          description: "Daftar teks bacaan wacana yang disarikan dari dokumen PDF/foto materi yang diunggah",
        },
        multipleChoiceQuestions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              number: { type: Type.INTEGER },
              readingPassageId: {
                type: Type.STRING,
                description: "ID teks bacaan jika butir soal ini merujuk pada teks bacaan tertentu (misal: 'bacaan-1')",
              },
              questionText: { type: Type.STRING },
              options: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    key: { type: Type.STRING, description: "A, B, C, D, atau E" },
                    text: { type: Type.STRING, description: "Teks opsi jawaban" },
                  },
                  required: ["key", "text"],
                },
              },
              correctAnswer: { type: Type.STRING, description: "Huruf kunci jawaban benar (A, B, C, D, atau E)" },
              explanation: { type: Type.STRING, description: "Penjelasan atau pembahasan butir soal" },
              basicCompetency: { type: Type.STRING, description: "Kompetensi Dasar / Capaian Pembelajaran" },
              material: { type: Type.STRING, description: "Materi Pokok / Lingkup Materi" },
              indicator: { type: Type.STRING, description: "Indikator Soal standar asesmen" },
              cognitiveLevel: { type: Type.STRING, description: "L1 (C1-C2), L2 (C3), atau L3 (C4-C6)" },
              difficulty: { type: Type.STRING, description: "Mudah, Sedang, atau Sukar" },
            },
            required: ["number", "questionText", "options", "correctAnswer", "explanation"],
          },
        },
        essayQuestions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              number: { type: Type.INTEGER },
              readingPassageId: {
                type: Type.STRING,
                description: "ID teks bacaan jika butir soal essay ini merujuk pada teks bacaan",
              },
              questionText: { type: Type.STRING },
              modelAnswer: { type: Type.STRING, description: "Jawaban acuan lengkap" },
              scoringRubric: { type: Type.STRING, description: "Pedoman penskoran/bobot nilai" },
              basicCompetency: { type: Type.STRING, description: "Kompetensi Dasar / Capaian Pembelajaran" },
              material: { type: Type.STRING, description: "Materi Pokok / Lingkup Materi" },
              indicator: { type: Type.STRING, description: "Indikator Soal essay" },
              cognitiveLevel: { type: Type.STRING, description: "L1, L2, atau L3 (HOTS)" },
              difficulty: { type: Type.STRING, description: "Mudah, Sedang, atau Sukar" },
            },
            required: ["number", "questionText", "modelAnswer", "scoringRubric"],
          },
        },
        trueFalseQuestions: {
          type: Type.ARRAY,
          description: "Daftar butir soal menentukan Benar atau Salah",
          items: {
            type: Type.OBJECT,
            properties: {
              number: { type: Type.INTEGER },
              readingPassageId: { type: Type.STRING },
              instruction: { type: Type.STRING },
              contextOrPassage: { type: Type.STRING },
              statements: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    statement: { type: Type.STRING },
                    isCorrect: { type: Type.BOOLEAN },
                    explanation: { type: Type.STRING },
                  },
                  required: ["id", "statement", "isCorrect"],
                },
              },
              basicCompetency: { type: Type.STRING },
              material: { type: Type.STRING },
              indicator: { type: Type.STRING },
              cognitiveLevel: { type: Type.STRING },
              difficulty: { type: Type.STRING },
            },
            required: ["number", "instruction", "statements"],
          },
        },
        matchingQuestions: {
          type: Type.ARRAY,
          description: "Daftar butir soal mencocokkan / menjodohkan jawaban Kolom A dan B",
          items: {
            type: Type.OBJECT,
            properties: {
              number: { type: Type.INTEGER },
              readingPassageId: { type: Type.STRING },
              instruction: { type: Type.STRING },
              premiseColumnTitle: { type: Type.STRING },
              targetColumnTitle: { type: Type.STRING },
              premises: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    key: { type: Type.STRING },
                    text: { type: Type.STRING },
                  },
                  required: ["key", "text"],
                },
              },
              targets: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    key: { type: Type.STRING },
                    text: { type: Type.STRING },
                  },
                  required: ["key", "text"],
                },
              },
              correctPairs: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    premiseKey: { type: Type.STRING },
                    targetKey: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                  },
                  required: ["premiseKey", "targetKey"],
                },
              },
              basicCompetency: { type: Type.STRING },
              material: { type: Type.STRING },
              indicator: { type: Type.STRING },
              cognitiveLevel: { type: Type.STRING },
              difficulty: { type: Type.STRING },
            },
            required: ["number", "instruction", "premises", "targets", "correctPairs"],
          },
        },
        literacyQuestions: {
          type: Type.ARRAY,
          description: "Daftar butir soal studi kasus literasi wacana dan analisis data numerik",
          items: {
            type: Type.OBJECT,
            properties: {
              number: { type: Type.INTEGER },
              readingPassageId: { type: Type.STRING },
              stimulusTitle: { type: Type.STRING },
              stimulusType: { type: Type.STRING },
              stimulusContent: { type: Type.STRING },
              dataSnippet: { type: Type.STRING },
              questionText: { type: Type.STRING },
              questionType: { type: Type.STRING },
              options: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    key: { type: Type.STRING },
                    text: { type: Type.STRING },
                  },
                  required: ["key", "text"],
                },
              },
              correctAnswer: { type: Type.STRING },
              explanation: { type: Type.STRING },
              subQuestions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    question: { type: Type.STRING },
                    answerKey: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                    cognitiveAspect: { type: Type.STRING },
                  },
                  required: ["id", "question", "answerKey"],
                },
              },
              basicCompetency: { type: Type.STRING },
              material: { type: Type.STRING },
              indicator: { type: Type.STRING },
              cognitiveLevel: { type: Type.STRING },
              difficulty: { type: Type.STRING },
            },
            required: ["number", "stimulusTitle", "stimulusContent", "questionText", "correctAnswer", "explanation"],
          },
        },
      },
      required: ["generalInstructions", "multipleChoiceQuestions", "essayQuestions"],
    };

    for (const modelName of candidateModels) {
      try {
        console.log(`[Exam Generator] Attempting generation with model: ${modelName}...`);
        const response = await ai.models.generateContent({
          model: modelName,
          contents,
          config: {
            responseMimeType: "application/json",
            responseSchema: schemaConfig,
            maxOutputTokens: 65536,
          },
        });

        if (response.text) {
          try {
            parsedData = safeParseGeminiJson(response.text);
            responseText = response.text;
            console.log(`[Exam Generator] Generation successful with model: ${modelName}`);
            break;
          } catch (parseError: any) {
            lastError = parseError;
            console.warn(`[Exam Generator] JSON from ${modelName} was incomplete; trying fallback model:`, parseError?.message || parseError);
          }
        }
      } catch (err: any) {
        console.warn(`[Exam Generator] Model ${modelName} failed:`, err?.message || err);
        lastError = err;
        // Continue to next candidate model
      }
    }

    if (!responseText) {
      let friendlyError = "Layanan AI sedang sibuk atau mengalami lonjakan antrean. Silakan tekan tombol 'GENERATE SOAL SEKARANG' kembali.";
      if (lastError?.message) {
        try {
          const parsedErr = JSON.parse(lastError.message);
          if (parsedErr?.error?.message) {
            friendlyError = parsedErr.error.message;
          }
        } catch {
          friendlyError = lastError.message;
        }
      }
      throw new Error(friendlyError);
    }

    if (!parsedData) throw new Error("Respons AI tidak dapat dibaca sebagai JSON yang valid.");

    const targetOptionCount = Math.max(3, Math.min(5, Number(optionCount) || 4));

    // Enforce EXACT multiple choice questions count and structure
    let finalPgQuestions = Array.isArray(parsedData.multipleChoiceQuestions)
      ? [...parsedData.multipleChoiceQuestions]
      : [];

    if (targetPgCount > 0) {
      if (finalPgQuestions.length < targetPgCount) {
        const missingCount = targetPgCount - finalPgQuestions.length;
        console.log(`[Exam Generator] PG count is ${finalPgQuestions.length}, target is ${targetPgCount}. Requesting ${missingCount} supplementary questions...`);
        const summary = finalPgQuestions.map((q: any) => q.questionText || "").join(" | ");
        try {
          const supplementary = await generateSupplementaryPgQuestions({
            ai,
            subjectName,
            gradeLevel,
            grade: Number(grade),
            examType,
            semester,
            targetOptionCount,
            optionLetters,
            startNumber: finalPgQuestions.length + 1,
            count: missingCount,
            materialDescription,
            isArabic,
            isBilingual,
            existingQuestionsSummary: summary,
          });
          if (Array.isArray(supplementary) && supplementary.length > 0) {
            finalPgQuestions.push(...supplementary);
          }
        } catch (supErr) {
          console.warn("[Exam Generator] Supplementary PG generation encountered error:", supErr);
        }
      }

      // If still less than targetPgCount after supplementary generation, fulfill with well-crafted curriculum fallbacks
      while (finalPgQuestions.length < targetPgCount) {
        const nextNum = finalPgQuestions.length + 1;
        finalPgQuestions.push(
          createFallbackPgQuestion(nextNum, subjectName, Number(grade), targetOptionCount, isArabic)
        );
      }

      // If more than target, slice strictly
      if (finalPgQuestions.length > targetPgCount) {
        finalPgQuestions = finalPgQuestions.slice(0, targetPgCount);
      }

      // Renumber & normalize options for each question
      finalPgQuestions = finalPgQuestions.map((q: any, idx: number) => {
        const normalizedOpts = normalizeOptions(q.options, targetOptionCount, isArabic);
        const correctAns = normalizeCorrectAnswer(q.correctAnswer, targetOptionCount);
        return {
          ...q,
          number: idx + 1,
          options: normalizedOpts,
          correctAnswer: correctAns,
          explanation: q.explanation || (isArabic ? "هَذَا هُوَ الْخِيَارُ الصَّحِيحُ." : "Pilihan jawaban ini adalah yang paling tepat sesuai materi."),
        };
      });
    } else {
      finalPgQuestions = [];
    }

    // Enforce EXACT essay questions count and structure
    let finalEssayQuestions = Array.isArray(parsedData.essayQuestions)
      ? [...parsedData.essayQuestions]
      : [];

    if (targetEssayCount > 0) {
      if (finalEssayQuestions.length < targetEssayCount) {
        const missingCount = targetEssayCount - finalEssayQuestions.length;
        console.log(`[Exam Generator] Essay count is ${finalEssayQuestions.length}, target is ${targetEssayCount}. Requesting ${missingCount} supplementary essays...`);
        const summary = finalEssayQuestions.map((eq: any) => eq.questionText || "").join(" | ");
        try {
          const supplementary = await generateSupplementaryEssayQuestions({
            ai,
            subjectName,
            gradeLevel,
            grade: Number(grade),
            examType,
            semester,
            startNumber: finalEssayQuestions.length + 1,
            count: missingCount,
            materialDescription,
            isArabic,
            existingEssaysSummary: summary,
          });
          if (Array.isArray(supplementary) && supplementary.length > 0) {
            finalEssayQuestions.push(...supplementary);
          }
        } catch (supErr) {
          console.warn("[Exam Generator] Supplementary Essay generation encountered error:", supErr);
        }
      }

      // If still less, fulfill with curriculum fallbacks
      while (finalEssayQuestions.length < targetEssayCount) {
        const nextNum = finalEssayQuestions.length + 1;
        finalEssayQuestions.push(
          createFallbackEssayQuestion(nextNum, subjectName, Number(grade), isArabic)
        );
      }

      // If more than target, slice strictly
      if (finalEssayQuestions.length > targetEssayCount) {
        finalEssayQuestions = finalEssayQuestions.slice(0, targetEssayCount);
      }

      // Renumber 1..N
      finalEssayQuestions = finalEssayQuestions.map((eq: any, idx: number) => ({
        ...eq,
        number: idx + 1,
      }));
    } else {
      finalEssayQuestions = [];
    }

    // Normalize reading passages and ensure bidirectional linkage with PG and Essay questions
    let finalReadingPassages = Array.isArray(parsedData.readingPassages)
      ? [...parsedData.readingPassages]
      : [];

    if (finalReadingPassages.length > 0) {
      finalReadingPassages = finalReadingPassages.map((passage: any, pIdx: number) => {
        // Collect currently linked essay question numbers
        let linkedEssayNums = finalEssayQuestions
          .filter((eq: any) => eq.readingPassageId === passage.id)
          .map((eq: any) => eq.number);

        // If no essay question is linked to this passage yet, but this is a language subject
        // (Bahasa Arab, Bahasa Indonesia, Bahasa Inggris) or there are no PG questions (pgCount = 0):
        if (
          linkedEssayNums.length === 0 &&
          (isLanguageSubject || targetPgCount === 0) &&
          finalEssayQuestions.length > 0
        ) {
          if (finalReadingPassages.length === 1) {
            // Link all or first few essay questions to the single reading passage
            const linkCount = Math.min(finalEssayQuestions.length, Math.max(2, Math.ceil(finalEssayQuestions.length / 2)));
            for (let i = 0; i < linkCount; i++) {
              finalEssayQuestions[i].readingPassageId = passage.id;
            }
          } else {
            // Multiple passages: distribute essay questions evenly across passages
            const perPassage = Math.max(1, Math.floor(finalEssayQuestions.length / finalReadingPassages.length));
            const startIdx = pIdx * perPassage;
            const endIdx = pIdx === finalReadingPassages.length - 1
              ? finalEssayQuestions.length
              : (pIdx + 1) * perPassage;

            for (let i = startIdx; i < endIdx; i++) {
              if (finalEssayQuestions[i]) {
                finalEssayQuestions[i].readingPassageId = passage.id;
              }
            }
          }

          linkedEssayNums = finalEssayQuestions
            .filter((eq: any) => eq.readingPassageId === passage.id)
            .map((eq: any) => eq.number);
        }

        // Collect currently linked PG question numbers
        const linkedPgNums = finalPgQuestions
          .filter((q: any) => q.readingPassageId === passage.id)
          .map((q: any) => q.number);

        const pgNumbers =
          linkedPgNums.length > 0
            ? linkedPgNums
            : Array.isArray(passage.questionNumbers) && targetPgCount > 0
            ? passage.questionNumbers
            : [];

        const essayNumbers =
          linkedEssayNums.length > 0
            ? linkedEssayNums
            : Array.isArray(passage.essayQuestionNumbers)
            ? passage.essayQuestionNumbers
            : [];

        // Generate human-readable range description for students & teachers
        let rangeLabel = passage.questionRange || "";
        if (pgNumbers.length > 0 && essayNumbers.length > 0) {
          const pgStr =
            pgNumbers.length === 1
              ? `Soal PG No. ${pgNumbers[0]}`
              : `Soal PG No. ${pgNumbers[0]} - ${pgNumbers[pgNumbers.length - 1]}`;
          const essayStr =
            essayNumbers.length === 1
              ? `Soal Essay No. ${essayNumbers[0]}`
              : `Soal Essay No. ${essayNumbers[0]} - ${essayNumbers[essayNumbers.length - 1]}`;
          rangeLabel = `${pgStr} & ${essayStr}`;
        } else if (pgNumbers.length > 0) {
          rangeLabel =
            pgNumbers.length === 1
              ? `Soal PG No. ${pgNumbers[0]}`
              : `Soal PG No. ${pgNumbers[0]} - ${pgNumbers[pgNumbers.length - 1]}`;
        } else if (essayNumbers.length > 0) {
          rangeLabel =
            essayNumbers.length === 1
              ? `Soal Essay No. ${essayNumbers[0]}`
              : `Soal Essay No. ${essayNumbers[0]} - ${essayNumbers[essayNumbers.length - 1]}`;
        }

        return {
          ...passage,
          questionNumbers: pgNumbers,
          essayQuestionNumbers: essayNumbers,
          questionRange: rangeLabel || passage.questionRange || "Soal Terkait",
        };
      });
    }

    // Build the final complete exam data package
    const defaultCompetency = isArabic
      ? `فَهْمُ وَتَحْلِيلُ النُّصُوصِ اللُّغَوِيَّةِ وَالْمَفَاهِيمِ الْأَسَاسِيَّةِ لِمَادَّةِ (${subjectName}) لِلصَّفِّ ${grade}`
      : `Memahami, menerapkan, dan menganalisis capaian pembelajaran materi pokok ${subjectName} Kelas ${grade} (${gradeLevel})`;

    finalPgQuestions = finalPgQuestions.map((q: any, idx: number) => {
      const mod = (idx + 1) % 5;
      const cog = mod === 1 || mod === 2 ? "L1 (Pengetahuan & Pemahaman)" : mod === 3 || mod === 4 ? "L2 (Aplikasi & Penerapan)" : "L3 (Penalaran / HOTS)";
      const diff = mod === 1 || mod === 2 ? "Mudah" : mod === 3 || mod === 4 ? "Sedang" : "Sukar";
      return {
        ...q,
        basicCompetency: q.basicCompetency || defaultCompetency,
        material: q.material || `${subjectName} - Materi Pokok Pembelajaran`,
        indicator: q.indicator || `Disajikan stimulus terkait materi ${subjectName}, peserta didik dapat menentukan konsep yang tepat.`,
        cognitiveLevel: q.cognitiveLevel || cog,
        difficulty: q.difficulty || diff,
        scoreWeight: 1,
      };
    });

    finalEssayQuestions = finalEssayQuestions.map((eq: any, idx: number) => {
      const cog = idx % 2 === 0 ? "L2 (Aplikasi & Penerapan)" : "L3 (Penalaran / HOTS)";
      const diff = idx % 2 === 0 ? "Sedang" : "Sukar";
      return {
        ...eq,
        basicCompetency: eq.basicCompetency || defaultCompetency,
        material: eq.material || `${subjectName} - Uraian dan Analisis Materi`,
        indicator: eq.indicator || `Disajikan persoalan komprehensif, peserta didik dapat menguraikan penjelasan dan contoh konkrit terkait ${subjectName}.`,
        cognitiveLevel: eq.cognitiveLevel || cog,
        difficulty: eq.difficulty || diff,
        maxScore: 10,
      };
    });

    // Enforce EXACT True / False questions count and structure
    let finalTrueFalseQuestions = Array.isArray(parsedData.trueFalseQuestions)
      ? [...parsedData.trueFalseQuestions]
      : [];

    if (targetTfCount > 0) {
      while (finalTrueFalseQuestions.length < targetTfCount) {
        const nextNum = finalTrueFalseQuestions.length + 1;
        finalTrueFalseQuestions.push(
          createFallbackTrueFalseQuestion(nextNum, subjectName, Number(grade), isArabic)
        );
      }
      if (finalTrueFalseQuestions.length > targetTfCount) {
        finalTrueFalseQuestions = finalTrueFalseQuestions.slice(0, targetTfCount);
      }
      finalTrueFalseQuestions = finalTrueFalseQuestions.map((tf: any, idx: number) => {
        const stmts = Array.isArray(tf.statements) && tf.statements.length > 0
          ? tf.statements.map((s: any, sIdx: number) => ({
              id: s.id || `s${sIdx + 1}`,
              statement: String(s.statement || "").trim() || (isArabic ? "عِبَارَةٌ تَطْبِيقِيَّةٌ" : "Pernyataan evaluasi konsep"),
              isCorrect: typeof s.isCorrect === "boolean" ? s.isCorrect : sIdx % 2 === 0,
              explanation: s.explanation || (isArabic ? "تَوْضِيحُ الْعِبَارَةِ بِنَاءً عَلَى الدَّرْسِ." : "Pembahasan pernyataan."),
            }))
          : [
              { id: "s1", statement: isArabic ? "الِالْتِزَامُ بِالْأَخْلَاقِ الْحَسَنَةِ أَمْرٌ وَاجِبٌ." : "Prinsip utama materi diterapkan dengan baik.", isCorrect: true, explanation: "Pernyataan benar sesuai konsep." },
              { id: "s2", statement: isArabic ? "التَّهَاوُنُ فِي الْوَاجِبَاتِ أَمْرٌ مَحْمُودٌ." : "Mengabaikan kaidah adalah hal yang dianjurkan.", isCorrect: false, explanation: "Pernyataan salah." },
            ];
        return {
          ...tf,
          number: idx + 1,
          instruction: tf.instruction || (isArabic ? "حَدِّدْ مَا إِذَا كَانَتِ الْعِبَارَاتُ التَّالِيَةُ (صَحِيحَةً: ص) أَوْ (خَاطِئَةً: خ):" : "Tentukan apakah pernyataan berikut BENAR (B) atau SALAH (S)!"),
          statements: stmts,
          basicCompetency: tf.basicCompetency || defaultCompetency,
          material: tf.material || `${subjectName} - Verifikasi Konsep`,
          indicator: tf.indicator || `Disajikan beberapa pernyataan terkait materi ${subjectName}, peserta didik dapat mengidentifikasi kebenaran konsep.`,
          cognitiveLevel: tf.cognitiveLevel || (idx % 2 === 0 ? "L1 (Pengetahuan & Pemahaman)" : "L2 (Aplikasi & Penerapan)"),
          difficulty: tf.difficulty || (idx % 2 === 0 ? "Mudah" : "Sedang"),
          scoreWeight: 2,
        };
      });
    } else {
      finalTrueFalseQuestions = [];
    }

    // Enforce EXACT Matching questions count and structure
    let finalMatchingQuestions = Array.isArray(parsedData.matchingQuestions)
      ? [...parsedData.matchingQuestions]
      : [];

    if (targetMatchingCount > 0) {
      while (finalMatchingQuestions.length < targetMatchingCount) {
        const nextNum = finalMatchingQuestions.length + 1;
        finalMatchingQuestions.push(
          createFallbackMatchingQuestion(nextNum, subjectName, Number(grade), isArabic)
        );
      }
      if (finalMatchingQuestions.length > targetMatchingCount) {
        finalMatchingQuestions = finalMatchingQuestions.slice(0, targetMatchingCount);
      }
      finalMatchingQuestions = finalMatchingQuestions.map((mq: any, idx: number) => {
        return {
          ...mq,
          number: idx + 1,
          instruction: mq.instruction || (isArabic ? "صِلْ بَيْنَ الْعَمُودِ (أ) وَمَا يُنَاسِبُهُ مِنَ الْعَمُودِ (ب):" : "Jodohkan konsep pada Kolom A dengan jawaban yang tepat pada Kolom B!"),
          premiseColumnTitle: mq.premiseColumnTitle || (isArabic ? "الْعَمُودُ (أ): الْمَفَاهِيمُ" : "Kolom A: Konsep / Istilah"),
          targetColumnTitle: mq.targetColumnTitle || (isArabic ? "الْعَمُودُ (ب): التَّوْضِيحَاتُ" : "Kolom B: Pilihan Jawaban"),
          premises: Array.isArray(mq.premises) ? mq.premises : [],
          targets: Array.isArray(mq.targets) ? mq.targets : [],
          correctPairs: Array.isArray(mq.correctPairs) ? mq.correctPairs : [],
          basicCompetency: mq.basicCompetency || defaultCompetency,
          material: mq.material || `${subjectName} - Pemadanan Konsep`,
          indicator: mq.indicator || `Disajikan konsep dan uraian materi ${subjectName}, peserta didik dapat menjodohkan pasangan konsep dengan tepat.`,
          cognitiveLevel: mq.cognitiveLevel || "L2 (Aplikasi & Penerapan)",
          difficulty: mq.difficulty || "Sedang",
          scoreWeight: 3,
        };
      });
    } else {
      finalMatchingQuestions = [];
    }

    // Enforce EXACT Text & Data Literacy questions count and structure
    let finalLiteracyQuestions = Array.isArray(parsedData.literacyQuestions)
      ? [...parsedData.literacyQuestions]
      : [];

    if (targetLiteracyCount > 0) {
      while (finalLiteracyQuestions.length < targetLiteracyCount) {
        const nextNum = finalLiteracyQuestions.length + 1;
        finalLiteracyQuestions.push(
          createFallbackLiteracyQuestion(nextNum, subjectName, Number(grade), isArabic)
        );
      }
      if (finalLiteracyQuestions.length > targetLiteracyCount) {
        finalLiteracyQuestions = finalLiteracyQuestions.slice(0, targetLiteracyCount);
      }
      finalLiteracyQuestions = finalLiteracyQuestions.map((lq: any, idx: number) => {
        return {
          ...lq,
          number: idx + 1,
          stimulusTitle: lq.stimulusTitle || (isArabic ? `تَحْلِيلُ بَيَانَاتِ مَادَّةِ (${subjectName})` : `Wacana Literasi Data ${subjectName}`),
          stimulusType: lq.stimulusType || "tabel_data",
          stimulusContent: lq.stimulusContent || (isArabic ? "اسْتِعْرَاضُ حَالَةٍ تَطْبِيقِيَّةٍ وَتَحْلِيلُ مُعْطَيَاتِهَا." : "Deskripsi konteks dan informasi wacana literasi data."),
          dataSnippet: lq.dataSnippet || "",
          questionText: lq.questionText || (isArabic ? "مَا هِيَ النَّتِيجَةُ الْأَسَاسِيَّةُ الْمُسْتَخْلَصَةُ مِنَ الْبَيَانَاتِ؟" : "Berdasarkan stimulus data di atas, kesimpulan apa yang paling tepat?"),
          questionType: lq.questionType || "multiple_choice",
          options: Array.isArray(lq.options) && lq.options.length > 0 ? lq.options : undefined,
          correctAnswer: lq.correctAnswer || "A",
          explanation: lq.explanation || (isArabic ? "الشَّرْحُ وَالتَّعْلِيلُ الْمَبْنِيُّ عَلَى الْبَيَانَاتِ." : "Pembahasan analitis berbasis bukti data kontekstual."),
          subQuestions: Array.isArray(lq.subQuestions) ? lq.subQuestions : undefined,
          basicCompetency: lq.basicCompetency || defaultCompetency,
          material: lq.material || `${subjectName} - Literasi Teks & Data`,
          indicator: lq.indicator || `Disajikan wacana naratif dan data statistik materi ${subjectName}, peserta didik dapat menganalisis dan mengevaluasi data secara kritis.`,
          cognitiveLevel: lq.cognitiveLevel || "L3 (Penalaran / HOTS)",
          difficulty: lq.difficulty || "Sukar",
          scoreWeight: 5,
        };
      });
    } else {
      finalLiteracyQuestions = [];
    }

    const examData = {
      schoolIdentity: schoolIdentity || {
        ministryName: "KEMENTERIAN AGAMA REPUBLIK INDONESIA",
        subMinistryName: "KANTOR KEMENTERIAN AGAMA KABUPATEN / KOTA",
        schoolName: gradeLevel.includes("MI")
          ? "MADRASAH IBTIDAIYAH NEGERI"
          : gradeLevel.includes("MTs")
          ? "MADRASAH TSANAWIYAH NEGERI"
          : "MADRASAH ALIYAH NEGERI",
        address: "Jalan Pendidikan No. 01, Wilayah Pendidikan",
        contact: "Telp. (021) 1234567 | Email: madrasah@kemenag.go.id",
      },
      metadata: {
        subjectName,
        gradeLevel,
        grade: Number(grade),
        examType,
        semester,
        teacherName: teacherName || "Guru Pengampu",
        examDate: examDate || new Date().toLocaleDateString("id-ID", { dateStyle: "full" }),
        academicYear: academicYear || "2025/2026",
        timeAllocation: timeAllocation || "90 Menit",
        examLanguage: isArabic ? "ar" : isBilingual ? "bilingual" : "id",
        optionLayout: optionLayout || "auto",
      },
      generalInstructions: parsedData.generalInstructions || [
        "Berdoalah sebelum mengerjakan soal.",
        "Tuliskan nama dan nomor peserta pada lembar jawaban yang tersedia.",
        "Periksa dan bacalah setiap butir soal dengan teliti sebelum menjawabnya.",
        "Dahulukan menjawab soal-soal yang Anda anggap mudah.",
        "Periksalah kembali seluruh pekerjaan Anda sebelum diserahkan kepada pengawas ujian.",
      ],
      readingPassages: finalReadingPassages,
      multipleChoiceQuestions: finalPgQuestions,
      essayQuestions: finalEssayQuestions,
      trueFalseQuestions: finalTrueFalseQuestions,
      matchingQuestions: finalMatchingQuestions,
      literacyQuestions: finalLiteracyQuestions,
      optionLayout: optionLayout || "auto",
      createdAt: new Date().toISOString(),
    };

    return res.json(examData);
  } catch (error: any) {
    console.error("Error generating exam:", error);
    return res.status(500).json({
      error: error.message || "Gagal membuat soal ujian otomatis.",
    });
  }
});

// Translate existing exam to Arabic endpoint
app.post("/api/translate-exam-to-arabic", async (req, res) => {
  try {
    const { examData, targetLanguage = "ar" } = req.body;
    if (!examData) {
      return res.status(400).json({ error: "Data ujian tidak ditemukan." });
    }

    const ai = getGeminiClient();

    const translatePrompt = `
Anda adalah seorang Pakar Kurikulum dan Bahasa Arab Madrasah/Kemenag Indonesia yang sangat fasih, teliti, dan menguasai kaidah Nahwu, Sharaf, Balaghah, serta penyusunan instrumen tes madrasah.

TUGAS UTAMA:
Ubah dan terjemahkan SELURUH butir soal ujian, opsi jawaban, teks wacana bacaan, petunjuk umum, kunci jawaban, dan pembahasan berikut ini ke dalam BAHASA ARAB BAKU (اللغة العربية الفصحى) YANG FASIH, INDAH, DAN BERHARAKAT / BERTASYKIL (التشكيل الواضح) sesuai standar madrasah (MI, MTs, MA):

DATA UJIAN ASLI:
- Mata Pelajaran: ${examData.metadata?.subjectName || "Ujian"}
- Jenjang: ${examData.metadata?.gradeLevel || "MTs/SMP"} (Kelas ${examData.metadata?.grade || 8})
- Jenis Ujian: ${examData.metadata?.examType || "Ujian"}
- Semester: ${examData.metadata?.semester || "Ganjil"}

Naskah Asli yang harus diterjemahkan:
${JSON.stringify(
  {
    generalInstructions: examData.generalInstructions,
    readingPassages: examData.readingPassages,
    multipleChoiceQuestions: examData.multipleChoiceQuestions,
    essayQuestions: examData.essayQuestions,
  },
  null,
  2
)}

ATURAN WAJIB PENERJEMAHAN KE BAHASA ARAB:
1. HARAKAT / TASYKIL LENGKAP & JELAS:
   - Kalimat butir soal ('questionText') WAJIB berharakat lengkap/jelas (التشكيل الواضح) agar mudah dibaca siswa madrasah.
   - Opsi jawaban ('options[].text') WAJIB berharakat jelas.
   - Kunci huruf opsi ('options[].key') TETAP PERTAHANKAN (A, B, C, D, E).
   - 'correctAnswer' TETAP SAMA PERSIS dengan opsi jawaban aslinya (jangan diubah kuncinya).
   - 'explanation' diterjemahkan ke Bahasa Arab yang menerangkan alasan jawaban tersebut benar (الشرح والتوضيح باللغة العربية).
   - Teks wacana bacaan ('readingPassages'): terjemahkan judul ('title'), keterangan ('questionRange'), dan seluruh isi naskah bacaan ('content') ke dalam Bahasa Arab fusha berharakat yang kaya kosakata dan mengalir indah.
   - Soal essay ('essayQuestions'): terjemahkan butir soal ('questionText'), model jawaban ('modelAnswer'), dan rubrik penskoran ('scoringRubric') ke Bahasa Arab berharakat.
   - Petunjuk umum ('generalInstructions'): terjemahkan ke 4-5 poin petunjuk ujian Bahasa Arab madrasah resmi.
2. BEBAS LATEX: Dilarang keras menggunakan kode/simbol LaTeX (seperti tanda dollar $...$, \\frac, dll). Gunakan teks dan simbol Unicode biasa.
3. INTEGRITAS DATA:
   - Pertahankan nomor urut soal (1, 2, 3, dst).
   - Pertahankan 'id' dan 'readingPassageId' agar relasi soal dengan teks bacaan tetap sinkron.
   - Jumlah butir soal dan jumlah opsi tiap soal tidak boleh berubah.

Format output WAJIB berupa JSON valid sesuai schema.
`;

    const schemaConfig = {
      type: Type.OBJECT,
      properties: {
        generalInstructions: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Daftar petunjuk umum ujian dalam Bahasa Arab",
        },
        readingPassages: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              source: { type: Type.STRING },
              content: { type: Type.STRING },
              questionRange: { type: Type.STRING },
              questionNumbers: {
                type: Type.ARRAY,
                items: { type: Type.INTEGER },
              },
            },
            required: ["id", "title", "content", "questionRange", "questionNumbers"],
          },
        },
        multipleChoiceQuestions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              number: { type: Type.INTEGER },
              readingPassageId: { type: Type.STRING },
              questionText: { type: Type.STRING },
              options: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    key: { type: Type.STRING },
                    text: { type: Type.STRING },
                  },
                  required: ["key", "text"],
                },
              },
              correctAnswer: { type: Type.STRING },
              explanation: { type: Type.STRING },
            },
            required: ["number", "questionText", "options", "correctAnswer", "explanation"],
          },
        },
        essayQuestions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              number: { type: Type.INTEGER },
              readingPassageId: { type: Type.STRING },
              questionText: { type: Type.STRING },
              modelAnswer: { type: Type.STRING },
              scoringRubric: { type: Type.STRING },
            },
            required: ["number", "questionText", "modelAnswer", "scoringRubric"],
          },
        },
      },
      required: ["generalInstructions", "multipleChoiceQuestions", "essayQuestions"],
    };

    const candidateModels = ["gemini-4-hydrogen", "gemini-3.1-flash-lite"];

    let lastError: any = null;
    let responseText: string | null = null;
    let parsedData: any = null;

    for (const modelName of candidateModels) {
      try {
        console.log(`[Exam Arabic Translator] Translating with model: ${modelName}...`);
        const response = await ai.models.generateContent({
          model: modelName,
          contents: [{ text: translatePrompt }],
          config: {
            responseMimeType: "application/json",
            responseSchema: schemaConfig,
            maxOutputTokens: 65536,
            temperature: 0.3,
          },
        });

        if (response.text) {
          responseText = response.text;
          console.log(`[Exam Arabic Translator] Success with model: ${modelName}`);
          break;
        }
      } catch (err: any) {
        console.warn(`[Exam Arabic Translator] Model ${modelName} failed:`, err?.message || err);
        lastError = err;
      }
    }

    if (!responseText) {
      throw new Error(lastError?.message || "Gagal menerjemahkan soal ke Bahasa Arab.");
    }

    let cleanJson = responseText.trim();
    if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    }

    const parsedData = JSON.parse(cleanJson);

    const translatedExamData = {
      ...examData,
      metadata: {
        ...examData.metadata,
        examLanguage: "ar",
      },
      generalInstructions: parsedData.generalInstructions || examData.generalInstructions,
      readingPassages: parsedData.readingPassages || examData.readingPassages,
      multipleChoiceQuestions: parsedData.multipleChoiceQuestions || examData.multipleChoiceQuestions,
      essayQuestions: parsedData.essayQuestions || examData.essayQuestions,
    };

    return res.json(translatedExamData);
  } catch (error: any) {
    console.error("Error translating exam to Arabic:", error);
    return res.status(500).json({
      error: error.message || "Gagal mengubah soal dan jawaban ke Bahasa Arab.",
    });
  }
});

export default app;