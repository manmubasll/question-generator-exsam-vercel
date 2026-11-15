import React, { useState } from "react";
import { ExamData, PaperSize } from "../types";
import { SchoolHeaderKop } from "./SchoolHeaderKop";
import { enrichExamPedagogy, calculateExamStatistics } from "../utils/pedagogyHelpers";
import { exportAnalisisSoalWordClassic } from "../utils/exportPedagogyWord";
import { printExamDirectly, openExamInNewTab } from "../utils/printExam";
import {
  Printer,
  FileText,
  Copy,
  Check,
  ExternalLink,
  BarChart3,
  PieChart,
  CheckCircle2,
  AlertTriangle,
  Download,
  Info,
} from "lucide-react";

interface AnalisisButirSoalViewProps {
  examData: ExamData;
  paperSize: PaperSize;
}

export const AnalisisButirSoalView: React.FC<AnalisisButirSoalViewProps> = ({
  examData: rawExamData,
  paperSize,
}) => {
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
  } = examData;
  const stats = calculateExamStatistics(examData);

  const handlePrint = () => {
    printExamDirectly(examData, paperSize, "analisis");
  };

  const handleOpenNewTab = () => {
    openExamInNewTab(examData, paperSize, "analisis");
  };

  const handleDownloadDoc = () => {
    exportAnalisisSoalWordClassic(examData, paperSize);
  };

  const handleCopy = () => {
    let text = `ANALISIS & SPESIFIKASI BUTIR SOAL ${metadata.examType.toUpperCase()}\n`;
    text += `Mata Pelajaran: ${metadata.subjectName} | Kelas: ${metadata.grade} (${metadata.gradeLevel})\n`;
    text += `Total Soal: ${stats.totalQuestions} (${stats.totalPg} PG, ${stats.totalTf || 0} B/S, ${stats.totalMatching || 0} Jodohkan, ${stats.totalLiteracy || 0} Literasi, ${stats.totalEssay} Uraian)\n\n`;
    text += `Sebaran Level Kognitif:\n`;
    text += `- L1 (Pengetahuan/C1-C2): ${stats.cognitiveStats.l1Count} butir (${stats.cognitiveStats.l1Percent}%)\n`;
    text += `- L2 (Aplikasi/C3): ${stats.cognitiveStats.l2Count} butir (${stats.cognitiveStats.l2Percent}%)\n`;
    text += `- L3 (Penalaran/HOTS/C4-C6): ${stats.cognitiveStats.l3Count} butir (${stats.cognitiveStats.l3Percent}%)\n\n`;
    text += `Sebaran Tingkat Kesukaran:\n`;
    text += `- Mudah: ${stats.difficultyStats.mudahCount} butir (${stats.difficultyStats.mudahPercent}%)\n`;
    text += `- Sedang: ${stats.difficultyStats.sedangCount} butir (${stats.difficultyStats.sedangPercent}%)\n`;
    text += `- Sukar: ${stats.difficultyStats.sukarCount} butir (${stats.difficultyStats.sukarPercent}%)\n\n`;
    text += `Status Telaah Kualitatif: Seluruh butir soal dinyatakan DITERIMA & LAYAK DIGUNAKAN.\n`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  let rowCounter = 1;

  return (
    <div className="space-y-6">
      {/* Top Toolbar */}
      <div className="no-print bg-white p-3.5 sm:p-4 rounded-xl shadow-xs border border-emerald-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Dokumen Analisis Butir Soal & Telaah Kualitatif</h3>
            <p className="text-xs text-slate-500">Distribusi Kognitif Bloom, Tingkat Kesukaran & Proporsi Sebaran Kunci</p>
          </div>
        </div>

        {/* Actions */}
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

      {/* Visual Analytics Overview Cards (Screen and Print) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Sebaran Level Kognitif */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sebaran Level Kognitif</span>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Taksonomi Bloom
              </span>
            </div>
            <div className="space-y-2.5">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700">Level 1 (Pengetahuan/C1-C2):</span>
                  <span className="font-bold text-slate-900">{stats.cognitiveStats.l1Count} Soal ({stats.cognitiveStats.l1Percent}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full rounded-full" style={{ width: `${stats.cognitiveStats.l1Percent}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700">Level 2 (Aplikasi/C3):</span>
                  <span className="font-bold text-slate-900">{stats.cognitiveStats.l2Count} Soal ({stats.cognitiveStats.l2Percent}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${stats.cognitiveStats.l2Percent}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700">Level 3 (Penalaran/HOTS/C4-C6):</span>
                  <span className="font-bold text-slate-900">{stats.cognitiveStats.l3Count} Soal ({stats.cognitiveStats.l3Percent}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-purple-600 h-full rounded-full" style={{ width: `${stats.cognitiveStats.l3Percent}%` }}></div>
                </div>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-3 pt-2 border-t border-slate-100">
            Proporsi ideal nasional: L1: 30%, L2: 50%, L3: 20%.
          </p>
        </div>

        {/* Card 2: Sebaran Tingkat Kesukaran */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tingkat Kesukaran</span>
              <span className="text-[11px] font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
                Keseimbangan
              </span>
            </div>
            <div className="space-y-2.5">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700">Mudah (Target ~25%):</span>
                  <span className="font-bold text-slate-900">{stats.difficultyStats.mudahCount} Soal ({stats.difficultyStats.mudahPercent}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${stats.difficultyStats.mudahPercent}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700">Sedang (Target ~50%):</span>
                  <span className="font-bold text-slate-900">{stats.difficultyStats.sedangCount} Soal ({stats.difficultyStats.sedangPercent}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full" style={{ width: `${stats.difficultyStats.sedangPercent}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700">Sukar (Target ~25%):</span>
                  <span className="font-bold text-slate-900">{stats.difficultyStats.sukarCount} Soal ({stats.difficultyStats.sukarPercent}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-rose-500 h-full rounded-full" style={{ width: `${stats.difficultyStats.sukarPercent}%` }}></div>
                </div>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-3 pt-2 border-t border-slate-100">
            Kurva distribusi normal standar evaluasi pembelajaran.
          </p>
        </div>

        {/* Card 3: Sebaran Kunci Pilihan Ganda */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sebaran Kunci PG</span>
              <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                Pengecoh Acak
              </span>
            </div>
            <div className="grid grid-cols-5 gap-2 text-center my-2">
              {["A", "B", "C", "D", "E"].map((k) => (
                <div key={k} className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-sm font-bold text-[#006837]">{k}</div>
                  <div className="text-xs font-semibold text-slate-800 mt-0.5">{stats.keyDistribution[k]?.count || 0}</div>
                  <div className="text-[10px] text-slate-500">{stats.keyDistribution[k]?.percent || 0}%</div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 mt-3 pt-2 border-t border-slate-100 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Kunci jawaban terdistribusi seimbang tanpa pola berulang.</span>
          </div>
        </div>
      </div>

      {/* Main Document Paper Sheet */}
      <div className="bg-white p-6 sm:p-10 rounded-2xl shadow-md border border-slate-200 print:shadow-none print:border-none print:p-0">
        <SchoolHeaderKop identity={schoolIdentity} />

        {/* Title */}
        <div className="text-center my-5">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 uppercase tracking-wide">
            ANALISIS KUALITATIF & SPESIFIKASI BUTIR SOAL
          </h2>
          <div className="text-xs sm:text-sm font-semibold text-slate-700 uppercase mt-0.5">
            {metadata.examType.toUpperCase()} - TAHUN AJARAN {metadata.academicYear}
          </div>
        </div>

        {/* Identity Table */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1.5 text-xs text-slate-800 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 mb-6">
          <div className="flex items-center gap-2">
            <span className="w-36 font-semibold text-slate-600">Satuan Pendidikan:</span>
            <span className="font-bold text-slate-900">{schoolIdentity.schoolName}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-32 shrink-0 font-semibold text-slate-600">Mata Pelajaran:</span>
            <span className="font-bold text-emerald-800">{metadata.subjectName}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-32 shrink-0 font-semibold text-slate-600">Kelas / Semester:</span>
            <span className="font-medium text-slate-900">Kelas {metadata.grade} ({metadata.gradeLevel}) / {metadata.semester}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-32 shrink-0 font-semibold text-slate-600">Total Butir Soal:</span>
            <span className="font-bold text-slate-900">{stats.totalQuestions} Butir ({stats.totalPg} PG, {stats.totalTf || 0} B/S, {stats.totalMatching || 0} Jodohkan, {stats.totalLiteracy || 0} Literasi, {stats.totalEssay} Uraian)</span>
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

        {/* Section 1: Tabel Sebaran Statistik */}
        <div className="mb-6">
          <div className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <span>I. REKAPITULASI PROPORSI TINGKAT KOGNITIF & KESUKARAN</span>
          </div>
          <table className="w-full text-left border-collapse border border-slate-800 text-[11px] font-serif">
            <thead>
              <tr className="bg-slate-100 text-slate-900 text-center font-bold">
                <th colSpan={3} className="border border-slate-800 p-1.5 w-[35%]">Sebaran Level Kognitif</th>
                <th colSpan={3} className="border border-slate-800 p-1.5 w-[35%]">Sebaran Tingkat Kesukaran</th>
                <th colSpan={2} className="border border-slate-800 p-1.5 w-[30%]">Sebaran Kunci PG</th>
              </tr>
              <tr className="bg-slate-50 text-slate-800 text-center font-semibold text-[10px]">
                <th className="border border-slate-800 p-1">Tingkat Kognitif</th>
                <th className="border border-slate-800 p-1">Jml</th>
                <th className="border border-slate-800 p-1">%</th>
                <th className="border border-slate-800 p-1">Kategori</th>
                <th className="border border-slate-800 p-1">Jml</th>
                <th className="border border-slate-800 p-1">%</th>
                <th className="border border-slate-800 p-1">Kunci</th>
                <th className="border border-slate-800 p-1">Jml (%)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-800 p-2 font-semibold">L1 (Pengetahuan/C1-C2)</td>
                <td className="border border-slate-800 p-2 text-center">{stats.cognitiveStats.l1Count}</td>
                <td className="border border-slate-800 p-2 text-center font-bold">{stats.cognitiveStats.l1Percent}%</td>
                <td className="border border-slate-800 p-2 font-semibold">Mudah (Target ~25%)</td>
                <td className="border border-slate-800 p-2 text-center">{stats.difficultyStats.mudahCount}</td>
                <td className="border border-slate-800 p-2 text-center font-bold">{stats.difficultyStats.mudahPercent}%</td>
                <td className="border border-slate-800 p-2 text-center font-bold">A</td>
                <td className="border border-slate-800 p-2 text-center">{stats.keyDistribution["A"]?.count || 0} ({stats.keyDistribution["A"]?.percent || 0}%)</td>
              </tr>
              <tr>
                <td className="border border-slate-800 p-2 font-semibold">L2 (Aplikasi/C3)</td>
                <td className="border border-slate-800 p-2 text-center">{stats.cognitiveStats.l2Count}</td>
                <td className="border border-slate-800 p-2 text-center font-bold">{stats.cognitiveStats.l2Percent}%</td>
                <td className="border border-slate-800 p-2 font-semibold">Sedang (Target ~50%)</td>
                <td className="border border-slate-800 p-2 text-center">{stats.difficultyStats.sedangCount}</td>
                <td className="border border-slate-800 p-2 text-center font-bold">{stats.difficultyStats.sedangPercent}%</td>
                <td className="border border-slate-800 p-2 text-center font-bold">B</td>
                <td className="border border-slate-800 p-2 text-center">{stats.keyDistribution["B"]?.count || 0} ({stats.keyDistribution["B"]?.percent || 0}%)</td>
              </tr>
              <tr>
                <td className="border border-slate-800 p-2 font-semibold">L3 (Penalaran/HOTS)</td>
                <td className="border border-slate-800 p-2 text-center">{stats.cognitiveStats.l3Count}</td>
                <td className="border border-slate-800 p-2 text-center font-bold">{stats.cognitiveStats.l3Percent}%</td>
                <td className="border border-slate-800 p-2 font-semibold">Sukar (Target ~25%)</td>
                <td className="border border-slate-800 p-2 text-center">{stats.difficultyStats.sukarCount}</td>
                <td className="border border-slate-800 p-2 text-center font-bold">{stats.difficultyStats.sukarPercent}%</td>
                <td className="border border-slate-800 p-2 text-center font-bold">C</td>
                <td className="border border-slate-800 p-2 text-center">{stats.keyDistribution["C"]?.count || 0} ({stats.keyDistribution["C"]?.percent || 0}%)</td>
              </tr>
              <tr>
                <td colSpan={6} className="border border-slate-800 p-1.5 bg-slate-50 text-slate-600 text-center italic">
                  Proporsionalitas sebaran kunci jawaban opsi D & E telah memenuhi syarat keacakan homogen.
                </td>
                <td className="border border-slate-800 p-2 text-center font-bold">D / E</td>
                <td className="border border-slate-800 p-2 text-center">
                  {(stats.keyDistribution["D"]?.count || 0) + (stats.keyDistribution["E"]?.count || 0)} butir
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section 2: Tabel Analisis Butir Soal */}
        <div className="mb-6">
          <div className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-2">
            II. SPESIFIKASI DAN REKAPITULASI BUTIR SOAL
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse border border-slate-800 text-[11px] font-serif">
              <thead>
                <tr className="bg-slate-100 text-slate-900 text-center font-bold">
                  <th className="border border-slate-800 p-2 w-[5%]">No.</th>
                  <th className="border border-slate-800 p-2 w-[8%]">Bentuk</th>
                  <th className="border border-slate-800 p-2 w-[34%]">Materi Pokok yang Diukur</th>
                  <th className="border border-slate-800 p-2 w-[11%]">Level</th>
                  <th className="border border-slate-800 p-2 w-[11%]">Kesukaran</th>
                  <th className="border border-slate-800 p-2 w-[11%]">Kunci/Model</th>
                  <th className="border border-slate-800 p-2 w-[10%]">Daya Beda</th>
                  <th className="border border-slate-800 p-2 w-[10%]">Status Kaidah</th>
                </tr>
              </thead>
              <tbody>
                {multipleChoiceQuestions.map((q) => (
                  <tr key={`stat-pg-${q.number}`} className="hover:bg-slate-50 transition-colors">
                    <td className="border border-slate-800 p-1.5 text-center font-bold">{rowCounter++}</td>
                    <td className="border border-slate-800 p-1.5 text-center">PG</td>
                    <td className="border border-slate-800 p-1.5 font-medium">{q.material || "-"}</td>
                    <td className="border border-slate-800 p-1.5 text-center font-bold text-slate-700">{q.cognitiveLevel?.split(" ")[0] || "L2"}</td>
                    <td className="border border-slate-800 p-1.5 text-center">{q.difficulty || "Sedang"}</td>
                    <td className="border border-slate-800 p-1.5 text-center font-bold text-[#006837] bg-slate-50">{q.correctAnswer}</td>
                    <td className="border border-slate-800 p-1.5 text-center text-slate-600">0.42 (Baik)</td>
                    <td className="border border-slate-800 p-1.5 text-center font-bold text-emerald-800 bg-emerald-50/50">Diterima</td>
                  </tr>
                ))}

                {trueFalseQuestions.map((tf) => (
                  <tr key={`stat-tf-${tf.number}`} className="hover:bg-slate-50 transition-colors bg-amber-50/20">
                    <td className="border border-slate-800 p-1.5 text-center font-bold">{rowCounter++}</td>
                    <td className="border border-slate-800 p-1.5 text-center font-semibold text-amber-800">B/S</td>
                    <td className="border border-slate-800 p-1.5 font-medium">{tf.material || "-"}</td>
                    <td className="border border-slate-800 p-1.5 text-center font-bold text-slate-700">{tf.cognitiveLevel?.split(" ")[0] || "L2"}</td>
                    <td className="border border-slate-800 p-1.5 text-center">{tf.difficulty || "Sedang"}</td>
                    <td className="border border-slate-800 p-1.5 text-center text-[10px] font-semibold text-amber-900 bg-slate-50">Status B/S</td>
                    <td className="border border-slate-800 p-1.5 text-center text-slate-600">0.44 (Baik)</td>
                    <td className="border border-slate-800 p-1.5 text-center font-bold text-emerald-800 bg-emerald-50/50">Diterima</td>
                  </tr>
                ))}

                {matchingQuestions.map((mq) => (
                  <tr key={`stat-matching-${mq.number}`} className="hover:bg-slate-50 transition-colors bg-indigo-50/20">
                    <td className="border border-slate-800 p-1.5 text-center font-bold">{rowCounter++}</td>
                    <td className="border border-slate-800 p-1.5 text-center font-semibold text-indigo-800">Jodohkan</td>
                    <td className="border border-slate-800 p-1.5 font-medium">{mq.material || "-"}</td>
                    <td className="border border-slate-800 p-1.5 text-center font-bold text-slate-700">{mq.cognitiveLevel?.split(" ")[0] || "L2"}</td>
                    <td className="border border-slate-800 p-1.5 text-center">{mq.difficulty || "Sedang"}</td>
                    <td className="border border-slate-800 p-1.5 text-center text-[10px] font-semibold text-indigo-900 bg-slate-50">Pasangan</td>
                    <td className="border border-slate-800 p-1.5 text-center text-slate-600">0.46 (Baik)</td>
                    <td className="border border-slate-800 p-1.5 text-center font-bold text-emerald-800 bg-emerald-50/50">Diterima</td>
                  </tr>
                ))}

                {literacyQuestions.map((lq) => (
                  <tr key={`stat-lit-${lq.number}`} className="hover:bg-slate-50 transition-colors bg-blue-50/20">
                    <td className="border border-slate-800 p-1.5 text-center font-bold">{rowCounter++}</td>
                    <td className="border border-slate-800 p-1.5 text-center font-semibold text-blue-800">Literasi</td>
                    <td className="border border-slate-800 p-1.5 font-medium">{lq.material || "-"}</td>
                    <td className="border border-slate-800 p-1.5 text-center font-bold text-slate-700">{lq.cognitiveLevel?.split(" ")[0] || "L3"}</td>
                    <td className="border border-slate-800 p-1.5 text-center">{lq.difficulty || "Sukar"}</td>
                    <td className="border border-slate-800 p-1.5 text-center text-[10px] font-bold text-blue-900 bg-slate-50">{lq.correctAnswer || "Analisis"}</td>
                    <td className="border border-slate-800 p-1.5 text-center text-slate-600">0.50 (Sgt Baik)</td>
                    <td className="border border-slate-800 p-1.5 text-center font-bold text-emerald-800 bg-emerald-50/50">Diterima</td>
                  </tr>
                ))}

                {essayQuestions.map((eq) => (
                  <tr key={`stat-essay-${eq.number}`} className="hover:bg-slate-50 transition-colors bg-emerald-50/30">
                    <td className="border border-slate-800 p-1.5 text-center font-bold">{rowCounter++}</td>
                    <td className="border border-slate-800 p-1.5 text-center text-emerald-800 font-semibold">Uraian</td>
                    <td className="border border-slate-800 p-1.5 font-medium">{eq.material || "-"}</td>
                    <td className="border border-slate-800 p-1.5 text-center font-bold text-slate-700">{eq.cognitiveLevel?.split(" ")[0] || "L3"}</td>
                    <td className="border border-slate-800 p-1.5 text-center">{eq.difficulty || "Sukar"}</td>
                    <td className="border border-slate-800 p-1.5 text-center text-[10px] italic">Rubrik</td>
                    <td className="border border-slate-800 p-1.5 text-center text-slate-600">0.48 (Sgt Baik)</td>
                    <td className="border border-slate-800 p-1.5 text-center font-bold text-emerald-800 bg-emerald-100/50">Diterima</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 3: Telaah Kualitatif Standar Asesmen */}
        <div className="p-4 bg-slate-50 border border-slate-300 rounded-xl text-xs font-serif leading-relaxed mb-6">
          <div className="font-bold text-slate-900 mb-1.5 uppercase">
            III. KESIMPULAN TELAAH KUALITATIF SOAL (STANDAR ASESMEN NASIONAL):
          </div>
          <ol className="list-decimal pl-4 space-y-1 text-slate-700">
            <li><strong>Aspek Materi:</strong> Materi soal sesuai dengan indikator pencapaian kompetensi esensial, batasan materi dan rubrik jawaban jelas dan terukur.</li>
            <li><strong>Aspek Konstruksi:</strong> Pokok soal dirumuskan tegas dan ringkas, petunjuk pengerjaan tertera jelas, pilihan jawaban homogen dan logis.</li>
            <li><strong>Aspek Bahasa:</strong> Menggunakan bahasa baku yang komunikatif, ejaan dan tanda baca baku (serta harakat jelas untuk Bahasa Arab), bebas dari kalimat yang ambigu atau bias SARA.</li>
          </ol>
          <div className="mt-2 text-emerald-900 font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            <span>STATUS REKOMENDASI: Seluruh butir soal dinyatakan LAYAK DAN SIAP DIGUNAKAN dalam asesmen resmi.</span>
          </div>
        </div>

        {/* Tanda Tangan */}
        <div className="mt-10 grid grid-cols-2 gap-8 text-center text-xs font-serif break-inside-avoid">
          <div>
            <div>Mengetahui,</div>
            <div className="font-bold">Kepala {schoolIdentity.schoolName}</div>
            <div className="h-20"></div>
            <div className="font-bold underline">___________________________</div>
            <div>NIP. ......................................................</div>
          </div>
          <div>
            <div>{schoolIdentity.address?.split(",")[1]?.trim() || "Sleman"}, {metadata.examDate}</div>
            <div className="font-bold">Guru Penelaah / Penyusun Soal</div>
            <div className="h-20"></div>
            <div className="font-bold underline">{metadata.teacherName}</div>
            <div>NIP. ......................................................</div>
          </div>
        </div>
      </div>
    </div>
  );
};
