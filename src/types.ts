export type GradeLevel = 'MI/SD' | 'MTs/SMP' | 'MA/SMA';

export type ExamLanguage = 'id' | 'ar' | 'bilingual';

export type ExamType = 
  | 'Ulangan Harian' 
  | 'Ujian Tengah Semester' 
  | 'Ujian Akhir Semester' 
  | 'Ujian Akhir Madrasah/Sekolah';

export type Semester = 'Ganjil' | 'Genap';

export type PaperSize = 'A4' | 'F4';

export interface SchoolIdentity {
  ministryName: string;      // Baris 1: e.g. "KEMENTERIAN AGAMA REPUBLIK INDONESIA"
  subMinistryName: string;   // Baris 2: e.g. "KANTOR KEMENTERIAN AGAMA KABUPATEN SLEMAN"
  schoolName: string;        // Baris 3: e.g. "MADRASAH TSANAWIYAH NEGERI 1 SLEMAN"
  accreditation?: string;    // Baris 4: e.g. "Terakreditasi A (Unggul)" / "Akreditasi: A"
  address: string;           // Baris 5: e.g. "Jl. Magelang Km. 10, Mlati, Sleman, D.I. Yogyakarta"
  contact: string;           // Baris 6: e.g. "Telp. (0274) 868xxx | Email: mtsn1sleman@kemenag.go.id"
  logoBase64?: string;       // Logo Kiri KOP
  useLeftLogo?: boolean;     // Ceklis logo kiri aktif/tidak (default true)
  rightLogoBase64?: string;  // Logo Kanan KOP
  useRightLogo?: boolean;    // Ceklis apakah Logo Kanan mau dipakai atau tidak
}

export type OptionLayout = 'auto' | 'horizontal' | '2col' | 'vertical';

export interface ExamMetadata {
  subjectName: string;
  gradeLevel: GradeLevel;
  grade: number;             // 1 - 12
  examType: ExamType;
  semester: Semester;
  teacherName: string;
  examDate: string;          // e.g. "Senin, 15 Desember 2025"
  academicYear: string;      // e.g. "2025/2026"
  timeAllocation: string;    // e.g. "90 Menit"
  examLanguage?: ExamLanguage;
  optionLayout?: OptionLayout; // 'auto' | 'horizontal' | '2col' | 'vertical'
}

export interface OptionItem {
  key: string;               // 'A', 'B', 'C', 'D', 'E'
  text: string;
}

export interface ReadingPassage {
  id: string;                // e.g. "bacaan-1"
  title: string;             // e.g. "Teks Wacana 1: Kisah Meneladani Sahabat Abu Bakar"
  source?: string;           // e.g. "Dikutip dari materi buku ajar terlampir"
  content: string;           // Teks bacaan lengkap hasil ekstraksi foto materi
  questionRange: string;     // e.g. "Soal Nomor 1 - 5" atau "Soal Essay Nomor 1 - 3"
  questionNumbers: number[]; // e.g. [1, 2, 3, 4, 5]
  essayQuestionNumbers?: number[]; // e.g. [1, 2, 3] nomor butir soal essay yang merujuk pada bacaan ini
}

export interface MultipleChoiceQuestion {
  number: number;
  questionText: string;
  options: OptionItem[];
  correctAnswer: string;     // 'A', 'B', etc.
  explanation: string;
  readingPassageId?: string; // Menghubungkan ke ReadingPassage jika ada
  basicCompetency?: string;  // Capaian Pembelajaran / Kompetensi Dasar (CP/KD)
  material?: string;         // Materi Pokok / Lingkup Materi
  indicator?: string;        // Indikator Soal
  cognitiveLevel?: string;   // 'L1 (C1-C2)' | 'L2 (C3)' | 'L3 (C4-C6)'
  difficulty?: 'Mudah' | 'Sedang' | 'Sukar'; // Tingkat Kesukaran
  scoreWeight?: number;      // Bobot nilai (default 1 / 2)
}

export interface EssayQuestion {
  number: number;
  questionText: string;
  modelAnswer: string;
  scoringRubric: string;
  readingPassageId?: string; // Menghubungkan ke ReadingPassage jika ada
  basicCompetency?: string;  // Capaian Pembelajaran / Kompetensi Dasar (CP/KD)
  material?: string;         // Materi Pokok / Lingkup Materi
  indicator?: string;        // Indikator Soal
  cognitiveLevel?: string;   // 'L1 (C1-C2)' | 'L2 (C3)' | 'L3 (C4-C6)'
  difficulty?: 'Mudah' | 'Sedang' | 'Sukar'; // Tingkat Kesukaran
  maxScore?: number;         // Skor Maksimal (misal 10 atau 20)
}

// 1. Jenis Soal Menentukan Benar / Salah (True / False)
export interface TrueFalseStatement {
  id: string;                // e.g. "s1", "s2"
  statement: string;         // Pernyataan yang dinilai
  isCorrect: boolean;        // true jika BENAR, false jika SALAH
  explanation?: string;      // Alasan / bukti penjelasan
}

export interface TrueFalseQuestion {
  number: number;
  instruction: string;       // e.g. "Tentukan apakah pernyataan berikut BENAR (B) atau SALAH (S) berdasarkan materi!"
  instructions?: string;      // alias
  contextOrPassage?: string; // Teks stimulus kontekstual jika ada
  statements: TrueFalseStatement[];
  readingPassageId?: string;
  basicCompetency?: string;
  material?: string;
  indicator?: string;
  cognitiveLevel?: string;
  difficulty?: 'Mudah' | 'Sedang' | 'Sukar';
  scoreWeight?: number;
}

// 2. Jenis Soal Mencocokkan Jawaban (Matching / Menjodohkan)
export interface MatchingPremise {
  key: string;               // e.g. "1", "2", "3"
  text: string;              // Pernyataan / konsep di Kolom Kiri (Kolom A)
}

export interface MatchingTarget {
  key: string;               // e.g. "A", "B", "C", "D"
  text: string;              // Pilihan / definisi di Kolom Kanan (Kolom B)
}

export interface MatchingCorrectPair {
  premiseKey: string;        // e.g. "1"
  targetKey: string;         // e.g. "B"
  explanation?: string;
}

export interface MatchingQuestion {
  number: number;
  instruction: string;       // e.g. "Jodohkan konsep pada Kolom A dengan pasangan jawaban yang tepat pada Kolom B!"
  instructions?: string;      // alias
  premiseColumnTitle?: string; // e.g. "Kolom A: Konsep / Pernyataan"
  targetColumnTitle?: string;  // e.g. "Kolom B: Pilihan Jawaban"
  premises: MatchingPremise[];
  targets: MatchingTarget[];
  correctPairs: MatchingCorrectPair[];
  readingPassageId?: string;
  basicCompetency?: string;
  material?: string;
  indicator?: string;
  cognitiveLevel?: string;
  difficulty?: 'Mudah' | 'Sedang' | 'Sukar';
  scoreWeight?: number;
}

// 3. Jenis Soal Literasi Teks & Data (Text & Data Literacy / AKM / Asesmen Kompetensi)
export interface LiteracySubQuestion {
  id: string;                // e.g. "a", "b"
  question: string;          // Pertanyaan analisis data
  answerKey: string;         // Jawaban singkat / rujukan
  explanation: string;       // Analisis data pendukung
  cognitiveAspect?: string;  // Aspek: Menemukan Info / Interpretasi / Evaluasi Data
}

export interface TextDataLiteracyQuestion {
  number: number;
  stimulusTitle: string;     // Judul wacana/tabel data
  stimulusType: 'infografis' | 'tabel_data' | 'wacana_literasi' | 'studi_kasus';
  stimulusContent: string;   // Teks wacana naratif kontekstual
  dataSnippet?: string;      // Format tabel data ASCII / ringkasan statistik
  questionText: string;      // Pokok soal pertanyaan analisis
  questionType: 'multiple_choice' | 'complex_choice' | 'short_explanation';
  options?: OptionItem[];    // Pilihan ganda jika tipe MC
  correctAnswer: string;     // Kunci jawaban utama
  explanation: string;       // Pembahasan analisis data dan bukti tekstual
  subQuestions?: LiteracySubQuestion[];
  readingPassageId?: string;
  basicCompetency?: string;
  material?: string;
  indicator?: string;
  cognitiveLevel?: string;
  difficulty?: 'Mudah' | 'Sedang' | 'Sukar';
  scoreWeight?: number;
}

export interface ExamData {
  schoolIdentity: SchoolIdentity;
  metadata: ExamMetadata;
  generalInstructions: string[];
  readingPassages?: ReadingPassage[];
  multipleChoiceQuestions: MultipleChoiceQuestion[];
  essayQuestions: EssayQuestion[];
  trueFalseQuestions?: TrueFalseQuestion[];
  matchingQuestions?: MatchingQuestion[];
  literacyQuestions?: TextDataLiteracyQuestion[];
  optionLayout?: OptionLayout;
  createdAt: string;
}

export interface UploadedPhotoItem {
  id: string;
  name: string;
  base64: string;
  mimeType: string;
  size: number;
}

export interface GenerateExamPayload {
  subjectName: string;
  gradeLevel: GradeLevel;
  grade: number;
  examType: ExamType;
  semester: Semester;
  pgCount: number;
  optionCount: number;       // 3 for MI/SD, 4 for MTs/SMP, 5 for MA/SMA
  essayCount: number;
  trueFalseCount?: number;   // Jumlah Soal Menentukan Benar / Salah
  matchingCount?: number;    // Jumlah Soal Mencocokkan Jawaban
  literacyCount?: number;    // Jumlah Soal Literasi Teks & Data
  materialDescription: string;
  materialImageBase64?: string;
  materialImageMimeType?: string;
  uploadedPhotos?: {
    id?: string;
    name: string;
    base64: string;
    mimeType: string;
  }[];
  questionsPerPassage?: number; // e.g. 5 questions per passage
  schoolIdentity: SchoolIdentity;
  teacherName: string;
  examDate: string;
  academicYear: string;
  timeAllocation: string;
  examLanguage?: ExamLanguage;
  optionLayout?: OptionLayout;
}
