import React, { useState } from "react";
import {
  GradeLevel,
  ExamType,
  Semester,
  SchoolIdentity,
  GenerateExamPayload,
  UploadedPhotoItem,
  ExamLanguage,
  OptionLayout,
} from "../types";
import { compressImage, processUploadedFile } from "../utils/imageHelpers";
import {
  Sparkles,
  Upload,
  Image as ImageIcon,
  X,
  FileText,
  Sliders,
  Settings,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Plus,
  Trash2,
  BookOpen,
  Languages,
} from "lucide-react";

interface ExamFormProps {
  schoolIdentity: SchoolIdentity;
  onOpenKopModal: () => void;
  onSubmit: (payload: GenerateExamPayload) => void;
  isLoading: boolean;
}

const COMMON_SUBJECTS = [
  "Akidah Akhlak",
  "Fikih",
  "Sejarah Kebudayaan Islam (SKI)",
  "Al-Qur'an Hadis",
  "Bahasa Arab",
  "Matematika",
  "Ilmu Pengetahuan Alam (IPA)",
  "Ilmu Pengetahuan Sosial (IPS)",
  "Bahasa Indonesia",
  "Bahasa Inggris",
  "Pendidikan Pancasila & Kewarganegaraan (PPKn)",
  "Pendidikan Agama Islam (PAI)",
  "Biologi",
  "Fisika",
  "Kimia",
  "Ekonomi",
  "Geografi",
  "Sosiologi",
  "Informatika",
  "Pendidikan Jasmani & Olahraga (PJOK)",
];

export const ExamForm: React.FC<ExamFormProps> = ({
  schoolIdentity,
  onOpenKopModal,
  onSubmit,
  isLoading,
}) => {
  // 1. Mata Pelajaran
  const [subjectName, setSubjectName] = useState("Akidah Akhlak");
  // Bahasa Naskah Soal ('id' | 'ar' | 'bilingual')
  const [examLanguage, setExamLanguage] = useState<ExamLanguage>("id");

  const handleSubjectChange = (newSubject: string) => {
    setSubjectName(newSubject);
    if (
      newSubject.toLowerCase().includes("bahasa arab") ||
      newSubject.toLowerCase().includes("arab")
    ) {
      setExamLanguage("ar");
    }
  };

  // 2. Tingkat / Jenjang
  const [gradeLevel, setGradeLevel] = useState<GradeLevel>("MTs/SMP");

  // 3. Kelas (1 - 12)
  const [grade, setGrade] = useState<number>(8);

  // 4. Jenis Ujian
  const [examType, setExamType] = useState<ExamType>("Ujian Akhir Semester");

  // 5. Semester
  const [semester, setSemester] = useState<Semester>("Ganjil");

  // 6 & 7. Pilihan Ganda & Jumlah
  const [hasPg, setHasPg] = useState<boolean>(true);
  const [pgCount, setPgCount] = useState<number>(15);

  // 8. Opsi Pilihan (Auto by jenjang: SD=3, SMP=4, SMA=5, can be toggled)
  const [customOptionCount, setCustomOptionCount] = useState<number | null>(null);

  // 8b. Tata Letak Pilihan Ganda (Menyamping / Hemat Kertas)
  const [optionLayout, setOptionLayout] = useState<OptionLayout>("auto");

  // 9. Soal Menentukan Benar / Salah (True / False)
  const [hasTrueFalse, setHasTrueFalse] = useState<boolean>(true);
  const [trueFalseCount, setTrueFalseCount] = useState<number>(4);

  // 10. Soal Mencocokkan Jawaban (Matching / Menjodohkan)
  const [hasMatching, setHasMatching] = useState<boolean>(true);
  const [matchingCount, setMatchingCount] = useState<number>(3);

  // 11. Soal Literasi Teks & Data (AKM / Asesmen Kompetensi)
  const [hasLiteracy, setHasLiteracy] = useState<boolean>(true);
  const [literacyCount, setLiteracyCount] = useState<number>(2);

  // 12. Essay & Jumlah
  const [hasEssay, setHasEssay] = useState<boolean>(true);
  const [essayCount, setEssayCount] = useState<number>(5);

  const applyPreset = (preset: "all" | "standard" | "akm" | "mixed") => {
    if (preset === "all") {
      setHasPg(true); setPgCount(15);
      setHasTrueFalse(true); setTrueFalseCount(4);
      setHasMatching(true); setMatchingCount(3);
      setHasLiteracy(true); setLiteracyCount(2);
      setHasEssay(true); setEssayCount(5);
    } else if (preset === "standard") {
      setHasPg(true); setPgCount(20);
      setHasTrueFalse(false);
      setHasMatching(false);
      setHasLiteracy(false);
      setHasEssay(true); setEssayCount(5);
    } else if (preset === "akm") {
      setHasPg(true); setPgCount(10);
      setHasTrueFalse(true); setTrueFalseCount(4);
      setHasMatching(true); setMatchingCount(3);
      setHasLiteracy(true); setLiteracyCount(3);
      setHasEssay(true); setEssayCount(3);
    } else if (preset === "mixed") {
      setHasPg(true); setPgCount(15);
      setHasTrueFalse(true); setTrueFalseCount(5);
      setHasMatching(true); setMatchingCount(4);
      setHasLiteracy(false);
      setHasEssay(false);
    }
  };

  // 13. Materi / Acuan & Multi-Foto Bacaan (Maksimal 10 Foto)
  const [materialDescription, setMaterialDescription] = useState(
    "Adab bertetangga dan bermasyarakat, sifat terpuji tawadhu, husnuzan, dan toleransi (tasamuh) dalam kehidupan sehari-hari."
  );
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhotoItem[]>([]);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [questionsPerPassage, setQuestionsPerPassage] = useState<number>(5);
  const [includeUploadedAsReadingPassage, setIncludeUploadedAsReadingPassage] = useState<boolean>(false);
  const [useUploadedAsReference, setUseUploadedAsReference] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // 16. Identitas Pengampu & Waktu
  const [teacherName, setTeacherName] = useState("Jayadi Pebwanartha, S.Si.");
  const [examDate, setExamDate] = useState(() => {
    const today = new Date();
    return today.toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  });
  const [academicYear, setAcademicYear] = useState("2025/2026");
  const [timeAllocation, setTimeAllocation] = useState("90 Menit");

  // Calculate standard option count based on Jenjang
  const standardOptionCount =
    gradeLevel === "MI/SD" ? 3 : gradeLevel === "MTs/SMP" ? 4 : 5;
  const currentOptionCount = customOptionCount ?? standardOptionCount;

  // Handle grade level change
  const handleGradeLevelChange = (lvl: GradeLevel) => {
    setGradeLevel(lvl);
    setCustomOptionCount(null); // reset to standard for that level

    // Adjust school name if still default
    if (lvl === "MI/SD" && (grade < 1 || grade > 6)) {
      setGrade(5);
    } else if (lvl === "MTs/SMP" && (grade < 7 || grade > 9)) {
      setGrade(8);
    } else if (lvl === "MA/SMA" && (grade < 10 || grade > 12)) {
      setGrade(11);
    }
  };

  // Handle multi-document & multi-image upload (up to 10 files: PDF, JPG, PNG, JPEG)
  const handlePhotosChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadError(null);
    const remainingSlots = 10 - uploadedPhotos.length;
    if (remainingSlots <= 0) {
      setUploadError("Maksimal 10 dokumen/foto telah tercapai. Hapus beberapa file untuk menambahkan yang baru.");
      return;
    }

    const filesArray: File[] = Array.from(files);
    const filesToProcess: File[] = filesArray.slice(0, remainingSlots);
    if (filesArray.length > remainingSlots) {
      setUploadError(`Hanya ${remainingSlots} file pertama yang dapat ditambahkan karena batas maksimal adalah 10 file.`);
    }

    setIsCompressing(true);
    try {
      const processed: UploadedPhotoItem[] = [];
      for (const file of filesToProcess) {
        const item = await processUploadedFile(file);
        processed.push(item);
      }
      setUploadedPhotos((prev) => [...prev, ...processed]);
    } catch (err: any) {
      setUploadError("Gagal memproses dokumen/foto: " + (err?.message || "Kesalahan tidak dikenal"));
    } finally {
      setIsCompressing(false);
      e.target.value = "";
    }
  };

  const removePhoto = (id: string) => {
    setUploadedPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const clearAllPhotos = () => {
    setUploadedPhotos([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasPg && !hasEssay && !hasTrueFalse && !hasMatching && !hasLiteracy) {
      alert("Pilih minimal salah satu format soal: Pilihan Ganda, Benar/Salah, Mencocokkan, Literasi Teks/Data, atau Essay.");
      return;
    }

    onSubmit({
      subjectName: subjectName.trim(),
      gradeLevel,
      grade,
      examType,
      semester,
      pgCount: hasPg ? pgCount : 0,
      optionCount: currentOptionCount,
      optionLayout,
      essayCount: hasEssay ? essayCount : 0,
      trueFalseCount: hasTrueFalse ? trueFalseCount : 0,
      matchingCount: hasMatching ? matchingCount : 0,
      literacyCount: hasLiteracy ? literacyCount : 0,
      materialDescription,
      uploadedPhotos: uploadedPhotos.map((p) => ({
        id: p.id,
        name: p.name,
        base64: p.base64,
        mimeType: p.mimeType,
      })),
      questionsPerPassage,
      includeUploadedAsReadingPassage,
      useUploadedAsReference,
      materialImageBase64: uploadedPhotos[0]?.base64,
      materialImageMimeType: uploadedPhotos[0]?.mimeType,
      schoolIdentity,
      teacherName: teacherName.trim(),
      examDate: examDate.trim(),
      academicYear: academicYear.trim(),
      timeAllocation: timeAllocation.trim(),
      examLanguage,
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-emerald-100 overflow-hidden">
      {/* Form Top Banner */}
      <div className="bg-gradient-to-r from-[#004d26] to-[#006837] p-5 text-white flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 font-serif text-[#f3e5ab]">
            <Sliders className="w-5 h-5 text-[#d4af37]" />
            Form Parameter Pembuatan Soal Ujian
          </h2>
          <p className="text-xs text-emerald-100 mt-1">
            Lengkapi data spesifikasi ujian di bawah ini. AI Gemini Flash akan menyusun soal berstandar nasional dan bebas kode LaTeX.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenKopModal}
          className="hidden sm:flex items-center gap-1.5 bg-[#d4af37] hover:bg-[#c29d2b] text-[#004d26] font-bold text-xs px-3.5 py-2 rounded-lg shadow-sm transition-all transform hover:scale-105"
        >
          <Settings className="w-4 h-4" />
          <span>Atur Kop Madrasah</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8">
        
        {/* SECTION 1: IDENTITAS MATA PELAJARAN & JENJANG */}
        <div>
          <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#006837] flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-[#006837] flex items-center justify-center text-xs font-black">
                1
              </span>
              Mata Pelajaran & Jenjang Pendidikan
            </h3>
            <button
              type="button"
              onClick={onOpenKopModal}
              className="sm:hidden text-xs text-[#006837] font-semibold underline"
            >
              Atur Kop Madrasah
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 1. Nama Mata Pelajaran */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Nama Mata Pelajaran <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={subjectName}
                onChange={(e) => handleSubjectChange(e.target.value)}
                placeholder="Contoh: Akidah Akhlak, Bahasa Arab, Fikih, Matematika..."
                className="w-full text-base font-semibold px-4 py-2.5 rounded-xl border border-slate-300 focus:border-[#006837] focus:ring-2 focus:ring-emerald-500/20 text-slate-900 shadow-xs"
              />
              {/* Quick Suggestion Chips */}
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                <span className="font-medium text-slate-400">Pilihan Cepat:</span>
                {COMMON_SUBJECTS.slice(0, 8).map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => handleSubjectChange(sub)}
                    className={`px-2 py-0.5 rounded-md border text-[11px] transition-all ${
                      subjectName === sub
                        ? "bg-emerald-700 text-white border-emerald-700"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50"
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>

            {/* Pilihan Bahasa Naskah Soal & Jawaban */}
            <div className="md:col-span-2 bg-gradient-to-r from-emerald-50/80 to-teal-50/60 border border-emerald-200 rounded-xl p-3.5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-1 mb-2">
                <label className="text-xs font-bold text-[#006837] uppercase tracking-wider flex items-center gap-1.5">
                  <Languages className="w-4 h-4 text-[#006837]" />
                  Bahasa Naskah Soal & Kunci Jawaban
                </label>
                <span className="text-[11px] font-semibold text-emerald-800">
                  {examLanguage === "ar"
                    ? "🇸🇦 Mode Soal & Jawaban: Bahasa Arab Berharakat"
                    : examLanguage === "bilingual"
                    ? "🌐 Mode Soal: Bilingual (Arab & Terjemahan)"
                    : "🇮🇩 Mode Soal: Bahasa Indonesia"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setExamLanguage("id")}
                  className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all text-left flex items-center gap-2.5 ${
                    examLanguage === "id"
                      ? "bg-[#006837] text-white border-[#006837] shadow-xs"
                      : "bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50"
                  }`}
                >
                  <span className="text-base">🇮🇩</span>
                  <div>
                    <p className="leading-tight">Bahasa Indonesia</p>
                    <p className={`text-[10px] ${examLanguage === "id" ? "text-emerald-100" : "text-slate-500"}`}>
                      Standar kurikulum nasional
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setExamLanguage("ar")}
                  className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all text-left flex items-center gap-2.5 ${
                    examLanguage === "ar"
                      ? "bg-[#006837] text-white border-[#006837] shadow-xs ring-2 ring-[#d4af37]/40"
                      : "bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50"
                  }`}
                >
                  <span className="text-base">🇸🇦</span>
                  <div>
                    <p className="leading-tight flex items-center gap-1.5">
                      <span>Bahasa Arab</span>
                      <span className="font-arabic text-sm text-[#d4af37] font-normal">اللغة العربية</span>
                    </p>
                    <p className={`text-[10px] ${examLanguage === "ar" ? "text-emerald-100" : "text-slate-500"}`}>
                      Soal & opsi berharakat jelas
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setExamLanguage("bilingual")}
                  className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all text-left flex items-center gap-2.5 ${
                    examLanguage === "bilingual"
                      ? "bg-[#006837] text-white border-[#006837] shadow-xs"
                      : "bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50"
                  }`}
                >
                  <span className="text-base">🌐</span>
                  <div>
                    <p className="leading-tight">Bilingual (Arab - Indo)</p>
                    <p className={`text-[10px] ${examLanguage === "bilingual" ? "text-emerald-100" : "text-slate-500"}`}>
                      Arab disertai terjemahan
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* 2. Tingkat / Jenjang */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Tingkat / Jenjang Pendidikan <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["MI/SD", "MTs/SMP", "MA/SMA"] as GradeLevel[]).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => handleGradeLevelChange(lvl)}
                    className={`py-2.5 px-3 rounded-xl border text-xs sm:text-sm font-bold transition-all text-center ${
                      gradeLevel === lvl
                        ? "bg-[#006837] text-white border-[#006837] shadow-md shadow-emerald-900/10"
                        : "bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50"
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">
                {gradeLevel === "MI/SD" && "✓ Opsi PG otomatis A, B, C (3 Pilihan) | Kelas 1 - 6"}
                {gradeLevel === "MTs/SMP" && "✓ Opsi PG otomatis A, B, C, D (4 Pilihan) | Kelas 7 - 9"}
                {gradeLevel === "MA/SMA" && "✓ Opsi PG otomatis A, B, C, D, E (5 Pilihan) | Kelas 10 - 12"}
              </p>
            </div>

            {/* 3. Kelas (1 - 12) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Tingkat Kelas (1 s.d. 12) <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((c) => {
                  const isRecommended =
                    (gradeLevel === "MI/SD" && c <= 6) ||
                    (gradeLevel === "MTs/SMP" && c >= 7 && c <= 9) ||
                    (gradeLevel === "MA/SMA" && c >= 10 && c <= 12);

                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setGrade(c)}
                      className={`w-9 h-9 rounded-lg font-bold text-xs transition-all ${
                        grade === c
                          ? "bg-[#006837] text-white shadow-sm ring-2 ring-[#d4af37]"
                          : isRecommended
                          ? "bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100"
                          : "bg-slate-100 text-slate-400 border border-slate-200 hover:bg-slate-200"
                      }`}
                      title={`Kelas ${c}`}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">
                Terpilih: <strong className="text-[#006837]">Kelas {grade}</strong> ({gradeLevel})
              </p>
            </div>
          </div>
        </div>

        {/* SECTION 2: JENIS UJIAN, SEMESTER & IDENTITAS PELAKSANAAN */}
        <div>
          <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#006837] flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-[#006837] flex items-center justify-center text-xs font-black">
                2
              </span>
              Jenis Ujian, Semester & Data Pelaksanaan
            </h3>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 4. Jenis Ujian */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Jenis Ujian / Asesmen <span className="text-red-500">*</span>
              </label>
              <select
                value={examType}
                onChange={(e) => setExamType(e.target.value as ExamType)}
                className="w-full text-sm font-semibold px-3 py-2.5 rounded-xl border border-slate-300 focus:border-[#006837] focus:ring-2 focus:ring-emerald-500/20 text-slate-900 bg-white"
              >
                <option value="Ulangan Harian">Ulangan Harian (UH / Penilaian Harian)</option>
                <option value="Ujian Tengah Semester">Ujian Tengah Semester (UTS / PTS / STS)</option>
                <option value="Ujian Akhir Semester">Ujian Akhir Semester (UAS / PAS / SAS)</option>
                <option value="Ujian Akhir Madrasah/Sekolah">Ujian Akhir Madrasah / Sekolah (UAM / US / UM)</option>
              </select>
            </div>

            {/* 5. Semester */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Semester <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(["Ganjil", "Genap"] as Semester[]).map((sem) => (
                  <button
                    key={sem}
                    type="button"
                    onClick={() => setSemester(sem)}
                    className={`py-2 rounded-lg text-xs font-bold border transition-all text-center ${
                      semester === sem
                        ? "bg-[#006837] text-white border-[#006837]"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-emerald-50"
                    }`}
                  >
                    {sem}
                  </button>
                ))}
              </div>
            </div>

            {/* Tahun Pelajaran */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Tahun Pelajaran
              </label>
              <input
                type="text"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="2025/2026"
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:border-[#006837] focus:ring-2 focus:ring-emerald-500/20 text-slate-800"
              />
            </div>

            {/* Guru Pengampu */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Nama Guru Pengampu
              </label>
              <input
                type="text"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                placeholder="Nama Lengkap & Gelar Guru Pengampu"
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:border-[#006837] focus:ring-2 focus:ring-emerald-500/20 text-slate-800"
              />
            </div>

            {/* Tanggal Ujian */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Hari / Tanggal Ujian
              </label>
              <input
                type="text"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                placeholder="Senin, 15 Desember 2025"
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:border-[#006837] focus:ring-2 focus:ring-emerald-500/20 text-slate-800"
              />
            </div>

            {/* Alokasi Waktu */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Alokasi Waktu
              </label>
              <input
                type="text"
                value={timeAllocation}
                onChange={(e) => setTimeAllocation(e.target.value)}
                placeholder="90 Menit"
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:border-[#006837] focus:ring-2 focus:ring-emerald-500/20 text-slate-800"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: FORMAT & VARIASI TIPE SOAL */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-emerald-100">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#006837] flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-[#006837] flex items-center justify-center text-xs font-black">
                  3
                </span>
                Format & Variasi Tipe Soal Ujian
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pilih kombinasi format soal yang diinginkan: Pilihan Ganda, Benar/Salah, Menjodohkan, Literasi Teks & Data, dan Essay.
              </p>
            </div>

            {/* Preset Tombol Cepat */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[11px] font-semibold text-slate-500 mr-1">Preset:</span>
              <button
                type="button"
                onClick={() => applyPreset("all")}
                className="px-2.5 py-1 rounded-lg border text-[11px] font-bold bg-emerald-50 text-[#006837] border-emerald-300 hover:bg-emerald-100 transition-colors shadow-2xs"
              >
                ✨ Paket Lengkap (5 Tipe)
              </button>
              <button
                type="button"
                onClick={() => applyPreset("akm")}
                className="px-2.5 py-1 rounded-lg border text-[11px] font-bold bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 transition-colors shadow-2xs"
              >
                📊 Literasi & AKM
              </button>
              <button
                type="button"
                onClick={() => applyPreset("standard")}
                className="px-2.5 py-1 rounded-lg border text-[11px] font-bold bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100 transition-colors shadow-2xs"
              >
                📝 Standar PG + Essay
              </button>
              <button
                type="button"
                onClick={() => applyPreset("mixed")}
                className="px-2.5 py-1 rounded-lg border text-[11px] font-bold bg-teal-50 text-teal-800 border-teal-300 hover:bg-teal-100 transition-colors shadow-2xs"
              >
                🎯 PG + B/S + Menjodohkan
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* 1. Box Pilihan Ganda */}
            <div className={`p-4 rounded-xl border transition-all ${
              hasPg ? "bg-emerald-50/50 border-emerald-300 shadow-2xs" : "bg-slate-50 border-slate-200 opacity-60"
            }`}>
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 text-sm">
                  <input
                    type="checkbox"
                    checked={hasPg}
                    onChange={(e) => setHasPg(e.target.checked)}
                    className="w-4 h-4 text-[#006837] rounded focus:ring-emerald-500 border-slate-300"
                  />
                  <span>1. Pilihan Ganda (PG)</span>
                </label>
                {hasPg && (
                  <span className="text-[11px] font-bold bg-[#006837] text-white px-2 py-0.5 rounded-full">
                    {pgCount} Soal
                  </span>
                )}
              </div>

              {hasPg && (
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Jumlah Butir Soal PG
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="5"
                        max="50"
                        step="5"
                        value={pgCount}
                        onChange={(e) => setPgCount(Number(e.target.value))}
                        className="flex-1 accent-[#006837]"
                      />
                      <input
                        type="number"
                        min="1"
                        max="60"
                        value={pgCount}
                        onChange={(e) => setPgCount(Math.max(1, Number(e.target.value)))}
                        className="w-14 text-center font-bold px-1.5 py-1 rounded-md border border-slate-300 text-sm bg-white"
                      />
                    </div>
                  </div>

                  {/* Pilihan Opsi Berdasarkan Jenjang */}
                  <div className="p-2.5 bg-white rounded-lg border border-emerald-200 text-xs">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-slate-700">Opsi Jawaban:</span>
                      <span className="font-extrabold text-[#006837]">
                        {currentOptionCount === 3 ? "A, B, C (SD)" : currentOptionCount === 4 ? "A, B, C, D (SMP)" : "A, B, C, D, E (SMA)"}
                      </span>
                    </div>
                    <div className="flex gap-1.5">
                      {[
                        { count: 3, label: "3 (SD)" },
                        { count: 4, label: "4 (SMP)" },
                        { count: 5, label: "5 (SMA)" },
                      ].map((item) => (
                        <button
                          key={item.count}
                          type="button"
                          onClick={() => setCustomOptionCount(item.count)}
                          className={`flex-1 py-0.5 px-1 rounded text-[10px] font-bold border transition-colors ${
                            currentOptionCount === item.count
                              ? "bg-[#006837] text-white border-[#006837]"
                              : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Pilihan Format Tata Letak (Menyamping / Hemat Kertas) */}
                  <div className="p-2.5 bg-white rounded-lg border border-emerald-200 text-xs">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-slate-700">Tata Letak Opsi:</span>
                      <span className="font-extrabold text-[#006837] text-[10px]">
                        {optionLayout === "auto" ? "⚡ Otomatis (Hemat Kertas)" : optionLayout === "horizontal" ? "↔️ 1 Baris" : optionLayout === "2col" ? "🔲 2 Kolom" : "⬇️ Vertikal"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {[
                        { id: "auto", label: "⚡ Otomatis (Hemat)" },
                        { id: "horizontal", label: "↔️ 1 Baris" },
                        { id: "2col", label: "🔲 2 Kolom" },
                        { id: "vertical", label: "⬇️ Vertikal" },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setOptionLayout(item.id as OptionLayout)}
                          className={`py-1 px-1 rounded text-[10px] font-bold border transition-colors ${
                            optionLayout === item.id
                              ? "bg-[#006837] text-white border-[#006837]"
                              : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-[9px] text-slate-500 mt-1.5 leading-tight">
                      *Opsi matematika / teks pendek berjejer menyamping agar hemat kertas ujian.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Box Menentukan Benar / Salah */}
            <div className={`p-4 rounded-xl border transition-all ${
              hasTrueFalse ? "bg-emerald-50/50 border-emerald-300 shadow-2xs" : "bg-slate-50 border-slate-200 opacity-60"
            }`}>
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 text-sm">
                  <input
                    type="checkbox"
                    checked={hasTrueFalse}
                    onChange={(e) => setHasTrueFalse(e.target.checked)}
                    className="w-4 h-4 text-[#006837] rounded focus:ring-emerald-500 border-slate-300"
                  />
                  <span>2. Menentukan Benar / Salah</span>
                </label>
                {hasTrueFalse && (
                  <span className="text-[11px] font-bold bg-[#006837] text-white px-2 py-0.5 rounded-full">
                    {trueFalseCount} Butir
                  </span>
                )}
              </div>

              {hasTrueFalse && (
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Jumlah Butir Soal Benar / Salah
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="1"
                        max="15"
                        step="1"
                        value={trueFalseCount}
                        onChange={(e) => setTrueFalseCount(Number(e.target.value))}
                        className="flex-1 accent-[#006837]"
                      />
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={trueFalseCount}
                        onChange={(e) => setTrueFalseCount(Math.max(1, Number(e.target.value)))}
                        className="w-14 text-center font-bold px-1.5 py-1 rounded-md border border-slate-300 text-sm bg-white"
                      />
                    </div>
                  </div>

                  <div className="p-2.5 bg-white rounded-lg border border-emerald-200 text-xs">
                    <span className="font-bold text-slate-700 block mb-0.5">Tabel Verifikasi Konsep:</span>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Siswa memberi tanda centang/lingkar pada kolom <strong>[ Benar ]</strong> atau <strong>[ Salah ]</strong> untuk setiap pernyataan, disertai kunci dan pembahasan rujukan.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Box Mencocokkan Jawaban (Menjodohkan) */}
            <div className={`p-4 rounded-xl border transition-all ${
              hasMatching ? "bg-emerald-50/50 border-emerald-300 shadow-2xs" : "bg-slate-50 border-slate-200 opacity-60"
            }`}>
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 text-sm">
                  <input
                    type="checkbox"
                    checked={hasMatching}
                    onChange={(e) => setHasMatching(e.target.checked)}
                    className="w-4 h-4 text-[#006837] rounded focus:ring-emerald-500 border-slate-300"
                  />
                  <span>3. Mencocokkan (Menjodohkan)</span>
                </label>
                {hasMatching && (
                  <span className="text-[11px] font-bold bg-[#006837] text-white px-2 py-0.5 rounded-full">
                    {matchingCount} Butir
                  </span>
                )}
              </div>

              {hasMatching && (
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Jumlah Butir Soal Menjodohkan
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="1"
                        max="10"
                        step="1"
                        value={matchingCount}
                        onChange={(e) => setMatchingCount(Number(e.target.value))}
                        className="flex-1 accent-[#006837]"
                      />
                      <input
                        type="number"
                        min="1"
                        max="15"
                        value={matchingCount}
                        onChange={(e) => setMatchingCount(Math.max(1, Number(e.target.value)))}
                        className="w-14 text-center font-bold px-1.5 py-1 rounded-md border border-slate-300 text-sm bg-white"
                      />
                    </div>
                  </div>

                  <div className="p-2.5 bg-white rounded-lg border border-emerald-200 text-xs">
                    <span className="font-bold text-slate-700 block mb-0.5">Format Kolom Berpasangan:</span>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Memuat <strong>Kolom A (Premis/Pernyataan 1..N)</strong> dan <strong>Kolom B (Pasangan Pilihan A..N)</strong> dengan kunci pasangan yang presisi.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Box Literasi Teks & Data */}
            <div className={`p-4 rounded-xl border transition-all ${
              hasLiteracy ? "bg-emerald-50/50 border-emerald-300 shadow-2xs" : "bg-slate-50 border-slate-200 opacity-60"
            }`}>
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 text-sm">
                  <input
                    type="checkbox"
                    checked={hasLiteracy}
                    onChange={(e) => setHasLiteracy(e.target.checked)}
                    className="w-4 h-4 text-[#006837] rounded focus:ring-emerald-500 border-slate-300"
                  />
                  <span>4. Literasi Teks & Data (AKM)</span>
                </label>
                {hasLiteracy && (
                  <span className="text-[11px] font-bold bg-[#006837] text-white px-2 py-0.5 rounded-full">
                    {literacyCount} Kasus
                  </span>
                )}
              </div>

              {hasLiteracy && (
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Jumlah Soal Kasus Literasi & Data
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="1"
                        max="6"
                        step="1"
                        value={literacyCount}
                        onChange={(e) => setLiteracyCount(Number(e.target.value))}
                        className="flex-1 accent-[#006837]"
                      />
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={literacyCount}
                        onChange={(e) => setLiteracyCount(Math.max(1, Number(e.target.value)))}
                        className="w-14 text-center font-bold px-1.5 py-1 rounded-md border border-slate-300 text-sm bg-white"
                      />
                    </div>
                  </div>

                  <div className="p-2.5 bg-white rounded-lg border border-emerald-200 text-xs">
                    <span className="font-bold text-slate-700 block mb-0.5">Stimulus Wacana & Data Statistik:</span>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Wacana kontekstual/tabel data numerik dengan pertanyaan interpretasi kritis, evaluasi informasi, dan penalaran tingkat tinggi (HOTS).
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* 5. Box Soal Essay / Uraian */}
            <div className={`p-4 rounded-xl border transition-all md:col-span-2 lg:col-span-2 ${
              hasEssay ? "bg-emerald-50/50 border-emerald-300 shadow-2xs" : "bg-slate-50 border-slate-200 opacity-60"
            }`}>
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 text-sm">
                  <input
                    type="checkbox"
                    checked={hasEssay}
                    onChange={(e) => setHasEssay(e.target.checked)}
                    className="w-4 h-4 text-[#006837] rounded focus:ring-emerald-500 border-slate-300"
                  />
                  <span>5. Soal Essay / Uraian Komprehensif</span>
                </label>
                {hasEssay && (
                  <span className="text-[11px] font-bold bg-[#006837] text-white px-2 py-0.5 rounded-full">
                    {essayCount} Soal
                  </span>
                )}
              </div>

              {hasEssay && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Banyak Butir Soal Essay
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="1"
                        max="15"
                        step="1"
                        value={essayCount}
                        onChange={(e) => setEssayCount(Number(e.target.value))}
                        className="flex-1 accent-[#006837]"
                      />
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={essayCount}
                        onChange={(e) => setEssayCount(Math.max(1, Number(e.target.value)))}
                        className="w-14 text-center font-bold px-1.5 py-1 rounded-md border border-slate-300 text-sm bg-white"
                      />
                    </div>
                  </div>

                  <div className="p-2.5 bg-white rounded-lg border border-emerald-200 text-xs">
                    <span className="font-bold text-slate-700 block mb-0.5">Pedoman Kunci & Rubrik Skor:</span>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Lengkap dengan <strong>Model Jawaban Rinci</strong>, <strong>Kriteria Penskoran</strong>, dan <strong>Bobot Nilai</strong> di lembar kunci jawaban.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 4: MATERI / ACUAN PERMINTAAN SOAL (TEKS ATAU DOKUMEN PDF / FOTO BACAAN) */}
        <div>
          <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#006837] flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-[#006837] flex items-center justify-center text-xs font-black">
                4
              </span>
              Materi / Acuan Permintaan Soal (Uraian Tema & Upload Dokumen PDF / Foto Bacaan)
            </h3>
          </div>

          <div className="mt-4 space-y-4">
            {/* 13a. Input Uraian / Tema */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Uraian Materi / Tema / Kompetensi Dasar (KD) / Capaian Pembelajaran (CP)</span>
                <span className="text-[11px] font-normal text-slate-500">Opsional namun sangat disarankan</span>
              </label>
              <textarea
                rows={3}
                value={materialDescription}
                onChange={(e) => setMaterialDescription(e.target.value)}
                placeholder="Tuliskan tema materi, bab buku, konsep penting, atau kisi-kisi soal yang diinginkan..."
                className="w-full text-sm p-3 rounded-xl border border-slate-300 focus:border-[#006837] focus:ring-2 focus:ring-emerald-500/20 text-slate-800 shadow-xs"
              />
            </div>

            {/* 13b. Upload Multi-Dokumen & Foto (PDF, JPG, PNG, JPEG Hingga 10 File) & Pengaturan Teks Bacaan */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Upload Foto / Dokumen Teks Bacaan (Maksimal 10 File: PDF, JPG, PNG, JPEG)
                  </label>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Dokumen PDF atau foto dapat dijadikan teks bacaan, sumber/referensi, atau digunakan secara otomatis sesuai pilihan di bawah.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    uploadedPhotos.length > 0
                      ? "bg-[#006837] text-white"
                      : "bg-slate-100 text-slate-600 border border-slate-200"
                  }`}>
                    {uploadedPhotos.length} / 10 File
                  </span>
                  {uploadedPhotos.length > 0 && (
                    <button
                      type="button"
                      onClick={clearAllPhotos}
                      className="text-xs text-rose-600 hover:text-rose-700 font-semibold hover:underline flex items-center gap-1"
                      title="Hapus semua file dokumen/foto yang diunggah"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Semua</span>
                    </button>
                  )}
                </div>
              </div>

              {uploadedPhotos.length > 0 && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-900">Cara AI menggunakan dokumen yang diunggah</p>
                  <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-800">
                    <input type="checkbox" checked={includeUploadedAsReadingPassage} onChange={(e) => setIncludeUploadedAsReadingPassage(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[#006837]" />
                    <span><strong>Masukkan materi sebagai teks bacaan dalam naskah ujian.</strong><span className="block text-slate-600 mt-0.5">AI menyusun bacaan dari PDF/foto dan menghubungkannya dengan soal yang sesuai.</span></span>
                  </label>
                  <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-800">
                    <input type="checkbox" checked={useUploadedAsReference} onChange={(e) => setUseUploadedAsReference(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[#006837]" />
                    <span><strong>Gunakan materi hanya sebagai sumber/referensi pembuatan soal.</strong><span className="block text-slate-600 mt-0.5">AI mempelajari isi dokumen, tetapi tidak menampilkan salinan bacaan panjang di naskah.</span></span>
                  </label>
                  <p className="text-[11px] text-slate-600">Keduanya boleh dipilih bersamaan. Jika tidak ada yang dicentang, AI menentukan penggunaan dokumen secara otomatis.</p>
                </div>
              )}

              {uploadError && (
                <div className="bg-amber-50 border border-amber-300 text-amber-900 rounded-lg p-3 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Upload Dropzone / Button */}
              {uploadedPhotos.length < 10 && (
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-emerald-300 hover:border-[#006837] rounded-xl p-5 bg-emerald-50/30 hover:bg-emerald-50/60 cursor-pointer transition-all">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-[#006837] flex items-center justify-center mb-2 shadow-xs">
                    <Upload className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-bold text-slate-800 text-center">
                    {uploadedPhotos.length === 0
                      ? "Pilih atau Seret Dokumen PDF / Foto Bacaan (Hingga 10 File Sekaligus)"
                      : `+ Tambah Dokumen PDF / Foto Bacaan Lainnya (Sisa ${10 - uploadedPhotos.length} Slot)`}
                  </span>
                  <span className="text-xs text-slate-500 mt-0.5 text-center">
                    Format: <strong className="text-slate-700">PDF, JPG, PNG, JPEG</strong>. Otomatis diproses & dioptimasi langsung untuk AI.
                  </span>
                  <input
                    type="file"
                    accept="image/*,application/pdf,.pdf"
                    multiple
                    onChange={handlePhotosChange}
                    className="hidden"
                    disabled={isCompressing}
                  />
                </label>
              )}

              {isCompressing && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-center gap-2 text-xs text-emerald-800 font-semibold animate-pulse">
                  <div className="w-4 h-4 border-2 border-[#006837] border-t-transparent rounded-full animate-spin"></div>
                  <span>Sedang memproses dan mengoptimasi dokumen PDF / foto materi bacaan...</span>
                </div>
              )}

              {/* Gallery Grid of Uploaded Photos and PDF Documents */}
              {uploadedPhotos.length > 0 && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {uploadedPhotos.map((photo, index) => {
                      const isPdf =
                        photo.mimeType === "application/pdf" ||
                        photo.name.toLowerCase().endsWith(".pdf");

                      return (
                        <div
                          key={photo.id}
                          className="relative bg-white border border-emerald-200 hover:border-emerald-400 rounded-xl p-3 flex items-center gap-3 shadow-xs transition-all"
                        >
                          <div className="relative shrink-0">
                            {isPdf ? (
                              <div className="w-16 h-16 rounded-lg border border-rose-200 bg-rose-50 flex flex-col items-center justify-center text-rose-600 shadow-2xs">
                                <FileText className="w-7 h-7 text-rose-600 mb-0.5" />
                                <span className="text-[9px] font-black uppercase tracking-wider bg-rose-600 text-white px-1.5 py-0.2 rounded">
                                  PDF
                                </span>
                              </div>
                            ) : (
                              <img
                                src={photo.base64}
                                alt={`Materi Foto ${index + 1}`}
                                className="w-16 h-16 object-cover rounded-lg border border-slate-200 bg-slate-50"
                              />
                            )}
                            <span className="absolute -top-1.5 -left-1.5 bg-[#006837] text-[#f3e5ab] text-[10px] font-black px-1.5 py-0.2 rounded-full shadow-xs">
                              #{index + 1}
                            </span>
                          </div>

                          <div className="flex-1 min-w-0 text-xs">
                            <div className="font-bold text-slate-800 truncate" title={photo.name}>
                              {isPdf ? "PDF" : "Foto"} {index + 1}: {photo.name}
                            </div>
                            <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                              ➔ Teks Bacaan {index + 1}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                              <span>{Math.round(photo.size / 1024)} KB</span>
                              <span>•</span>
                              <span className={isPdf ? "font-bold text-rose-600 uppercase" : "text-slate-500 uppercase"}>
                                {isPdf ? "Dokumen PDF" : (photo.mimeType?.replace("image/", "") || "Gambar")}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => removePhoto(photo.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                            title={`Hapus File ${index + 1}`}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* PENGATURAN TEKS BACAAN PER SOAL (Misal: 1 Teks Bacaan untuk 5 Soal) */}
                  <div className="bg-emerald-50/70 border border-emerald-300 rounded-xl p-4 text-xs space-y-3">
                    <div className="flex items-center gap-2 text-emerald-950 font-bold">
                      <BookOpen className="w-4 h-4 text-[#006837]" />
                      <span>Pengaturan Soal Merujuk Teks Bacaan:</span>
                    </div>
                    
                    <p className="text-[11px] text-slate-700 leading-relaxed">
                      Jika opsi teks bacaan dipilih, AI menyusun wacana dari dokumen dan menghubungkan soal yang relevan. Jika tidak, AI mengikuti pilihan sumber/referensi atau mode otomatis.
                    </p>

                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <span className="text-xs font-semibold text-slate-800">
                        Banyak butir soal per 1 Teks Bacaan:
                      </span>
                      <div className="flex items-center gap-1.5">
                        {[3, 4, 5].map((count) => (
                          <button
                            key={count}
                            type="button"
                            onClick={() => setQuestionsPerPassage(count)}
                            className={`px-3 py-1.5 rounded-lg font-bold text-xs border transition-all ${
                              questionsPerPassage === count
                                ? "bg-[#006837] text-white border-[#006837] shadow-xs"
                                : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                            }`}
                          >
                            {count} Soal {count === 5 && "⭐ (Rekomendasi)"}
                          </button>
                        ))}
                        <div className="flex items-center gap-1 ml-1">
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={questionsPerPassage}
                            onChange={(e) => setQuestionsPerPassage(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
                            className="w-14 text-center font-bold px-2 py-1 rounded-lg border border-slate-300 text-xs bg-white"
                          />
                          <span className="text-[11px] text-slate-500">soal/bacaan</span>
                        </div>
                      </div>
                    </div>

                    {/* Simulasi Distribusi Bacaan */}
                    <div className="bg-white/90 border border-emerald-200 rounded-lg p-2.5 text-[11px] text-slate-700 space-y-1">
                      <div className="font-bold text-[#006837] flex items-center gap-1">
                        <span>📋 Simulasi Pembagian Teks Bacaan:</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 text-[11px] pt-0.5 text-slate-600">
                        {uploadedPhotos.slice(0, Math.min(uploadedPhotos.length, 6)).map((photo, idx) => {
                          const isPdf =
                            photo.mimeType === "application/pdf" ||
                            photo.name.toLowerCase().endsWith(".pdf");
                          const startQ = idx * questionsPerPassage + 1;
                          const endQ = Math.min((idx + 1) * questionsPerPassage, hasPg ? pgCount : 0);
                          return (
                            <div key={idx} className="flex items-center gap-1.5">
                              <span className="font-bold text-emerald-800">• {isPdf ? "PDF" : "Foto"} {idx + 1} ➔ Teks Bacaan {idx + 1}:</span>
                              <span>Soal No. {startQ} - {Math.max(startQ, endQ)}</span>
                            </div>
                          );
                        })}
                        {uploadedPhotos.length > 6 && (
                          <div className="italic text-slate-400">
                            ... dan {uploadedPhotos.length - 6} file dokumen/foto bacaan lainnya berurutan.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* HIGHLIGHT COMPLIANCE & RULES (14, 17, 18) */}
        <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 text-xs space-y-1.5 text-amber-950">
          <div className="font-bold flex items-center gap-1.5 text-amber-900">
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            Ketentuan Standar Format Otomatis:
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-amber-900/90 pt-1">
            <li className="flex items-start gap-1">
              <span className="font-bold text-emerald-700">✓</span>
              <span><strong>Bebas Kode LaTeX:</strong> Menggunakan simbol Unicode murni (x², ½, √, °C) yang ramah siswa.</span>
            </li>
            <li className="flex items-start gap-1">
              <span className="font-bold text-emerald-700">✓</span>
              <span><strong>Single Spacing:</strong> Jarak baris naskah rapat & hemat kertas sesuai format ujian nasional.</span>
            </li>
            <li className="flex items-start gap-1">
              <span className="font-bold text-emerald-700">✓</span>
              <span><strong>Lembar Terpisah:</strong> Kunci jawaban & rubrik otomatis dipisah di lembar terpisah (Page Break).</span>
            </li>
          </ul>
        </div>

        {/* SUBMIT BUTTON */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <span>Kop Madrasah aktif: <strong>{schoolIdentity.schoolName}</strong></span>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm tracking-wide text-white shadow-lg flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 ${
              isLoading
                ? "bg-slate-400 cursor-not-allowed"
                : "bg-gradient-to-r from-[#005a2f] via-[#006837] to-[#0a7a42] hover:from-[#004d26] hover:to-[#005a2f] shadow-emerald-900/20 active:scale-98"
            }`}
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Menyusun Soal dengan Gemini Flash...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-[#d4af37]" />
                <span>GENERATE SOAL SEKARANG</span>
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
};