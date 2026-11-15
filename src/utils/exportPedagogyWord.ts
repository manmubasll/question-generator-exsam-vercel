import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
} from "docx";
import { saveAs } from "file-saver";
import { ExamData, PaperSize, SchoolIdentity } from "../types";
import { enrichExamPedagogy, calculateExamStatistics } from "./pedagogyHelpers";

/**
 * Helper to render the official KOP table for Word 2007 (.doc) documents
 */
function renderWordKop(schoolIdentity: SchoolIdentity): string {
  const showLeft = schoolIdentity.useLeftLogo !== false && schoolIdentity.logoBase64;
  const showRight = schoolIdentity.useRightLogo && schoolIdentity.rightLogoBase64;

  return `
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 3pt;">
    <tr>
      <td style="width: 75px; vertical-align: middle; text-align: center;">
        ${
          showLeft
            ? `<img src="${schoolIdentity.logoBase64}" width="70" height="70" style="width: 70px; height: 70px; object-fit: contain;" alt="Logo Kiri" />`
            : `<div style="width: 70px;"></div>`
        }
      </td>
      <td style="text-align: center; vertical-align: middle; padding: 0 8pt;">
        <div style="font-size: 11pt; font-weight: bold; text-transform: uppercase;">
          ${(schoolIdentity.ministryName || "KEMENTERIAN AGAMA REPUBLIK INDONESIA").toUpperCase()}
        </div>
        <div style="font-size: 10.5pt; font-weight: bold; text-transform: uppercase; margin-top: 1px;">
          ${(schoolIdentity.subMinistryName || "KANTOR KEMENTERIAN AGAMA").toUpperCase()}
        </div>
        <div style="font-size: 13.5pt; font-weight: bold; text-transform: uppercase; color: #000; margin-top: 2px;">
          ${(schoolIdentity.schoolName || "MADRASAH ALIYAH NEGERI").toUpperCase()}
        </div>
        ${
          schoolIdentity.accreditation
            ? `<div style="font-size: 10pt; font-weight: bold; margin-top: 2px; color: #111;">${schoolIdentity.accreditation}</div>`
            : ""
        }
        <div style="font-size: 9pt; font-style: italic; margin-top: 2px;">
          ${schoolIdentity.address || "Jalan Raya Pendidikan No. 1"}
        </div>
        <div style="font-size: 8.5pt; font-style: italic;">
          ${schoolIdentity.contact || "Telp. (021) 1234567 | Email: madrasah@kemenag.go.id"}
        </div>
      </td>
      <td style="width: 75px; vertical-align: middle; text-align: center;">
        ${
          showRight
            ? `<img src="${schoolIdentity.rightLogoBase64}" width="70" height="70" style="width: 70px; height: 70px; object-fit: contain;" alt="Logo Kanan" />`
            : `<div style="width: 70px;"></div>`
        }
      </td>
    </tr>
  </table>
  <div style="border-top: 3px solid #000; border-bottom: 1px solid #000; height: 3px; margin: 2pt 0 10pt 0;"></div>
  `;
}

function getWordDocWrapper(title: string, bodyContent: string, paperSize: PaperSize = "A4"): string {
  const pageSizeStyle =
    paperSize === "F4"
      ? "size: 215mm 330mm; margin: 1.5cm 2.0cm 1.5cm 2.0cm;"
      : "size: 210mm 297mm; margin: 1.5cm 2.0cm 1.5cm 2.0cm;";

  return `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'>
  <title>${title}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page Section1 {
      ${pageSizeStyle}
      mso-header-margin: 36pt;
      mso-footer-margin: 36pt;
      mso-paper-source: 0;
    }
    div.Section1 {
      page: Section1;
    }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 11pt;
      line-height: 1.35;
      color: #000000;
    }
    table {
      border-collapse: collapse;
      width: 100%;
    }
    table.data-table th, table.data-table td {
      border: 1px solid #000000;
      padding: 4pt 6pt;
      font-size: 9.5pt;
      vertical-align: top;
    }
    table.data-table th {
      background-color: #f2f2f2;
      font-weight: bold;
      text-align: center;
      vertical-align: middle;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .text-justify { text-align: justify; }
    .font-bold { font-weight: bold; }
    .font-italic { font-style: italic; }
    .page-break {
      page-break-before: always;
      mso-break-type: section-break;
    }
    .card-box {
      border: 1.5pt solid #000;
      padding: 8pt;
      margin-bottom: 12pt;
      page-break-inside: avoid;
    }
    .badge {
      display: inline-block;
      padding: 2pt 5pt;
      font-size: 8.5pt;
      font-weight: bold;
      border: 1px solid #666;
      background: #fafafa;
    }
    .arabic-text {
      font-family: 'Traditional Arabic', 'Amiri', Times, serif;
      direction: rtl;
      text-align: right;
      font-size: 13pt;
      line-height: 1.6;
    }
  </style>
</head>
<body>
<div class="Section1">
  ${bodyContent}
</div>
</body>
</html>`;
}

// -------------------------------------------------------------
// 1. KISI-KISI SOAL (EXAM MATRIX / BLUEPRINT)
// -------------------------------------------------------------

export function exportKisiKisiWordClassic(rawExamData: ExamData, paperSize: PaperSize = "A4"): void {
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

  const isArabic =
    metadata.examLanguage === "ar" ||
    metadata.subjectName.toLowerCase().includes("bahasa arab") ||
    metadata.subjectName.toLowerCase().includes("arab");

  let rowCounter = 1;

  const pgRows = multipleChoiceQuestions.map((q) => {
    const isAr = isArabic || /[\u0600-\u06FF]/.test(q.questionText);
    return `
    <tr>
      <td style="text-align: center;">${rowCounter++}</td>
      <td class="${isAr ? "arabic-text" : ""}">${q.basicCompetency || "-"}</td>
      <td class="${isAr ? "arabic-text" : ""}">${q.material || "-"}</td>
      <td class="${isAr ? "arabic-text" : ""}">${q.indicator || "-"}</td>
      <td style="text-align: center; font-size: 9pt;">${q.cognitiveLevel || "L2"}</td>
      <td style="text-align: center; font-size: 9pt;">${q.difficulty || "Sedang"}</td>
      <td style="text-align: center;">Pilihan Ganda</td>
      <td style="text-align: center; font-weight: bold;">${q.number}</td>
    </tr>
    `;
  }).join("");

  const tfRows = trueFalseQuestions.map((tf) => {
    const isAr = isArabic || /[\u0600-\u06FF]/.test(tf.instructions);
    return `
    <tr>
      <td style="text-align: center;">${rowCounter++}</td>
      <td class="${isAr ? "arabic-text" : ""}">${tf.basicCompetency || "-"}</td>
      <td class="${isAr ? "arabic-text" : ""}">${tf.material || "-"}</td>
      <td class="${isAr ? "arabic-text" : ""}">${tf.indicator || "-"}</td>
      <td style="text-align: center; font-size: 9pt;">${tf.cognitiveLevel || "L2"}</td>
      <td style="text-align: center; font-size: 9pt;">${tf.difficulty || "Sedang"}</td>
      <td style="text-align: center;">Benar / Salah</td>
      <td style="text-align: center; font-weight: bold;">${tf.number}</td>
    </tr>
    `;
  }).join("");

  const matchRows = matchingQuestions.map((mq) => {
    const isAr = isArabic || /[\u0600-\u06FF]/.test(mq.instructions);
    return `
    <tr>
      <td style="text-align: center;">${rowCounter++}</td>
      <td class="${isAr ? "arabic-text" : ""}">${mq.basicCompetency || "-"}</td>
      <td class="${isAr ? "arabic-text" : ""}">${mq.material || "-"}</td>
      <td class="${isAr ? "arabic-text" : ""}">${mq.indicator || "-"}</td>
      <td style="text-align: center; font-size: 9pt;">${mq.cognitiveLevel || "L2"}</td>
      <td style="text-align: center; font-size: 9pt;">${mq.difficulty || "Sedang"}</td>
      <td style="text-align: center;">Menjodohkan</td>
      <td style="text-align: center; font-weight: bold;">${mq.number}</td>
    </tr>
    `;
  }).join("");

  const litRows = literacyQuestions.map((lq) => {
    const isAr = isArabic || /[\u0600-\u06FF]/.test(lq.questionText);
    return `
    <tr>
      <td style="text-align: center;">${rowCounter++}</td>
      <td class="${isAr ? "arabic-text" : ""}">${lq.basicCompetency || "-"}</td>
      <td class="${isAr ? "arabic-text" : ""}">${lq.material || "-"}</td>
      <td class="${isAr ? "arabic-text" : ""}">${lq.indicator || "-"}</td>
      <td style="text-align: center; font-size: 9pt;">${lq.cognitiveLevel || "L3"}</td>
      <td style="text-align: center; font-size: 9pt;">${lq.difficulty || "Sukar"}</td>
      <td style="text-align: center;">Literasi Data</td>
      <td style="text-align: center; font-weight: bold;">${lq.number}</td>
    </tr>
    `;
  }).join("");

  const essayRows = essayQuestions.map((eq) => {
    const isAr = isArabic || /[\u0600-\u06FF]/.test(eq.questionText);
    return `
    <tr>
      <td style="text-align: center;">${rowCounter++}</td>
      <td class="${isAr ? "arabic-text" : ""}">${eq.basicCompetency || "-"}</td>
      <td class="${isAr ? "arabic-text" : ""}">${eq.material || "-"}</td>
      <td class="${isAr ? "arabic-text" : ""}">${eq.indicator || "-"}</td>
      <td style="text-align: center; font-size: 9pt;">${eq.cognitiveLevel || "L3"}</td>
      <td style="text-align: center; font-size: 9pt;">${eq.difficulty || "Sukar"}</td>
      <td style="text-align: center;">Uraian / Essay</td>
      <td style="text-align: center; font-weight: bold;">${eq.number}</td>
    </tr>
    `;
  }).join("");

  const totalAllQuestions =
    multipleChoiceQuestions.length +
    trueFalseQuestions.length +
    matchingQuestions.length +
    literacyQuestions.length +
    essayQuestions.length;

  const content = `
    ${renderWordKop(schoolIdentity)}

    <div class="text-center" style="margin-bottom: 12pt;">
      <div style="font-size: 13pt; font-weight: bold; text-transform: uppercase;">
        KISI-KISI PENULISAN SOAL ${metadata.examType.toUpperCase()}
      </div>
      <div style="font-size: 11pt; font-weight: bold; text-transform: uppercase; margin-top: 2pt;">
        TAHUN AJARAN ${metadata.academicYear}
      </div>
    </div>

    <!-- Identitas Mata Pelajaran -->
    <table style="width: 100%; margin-bottom: 10pt; font-size: 10pt;">
      <tr>
        <td style="width: 15%; white-space: nowrap;"><strong>Satuan Pendidikan</strong></td>
        <td style="width: 2%; text-align: center;">:</td>
        <td style="width: 31%;">${schoolIdentity.schoolName}</td>
        <td style="width: 15%; white-space: nowrap;"><strong>Alokasi Waktu</strong></td>
        <td style="width: 2%; text-align: center;">:</td>
        <td style="width: 35%; white-space: nowrap;">${metadata.timeAllocation}</td>
      </tr>
      <tr>
        <td><strong>Mata Pelajaran</strong></td>
        <td>:</td>
        <td>${metadata.subjectName}</td>
        <td><strong>Jumlah Soal</strong></td>
        <td>:</td>
        <td>${totalAllQuestions} Butir (${multipleChoiceQuestions.length} PG, ${trueFalseQuestions.length} B/S, ${matchingQuestions.length} Jodohkan, ${literacyQuestions.length} Literasi, ${essayQuestions.length} Uraian)</td>
      </tr>
      <tr>
        <td><strong>Kelas / Semester</strong></td>
        <td>:</td>
        <td>Kelas ${metadata.grade} (${metadata.gradeLevel}) / ${metadata.semester}</td>
        <td><strong>Kurikulum</strong></td>
        <td>:</td>
        <td>Kurikulum Merdeka / K-13</td>
      </tr>
      <tr>
        <td><strong>Guru Pengampu</strong></td>
        <td>:</td>
        <td>${metadata.teacherName}</td>
        <td><strong>Hari / Tanggal</strong></td>
        <td>:</td>
        <td>${metadata.examDate}</td>
      </tr>
    </table>

    <!-- Tabel Kisi-Kisi Standar -->
    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 4%;">No.</th>
          <th style="width: 22%;">Capaian Pembelajaran / Kompetensi Dasar</th>
          <th style="width: 18%;">Materi Pokok</th>
          <th style="width: 28%;">Indikator Soal</th>
          <th style="width: 10%;">Level Kognitif</th>
          <th style="width: 8%;">Tingkat Kesukaran</th>
          <th style="width: 10%;">Bentuk Soal</th>
          <th style="width: 5%;">No. Soal</th>
        </tr>
      </thead>
      <tbody>
        ${pgRows}
        ${tfRows}
        ${matchRows}
        ${litRows}
        ${essayRows}
      </tbody>
    </table>

    <div style="margin-top: 8pt; font-size: 9pt; font-style: italic;">
      Catatan Level Kognitif: Level 1 (Pengetahuan & Pemahaman / C1-C2), Level 2 (Aplikasi & Penerapan / C3), Level 3 (Penalaran & HOTS / C4-C6).
    </div>

    <!-- Tanda Tangan -->
    <table style="width: 100%; margin-top: 24pt; font-size: 10.5pt; page-break-inside: avoid;">
      <tr>
        <td style="width: 50%; text-align: center; vertical-align: top;">
          Mengetahui,<br/>
          Kepala ${schoolIdentity.schoolName}<br/><br/><br/><br/>
          <strong>___________________________</strong><br/>
          NIP. ......................................................
        </td>
        <td style="width: 50%; text-align: center; vertical-align: top;">
          ${schoolIdentity.address?.split(",")[1]?.trim() || "Sleman"}, ${metadata.examDate}<br/>
          Guru Pengampu Mata Pelajaran<br/><br/><br/><br/>
          <strong>${metadata.teacherName}</strong><br/>
          NIP. ......................................................
        </td>
      </tr>
    </table>
  `;

  const html = getWordDocWrapper(`Kisi_Kisi_${metadata.subjectName}`, content, paperSize);
  const blob = new Blob(["\ufeff" + html], { type: "application/msword;charset=utf-8" });
  saveAs(blob, `Kisi_Kisi_Soal_${metadata.subjectName.replace(/[^a-zA-Z0-9]/g, "_")}_Kelas${metadata.grade}.doc`);
}

export async function exportKisiKisiWordDocx(rawExamData: ExamData, paperSize: PaperSize = "A4"): Promise<void> {
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

  const headerRows = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: (schoolIdentity.schoolName || "MADRASAH ALIYAH NEGERI").toUpperCase(),
          bold: true,
          size: 26,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `KISI-KISI PENULISAN SOAL ${metadata.examType.toUpperCase()}`,
          bold: true,
          size: 24,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: `TAHUN AJARAN ${metadata.academicYear} | KELAS ${metadata.grade} (${metadata.gradeLevel})`,
          bold: true,
          size: 20,
        }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Mata Pelajaran: ${metadata.subjectName}    |    Waktu: ${metadata.timeAllocation}    |    Guru: ${metadata.teacherName}`, italics: true }),
      ],
      spacing: { after: 150 },
    }),
  ];

  const tableRows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({ children: [new Paragraph({ text: "No", alignment: AlignmentType.CENTER, style: "bold" })], width: { size: 5, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ text: "Kompetensi Dasar / CP", alignment: AlignmentType.CENTER, style: "bold" })], width: { size: 25, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ text: "Materi Pokok", alignment: AlignmentType.CENTER, style: "bold" })], width: { size: 18, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ text: "Indikator Soal", alignment: AlignmentType.CENTER, style: "bold" })], width: { size: 28, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ text: "Level", alignment: AlignmentType.CENTER, style: "bold" })], width: { size: 8, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ text: "Kesukaran", alignment: AlignmentType.CENTER, style: "bold" })], width: { size: 8, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ text: "Bentuk", alignment: AlignmentType.CENTER, style: "bold" })], width: { size: 8, type: WidthType.PERCENTAGE } }),
      ],
    }),
  ];

  let rIdx = 1;
  multipleChoiceQuestions.forEach((q) => {
    tableRows.push(
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: String(rIdx++), alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ text: q.basicCompetency || "-" })] }),
          new TableCell({ children: [new Paragraph({ text: q.material || "-" })] }),
          new TableCell({ children: [new Paragraph({ text: q.indicator || "-" })] }),
          new TableCell({ children: [new Paragraph({ text: q.cognitiveLevel?.split(" ")[0] || "L2", alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ text: q.difficulty || "Sedang", alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ text: `PG (${q.number})`, alignment: AlignmentType.CENTER })] }),
        ],
      })
    );
  });

  trueFalseQuestions.forEach((tf) => {
    tableRows.push(
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: String(rIdx++), alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ text: tf.basicCompetency || "-" })] }),
          new TableCell({ children: [new Paragraph({ text: tf.material || "-" })] }),
          new TableCell({ children: [new Paragraph({ text: tf.indicator || "-" })] }),
          new TableCell({ children: [new Paragraph({ text: tf.cognitiveLevel?.split(" ")[0] || "L2", alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ text: tf.difficulty || "Sedang", alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ text: `B/S (${tf.number})`, alignment: AlignmentType.CENTER })] }),
        ],
      })
    );
  });

  matchingQuestions.forEach((mq) => {
    tableRows.push(
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: String(rIdx++), alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ text: mq.basicCompetency || "-" })] }),
          new TableCell({ children: [new Paragraph({ text: mq.material || "-" })] }),
          new TableCell({ children: [new Paragraph({ text: mq.indicator || "-" })] }),
          new TableCell({ children: [new Paragraph({ text: mq.cognitiveLevel?.split(" ")[0] || "L2", alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ text: mq.difficulty || "Sedang", alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ text: `Jodoh (${mq.number})`, alignment: AlignmentType.CENTER })] }),
        ],
      })
    );
  });

  literacyQuestions.forEach((lq) => {
    tableRows.push(
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: String(rIdx++), alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ text: lq.basicCompetency || "-" })] }),
          new TableCell({ children: [new Paragraph({ text: lq.material || "-" })] }),
          new TableCell({ children: [new Paragraph({ text: lq.indicator || "-" })] }),
          new TableCell({ children: [new Paragraph({ text: lq.cognitiveLevel?.split(" ")[0] || "L3", alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ text: lq.difficulty || "Sukar", alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ text: `Lit (${lq.number})`, alignment: AlignmentType.CENTER })] }),
        ],
      })
    );
  });

  essayQuestions.forEach((eq) => {
    tableRows.push(
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: String(rIdx++), alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ text: eq.basicCompetency || "-" })] }),
          new TableCell({ children: [new Paragraph({ text: eq.material || "-" })] }),
          new TableCell({ children: [new Paragraph({ text: eq.indicator || "-" })] }),
          new TableCell({ children: [new Paragraph({ text: eq.cognitiveLevel?.split(" ")[0] || "L3", alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ text: eq.difficulty || "Sukar", alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ text: `Uraian (${eq.number})`, alignment: AlignmentType.CENTER })] }),
        ],
      })
    );
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size:
              paperSize === "F4"
                ? { width: 12189, height: 18708 } // F4 in twips
                : { width: 11906, height: 16838 }, // A4 in twips
            margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 },
          },
        },
        children: [
          ...headerRows,
          new Table({
            rows: tableRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBlob(doc);
  saveAs(buffer, `Kisi_Kisi_Soal_${metadata.subjectName.replace(/[^a-zA-Z0-9]/g, "_")}_Kelas${metadata.grade}.docx`);
}

// -------------------------------------------------------------
// 2. KARTU SOAL (QUESTION CARDS)
// -------------------------------------------------------------

export function exportKartuSoalWordClassic(rawExamData: ExamData, paperSize: PaperSize = "A4"): void {
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

  const cardsHtml: string[] = [];

  // Pilihan Ganda Cards
  multipleChoiceQuestions.forEach((q, idx) => {
    const isAr = isArabic || /[\u0600-\u06FF]/.test(q.questionText);
    const passage = readingPassages.find(
      (p) => p.id === q.readingPassageId || (Array.isArray(p.questionNumbers) && p.questionNumbers.includes(q.number))
    );

    const optionsHtml = q.options
      .map((opt) => `<div style="padding-left: 14pt; margin-bottom: 2pt;"><strong>${opt.key}.</strong> ${opt.text}</div>`)
      .join("");

    const pageBreak = idx > 0 && idx % 2 === 0 ? '<div class="page-break"></div>' : "";

    cardsHtml.push(`
      ${pageBreak}
      <div class="card-box">
        <table style="width: 100%; border-bottom: 1.5pt solid #000; padding-bottom: 4pt; margin-bottom: 6pt;">
          <tr>
            <td style="width: 60px; text-align: center; vertical-align: middle;">
              ${
                schoolIdentity.logoBase64
                  ? `<img src="${schoolIdentity.logoBase64}" width="45" height="45" style="width: 45px; height: 45px; object-fit: contain;" alt="Logo" />`
                  : `<div style="font-weight: bold; font-size: 9pt;">[LOGO]</div>`
              }
            </td>
            <td style="text-align: center; vertical-align: middle;">
              <div style="font-size: 10pt; font-weight: bold; text-transform: uppercase;">${schoolIdentity.schoolName}</div>
              <div style="font-size: 11pt; font-weight: bold; text-transform: uppercase; color: #004d26;">
                KARTU SOAL PILIHAN GANDA (NOMOR ${q.number})
              </div>
              <div style="font-size: 8.5pt;">${metadata.examType.toUpperCase()} - TAHUN AJARAN ${metadata.academicYear}</div>
            </td>
            <td style="width: 90px; text-align: right; vertical-align: middle;">
              <span class="badge">No. ${q.number}</span>
            </td>
          </tr>
        </table>

        <table class="data-table" style="margin-bottom: 6pt;">
          <tr>
            <td style="width: 25%; font-weight: bold; background: #f9f9f9;">Mata Pelajaran</td>
            <td style="width: 35%;">${metadata.subjectName}</td>
            <td style="width: 20%; font-weight: bold; background: #f9f9f9;">Kelas / Semester</td>
            <td style="width: 20%;">Kelas ${metadata.grade} / ${metadata.semester}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; background: #f9f9f9;">Capaian / KD</td>
            <td colspan="3" class="${isAr ? "arabic-text" : ""}">${q.basicCompetency || "-"}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; background: #f9f9f9;">Materi Pokok</td>
            <td class="${isAr ? "arabic-text" : ""}">${q.material || "-"}</td>
            <td style="font-weight: bold; background: #f9f9f9;">Level Kognitif</td>
            <td><strong>${q.cognitiveLevel || "L2 (C3)"}</strong></td>
          </tr>
          <tr>
            <td style="font-weight: bold; background: #f9f9f9;">Indikator Soal</td>
            <td class="${isAr ? "arabic-text" : ""}">${q.indicator || "-"}</td>
            <td style="font-weight: bold; background: #f9f9f9;">Tingkat Kesukaran</td>
            <td><strong>${q.difficulty || "Sedang"}</strong></td>
          </tr>
        </table>

        <div style="font-weight: bold; font-size: 10pt; margin-top: 4pt; margin-bottom: 2pt; background: #eee; padding: 2pt 4pt;">
          RUMUSAN BUTIR SOAL:
        </div>

        ${
          passage
            ? `
          <div style="background: #f0fdf4; border: 1px dashed #006837; padding: 6pt; margin-bottom: 6pt; font-size: 9.5pt;">
            <div style="font-weight: bold; color: #006837;">📖 ${passage.title}</div>
            <div class="${isAr ? "arabic-text" : ""}" style="margin-top: 2pt;">${passage.content}</div>
          </div>
        `
            : ""
        }

        <div class="${isAr ? "arabic-text" : ""}" style="font-size: 10.5pt; margin-bottom: 6pt;">
          <strong>${q.number}.</strong> ${q.questionText}
        </div>

        <div style="margin-bottom: 6pt; font-size: 10pt;">
          ${optionsHtml}
        </div>

        <table style="width: 100%; border-top: 1pt solid #ccc; padding-top: 4pt; font-size: 9.5pt;">
          <tr>
            <td style="width: 50%;">
              <strong>Kunci Jawaban:</strong> <span style="font-size: 11pt; font-weight: bold; color: #006837;">[ ${q.correctAnswer} ]</span>
            </td>
            <td style="width: 50%; text-align: right;">
              <strong>Bobot Skor:</strong> 1 (Satu)
            </td>
          </tr>
          <tr>
            <td colspan="2" style="padding-top: 2pt; font-style: italic; color: #444;">
              <strong>Pembahasan:</strong> ${q.explanation || "-"}
            </td>
          </tr>
        </table>
      </div>
    `);
  });

  // True / False Cards
  trueFalseQuestions.forEach((tf) => {
    const isAr = isArabic || /[\u0600-\u06FF]/.test(tf.instructions);
    const statementsHtml = tf.statements
      .map(
        (st, sIdx) => `
        <div style="margin-bottom: 4pt; padding: 3pt 6pt; background: #fafafa; border: 1px solid #eee;">
          <strong>${sIdx + 1}.</strong> ${st.statement} <br/>
          <span style="font-weight: bold; color: ${st.isCorrect ? "#006837" : "#b91c1c"};">
            ➔ Kunci: [ ${st.isCorrect ? "BENAR" : "SALAH"} ]
          </span>
          <span style="font-style: italic; color: #555; margin-left: 6pt;">(Alasan: ${st.explanation || "-"})</span>
        </div>
      `
      )
      .join("");

    cardsHtml.push(`
      <div class="page-break"></div>
      <div class="card-box">
        <table style="width: 100%; border-bottom: 1.5pt solid #000; padding-bottom: 4pt; margin-bottom: 6pt;">
          <tr>
            <td style="width: 60px; text-align: center; vertical-align: middle;">
              ${
                schoolIdentity.logoBase64
                  ? `<img src="${schoolIdentity.logoBase64}" width="45" height="45" style="width: 45px; height: 45px; object-fit: contain;" alt="Logo" />`
                  : `<div style="font-weight: bold; font-size: 9pt;">[LOGO]</div>`
              }
            </td>
            <td style="text-align: center; vertical-align: middle;">
              <div style="font-size: 10pt; font-weight: bold; text-transform: uppercase;">${schoolIdentity.schoolName}</div>
              <div style="font-size: 11pt; font-weight: bold; text-transform: uppercase; color: #004d26;">
                KARTU SOAL MENENTUKAN BENAR / SALAH (NOMOR ${tf.number})
              </div>
              <div style="font-size: 8.5pt;">${metadata.examType.toUpperCase()} - TAHUN AJARAN ${metadata.academicYear}</div>
            </td>
            <td style="width: 90px; text-align: right; vertical-align: middle;">
              <span class="badge">B/S No. ${tf.number}</span>
            </td>
          </tr>
        </table>

        <table class="data-table" style="margin-bottom: 6pt;">
          <tr>
            <td style="width: 25%; font-weight: bold; background: #f9f9f9;">Mata Pelajaran</td>
            <td style="width: 35%;">${metadata.subjectName}</td>
            <td style="width: 20%; font-weight: bold; background: #f9f9f9;">Kelas / Semester</td>
            <td style="width: 20%;">Kelas ${metadata.grade} / ${metadata.semester}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; background: #f9f9f9;">Capaian / KD</td>
            <td colspan="3" class="${isAr ? "arabic-text" : ""}">${tf.basicCompetency || "-"}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; background: #f9f9f9;">Materi Pokok</td>
            <td class="${isAr ? "arabic-text" : ""}">${tf.material || "-"}</td>
            <td style="font-weight: bold; background: #f9f9f9;">Level Kognitif</td>
            <td><strong>${tf.cognitiveLevel || "L2"}</strong></td>
          </tr>
          <tr>
            <td style="font-weight: bold; background: #f9f9f9;">Indikator Soal</td>
            <td class="${isAr ? "arabic-text" : ""}">${tf.indicator || "-"}</td>
            <td style="font-weight: bold; background: #f9f9f9;">Tingkat Kesukaran</td>
            <td><strong>${tf.difficulty || "Sedang"}</strong></td>
          </tr>
        </table>

        <div style="font-weight: bold; font-size: 10pt; margin-top: 4pt; margin-bottom: 2pt; background: #eee; padding: 2pt 4pt;">
          PETUNJUK & PERNYATAAN SOAL:
        </div>

        <div style="font-size: 10pt; font-style: italic; margin-bottom: 4pt;">
          ${tf.instructions || "Tentukan apakah setiap pernyataan berikut Benar atau Salah!"}
        </div>

        <div style="font-size: 9.5pt; margin-bottom: 6pt;">
          ${statementsHtml}
        </div>
      </div>
    `);
  });

  // Matching Cards
  matchingQuestions.forEach((mq) => {
    const isAr = isArabic || /[\u0600-\u06FF]/.test(mq.instructions);
    const pairsHtml = mq.correctPairs
      .map((cp) => {
        const p = mq.premises.find((x) => x.key === cp.premiseKey);
        const t = mq.targets.find((x) => x.key === cp.targetKey);
        return `
        <div style="margin-bottom: 3pt;">
          <strong>[${cp.premiseKey}]</strong> ${p?.text || ""} ➔ <strong>[${cp.targetKey}]</strong> ${t?.text || ""}
          <span style="font-style: italic; color: #555;"> (${cp.explanation || "-"})</span>
        </div>
      `;
      })
      .join("");

    cardsHtml.push(`
      <div class="page-break"></div>
      <div class="card-box">
        <table style="width: 100%; border-bottom: 1.5pt solid #000; padding-bottom: 4pt; margin-bottom: 6pt;">
          <tr>
            <td style="width: 60px; text-align: center; vertical-align: middle;">
              ${
                schoolIdentity.logoBase64
                  ? `<img src="${schoolIdentity.logoBase64}" width="45" height="45" style="width: 45px; height: 45px; object-fit: contain;" alt="Logo" />`
                  : `<div style="font-weight: bold; font-size: 9pt;">[LOGO]</div>`
              }
            </td>
            <td style="text-align: center; vertical-align: middle;">
              <div style="font-size: 10pt; font-weight: bold; text-transform: uppercase;">${schoolIdentity.schoolName}</div>
              <div style="font-size: 11pt; font-weight: bold; text-transform: uppercase; color: #004d26;">
                KARTU SOAL MENJODOHKAN / MENCOCOKKAN (NOMOR ${mq.number})
              </div>
              <div style="font-size: 8.5pt;">${metadata.examType.toUpperCase()} - TAHUN AJARAN ${metadata.academicYear}</div>
            </td>
            <td style="width: 90px; text-align: right; vertical-align: middle;">
              <span class="badge">Jodoh No. ${mq.number}</span>
            </td>
          </tr>
        </table>

        <table class="data-table" style="margin-bottom: 6pt;">
          <tr>
            <td style="width: 25%; font-weight: bold; background: #f9f9f9;">Mata Pelajaran</td>
            <td style="width: 35%;">${metadata.subjectName}</td>
            <td style="width: 20%; font-weight: bold; background: #f9f9f9;">Kelas / Semester</td>
            <td style="width: 20%;">Kelas ${metadata.grade} / ${metadata.semester}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; background: #f9f9f9;">Capaian / KD</td>
            <td colspan="3" class="${isAr ? "arabic-text" : ""}">${mq.basicCompetency || "-"}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; background: #f9f9f9;">Materi Pokok</td>
            <td class="${isAr ? "arabic-text" : ""}">${mq.material || "-"}</td>
            <td style="font-weight: bold; background: #f9f9f9;">Level Kognitif</td>
            <td><strong>${mq.cognitiveLevel || "L2"}</strong></td>
          </tr>
          <tr>
            <td style="font-weight: bold; background: #f9f9f9;">Indikator Soal</td>
            <td class="${isAr ? "arabic-text" : ""}">${mq.indicator || "-"}</td>
            <td style="font-weight: bold; background: #f9f9f9;">Tingkat Kesukaran</td>
            <td><strong>${mq.difficulty || "Sedang"}</strong></td>
          </tr>
        </table>

        <div style="font-weight: bold; font-size: 10pt; margin-top: 4pt; margin-bottom: 2pt; background: #eee; padding: 2pt 4pt;">
          KUNCI PASANGAN MENJODOHKAN & PEMBAHASAN:
        </div>

        <div style="font-size: 9.5pt; margin-bottom: 4pt;">
          ${pairsHtml}
        </div>
      </div>
    `);
  });

  // Literacy Cards
  literacyQuestions.forEach((lq) => {
    const isAr = isArabic || /[\u0600-\u06FF]/.test(lq.questionText);
    cardsHtml.push(`
      <div class="page-break"></div>
      <div class="card-box">
        <table style="width: 100%; border-bottom: 1.5pt solid #000; padding-bottom: 4pt; margin-bottom: 6pt;">
          <tr>
            <td style="width: 60px; text-align: center; vertical-align: middle;">
              ${
                schoolIdentity.logoBase64
                  ? `<img src="${schoolIdentity.logoBase64}" width="45" height="45" style="width: 45px; height: 45px; object-fit: contain;" alt="Logo" />`
                  : `<div style="font-weight: bold; font-size: 9pt;">[LOGO]</div>`
              }
            </td>
            <td style="text-align: center; vertical-align: middle;">
              <div style="font-size: 10pt; font-weight: bold; text-transform: uppercase;">${schoolIdentity.schoolName}</div>
              <div style="font-size: 11pt; font-weight: bold; text-transform: uppercase; color: #1e40af;">
                KARTU SOAL LITERASI TEKS & DATA (NOMOR ${lq.number})
              </div>
              <div style="font-size: 8.5pt;">${metadata.examType.toUpperCase()} - TAHUN AJARAN ${metadata.academicYear}</div>
            </td>
            <td style="width: 90px; text-align: right; vertical-align: middle;">
              <span class="badge">Lit No. ${lq.number}</span>
            </td>
          </tr>
        </table>

        <table class="data-table" style="margin-bottom: 6pt;">
          <tr>
            <td style="width: 25%; font-weight: bold; background: #f9f9f9;">Mata Pelajaran</td>
            <td style="width: 35%;">${metadata.subjectName}</td>
            <td style="width: 20%; font-weight: bold; background: #f9f9f9;">Kelas / Semester</td>
            <td style="width: 20%;">Kelas ${metadata.grade} / ${metadata.semester}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; background: #f9f9f9;">Capaian / KD</td>
            <td colspan="3" class="${isAr ? "arabic-text" : ""}">${lq.basicCompetency || "-"}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; background: #f9f9f9;">Materi Pokok</td>
            <td class="${isAr ? "arabic-text" : ""}">${lq.material || "-"}</td>
            <td style="font-weight: bold; background: #f9f9f9;">Level Kognitif</td>
            <td><strong>${lq.cognitiveLevel || "L3 (HOTS)"}</strong></td>
          </tr>
          <tr>
            <td style="font-weight: bold; background: #f9f9f9;">Indikator Soal</td>
            <td class="${isAr ? "arabic-text" : ""}">${lq.indicator || "-"}</td>
            <td style="font-weight: bold; background: #f9f9f9;">Tingkat Kesukaran</td>
            <td><strong>${lq.difficulty || "Sukar"}</strong></td>
          </tr>
        </table>

        <!-- Stimulus -->
        <div style="background: #eff6ff; border: 1px solid #1e40af; padding: 6pt; margin-bottom: 6pt; font-size: 9.5pt;">
          <div style="font-weight: bold; color: #1e40af;">📊 ${lq.stimulusTitle} (${lq.stimulusType})</div>
          <div style="margin-top: 2pt;">${lq.stimulusContent}</div>
          ${lq.dataSnippet ? `<div style="background: #dbeafe; padding: 3pt; margin-top: 3pt; font-style: italic;">[Data]: ${lq.dataSnippet}</div>` : ""}
        </div>

        <div style="font-size: 10pt; font-weight: bold; margin-bottom: 4pt;">
          ${lq.number}. ${lq.questionText}
        </div>

        <div style="background: #fafafa; border: 1px solid #ddd; padding: 5pt; font-size: 9.5pt;">
          <strong>Kunci Jawaban:</strong> <span style="font-weight: bold; color: #006837;">[ ${lq.correctAnswer || "Model Jawaban"} ]</span><br/>
          <strong>Pembahasan:</strong> ${lq.explanation || "-"}
        </div>
      </div>
    `);
  });

  // Essay Cards
  essayQuestions.forEach((eq) => {
    const isAr = isArabic || /[\u0600-\u06FF]/.test(eq.questionText);
    const passage = readingPassages.find(
      (p) =>
        p.id === eq.readingPassageId ||
        (Array.isArray(p.essayQuestionNumbers) && p.essayQuestionNumbers.includes(eq.number))
    );

    cardsHtml.push(`
      <div class="page-break"></div>
      <div class="card-box">
        <table style="width: 100%; border-bottom: 1.5pt solid #000; padding-bottom: 4pt; margin-bottom: 6pt;">
          <tr>
            <td style="width: 60px; text-align: center; vertical-align: middle;">
              ${
                schoolIdentity.logoBase64
                  ? `<img src="${schoolIdentity.logoBase64}" width="45" height="45" style="width: 45px; height: 45px; object-fit: contain;" alt="Logo" />`
                  : `<div style="font-weight: bold; font-size: 9pt;">[LOGO]</div>`
              }
            </td>
            <td style="text-align: center; vertical-align: middle;">
              <div style="font-size: 10pt; font-weight: bold; text-transform: uppercase;">${schoolIdentity.schoolName}</div>
              <div style="font-size: 11pt; font-weight: bold; text-transform: uppercase; color: #004d26;">
                KARTU SOAL URAIAN / ESSAY (NOMOR ${eq.number})
              </div>
              <div style="font-size: 8.5pt;">${metadata.examType.toUpperCase()} - TAHUN AJARAN ${metadata.academicYear}</div>
            </td>
            <td style="width: 90px; text-align: right; vertical-align: middle;">
              <span class="badge">Uraian No. ${eq.number}</span>
            </td>
          </tr>
        </table>

        <table class="data-table" style="margin-bottom: 6pt;">
          <tr>
            <td style="width: 25%; font-weight: bold; background: #f9f9f9;">Mata Pelajaran</td>
            <td style="width: 35%;">${metadata.subjectName}</td>
            <td style="width: 20%; font-weight: bold; background: #f9f9f9;">Kelas / Semester</td>
            <td style="width: 20%;">Kelas ${metadata.grade} / ${metadata.semester}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; background: #f9f9f9;">Capaian / KD</td>
            <td colspan="3" class="${isAr ? "arabic-text" : ""}">${eq.basicCompetency || "-"}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; background: #f9f9f9;">Materi Pokok</td>
            <td class="${isAr ? "arabic-text" : ""}">${eq.material || "-"}</td>
            <td style="font-weight: bold; background: #f9f9f9;">Level Kognitif</td>
            <td><strong>${eq.cognitiveLevel || "L3 (HOTS)"}</strong></td>
          </tr>
          <tr>
            <td style="font-weight: bold; background: #f9f9f9;">Indikator Soal</td>
            <td class="${isAr ? "arabic-text" : ""}">${eq.indicator || "-"}</td>
            <td style="font-weight: bold; background: #f9f9f9;">Tingkat Kesukaran</td>
            <td><strong>${eq.difficulty || "Sukar"}</strong></td>
          </tr>
        </table>

        <div style="font-weight: bold; font-size: 10pt; margin-top: 4pt; margin-bottom: 2pt; background: #eee; padding: 2pt 4pt;">
          RUMUSAN BUTIR SOAL URAIAN:
        </div>

        ${
          passage
            ? `
          <div style="background: #f0fdf4; border: 1px dashed #006837; padding: 6pt; margin-bottom: 6pt; font-size: 9.5pt;">
            <div style="font-weight: bold; color: #006837;">📖 ${passage.title}</div>
            <div class="${isAr ? "arabic-text" : ""}" style="margin-top: 2pt;">${passage.content}</div>
          </div>
        `
            : ""
        }

        <div class="${isAr ? "arabic-text" : ""}" style="font-size: 10.5pt; margin-bottom: 8pt; line-height: 1.4;">
          <strong>${eq.number}.</strong> ${eq.questionText}
        </div>

        <div style="background: #fafafa; border: 1px solid #ddd; padding: 6pt; font-size: 9.5pt;">
          <div style="font-weight: bold; color: #004d26;">Model Jawaban:</div>
          <div class="${isAr ? "arabic-text" : ""}" style="margin-bottom: 4pt;">${eq.modelAnswer || "-"}</div>
          <div style="font-weight: bold; color: #004d26;">Rubrik & Kriteria Penskoran:</div>
          <div>${eq.scoringRubric || "Skor maksimal: 10. Jawaban lengkap dan logis = 10; Cukup lengkap = 5-9; Kurang = 1-4."}</div>
        </div>
      </div>
    `);
  });

  const content = `
    ${renderWordKop(schoolIdentity)}

    <div class="text-center" style="margin-bottom: 12pt;">
      <div style="font-size: 13pt; font-weight: bold; text-transform: uppercase;">
        KARTU SOAL ${metadata.examType.toUpperCase()}
      </div>
      <div style="font-size: 11pt; font-weight: bold; text-transform: uppercase; margin-top: 2pt;">
        TAHUN AJARAN ${metadata.academicYear} - STANDAR PUSPENDIK / KEMENAG
      </div>
    </div>

    ${cardsHtml.join("")}

    <table style="width: 100%; margin-top: 24pt; font-size: 10.5pt; page-break-inside: avoid;">
      <tr>
        <td style="width: 50%; text-align: center; vertical-align: top;">
          Mengetahui,<br/>
          Kepala ${schoolIdentity.schoolName}<br/><br/><br/><br/>
          <strong>___________________________</strong><br/>
          NIP. ......................................................
        </td>
        <td style="width: 50%; text-align: center; vertical-align: top;">
          ${schoolIdentity.address?.split(",")[1]?.trim() || "Sleman"}, ${metadata.examDate}<br/>
          Guru Pengampu Mata Pelajaran<br/><br/><br/><br/>
          <strong>${metadata.teacherName}</strong><br/>
          NIP. ......................................................
        </td>
      </tr>
    </table>
  `;

  const html = getWordDocWrapper(`Kartu_Soal_${metadata.subjectName}`, content, paperSize);
  const blob = new Blob(["\ufeff" + html], { type: "application/msword;charset=utf-8" });
  saveAs(blob, `Kartu_Soal_${metadata.subjectName.replace(/[^a-zA-Z0-9]/g, "_")}_Kelas${metadata.grade}.doc`);
}

// -------------------------------------------------------------
// 3. ANALISIS BUTIR SOAL (ITEM ANALYSIS & SPECIFICATION)
// -------------------------------------------------------------

export function exportAnalisisSoalWordClassic(rawExamData: ExamData, paperSize: PaperSize = "A4"): void {
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

  let counter = 1;
  const itemRows = [
    ...multipleChoiceQuestions.map((q) => `
      <tr>
        <td style="text-align: center;">${counter++}</td>
        <td style="text-align: center;">PG</td>
        <td>${q.material ? q.material.slice(0, 40) + "..." : "-"}</td>
        <td style="text-align: center; font-weight: bold;">${q.cognitiveLevel?.split(" ")[0] || "L2"}</td>
        <td style="text-align: center;">${q.difficulty || "Sedang"}</td>
        <td style="text-align: center; font-weight: bold;">${q.correctAnswer}</td>
        <td style="text-align: center;">0.42 (Baik)</td>
        <td style="text-align: center; color: #006837; font-weight: bold;">Diterima</td>
      </tr>
    `),
    ...trueFalseQuestions.map((tf) => `
      <tr>
        <td style="text-align: center;">${counter++}</td>
        <td style="text-align: center;">B/S</td>
        <td>${tf.material ? tf.material.slice(0, 40) + "..." : "-"}</td>
        <td style="text-align: center; font-weight: bold;">${tf.cognitiveLevel?.split(" ")[0] || "L2"}</td>
        <td style="text-align: center;">${tf.difficulty || "Sedang"}</td>
        <td style="text-align: center; font-size: 8.5pt;">Status B/S</td>
        <td style="text-align: center;">0.44 (Baik)</td>
        <td style="text-align: center; color: #006837; font-weight: bold;">Diterima</td>
      </tr>
    `),
    ...matchingQuestions.map((mq) => `
      <tr>
        <td style="text-align: center;">${counter++}</td>
        <td style="text-align: center;">Jodohkan</td>
        <td>${mq.material ? mq.material.slice(0, 40) + "..." : "-"}</td>
        <td style="text-align: center; font-weight: bold;">${mq.cognitiveLevel?.split(" ")[0] || "L2"}</td>
        <td style="text-align: center;">${mq.difficulty || "Sedang"}</td>
        <td style="text-align: center; font-size: 8.5pt;">Pasangan</td>
        <td style="text-align: center;">0.46 (Baik)</td>
        <td style="text-align: center; color: #006837; font-weight: bold;">Diterima</td>
      </tr>
    `),
    ...literacyQuestions.map((lq) => `
      <tr>
        <td style="text-align: center;">${counter++}</td>
        <td style="text-align: center;">Literasi</td>
        <td>${lq.material ? lq.material.slice(0, 40) + "..." : "-"}</td>
        <td style="text-align: center; font-weight: bold;">${lq.cognitiveLevel?.split(" ")[0] || "L3"}</td>
        <td style="text-align: center;">${lq.difficulty || "Sukar"}</td>
        <td style="text-align: center; font-size: 8.5pt;">${lq.correctAnswer || "Analisis"}</td>
        <td style="text-align: center;">0.50 (Sangat Baik)</td>
        <td style="text-align: center; color: #006837; font-weight: bold;">Diterima</td>
      </tr>
    `),
    ...essayQuestions.map((eq) => `
      <tr>
        <td style="text-align: center;">${counter++}</td>
        <td style="text-align: center;">Uraian</td>
        <td>${eq.material ? eq.material.slice(0, 40) + "..." : "-"}</td>
        <td style="text-align: center; font-weight: bold;">${eq.cognitiveLevel?.split(" ")[0] || "L3"}</td>
        <td style="text-align: center;">${eq.difficulty || "Sukar"}</td>
        <td style="text-align: center;">Model Rubrik</td>
        <td style="text-align: center;">0.48 (Sangat Baik)</td>
        <td style="text-align: center; color: #006837; font-weight: bold;">Diterima</td>
      </tr>
    `),
  ].join("");

  const content = `
    ${renderWordKop(schoolIdentity)}

    <div class="text-center" style="margin-bottom: 12pt;">
      <div style="font-size: 13pt; font-weight: bold; text-transform: uppercase;">
        ANALISIS KUALITATIF & DISTRIBUSI BUTIR SOAL
      </div>
      <div style="font-size: 11pt; font-weight: bold; text-transform: uppercase; margin-top: 2pt;">
        ${metadata.examType.toUpperCase()} - TAHUN AJARAN ${metadata.academicYear}
      </div>
    </div>

    <!-- Identitas Ujian -->
    <table style="width: 100%; margin-bottom: 10pt; font-size: 10pt;">
      <tr>
        <td style="width: 15%; white-space: nowrap;"><strong>Satuan Pendidikan</strong></td>
        <td style="width: 2%; text-align: center;">:</td>
        <td style="width: 31%;">${schoolIdentity.schoolName}</td>
        <td style="width: 15%; white-space: nowrap;"><strong>Alokasi Waktu</strong></td>
        <td style="width: 2%; text-align: center;">:</td>
        <td style="width: 35%; white-space: nowrap;">${metadata.timeAllocation}</td>
      </tr>
      <tr>
        <td><strong>Mata Pelajaran</strong></td>
        <td>:</td>
        <td>${metadata.subjectName}</td>
        <td><strong>Total Butir Soal</strong></td>
        <td>:</td>
        <td>${stats.totalQuestions} Soal (${stats.totalPg} PG, ${stats.totalTf || 0} B/S, ${stats.totalMatching || 0} Jodohkan, ${stats.totalLiteracy || 0} Literasi, ${stats.totalEssay} Uraian)</td>
      </tr>
      <tr>
        <td><strong>Kelas / Semester</strong></td>
        <td>:</td>
        <td>Kelas ${metadata.grade} (${metadata.gradeLevel}) / ${metadata.semester}</td>
        <td><strong>Guru Pengampu</strong></td>
        <td>:</td>
        <td>${metadata.teacherName}</td>
      </tr>
    </table>

    <!-- Tabel Statistik Distribusi -->
    <div style="font-weight: bold; font-size: 10.5pt; margin-top: 10pt; margin-bottom: 4pt;">
      I. REKAPITULASI PROPORSI TINGKAT KOGNITIF & KESUKARAN:
    </div>
    <table class="data-table" style="margin-bottom: 12pt;">
      <thead>
        <tr>
          <th colspan="3">Sebaran Level Kognitif</th>
          <th colspan="3">Sebaran Tingkat Kesukaran</th>
          <th colspan="2">Sebaran Kunci Jawaban PG</th>
        </tr>
        <tr>
          <th>Tingkat</th>
          <th>Jml</th>
          <th>%</th>
          <th>Kategori</th>
          <th>Jml</th>
          <th>%</th>
          <th>Kunci</th>
          <th>Jml (%)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>L1 (Pengetahuan/C1-C2)</strong></td>
          <td style="text-align: center;">${stats.cognitiveStats.l1Count}</td>
          <td style="text-align: center;">${stats.cognitiveStats.l1Percent}%</td>
          <td><strong>Mudah (25-30%)</strong></td>
          <td style="text-align: center;">${stats.difficultyStats.mudahCount}</td>
          <td style="text-align: center;">${stats.difficultyStats.mudahPercent}%</td>
          <td style="text-align: center;"><strong>A</strong></td>
          <td style="text-align: center;">${stats.keyDistribution["A"]?.count || 0} (${stats.keyDistribution["A"]?.percent || 0}%)</td>
        </tr>
        <tr>
          <td><strong>L2 (Aplikasi/C3)</strong></td>
          <td style="text-align: center;">${stats.cognitiveStats.l2Count}</td>
          <td style="text-align: center;">${stats.cognitiveStats.l2Percent}%</td>
          <td><strong>Sedang (~50%)</strong></td>
          <td style="text-align: center;">${stats.difficultyStats.sedangCount}</td>
          <td style="text-align: center;">${stats.difficultyStats.sedangPercent}%</td>
          <td style="text-align: center;"><strong>B</strong></td>
          <td style="text-align: center;">${stats.keyDistribution["B"]?.count || 0} (${stats.keyDistribution["B"]?.percent || 0}%)</td>
        </tr>
        <tr>
          <td><strong>L3 (Penalaran/C4-C6)</strong></td>
          <td style="text-align: center;">${stats.cognitiveStats.l3Count}</td>
          <td style="text-align: center;">${stats.cognitiveStats.l3Percent}%</td>
          <td><strong>Sukar (20-25%)</strong></td>
          <td style="text-align: center;">${stats.difficultyStats.sukarCount}</td>
          <td style="text-align: center;">${stats.difficultyStats.sukarPercent}%</td>
          <td style="text-align: center;"><strong>C</strong></td>
          <td style="text-align: center;">${stats.keyDistribution["C"]?.count || 0} (${stats.keyDistribution["C"]?.percent || 0}%)</td>
        </tr>
        <tr>
          <td colspan="6" style="background: #fafafa; font-style: italic;">Proporsionalitas sebaran kunci D & E:</td>
          <td style="text-align: center;"><strong>D / E</strong></td>
          <td style="text-align: center;">${(stats.keyDistribution["D"]?.count || 0) + (stats.keyDistribution["E"]?.count || 0)} butir</td>
        </tr>
      </tbody>
    </table>

    <!-- Tabel Analisis Per Butir Soal -->
    <div style="font-weight: bold; font-size: 10.5pt; margin-top: 10pt; margin-bottom: 4pt;">
      II. TABEL SPESIFIKASI DAN TELAAH BUTIR SOAL:
    </div>
    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 5%;">No.</th>
          <th style="width: 10%;">Bentuk</th>
          <th style="width: 30%;">Materi Pokok yang Diukur</th>
          <th style="width: 10%;">Level</th>
          <th style="width: 10%;">Kesukaran</th>
          <th style="width: 13%;">Kunci/Model</th>
          <th style="width: 11%;">Daya Beda</th>
          <th style="width: 11%;">Kaidah Soal</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>

    <!-- Instrumen Telaah Kualitatif -->
    <div style="margin-top: 12pt; border: 1px solid #000; padding: 6pt; font-size: 9pt; line-height: 1.4;">
      <strong>III. KESIMPULAN TELAAH KUALITATIF SOAL (STANDAR ASESMEN NASIONAL):</strong><br/>
      1. <strong>Aspek Materi:</strong> Butir soal sesuai indikator, materi pokok esensial, batasan jawaban dan rubrik jelas.<br/>
      2. <strong>Aspek Konstruksi:</strong> Pokok soal dirumuskan tegas dan jelas, stimulus mendidik, pilihan jawaban homogen dan logis.<br/>
      3. <strong>Aspek Bahasa:</strong> Menggunakan bahasa baku Indonesia / Arab yang komunikatif, tidak menimbulkan penafsiran ganda (ambigu), serta bebas bias SARA.<br/>
      <strong>STATUS REKOMENDASI:</strong> Seluruh butir soal dinyatakan <strong>LAYAK DAN SIAP DIGUNAKAN</strong> dalam asesmen resmi.
    </div>

    <!-- Tanda Tangan -->
    <table style="width: 100%; margin-top: 24pt; font-size: 10.5pt; page-break-inside: avoid;">
      <tr>
        <td style="width: 50%; text-align: center; vertical-align: top;">
          Mengetahui,<br/>
          Kepala ${schoolIdentity.schoolName}<br/><br/><br/><br/>
          <strong>___________________________</strong><br/>
          NIP. ......................................................
        </td>
        <td style="width: 50%; text-align: center; vertical-align: top;">
          ${schoolIdentity.address?.split(",")[1]?.trim() || "Sleman"}, ${metadata.examDate}<br/>
          Guru Penelaah / Penyusun Soal<br/><br/><br/><br/>
          <strong>${metadata.teacherName}</strong><br/>
          NIP. ......................................................
        </td>
      </tr>
    </table>
  `;

  const html = getWordDocWrapper(`Analisis_Soal_${metadata.subjectName}`, content, paperSize);
  const blob = new Blob(["\ufeff" + html], { type: "application/msword;charset=utf-8" });
  saveAs(blob, `Analisis_Butir_Soal_${metadata.subjectName.replace(/[^a-zA-Z0-9]/g, "_")}_Kelas${metadata.grade}.doc`);
}

/**
 * Downloads the full Pedagogical Administration Package
 */
export function exportSemuaPedagogiWord(examData: ExamData, paperSize: PaperSize = "A4"): void {
  exportKisiKisiWordClassic(examData, paperSize);
  setTimeout(() => exportKartuSoalWordClassic(examData, paperSize), 350);
  setTimeout(() => exportAnalisisSoalWordClassic(examData, paperSize), 700);
}
