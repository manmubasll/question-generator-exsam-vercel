import { saveAs } from "file-saver";
import { ExamData, PaperSize, SchoolIdentity } from "../types";

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
      font-size: 10pt;
    }
    table.data-table th {
      background-color: #f2f2f2;
      font-weight: bold;
      text-align: center;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .font-bold { font-weight: bold; }
    .font-italic { font-style: italic; }
    .page-break {
      page-break-before: always;
      mso-break-type: section-break;
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

/**
 * 1. Export Rekap Nilai Siswa (Word 2007+ .doc)
 */
export function exportRekapNilaiWordClassic(examData: ExamData, paperSize: PaperSize = "A4"): void {
  const { schoolIdentity, metadata } = examData;

  // Generate 25 sample rows for teachers to input/edit
  const studentRows = Array.from({ length: 25 }, (_, i) => {
    const num = i + 1;
    const nisn = `00${78000000 + num * 37}`;
    return `
    <tr>
      <td style="text-align: center;">${num}</td>
      <td style="text-align: center;">${metadata.grade}-${String(num).padStart(3, "0")}</td>
      <td style="text-align: center;">${nisn}</td>
      <td>Peserta Didik ${num}</td>
      <td style="text-align: center;"></td>
      <td style="text-align: center;"></td>
      <td style="text-align: center; font-weight: bold;"></td>
      <td style="text-align: center;"></td>
      <td style="text-align: center;"></td>
    </tr>
    `;
  }).join("");

  const content = `
    ${renderWordKop(schoolIdentity)}

    <div class="text-center" style="margin-bottom: 10pt;">
      <div style="font-size: 12.5pt; font-weight: bold; text-transform: uppercase;">
        REKAPITULASI NILAI ${metadata.examType.toUpperCase()}
      </div>
      <div style="font-size: 11pt; font-weight: bold; text-transform: uppercase; margin-top: 2pt;">
        TAHUN AJARAN ${metadata.academicYear}
      </div>
    </div>

    <table style="width: 100%; margin-bottom: 8pt; font-size: 10pt;">
      <tr>
        <td style="width: 50%;">
          <strong>Mata Pelajaran:</strong> ${metadata.subjectName}<br/>
          <strong>Kelas / Jenjang:</strong> Kelas ${metadata.grade} (${metadata.gradeLevel})<br/>
          <strong>Semester:</strong> ${metadata.semester}
        </td>
        <td style="width: 50%;">
          <strong>Hari / Tanggal:</strong> ${metadata.examDate}<br/>
          <strong>KKM / Kriteria Ketuntasan:</strong> 75<br/>
          <strong>Guru Pengampu:</strong> ${metadata.teacherName}
        </td>
      </tr>
    </table>

    <table class="data-table" style="margin-top: 6pt;">
      <thead>
        <tr>
          <th style="width: 5%;">No</th>
          <th style="width: 12%;">No. Peserta</th>
          <th style="width: 14%;">NIS / NISN</th>
          <th style="width: 31%; text-align: left;">Nama Peserta Didik</th>
          <th style="width: 8%;">Nilai PG</th>
          <th style="width: 8%;">Nilai Essay</th>
          <th style="width: 8%;">Nilai Akhir</th>
          <th style="width: 6%;">Predikat</th>
          <th style="width: 8%;">Ket.</th>
        </tr>
      </thead>
      <tbody>
        ${studentRows}
      </tbody>
    </table>

    <div style="margin-top: 8pt; font-size: 9.5pt;">
      <em>* Keterangan: T = Tuntas (≥ 75), TT = Tidak Tuntas (&lt; 75). Predikat: A (90-100), B (80-89), C (75-79), D (&lt; 75).</em>
    </div>

    <!-- Tanda Tangan -->
    <table style="width: 100%; margin-top: 24pt; font-size: 10.5pt;">
      <tr>
        <td style="width: 50%; text-align: center; vertical-align: top;">
          Mengetahui,<br/>
          Kepala Madrasah / Sekolah<br/><br/><br/><br/>
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

  const html = getWordDocWrapper(`Rekap_Nilai_${metadata.subjectName}`, content, paperSize);
  const blob = new Blob(["\ufeff" + html], { type: "application/msword;charset=utf-8" });
  saveAs(blob, `Rekap_Nilai_${metadata.subjectName.replace(/[^a-zA-Z0-9]/g, "_")}_Kelas${metadata.grade}_Word2007.doc`);
}

/**
 * 2. Export Berita Acara Ujian (Word 2007+ .doc)
 */
export function exportBeritaAcaraWordClassic(examData: ExamData, paperSize: PaperSize = "A4"): void {
  const { schoolIdentity, metadata } = examData;

  const content = `
    ${renderWordKop(schoolIdentity)}

    <div class="text-center" style="margin-bottom: 12pt;">
      <div style="font-size: 13pt; font-weight: bold; text-transform: uppercase; text-decoration: underline;">
        BERITA ACARA PELAKSANAAN UJIAN
      </div>
      <div style="font-size: 10.5pt; font-weight: bold; text-transform: uppercase; margin-top: 2pt;">
        ${metadata.examType.toUpperCase()} TAHUN AJARAN ${metadata.academicYear}
      </div>
    </div>

    <div style="font-size: 10.5pt; text-align: justify; line-height: 1.5;">
      Pada hari ini <strong>${metadata.examDate}</strong>, bertempat di <strong>${schoolIdentity.schoolName}</strong>, 
      telah diselenggarakan pelaksanaan <strong>${metadata.examType}</strong> Tahun Ajaran <strong>${metadata.academicYear}</strong> 
      untuk mata pelajaran:
    </div>

    <table style="width: 90%; margin: 8pt auto; font-size: 10.5pt;">
      <tr>
        <td style="width: 32%;">Mata Pelajaran</td>
        <td style="width: 4%;">:</td>
        <td style="width: 64%;"><strong>${metadata.subjectName}</strong></td>
      </tr>
      <tr>
        <td>Tingkat / Kelas</td>
        <td>:</td>
        <td>Kelas ${metadata.grade} (${metadata.gradeLevel})</td>
      </tr>
      <tr>
        <td>Alokasi Waktu</td>
        <td>:</td>
        <td>${metadata.timeAllocation}</td>
      </tr>
      <tr>
        <td>Ruang Ujian</td>
        <td>:</td>
        <td>Ruang ...........</td>
      </tr>
    </table>

    <div style="font-size: 10.5pt; font-weight: bold; margin-top: 10pt; margin-bottom: 4pt;">
      I. DATA KEHADIRAN PESERTA UJIAN:
    </div>
    <table class="data-table" style="margin-bottom: 8pt;">
      <thead>
        <tr>
          <th>No</th>
          <th>Uraian</th>
          <th>Jumlah</th>
          <th>Keterangan / Nomor Peserta</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="text-align: center;">1</td>
          <td>Jumlah Peserta Terdaftar (Seharusnya)</td>
          <td style="text-align: center;">........ Orang</td>
          <td>Terdaftar resmi dalam DNT</td>
        </tr>
        <tr>
          <td style="text-align: center;">2</td>
          <td>Jumlah Peserta yang Hadir</td>
          <td style="text-align: center;">........ Orang</td>
          <td>Mengikuti ujian dengan tertib</td>
        </tr>
        <tr>
          <td style="text-align: center;">3</td>
          <td>Jumlah Peserta yang Tidak Hadir</td>
          <td style="text-align: center;">........ Orang</td>
          <td>Sakit: ....., Izin: ....., Alpa: .....</td>
        </tr>
      </tbody>
    </table>

    <div style="font-size: 10.5pt; font-weight: bold; margin-top: 10pt; margin-bottom: 4pt;">
      II. CATATAN KHUSUS SELAMA UJIAN BERLANGSUNG:
    </div>
    <div style="border: 1px solid #000; padding: 8pt; font-size: 10pt; min-height: 50pt; line-height: 1.4;">
      1. Sampul naskah soal dalam keadaan <strong>[ BAIK / BERSEGEL UTUH ]</strong> sebelum dibuka di hadapan peserta.<br/>
      2. Jumlah lembar soal dan lembar jawaban diterima dalam kondisi <strong>[ LENGKAP & CUKUP ]</strong>.<br/>
      3. Pelaksanaan ujian berlangsung dengan <strong>[ TERTIB, AMAN, DAN LANCAR ]</strong> tanpa hambatan berarti.<br/>
      4. Catatan lain: ....................................................................................................................................
    </div>

    <div style="font-size: 10.5pt; margin-top: 10pt;">
      Demikian Berita Acara ini dibuat dengan sebenarnya sesuai pelaksanaan di ruang ujian untuk dapat dipergunakan sebagaimana mestinya.
    </div>

    <!-- Tanda Tangan -->
    <table style="width: 100%; margin-top: 20pt; font-size: 10.5pt;">
      <tr>
        <td style="width: 50%; text-align: center; vertical-align: top;">
          Pengawas I<br/><br/><br/><br/>
          <strong>___________________________</strong><br/>
          NIP. ......................................................
        </td>
        <td style="width: 50%; text-align: center; vertical-align: top;">
          Pengawas II<br/><br/><br/><br/>
          <strong>___________________________</strong><br/>
          NIP. ......................................................
        </td>
      </tr>
      <tr>
        <td colspan="2" style="text-align: center; padding-top: 20pt;">
          Mengetahui,<br/>
          Kepala ${schoolIdentity.schoolName}<br/><br/><br/><br/>
          <strong>___________________________</strong><br/>
          NIP. ......................................................
        </td>
      </tr>
    </table>
  `;

  const html = getWordDocWrapper(`Berita_Acara_${metadata.subjectName}`, content, paperSize);
  const blob = new Blob(["\ufeff" + html], { type: "application/msword;charset=utf-8" });
  saveAs(blob, `Berita_Acara_Ujian_${metadata.subjectName.replace(/[^a-zA-Z0-9]/g, "_")}_Word2007.doc`);
}

/**
 * 3. Export Daftar Hadir Siswa (Word 2007+ .doc)
 */
export function exportDaftarHadirWordClassic(examData: ExamData, paperSize: PaperSize = "A4"): void {
  const { schoolIdentity, metadata } = examData;

  const rows = Array.from({ length: 25 }, (_, i) => {
    const num = i + 1;
    const isOdd = num % 2 !== 0;
    const nisn = `00${78000000 + num * 43}`;
    return `
    <tr>
      <td style="text-align: center;">${num}</td>
      <td style="text-align: center;">${metadata.grade}-${String(num).padStart(3, "0")}</td>
      <td style="text-align: center;">${nisn}</td>
      <td>Peserta Didik ${num}</td>
      <td style="text-align: center;">${num % 2 === 0 ? "P" : "L"}</td>
      <td style="padding-left: ${isOdd ? "4pt" : "20pt"}; font-size: 8.5pt;">${num}. ..........</td>
      <td></td>
    </tr>
    `;
  }).join("");

  const content = `
    ${renderWordKop(schoolIdentity)}

    <div class="text-center" style="margin-bottom: 10pt;">
      <div style="font-size: 12.5pt; font-weight: bold; text-transform: uppercase;">
        DAFTAR HADIR PESERTA ${metadata.examType.toUpperCase()}
      </div>
      <div style="font-size: 11pt; font-weight: bold; text-transform: uppercase; margin-top: 2pt;">
        TAHUN AJARAN ${metadata.academicYear}
      </div>
    </div>

    <table style="width: 100%; margin-bottom: 8pt; font-size: 10pt;">
      <tr>
        <td style="width: 50%;">
          <strong>Mata Pelajaran:</strong> ${metadata.subjectName}<br/>
          <strong>Kelas / Jenjang:</strong> Kelas ${metadata.grade} (${metadata.gradeLevel})<br/>
          <strong>Semester:</strong> ${metadata.semester}
        </td>
        <td style="width: 50%;">
          <strong>Hari / Tanggal:</strong> ${metadata.examDate}<br/>
          <strong>Waktu:</strong> ${metadata.timeAllocation}<br/>
          <strong>Ruang:</strong> Ruang ..........
        </td>
      </tr>
    </table>

    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 5%;">No</th>
          <th style="width: 14%;">No. Peserta</th>
          <th style="width: 16%;">NISN</th>
          <th style="width: 32%; text-align: left;">Nama Lengkap Siswa</th>
          <th style="width: 6%;">L/P</th>
          <th style="width: 18%;">Tanda Tangan</th>
          <th style="width: 9%;">Ket.</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    <!-- Tanda Tangan Pengawas -->
    <table style="width: 100%; margin-top: 20pt; font-size: 10.5pt;">
      <tr>
        <td style="width: 50%; text-align: center; vertical-align: top;">
          Pengawas I<br/><br/><br/><br/>
          <strong>___________________________</strong><br/>
          NIP. ......................................................
        </td>
        <td style="width: 50%; text-align: center; vertical-align: top;">
          Pengawas II<br/><br/><br/><br/>
          <strong>___________________________</strong><br/>
          NIP. ......................................................
        </td>
      </tr>
    </table>
  `;

  const html = getWordDocWrapper(`Daftar_Hadir_${metadata.subjectName}`, content, paperSize);
  const blob = new Blob(["\ufeff" + html], { type: "application/msword;charset=utf-8" });
  saveAs(blob, `Daftar_Hadir_${metadata.subjectName.replace(/[^a-zA-Z0-9]/g, "_")}_Kelas${metadata.grade}_Word2007.doc`);
}

/**
 * 4. Export Kartu Hasil Persiswa (Word 2007+ .doc)
 * Generates official Student Exam Result Cards (2 per page)
 */
export function exportKartuHasilWordClassic(examData: ExamData, paperSize: PaperSize = "A4"): void {
  const { schoolIdentity, metadata } = examData;

  // Generate 6 sample student cards
  const cardsHtml = Array.from({ length: 6 }, (_, i) => {
    const num = i + 1;
    const nisn = `00${78000000 + num * 53}`;
    const pageBreakIfNeeded = num % 2 === 0 && num < 6 ? '<div class="page-break"></div>' : "";

    return `
    <div style="border: 2px solid #000; padding: 10pt; margin-bottom: 14pt; border-radius: 4px;">
      <!-- Header Kartu -->
      <table style="width: 100%; border-bottom: 2px solid #000; padding-bottom: 4pt; margin-bottom: 6pt;">
        <tr>
          <td style="width: 60px; text-align: center;">
            ${
              schoolIdentity.useLeftLogo !== false && schoolIdentity.logoBase64
                ? `<img src="${schoolIdentity.logoBase64}" width="50" height="50" style="width: 50px; height: 50px; object-fit: contain;" alt="Logo" />`
                : `<div style="width: 50px; font-size: 8pt; font-weight: bold;">[LOGO]</div>`
            }
          </td>
          <td style="text-align: center;">
            <div style="font-size: 9.5pt; font-weight: bold; text-transform: uppercase;">${schoolIdentity.schoolName}</div>
            <div style="font-size: 11pt; font-weight: bold; text-transform: uppercase; color: #004d26;">
              KARTU HASIL EVALUASI / UJIAN SISWA
            </div>
            <div style="font-size: 8.5pt;">${metadata.examType.toUpperCase()} - TAHUN AJARAN ${metadata.academicYear}</div>
          </td>
          <td style="width: 60px; text-align: center;">
            ${
              schoolIdentity.useRightLogo && schoolIdentity.rightLogoBase64
                ? `<img src="${schoolIdentity.rightLogoBase64}" width="50" height="50" style="width: 50px; height: 50px; object-fit: contain;" alt="Logo" />`
                : `<div style="width: 50px;"></div>`
            }
          </td>
        </tr>
      </table>

      <!-- Identitas Siswa -->
      <table style="width: 100%; font-size: 9.5pt; margin-bottom: 6pt;">
        <tr>
          <td style="width: 25%;"><strong>Nama Siswa</strong></td>
          <td style="width: 2%;">:</td>
          <td style="width: 38%;">Peserta Didik ${num}</td>
          <td style="width: 18%;"><strong>Kelas</strong></td>
          <td style="width: 2%;">:</td>
          <td style="width: 15%;">Kelas ${metadata.grade}</td>
        </tr>
        <tr>
          <td><strong>Nomor Peserta / NISN</strong></td>
          <td>:</td>
          <td>${metadata.grade}-${String(num).padStart(3, "0")} / ${nisn}</td>
          <td><strong>Semester</strong></td>
          <td>:</td>
          <td>${metadata.semester}</td>
        </tr>
      </table>

      <!-- Rincian Nilai -->
      <table class="data-table" style="font-size: 9pt; margin-bottom: 6pt;">
        <thead>
          <tr>
            <th>Mata Pelajaran</th>
            <th>Soal PG</th>
            <th>Soal Essay</th>
            <th>Nilai Akhir</th>
            <th>KKM</th>
            <th>Predikat</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="font-weight: bold;">${metadata.subjectName}</td>
            <td style="text-align: center;">.... / ${examData.multipleChoiceQuestions?.length || 10}</td>
            <td style="text-align: center;">.... / ${examData.essayQuestions?.length || 5}</td>
            <td style="text-align: center; font-weight: bold; font-size: 11pt;">.......</td>
            <td style="text-align: center;">75</td>
            <td style="text-align: center; font-weight: bold;">[ A / B ]</td>
            <td style="text-align: center; font-weight: bold; color: #006837;">TUNTAS</td>
          </tr>
        </tbody>
      </table>

      <!-- Catatan Guru & Tanda Tangan -->
      <table style="width: 100%; font-size: 8.5pt; margin-top: 4pt;">
        <tr>
          <td style="width: 45%; vertical-align: top;">
            <em>Catatan Guru Pengampu:</em><br/>
            Pertahankan prestasi belajar dan terus tingkatkan pemahaman materi!
          </td>
          <td style="width: 25%; text-align: center; vertical-align: bottom;">
            Orang Tua / Wali Murid<br/><br/><br/>
            ( .................................... )
          </td>
          <td style="width: 30%; text-align: center; vertical-align: bottom;">
            Guru Mata Pelajaran<br/><br/><br/>
            <strong>${metadata.teacherName}</strong>
          </td>
        </tr>
      </table>
    </div>
    ${pageBreakIfNeeded}
    `;
  }).join("");

  const content = `
    <div class="text-center" style="margin-bottom: 12pt;">
      <div style="font-size: 12.5pt; font-weight: bold; text-transform: uppercase;">
        KARTU HASIL UJIAN PERSISWA (INDIVIDUAL SCORE CARD)
      </div>
      <div style="font-size: 10pt; font-style: italic;">
        Format Cetak 2 Kartu Per Lembar - Siap Dibagikan ke Siswa & Orang Tua
      </div>
    </div>
    ${cardsHtml}
  `;

  const html = getWordDocWrapper(`Kartu_Hasil_${metadata.subjectName}`, content, paperSize);
  const blob = new Blob(["\ufeff" + html], { type: "application/msword;charset=utf-8" });
  saveAs(blob, `Kartu_Hasil_Siswa_${metadata.subjectName.replace(/[^a-zA-Z0-9]/g, "_")}_Word2007.doc`);
}
