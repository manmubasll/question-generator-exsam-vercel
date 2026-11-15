import React, { useState } from "react";
import { ExamData, PaperSize } from "../types";
import { enrichExamPedagogy } from "../utils/pedagogyHelpers";
import { exportKartuSoalWordClassic } from "../utils/exportPedagogyWord";
import { printExamDirectly, openExamInNewTab } from "../utils/printExam";
import {
  Printer,
  Copy,
  Check,
  ExternalLink,
  Layers,
  Filter,
  Download,
  BookOpen,
  HelpCircle,
  CheckSquare,
  Link2,
  BarChart2,
} from "lucide-react";

interface KartuSoalViewProps {
  examData: ExamData;
  paperSize: PaperSize;
}

export const KartuSoalView: React.FC<KartuSoalViewProps> = ({
  examData: rawExamData,
  paperSize,
}) => {
  const [filterType, setFilterType] = useState<"all" | "pg" | "tf" | "matching" | "literacy" | "essay">("all");
  const [selectedNum, setSelectedNum] = useState<string | "all">("all");
  const [copied, setCopied] = useState(false);

  const examData = enrichExamPedagogy(rawExamData);
  const {
    schoolIdentity,
    metadata,
    multipleChoiceQuestions = [],
    trueFalseQuestions = [],
    matchingQuestions = [],
    literacyQuestions = [],
    essayQuestions = [],
    readingPassages = [],
  } = examData;

  const isArabic =
    metadata.examLanguage === "ar" ||
    metadata.subjectName.toLowerCase().includes("bahasa arab") ||
    metadata.subjectName.toLowerCase().includes("arab");

  const handlePrint = () => {
    printExamDirectly(examData, paperSize, "kartu-soal");
  };

  const handleOpenNewTab = () => {
    openExamInNewTab(examData, paperSize, "kartu-soal");
  };

  const handleDownloadDoc = () => {
    exportKartuSoalWordClassic(examData, paperSize);
  };

  const handleCopy = () => {
    let text = `KARTU SOAL ${metadata.examType.toUpperCase()}\n`;
    text += `Mata Pelajaran: ${metadata.subjectName} | Satuan Pendidikan: ${schoolIdentity.schoolName}\n\n`;

    multipleChoiceQuestions.forEach((q) => {
      text += `--- KARTU SOAL PG NO. ${q.number} ---\n`;
      text += `KD/CP: ${q.basicCompetency}\nMateri: ${q.material}\nIndikator: ${q.indicator}\nLevel: ${q.cognitiveLevel} | Kesukaran: ${q.difficulty}\n`;
      text += `Soal: ${q.questionText}\n`;
      q.options.forEach((opt) => {
        text += `  ${opt.key}. ${opt.text}\n`;
      });
      text += `Kunci: ${q.correctAnswer} | Pembahasan: ${q.explanation}\n\n`;
    });

    trueFalseQuestions.forEach((tf) => {
      text += `--- KARTU SOAL BENAR/SALAH NO. ${tf.number} ---\n`;
      text += `KD/CP: ${tf.basicCompetency}\nMateri: ${tf.material}\nIndikator: ${tf.indicator}\nLevel: ${tf.cognitiveLevel} | Kesukaran: ${tf.difficulty}\n`;
      text += `Petunjuk: ${tf.instructions}\n`;
      tf.statements.forEach((st, sIdx) => {
        text += `  ${sIdx + 1}. ${st.statement} -> [${st.isCorrect ? "BENAR" : "SALAH"}] (Alasan: ${st.explanation || "-"})\n`;
      });
      text += `\n`;
    });

    matchingQuestions.forEach((mq) => {
      text += `--- KARTU SOAL MENJODOHKAN NO. ${mq.number} ---\n`;
      text += `KD/CP: ${mq.basicCompetency}\nMateri: ${mq.material}\nIndikator: ${mq.indicator}\nLevel: ${mq.cognitiveLevel} | Kesukaran: ${mq.difficulty}\n`;
      text += `Petunjuk: ${mq.instructions}\n`;
      mq.correctPairs.forEach((pair) => {
        const p = mq.premises.find((x) => x.key === pair.premiseKey);
        const t = mq.targets.find((x) => x.key === pair.targetKey);
        text += `  [${pair.premiseKey}] ${p?.text || ""} -> [${pair.targetKey}] ${t?.text || ""} (Penjelasan: ${pair.explanation || "-"})\n`;
      });
      text += `\n`;
    });

    literacyQuestions.forEach((lq) => {
      text += `--- KARTU SOAL LITERASI TEKS & DATA NO. ${lq.number} ---\n`;
      text += `KD/CP: ${lq.basicCompetency}\nMateri: ${lq.material}\nIndikator: ${lq.indicator}\nLevel: ${lq.cognitiveLevel} | Kesukaran: ${lq.difficulty}\n`;
      text += `Stimulus: ${lq.stimulusTitle} (${lq.stimulusType})\n${lq.stimulusContent}\n`;
      text += `Soal: ${lq.questionText}\nKunci: ${lq.correctAnswer} | Pembahasan: ${lq.explanation}\n\n`;
    });

    essayQuestions.forEach((eq) => {
      text += `--- KARTU SOAL URAIAN NO. ${eq.number} ---\n`;
      text += `KD/CP: ${eq.basicCompetency}\nMateri: ${eq.material}\nIndikator: ${eq.indicator}\nLevel: ${eq.cognitiveLevel} | Kesukaran: ${eq.difficulty}\n`;
      text += `Soal: ${eq.questionText}\n`;
      text += `Model Jawaban: ${eq.modelAnswer}\nRubrik: ${eq.scoringRubric}\n\n`;
    });

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalAllQuestions =
    multipleChoiceQuestions.length +
    trueFalseQuestions.length +
    matchingQuestions.length +
    literacyQuestions.length +
    essayQuestions.length;

  const displayPg =
    filterType === "all" || filterType === "pg"
      ? selectedNum === "all"
        ? multipleChoiceQuestions
        : multipleChoiceQuestions.filter((q) => `pg-${q.number}` === selectedNum)
      : [];

  const displayTf =
    filterType === "all" || filterType === "tf"
      ? selectedNum === "all"
        ? trueFalseQuestions
        : trueFalseQuestions.filter((q) => `tf-${q.number}` === selectedNum)
      : [];

  const displayMatching =
    filterType === "all" || filterType === "matching"
      ? selectedNum === "all"
        ? matchingQuestions
        : matchingQuestions.filter((q) => `matching-${q.number}` === selectedNum)
      : [];

  const displayLiteracy =
    filterType === "all" || filterType === "literacy"
      ? selectedNum === "all"
        ? literacyQuestions
        : literacyQuestions.filter((q) => `lit-${q.number}` === selectedNum)
      : [];

  const displayEssay =
    filterType === "all" || filterType === "essay"
      ? selectedNum === "all"
        ? essayQuestions
        : essayQuestions.filter((eq) => `essay-${eq.number}` === selectedNum)
      : [];

  return (
    <div className="space-y-4">
      {/* Top Toolbar */}
      <div className="no-print bg-white p-3.5 sm:p-4 rounded-xl shadow-xs border border-emerald-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Kartu Soal Ujian (Question Cards)</h3>
            <p className="text-xs text-slate-500">Format Standar Pusat Penilaian Pendidikan (Puspendik) Kemenag/Kemendikbud</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-[#006837] hover:bg-[#00522c] text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow-xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak / Simpan PDF</span>
          </button>

          <button
            onClick={handleOpenNewTab}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
            <span>Tab Baru</span>
          </button>

          <button
            onClick={handleDownloadDoc}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-xs transition-colors"
            title="Format Word Siap Edit dan Cetak"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh Word (.doc)</span>
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold px-2.5 py-2 rounded-lg transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Tersalin!" : "Salin"}</span>
          </button>
        </div>
      </div>

      {/* Filter / Quick Jump Navigation (Screen only) */}
      <div className="no-print bg-slate-50 border border-slate-200 p-3 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-slate-700 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-emerald-700" /> Filter Bentuk:
          </span>
          <div className="flex items-center flex-wrap gap-1 bg-white border border-slate-200 p-0.5 rounded-lg">
            <button
              onClick={() => { setFilterType("all"); setSelectedNum("all"); }}
              className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                filterType === "all" ? "bg-[#006837] text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Semua ({totalAllQuestions})
            </button>
            {multipleChoiceQuestions.length > 0 && (
              <button
                onClick={() => { setFilterType("pg"); setSelectedNum("all"); }}
                className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                  filterType === "pg" ? "bg-[#006837] text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                PG ({multipleChoiceQuestions.length})
              </button>
            )}
            {trueFalseQuestions.length > 0 && (
              <button
                onClick={() => { setFilterType("tf"); setSelectedNum("all"); }}
                className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                  filterType === "tf" ? "bg-amber-600 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                B/S ({trueFalseQuestions.length})
              </button>
            )}
            {matchingQuestions.length > 0 && (
              <button
                onClick={() => { setFilterType("matching"); setSelectedNum("all"); }}
                className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                  filterType === "matching" ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Jodohkan ({matchingQuestions.length})
              </button>
            )}
            {literacyQuestions.length > 0 && (
              <button
                onClick={() => { setFilterType("literacy"); setSelectedNum("all"); }}
                className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                  filterType === "literacy" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Literasi ({literacyQuestions.length})
              </button>
            )}
            {essayQuestions.length > 0 && (
              <button
                onClick={() => { setFilterType("essay"); setSelectedNum("all"); }}
                className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                  filterType === "essay" ? "bg-teal-700 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Uraian ({essayQuestions.length})
              </button>
            )}
          </div>
        </div>

        {/* Quick Question Number Jump */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-slate-500 font-medium">Lompat ke No:</span>
          <button
            onClick={() => setSelectedNum("all")}
            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
              selectedNum === "all" ? "bg-slate-800 text-white" : "bg-white border text-slate-700"
            }`}
          >
            Semua
          </button>
          {(filterType === "all" || filterType === "pg") &&
            multipleChoiceQuestions.map((q) => (
              <button
                key={`jump-pg-${q.number}`}
                onClick={() => setSelectedNum(`pg-${q.number}`)}
                className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                  selectedNum === `pg-${q.number}` ? "bg-emerald-700 text-white" : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
                }`}
              >
                PG {q.number}
              </button>
            ))}
          {(filterType === "all" || filterType === "tf") &&
            trueFalseQuestions.map((tf) => (
              <button
                key={`jump-tf-${tf.number}`}
                onClick={() => setSelectedNum(`tf-${tf.number}`)}
                className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                  selectedNum === `tf-${tf.number}` ? "bg-amber-600 text-white" : "bg-amber-50 border border-amber-300 text-amber-800 hover:bg-amber-100"
                }`}
              >
                B/S {tf.number}
              </button>
            ))}
          {(filterType === "all" || filterType === "matching") &&
            matchingQuestions.map((mq) => (
              <button
                key={`jump-matching-${mq.number}`}
                onClick={() => setSelectedNum(`matching-${mq.number}`)}
                className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                  selectedNum === `matching-${mq.number}` ? "bg-indigo-600 text-white" : "bg-indigo-50 border border-indigo-300 text-indigo-800 hover:bg-indigo-100"
                }`}
              >
                J {mq.number}
              </button>
            ))}
          {(filterType === "all" || filterType === "literacy") &&
            literacyQuestions.map((lq) => (
              <button
                key={`jump-lit-${lq.number}`}
                onClick={() => setSelectedNum(`lit-${lq.number}`)}
                className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                  selectedNum === `lit-${lq.number}` ? "bg-blue-600 text-white" : "bg-blue-50 border border-blue-300 text-blue-800 hover:bg-blue-100"
                }`}
              >
                Lit {lq.number}
              </button>
            ))}
          {(filterType === "all" || filterType === "essay") &&
            essayQuestions.map((eq) => (
              <button
                key={`jump-essay-${eq.number}`}
                onClick={() => setSelectedNum(`essay-${eq.number}`)}
                className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                  selectedNum === `essay-${eq.number}` ? "bg-emerald-800 text-white" : "bg-emerald-50 border border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                }`}
              >
                U {eq.number}
              </button>
            ))}
        </div>
      </div>

      {/* Question Cards Container */}
      <div className="space-y-6">
        {/* PG Question Cards */}
        {displayPg.map((q) => {
          const isAr = isArabic || /[\u0600-\u06FF]/.test(q.questionText);
          const passage = readingPassages.find(
            (p) => p.id === q.readingPassageId || (Array.isArray(p.questionNumbers) && p.questionNumbers.includes(q.number))
          );

          return (
            <div
              key={`card-pg-${q.number}`}
              className="bg-white p-5 sm:p-7 rounded-xl shadow-xs border-2 border-slate-800 print:shadow-none print:border-slate-900 page-break-inside-avoid"
            >
              <div className="flex items-center justify-between pb-3 border-b-2 border-slate-800 gap-3">
                <div className="flex items-center gap-3">
                  {schoolIdentity.logoBase64 && (
                    <img
                      src={schoolIdentity.logoBase64}
                      alt="Logo"
                      className="w-10 h-10 object-contain hidden sm:block"
                    />
                  )}
                  <div>
                    <div className="text-[11px] font-bold text-slate-700 uppercase">{schoolIdentity.schoolName}</div>
                    <div className="text-sm font-bold text-emerald-800 uppercase tracking-wide">
                      KARTU SOAL PILIHAN GANDA (NOMOR {q.number})
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {metadata.examType.toUpperCase()} - TAHUN AJARAN {metadata.academicYear}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-md border border-emerald-200">
                    No. Butir: {q.number}
                  </span>
                  <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2 py-1 rounded-md border border-slate-200">
                    Bobot: 1
                  </span>
                </div>
              </div>

              <div className="my-3 overflow-x-auto">
                <table className="w-full text-left border-collapse border border-slate-400 text-[11px] font-serif">
                  <tbody>
                    <tr>
                      <td className="border border-slate-400 p-2 font-bold bg-slate-50 w-[22%]">Mata Pelajaran</td>
                      <td className="border border-slate-400 p-2 w-[28%] font-semibold text-slate-800">{metadata.subjectName}</td>
                      <td className="border border-slate-400 p-2 font-bold bg-slate-50 w-[20%]">Kelas / Semester</td>
                      <td className="border border-slate-400 p-2 w-[30%] font-semibold text-slate-800">Kelas {metadata.grade} / {metadata.semester}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-400 p-2 font-bold bg-slate-50">Capaian / KD</td>
                      <td colSpan={3} className={`border border-slate-400 p-2 text-slate-800 ${isAr ? "font-amiri text-right text-xs" : ""}`}>
                        {q.basicCompetency || "-"}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-slate-400 p-2 font-bold bg-slate-50">Materi Pokok</td>
                      <td className={`border border-slate-400 p-2 font-medium text-slate-800 ${isAr ? "font-amiri text-right text-xs" : ""}`}>
                        {q.material || "-"}
                      </td>
                      <td className="border border-slate-400 p-2 font-bold bg-slate-50">Level Kognitif</td>
                      <td className="border border-slate-400 p-2 font-bold text-slate-800">{q.cognitiveLevel || "L2 (C3)"}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-400 p-2 font-bold bg-slate-50">Indikator Soal</td>
                      <td className={`border border-slate-400 p-2 text-slate-800 ${isAr ? "font-amiri text-right text-xs" : ""}`}>
                        {q.indicator || "-"}
                      </td>
                      <td className="border border-slate-400 p-2 font-bold bg-slate-50">Tingkat Kesukaran</td>
                      <td className="border border-slate-400 p-2 font-bold text-slate-800">{q.difficulty || "Sedang"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200">
                <div className="text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2 bg-slate-100 p-1.5 px-2.5 rounded">
                  Rumusan Butir Soal:
                </div>

                {passage && (
                  <div className="mb-3 p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg text-xs font-serif">
                    <div className="font-bold text-emerald-900 mb-1 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
                      <span>{passage.title}</span>
                    </div>
                    <div className={`text-slate-800 leading-relaxed ${isAr ? "font-amiri text-right text-sm leading-loose" : ""}`}>
                      {passage.content}
                    </div>
                  </div>
                )}

                <div className={`text-xs sm:text-sm font-serif font-semibold text-slate-900 mb-3 leading-relaxed ${isAr ? "font-amiri text-right text-base leading-loose" : ""}`}>
                  <span className="font-bold mr-1.5">{q.number}.</span>
                  <span>{q.questionText}</span>
                </div>

                <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-serif mb-4 ${isAr ? "font-amiri text-right" : ""}`}>
                  {q.options.map((opt) => (
                    <div
                      key={opt.key}
                      className={`p-2 rounded-lg border transition-all ${
                        opt.key === q.correctAnswer
                          ? "bg-emerald-50 border-emerald-400 font-bold text-emerald-900"
                          : "bg-slate-50/60 border-slate-200 text-slate-700"
                      }`}
                    >
                      <span className="inline-block w-6 font-bold">{opt.key}.</span>
                      <span>{opt.text}</span>
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-serif flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-600">Kunci Jawaban:</span>
                    <span className="text-sm font-bold text-white bg-[#006837] px-2.5 py-0.5 rounded shadow-xs">
                      {q.correctAnswer}
                    </span>
                  </div>
                  <div className="text-slate-600 italic">
                    <strong>Pembahasan:</strong> {q.explanation || "Jawaban tepat sesuai materi kurikulum."}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* True/False Question Cards */}
        {displayTf.map((tf) => {
          const isAr = isArabic || /[\u0600-\u06FF]/.test(tf.instructions);
          return (
            <div
              key={`card-tf-${tf.number}`}
              className="bg-white p-5 sm:p-7 rounded-xl shadow-xs border-2 border-amber-800 print:shadow-none print:border-amber-900 page-break-inside-avoid"
            >
              <div className="flex items-center justify-between pb-3 border-b-2 border-amber-800 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                    <CheckSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-700 uppercase">{schoolIdentity.schoolName}</div>
                    <div className="text-sm font-bold text-amber-900 uppercase tracking-wide">
                      KARTU SOAL MENENTUKAN BENAR / SALAH (NOMOR {tf.number})
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {metadata.examType.toUpperCase()} - TAHUN AJARAN {metadata.academicYear}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="bg-amber-800 text-white text-xs font-bold px-2.5 py-1 rounded-md">
                    B/S No. {tf.number}
                  </span>
                  <span className="bg-amber-100 text-amber-900 text-xs font-bold px-2 py-1 rounded-md border border-amber-300">
                    {tf.statements.length} Pernyataan
                  </span>
                </div>
              </div>

              <div className="my-3 overflow-x-auto">
                <table className="w-full text-left border-collapse border border-slate-400 text-[11px] font-serif">
                  <tbody>
                    <tr>
                      <td className="border border-slate-400 p-2 font-bold bg-slate-50 w-[22%]">Mata Pelajaran</td>
                      <td className="border border-slate-400 p-2 w-[28%] font-semibold text-slate-800">{metadata.subjectName}</td>
                      <td className="border border-slate-400 p-2 font-bold bg-slate-50 w-[20%]">Kelas / Semester</td>
                      <td className="border border-slate-400 p-2 w-[30%] font-semibold text-slate-800">Kelas {metadata.grade} / {metadata.semester}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-400 p-2 font-bold bg-slate-50">Capaian / KD</td>
                      <td colSpan={3} className={`border border-slate-400 p-2 text-slate-800 ${isAr ? "font-amiri text-right text-xs" : ""}`}>
                        {tf.basicCompetency || "-"}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-slate-400 p-2 font-bold bg-slate-50">Materi Pokok</td>
                      <td className={`border border-slate-400 p-2 font-medium text-slate-800 ${isAr ? "font-amiri text-right text-xs" : ""}`}>
                        {tf.material || "-"}
                      </td>
                      <td className="border border-slate-400 p-2 font-bold bg-slate-50">Level Kognitif</td>
                      <td className="border border-slate-400 p-2 font-bold text-slate-800">{tf.cognitiveLevel || "L2"}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-400 p-2 font-bold bg-slate-50">Indikator Soal</td>
                      <td className={`border border-slate-400 p-2 text-slate-800 ${isAr ? "font-amiri text-right text-xs" : ""}`}>
                        {tf.indicator || "-"}
                      </td>
                      <td className="border border-slate-400 p-2 font-bold bg-slate-50">Tingkat Kesukaran</td>
                      <td className="border border-slate-400 p-2 font-bold text-slate-800">{tf.difficulty || "Sedang"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200">
                <div className="text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2 bg-amber-50 text-amber-900 p-1.5 px-2.5 rounded">
                  Petunjuk & Pernyataan Soal:
                </div>

                <div className="text-xs font-serif italic text-slate-700 mb-3">
                  {tf.instructions || "Tentukan apakah setiap pernyataan berikut Benar atau Salah!"}
                </div>

                <div className="space-y-2 text-xs font-serif">
                  {tf.statements.map((st, sIdx) => (
                    <div key={st.id || sIdx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex-1">
                        <span className="font-bold mr-1.5">{sIdx + 1}.</span>
                        <span className={isAr ? "font-amiri text-sm" : ""}>{st.statement}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`px-2.5 py-0.5 rounded font-bold text-xs ${st.isCorrect ? "bg-emerald-700 text-white" : "bg-rose-700 text-white"}`}>
                          {st.isCorrect ? "BENAR" : "SALAH"}
                        </span>
                        {st.explanation && (
                          <span className="text-[11px] text-slate-500 italic max-w-xs">
                            ({st.explanation})
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}

        {/* Matching Question Cards */}
        {displayMatching.map((mq) => {
          const isAr = isArabic || /[\u0600-\u06FF]/.test(mq.instructions);
          return (
            <div
              key={`card-matching-${mq.number}`}
              className="bg-white p-5 sm:p-7 rounded-xl shadow-xs border-2 border-indigo-800 print:shadow-none print:border-indigo-900 page-break-inside-avoid"
            >
              <div className="flex items-center justify-between pb-3 border-b-2 border-indigo-800 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold">
                    <Link2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-700 uppercase">{schoolIdentity.schoolName}</div>
                    <div className="text-sm font-bold text-indigo-900 uppercase tracking-wide">
                      KARTU SOAL MENJODOHKAN / MENCOCOKKAN (NOMOR {mq.number})
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {metadata.examType.toUpperCase()} - TAHUN AJARAN {metadata.academicYear}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="bg-indigo-800 text-white text-xs font-bold px-2.5 py-1 rounded-md">
                    Jodoh No. {mq.number}
                  </span>
                  <span className="bg-indigo-100 text-indigo-900 text-xs font-bold px-2 py-1 rounded-md border border-indigo-300">
                    {mq.premises.length} Pasangan
                  </span>
                </div>
              </div>

              <div className="my-3 overflow-x-auto">
                <table className="w-full text-left border-collapse border border-slate-400 text-[11px] font-serif">
                  <tbody>
                    <tr>
                      <td className="border border-slate-400 p-2 font-bold bg-slate-50 w-[22%]">Mata Pelajaran</td>
                      <td className="border border-slate-400 p-2 w-[28%] font-semibold text-slate-800">{metadata.subjectName}</td>
                      <td className="border border-slate-400 p-2 font-bold bg-slate-50 w-[20%]">Kelas / Semester</td>
                      <td className="border border-slate-400 p-2 w-[30%] font-semibold text-slate-800">Kelas {metadata.grade} / {metadata.semester}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-400 p-2 font-bold bg-slate-50">Capaian / KD</td>
                      <td colSpan={3} className={`border border-slate-400 p-2 text-slate-800 ${isAr ? "font-amiri text-right text-xs" : ""}`}>
                        {mq.basicCompetency || "-"}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-slate-400 p-2 font-bold bg-slate-50">Materi Pokok</td>
                      <td className={`border border-slate-400 p-2 font-medium text-slate-800 ${isAr ? "font-amiri text-right text-xs" : ""}`}>
                        {mq.material || "-"}
                      </td>
                      <td className="border border-slate-400 p-2 font-bold bg-slate-50">Level Kognitif</td>
                      <td className="border border-slate-400 p-2 font-bold text-slate-800">{mq.cognitiveLevel || "L2"}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-400 p-2 font-bold bg-slate-50">Indikator Soal</td>
                      <td className={`border border-slate-400 p-2 text-slate-800 ${isAr ? "font-amiri text-right text-xs" : ""}`}>
                        {mq.indicator || "-"}
                      </td>
                      <td className="border border-slate-400 p-2 font-bold bg-slate-50">Tingkat Kesukaran</td>
                      <td className="border border-slate-400 p-2 font-bold text-slate-800">{mq.difficulty || "Sedang"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200">
                <div className="text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2 bg-indigo-50 text-indigo-900 p-1.5 px-2.5 rounded">
                  Kunci Pasangan & Pembahasan Menjodohkan:
                </div>

                <div className="space-y-2 text-xs font-serif">
                  {mq.correctPairs.map((pair, pIdx) => {
                    const pObj = mq.premises.find((p) => p.key === pair.premiseKey);
                    const tObj = mq.targets.find((t) => t.key === pair.targetKey);
                    return (
                      <div key={pIdx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-indigo-900">[{pair.premiseKey}] {pObj?.text || ""}</span>
                          <span className="text-indigo-600 font-bold">➔</span>
                          <span className="font-bold text-emerald-800">[{pair.targetKey}] {tObj?.text || ""}</span>
                        </div>
                        {pair.explanation && (
                          <div className="text-slate-600 italic text-[11px] mt-1">
                            Keterangan: {pair.explanation}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}

        {/* Literacy Question Cards */}
        {displayLiteracy.map((lq) => {
          const isAr = isArabic || /[\u0600-\u06FF]/.test(lq.questionText);
          return (
            <div
              key={`card-lit-${lq.number}`}
              className="bg-white p-5 sm:p-7 rounded-xl shadow-xs border-2 border-blue-800 print:shadow-none print:border-blue-900 page-break-inside-avoid"
            >
              <div className="flex items-center justify-between pb-3 border-b-2 border-blue-800 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                    <BarChart2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-700 uppercase">{schoolIdentity.schoolName}</div>
                    <div className="text-sm font-bold text-blue-900 uppercase tracking-wide">
                      KARTU SOAL LITERASI TEKS & DATA (NOMOR {lq.number})
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {metadata.examType.toUpperCase()} - TAHUN AJARAN {metadata.academicYear}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="bg-blue-800 text-white text-xs font-bold px-2.5 py-1 rounded-md">
                    Lit No. {lq.number}
                  </span>
                  <span className="bg-blue-100 text-blue-900 text-xs font-bold px-2 py-1 rounded-md border border-blue-300">
                    {lq.stimulusType.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="my-3 overflow-x-auto">
                <table className="w-full text-left border-collapse border border-slate-400 text-[11px] font-serif">
                  <tbody>
                    <tr>
                      <td className="border border-slate-400 p-2 font-bold bg-slate-50 w-[22%]">Mata Pelajaran</td>
                      <td className="border border-slate-400 p-2 w-[28%] font-semibold text-slate-800">{metadata.subjectName}</td>
                      <td className="border border-slate-400 p-2 font-bold bg-slate-50 w-[20%]">Kelas / Semester</td>
                      <td className="border border-slate-400 p-2 w-[30%] font-semibold text-slate-800">Kelas {metadata.grade} / {metadata.semester}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-400 p-2 font-bold bg-slate-50">Capaian / KD</td>
                      <td colSpan={3} className={`border border-slate-400 p-2 text-slate-800 ${isAr ? "font-amiri text-right text-xs" : ""}`}>
                        {lq.basicCompetency || "-"}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-slate-400 p-2 font-bold bg-slate-50">Materi Pokok</td>
                      <td className={`border border-slate-400 p-2 font-medium text-slate-800 ${isAr ? "font-amiri text-right text-xs" : ""}`}>
                        {lq.material || "-"}
                      </td>
                      <td className="border border-slate-400 p-2 font-bold bg-slate-50">Level Kognitif</td>
                      <td className="border border-slate-400 p-2 font-bold text-slate-800">{lq.cognitiveLevel || "L3 (HOTS)"}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-400 p-2 font-bold bg-slate-50">Indikator Soal</td>
                      <td className={`border border-slate-400 p-2 text-slate-800 ${isAr ? "font-amiri text-right text-xs" : ""}`}>
                        {lq.indicator || "-"}
                      </td>
                      <td className="border border-slate-400 p-2 font-bold bg-slate-50">Tingkat Kesukaran</td>
                      <td className="border border-slate-400 p-2 font-bold text-slate-800">{lq.difficulty || "Sukar"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200">
                {/* Stimulus */}
                <div className="mb-3 p-3.5 bg-blue-50/80 border border-blue-200 rounded-lg text-xs font-serif">
                  <div className="font-bold text-blue-900 mb-1 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-blue-700" />
                    <span>{lq.stimulusTitle} ({lq.stimulusType})</span>
                  </div>
                  <div className="text-slate-800 leading-relaxed">{lq.stimulusContent}</div>
                  {lq.dataSnippet && (
                    <div className="mt-2 p-2 bg-blue-100/70 border border-blue-300 rounded text-[11px] font-mono text-blue-950">
                      {lq.dataSnippet}
                    </div>
                  )}
                </div>

                {/* Question */}
                <div className="text-xs sm:text-sm font-serif font-semibold text-slate-900 mb-3">
                  <span className="font-bold mr-1.5">{lq.number}.</span>
                  <span>{lq.questionText}</span>
                </div>

                {/* Kunci */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-serif">
                  <div className="font-bold text-emerald-900">
                    Kunci Jawaban: <span className="bg-[#006837] text-white px-2 py-0.5 rounded text-xs">[ {lq.correctAnswer || "Model Jawaban"} ]</span>
                  </div>
                  <div className="mt-1 text-slate-700 italic">
                    <strong>Pembahasan:</strong> {lq.explanation || "-"}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Essay Question Cards */}
        {displayEssay.map((eq) => {
          const isAr = isArabic || /[\u0600-\u06FF]/.test(eq.questionText);
          const passage = readingPassages.find(
            (p) =>
              p.id === eq.readingPassageId ||
              (Array.isArray(p.essayQuestionNumbers) && p.essayQuestionNumbers.includes(eq.number))
          );

          return (
            <div
              key={`card-essay-${eq.number}`}
              className="bg-white p-5 sm:p-7 rounded-xl shadow-xs border-2 border-emerald-800 print:shadow-none print:border-emerald-900 page-break-inside-avoid"
            >
              <div className="flex items-center justify-between pb-3 border-b-2 border-emerald-800 gap-3">
                <div className="flex items-center gap-3">
                  {schoolIdentity.logoBase64 && (
                    <img
                      src={schoolIdentity.logoBase64}
                      alt="Logo"
                      className="w-10 h-10 object-contain hidden sm:block"
                    />
                  )}
                  <div>
                    <div className="text-[11px] font-bold text-slate-700 uppercase">{schoolIdentity.schoolName}</div>
                    <div className="text-sm font-bold text-emerald-900 uppercase tracking-wide">
                      KARTU SOAL URAIAN / ESSAY (NOMOR {eq.number})
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {metadata.examType.toUpperCase()} - TAHUN AJARAN {metadata.academicYear}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="bg-emerald-800 text-white text-xs font-bold px-2.5 py-1 rounded-md">
                    Uraian No. {eq.number}
                  </span>
                  <span className="bg-emerald-100 text-emerald-900 text-xs font-bold px-2 py-1 rounded-md border border-emerald-300">
                    Skor Maks: {eq.maxScore || 10}
                  </span>
                </div>
              </div>

              <div className="my-3 overflow-x-auto">
                <table className="w-full text-left border-collapse border border-slate-400 text-[11px] font-serif">
                  <tbody>
                    <tr>
                      <td className="border border-slate-400 p-2 font-bold bg-slate-50 w-[22%]">Mata Pelajaran</td>
                      <td className="border border-slate-400 p-2 w-[28%] font-semibold text-slate-800">{metadata.subjectName}</td>
                      <td className="border border-slate-400 p-2 font-bold bg-slate-50 w-[20%]">Kelas / Semester</td>
                      <td className="border border-slate-400 p-2 w-[30%] font-semibold text-slate-800">Kelas {metadata.grade} / {metadata.semester}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-400 p-2 font-bold bg-slate-50">Capaian / KD</td>
                      <td colSpan={3} className={`border border-slate-400 p-2 text-slate-800 ${isAr ? "font-amiri text-right text-xs" : ""}`}>
                        {eq.basicCompetency || "-"}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-slate-400 p-2 font-bold bg-slate-50">Materi Pokok</td>
                      <td className={`border border-slate-400 p-2 font-medium text-slate-800 ${isAr ? "font-amiri text-right text-xs" : ""}`}>
                        {eq.material || "-"}
                      </td>
                      <td className="border border-slate-400 p-2 font-bold bg-slate-50">Level Kognitif</td>
                      <td className="border border-slate-400 p-2 font-bold text-slate-800">{eq.cognitiveLevel || "L3 (HOTS)"}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-400 p-2 font-bold bg-slate-50">Indikator Soal</td>
                      <td className={`border border-slate-400 p-2 text-slate-800 ${isAr ? "font-amiri text-right text-xs" : ""}`}>
                        {eq.indicator || "-"}
                      </td>
                      <td className="border border-slate-400 p-2 font-bold bg-slate-50">Tingkat Kesukaran</td>
                      <td className="border border-slate-400 p-2 font-bold text-slate-800">{eq.difficulty || "Sukar"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200">
                <div className="text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2 bg-emerald-50 text-emerald-900 p-1.5 px-2.5 rounded">
                  Rumusan Butir Soal Uraian:
                </div>

                {passage && (
                  <div className="mb-3 p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg text-xs font-serif">
                    <div className="font-bold text-emerald-900 mb-1 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
                      <span>{passage.title}</span>
                    </div>
                    <div className={`text-slate-800 leading-relaxed ${isAr ? "font-amiri text-right text-sm leading-loose" : ""}`}>
                      {passage.content}
                    </div>
                  </div>
                )}

                <div className={`text-xs sm:text-sm font-serif font-semibold text-slate-900 mb-4 leading-relaxed ${isAr ? "font-amiri text-right text-base leading-loose" : ""}`}>
                  <span className="font-bold mr-1.5">{eq.number}.</span>
                  <span>{eq.questionText}</span>
                </div>

                <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-serif">
                  <div>
                    <span className="font-bold text-emerald-900">Pedoman / Model Jawaban:</span>
                    <div className={`mt-1 text-slate-800 ${isAr ? "font-amiri text-right text-sm leading-relaxed" : ""}`}>
                      {eq.modelAnswer || "-"}
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-200">
                    <span className="font-bold text-emerald-900">Kriteria & Rubrik Penskoran:</span>
                    <div className="mt-0.5 text-slate-700 italic">
                      {eq.scoringRubric || "Skor maksimal: 10. Jawaban terinci & komprehensif = 10; Cukup = 5-9; Kurang = 1-4."}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
