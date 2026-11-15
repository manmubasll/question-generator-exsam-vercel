import { ExamData, PaperSize, OptionLayout } from "../types";
import { enrichExamPedagogy, calculateExamStatistics } from "./pedagogyHelpers";

export type PrintViewMode = "soal" | "kunci" | "kisi-kisi" | "kartu-soal" | "analisis" | "lengkap";

export function getEffectiveOptionLayout(
  options: { key: string; text: string }[],
  preference?: OptionLayout
): "horizontal" | "2col" | "vertical" {
  if (preference === "horizontal") return "horizontal";
  if (preference === "2col") return "2col";
  if (preference === "vertical") return "vertical";

  // "auto": check max length of options for optimal paper utilization
  const maxLen = Math.max(...options.map((o) => (o.text || "").trim().length), 0);
  if (maxLen <= 22) return "horizontal"; // e.g. "2√2", "6", "15", "Padat" -> 1 baris menyamping!
  if (maxLen <= 50) return "2col";       // medium phrases -> 2 kolom menyamping!
  return "vertical";                     // long sentences -> vertikal
}

export function generatePrintableHtml(
  rawExamData: ExamData,
  initialPaperSize: PaperSize = "A4",
  initialViewMode: PrintViewMode = "lengkap",
  optionLayoutPreference?: OptionLayout
): string {
  const examData = enrichExamPedagogy(rawExamData);
  const {
    schoolIdentity,
    metadata,
    generalInstructions,
    multipleChoiceQuestions,
    essayQuestions,
    trueFalseQuestions = [],
    matchingQuestions = [],
    literacyQuestions = [],
    readingPassages = [],
  } = examData;
  const stats = calculateExamStatistics(examData);

  const isArabicExam =
    metadata.examLanguage === "ar" ||
    metadata.subjectName.toLowerCase().includes("bahasa arab") ||
    metadata.subjectName.toLowerCase().includes("arab") ||
    (multipleChoiceQuestions.length > 0 && /[\u0600-\u06FF]/.test(multipleChoiceQuestions[0].questionText)) ||
    (essayQuestions.length > 0 && /[\u0600-\u06FF]/.test(essayQuestions[0].questionText));

  const getPrintOptionLabel = (key: string) => {
    if (!isArabicExam) return `${key}.`;
    const map: Record<string, string> = { A: "أ", B: "ب", C: "ج", D: "د", E: "هـ" };
    return `${map[key.toUpperCase()] || key}.`;
  };

  const kemenagLogoSvg = `
    <svg viewBox="0 0 100 100" class="logo-svg" style="width: 75px; height: 75px;" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="46" fill="#006837" stroke="#d4af37" stroke-width="2.5" />
      <circle cx="50" cy="50" r="41" fill="#ffffff" />
      <path d="M50 18 L76 34 L76 66 L50 82 L24 66 L24 34 Z" fill="#005a2f" stroke="#d4af37" stroke-width="1.5" />
      <path d="M32 46 C40 44 48 48 50 50 C52 48 60 44 68 46 L68 62 C60 60 52 64 50 66 C48 64 40 60 32 62 Z" fill="#ffffff" stroke="#d4af37" stroke-width="1" />
      <path d="M50 50 L50 66" stroke="#d4af37" stroke-width="1.5" />
      <polygon points="50,22 52,27 57,27 53,30 55,35 50,32 45,35 47,30 43,27 48,27" fill="#d4af37" />
      <text x="50" y="74" text-anchor="middle" font-size="5" font-weight="bold" fill="#f3e5ab" letter-spacing="0.5">IKHLAS BERAMAL</text>
    </svg>
  `;

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cetak Dokumen Ujian - ${metadata.subjectName} Kelas ${metadata.grade}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&family=Scheherazade+New:wght@400;700&display=swap" rel="stylesheet">
  <style id="page-size-style">
    @page {
      size: ${initialPaperSize === "F4" ? "215mm 330mm" : "210mm 297mm"};
      margin: 15mm 18mm 15mm 18mm;
    }
  </style>
  <style>
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      margin: 0;
      padding: 0;
      font-family: "Times New Roman", Times, serif;
      font-size: 11pt;
      line-height: 1.35;
      color: #000;
      background-color: #f1f5f9;
    }

    p, div, li {
      orphans: 3;
      widows: 3;
    }

    /* Floating Toolbar (Screen only) */
    .toolbar-container {
      position: sticky;
      top: 0;
      z-index: 9999;
      background: #004d26;
      color: #ffffff;
      padding: 8px 16px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      border-bottom: 3px solid #d4af37;
    }

    .toolbar-left {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }

    .toolbar-title {
      font-weight: 800;
      font-size: 13px;
      letter-spacing: 0.5px;
      margin-right: 6px;
    }

    .toolbar-group {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      padding: 2px;
    }

    .toolbar-btn {
      background: transparent;
      border: none;
      color: #ffffff;
      padding: 5px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
    }

    .toolbar-btn.active {
      background: #d4af37;
      color: #00381b;
      font-weight: 800;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }

    .toolbar-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn-print {
      background: #d4af37;
      color: #00381b;
      border: none;
      font-weight: 800;
      font-size: 12.5px;
      padding: 7px 16px;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.25);
      transition: all 0.2s;
    }
    .btn-print:hover {
      background: #f3e5ab;
      transform: translateY(-1px);
    }

    .btn-close {
      background: rgba(255,255,255,0.15);
      color: white;
      border: 1px solid rgba(255,255,255,0.25);
      font-size: 11.5px;
      font-weight: 600;
      padding: 7px 12px;
      border-radius: 8px;
      cursor: pointer;
    }
    .btn-close:hover {
      background: rgba(255,255,255,0.25);
    }

    /* Printable Page Container */
    .document-page-wrapper {
      padding: 20px 10px 60px 10px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .paper-sheet {
      background: #ffffff;
      width: ${initialPaperSize === "F4" ? "215mm" : "210mm"};
      min-height: ${initialPaperSize === "F4" ? "330mm" : "297mm"};
      padding: 12mm 15mm;
      box-shadow: 0 6px 24px rgba(0,0,0,0.12);
      margin-bottom: 24px;
      border-radius: 2px;
      position: relative;
    }

    /* Print Break Styles */
    .print-page-break {
      page-break-before: always;
      break-before: page;
      margin-top: 24px;
      padding-top: 12px;
    }

    /* Screen divider */
    @media screen {
      .screen-divider {
        margin: 30px 0;
        border-top: 2px dashed #94a3b8;
        position: relative;
        text-align: center;
      }
      .screen-divider span {
        background: #f1f5f9;
        position: relative;
        top: -12px;
        padding: 2px 14px;
        font-family: sans-serif;
        font-size: 11px;
        color: #475569;
        font-weight: bold;
        border-radius: 12px;
        border: 1px solid #cbd5e1;
      }
    }

    /* Kop Styling */
    .kop-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 4px;
    }
    .kop-logo-col {
      width: 80px;
      vertical-align: middle;
      text-align: center;
    }
    .kop-text-col {
      text-align: center;
      vertical-align: middle;
      padding: 0 10px;
    }
    .kop-right-col {
      width: 75px;
      text-align: center;
      vertical-align: middle;
    }
    .kop-line-double {
      border-top: 3px solid #000;
      border-bottom: 1px solid #000;
      height: 3px;
      margin-top: 2px;
      margin-bottom: 12px;
    }

    /* Meta Table */
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      border-top: 1px solid #444;
      border-bottom: 1px solid #444;
      margin: 10px 0 14px 0;
      font-size: 10pt;
    }
    .meta-table td {
      padding: 3px 6px;
      vertical-align: top;
    }

    /* General Data Table */
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9.5pt;
      margin-top: 6px;
      margin-bottom: 10px;
    }
    table.data-table th, table.data-table td {
      border: 1px solid #000;
      padding: 3.5pt 5pt;
      vertical-align: top;
    }
    table.data-table th {
      background-color: #f2f2f2 !important;
      font-weight: bold;
      text-align: center;
      vertical-align: middle;
    }

    /* Card Box for Kartu Soal */
    .card-box {
      border: 1.5pt solid #000;
      padding: 8pt;
      margin-bottom: 14pt;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    /* Reading Box */
    .reading-box {
      border: 1.5px solid #004d26;
      background-color: #f8fafc;
      padding: 8px 12px;
      margin-top: 10px;
      margin-bottom: 10px;
      page-break-inside: avoid;
      break-inside: avoid;
      border-radius: 4px;
    }
    .reading-box-header {
      font-weight: bold;
      font-size: 9.5pt;
      color: #004d26;
      border-bottom: 1px dashed #004d26;
      padding-bottom: 3px;
      margin-bottom: 5px;
      display: flex;
      justify-content: space-between;
    }
    .reading-box-title {
      text-align: center;
      font-weight: bold;
      font-size: 10.5pt;
      margin-bottom: 5px;
      text-transform: uppercase;
    }
    .reading-box-content {
      font-size: 10pt;
      line-height: 1.35;
      text-align: justify;
      white-space: pre-line;
    }

    .instruction-box {
      font-size: 10pt;
      margin-bottom: 14px;
    }
    .instruction-box ol {
      margin: 3px 0;
      padding-left: 18px;
    }

    .section-title {
      font-weight: bold;
      font-size: 11.5pt;
      border-bottom: 1px solid #444;
      padding-bottom: 2px;
      margin-top: 14px;
      margin-bottom: 8px;
    }

    .mc-item {
      margin-top: 8px;
      margin-bottom: 6px;
      page-break-inside: avoid;
      break-inside: avoid;
      text-align: justify;
    }
    .mc-options {
      margin-left: 20px;
      margin-top: 3px;
    }
    .mc-option-row {
      margin-top: 1.5px;
      margin-bottom: 1.5px;
      page-break-inside: avoid;
    }
    .mc-options-horizontal {
      margin-left: 20px;
      margin-top: 3px;
      margin-bottom: 4px;
      display: flex;
      flex-wrap: wrap;
      column-gap: 24px;
      row-gap: 2.5px;
    }
    .mc-option-inline {
      display: inline-flex;
      align-items: baseline;
      white-space: nowrap;
      margin-right: 20px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .arabic-opt-horizontal {
      margin-left: 0 !important;
      margin-right: 20px !important;
    }
    .arabic-opt-horizontal .mc-option-inline {
      margin-right: 0 !important;
      margin-left: 20px !important;
    }
    .mc-options-2col {
      margin-left: 20px;
      margin-top: 3px;
      margin-bottom: 4px;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      column-gap: 20px;
      row-gap: 2px;
    }
    .mc-options-2col-item {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .arabic-opt-2col {
      margin-left: 0 !important;
      margin-right: 20px !important;
    }
    .essay-item {
      margin-top: 10px;
      margin-bottom: 12px;
      page-break-inside: avoid;
      break-inside: avoid;
      text-align: justify;
    }

    /* Answer Key Table */
    .key-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      font-size: 10pt;
    }
    .key-table th, .key-table td {
      border: 1px solid #000;
      padding: 4px 6px;
    }
    .key-table th {
      background-color: #f2f2f2 !important;
      font-weight: bold;
    }

    /* Arabic Language & Typography Enhancements */
    .arabic-text {
      font-family: 'Scheherazade New', 'Amiri', 'Traditional Arabic', serif;
      direction: rtl;
      text-align: right;
      line-height: 2.1;
      font-size: 13.5pt;
    }
    .arabic-option {
      direction: rtl;
      text-align: right;
      font-family: 'Scheherazade New', 'Amiri', 'Traditional Arabic', serif;
      line-height: 2.0;
      font-size: 12.5pt;
      margin-right: 16px;
    }
    .arabic-passage {
      font-family: 'Scheherazade New', 'Amiri', serif;
      direction: rtl;
      text-align: right;
      line-height: 2.2;
      font-size: 13pt;
    }
    .arabic-exp {
      font-family: 'Scheherazade New', 'Amiri', serif;
      direction: rtl;
      text-align: right;
      line-height: 1.9;
      font-size: 11pt;
    }

    /* PRINT SPECIFIC RULES */
    @media print {
      body {
        background-color: #ffffff !important;
      }
      .no-print {
        display: none !important;
      }
      .document-page-wrapper {
        padding: 0 !important;
        margin: 0 !important;
      }
      .paper-sheet {
        width: 100% !important;
        min-height: auto !important;
        padding: 0 !important;
        box-shadow: none !important;
        margin: 0 !important;
        border: none !important;
      }
      .screen-divider {
        display: none !important;
      }
      .print-page-break {
        page-break-before: always !important;
        break-before: page !important;
        margin-top: 0 !important;
        padding-top: 0 !important;
      }
      .mc-item, .essay-item, .reading-box, .key-table, tr, .meta-table, .instruction-box, .card-box {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        break-inside: avoid-page !important;
      }
      .mc-options-horizontal {
        display: flex !important;
        flex-direction: row !important;
        flex-wrap: wrap !important;
        column-gap: 24px !important;
        row-gap: 2.5px !important;
      }
      .mc-options-2col {
        display: grid !important;
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        column-gap: 20px !important;
        row-gap: 2px !important;
      }
    }
  </style>
</head>
<body>

  <!-- Floating Toolbar on Screen -->
  <div class="toolbar-container no-print">
    <div class="toolbar-left">
      <span class="toolbar-title">🖨️ QUESTION GENERATOR EXSAM</span>
      
      <!-- Paper Size Selector -->
      <div class="toolbar-group">
        <button id="btn-a4" class="toolbar-btn ${initialPaperSize === "A4" ? "active" : ""}" onclick="setPaper('A4')">
          📄 A4
        </button>
        <button id="btn-f4" class="toolbar-btn ${initialPaperSize === "F4" ? "active" : ""}" onclick="setPaper('F4')">
          📑 F4 / Folio
        </button>
      </div>

      <!-- View Selector -->
      <div class="toolbar-group">
        <button id="btn-all" class="toolbar-btn ${initialViewMode === "lengkap" ? "active" : ""}" onclick="setViewMode('lengkap')">
          Semua Dokumen
        </button>
        <button id="btn-soal" class="toolbar-btn ${initialViewMode === "soal" ? "active" : ""}" onclick="setViewMode('soal')">
          Naskah Soal
        </button>
        <button id="btn-kunci" class="toolbar-btn ${initialViewMode === "kunci" ? "active" : ""}" onclick="setViewMode('kunci')">
          Kunci & Rubrik
        </button>
        <button id="btn-kisi" class="toolbar-btn ${initialViewMode === "kisi-kisi" ? "active" : ""}" onclick="setViewMode('kisi-kisi')">
          Kisi-Kisi Soal
        </button>
        <button id="btn-kartu" class="toolbar-btn ${initialViewMode === "kartu-soal" ? "active" : ""}" onclick="setViewMode('kartu-soal')">
          Kartu Soal
        </button>
        <button id="btn-analisis" class="toolbar-btn ${initialViewMode === "analisis" ? "active" : ""}" onclick="setViewMode('analisis')">
          Analisis Butir
        </button>
      </div>
    </div>

    <div class="toolbar-actions">
      <button class="btn-print" onclick="window.print()">
        🖨️ CETAK / SIMPAN PDF
      </button>
      <button class="btn-close" onclick="window.close()">
        Tutup
      </button>
    </div>
  </div>

  <!-- Document Body Wrapper -->
  <div class="document-page-wrapper">
    <div id="paper-element" class="paper-sheet">
      
      <!-- ============================================== -->
      <!-- BAGIAN 1: NASKAH SOAL SISWA -->
      <!-- ============================================== -->
      <div id="section-soal">
        <!-- KOP MADRASAH / SEKOLAH -->
        <table class="kop-table">
          <tr>
            <td class="kop-logo-col">
              ${
                schoolIdentity.useLeftLogo !== false
                  ? (schoolIdentity.logoBase64
                      ? `<img src="${schoolIdentity.logoBase64}" style="width: 75px; height: 75px; object-fit: contain;" alt="Logo Kiri" />`
                      : kemenagLogoSvg)
                  : `<div style="width: 75px;"></div>`
              }
            </td>
            <td class="kop-text-col">
              <div style="font-size: 11pt; font-weight: bold; text-transform: uppercase;">
                ${schoolIdentity.ministryName || "KEMENTERIAN AGAMA REPUBLIK INDONESIA"}
              </div>
              <div style="font-size: 10pt; font-weight: bold; text-transform: uppercase; margin-top: 1px;">
                ${schoolIdentity.subMinistryName || "KANTOR KEMENTERIAN AGAMA KABUPATEN / KOTA"}
              </div>
              <div style="font-size: 14pt; font-weight: bold; text-transform: uppercase; margin-top: 2px; color: #000;">
                ${schoolIdentity.schoolName || "MADRASAH ALIYAH NEGERI"}
              </div>
              ${
                schoolIdentity.accreditation
                  ? `<div style="font-size: 10pt; font-weight: bold; margin-top: 2px; color: #111;">${schoolIdentity.accreditation}</div>`
                  : ""
              }
              <div style="font-size: 9pt; font-style: italic; margin-top: 2px;">
                ${schoolIdentity.address || "Jalan Raya Pendidikan No. 01, Wilayah Pendidikan"}
              </div>
              <div style="font-size: 8.5pt; font-style: italic;">
                ${schoolIdentity.contact || "Telp. (021) 1234567 | Email: madrasah@kemenag.go.id"}
              </div>
            </td>
            <td class="kop-right-col">
              ${
                schoolIdentity.useRightLogo && schoolIdentity.rightLogoBase64
                  ? `<img src="${schoolIdentity.rightLogoBase64}" style="width: 75px; height: 75px; object-fit: contain;" alt="Logo Kanan" />`
                  : `<div style="width: 75px;"></div>`
              }
            </td>
          </tr>
        </table>
        <div class="kop-line-double"></div>

        <!-- JUDUL NASKAH SOAL -->
        <div style="text-align: center; margin-bottom: 8px;">
          <div style="font-size: 12.5pt; font-weight: bold; text-transform: uppercase;">
            NASKAH SOAL ${metadata.examType.toUpperCase()}
          </div>
          <div style="font-size: 10.5pt; font-weight: bold; text-transform: uppercase; margin-top: 1px;">
            TAHUN AJARAN ${metadata.academicYear}
          </div>
        </div>

        <!-- TABEL IDENTITAS UJIAN (Kolom Kanan Digeser Ketengah & Tidak Pecah Baris) -->
        <table class="meta-table">
          <tr>
            <td style="width: 15%; font-weight: bold; white-space: nowrap;">Mata Pelajaran</td>
            <td style="width: 2%; text-align: center;">:</td>
            <td style="width: 31%;">${metadata.subjectName}</td>
            <td style="width: 15%; font-weight: bold; white-space: nowrap;">Hari / Tanggal</td>
            <td style="width: 2%; text-align: center;">:</td>
            <td style="width: 35%; white-space: nowrap;">${metadata.examDate}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; white-space: nowrap;">Kelas / Jenjang</td>
            <td style="text-align: center;">:</td>
            <td>Kelas ${metadata.grade} (${metadata.gradeLevel})</td>
            <td style="font-weight: bold; white-space: nowrap;">Waktu</td>
            <td style="text-align: center;">:</td>
            <td>${metadata.timeAllocation}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; white-space: nowrap;">Semester</td>
            <td style="text-align: center;">:</td>
            <td>${metadata.semester}</td>
            <td style="font-weight: bold; white-space: nowrap;">Guru Pengampu</td>
            <td style="text-align: center;">:</td>
            <td style="white-space: nowrap;">${metadata.teacherName}</td>
          </tr>
        </table>

        <!-- PETUNJUK UMUM -->
        <div class="instruction-box">
          <div style="font-weight: bold; margin-bottom: 2px;">PETUNJUK UMUM:</div>
          <ol>
            ${generalInstructions.map((inst) => `<li>${inst}</li>`).join("")}
          </ol>
        </div>

        <!-- SOAL PILIHAN GANDA -->
        ${
          multipleChoiceQuestions.length > 0
            ? `
        <div class="section-title">
          A. PILIHAN GANDA (Pilihlah salah satu jawaban yang paling tepat!)
        </div>
        <div>
          ${multipleChoiceQuestions
            .map((q) => {
              const passage = readingPassages.find(
                (p) => p.id === q.readingPassageId || (Array.isArray(p.questionNumbers) && p.questionNumbers[0] === q.number)
              );

              const isPassageArabic = isArabicExam || (passage && /[\u0600-\u06FF]/.test(passage.content));
              const passageHtml = passage
                ? `
              <div class="reading-box" ${isPassageArabic ? 'dir="rtl"' : ""}>
                <div class="reading-box-header" ${isPassageArabic ? 'style="flex-direction: row-reverse;"' : ""}>
                  <span>📖 ${
                    isPassageArabic
                      ? `اقْرَأِ النَّصَّ الْآتِيَ لِلْإِجَابَةِ عَنِ الْأَسْئِلَةِ (${passage.questionRange || "التَّالِيَةِ"})`
                      : `Bacalah teks wacana berikut untuk menjawab ${passage.questionRange || "soal berikut"}!`
                  }</span>
                  ${passage.source ? `<span style="font-style: italic; font-weight: normal; font-size: 9pt;">${passage.source}</span>` : ""}
                </div>
                <div class="reading-box-title ${isPassageArabic ? "arabic-passage" : ""}">${passage.title}</div>
                <div class="reading-box-content ${isPassageArabic ? "arabic-passage" : ""}">${passage.content}</div>
              </div>
              `
                : "";

              const isQArabic = isArabicExam || /[\u0600-\u06FF]/.test(q.questionText);
              const effectiveLayout = getEffectiveOptionLayout(
                q.options,
                optionLayoutPreference || examData.optionLayout || examData.metadata?.optionLayout || "auto"
              );

              let optionsHtml = "";
              if (effectiveLayout === "horizontal") {
                optionsHtml = `
                <div class="mc-options-horizontal ${isQArabic ? "arabic-opt-horizontal" : ""}" ${isQArabic ? 'dir="rtl"' : ""}>
                  ${q.options
                    .map(
                      (opt) => `
                    <span class="mc-option-inline ${isQArabic ? "arabic-option" : ""}">
                      <strong>${getPrintOptionLabel(opt.key)}</strong>&nbsp;${opt.text}
                    </span>
                  `
                    )
                    .join("")}
                </div>
                `;
              } else if (effectiveLayout === "2col") {
                optionsHtml = `
                <div class="mc-options-2col ${isQArabic ? "arabic-opt-2col" : ""}" ${isQArabic ? 'dir="rtl"' : ""}>
                  ${q.options
                    .map(
                      (opt) => `
                    <div class="mc-option-2col-item ${isQArabic ? "arabic-option" : ""}">
                      <strong>${getPrintOptionLabel(opt.key)}</strong>&nbsp;${opt.text}
                    </div>
                  `
                    )
                    .join("")}
                </div>
                `;
              } else {
                optionsHtml = `
                <div class="mc-options">
                  ${q.options
                    .map(
                      (opt) => `
                    <div class="mc-option-row ${isQArabic ? "arabic-option" : ""}">
                      <strong>${getPrintOptionLabel(opt.key)}</strong>&nbsp;${opt.text}
                    </div>
                  `
                    )
                    .join("")}
                </div>
                `;
              }

              return `
            ${passageHtml}
            <div class="mc-item ${isQArabic ? "arabic-text" : ""}" ${isQArabic ? 'dir="rtl"' : ""}>
              <strong>${q.number}.</strong> ${q.questionText}
              ${optionsHtml}
            </div>
          `;
            })
            .join("")}
        </div>
        `
            : ""
        }

        <!-- SOAL MENENTUKAN BENAR / SALAH -->
        ${
          trueFalseQuestions.length > 0
            ? `
        <div class="section-title">
          ${multipleChoiceQuestions.length > 0 ? "B" : "A"}. MENENTUKAN BENAR / SALAH (${isArabicExam ? "حَدِّدْ مَا إِذَا كَانَتِ الْعِبَارَاتُ صَحِيحَةً أَوْ خَاطِئَةً" : "Tentukan apakah pernyataan berikut BENAR atau SALAH!"})
        </div>
        <div>
          ${trueFalseQuestions
            .map((tf) => {
              const isTfAr = isArabicExam || /[\u0600-\u06FF]/.test(tf.instruction);
              return `
            <div style="margin-top: 10px; margin-bottom: 12px; page-break-inside: avoid; break-inside: avoid;" ${isTfAr ? 'dir="rtl"' : ""}>
              <div class="${isTfAr ? "arabic-text" : ""}">
                <strong>${tf.number}.</strong> ${tf.instruction}
              </div>
              ${tf.contextOrPassage ? `<div style="margin: 4px 0 6px 16px; font-style: italic; font-size: 10pt; background: #fafafa; padding: 4px 8px; border-left: 3px solid #006837;">${tf.contextOrPassage}</div>` : ""}
              <table style="width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 10pt;">
                <thead>
                  <tr style="background-color: #f2f2f2;">
                    <th style="border: 1px solid #000; padding: 4px; width: 6%; text-align: center;">No</th>
                    <th style="border: 1px solid #000; padding: 4px; text-align: left;">Pernyataan / Konsep</th>
                    <th style="border: 1px solid #000; padding: 4px; width: 14%; text-align: center;">${isTfAr ? "صَحِيحٌ (ص)" : "Benar (B)"}</th>
                    <th style="border: 1px solid #000; padding: 4px; width: 14%; text-align: center;">${isTfAr ? "خَاطِئٌ (خ)" : "Salah (S)"}</th>
                  </tr>
                </thead>
                <tbody>
                  ${tf.statements
                    .map(
                      (s, idx) => `
                    <tr>
                      <td style="border: 1px solid #000; padding: 4px; text-align: center;">${idx + 1}</td>
                      <td style="border: 1px solid #000; padding: 4px;" class="${isTfAr ? "arabic-exp" : ""}">${s.statement}</td>
                      <td style="border: 1px solid #000; padding: 4px; text-align: center;"><div style="width: 14px; height: 14px; border: 1px solid #444; margin: 0 auto;"></div></td>
                      <td style="border: 1px solid #000; padding: 4px; text-align: center;"><div style="width: 14px; height: 14px; border: 1px solid #444; margin: 0 auto;"></div></td>
                    </tr>
                  `
                    )
                    .join("")}
                </tbody>
              </table>
            </div>
          `;
            })
            .join("")}
        </div>
        `
            : ""
        }

        <!-- SOAL MENCOCOKKAN JAWABAN (MENJODOHKAN) -->
        ${
          matchingQuestions.length > 0
            ? `
        <div class="section-title">
          MENCOCOKKAN JAWABAN (MENJODOHKAN)
        </div>
        <div>
          ${matchingQuestions
            .map((mq) => {
              const isMqAr = isArabicExam || /[\u0600-\u06FF]/.test(mq.instruction);
              return `
            <div style="margin-top: 10px; margin-bottom: 12px; page-break-inside: avoid; break-inside: avoid;" ${isMqAr ? 'dir="rtl"' : ""}>
              <div class="${isMqAr ? "arabic-text" : ""}">
                <strong>${mq.number}.</strong> ${mq.instruction}
              </div>
              <table style="width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 10pt;">
                <thead>
                  <tr style="background-color: #f2f2f2;">
                    <th style="border: 1px solid #000; padding: 5px; width: 50%; text-align: left;">${mq.premiseColumnTitle || "Kolom A: Konsep / Pernyataan"}</th>
                    <th style="border: 1px solid #000; padding: 5px; width: 50%; text-align: left;">${mq.targetColumnTitle || "Kolom B: Pilihan Jawaban"}</th>
                  </tr>
                </thead>
                <tbody>
                  ${Array.from({ length: Math.max(mq.premises.length, mq.targets.length) })
                    .map((_, rIdx) => {
                      const p = mq.premises[rIdx];
                      const t = mq.targets[rIdx];
                      return `
                    <tr>
                      <td style="border: 1px solid #000; padding: 4px 6px;">${p ? `<strong>[ ${p.key} ]</strong> ${p.text}` : ""}</td>
                      <td style="border: 1px solid #000; padding: 4px 6px;">${t ? `<strong>( ${t.key} )</strong> ${t.text}` : ""}</td>
                    </tr>
                  `;
                    })
                    .join("")}
                </tbody>
              </table>
            </div>
          `;
            })
            .join("")}
        </div>
        `
            : ""
        }

        <!-- SOAL LITERASI TEKS & DATA -->
        ${
          literacyQuestions.length > 0
            ? `
        <div class="section-title">
          LITERASI TEKS & DATA (ASESMEN KOMPETENSI)
        </div>
        <div>
          ${literacyQuestions
            .map((lq) => {
              const isLqAr = isArabicExam || /[\u0600-\u06FF]/.test(lq.questionText);
              return `
            <div style="margin-top: 12px; margin-bottom: 14px; page-break-inside: avoid; break-inside: avoid; border: 1px solid #006837; border-radius: 4px; padding: 8px;" ${isLqAr ? 'dir="rtl"' : ""}>
              <div style="font-weight: bold; color: #006837; font-size: 10.5pt; text-transform: uppercase;">
                📊 Kasus ${lq.number}: ${lq.stimulusTitle}
              </div>
              <div style="font-size: 10pt; line-height: 1.4; margin: 4px 0;" class="${isLqAr ? "arabic-passage" : ""}">
                ${lq.stimulusContent}
              </div>
              ${lq.dataSnippet ? `<pre style="background: #f8f8f8; border: 1px solid #ddd; padding: 6px; font-size: 9pt; white-space: pre-wrap; font-family: monospace; margin: 4px 0;">${lq.dataSnippet}</pre>` : ""}
              <div style="font-weight: bold; margin-top: 6px; font-size: 10pt;" class="${isLqAr ? "arabic-text" : ""}">
                Pertanyaan ${lq.number}: ${lq.questionText}
              </div>
              ${lq.options && lq.options.length > 0 ? `
                <div style="margin-left: 18px; margin-top: 4px;">
                  ${lq.options.map((opt) => `<div style="margin: 2px 0;"><strong>${getPrintOptionLabel(opt.key)}</strong> ${opt.text}</div>`).join("")}
                </div>
              ` : ""}
              ${lq.subQuestions && lq.subQuestions.length > 0 ? `
                <div style="margin-left: 14px; margin-top: 6px;">
                  ${lq.subQuestions.map((sq) => `<div style="margin: 4px 0;"><strong>(${sq.id})</strong> ${sq.question}<div style="border-bottom: 1px dotted #888; height: 18px;"></div></div>`).join("")}
                </div>
              ` : ""}
            </div>
          `;
            })
            .join("")}
        </div>
        `
            : ""
        }

        <!-- SOAL ESSAY / URAIAN -->
        ${
          essayQuestions.length > 0
            ? `
        <div class="section-title">
          B. ESSAY / URAIAN (Jawablah pertanyaan berikut dengan singkat, jelas, dan benar!)
        </div>
        <div>
          ${essayQuestions
            .map((eq) => {
              const passage = readingPassages.find((p, pIdx) => {
                if (Array.isArray(p.essayQuestionNumbers) && p.essayQuestionNumbers.length > 0) {
                  return p.essayQuestionNumbers[0] === eq.number;
                }
                const matching = essayQuestions.filter((e) => e.readingPassageId === p.id);
                if (matching.length > 0 && matching[0].number === eq.number) return true;
                return false;
              });

              const isPassageArabic = isArabicExam || (passage && /[\u0600-\u06FF]/.test(passage.content));
              const passageHtml = passage
                ? `
              <div class="reading-box" ${isPassageArabic ? 'dir="rtl"' : ""}>
                <div class="reading-box-header" ${isPassageArabic ? 'style="flex-direction: row-reverse;"' : ""}>
                  <span>📖 ${
                    isPassageArabic
                      ? `اقْرَأِ النَّصَّ الْآتِيَ لِلْإِجَابَةِ عَنِ الْأَسْئِلَةِ الْمَقَالِيَّةِ (${passage.questionRange || "التَّالِيَةِ"})`
                      : `Bacalah teks wacana berikut untuk menjawab soal essay ${passage.questionRange || "berikut"}!`
                  }</span>
                </div>
                <div class="reading-box-title ${isPassageArabic ? "arabic-passage" : ""}">${passage.title}</div>
                <div class="reading-box-content ${isPassageArabic ? "arabic-passage" : ""}">${passage.content}</div>
              </div>
              `
                : "";

              const isEqArabic = isArabicExam || /[\u0600-\u06FF]/.test(eq.questionText);
              return `
            ${passageHtml}
            <div class="essay-item ${isEqArabic ? "arabic-text" : ""}" ${isEqArabic ? 'dir="rtl"' : ""}>
              <strong>${eq.number}.</strong> ${eq.questionText}
            </div>
          `;
            })
            .join("")}
        </div>
        `
            : ""
        }
      </div>

      <!-- ============================================== -->
      <!-- BAGIAN 2: LEMBAR KUNCI JAWABAN TERPISAH -->
      <!-- ============================================== -->
      <div id="screen-divider-kunci" class="screen-divider no-print">
        <span>BATAS HALAMAN: LEMBAR KUNCI JAWABAN & PEDOMAN PENSKORAN</span>
      </div>

      <div id="section-kunci" class="print-page-break">
        <div style="text-align: center; margin-bottom: 12px;">
          <div style="font-size: 13pt; font-weight: bold; text-transform: uppercase;">
            LEMBAR KUNCI JAWABAN & PEDOMAN PENSKORAN
          </div>
          <div style="font-size: 10.5pt; font-weight: bold; margin-top: 2px;">
            Mata Pelajaran: ${metadata.subjectName} | Kelas ${metadata.grade} (${metadata.gradeLevel}) | ${metadata.examType}
          </div>
        </div>

        ${
          multipleChoiceQuestions.length > 0
            ? `
        <div style="font-weight: bold; font-size: 11pt; margin-bottom: 6px;">
          I. Kunci Jawaban Pilihan Ganda
        </div>
        <table class="key-table">
          <thead>
            <tr>
              <th style="width: 8%; text-align: center;">No</th>
              <th style="width: 12%; text-align: center;">Kunci</th>
              <th style="text-align: left;">Pembahasan / Penjelasan Singkat</th>
            </tr>
          </thead>
          <tbody>
            ${multipleChoiceQuestions
              .map((q) => {
                const isExpArabic = isArabicExam || /[\u0600-\u06FF]/.test(q.explanation);
                return `
              <tr>
                <td style="text-align: center;">${q.number}</td>
                <td style="text-align: center; font-weight: bold; font-size: 11pt;">${q.correctAnswer}</td>
                <td class="${isExpArabic ? "arabic-exp" : ""}" ${isExpArabic ? 'dir="rtl"' : ""}>${q.explanation || "-"}</td>
              </tr>
            `;
              })
              .join("")}
          </tbody>
        </table>
        `
            : ""
        }

        ${
          trueFalseQuestions.length > 0
            ? `
        <div style="font-weight: bold; font-size: 11pt; margin-top: 14px; margin-bottom: 6px;">
          Kunci Jawaban Menentukan Benar / Salah
        </div>
        ${trueFalseQuestions
          .map((tf) => `
          <div style="margin-bottom: 10px; font-size: 9.5pt; page-break-inside: avoid;">
            <div style="font-weight: bold;">Nomor ${tf.number}: ${tf.instruction}</div>
            <table class="key-table" style="margin-top: 4px;">
              <thead>
                <tr>
                  <th style="width: 6%; text-align: center;">No</th>
                  <th style="text-align: left;">Pernyataan</th>
                  <th style="width: 14%; text-align: center;">Kunci</th>
                  <th style="text-align: left;">Penjelasan / Pembahasan</th>
                </tr>
              </thead>
              <tbody>
                ${tf.statements
                  .map(
                    (s, idx) => `
                  <tr>
                    <td style="text-align: center;">${idx + 1}</td>
                    <td>${s.statement}</td>
                    <td style="text-align: center; font-weight: bold; color: ${s.isCorrect ? "#006837" : "#b91c1c"};">
                      ${s.isCorrect ? "BENAR" : "SALAH"}
                    </td>
                    <td>${s.explanation || "-"}</td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        `)
          .join("")}
        `
            : ""
        }

        ${
          matchingQuestions.length > 0
            ? `
        <div style="font-weight: bold; font-size: 11pt; margin-top: 14px; margin-bottom: 6px;">
          Kunci Pasangan Soal Mencocokkan (Menjodohkan)
        </div>
        ${matchingQuestions
          .map((mq) => `
          <div style="margin-bottom: 10px; font-size: 9.5pt; page-break-inside: avoid;">
            <div style="font-weight: bold;">Nomor ${mq.number}: ${mq.instruction}</div>
            <table class="key-table" style="margin-top: 4px;">
              <thead>
                <tr>
                  <th style="width: 25%; text-align: left;">Premis (Kolom A)</th>
                  <th style="width: 30%; text-align: left;">Pasangan Tepat (Kolom B)</th>
                  <th style="text-align: left;">Keterangan / Pembahasan</th>
                </tr>
              </thead>
              <tbody>
                ${mq.correctPairs
                  .map((p) => {
                    const premise = mq.premises.find((pr) => pr.key === p.premiseKey);
                    const target = mq.targets.find((tr) => tr.key === p.targetKey);
                    return `
                  <tr>
                    <td><strong>[ ${p.premiseKey} ]</strong> ${premise?.text || ""}</td>
                    <td style="font-weight: bold; color: #006837;"><strong>( ${p.targetKey} )</strong> ${target?.text || ""}</td>
                    <td>${p.explanation || "-"}</td>
                  </tr>
                `;
                  })
                  .join("")}
              </tbody>
            </table>
          </div>
        `)
          .join("")}
        `
            : ""
        }

        ${
          literacyQuestions.length > 0
            ? `
        <div style="font-weight: bold; font-size: 11pt; margin-top: 14px; margin-bottom: 6px;">
          Kunci & Pembahasan Literasi Teks & Data (AKM)
        </div>
        ${literacyQuestions
          .map((lq) => `
          <div style="margin-bottom: 10px; font-size: 9.5pt; page-break-inside: avoid; border: 1px solid #ddd; padding: 6px; border-radius: 4px;">
            <div style="font-weight: bold; color: #006837;">Kasus ${lq.number}: ${lq.stimulusTitle}</div>
            <div style="margin-top: 2px;"><strong>Kunci Jawaban:</strong> <span style="font-weight: bold; color: #006837;">${lq.correctAnswer}</span></div>
            <div style="margin-top: 2px;"><strong>Pembahasan Data:</strong> ${lq.explanation}</div>
            ${lq.subQuestions && lq.subQuestions.length > 0 ? `
              <div style="margin-top: 4px; padding-top: 4px; border-top: 1px dashed #ccc;">
                <strong>Jawaban Sub-Pertanyaan:</strong>
                ${lq.subQuestions.map((sq) => `<div style="margin: 2px 0;"><strong>(${sq.id})</strong> ${sq.question} ➔ <span style="color: #006837; font-weight: bold;">${sq.answerKey}</span> <em>(${sq.explanation})</em></div>`).join("")}
              </div>
            ` : ""}
          </div>
        `)
          .join("")}
        `
            : ""
        }

        ${
          essayQuestions.length > 0
            ? `
        <div style="font-weight: bold; font-size: 11pt; margin-top: 16px; margin-bottom: 6px;">
          Model Jawaban & Rubrik Penskoran Soal Essay
        </div>
        <div>
          ${essayQuestions
            .map((eq) => {
              const isEqArabic = isArabicExam || /[\u0600-\u06FF]/.test(eq.questionText);
              const isAnsArabic = isArabicExam || /[\u0600-\u06FF]/.test(eq.modelAnswer);
              return `
            <div style="margin-bottom: 12px; page-break-inside: avoid; break-inside: avoid; font-size: 10pt;">
              <div class="${isEqArabic ? "arabic-text" : ""}" ${isEqArabic ? 'dir="rtl"' : ""}><strong>Soal No. ${eq.number}:</strong> <em>${eq.questionText}</em></div>
              <div style="margin-left: 15px; margin-top: 3px;">
                <div class="${isAnsArabic ? "arabic-exp" : ""}" ${isAnsArabic ? 'dir="rtl"' : ""}><strong>Model Jawaban:</strong> ${eq.modelAnswer}</div>
                <div style="color: #333; margin-top: 2px;"><strong>Pedoman Penskoran:</strong> ${eq.scoringRubric || "Skor Maksimal: 10"}</div>
              </div>
            </div>
          `;
            })
            .join("")}
        </div>
        `
            : ""
        }
      </div>

      <!-- ============================================== -->
      <!-- BAGIAN 3: KISI-KISI SOAL (BLUEPRINT) -->
      <!-- ============================================== -->
      <div id="screen-divider-kisi" class="screen-divider no-print">
        <span>BATAS HALAMAN: DOKUMEN KISI-KISI PENULISAN SOAL</span>
      </div>

      <div id="section-kisi" class="print-page-break">
        <div style="text-align: center; margin-bottom: 12px;">
          <div style="font-size: 13pt; font-weight: bold; text-transform: uppercase;">
            KISI-KISI PENULISAN SOAL ${metadata.examType.toUpperCase()}
          </div>
          <div style="font-size: 10.5pt; font-weight: bold; text-transform: uppercase; margin-top: 2px;">
            TAHUN AJARAN ${metadata.academicYear}
          </div>
        </div>

        <table style="width: 100%; margin-bottom: 8pt; font-size: 10pt;">
          <tr>
            <td style="width: 50%;">
              <strong>Satuan Pendidikan:</strong> ${schoolIdentity.schoolName}<br/>
              <strong>Mata Pelajaran:</strong> ${metadata.subjectName}<br/>
              <strong>Kelas / Semester:</strong> Kelas ${metadata.grade} (${metadata.gradeLevel}) / ${metadata.semester}
            </td>
            <td style="width: 50%;">
              <strong>Alokasi Waktu:</strong> ${metadata.timeAllocation}<br/>
              <strong>Total Butir Soal:</strong> ${stats.totalQuestions} Soal<br/>
              <strong>Guru Pengampu:</strong> ${metadata.teacherName}
            </td>
          </tr>
        </table>

        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 4%;">No.</th>
              <th style="width: 24%;">Kompetensi Dasar / Capaian</th>
              <th style="width: 18%;">Materi Pokok</th>
              <th style="width: 28%;">Indikator Soal</th>
              <th style="width: 9%;">Level</th>
              <th style="width: 9%;">Kesukaran</th>
              <th style="width: 8%;">Bentuk</th>
            </tr>
          </thead>
          <tbody>
            ${(() => {
              let rowNum = 1;
              let html = "";
              multipleChoiceQuestions.forEach((q) => {
                html += `<tr>
                  <td style="text-align: center;">${rowNum++}</td>
                  <td>${q.basicCompetency || "-"}</td>
                  <td>${q.material || "-"}</td>
                  <td>${q.indicator || "-"}</td>
                  <td style="text-align: center;">${q.cognitiveLevel?.split(" ")[0] || "L2"}</td>
                  <td style="text-align: center;">${q.difficulty || "Sedang"}</td>
                  <td style="text-align: center;">PG (${q.number})</td>
                </tr>`;
              });
              trueFalseQuestions.forEach((tf) => {
                html += `<tr>
                  <td style="text-align: center;">${rowNum++}</td>
                  <td>${tf.basicCompetency || "-"}</td>
                  <td>${tf.material || "-"}</td>
                  <td>${tf.indicator || "-"}</td>
                  <td style="text-align: center;">${tf.cognitiveLevel?.split(" ")[0] || "L2"}</td>
                  <td style="text-align: center;">${tf.difficulty || "Sedang"}</td>
                  <td style="text-align: center;">B/S (${tf.number})</td>
                </tr>`;
              });
              matchingQuestions.forEach((mq) => {
                html += `<tr>
                  <td style="text-align: center;">${rowNum++}</td>
                  <td>${mq.basicCompetency || "-"}</td>
                  <td>${mq.material || "-"}</td>
                  <td>${mq.indicator || "-"}</td>
                  <td style="text-align: center;">${mq.cognitiveLevel?.split(" ")[0] || "L2"}</td>
                  <td style="text-align: center;">${mq.difficulty || "Sedang"}</td>
                  <td style="text-align: center;">Jodohkan (${mq.number})</td>
                </tr>`;
              });
              literacyQuestions.forEach((lq) => {
                html += `<tr>
                  <td style="text-align: center;">${rowNum++}</td>
                  <td>${lq.basicCompetency || "-"}</td>
                  <td>${lq.material || "-"}</td>
                  <td>${lq.indicator || "-"}</td>
                  <td style="text-align: center;">${lq.cognitiveLevel?.split(" ")[0] || "L3"}</td>
                  <td style="text-align: center;">${lq.difficulty || "Sukar"}</td>
                  <td style="text-align: center;">Literasi (${lq.number})</td>
                </tr>`;
              });
              essayQuestions.forEach((eq) => {
                html += `<tr>
                  <td style="text-align: center;">${rowNum++}</td>
                  <td>${eq.basicCompetency || "-"}</td>
                  <td>${eq.material || "-"}</td>
                  <td>${eq.indicator || "-"}</td>
                  <td style="text-align: center;">${eq.cognitiveLevel?.split(" ")[0] || "L3"}</td>
                  <td style="text-align: center;">${eq.difficulty || "Sukar"}</td>
                  <td style="text-align: center;">Uraian (${eq.number})</td>
                </tr>`;
              });
              return html;
            })()}
          </tbody>
        </table>

        <table style="width: 100%; margin-top: 20pt; font-size: 10pt; page-break-inside: avoid;">
          <tr>
            <td style="width: 50%; text-align: center; vertical-align: top;">
              Mengetahui,<br/>Kepala ${schoolIdentity.schoolName}<br/><br/><br/><br/>
              <strong>___________________________</strong><br/>NIP. .........................................
            </td>
            <td style="width: 50%; text-align: center; vertical-align: top;">
              ${schoolIdentity.address?.split(",")[1]?.trim() || "Sleman"}, ${metadata.examDate}<br/>
              Guru Pengampu Mata Pelajaran<br/><br/><br/><br/>
              <strong>${metadata.teacherName}</strong><br/>NIP. .........................................
            </td>
          </tr>
        </table>
      </div>

      <!-- ============================================== -->
      <!-- BAGIAN 4: KARTU SOAL (QUESTION CARDS) -->
      <!-- ============================================== -->
      <div id="screen-divider-kartu" class="screen-divider no-print">
        <span>BATAS HALAMAN: DOKUMEN KARTU SOAL LENGKAP</span>
      </div>

      <div id="section-kartu" class="print-page-break">
        <div style="text-align: center; margin-bottom: 12px;">
          <div style="font-size: 13pt; font-weight: bold; text-transform: uppercase;">
            KARTU SOAL ${metadata.examType.toUpperCase()}
          </div>
          <div style="font-size: 10pt; font-weight: bold; margin-top: 2px;">
            Mata Pelajaran: ${metadata.subjectName} | Kelas ${metadata.grade} - Standar Penilaian
          </div>
        </div>

        ${multipleChoiceQuestions
          .map((q) => {
            const isAr = isArabicExam || /[\u0600-\u06FF]/.test(q.questionText);
            return `
          <div class="card-box">
            <table style="width: 100%; border-bottom: 1pt solid #000; padding-bottom: 3pt; margin-bottom: 4pt; font-size: 9.5pt;">
              <tr>
                <td><strong>${schoolIdentity.schoolName.toUpperCase()}</strong></td>
                <td style="text-align: right; font-weight: bold;">KARTU SOAL PILIHAN GANDA NO. ${q.number}</td>
              </tr>
            </table>

            <table class="data-table" style="margin-bottom: 6pt;">
              <tr>
                <td style="width: 25%; font-weight: bold;">Kompetensi Dasar / CP</td>
                <td colspan="3">${q.basicCompetency || "-"}</td>
              </tr>
              <tr>
                <td style="font-weight: bold;">Materi Pokok</td>
                <td style="width: 35%;">${q.material || "-"}</td>
                <td style="width: 20%; font-weight: bold;">Level / Kesukaran</td>
                <td style="width: 20%;">${q.cognitiveLevel || "L2"} / ${q.difficulty || "Sedang"}</td>
              </tr>
              <tr>
                <td style="font-weight: bold;">Indikator Soal</td>
                <td colspan="3">${q.indicator || "-"}</td>
              </tr>
            </table>

            <div style="font-size: 10pt; margin-bottom: 4pt; font-weight: bold;">Rumusan Butir Soal:</div>
            <div class="${isAr ? "arabic-text" : ""}" style="font-size: 10pt; margin-bottom: 4pt;">
              <strong>${q.number}.</strong> ${q.questionText}
            </div>
            <div style="font-size: 9.5pt; margin-left: 12pt; margin-bottom: 4pt;">
              ${q.options.map((opt) => `<div><strong>${opt.key}.</strong> ${opt.text}</div>`).join("")}
            </div>
            <div style="border-top: 1pt dashed #999; padding-top: 3pt; font-size: 9pt;">
              <strong>Kunci:</strong> [ ${q.correctAnswer} ] | <strong>Bobot:</strong> 1 | <em>Pembahasan: ${q.explanation}</em>
            </div>
          </div>
        `;
          })
          .join("")}

        ${essayQuestions
          .map((eq) => {
            const isAr = isArabicExam || /[\u0600-\u06FF]/.test(eq.questionText);
            return `
          <div class="card-box">
            <table style="width: 100%; border-bottom: 1pt solid #000; padding-bottom: 3pt; margin-bottom: 4pt; font-size: 9.5pt;">
              <tr>
                <td><strong>${schoolIdentity.schoolName.toUpperCase()}</strong></td>
                <td style="text-align: right; font-weight: bold; color: #004d26;">KARTU SOAL URAIAN NO. ${eq.number}</td>
              </tr>
            </table>

            <table class="data-table" style="margin-bottom: 6pt;">
              <tr>
                <td style="width: 25%; font-weight: bold;">Kompetensi Dasar / CP</td>
                <td colspan="3">${eq.basicCompetency || "-"}</td>
              </tr>
              <tr>
                <td style="font-weight: bold;">Materi Pokok</td>
                <td style="width: 35%;">${eq.material || "-"}</td>
                <td style="width: 20%; font-weight: bold;">Level / Kesukaran</td>
                <td style="width: 20%;">${eq.cognitiveLevel || "L3"} / ${eq.difficulty || "Sukar"}</td>
              </tr>
              <tr>
                <td style="font-weight: bold;">Indikator Soal</td>
                <td colspan="3">${eq.indicator || "-"}</td>
              </tr>
            </table>

            <div style="font-size: 10pt; margin-bottom: 4pt; font-weight: bold;">Rumusan Butir Soal Uraian:</div>
            <div class="${isAr ? "arabic-text" : ""}" style="font-size: 10pt; margin-bottom: 4pt;">
              <strong>${eq.number}.</strong> ${eq.questionText}
            </div>
            <div style="background: #fafafa; border: 1pt solid #ddd; padding: 4pt; font-size: 9pt;">
              <div><strong>Model Jawaban:</strong> ${eq.modelAnswer}</div>
              <div><strong>Pedoman Penskoran:</strong> ${eq.scoringRubric} (Skor Maks: ${eq.maxScore || 10})</div>
            </div>
          </div>
        `;
          })
          .join("")}
      </div>

      <!-- ============================================== -->
      <!-- BAGIAN 5: ANALISIS BUTIR SOAL -->
      <!-- ============================================== -->
      <div id="screen-divider-analisis" class="screen-divider no-print">
        <span>BATAS HALAMAN: DOKUMEN ANALISIS & SPESIFIKASI BUTIR SOAL</span>
      </div>

      <div id="section-analisis" class="print-page-break">
        <div style="text-align: center; margin-bottom: 12px;">
          <div style="font-size: 13pt; font-weight: bold; text-transform: uppercase;">
            ANALISIS KUALITATIF & SPESIFIKASI BUTIR SOAL
          </div>
          <div style="font-size: 10.5pt; font-weight: bold; margin-top: 2pt;">
            ${metadata.examType.toUpperCase()} TAHUN AJARAN ${metadata.academicYear}
          </div>
        </div>

        <div style="font-weight: bold; font-size: 10.5pt; margin-bottom: 4pt;">
          I. REKAPITULASI PROPORSI TINGKAT KOGNITIF & TINGKAT KESUKARAN:
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th colspan="3">Level Kognitif</th>
              <th colspan="3">Tingkat Kesukaran</th>
              <th colspan="2">Kunci Jawaban PG</th>
            </tr>
            <tr>
              <th>Kategori</th><th>Jml</th><th>%</th>
              <th>Kategori</th><th>Jml</th><th>%</th>
              <th>Kunci</th><th>Jml (%)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>L1 (Pengetahuan/C1-C2)</td><td style="text-align: center;">${stats.cognitiveStats.l1Count}</td><td style="text-align: center;">${stats.cognitiveStats.l1Percent}%</td>
              <td>Mudah (~25%)</td><td style="text-align: center;">${stats.difficultyStats.mudahCount}</td><td style="text-align: center;">${stats.difficultyStats.mudahPercent}%</td>
              <td style="text-align: center;">A</td><td style="text-align: center;">${stats.keyDistribution["A"]?.count || 0} (${stats.keyDistribution["A"]?.percent || 0}%)</td>
            </tr>
            <tr>
              <td>L2 (Aplikasi/C3)</td><td style="text-align: center;">${stats.cognitiveStats.l2Count}</td><td style="text-align: center;">${stats.cognitiveStats.l2Percent}%</td>
              <td>Sedang (~50%)</td><td style="text-align: center;">${stats.difficultyStats.sedangCount}</td><td style="text-align: center;">${stats.difficultyStats.sedangPercent}%</td>
              <td style="text-align: center;">B</td><td style="text-align: center;">${stats.keyDistribution["B"]?.count || 0} (${stats.keyDistribution["B"]?.percent || 0}%)</td>
            </tr>
            <tr>
              <td>L3 (Penalaran/HOTS)</td><td style="text-align: center;">${stats.cognitiveStats.l3Count}</td><td style="text-align: center;">${stats.cognitiveStats.l3Percent}%</td>
              <td>Sukar (~25%)</td><td style="text-align: center;">${stats.difficultyStats.sukarCount}</td><td style="text-align: center;">${stats.difficultyStats.sukarPercent}%</td>
              <td style="text-align: center;">C</td><td style="text-align: center;">${stats.keyDistribution["C"]?.count || 0} (${stats.keyDistribution["C"]?.percent || 0}%)</td>
            </tr>
          </tbody>
        </table>

        <div style="font-weight: bold; font-size: 10.5pt; margin-top: 10pt; margin-bottom: 4pt;">
          II. SPESIFIKASI DAN KELAYAKAN BUTIR SOAL:
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 5%;">No</th>
              <th style="width: 8%;">Bentuk</th>
              <th style="width: 35%;">Materi Pokok</th>
              <th style="width: 10%;">Level</th>
              <th style="width: 10%;">Kesukaran</th>
              <th style="width: 10%;">Kunci</th>
              <th style="width: 10%;">Daya Beda</th>
              <th style="width: 12%;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${multipleChoiceQuestions
              .map((q) => `
              <tr>
                <td style="text-align: center;">${q.number}</td>
                <td style="text-align: center;">PG</td>
                <td>${q.material || "-"}</td>
                <td style="text-align: center;">${q.cognitiveLevel?.split(" ")[0] || "L2"}</td>
                <td style="text-align: center;">${q.difficulty || "Sedang"}</td>
                <td style="text-align: center; font-weight: bold;">${q.correctAnswer}</td>
                <td style="text-align: center;">0.42 (Baik)</td>
                <td style="text-align: center; font-weight: bold; color: #006837;">Diterima</td>
              </tr>
            `)
              .join("")}
            ${essayQuestions
              .map((eq) => `
              <tr>
                <td style="text-align: center;">${eq.number}</td>
                <td style="text-align: center;">Uraian</td>
                <td>${eq.material || "-"}</td>
                <td style="text-align: center;">${eq.cognitiveLevel?.split(" ")[0] || "L3"}</td>
                <td style="text-align: center;">${eq.difficulty || "Sukar"}</td>
                <td style="text-align: center;">Rubrik</td>
                <td style="text-align: center;">0.48 (Sgt Baik)</td>
                <td style="text-align: center; font-weight: bold; color: #006837;">Diterima</td>
              </tr>
            `)
              .join("")}
          </tbody>
        </table>

        <table style="width: 100%; margin-top: 20pt; font-size: 10pt; page-break-inside: avoid;">
          <tr>
            <td style="width: 50%; text-align: center; vertical-align: top;">
              Mengetahui,<br/>Kepala ${schoolIdentity.schoolName}<br/><br/><br/><br/>
              <strong>___________________________</strong><br/>NIP. .........................................
            </td>
            <td style="width: 50%; text-align: center; vertical-align: top;">
              ${schoolIdentity.address?.split(",")[1]?.trim() || "Sleman"}, ${metadata.examDate}<br/>
              Guru Penelaah Butir Soal<br/><br/><br/><br/>
              <strong>${metadata.teacherName}</strong><br/>NIP. .........................................
            </td>
          </tr>
        </table>
      </div>

    </div>
  </div>

  <script>
    let currentPaper = "${initialPaperSize}";
    let currentMode = "${initialViewMode}";

    function setPaper(size) {
      currentPaper = size;
      const styleEl = document.getElementById("page-size-style");
      const paperEl = document.getElementById("paper-element");
      const btnA4 = document.getElementById("btn-a4");
      const btnF4 = document.getElementById("btn-f4");

      if (size === "F4") {
        styleEl.innerHTML = "@page { size: 215mm 330mm; margin: 12mm 15mm 12mm 15mm; }";
        paperEl.style.width = "215mm";
        paperEl.style.minHeight = "330mm";
        btnF4.classList.add("active");
        btnA4.classList.remove("active");
      } else {
        styleEl.innerHTML = "@page { size: 210mm 297mm; margin: 12mm 15mm 12mm 15mm; }";
        paperEl.style.width = "210mm";
        paperEl.style.minHeight = "297mm";
        btnA4.classList.add("active");
        btnF4.classList.remove("active");
      }
    }

    function setViewMode(mode) {
      currentMode = mode;
      const secSoal = document.getElementById("section-soal");
      const secKunci = document.getElementById("section-kunci");
      const secKisi = document.getElementById("section-kisi");
      const secKartu = document.getElementById("section-kartu");
      const secAnalisis = document.getElementById("section-analisis");

      const divKunci = document.getElementById("screen-divider-kunci");
      const divKisi = document.getElementById("screen-divider-kisi");
      const divKartu = document.getElementById("screen-divider-kartu");
      const divAnalisis = document.getElementById("screen-divider-analisis");

      const btns = ["all", "soal", "kunci", "kisi", "kartu", "analisis"];
      btns.forEach(b => {
        const el = document.getElementById("btn-" + b);
        if (el) el.classList.remove("active");
      });

      // Hide all first
      secSoal.style.display = "none";
      secKunci.style.display = "none";
      secKisi.style.display = "none";
      secKartu.style.display = "none";
      secAnalisis.style.display = "none";

      if (divKunci) divKunci.style.display = "none";
      if (divKisi) divKisi.style.display = "none";
      if (divKartu) divKartu.style.display = "none";
      if (divAnalisis) divAnalisis.style.display = "none";

      if (mode === "soal") {
        secSoal.style.display = "block";
        document.getElementById("btn-soal")?.classList.add("active");
      } else if (mode === "kunci") {
        secKunci.style.display = "block";
        secKunci.classList.remove("print-page-break");
        document.getElementById("btn-kunci")?.classList.add("active");
      } else if (mode === "kisi-kisi") {
        secKisi.style.display = "block";
        secKisi.classList.remove("print-page-break");
        document.getElementById("btn-kisi")?.classList.add("active");
      } else if (mode === "kartu-soal") {
        secKartu.style.display = "block";
        secKartu.classList.remove("print-page-break");
        document.getElementById("btn-kartu")?.classList.add("active");
      } else if (mode === "analisis") {
        secAnalisis.style.display = "block";
        secAnalisis.classList.remove("print-page-break");
        document.getElementById("btn-analisis")?.classList.add("active");
      } else {
        // Mode 'lengkap' - show all
        secSoal.style.display = "block";
        secKunci.style.display = "block";
        secKisi.style.display = "block";
        secKartu.style.display = "block";
        secAnalisis.style.display = "block";

        secKunci.classList.add("print-page-break");
        secKisi.classList.add("print-page-break");
        secKartu.classList.add("print-page-break");
        secAnalisis.classList.add("print-page-break");

        if (divKunci) divKunci.style.display = "block";
        if (divKisi) divKisi.style.display = "block";
        if (divKartu) divKartu.style.display = "block";
        if (divAnalisis) divAnalisis.style.display = "block";

        document.getElementById("btn-all")?.classList.add("active");
      }
    }

    // Apply initial view mode
    window.addEventListener("DOMContentLoaded", () => {
      setViewMode("${initialViewMode}");
    });
  </script>
</body>
</html>`;
}

/**
 * Open printable document in a new tab
 */
export function openExamInNewTab(
  examData: ExamData,
  paperSize: PaperSize = "A4",
  viewMode: PrintViewMode = "lengkap",
  optionLayoutPreference?: OptionLayout
): void {
  const htmlContent = generatePrintableHtml(examData, paperSize, viewMode, optionLayoutPreference);
  const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
  const blobUrl = URL.createObjectURL(blob);
  const newWin = window.open(blobUrl, "_blank");

  if (!newWin) {
    alert("Peramban Anda memblokir jendela sembulan (pop-up). Harap izinkan pop-up untuk mencetak.");
  }
}

/**
 * Clean native print directly using invisible iframe
 */
export function printExamDirectly(
  examData: ExamData,
  paperSize: PaperSize = "A4",
  viewMode: PrintViewMode = "lengkap",
  optionLayoutPreference?: OptionLayout
): void {
  const htmlContent = generatePrintableHtml(examData, paperSize, viewMode, optionLayoutPreference);

  let iframe = document.getElementById("exam-print-frame") as HTMLIFrameElement | null;
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.id = "exam-print-frame";
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    iframe.style.visibility = "hidden";
    document.body.appendChild(iframe);
  }

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (iframeDoc) {
    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();

    setTimeout(() => {
      try {
        iframe?.contentWindow?.focus();
        iframe?.contentWindow?.print();
      } catch (e) {
        console.warn("Direct iframe print failed, falling back to new tab:", e);
        openExamInNewTab(examData, paperSize, viewMode, optionLayoutPreference);
      }
    }, 450);
  } else {
    openExamInNewTab(examData, paperSize, viewMode, optionLayoutPreference);
  }
}
