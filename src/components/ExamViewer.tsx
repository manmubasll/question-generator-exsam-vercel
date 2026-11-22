import React, { useState } from "react";
import { AnswerSheetPanel } from "./AnswerSheetPanel";
import { ExamData, PaperSize, OptionLayout } from "../types";
import { SchoolHeaderKop } from "./SchoolHeaderKop";
import { exportToWord, exportToWordClassic, getEffectiveOptionLayout } from "../utils/exportWord";
import {
  exportRekapNilaiWordClassic,
  exportBeritaAcaraWordClassic,
  exportDaftarHadirWordClassic,
  exportKartuHasilWordClassic,
} from "../utils/exportAdminWord";
import {
  exportKisiKisiWordClassic,
  exportKisiKisiWordDocx,
  exportKartuSoalWordClassic,
  exportAnalisisSoalWordClassic,
  exportSemuaPedagogiWord,
} from "../utils/exportPedagogyWord";
import { exportToExcel } from "../utils/exportExcel";
import { openExamInNewTab, printExamDirectly, PrintViewMode } from "../utils/printExam";
import { KisiKisiView } from "./KisiKisiView";
import { KartuSoalView } from "./KartuSoalView";
import { AnalisisButirSoalView } from "./AnalisisButirSoalView";
import {
  Printer,
  FileSpreadsheet,
  FileText,
  Copy,
  Check,
  Eye,
  KeyRound,
  RotateCcw,
  Sparkles,
  ExternalLink,
  ChevronDown,
  Layers,
  BookOpen,
  Languages,
  Loader2,
  BarChart3,
  BookmarkCheck,
  LayoutGrid,
} from "lucide-react";

interface ExamViewerProps {
  examData: ExamData;
  onReset: () => void;
  onUpdateExamData: (updated: ExamData) => void;
}

export const ExamViewer: React.FC<ExamViewerProps> = ({
  examData,
  onReset,
  onUpdateExamData,
}) => {
  const [activeTab, setActiveTab] = useState<"soal" | "kunci" | "kisi-kisi" | "kartu-soal" | "analisis" | "lengkap">("soal");
  const [showAnswerSheet, setShowAnswerSheet] = useState(false);
  const [paperSize, setPaperSize] = useState<PaperSize>("A4");
  const [optionLayout, setOptionLayout] = useState<OptionLayout>(
    examData.optionLayout || examData.metadata?.optionLayout || "auto"
  );
  const [copied, setCopied] = useState(false);
  const [isExportingWord, setIsExportingWord] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [showWordMenu, setShowWordMenu] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translateSuccess, setTranslateSuccess] = useState<string | null>(null);

  const {
    schoolIdentity,
    metadata,
    generalInstructions,
    multipleChoiceQuestions,
    essayQuestions,
    trueFalseQuestions = [],
    matchingQuestions = [],
    literacyQuestions = [],
  } = examData;

  // Detect whether the exam is in Arabic language
  const isArabicExam =
    metadata.examLanguage === "ar" ||
    metadata.subjectName.toLowerCase().includes("bahasa arab") ||
    metadata.subjectName.toLowerCase().includes("arab") ||
    (multipleChoiceQuestions.length > 0 &&
      /[\u0600-\u06FF]/.test(multipleChoiceQuestions[0].questionText)) ||
    (essayQuestions.length > 0 &&
      /[\u0600-\u06FF]/.test(essayQuestions[0].questionText));

  // Helper to map option letter (e.g. A -> أ, B -> ب)
  const getOptionLabel = (key: string) => {
    if (!isArabicExam) return `${key}.`;
    const map: Record<string, string> = {
      A: "أ",
      B: "ب",
      C: "ج",
      D: "د",
      E: "هـ",
    };
    return `${map[key.toUpperCase()] || key}.`;
  };

  // Handler to translate whole exam to Arabic
  const handleTranslateToArabic = async () => {
    if (isTranslating) return;
    try {
      setIsTranslating(true);
      setTranslateSuccess(null);
      const response = await fetch("/api/translate-exam-to-arabic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examData }),
      });

      const rawText = await response.text();
      let updatedData: any;
      try {
        updatedData = JSON.parse(rawText);
      } catch (parseErr) {
        throw new Error(
          "Koneksi ke server penerjemahan sempat terputus. Silakan coba kembali sesaat lagi."
        );
      }

      if (!response.ok) {
        throw new Error(updatedData?.error || "Gagal mengubah naskah soal ke Bahasa Arab.");
      }

      onUpdateExamData(updatedData);
      setTranslateSuccess(
        "Naskah soal, opsi pilihan ganda, wacana bacaan, dan kunci jawaban berhasil diubah ke Bahasa Arab berharakat!"
      );
    } catch (err: any) {
      console.error("Error translating to Arabic:", err);
      let alertMsg = err.message || "Gagal mengubah naskah soal ke Bahasa Arab.";
      if (alertMsg.includes("<!doctype") || alertMsg.includes("is not valid JSON") || alertMsg.includes("Unexpected token")) {
        alertMsg = "Koneksi ke server sempat terputus. Silakan coba klik tombol kembali sesaat lagi.";
      }
      alert(alertMsg);
    } finally {
      setIsTranslating(false);
    }
  };

  const handlePrint = () => {
    printExamDirectly(examData, paperSize, activeTab, optionLayout);
  };

  const handleOpenNewTab = () => {
    openExamInNewTab(examData, paperSize, activeTab, optionLayout);
  };

  const handleDownloadWordDocx = async () => {
    try {
      setIsExportingWord(true);
      setShowWordMenu(false);
      await exportToWord(examData, paperSize, optionLayout);
    } catch (err) {
      console.error("Failed to export word:", err);
      alert("Gagal mengunduh dokumen Word.");
    } finally {
      setIsExportingWord(false);
    }
  };

  const handleDownloadWordClassic = () => {
    try {
      setShowWordMenu(false);
      exportToWordClassic(examData, paperSize, optionLayout);
    } catch (err) {
      console.error("Failed to export classic word:", err);
      alert("Gagal mengunduh dokumen Word Klasik.");
    }
  };

  const handleDownloadRekapNilai = () => {
    try {
      setShowWordMenu(false);
      exportRekapNilaiWordClassic(examData, paperSize);
    } catch (err) {
      console.error("Failed to export rekap nilai:", err);
      alert("Gagal mengunduh Rekap Nilai Siswa.");
    }
  };

  const handleDownloadBeritaAcara = () => {
    try {
      setShowWordMenu(false);
      exportBeritaAcaraWordClassic(examData, paperSize);
    } catch (err) {
      console.error("Failed to export berita acara:", err);
      alert("Gagal mengunduh Berita Acara Ujian.");
    }
  };

  const handleDownloadDaftarHadir = () => {
    try {
      setShowWordMenu(false);
      exportDaftarHadirWordClassic(examData, paperSize);
    } catch (err) {
      console.error("Failed to export daftar hadir:", err);
      alert("Gagal mengunduh Daftar Hadir Siswa.");
    }
  };

  const handleDownloadKartuHasil = () => {
    try {
      setShowWordMenu(false);
      exportKartuHasilWordClassic(examData, paperSize);
    } catch (err) {
      console.error("Failed to export kartu hasil:", err);
      alert("Gagal mengunduh Kartu Hasil Persiswa.");
    }
  };

  const handleDownloadKisiKisiDocx = async () => {
    try {
      setShowWordMenu(false);
      setIsExportingWord(true);
      await exportKisiKisiWordDocx(examData, paperSize);
    } catch (err) {
      console.error("Failed to export kisi-kisi docx:", err);
      exportKisiKisiWordClassic(examData, paperSize);
    } finally {
      setIsExportingWord(false);
    }
  };

  const handleDownloadKisiKisiDoc = () => {
    try {
      setShowWordMenu(false);
      exportKisiKisiWordClassic(examData, paperSize);
    } catch (err) {
      console.error("Failed to export kisi-kisi doc:", err);
      alert("Gagal mengunduh Kisi-Kisi Soal (.doc).");
    }
  };

  const handleDownloadKartuSoalDoc = () => {
    try {
      setShowWordMenu(false);
      exportKartuSoalWordClassic(examData, paperSize);
    } catch (err) {
      console.error("Failed to export kartu soal doc:", err);
      alert("Gagal mengunduh Kartu Soal (.doc).");
    }
  };

  const handleDownloadAnalisisDoc = () => {
    try {
      setShowWordMenu(false);
      exportAnalisisSoalWordClassic(examData, paperSize);
    } catch (err) {
      console.error("Failed to export analisis doc:", err);
      alert("Gagal mengunduh Analisis Butir Soal (.doc).");
    }
  };

  const handleDownloadSemuaPedagogi = () => {
    try {
      setShowWordMenu(false);
      exportSemuaPedagogiWord(examData, paperSize);
    } catch (err) {
      console.error("Failed to export pedagogy package:", err);
      alert("Gagal mengunduh paket pedagogi.");
    }
  };

  const handleDownloadSemuaAdmin = () => {
    try {
      setShowWordMenu(false);
      exportRekapNilaiWordClassic(examData, paperSize);
      setTimeout(() => exportBeritaAcaraWordClassic(examData, paperSize), 300);
      setTimeout(() => exportDaftarHadirWordClassic(examData, paperSize), 600);
      setTimeout(() => exportKartuHasilWordClassic(examData, paperSize), 900);
    } catch (err) {
      console.error("Failed to export admin package:", err);
      alert("Gagal mengunduh paket administrasi.");
    }
  };

  const handleDownloadExcel = () => {
    try {
      setIsExportingExcel(true);
      exportToExcel(examData);
    } catch (err) {
      console.error("Failed to export excel:", err);
      alert("Gagal mengunduh file Excel.");
    } finally {
      setIsExportingExcel(false);
    }
  };

  const getPassageStartingAt = (qNum: number) => {
    if (!examData.readingPassages || examData.readingPassages.length === 0) return null;
    return examData.readingPassages.find((p) => {
      if (Array.isArray(p.questionNumbers) && p.questionNumbers.length > 0) {
        return p.questionNumbers[0] === qNum;
      }
      return false;
    });
  };

  const getPassageStartingAtEssay = (eqNum: number) => {
    if (!examData.readingPassages || examData.readingPassages.length === 0) return null;

    for (let pIdx = 0; pIdx < examData.readingPassages.length; pIdx++) {
      const p = examData.readingPassages[pIdx];

      // 1. Explicit essayQuestionNumbers array
      if (Array.isArray(p.essayQuestionNumbers) && p.essayQuestionNumbers.length > 0) {
        if (p.essayQuestionNumbers[0] === eqNum) {
          return p;
        }
      }

      // 2. Find all essay questions with readingPassageId === p.id
      const matchingEqs = essayQuestions.filter((eq) => eq.readingPassageId === p.id);
      if (matchingEqs.length > 0 && matchingEqs[0].number === eqNum) {
        return p;
      }

      // 3. Fallback: If exam has no PG questions (only essay questions), and p is passage #0
      if (
        pIdx === 0 &&
        eqNum === 1 &&
        multipleChoiceQuestions.length === 0 &&
        (!p.questionNumbers || p.questionNumbers.length === 0)
      ) {
        return p;
      }

      // 4. Special fallback for Language subjects (Bahasa Arab, Bahasa Indonesia, Bahasa Inggris)
      const isLang =
        isArabicExam ||
        /bahasa\s*(arab|indonesia|inggris|jawa|sunda)|arabic|english|indonesian/i.test(metadata.subjectName);

      const anyEssayHasPassageId = essayQuestions.some((eq) => !!eq.readingPassageId);
      if (isLang && !anyEssayHasPassageId && pIdx === 0 && eqNum === 1) {
        return p;
      }
    }

    return null;
  };

  const handleCopyText = () => {
    let fullText = `${metadata.examType.toUpperCase()}\n`;
    fullText += `Mata Pelajaran: ${metadata.subjectName}\n`;
    fullText += `Kelas: ${metadata.grade} (${metadata.gradeLevel}) | Semester: ${metadata.semester}\n`;
    fullText += `Guru: ${metadata.teacherName} | Tanggal: ${metadata.examDate}\n\n`;

    if (multipleChoiceQuestions.length > 0) {
      fullText += `A. PILIHAN GANDA\n`;
      multipleChoiceQuestions.forEach((q) => {
        const passage = getPassageStartingAt(q.number);
        if (passage) {
          fullText += `\n[ ${passage.title.toUpperCase()} ]\n`;
          fullText += `(Bacalah teks berikut untuk menjawab ${passage.questionRange || "soal berikut"}!)\n`;
          fullText += `${passage.content}\n\n`;
        }
        fullText += `${q.number}. ${q.questionText}\n`;
        q.options.forEach((opt) => {
          fullText += `   ${opt.key}. ${opt.text}\n`;
        });
        fullText += `\n`;
      });
    }

    if (trueFalseQuestions.length > 0) {
      fullText += `\nB. MENENTUKAN BENAR / SALAH\n`;
      trueFalseQuestions.forEach((tf) => {
        fullText += `${tf.number}. ${tf.instruction}\n`;
        if (tf.contextOrPassage) {
          fullText += `   [Stimulus: ${tf.contextOrPassage}]\n`;
        }
        tf.statements.forEach((s, idx) => {
          fullText += `   (${idx + 1}) [   ] Benar  [   ] Salah : ${s.statement}\n`;
        });
        fullText += `\n`;
      });
    }

    if (matchingQuestions.length > 0) {
      fullText += `\nC. MENCOCOKKAN JAWABAN (MENJODOHKAN)\n`;
      matchingQuestions.forEach((mq) => {
        fullText += `${mq.number}. ${mq.instruction}\n`;
        fullText += `   ${mq.premiseColumnTitle || "Kolom A (Premis)"} <---> ${mq.targetColumnTitle || "Kolom B (Pasangan)"}\n`;
        mq.premises.forEach((p) => {
          fullText += `   [${p.key}] ${p.text}\n`;
        });
        fullText += `   Pilihan Pasangan:\n`;
        mq.targets.forEach((t) => {
          fullText += `   (${t.key}) ${t.text}\n`;
        });
        fullText += `\n`;
      });
    }

    if (literacyQuestions.length > 0) {
      fullText += `\nD. LITERASI TEKS & DATA\n`;
      literacyQuestions.forEach((lq) => {
        fullText += `${lq.number}. [ ${lq.stimulusTitle} ]\n`;
        fullText += `${lq.stimulusContent}\n`;
        if (lq.dataSnippet) {
          fullText += `Data Tabel / Statistik:\n${lq.dataSnippet}\n`;
        }
        fullText += `Pertanyaan: ${lq.questionText}\n`;
        if (lq.options) {
          lq.options.forEach((opt) => {
            fullText += `   ${opt.key}. ${opt.text}\n`;
          });
        }
        if (lq.subQuestions) {
          lq.subQuestions.forEach((sq) => {
            fullText += `   (${sq.id}) ${sq.question}\n`;
          });
        }
        fullText += `\n`;
      });
    }

    if (essayQuestions.length > 0) {
      fullText += `\nE. ESSAY / URAIAN\n`;
      essayQuestions.forEach((eq) => {
        const passage = getPassageStartingAtEssay(eq.number);
        if (passage) {
          fullText += `\n[ ${passage.title.toUpperCase()} ]\n`;
          fullText += `(Bacalah teks berikut untuk menjawab soal essay ${passage.essayQuestionNumbers && passage.essayQuestionNumbers.length > 0 ? `nomor ${passage.essayQuestionNumbers.join(", ")}` : "berikut"}!)\n`;
          fullText += `${passage.content}\n\n`;
        }
        fullText += `${eq.number}. ${eq.questionText}\n\n`;
      });
    }

    fullText += `\n====================================\n`;
    fullText += `KUNCI JAWABAN & PEMBAHASAN\n`;
    if (multipleChoiceQuestions.length > 0) {
      fullText += `I. Kunci Pilihan Ganda:\n`;
      multipleChoiceQuestions.forEach((q) => {
        fullText += `${q.number}. Kunci: ${q.correctAnswer} - ${q.explanation}\n`;
      });
    }
    if (trueFalseQuestions.length > 0) {
      fullText += `\nII. Kunci Benar / Salah:\n`;
      trueFalseQuestions.forEach((tf) => {
        fullText += `Nomor ${tf.number}:\n`;
        tf.statements.forEach((s, idx) => {
          fullText += `   (${idx + 1}) ${s.isCorrect ? "BENAR" : "SALAH"}: ${s.explanation || s.statement}\n`;
        });
      });
    }
    if (matchingQuestions.length > 0) {
      fullText += `\nIII. Kunci Pasangan Menjodohkan:\n`;
      matchingQuestions.forEach((mq) => {
        const pairsStr = mq.correctPairs.map((p) => `${p.premiseKey} -> ${p.targetKey}`).join(", ");
        fullText += `Nomor ${mq.number}: Pasangan: ${pairsStr}\n`;
      });
    }
    if (literacyQuestions.length > 0) {
      fullText += `\nIV. Kunci Literasi Teks & Data:\n`;
      literacyQuestions.forEach((lq) => {
        fullText += `Nomor ${lq.number}: Kunci: ${lq.correctAnswer} - ${lq.explanation}\n`;
        if (lq.subQuestions) {
          lq.subQuestions.forEach((sq) => {
            fullText += `   Sub (${sq.id}): ${sq.answerKey} (${sq.explanation})\n`;
          });
        }
      });
    }
    if (essayQuestions.length > 0) {
      fullText += `\nV. Model Jawaban Essay:\n`;
      essayQuestions.forEach((eq) => {
        fullText += `Essay No ${eq.number}: Model Jawaban: ${eq.modelAnswer} (Rubrik: ${eq.scoringRubric})\n`;
      });
    }

    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
        <div><div className="font-bold text-emerald-950">Lembar Jawaban & Koreksi Otomatis</div><p className="text-xs text-emerald-800">Cetak lembar jawaban, unggah foto/scan, lalu tinjau hasil pembacaan.</p></div>
        <button type="button" onClick={() => setShowAnswerSheet(v => !v)} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800">{showAnswerSheet ? "Tutup Fitur" : "Buka Lembar Jawaban"}</button>
      </div>
      {showAnswerSheet && <AnswerSheetPanel examData={examData} />}

      {/* Top Action Bar (Hidden on Print) */}
      <div className="no-print bg-white p-4 sm:p-5 rounded-2xl shadow-md border border-emerald-100 flex flex-col gap-4">
        
        {/* Row 1: View Modes, Paper Size Selector & Reset */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          
          {/* View Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setActiveTab("soal")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "soal"
                  ? "bg-[#006837] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Naskah Soal</span>
            </button>

            <button
              onClick={() => setActiveTab("kunci")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "kunci"
                  ? "bg-[#006837] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Kunci & Rubrik</span>
            </button>

            <button
              onClick={() => setActiveTab("kisi-kisi")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "kisi-kisi"
                  ? "bg-[#006837] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Kisi-Kisi Soal</span>
            </button>

            <button
              onClick={() => setActiveTab("kartu-soal")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "kartu-soal"
                  ? "bg-[#006837] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Kartu Soal</span>
            </button>

            <button
              onClick={() => setActiveTab("analisis")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "analisis"
                  ? "bg-[#006837] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Analisis Butir Soal</span>
            </button>

            <button
              onClick={() => setActiveTab("lengkap")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "lengkap"
                  ? "bg-[#006837] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Semua Dokumen</span>
            </button>
          </div>

          {/* Paper Size Selector (A4 vs F4) */}
          <div className="flex items-center gap-2 bg-amber-50/80 border border-amber-200/80 px-3 py-1.5 rounded-xl">
            <span className="text-xs font-bold text-amber-900 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-amber-700" />
              Ukuran Kertas:
            </span>
            <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-amber-300/60">
              <button
                onClick={() => setPaperSize("A4")}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                  paperSize === "A4"
                    ? "bg-[#006837] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
                title="Ukuran Standar ISO A4: 210 x 297 mm"
              >
                📄 A4 (210×297)
              </button>
              <button
                onClick={() => setPaperSize("F4")}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                  paperSize === "F4"
                    ? "bg-[#006837] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
                title="Ukuran Standar Folio / F4 Indonesia: 215 x 330 mm"
              >
                📑 F4 / Folio (215×330)
              </button>
            </div>
          </div>

          {/* Option Layout Selector (Menyamping / Hemat Kertas) */}
          {multipleChoiceQuestions.length > 0 && (
            <div className="flex items-center gap-2 bg-emerald-50/80 border border-emerald-200/80 px-3 py-1.5 rounded-xl">
              <span className="text-xs font-bold text-emerald-950 flex items-center gap-1">
                <LayoutGrid className="w-3.5 h-3.5 text-emerald-700" />
                Format Opsi PG:
              </span>
              <div className="flex items-center gap-0.5 bg-white p-0.5 rounded-lg border border-emerald-300/60">
                <button
                  onClick={() => setOptionLayout("auto")}
                  className={`px-2 py-1 rounded text-xs font-bold transition-all ${
                    optionLayout === "auto"
                      ? "bg-[#006837] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                  title="Otomatis menyamping jika teks opsi pendek (sangat hemat lembar kertas!)"
                >
                  ⚡ Otomatis (Hemat Kertas)
                </button>
                <button
                  onClick={() => setOptionLayout("horizontal")}
                  className={`px-2 py-1 rounded text-xs font-bold transition-all ${
                    optionLayout === "horizontal"
                      ? "bg-[#006837] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                  title="Paksa berjejer 1 baris menyamping (A. ...  B. ...  C. ...)"
                >
                  ↔️ 1 Baris
                </button>
                <button
                  onClick={() => setOptionLayout("2col")}
                  className={`px-2 py-1 rounded text-xs font-bold transition-all ${
                    optionLayout === "2col"
                      ? "bg-[#006837] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                  title="2 kolom berdampingan (A, B di kolom 1 & 2)"
                >
                  🔲 2 Kolom
                </button>
                <button
                  onClick={() => setOptionLayout("vertical")}
                  className={`px-2 py-1 rounded text-xs font-bold transition-all ${
                    optionLayout === "vertical"
                      ? "bg-[#006837] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                  title="Vertikal standar 1 kolom"
                >
                  ⬇️ Vertikal
                </button>
              </div>
            </div>
          )}

          {/* Buat Soal Baru Button */}
          <button
            onClick={onReset}
            className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Buat Soal Baru</span>
          </button>
        </div>

        {/* Row 2: Export & Print Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Word Download with Dropdown (.docx & .doc) */}
            <div className="relative">
              <div className="inline-flex rounded-xl shadow-xs">
                <button
                  onClick={handleDownloadWordDocx}
                  disabled={isExportingWord}
                  className="flex items-center gap-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold px-3.5 py-2 rounded-l-xl transition-colors"
                  title={`Download Word (.docx) Kompatibel Word 2007 hingga 2024 - Format ${paperSize}`}
                >
                  <FileText className="w-4 h-4 text-blue-200" />
                  <span>{isExportingWord ? "Menyiapkan Word..." : `Download WORD (.docx)`}</span>
                  <span className="text-[10px] bg-blue-900/60 text-blue-100 px-1.5 py-0.5 rounded font-mono">
                    {paperSize}
                  </span>
                </button>
                <button
                  onClick={() => setShowWordMenu(!showWordMenu)}
                  className="bg-blue-800 hover:bg-blue-900 text-white px-2 py-2 rounded-r-xl border-l border-blue-600 transition-colors"
                  title="Pilihan Format Word (Office 2007+ atau Word Klasik)"
                >
                  <ChevronDown className="w-3.5 h-3.5 text-blue-200" />
                </button>
              </div>

              {/* Word Format Dropdown */}
              {showWordMenu && (
                <div className="absolute left-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 p-2 space-y-1 divide-y divide-slate-100 animate-in fade-in">
                  <div className="space-y-1">
                    <div className="text-[10px] font-extrabold uppercase text-slate-400 px-2.5 py-1 tracking-wider">
                      Naskah Soal & Kunci
                    </div>
                    <button
                      onClick={handleDownloadWordDocx}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-blue-50 rounded-xl flex flex-col transition-colors"
                    >
                      <span className="font-bold text-blue-900 flex items-center gap-1.5">
                        📄 Naskah Soal (.docx)
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Format Word Standar (Office 2007–2024, Kertas {paperSize})
                      </span>
                    </button>
                    <button
                      onClick={handleDownloadWordClassic}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-blue-50 rounded-xl flex flex-col transition-colors"
                    >
                      <span className="font-bold text-blue-900 flex items-center gap-1.5">
                        📑 Naskah Soal Word 2007 (.doc)
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Format Word Klasik siap dibuka di Office 2007/2003 & WPS
                      </span>
                    </button>
                  </div>

                  <div className="pt-2 space-y-1">
                    <div className="text-[10px] font-extrabold uppercase text-emerald-800 px-2.5 py-1 tracking-wider flex items-center justify-between">
                      <span>Dokumen Pedagogi & Asesmen</span>
                      <span className="bg-emerald-100 text-emerald-900 text-[9px] px-1.5 py-0.5 rounded font-bold">Word / DOC</span>
                    </div>
                    <button
                      onClick={handleDownloadKisiKisiDocx}
                      className="w-full text-left px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-emerald-50 rounded-xl flex items-center gap-2.5 transition-colors"
                    >
                      <span className="text-base">📑</span>
                      <div>
                        <div className="font-bold text-slate-900">Kisi-Kisi Penulisan Soal (.docx)</div>
                        <div className="text-[10px] text-slate-500">Matriks KD/CP, materi, indikator, level kognitif & kesukaran</div>
                      </div>
                    </button>
                    <button
                      onClick={handleDownloadKisiKisiDoc}
                      className="w-full text-left px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-emerald-50 rounded-xl flex items-center gap-2.5 transition-colors"
                    >
                      <span className="text-base">📄</span>
                      <div>
                        <div className="font-bold text-slate-900">Kisi-Kisi Soal Format 2007 (.doc)</div>
                        <div className="text-[10px] text-slate-500">Kompatibel Office 2003/2007 & WPS Office</div>
                      </div>
                    </button>
                    <button
                      onClick={handleDownloadKartuSoalDoc}
                      className="w-full text-left px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-emerald-50 rounded-xl flex items-center gap-2.5 transition-colors"
                    >
                      <span className="text-base">🗂️</span>
                      <div>
                        <div className="font-bold text-slate-900">Kartu Soal Lengkap (.doc)</div>
                        <div className="text-[10px] text-slate-500">Buku/Kartu butir soal standar Puspendik/Kemendikbud</div>
                      </div>
                    </button>
                    <button
                      onClick={handleDownloadAnalisisDoc}
                      className="w-full text-left px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-emerald-50 rounded-xl flex items-center gap-2.5 transition-colors"
                    >
                      <span className="text-base">📊</span>
                      <div>
                        <div className="font-bold text-slate-900">Analisis Butir Soal (.doc)</div>
                        <div className="text-[10px] text-slate-500">Spesifikasi, sebaran Bloom L1-L3, kesukaran & telaah kualitatif</div>
                      </div>
                    </button>
                    <button
                      onClick={handleDownloadSemuaPedagogi}
                      className="w-full text-left px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-xl flex items-center gap-2 transition-colors"
                    >
                      <span className="text-base">📦</span>
                      <span>Download Paket Pedagogi (Kisi-Kisi + Kartu + Analisis)</span>
                    </button>
                  </div>

                  <div className="pt-2 space-y-1">
                    <div className="text-[10px] font-extrabold uppercase text-amber-800 px-2.5 py-1 tracking-wider flex items-center justify-between">
                      <span>Administrasi Pelaksanaan Ujian</span>
                      <span className="bg-amber-100 text-amber-900 text-[9px] px-1.5 py-0.5 rounded font-bold">.doc</span>
                    </div>
                    <button
                      onClick={handleDownloadRekapNilai}
                      className="w-full text-left px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-amber-50 rounded-xl flex items-center gap-2.5 transition-colors"
                    >
                      <span className="text-base">📊</span>
                      <div>
                        <div className="font-bold text-slate-900">Rekap Nilai Siswa</div>
                        <div className="text-[10px] text-slate-500">Format nilai PG, essay, NA, KKM & predikat</div>
                      </div>
                    </button>
                    <button
                      onClick={handleDownloadBeritaAcara}
                      className="w-full text-left px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-amber-50 rounded-xl flex items-center gap-2.5 transition-colors"
                    >
                      <span className="text-base">📋</span>
                      <div>
                        <div className="font-bold text-slate-900">Berita Acara Ujian</div>
                        <div className="text-[10px] text-slate-500">Format resmi berita acara & tanda tangan pengawas</div>
                      </div>
                    </button>
                    <button
                      onClick={handleDownloadDaftarHadir}
                      className="w-full text-left px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-amber-50 rounded-xl flex items-center gap-2.5 transition-colors"
                    >
                      <span className="text-base">📝</span>
                      <div>
                        <div className="font-bold text-slate-900">Daftar Hadir Siswa</div>
                        <div className="text-[10px] text-slate-500">Presensi resmi peserta ujian dengan tanda tangan zig-zag</div>
                      </div>
                    </button>
                    <button
                      onClick={handleDownloadKartuHasil}
                      className="w-full text-left px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-amber-50 rounded-xl flex items-center gap-2.5 transition-colors"
                    >
                      <span className="text-base">🪪</span>
                      <div>
                        <div className="font-bold text-slate-900">Kartu Hasil Persiswa</div>
                        <div className="text-[10px] text-slate-500">2 kartu per lembar siap dibagikan ke siswa/wali murid</div>
                      </div>
                    </button>
                    <button
                      onClick={handleDownloadSemuaAdmin}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-xl flex items-center gap-2 mt-1 transition-colors"
                    >
                      <span className="text-base">📦</span>
                      <span>Download Semua Dokumen Administrasi (.doc)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Export to Excel (.xlsx) */}
            <button
              onClick={handleDownloadExcel}
              disabled={isExportingExcel}
              className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs transition-colors"
              title="Download Kisi-kisi & Butir Soal dalam Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
              <span>{isExportingExcel ? "Menyiapkan..." : "Export EXCEL (.xlsx)"}</span>
            </button>

            {/* Print / Save as PDF (Direct) */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs transition-colors"
              title={`Cetak atau Simpan PDF dengan Ukuran Kertas ${paperSize}`}
            >
              <Printer className="w-4 h-4 text-amber-300" />
              <span>Cetak / Simpan PDF ({paperSize})</span>
            </button>

            {/* Open in New Tab & Print (Buka Tab Baru) */}
            <button
              onClick={handleOpenNewTab}
              className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-extrabold px-3.5 py-2 rounded-xl shadow-xs transition-all transform active:scale-95"
              title={`Buka Lembar Soal & Kunci di Tab Baru untuk Pratinjau & Print Bersih (${paperSize})`}
            >
              <ExternalLink className="w-4 h-4 text-amber-200" />
              <span>Buka di Tab Baru (Open New Tab)</span>
            </button>

            {/* Tombol Ubah ke Bahasa Arab */}
            <button
              onClick={handleTranslateToArabic}
              disabled={isTranslating}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold shadow-xs transition-all transform active:scale-95 ${
                isArabicExam
                  ? "bg-amber-500 hover:bg-amber-600 text-white ring-2 ring-amber-300"
                  : "bg-gradient-to-r from-[#006837] to-[#004d26] hover:from-[#00552b] hover:to-[#00381b] text-[#f3e5ab] ring-1 ring-[#d4af37]/60"
              }`}
              title="Ubah & Terjemahkan seluruh butir soal, opsi jawaban, teks wacana bacaan, dan kunci jawaban ke Bahasa Arab berharakat fush-ha"
            >
              {isTranslating ? (
                <Loader2 className="w-4 h-4 text-amber-300 animate-spin" />
              ) : (
                <Languages className="w-4 h-4 text-amber-300" />
              )}
              <span>
                {isTranslating
                  ? "Menerjemahkan..."
                  : isArabicExam
                  ? "Perbarui Teks Arab"
                  : "Ubah ke Bahasa Arab (العربية)"}
              </span>
            </button>
          </div>

          {/* Copy Text */}
          <button
            onClick={handleCopyText}
            className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-2 rounded-xl transition-colors"
            title="Salin seluruh teks naskah soal dan kunci ke clipboard"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700 font-bold">Tersalin!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Salin Teks</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Translation Success Notification */}
      {translateSuccess && (
        <div className="no-print bg-amber-50 border-2 border-amber-300 rounded-xl p-3 flex items-center justify-between text-xs text-amber-950 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="text-base">🇸🇦</span>
            <div>
              <p className="font-bold text-amber-900">
                Alhamdulillah! Naskah Soal & Kunci Jawaban Berhasil Diubah ke Bahasa Arab
              </p>
              <p className="text-amber-800 text-[11px] font-arabic leading-normal">
                تم تحويل الأسئلة والخيارات والقطعة ونموذج الإجابة إلى اللغة العربية الفصحى مع التشكيل الكامل.
              </p>
            </div>
          </div>
          <button
            onClick={() => setTranslateSuccess(null)}
            className="text-amber-700 hover:text-amber-900 font-bold text-sm px-2 py-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Information & Status Banner */}
      <div className="no-print bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-900">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#006837] shrink-0" />
          <span>
            Format siap cetak: <strong>Kertas {paperSize}</strong> • <strong>Kompatibel Word 2007</strong> • <strong>Lembar Kunci Terpisah</strong>.
          </span>
        </div>
        <div className="flex items-center gap-2 font-bold text-[#006837]">
          <span>
            {multipleChoiceQuestions.length} PG ({metadata.gradeLevel.includes("MI") ? "3 Opsi" : metadata.gradeLevel.includes("MTs") ? "4 Opsi" : "5 Opsi"}) • {essayQuestions.length} Essay
            {examData.readingPassages && examData.readingPassages.length > 0 && (
              <span className="text-emerald-800 font-semibold"> • {examData.readingPassages.length} Teks Wacana/Bacaan</span>
            )}
          </span>
          <span className="bg-emerald-200/80 text-emerald-950 px-2 py-0.5 rounded text-[11px]">
            {paperSize === "F4" ? "Folio (215 x 330 mm)" : "A4 (210 x 297 mm)"}
          </span>
        </div>
      </div>

      {/* Dokumen Pedagogis: Kisi-Kisi, Kartu Soal & Analisis Quick Access Card */}
      <div className="no-print bg-gradient-to-r from-emerald-50 via-teal-50 to-green-50 border border-emerald-200 rounded-2xl p-3.5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5 pb-2 border-b border-emerald-100">
          <div className="flex items-center gap-2">
            <span className="bg-[#006837] text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md tracking-wider">
              PEDAGOGIS
            </span>
            <div>
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <span>📚 Dokumen Kisi-Kisi, Kartu Soal & Analisis Butir Soal</span>
              </h4>
              <p className="text-[11px] text-slate-500">
                Lengkap dengan Capaian Pembelajaran / KD, Indikator, Level Kognitif Bloom (L1-L3), dan Tingkat Kesukaran
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadSemuaPedagogi}
              className="flex items-center gap-1.5 bg-[#006837] hover:bg-[#00542c] text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs transition-all active:scale-95"
              title="Unduh Kisi-Kisi, Kartu Soal, dan Analisis Butir Soal dalam format Word (.doc)"
            >
              <span>📦</span>
              <span>Unduh Paket Pedagogi (.doc)</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            onClick={() => setActiveTab("kisi-kisi")}
            className="flex items-center justify-between p-2.5 bg-white hover:bg-emerald-50/70 border border-emerald-200 hover:border-emerald-400 rounded-xl transition-all text-left shadow-2xs group"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-xl group-hover:scale-110 transition-transform">📑</span>
              <div>
                <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-900">Kisi-Kisi Soal (Blueprint)</div>
                <div className="text-[10px] text-slate-500">Matriks KD, Indikator & Level Kognitif</div>
              </div>
            </div>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              Lihat Tab →
            </span>
          </button>

          <button
            onClick={() => setActiveTab("kartu-soal")}
            className="flex items-center justify-between p-2.5 bg-white hover:bg-emerald-50/70 border border-emerald-200 hover:border-emerald-400 rounded-xl transition-all text-left shadow-2xs group"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-xl group-hover:scale-110 transition-transform">🗂️</span>
              <div>
                <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-900">Kartu Soal Ujian</div>
                <div className="text-[10px] text-slate-500">Kartu per butir soal standar Puspendik</div>
              </div>
            </div>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              Lihat Tab →
            </span>
          </button>

          <button
            onClick={() => setActiveTab("analisis")}
            className="flex items-center justify-between p-2.5 bg-white hover:bg-emerald-50/70 border border-emerald-200 hover:border-emerald-400 rounded-xl transition-all text-left shadow-2xs group"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-xl group-hover:scale-110 transition-transform">📊</span>
              <div>
                <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-900">Analisis Butir Soal</div>
                <div className="text-[10px] text-slate-500">Sebaran L1-L3, kesukaran & telaah kualitatif</div>
              </div>
            </div>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              Lihat Tab →
            </span>
          </button>
        </div>
      </div>

      {/* Dokumen Administrasi Ujian Word 2007 Quick Access Card */}
      <div className="no-print bg-gradient-to-r from-blue-50/90 via-slate-50 to-indigo-50/80 border border-blue-200/80 rounded-2xl p-3.5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5 pb-2 border-b border-blue-100">
          <div className="flex items-center gap-2">
            <span className="bg-blue-700 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md tracking-wider">
              OFFICE 2007
            </span>
            <div>
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <span>📁 Dokumen Administrasi Ujian Lengkap (Format Word .doc)</span>
              </h4>
              <p className="text-[11px] text-slate-500">
                Otomatis menggunakan KOP Sekolah/Madrasah resmi, tanda tangan pengawas & kepala sekolah
              </p>
            </div>
          </div>
          <button
            onClick={handleDownloadSemuaAdmin}
            className="flex items-center gap-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs transition-all active:scale-95"
            title="Download Rekap Nilai, Berita Acara, Daftar Hadir, dan Kartu Hasil sekaligus"
          >
            <span>📦</span>
            <span>Download Semua Paket (.doc)</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            onClick={handleDownloadRekapNilai}
            className="flex items-center gap-2.5 p-2 bg-white hover:bg-blue-50/80 border border-slate-200 hover:border-blue-400 rounded-xl transition-all text-left shadow-2xs group"
          >
            <span className="text-xl group-hover:scale-110 transition-transform">📊</span>
            <div>
              <div className="text-xs font-bold text-slate-800 group-hover:text-blue-900">Rekap Nilai Siswa</div>
              <div className="text-[10px] text-slate-500">Nilai PG, Essay, KKM (.doc)</div>
            </div>
          </button>

          <button
            onClick={handleDownloadBeritaAcara}
            className="flex items-center gap-2.5 p-2 bg-white hover:bg-blue-50/80 border border-slate-200 hover:border-blue-400 rounded-xl transition-all text-left shadow-2xs group"
          >
            <span className="text-xl group-hover:scale-110 transition-transform">📋</span>
            <div>
              <div className="text-xs font-bold text-slate-800 group-hover:text-blue-900">Berita Acara Ujian</div>
              <div className="text-[10px] text-slate-500">Kehadiran & Berita Resmi (.doc)</div>
            </div>
          </button>

          <button
            onClick={handleDownloadDaftarHadir}
            className="flex items-center gap-2.5 p-2 bg-white hover:bg-blue-50/80 border border-slate-200 hover:border-blue-400 rounded-xl transition-all text-left shadow-2xs group"
          >
            <span className="text-xl group-hover:scale-110 transition-transform">📝</span>
            <div>
              <div className="text-xs font-bold text-slate-800 group-hover:text-blue-900">Daftar Hadir Ujian</div>
              <div className="text-[10px] text-slate-500">Presensi & Tanda Tangan (.doc)</div>
            </div>
          </button>

          <button
            onClick={handleDownloadKartuHasil}
            className="flex items-center gap-2.5 p-2 bg-white hover:bg-blue-50/80 border border-slate-200 hover:border-blue-400 rounded-xl transition-all text-left shadow-2xs group"
          >
            <span className="text-xl group-hover:scale-110 transition-transform">🪪</span>
            <div>
              <div className="text-xs font-bold text-slate-800 group-hover:text-blue-900">Kartu Hasil Persiswa</div>
              <div className="text-[10px] text-slate-500">2 Kartu per Lembar (.doc)</div>
            </div>
          </button>
        </div>
      </div>

      {/* View Component Switcher for Dedicated Pedagogical Documents */}
      {activeTab === "kisi-kisi" && (
        <KisiKisiView examData={examData} paperSize={paperSize} />
      )}

      {activeTab === "kartu-soal" && (
        <KartuSoalView examData={examData} paperSize={paperSize} />
      )}

      {activeTab === "analisis" && (
        <AnalisisButirSoalView examData={examData} paperSize={paperSize} />
      )}

      {/* PAPER CANVAS: Authentic Exam Document View (Naskah Soal, Kunci, atau Lengkap) */}
      {(activeTab === "soal" || activeTab === "kunci" || activeTab === "lengkap") && (
        <div 
          className={`mx-auto bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden print:border-none print:shadow-none transition-all ${
            paperSize === "F4" ? "max-w-[850px]" : "max-w-[800px]"
          }`}
        >
        
        {/* ============================================================ */}
        {/* BAGIAN 1: NASKAH SOAL SISWA */}
        {/* ============================================================ */}
        {(activeTab === "soal" || activeTab === "lengkap") && (
          <div className="p-6 sm:p-10 font-serif text-slate-900 leading-normal">
            
            {/* Kop Madrasah / Sekolah */}
            <SchoolHeaderKop identity={schoolIdentity} />

            {/* Judul Ujian */}
            <div className="text-center my-4">
              <h2 className="text-base sm:text-lg font-bold uppercase tracking-wider text-slate-900">
                NASKAH SOAL {metadata.examType.toUpperCase()}
              </h2>
              <p className="text-xs sm:text-sm font-bold text-slate-700">
                TAHUN AJARAN {metadata.academicYear}
              </p>
            </div>

            {/* Tabel Identitas Soal (Kolom Kanan Digeser Ketengah & Tidak Terbelah Dua Baris) */}
            <div className="my-4 border border-slate-400 rounded-md p-3 text-xs sm:text-sm font-sans bg-slate-50/60 overflow-x-auto">
              <table className="w-full border-collapse">
                <tbody>
                  <tr>
                    <td className="w-[15%] font-semibold text-slate-700 whitespace-nowrap py-0.5">Mata Pelajaran</td>
                    <td className="w-[2%] text-center py-0.5">:</td>
                    <td className="w-[31%] font-bold text-slate-900 py-0.5 pr-2">{metadata.subjectName}</td>
                    <td className="w-[15%] font-semibold text-slate-700 whitespace-nowrap py-0.5 pl-2">Hari / Tanggal</td>
                    <td className="w-[2%] text-center py-0.5">:</td>
                    <td className="w-[35%] text-slate-900 whitespace-nowrap py-0.5 font-medium">{metadata.examDate}</td>
                  </tr>
                  <tr>
                    <td className="font-semibold text-slate-700 whitespace-nowrap py-0.5">Kelas / Jenjang</td>
                    <td className="text-center py-0.5">:</td>
                    <td className="text-slate-900 py-0.5 pr-2">Kelas {metadata.grade} ({metadata.gradeLevel})</td>
                    <td className="font-semibold text-slate-700 whitespace-nowrap py-0.5 pl-2">Waktu</td>
                    <td className="text-center py-0.5">:</td>
                    <td className="text-slate-900 whitespace-nowrap py-0.5">{metadata.timeAllocation}</td>
                  </tr>
                  <tr>
                    <td className="font-semibold text-slate-700 whitespace-nowrap py-0.5">Semester</td>
                    <td className="text-center py-0.5">:</td>
                    <td className="text-slate-900 py-0.5 pr-2">{metadata.semester}</td>
                    <td className="font-semibold text-slate-700 whitespace-nowrap py-0.5 pl-2">Guru Pengampu</td>
                    <td className="text-center py-0.5">:</td>
                    <td className="text-slate-900 whitespace-nowrap py-0.5 font-medium">{metadata.teacherName}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Petunjuk Umum */}
            <div className="my-4 text-xs sm:text-sm bg-slate-50 border-l-4 border-[#006837] p-3">
              <h4 className="font-bold text-slate-800 mb-1 font-sans">PETUNJUK UMUM:</h4>
              <ol className="list-decimal list-inside space-y-0.5 text-slate-700 text-xs">
                {generalInstructions.map((inst, idx) => (
                  <li key={idx} className="leading-snug">
                    {inst}
                  </li>
                ))}
              </ol>
            </div>

            {/* BAGIAN A: PILIHAN GANDA */}
            {multipleChoiceQuestions.length > 0 && (
              <div className="mt-6">
                <div className="border-b-2 border-slate-900 pb-1 mb-4 flex items-center justify-between">
                  <h3 className="font-bold text-sm sm:text-base uppercase tracking-wide text-slate-900">
                    A. PILIHAN GANDA
                  </h3>
                  <span className="text-xs italic text-slate-600 font-sans">
                    Pilihlah salah satu jawaban yang paling tepat!
                  </span>
                </div>

                <div className="space-y-4 text-sm sm:text-[15px]">
                  {multipleChoiceQuestions.map((q) => {
                    const passage = getPassageStartingAt(q.number);
                    const effectiveLayout = getEffectiveOptionLayout(q.options, optionLayout);
                    return (
                      <React.Fragment key={q.number}>
                        {passage && (
                          <div className="my-5 p-4 sm:p-5 bg-emerald-50/50 border-2 border-emerald-600/60 rounded-xl break-inside-avoid font-serif shadow-xs">
                            <div className="flex flex-wrap items-center justify-between gap-1 border-b border-emerald-200/80 pb-2 mb-2.5 font-sans">
                              <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-[#006837]">
                                <BookOpen className="w-4 h-4 text-[#006837] shrink-0" />
                                <span>
                                  Bacalah teks wacana berikut untuk menjawab {passage.questionRange || `soal nomor ${passage.questionNumbers?.join(", ")}`}!
                                </span>
                              </div>
                              {passage.source && (
                                <span className="text-[11px] italic text-slate-500 font-sans">
                                  {passage.source}
                                </span>
                              )}
                            </div>
                            <h4 className="font-bold text-sm sm:text-base text-center text-slate-900 mb-2.5 uppercase tracking-wide">
                              {passage.title}
                            </h4>
                            <div
                              className={`text-xs sm:text-sm text-slate-800 ${
                                isArabicExam
                                  ? "font-arabic text-right leading-loose text-base"
                                  : "leading-relaxed text-justify"
                              } whitespace-pre-line px-1`}
                              dir={isArabicExam ? "rtl" : "ltr"}
                            >
                              {passage.content}
                            </div>
                          </div>
                        )}

                        {isArabicExam || /[\u0600-\u06FF]/.test(q.questionText) ? (
                          <div className="break-inside-avoid text-right" dir="rtl">
                            <div className="flex items-start gap-2.5 text-right font-arabic">
                              <span className="font-bold text-base text-slate-900">{q.number}.</span>
                              <div className="flex-1">
                                <p className="leading-loose text-[16px] text-slate-900 font-medium">
                                  {q.questionText}
                                </p>

                                {/* Opsi Jawaban (Bahasa Arab) - Menyamping jika opsi pendek */}
                                {effectiveLayout === "horizontal" ? (
                                  <div className="mt-2 mr-1 flex flex-wrap items-center gap-x-6 sm:gap-x-8 gap-y-1 font-arabic" dir="rtl">
                                    {q.options.map((opt) => (
                                      <div
                                        key={opt.key}
                                        className="inline-flex items-baseline gap-1.5 text-sm sm:text-[15px] py-0.5 whitespace-nowrap hover:bg-slate-50 rounded px-1 transition-colors"
                                      >
                                        <span className="font-bold text-slate-900 min-w-[24px]">
                                          {getOptionLabel(opt.key)}
                                        </span>
                                        <span className="text-slate-800 leading-loose">
                                          {opt.text}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                ) : effectiveLayout === "2col" ? (
                                  <div className="mt-2 mr-1 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 font-arabic" dir="rtl">
                                    {q.options.map((opt) => (
                                      <div
                                        key={opt.key}
                                        className="flex items-start gap-2 text-sm sm:text-[15px] pr-2 py-0.5 rounded hover:bg-slate-50 transition-colors"
                                      >
                                        <span className="font-bold text-slate-900 min-w-[28px] shrink-0">
                                          {getOptionLabel(opt.key)}
                                        </span>
                                        <span className="flex-1 text-slate-800 leading-loose">
                                          {opt.text}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="mt-2 mr-1 space-y-1 font-arabic" dir="rtl">
                                    {q.options.map((opt) => (
                                      <div
                                        key={opt.key}
                                        className="flex items-start gap-2 text-sm sm:text-[15px] pr-2 py-0.5 rounded hover:bg-slate-50 transition-colors"
                                      >
                                        <span className="font-bold text-slate-900 min-w-[28px] shrink-0">
                                          {getOptionLabel(opt.key)}
                                        </span>
                                        <span className="flex-1 text-slate-800 leading-loose">
                                          {opt.text}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="break-inside-avoid text-justify">
                            <div className="flex items-start gap-2">
                              <span className="font-bold">{q.number}.</span>
                              <div className="flex-1">
                                <p className="leading-snug">{q.questionText}</p>

                                {/* Opsi Jawaban (A, B, C, D, E) - Menyamping jika opsi pendek */}
                                {effectiveLayout === "horizontal" ? (
                                  <div className="mt-1.5 ml-1 flex flex-wrap items-center gap-x-6 sm:gap-x-8 gap-y-1">
                                    {q.options.map((opt) => (
                                      <div
                                        key={opt.key}
                                        className="inline-flex items-baseline gap-1.5 text-xs sm:text-sm py-0.5 whitespace-nowrap hover:bg-slate-50 rounded px-1 transition-colors"
                                      >
                                        <span className="font-bold text-slate-800">{opt.key}.</span>
                                        <span className="text-slate-800 leading-snug">{opt.text}</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : effectiveLayout === "2col" ? (
                                  <div className="mt-1.5 ml-1 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                                    {q.options.map((opt) => (
                                      <div
                                        key={opt.key}
                                        className="flex items-start gap-2 text-xs sm:text-sm pl-1 py-0.5 rounded hover:bg-slate-50 transition-colors"
                                      >
                                        <span className="font-bold w-4 text-slate-800 shrink-0">{opt.key}.</span>
                                        <span className="flex-1 text-slate-800 leading-snug">{opt.text}</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="mt-1.5 ml-1 space-y-1">
                                    {q.options.map((opt) => (
                                      <div
                                        key={opt.key}
                                        className="flex items-start gap-2 text-xs sm:text-sm pl-2 py-0.5 rounded hover:bg-slate-50 transition-colors"
                                      >
                                        <span className="font-bold w-4 text-slate-800 shrink-0">{opt.key}.</span>
                                        <span className="flex-1 text-slate-800 leading-snug">{opt.text}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            )}

            {/* BAGIAN B: MENENTUKAN BENAR / SALAH */}
            {trueFalseQuestions.length > 0 && (
              <div className="mt-8">
                <div className="border-b-2 border-slate-900 pb-1 mb-4 flex items-center justify-between">
                  <h3 className="font-bold text-sm sm:text-base uppercase tracking-wide text-slate-900">
                    {multipleChoiceQuestions.length > 0 ? "B" : "A"}. MENENTUKAN BENAR / SALAH
                  </h3>
                  <span className="text-xs italic text-slate-600 font-sans">
                    {isArabicExam
                      ? "حَدِّدْ مَا إِذَا كَانَتِ الْعِبَارَاتُ التَّالِيَةُ (صَحِيحَةً: ص) أَوْ (خَاطِئَةً: خ)!"
                      : "Tentukan apakah pernyataan berikut BENAR (B) atau SALAH (S)!"}
                  </span>
                </div>

                <div className="space-y-6 text-sm sm:text-[15px]">
                  {trueFalseQuestions.map((tf) => {
                    const isTfArabic = isArabicExam || /[\u0600-\u06FF]/.test(tf.instruction);
                    return (
                      <div key={tf.number} className="break-inside-avoid">
                        <div
                          className={`flex items-start gap-2 mb-2 font-semibold ${
                            isTfArabic ? "font-arabic text-right text-base leading-loose" : "leading-snug"
                          }`}
                          dir={isTfArabic ? "rtl" : "ltr"}
                        >
                          <span className="font-bold">{tf.number}.</span>
                          <div className="flex-1">
                            <p>{tf.instruction}</p>
                            {tf.contextOrPassage && (
                              <p className="mt-1 text-xs text-slate-600 italic bg-amber-50/60 p-2 rounded border border-amber-200">
                                {tf.contextOrPassage}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Tabel Pernyataan & Kotak Ceklis Benar / Salah */}
                        <div className="overflow-x-auto ml-2 sm:ml-6">
                          <table className="w-full text-xs sm:text-sm border border-slate-400 font-sans border-collapse">
                            <thead>
                              <tr className="bg-slate-100 text-slate-800">
                                <th className="p-2 border border-slate-400 text-center w-12">No</th>
                                <th className="p-2 border border-slate-400 text-left">Pernyataan / Konsep Materi</th>
                                <th className="p-2 border border-slate-400 text-center w-24 bg-emerald-50 text-emerald-950">
                                  {isTfArabic ? "صَحِيحٌ (ص)" : "Benar (B)"}
                                </th>
                                <th className="p-2 border border-slate-400 text-center w-24 bg-rose-50 text-rose-950">
                                  {isTfArabic ? "خَاطِئٌ (خ)" : "Salah (S)"}
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {tf.statements.map((s, sIdx) => {
                                const isStmtArabic = isArabicExam || /[\u0600-\u06FF]/.test(s.statement);
                                return (
                                  <tr key={s.id || sIdx} className="hover:bg-slate-50">
                                    <td className="p-2 border border-slate-400 text-center font-bold text-slate-600">
                                      {sIdx + 1}
                                    </td>
                                    <td
                                      className={`p-2 border border-slate-400 text-slate-900 ${
                                        isStmtArabic ? "font-arabic text-right text-[15px] leading-relaxed" : ""
                                      }`}
                                      dir={isStmtArabic ? "rtl" : "ltr"}
                                    >
                                      {s.statement}
                                    </td>
                                    <td className="p-2 border border-slate-400 text-center">
                                      <div className="w-5 h-5 mx-auto border-2 border-slate-400 rounded-md"></div>
                                    </td>
                                    <td className="p-2 border border-slate-400 text-center">
                                      <div className="w-5 h-5 mx-auto border-2 border-slate-400 rounded-md"></div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* BAGIAN C: MENCOCOKKAN JAWABAN (MENJODOHKAN) */}
            {matchingQuestions.length > 0 && (
              <div className="mt-8">
                <div className="border-b-2 border-slate-900 pb-1 mb-4 flex items-center justify-between">
                  <h3 className="font-bold text-sm sm:text-base uppercase tracking-wide text-slate-900">
                    {multipleChoiceQuestions.length > 0 && trueFalseQuestions.length > 0
                      ? "C"
                      : multipleChoiceQuestions.length > 0 || trueFalseQuestions.length > 0
                      ? "B"
                      : "A"}
                    . MENCOCOKKAN JAWABAN (MENJODOHKAN)
                  </h3>
                  <span className="text-xs italic text-slate-600 font-sans">
                    {isArabicExam
                      ? "صِلْ بَيْنَ الْعَمُودِ (أ) وَمَا يُنَاسِبُهُ مِنَ الْعَمُودِ (ب)!"
                      : "Jodohkan konsep Kolom A dengan pilihan pasangan di Kolom B!"}
                  </span>
                </div>

                <div className="space-y-6 text-sm sm:text-[15px]">
                  {matchingQuestions.map((mq) => {
                    const isMqArabic = isArabicExam || /[\u0600-\u06FF]/.test(mq.instruction);
                    return (
                      <div key={mq.number} className="break-inside-avoid">
                        <div
                          className={`flex items-start gap-2 mb-2 font-semibold ${
                            isMqArabic ? "font-arabic text-right text-base leading-loose" : "leading-snug"
                          }`}
                          dir={isMqArabic ? "rtl" : "ltr"}
                        >
                          <span className="font-bold">{mq.number}.</span>
                          <p>{mq.instruction}</p>
                        </div>

                        {/* Dua Kolom Berpasangan */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-2 sm:ml-6 font-sans">
                          {/* Kolom A */}
                          <div className="border border-slate-300 rounded-xl overflow-hidden bg-white shadow-2xs">
                            <div className="bg-slate-100 p-2.5 font-bold text-xs text-slate-800 border-b border-slate-200">
                              {mq.premiseColumnTitle || "Kolom A: Konsep / Pernyataan"}
                            </div>
                            <div className="p-3 space-y-2.5 text-xs sm:text-sm">
                              {mq.premises.map((p) => {
                                const isPArabic = isArabicExam || /[\u0600-\u06FF]/.test(p.text);
                                return (
                                  <div key={p.key} className="flex items-start gap-2 p-1.5 rounded bg-slate-50 border border-slate-200">
                                    <span className="font-bold text-slate-900 min-w-[20px] bg-slate-200 text-center rounded px-1">
                                      {p.key}.
                                    </span>
                                    <span
                                      className={`text-slate-800 flex-1 ${
                                        isPArabic ? "font-arabic text-right text-sm leading-relaxed" : ""
                                      }`}
                                      dir={isPArabic ? "rtl" : "ltr"}
                                    >
                                      {p.text}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Kolom B */}
                          <div className="border border-slate-300 rounded-xl overflow-hidden bg-white shadow-2xs">
                            <div className="bg-emerald-50 p-2.5 font-bold text-xs text-emerald-900 border-b border-emerald-200">
                              {mq.targetColumnTitle || "Kolom B: Pilihan Jawaban"}
                            </div>
                            <div className="p-3 space-y-2.5 text-xs sm:text-sm">
                              {mq.targets.map((t) => {
                                const isTArabic = isArabicExam || /[\u0600-\u06FF]/.test(t.text);
                                return (
                                  <div key={t.key} className="flex items-start gap-2 p-1.5 rounded bg-emerald-50/40 border border-emerald-200">
                                    <span className="font-bold text-emerald-900 min-w-[20px] bg-emerald-200 text-center rounded px-1">
                                      {t.key}.
                                    </span>
                                    <span
                                      className={`text-slate-800 flex-1 ${
                                        isTArabic ? "font-arabic text-right text-sm leading-relaxed" : ""
                                      }`}
                                      dir={isTArabic ? "rtl" : "ltr"}
                                    >
                                      {t.text}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* BAGIAN D: LITERASI TEKS & DATA (AKM / ASESMEN KOMPETENSI) */}
            {literacyQuestions.length > 0 && (
              <div className="mt-8">
                <div className="border-b-2 border-slate-900 pb-1 mb-4 flex items-center justify-between">
                  <h3 className="font-bold text-sm sm:text-base uppercase tracking-wide text-slate-900">
                    LITERASI TEKS & DATA (ASESMEN KOMPETENSI)
                  </h3>
                  <span className="text-xs italic text-slate-600 font-sans">
                    {isArabicExam
                      ? "اقْرَأِ النَّصَّ وَحَلِّلِ الْبَيَانَاتِ لِلْإِجَابَةِ عَنِ الْأَسْئِلَةِ!"
                      : "Cermati wacana dan data numerik berikut untuk menjawab pertanyaan!"}
                  </span>
                </div>

                <div className="space-y-6 text-sm sm:text-[15px]">
                  {literacyQuestions.map((lq) => {
                    const isLqArabic = isArabicExam || /[\u0600-\u06FF]/.test(lq.questionText);
                    return (
                      <div key={lq.number} className="p-4 sm:p-5 bg-purple-50/40 border-2 border-purple-300 rounded-xl break-inside-avoid">
                        {/* Judul Stimulus */}
                        <div className="font-bold text-purple-900 text-xs sm:text-sm uppercase tracking-wide mb-2 flex items-center gap-1.5">
                          <BarChart3 className="w-4 h-4 text-purple-700" />
                          <span>Kasus {lq.number}: {lq.stimulusTitle}</span>
                        </div>

                        {/* Wacana Teks */}
                        <p
                          className={`text-slate-800 text-xs sm:text-sm leading-relaxed mb-3 ${
                            isLqArabic ? "font-arabic text-right text-base leading-loose" : "text-justify"
                          }`}
                          dir={isLqArabic ? "rtl" : "ltr"}
                        >
                          {lq.stimulusContent}
                        </p>

                        {/* Data Snippet (Tabel/Statistik) jika ada */}
                        {lq.dataSnippet && (
                          <div className="my-3 p-3 bg-white border border-purple-200 rounded-lg text-xs font-mono whitespace-pre-line text-slate-800 shadow-2xs">
                            {lq.dataSnippet}
                          </div>
                        )}

                        {/* Pokok Pertanyaan */}
                        <div className="mt-3 pt-2 border-t border-purple-200">
                          <p
                            className={`font-semibold text-slate-900 mb-2 ${
                              isLqArabic ? "font-arabic text-right text-base leading-loose" : ""
                            }`}
                            dir={isLqArabic ? "rtl" : "ltr"}
                          >
                            <strong>Pertanyaan {lq.number}:</strong> {lq.questionText}
                          </p>

                          {/* Opsi Pilihan jika Tipe MC */}
                          {lq.options && lq.options.length > 0 && (
                            <div className="space-y-1.5 ml-2 font-sans">
                              {lq.options.map((opt) => (
                                <div key={opt.key} className="flex items-start gap-2 text-xs sm:text-sm pl-2 py-0.5 rounded hover:bg-purple-100/40">
                                  <span className="font-bold w-4 text-slate-800">{opt.key}.</span>
                                  <span className="flex-1 text-slate-800">{opt.text}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Sub-Pertanyaan jika ada */}
                          {lq.subQuestions && lq.subQuestions.length > 0 && (
                            <div className="mt-3 space-y-2 ml-2 font-sans">
                              {lq.subQuestions.map((sq) => (
                                <div key={sq.id} className="text-xs sm:text-sm">
                                  <p className="font-medium text-slate-900">
                                    <span className="font-bold mr-1">({sq.id})</span> {sq.question}
                                  </p>
                                  <div className="mt-1 border-b border-dashed border-slate-300 h-6"></div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* BAGIAN E: ESSAY / URAIAN */}
            {essayQuestions.length > 0 && (
              <div className="mt-8">
                <div className="border-b-2 border-slate-900 pb-1 mb-4 flex items-center justify-between">
                  <h3 className="font-bold text-sm sm:text-base uppercase tracking-wide text-slate-900">
                    ESSAY / URAIAN
                  </h3>
                  <span className="text-xs italic text-slate-600 font-sans">
                    {isArabicExam
                      ? "أَجِبْ عَنِ الْأَسْئِلَةِ الْآتِيَةِ بِإِجَابَةٍ وَاضِحَةٍ وَصَحِيحَةٍ!"
                      : "Jawablah pertanyaan-pertanyaan berikut dengan jelas dan benar!"}
                  </span>
                </div>

                <div className="space-y-4 text-sm sm:text-[15px]">
                  {essayQuestions.map((eq) => {
                    const passage = getPassageStartingAtEssay(eq.number);
                    const isEqArabic = isArabicExam || /[\u0600-\u06FF]/.test(eq.questionText);
                    const isPassageArabic =
                      passage && (isArabicExam || /[\u0600-\u06FF]/.test(passage.content || passage.title));

                    return (
                      <React.Fragment key={eq.number}>
                        {passage && (
                          <div className="my-5 p-4 sm:p-5 bg-teal-50/60 border-2 border-teal-600/70 rounded-xl break-inside-avoid font-serif shadow-xs">
                            <div className="flex flex-wrap items-center justify-between gap-1 border-b border-teal-200/80 pb-2 mb-2.5 font-sans">
                              <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-teal-800">
                                <BookOpen className="w-4 h-4 text-teal-700 shrink-0" />
                                <span>
                                  {isPassageArabic
                                    ? `اقْرَأِ النَّصَّ الْآتِيَ لِلْإِجَابَةِ عَنِ الْأَسْئِلَةِ الْمَقَالِيَّةِ (${
                                        passage.essayQuestionNumbers && passage.essayQuestionNumbers.length > 0
                                          ? `رَقْمُ ${passage.essayQuestionNumbers.join(", ")}`
                                          : passage.questionRange || "التَّالِيَةِ"
                                      })!`
                                    : `Bacalah teks wacana berikut untuk menjawab soal essay ${
                                        passage.essayQuestionNumbers && passage.essayQuestionNumbers.length > 0
                                          ? `nomor ${passage.essayQuestionNumbers.join(", ")}`
                                          : passage.questionRange || "berikut"
                                      }!`}
                                </span>
                              </div>
                              {passage.source && (
                                <span className="text-[11px] italic text-slate-500 font-sans">
                                  {passage.source}
                                </span>
                              )}
                            </div>
                            <h4 className="font-bold text-sm sm:text-base text-center text-slate-900 mb-2.5 uppercase tracking-wide">
                              {passage.title}
                            </h4>
                            <div
                              className={`text-xs sm:text-sm text-slate-800 ${
                                isPassageArabic
                                  ? "font-arabic text-right leading-loose text-base"
                                  : "leading-relaxed text-justify"
                              } whitespace-pre-line px-1`}
                              dir={isPassageArabic ? "rtl" : "ltr"}
                            >
                              {passage.content}
                            </div>
                          </div>
                        )}

                        <div
                          className={`break-inside-avoid ${isEqArabic ? "text-right" : "text-justify"}`}
                          dir={isEqArabic ? "rtl" : "ltr"}
                        >
                          <div className={`flex items-start gap-2 ${isEqArabic ? "font-arabic" : ""}`}>
                            <span className={`font-bold ${isEqArabic ? "text-base" : ""}`}>
                              {eq.number}.
                            </span>
                            <div className="flex-1">
                              <p className={isEqArabic ? "leading-loose text-[16px]" : "leading-snug"}>
                                {eq.questionText}
                              </p>
                            </div>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tanda Tangan Guru Pengampu di Bagian Bawah Soal */}
            <div className="mt-12 pt-4 border-t border-slate-200 flex justify-end font-sans text-xs">
              <div className="text-center w-56 space-y-12">
                <div>
                  <p className="text-slate-600">Disusun oleh,</p>
                  <p className="font-semibold text-slate-800">Guru Pengampu</p>
                </div>
                <div>
                  <p className="font-bold underline text-slate-900">{metadata.teacherName}</p>
                  <p className="text-slate-500 text-[11px]">NIP. .........................................</p>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ============================================================ */}
        {/* PEMBATAS VISUAL ANTARA SOAL DAN KUNCI (LEMBAR TERPISAH) */}
        {/* ============================================================ */}
        {activeTab === "lengkap" && (
          <div className="no-print my-6 border-t-4 border-dashed border-emerald-300 relative text-center">
            <span className="bg-emerald-100 text-emerald-900 text-xs font-bold px-4 py-1.5 rounded-full border border-emerald-300 relative -top-3 shadow-xs">
              ✂️ BATAS HALAMAN CETAK: LEMBAR KUNCI JAWABAN TERPISAH
            </span>
          </div>
        )}

        {/* ============================================================ */}
        {/* BAGIAN 2: LEMBAR KUNCI JAWABAN & RUBRIK TERPISAH */}
        {/* ============================================================ */}
        {(activeTab === "kunci" || activeTab === "lengkap") && (
          <div className="p-6 sm:p-10 font-serif text-slate-900 leading-normal border-t-2 border-slate-300 print:border-none print-page-break bg-slate-50/20">
            
            {/* Header Lembar Kunci */}
            <div className="text-center pb-4 border-b-2 border-black mb-6">
              <h3 className="text-sm sm:text-base font-bold uppercase tracking-wider text-slate-900">
                LEMBAR KUNCI JAWABAN & PEDOMAN PENSKORAN
              </h3>
              <p className="text-xs sm:text-sm font-semibold text-slate-700 mt-1">
                Mata Pelajaran: {metadata.subjectName} | Kelas {metadata.grade} ({metadata.gradeLevel}) | {metadata.examType}
              </p>
              <p className="text-[11px] sm:text-xs text-slate-500 font-sans italic mt-0.5">
                Guru Pengampu: {metadata.teacherName} | Tanggal: {metadata.examDate}
              </p>
            </div>

            {/* Kunci Jawaban Pilihan Ganda Grid & Tabel */}
            {multipleChoiceQuestions.length > 0 && (
              <div className="mb-8">
                <h4 className="font-bold text-sm text-[#006837] mb-3 font-sans flex items-center justify-between">
                  <span>I. Kunci Jawaban Pilihan Ganda (Tabel Ringkas):</span>
                  <span className="text-xs font-normal text-slate-500">
                    Total: {multipleChoiceQuestions.length} Butir
                  </span>
                </h4>

                <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 text-center font-sans text-xs">
                  {multipleChoiceQuestions.map((q) => (
                    <div
                      key={q.number}
                      className="border border-emerald-300 rounded p-1.5 bg-emerald-50/60"
                    >
                      <div className="text-[10px] text-slate-500 font-medium">No. {q.number}</div>
                      <div className="text-base font-extrabold text-[#006837]">{q.correctAnswer}</div>
                    </div>
                  ))}
                </div>

                {/* Tabel Pembahasan Rinci Pilihan Ganda */}
                <h4 className="font-bold text-sm text-slate-800 mt-6 mb-2 font-sans">
                  Pembahasan / Penjelasan Butir Soal Pilihan Ganda:
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border border-slate-300 font-sans">
                    <thead className="bg-emerald-100/70 text-emerald-950 font-bold">
                      <tr>
                        <th className="p-2 border border-slate-300 text-center w-12">No</th>
                        <th className="p-2 border border-slate-300 text-center w-16">Kunci</th>
                        <th className="p-2 border border-slate-300">Penjelasan & Pembahasan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {multipleChoiceQuestions.map((q) => {
                        const isExpArabic = isArabicExam || /[\u0600-\u06FF]/.test(q.explanation);
                        return (
                          <tr key={q.number} className="hover:bg-slate-50">
                            <td className="p-2 border border-slate-300 text-center font-bold">
                              {q.number}
                            </td>
                            <td className="p-2 border border-slate-300 text-center font-extrabold text-emerald-800 text-sm">
                              {q.correctAnswer}
                            </td>
                            <td
                              className={`p-2 border border-slate-300 text-slate-700 ${
                                isExpArabic
                                  ? "font-arabic text-right leading-relaxed text-sm"
                                  : "leading-snug"
                              }`}
                              dir={isExpArabic ? "rtl" : "ltr"}
                            >
                              {q.explanation || "Jawaban sesuai materi acuan pembelajaran."}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Kunci Jawaban Menentukan Benar / Salah */}
            {trueFalseQuestions.length > 0 && (
              <div className="mt-8 mb-8">
                <h4 className="font-bold text-sm text-[#006837] mb-3 font-sans flex items-center justify-between">
                  <span>Kunci Jawaban Menentukan Benar / Salah:</span>
                  <span className="text-xs font-normal text-slate-500">
                    Total: {trueFalseQuestions.length} Butir
                  </span>
                </h4>

                <div className="space-y-4">
                  {trueFalseQuestions.map((tf) => (
                    <div key={tf.number} className="border border-slate-300 rounded-lg p-3.5 bg-slate-50/50 break-inside-avoid text-xs sm:text-sm font-sans">
                      <div className="font-bold text-slate-900 mb-2">
                        Nomor {tf.number}: {tf.instruction}
                      </div>
                      <table className="w-full text-xs text-left border border-slate-300 font-sans border-collapse">
                        <thead className="bg-slate-100 text-slate-800">
                          <tr>
                            <th className="p-1.5 border border-slate-300 text-center w-10">No</th>
                            <th className="p-1.5 border border-slate-300 text-left">Pernyataan</th>
                            <th className="p-1.5 border border-slate-300 text-center w-20">Kunci</th>
                            <th className="p-1.5 border border-slate-300 text-left">Penjelasan / Alasan</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tf.statements.map((s, idx) => (
                            <tr key={s.id || idx} className="hover:bg-slate-50">
                              <td className="p-1.5 border border-slate-300 text-center font-bold">{idx + 1}</td>
                              <td className="p-1.5 border border-slate-300">{s.statement}</td>
                              <td className="p-1.5 border border-slate-300 text-center font-bold">
                                <span className={`px-2 py-0.5 rounded text-[11px] ${
                                  s.isCorrect ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                                }`}>
                                  {s.isCorrect ? "BENAR" : "SALAH"}
                                </span>
                              </td>
                              <td className="p-1.5 border border-slate-300 text-slate-600">{s.explanation || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Kunci Pasangan Soal Mencocokkan (Menjodohkan) */}
            {matchingQuestions.length > 0 && (
              <div className="mt-8 mb-8">
                <h4 className="font-bold text-sm text-[#006837] mb-3 font-sans flex items-center justify-between">
                  <span>Kunci Pasangan Soal Mencocokkan (Menjodohkan):</span>
                  <span className="text-xs font-normal text-slate-500">
                    Total: {matchingQuestions.length} Butir
                  </span>
                </h4>

                <div className="space-y-4">
                  {matchingQuestions.map((mq) => (
                    <div key={mq.number} className="border border-slate-300 rounded-lg p-3.5 bg-slate-50/50 break-inside-avoid text-xs sm:text-sm font-sans">
                      <div className="font-bold text-slate-900 mb-2">
                        Nomor {mq.number}: {mq.instruction}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {mq.correctPairs.map((pair, pIdx) => {
                          const premise = mq.premises.find((p) => p.key === pair.premiseKey);
                          const target = mq.targets.find((t) => t.key === pair.targetKey);
                          return (
                            <div key={pIdx} className="p-2 bg-white rounded border border-emerald-300 text-xs">
                              <div className="font-bold text-emerald-900 flex items-center justify-between mb-1">
                                <span>Premis [{pair.premiseKey}]</span>
                                <span>➔ Pasangan [{pair.targetKey}]</span>
                              </div>
                              <div className="text-slate-600 text-[11px]">{premise?.text || `Premis ${pair.premiseKey}`} ➔ {target?.text || `Target ${pair.targetKey}`}</div>
                              {pair.explanation && (
                                <div className="text-[10px] text-slate-500 italic mt-1 border-t pt-0.5">{pair.explanation}</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Kunci Jawaban Literasi Teks & Data */}
            {literacyQuestions.length > 0 && (
              <div className="mt-8 mb-8">
                <h4 className="font-bold text-sm text-[#006837] mb-3 font-sans flex items-center justify-between">
                  <span>Kunci & Pembahasan Literasi Teks & Data (AKM):</span>
                  <span className="text-xs font-normal text-slate-500">
                    Total: {literacyQuestions.length} Kasus
                  </span>
                </h4>

                <div className="space-y-4">
                  {literacyQuestions.map((lq) => (
                    <div key={lq.number} className="border border-purple-200 rounded-lg p-3.5 bg-purple-50/30 break-inside-avoid text-xs sm:text-sm font-sans">
                      <div className="font-bold text-purple-900 mb-1">
                        Kasus {lq.number}: {lq.stimulusTitle}
                      </div>
                      <div className="p-2.5 bg-white rounded border border-purple-200 text-xs mb-2">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-slate-700">Kunci Jawaban Utama:</span>
                          <span className="font-bold text-white bg-purple-800 px-2 py-0.5 rounded text-xs">
                            {lq.correctAnswer}
                          </span>
                        </div>
                        <div className="text-slate-700 leading-snug">
                          <strong>Pembahasan Data:</strong> {lq.explanation}
                        </div>
                      </div>

                      {lq.subQuestions && lq.subQuestions.length > 0 && (
                        <div className="space-y-1.5 mt-2">
                          <div className="font-bold text-slate-700 text-xs">Jawaban Sub-Pertanyaan Analisis:</div>
                          {lq.subQuestions.map((sq) => (
                            <div key={sq.id} className="p-2 bg-white rounded border border-slate-200 text-xs">
                              <span className="font-bold text-purple-900 mr-1">({sq.id})</span>
                              <span className="font-medium text-slate-800">{sq.question}</span>
                              <div className="mt-1 text-slate-600 pl-3 border-l-2 border-purple-400">
                                <strong>Rujukan:</strong> {sq.answerKey} {sq.explanation ? `(${sq.explanation})` : ""}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Kunci Jawaban & Rubrik Soal Essay */}
            {essayQuestions.length > 0 && (
              <div className="mt-8">
                <h4 className="font-bold text-sm text-[#006837] mb-3 font-sans">
                  Model Jawaban Lengkap & Rubrik Penskoran Soal Essay:
                </h4>

                <div className="space-y-4 font-sans text-xs sm:text-sm">
                  {essayQuestions.map((eq) => {
                    const isEqArabic = isArabicExam || /[\u0600-\u06FF]/.test(eq.questionText);
                    const isAnsArabic = isArabicExam || /[\u0600-\u06FF]/.test(eq.modelAnswer);
                    return (
                      <div
                        key={eq.number}
                        className="border border-slate-300 rounded-lg p-3.5 bg-slate-50/50 break-inside-avoid"
                      >
                        <div
                          className={`font-bold text-slate-900 mb-1 flex items-start gap-2 ${
                            isEqArabic ? "flex-row-reverse text-right font-arabic" : ""
                          }`}
                          dir={isEqArabic ? "rtl" : "ltr"}
                        >
                          <span className="px-1.5 py-0.5 bg-emerald-700 text-white text-[11px] rounded shrink-0">
                            No. {eq.number}
                          </span>
                          <span className={isEqArabic ? "text-base leading-loose" : "italic font-serif"}>
                            {eq.questionText}
                          </span>
                        </div>

                        <div className="mt-2 pl-4 border-l-2 border-emerald-500 space-y-1.5">
                          <div>
                            <span className="font-bold text-emerald-900 block text-xs">
                              Pedoman / Model Jawaban:
                            </span>
                            <p
                              className={`text-slate-800 text-xs sm:text-sm ${
                                isAnsArabic
                                  ? "font-arabic text-right leading-loose text-sm"
                                  : "leading-snug"
                              }`}
                              dir={isAnsArabic ? "rtl" : "ltr"}
                            >
                              {eq.modelAnswer}
                            </p>
                          </div>
                          <div>
                            <span className="font-bold text-amber-800 block text-xs">
                              Rubrik Penskoran:
                            </span>
                            <p
                              className={`text-slate-600 text-xs italic ${
                                isArabicExam ? "font-arabic text-right" : ""
                              }`}
                              dir={isArabicExam ? "rtl" : "ltr"}
                            >
                              {eq.scoringRubric || "Skor Maksimal: 10 (Sangat lengkap: 10, Cukup: 5-7, Kurang: 1-4)"}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tanda Tangan Guru Pengampu */}
            <div className="mt-10 flex justify-end font-sans text-xs">
              <div className="text-center w-64 space-y-12">
                <div>
                  <p className="text-slate-600">Mengetahui,</p>
                  <p className="font-semibold text-slate-800">Guru Pengampu Mata Pelajaran</p>
                </div>
                <div>
                  <p className="font-bold underline text-slate-900">{metadata.teacherName}</p>
                  <p className="text-slate-500 text-[11px]">NIP. .........................................</p>
                </div>
              </div>
            </div>

          </div>
        )}

        </div>
      )}
    </div>
  );
};
