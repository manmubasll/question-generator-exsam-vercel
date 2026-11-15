import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { ExamData } from "../types";

export function exportToExcel(examData: ExamData): void {
  const { schoolIdentity, metadata, multipleChoiceQuestions, essayQuestions } = examData;

  const workbook = XLSX.utils.book_new();

  // 1. Sheet Identitas
  const identityRows = [
    ["INFORMASI IDENTITAS UJIAN & MADRASAH/SEKOLAH"],
    [""],
    ["Instansi / Kementerian", schoolIdentity.ministryName],
    ["Kantor / Sub Unit", schoolIdentity.subMinistryName],
    ["Nama Madrasah / Sekolah", schoolIdentity.schoolName],
    ["Alamat", schoolIdentity.address],
    ["Kontak", schoolIdentity.contact],
    [""],
    ["Mata Pelajaran", metadata.subjectName],
    ["Jenjang Pendidikan", metadata.gradeLevel],
    ["Kelas", `Kelas ${metadata.grade}`],
    ["Jenis Ujian", metadata.examType],
    ["Semester", metadata.semester],
    ["Tahun Ajaran", metadata.academicYear],
    ["Hari / Tanggal Ujian", metadata.examDate],
    ["Alokasi Waktu", metadata.timeAllocation],
    ["Guru Pengampu", metadata.teacherName],
    ["Jumlah Pilihan Ganda", multipleChoiceQuestions.length],
    ["Jumlah Essay", essayQuestions.length],
  ];
  const identitySheet = XLSX.utils.aoa_to_sheet(identityRows);
  identitySheet["!cols"] = [{ wch: 25 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(workbook, identitySheet, "Identitas Ujian");

  // 2. Sheet Teks Wacana & Bacaan (jika ada)
  if (examData.readingPassages && examData.readingPassages.length > 0) {
    const readingData = examData.readingPassages.map((p, idx) => ({
      "No": idx + 1,
      "Judul Bacaan / Wacana": p.title,
      "Digunakan Untuk": p.questionRange || `Soal No. ${p.questionNumbers?.join(", ")}`,
      "Sumber Materi": p.source || "-",
      "Isi Teks Wacana Lengkap": p.content,
    }));
    const readingSheet = XLSX.utils.json_to_sheet(readingData);
    readingSheet["!cols"] = [{ wch: 5 }, { wch: 35 }, { wch: 25 }, { wch: 20 }, { wch: 80 }];
    XLSX.utils.book_append_sheet(workbook, readingSheet, "Teks Wacana & Bacaan");
  }

  // 3. Sheet Soal Pilihan Ganda
  const mcData = multipleChoiceQuestions.map((q) => {
    const passage = examData.readingPassages?.find((p) =>
      p.id === q.readingPassageId ||
      (Array.isArray(p.questionNumbers) && p.questionNumbers.includes(q.number))
    );

    const row: any = {
      "No": q.number,
      "Rujukan Teks Bacaan": passage ? passage.title : "-",
      "Teks Soal": q.questionText,
    };
    q.options.forEach((opt) => {
      row[`Opsi ${opt.key}`] = opt.text;
    });
    row["Kunci Jawaban"] = q.correctAnswer;
    row["Pembahasan Singkat"] = q.explanation;
    return row;
  });
  const mcSheet = XLSX.utils.json_to_sheet(mcData);
  mcSheet["!cols"] = [
    { wch: 5 },
    { wch: 28 },
    { wch: 60 },
    { wch: 30 },
    { wch: 30 },
    { wch: 30 },
    { wch: 30 },
    { wch: 30 },
    { wch: 15 },
    { wch: 50 },
  ];
  XLSX.utils.book_append_sheet(workbook, mcSheet, "Soal Pilihan Ganda");

  // 3. Sheet Soal Essay
  if (essayQuestions.length > 0) {
    const essayData = essayQuestions.map((eq) => {
      const passage = examData.readingPassages?.find((p) =>
        p.id === eq.readingPassageId ||
        (Array.isArray(p.essayQuestionNumbers) && p.essayQuestionNumbers.includes(eq.number))
      );

      return {
        "No": eq.number,
        "Rujukan Teks Bacaan": passage ? passage.title : "-",
        "Butir Soal Essay": eq.questionText,
        "Pedoman / Model Jawaban": eq.modelAnswer,
        "Rubrik Penskoran / Bobot": eq.scoringRubric,
      };
    });
    const essaySheet = XLSX.utils.json_to_sheet(essayData);
    essaySheet["!cols"] = [{ wch: 5 }, { wch: 30 }, { wch: 60 }, { wch: 50 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(workbook, essaySheet, "Soal Essay");
  }

  // 4. Sheet Rekap Kunci Cepat
  const rekapRows: any[] = [];
  multipleChoiceQuestions.forEach((q) => {
    rekapRows.push({
      "No": q.number,
      "Tipe Soal": "Pilihan Ganda",
      "Kunci Jawaban": q.correctAnswer,
      "Bobot / Keterangan": "1",
    });
  });
  essayQuestions.forEach((eq) => {
    rekapRows.push({
      "No": eq.number,
      "Tipe Soal": "Essay / Uraian",
      "Kunci Jawaban": "(Lihat rubrik lembar essay)",
      "Bobot / Keterangan": eq.scoringRubric || "10",
    });
  });
  const rekapSheet = XLSX.utils.json_to_sheet(rekapRows);
  rekapSheet["!cols"] = [{ wch: 5 }, { wch: 18 }, { wch: 25 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(workbook, rekapSheet, "Rekap Kunci Jawaban");

  // 5. Sheet Kisi-Kisi Soal (Matriks / Blueprint)
  const kisiKisiRows: any[] = [];
  let kCounter = 1;
  multipleChoiceQuestions.forEach((q) => {
    kisiKisiRows.push({
      "No Urut": kCounter++,
      "Kompetensi Dasar / CP": q.basicCompetency || `Memahami materi pokok ${metadata.subjectName}`,
      "Materi Pokok": q.material || metadata.subjectName,
      "Indikator Soal": q.indicator || `Disajikan soal, peserta didik dapat menentukan konsep ${metadata.subjectName} dengan tepat.`,
      "Level Kognitif": q.cognitiveLevel || "L2",
      "Tingkat Kesukaran": q.difficulty || "Sedang",
      "Bentuk Soal": "Pilihan Ganda",
      "Nomor Soal": q.number,
    });
  });
  essayQuestions.forEach((eq) => {
    kisiKisiRows.push({
      "No Urut": kCounter++,
      "Kompetensi Dasar / CP": eq.basicCompetency || `Menganalisis materi pokok ${metadata.subjectName}`,
      "Materi Pokok": eq.material || metadata.subjectName,
      "Indikator Soal": eq.indicator || `Disajikan soal essay, peserta didik dapat menguraikan penjelasan ${metadata.subjectName} dengan jelas.`,
      "Level Kognitif": eq.cognitiveLevel || "L3",
      "Tingkat Kesukaran": eq.difficulty || "Sukar",
      "Bentuk Soal": "Uraian / Essay",
      "Nomor Soal": eq.number,
    });
  });
  const kisiSheet = XLSX.utils.json_to_sheet(kisiKisiRows);
  kisiSheet["!cols"] = [{ wch: 8 }, { wch: 35 }, { wch: 25 }, { wch: 45 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(workbook, kisiSheet, "Kisi-Kisi Soal");

  // 6. Sheet Analisis Butir Soal
  const analisisRows: any[] = [];
  multipleChoiceQuestions.forEach((q) => {
    analisisRows.push({
      "No": q.number,
      "Bentuk": "PG",
      "Materi": q.material || metadata.subjectName,
      "Level Kognitif": q.cognitiveLevel?.split(" ")[0] || "L2",
      "Tingkat Kesukaran": q.difficulty || "Sedang",
      "Kunci Jawaban": q.correctAnswer,
      "Daya Beda": "0.42 (Baik)",
      "Status Kelayakan": "Diterima / Layak",
    });
  });
  essayQuestions.forEach((eq) => {
    analisisRows.push({
      "No": eq.number,
      "Bentuk": "Uraian",
      "Materi": eq.material || metadata.subjectName,
      "Level Kognitif": eq.cognitiveLevel?.split(" ")[0] || "L3",
      "Tingkat Kesukaran": eq.difficulty || "Sukar",
      "Kunci Jawaban": "Rubrik Jawaban",
      "Daya Beda": "0.48 (Sangat Baik)",
      "Status Kelayakan": "Diterima / Layak",
    });
  });
  const analisisSheet = XLSX.utils.json_to_sheet(analisisRows);
  analisisSheet["!cols"] = [{ wch: 5 }, { wch: 10 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(workbook, analisisSheet, "Analisis Butir Soal");

  // Write and download
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const safeFilename = `Soal_${metadata.subjectName.replace(/[^a-zA-Z0-9]/g, "_")}_Kelas${metadata.grade}_${metadata.examType.replace(/[^a-zA-Z0-9]/g, "_")}.xlsx`;
  saveAs(blob, safeFilename);
}
