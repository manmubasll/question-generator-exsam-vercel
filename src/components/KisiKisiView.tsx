import React, { useState } from "react";
import { ExamData, PaperSize } from "../types";
import { SchoolHeaderKop } from "./SchoolHeaderKop";
import { enrichExamPedagogy } from "../utils/pedagogyHelpers";
import { exportKisiKisiWordClassic, exportKisiKisiWordDocx } from "../utils/exportPedagogyWord";
import { printExamDirectly, openExamInNewTab } from "../utils/printExam";
import {
  Printer,
  FileText,
  Copy,
  Check,
  ExternalLink,
  BookOpen,
  Sparkles,
  Download,
} from "lucide-react";

interface KisiKisiViewProps {
  examData: ExamData;
  paperSize: PaperSize;
}

export const KisiKisiView: React.FC<KisiKisiViewProps> = ({
  examData: rawExamData,
  paperSize,
}) => {
  const [copied, setCopied] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);

  const examData = enrichExamPedagogy(rawExamData);
  const {
    schoolIdentity,
    metadata,
    multipleChoiceQuestions,
    essayQuestions,
    trueFalseQuestions = [],
    matchingQuestions = [],
    literacyQuestions = [],
  } = examData;

  const isArabic =
    metadata.examLanguage === "ar" ||
    metadata.subjectName.toLowerCase().includes("bahasa arab") ||
    metadata.subjectName.toLowerCase().includes("arab");

  const handlePrint = () => {
    printExamDirectly(examData, paperSize, "kisi-kisi");
  };

  const handleOpenNewTab = () => {
    openExamInNewTab(examData, paperSize, "kisi-kisi");
  };

  const handleDownloadDocx = async () => {
    try {
      setIsExportingDocx(true);
      await exportKisiKisiWordDocx(examData, paperSize);
    } catch (e) {
      console.error(e);
      exportKisiKisiWordClassic(examData, paperSize);
    } finally {
      setIsExportingDocx(false);
    }
  };

  const handleDownloadDoc = () => {
    exportKisiKisiWordClassic(examData, paperSize);
  };

  const handleCopy = () => {
    let text = `KISI-KISI PENULISAN SOAL ${metadata.examType.toUpperCase()}\n`;
    text += `Mata Pelajaran: ${metadata.subjectName} | Kelas: ${metadata.grade} (${metadata.gradeLevel})\n`;
    text += `Tahun Ajaran: ${metadata.academicYear} | Guru: ${metadata.teacherName}\n\n`;
    text += `No | Kompetensi Dasar / CP | Materi | Indikator | Level | Kesukaran | Bentuk | No Soal\n`;
    text += `--------------------------------------------------------------------------------------\n`;

    let n = 1;
    multipleChoiceQuestions.forEach((q) => {
      text += `${n++} | ${q.basicCompetency} | ${q.material} | ${q.indicator} | ${q.cognitiveLevel} | ${q.difficulty} | PG | ${q.number}\n`;
    });
    trueFalseQuestions.forEach((tf) => {
      text += `${n++} | ${tf.basicCompetency} | ${tf.material} | ${tf.indicator} | ${tf.cognitiveLevel} | ${tf.difficulty} | Benar/Salah | ${tf.number}\n`;
    });
    matchingQuestions.forEach((mq) => {
      text += `${n++} | ${mq.basicCompetency} | ${mq.material} | ${mq.indicator} | ${mq.cognitiveLevel} | ${mq.difficulty} | Menjodohkan | ${mq.number}\n`;
    });
    literacyQuestions.forEach((lq) => {
      text += `${n++} | ${lq.basicCompetency} | ${lq.material} | ${lq.indicator} | ${lq.cognitiveLevel} | ${lq.difficulty} | Literasi AKM | ${lq.number}\n`;
    });
    essayQuestions.forEach((eq) => {
      text += `${n++} | ${eq.basicCompetency} | ${eq.material} | ${eq.indicator} | ${eq.cognitiveLevel} | ${eq.difficulty} | Uraian | ${eq.number}\n`;
    });

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  let rowCounter = 1;

  return (
    <div className="space-y-4">
      {/* Action Toolbar for Kisi-kisi */}
      <div className="no-print bg-white p-3.5 sm:p-4 rounded-xl shadow-xs border border-emerald-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Dokumen Kisi-Kisi Soal (Matriks / Blueprint)</h3>
            <p className="text-xs text-slate-500">Standar BSNP & Asesmen Nasional Kemenag/Kemendikbud</p>
          </div>
        </div>

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
            title="Buka Pratinjau Bersih di Tab Baru"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
            <span>Tab Baru</span>
          </button>

          <button
            onClick={handleDownloadDocx}
            disabled={isExportingDocx}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-xs transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{isExportingDocx ? "Memproses..." : "Word (.docx)"}</span>
          </button>

          <button
            onClick={handleDownloadDoc}
            className="flex items-center gap-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-xs font-bold px-2.5 py-2 rounded-lg transition-colors"
            title="Format Word 2007+ .doc (Kompatibilitas Maksimal)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Word (.doc)</span>
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

      {/* Main Document Paper Sheet */}
      <div className="bg-white p-6 sm:p-10 rounded-2xl shadow-md border border-slate-200 print:shadow-none print:border-none print:p-0">
        {/* KOP Sekolah */}
        <SchoolHeaderKop identity={schoolIdentity} />

        {/* Title */}
        <div className="text-center my-5">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 uppercase tracking-wide">
            KISI-KISI PENULISAN SOAL {metadata.examType.toUpperCase()}
          </h2>
          <div className="text-xs sm:text-sm font-semibold text-slate-700 uppercase mt-0.5">
            TAHUN AJARAN {metadata.academicYear}
          </div>
        </div>

        {/* Exam Metadata Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1.5 text-xs text-slate-800 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 mb-6">
          <div className="flex items-center gap-2">
            <span className="w-32 shrink-0 font-semibold text-slate-600">Satuan Pendidikan:</span>
            <span className="font-bold text-slate-900">{schoolIdentity.schoolName}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-32 shrink-0 font-semibold text-slate-600">Alokasi Waktu:</span>
            <span className="font-medium text-slate-900">{metadata.timeAllocation}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-32 shrink-0 font-semibold text-slate-600">Mata Pelajaran:</span>
            <span className="font-bold text-emerald-800">{metadata.subjectName}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-32 shrink-0 font-semibold text-slate-600">Jumlah Soal:</span>
            <span className="font-medium text-slate-900">{multipleChoiceQuestions.length} Pilihan Ganda & {essayQuestions.length} Uraian</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-32 shrink-0 font-semibold text-slate-600">Kelas / Semester:</span>
            <span className="font-medium text-slate-900">Kelas {metadata.grade} ({metadata.gradeLevel}) / {metadata.semester}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-32 shrink-0 font-semibold text-slate-600">Kurikulum:</span>
            <span className="font-medium text-slate-900">Kurikulum Merdeka / K-13</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-32 shrink-0 font-semibold text-slate-600">Guru Pengampu:</span>
            <span className="font-medium text-slate-900 whitespace-nowrap">{metadata.teacherName}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-32 shrink-0 font-semibold text-slate-600">Hari / Tanggal:</span>
            <span className="font-medium text-slate-900 whitespace-nowrap">{metadata.examDate}</span>
          </div>
        </div>

        {/* Tabel Kisi-Kisi Standar */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-slate-800 text-[11px] leading-tight font-serif">
            <thead>
              <tr className="bg-slate-100 text-slate-900 text-center font-bold">
                <th className="border border-slate-800 p-2 w-[4%]">No.</th>
                <th className="border border-slate-800 p-2 w-[24%]">Capaian Pembelajaran / Kompetensi Dasar</th>
                <th className="border border-slate-800 p-2 w-[18%]">Materi Pokok</th>
                <th className="border border-slate-800 p-2 w-[28%]">Indikator Soal</th>
                <th className="border border-slate-800 p-2 w-[8%]">Level Kognitif</th>
                <th className="border border-slate-800 p-2 w-[8%]">Tingkat Kesukaran</th>
                <th className="border border-slate-800 p-2 w-[6%]">Bentuk</th>
                <th className="border border-slate-800 p-2 w-[4%]">No.</th>
              </tr>
            </thead>
            <tbody>
              {/* PG Rows */}
              {multipleChoiceQuestions.map((q) => {
                const isAr = isArabic || /[\u0600-\u06FF]/.test(q.questionText);
                return (
                  <tr key={`pg-${q.number}`} className="hover:bg-slate-50/60 transition-colors">
                    <td className="border border-slate-800 p-2 text-center font-bold">{rowCounter++}</td>
                    <td className={`border border-slate-800 p-2 ${isAr ? "font-amiri text-right text-xs" : ""}`}>
                      {q.basicCompetency || "-"}
                    </td>
                    <td className={`border border-slate-800 p-2 font-medium ${isAr ? "font-amiri text-right text-xs" : ""}`}>
                      {q.material || "-"}
                    </td>
                    <td className={`border border-slate-800 p-2 ${isAr ? "font-amiri text-right text-xs" : ""}`}>
                      {q.indicator || "-"}
                    </td>
                    <td className="border border-slate-800 p-2 text-center font-semibold text-slate-700">
                      {q.cognitiveLevel?.split(" ")[0] || "L2"}
                    </td>
                    <td className="border border-slate-800 p-2 text-center">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        q.difficulty === "Mudah"
                          ? "bg-emerald-100 text-emerald-800"
                          : q.difficulty === "Sukar"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-blue-100 text-blue-800"
                      }`}>
                        {q.difficulty || "Sedang"}
                      </span>
                    </td>
                    <td className="border border-slate-800 p-2 text-center font-semibold">PG</td>
                    <td className="border border-slate-800 p-2 text-center font-bold bg-slate-50">{q.number}</td>
                  </tr>
                );
              })}

              {/* Benar / Salah Rows */}
              {trueFalseQuestions.map((tf) => {
                const isAr = isArabic || /[\u0600-\u06FF]/.test(tf.instruction);
                return (
                  <tr key={`tf-${tf.number}`} className="hover:bg-slate-50/60 transition-colors bg-amber-50/20">
                    <td className="border border-slate-800 p-2 text-center font-bold">{rowCounter++}</td>
                    <td className={`border border-slate-800 p-2 ${isAr ? "font-amiri text-right text-xs" : ""}`}>
                      {tf.basicCompetency || "-"}
                    </td>
                    <td className={`border border-slate-800 p-2 font-medium ${isAr ? "font-amiri text-right text-xs" : ""}`}>
                      {tf.material || "-"}
                    </td>
                    <td className={`border border-slate-800 p-2 ${isAr ? "font-amiri text-right text-xs" : ""}`}>
                      {tf.indicator || "-"}
                    </td>
                    <td className="border border-slate-800 p-2 text-center font-semibold text-slate-700">
                      {tf.cognitiveLevel?.split(" ")[0] || "L2"}
                    </td>
                    <td className="border border-slate-800 p-2 text-center">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        tf.difficulty === "Mudah"
                          ? "bg-emerald-100 text-emerald-800"
                          : tf.difficulty === "Sukar"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-blue-100 text-blue-800"
                      }`}>
                        {tf.difficulty || "Sedang"}
                      </span>
                    </td>
                    <td className="border border-slate-800 p-2 text-center font-semibold text-teal-800">B / S</td>
                    <td className="border border-slate-800 p-2 text-center font-bold bg-teal-50">{tf.number}</td>
                  </tr>
                );
              })}

              {/* Menjodohkan Rows */}
              {matchingQuestions.map((mq) => {
                const isAr = isArabic || /[\u0600-\u06FF]/.test(mq.instruction);
                return (
                  <tr key={`matching-${mq.number}`} className="hover:bg-slate-50/60 transition-colors bg-indigo-50/20">
                    <td className="border border-slate-800 p-2 text-center font-bold">{rowCounter++}</td>
                    <td className={`border border-slate-800 p-2 ${isAr ? "font-amiri text-right text-xs" : ""}`}>
                      {mq.basicCompetency || "-"}
                    </td>
                    <td className={`border border-slate-800 p-2 font-medium ${isAr ? "font-amiri text-right text-xs" : ""}`}>
                      {mq.material || "-"}
                    </td>
                    <td className={`border border-slate-800 p-2 ${isAr ? "font-amiri text-right text-xs" : ""}`}>
                      {mq.indicator || "-"}
                    </td>
                    <td className="border border-slate-800 p-2 text-center font-semibold text-slate-700">
                      {mq.cognitiveLevel?.split(" ")[0] || "L2"}
                    </td>
                    <td className="border border-slate-800 p-2 text-center">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        mq.difficulty === "Mudah"
                          ? "bg-emerald-100 text-emerald-800"
                          : mq.difficulty === "Sukar"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-blue-100 text-blue-800"
                      }`}>
                        {mq.difficulty || "Sedang"}
                      </span>
                    </td>
                    <td className="border border-slate-800 p-2 text-center font-semibold text-indigo-800">Menjodohkan</td>
                    <td className="border border-slate-800 p-2 text-center font-bold bg-indigo-50">{mq.number}</td>
                  </tr>
                );
              })}

              {/* Literasi AKM Rows */}
              {literacyQuestions.map((lq) => {
                const isAr = isArabic || /[\u0600-\u06FF]/.test(lq.questionText);
                return (
                  <tr key={`lit-${lq.number}`} className="hover:bg-slate-50/60 transition-colors bg-purple-50/20">
                    <td className="border border-slate-800 p-2 text-center font-bold">{rowCounter++}</td>
                    <td className={`border border-slate-800 p-2 ${isAr ? "font-amiri text-right text-xs" : ""}`}>
                      {lq.basicCompetency || "-"}
                    </td>
                    <td className={`border border-slate-800 p-2 font-medium ${isAr ? "font-amiri text-right text-xs" : ""}`}>
                      {lq.material || "-"}
                    </td>
                    <td className={`border border-slate-800 p-2 ${isAr ? "font-amiri text-right text-xs" : ""}`}>
                      {lq.indicator || "-"}
                    </td>
                    <td className="border border-slate-800 p-2 text-center font-semibold text-slate-700">
                      {lq.cognitiveLevel?.split(" ")[0] || "L3"}
                    </td>
                    <td className="border border-slate-800 p-2 text-center">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        lq.difficulty === "Mudah"
                          ? "bg-emerald-100 text-emerald-800"
                          : lq.difficulty === "Sukar"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-blue-100 text-blue-800"
                      }`}>
                        {lq.difficulty || "Sukar"}
                      </span>
                    </td>
                    <td className="border border-slate-800 p-2 text-center font-semibold text-purple-800">Literasi Data</td>
                    <td className="border border-slate-800 p-2 text-center font-bold bg-purple-50">{lq.number}</td>
                  </tr>
                );
              })}

              {/* Essay Rows */}
              {essayQuestions.map((eq) => {
                const isAr = isArabic || /[\u0600-\u06FF]/.test(eq.questionText);
                return (
                  <tr key={`essay-${eq.number}`} className="hover:bg-slate-50/60 transition-colors bg-emerald-50/30">
                    <td className="border border-slate-800 p-2 text-center font-bold">{rowCounter++}</td>
                    <td className={`border border-slate-800 p-2 ${isAr ? "font-amiri text-right text-xs" : ""}`}>
                      {eq.basicCompetency || "-"}
                    </td>
                    <td className={`border border-slate-800 p-2 font-medium ${isAr ? "font-amiri text-right text-xs" : ""}`}>
                      {eq.material || "-"}
                    </td>
                    <td className={`border border-slate-800 p-2 ${isAr ? "font-amiri text-right text-xs" : ""}`}>
                      {eq.indicator || "-"}
                    </td>
                    <td className="border border-slate-800 p-2 text-center font-semibold text-slate-700">
                      {eq.cognitiveLevel?.split(" ")[0] || "L3"}
                    </td>
                    <td className="border border-slate-800 p-2 text-center">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        eq.difficulty === "Mudah"
                          ? "bg-emerald-100 text-emerald-800"
                          : eq.difficulty === "Sukar"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-blue-100 text-blue-800"
                      }`}>
                        {eq.difficulty || "Sukar"}
                      </span>
                    </td>
                    <td className="border border-slate-800 p-2 text-center font-semibold text-emerald-800">Uraian</td>
                    <td className="border border-slate-800 p-2 text-center font-bold bg-emerald-100/60">{eq.number}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Catatan Level Kognitif */}
        <div className="mt-3 text-[11px] text-slate-600 font-sans italic">
          * Keterangan Level Kognitif: <strong>Level 1 (L1)</strong> = Pengetahuan & Pemahaman (C1-C2); <strong>Level 2 (L2)</strong> = Aplikasi & Penerapan (C3); <strong>Level 3 (L3)</strong> = Penalaran & HOTS (C4-C6).
        </div>

        {/* Tanda Tangan Pengesahan */}
        <div className="mt-12 grid grid-cols-2 gap-8 text-center text-xs font-serif break-inside-avoid">
          <div>
            <div>Mengetahui,</div>
            <div className="font-bold">Kepala {schoolIdentity.schoolName}</div>
            <div className="h-20"></div>
            <div className="font-bold underline">___________________________</div>
            <div>NIP. ......................................................</div>
          </div>
          <div>
            <div>{schoolIdentity.address?.split(",")[1]?.trim() || "Sleman"}, {metadata.examDate}</div>
            <div className="font-bold">Guru Pengampu Mata Pelajaran</div>
            <div className="h-20"></div>
            <div className="font-bold underline">{metadata.teacherName}</div>
            <div>NIP. ......................................................</div>
          </div>
        </div>
      </div>
    </div>
  );
};
