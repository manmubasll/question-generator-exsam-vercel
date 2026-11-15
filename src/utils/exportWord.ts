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
  PageBreak,
} from "docx";
import { saveAs } from "file-saver";
import { ExamData, PaperSize, OptionLayout } from "../types";

export function getEffectiveOptionLayout(
  options: { key: string; text: string }[],
  preference?: OptionLayout
): "horizontal" | "2col" | "vertical" {
  if (preference === "horizontal") return "horizontal";
  if (preference === "2col") return "2col";
  if (preference === "vertical") return "vertical";

  // "auto": Smart paper-saving layout based on option length
  const maxLen = Math.max(...options.map((o) => (o.text || "").trim().length), 0);
  if (maxLen <= 22) return "horizontal"; // e.g. "2√2", "6", "15", "Padat" -> 1 baris menyamping!
  if (maxLen <= 50) return "2col";       // medium phrases -> 2 kolom menyamping!
  return "vertical";                     // long sentences -> vertikal
}

export async function exportToWord(
  examData: ExamData,
  paperSize: PaperSize = "A4",
  layoutPreference?: OptionLayout
): Promise<void> {
  const {
    schoolIdentity,
    metadata,
    generalInstructions = [],
    multipleChoiceQuestions = [],
    trueFalseQuestions = [],
    matchingQuestions = [],
    literacyQuestions = [],
    essayQuestions = [],
    readingPassages = [],
  } = examData;

  const isArabicExam =
    metadata.examLanguage === "ar" ||
    metadata.subjectName.toLowerCase().includes("bahasa arab") ||
    metadata.subjectName.toLowerCase().includes("arab") ||
    (multipleChoiceQuestions.length > 0 && /[\u0600-\u06FF]/.test(multipleChoiceQuestions[0].questionText)) ||
    (trueFalseQuestions.length > 0 && /[\u0600-\u06FF]/.test(trueFalseQuestions[0].instructions)) ||
    (matchingQuestions.length > 0 && /[\u0600-\u06FF]/.test(matchingQuestions[0].instructions)) ||
    (literacyQuestions.length > 0 && /[\u0600-\u06FF]/.test(literacyQuestions[0].questionText)) ||
    (essayQuestions.length > 0 && /[\u0600-\u06FF]/.test(essayQuestions[0].questionText));

  const getDocOptionLabel = (key: string) => {
    if (!isArabicExam) return `${key}. `;
    const map: Record<string, string> = { A: "أ", B: "ب", C: "ج", D: "د", E: "هـ" };
    return `${map[key.toUpperCase()] || key}. `;
  };

  const letters = ["A", "B", "C", "D", "E", "F"];
  let secIdx = 0;

  const kopParagraphs = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { line: 240, before: 0, after: 30 },
      children: [
        new TextRun({
          text: (schoolIdentity.ministryName || "KEMENTERIAN AGAMA REPUBLIK INDONESIA").toUpperCase(),
          bold: true,
          size: 22, // 11pt
          font: "Times New Roman",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { line: 240, before: 0, after: 30 },
      children: [
        new TextRun({
          text: (schoolIdentity.subMinistryName || "KANTOR KEMENTERIAN AGAMA").toUpperCase(),
          bold: true,
          size: 20, // 10pt
          font: "Times New Roman",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { line: 240, before: 0, after: 40 },
      children: [
        new TextRun({
          text: (schoolIdentity.schoolName || "MADRASAH ALIYAH NEGERI").toUpperCase(),
          bold: true,
          size: 28, // 14pt
          font: "Times New Roman",
        }),
      ],
    }),
    ...(schoolIdentity.accreditation
      ? [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { line: 240, before: 0, after: 30 },
            children: [
              new TextRun({
                text: schoolIdentity.accreditation,
                bold: true,
                size: 20, // 10pt
                font: "Times New Roman",
              }),
            ],
          }),
        ]
      : []),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { line: 240, before: 0, after: 20 },
      children: [
        new TextRun({
          text: schoolIdentity.address || "Jalan Raya Pendidikan No. 1",
          size: 18, // 9pt
          font: "Times New Roman",
          italics: true,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { line: 240, before: 0, after: 80 },
      border: {
        bottom: {
          style: BorderStyle.DOUBLE,
          size: 16,
          color: "000000",
        },
      },
      children: [
        new TextRun({
          text: schoolIdentity.contact || "Telp. (021) 1234567 | Email: madrasah@kemenag.go.id",
          size: 18, // 9pt
          font: "Times New Roman",
          italics: true,
        }),
      ],
    }),
  ];

  // Judul Naskah Soal
  const titleParagraphs = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { line: 240, before: 140, after: 40 },
      children: [
        new TextRun({
          text: `NASKAH SOAL ${metadata.examType.toUpperCase()}`,
          bold: true,
          size: 24, // 12pt
          font: "Times New Roman",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { line: 240, before: 0, after: 120 },
      children: [
        new TextRun({
          text: `TAHUN AJARAN ${metadata.academicYear}`,
          bold: true,
          size: 20, // 10pt
          font: "Times New Roman",
        }),
      ],
    }),
  ];

  // Tabel Identitas Soal (2 Kolom)
  const identityTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: "888888" },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "888888" },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 48, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                spacing: { line: 220, before: 20, after: 20 },
                children: [
                  new TextRun({ text: "Mata Pelajaran    : ", bold: true, font: "Times New Roman", size: 20 }),
                  new TextRun({ text: metadata.subjectName, font: "Times New Roman", size: 20 }),
                ],
              }),
              new Paragraph({
                spacing: { line: 220, before: 20, after: 20 },
                children: [
                  new TextRun({ text: "Kelas / Jenjang   : ", bold: true, font: "Times New Roman", size: 20 }),
                  new TextRun({ text: `Kelas ${metadata.grade} (${metadata.gradeLevel})`, font: "Times New Roman", size: 20 }),
                ],
              }),
              new Paragraph({
                spacing: { line: 220, before: 20, after: 20 },
                children: [
                  new TextRun({ text: "Semester              : ", bold: true, font: "Times New Roman", size: 20 }),
                  new TextRun({ text: metadata.semester, font: "Times New Roman", size: 20 }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 52, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                spacing: { line: 220, before: 20, after: 20 },
                children: [
                  new TextRun({ text: "Hari / Tanggal  : ", bold: true, font: "Times New Roman", size: 20 }),
                  new TextRun({ text: metadata.examDate, font: "Times New Roman", size: 20 }),
                ],
              }),
              new Paragraph({
                spacing: { line: 220, before: 20, after: 20 },
                children: [
                  new TextRun({ text: "Waktu                 : ", bold: true, font: "Times New Roman", size: 20 }),
                  new TextRun({ text: metadata.timeAllocation, font: "Times New Roman", size: 20 }),
                ],
              }),
              new Paragraph({
                spacing: { line: 220, before: 20, after: 20 },
                children: [
                  new TextRun({ text: "Guru Pengampu : ", bold: true, font: "Times New Roman", size: 20 }),
                  new TextRun({ text: metadata.teacherName, font: "Times New Roman", size: 20 }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // Petunjuk Umum
  const instructionsParagraphs: Paragraph[] = [
    new Paragraph({
      spacing: { line: 240, before: 140, after: 40 },
      children: [
        new TextRun({
          text: "PETUNJUK UMUM:",
          bold: true,
          font: "Times New Roman",
          size: 20,
        }),
      ],
    }),
    ...generalInstructions.map(
      (inst, idx) =>
        new Paragraph({
          spacing: { line: 220, before: 10, after: 10 },
          children: [
            new TextRun({
              text: `${idx + 1}. ${inst}`,
              font: "Times New Roman",
              size: 20,
            }),
          ],
        })
    ),
  ];

  // Array to gather all sections
  const examBodyParagraphs: (Paragraph | Table)[] = [];

  // ========================================================
  // BAGIAN: PILIHAN GANDA (Jika ada)
  // ========================================================
  if (multipleChoiceQuestions.length > 0) {
    const letter = letters[secIdx++];
    examBodyParagraphs.push(
      new Paragraph({
        spacing: { line: 240, before: 180, after: 60 },
        children: [
          new TextRun({
            text: `${letter}. PILIHAN GANDA (Pilihlah salah satu jawaban yang paling tepat!)`,
            bold: true,
            font: "Times New Roman",
            size: 22,
          }),
        ],
      })
    );

    multipleChoiceQuestions.forEach((q) => {
      const passage = readingPassages.find((p) =>
        Array.isArray(p.questionNumbers) && p.questionNumbers.length > 0
          ? p.questionNumbers[0] === q.number
          : false
      );

      if (passage) {
        examBodyParagraphs.push(
          new Paragraph({
            spacing: { line: 240, before: 160, after: 30 },
            border: {
              top: { style: BorderStyle.SINGLE, size: 8, color: "006837" },
              left: { style: BorderStyle.SINGLE, size: 8, color: "006837" },
              right: { style: BorderStyle.SINGLE, size: 8, color: "006837" },
            },
            shading: { fill: "F0FDF4" },
            children: [
              new TextRun({
                text: `📖 Bacalah teks wacana berikut untuk menjawab ${passage.questionRange || `soal nomor ${passage.questionNumbers?.join(", ")}`}!`,
                bold: true,
                font: "Times New Roman",
                size: 20,
                color: "006837",
              }),
              ...(passage.source
                ? [
                    new TextRun({
                      text: ` (${passage.source})`,
                      italics: true,
                      font: "Times New Roman",
                      size: 18,
                      color: "555555",
                    }),
                  ]
                : []),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { line: 240, before: 40, after: 60 },
            border: {
              left: { style: BorderStyle.SINGLE, size: 8, color: "006837" },
              right: { style: BorderStyle.SINGLE, size: 8, color: "006837" },
            },
            shading: { fill: "F0FDF4" },
            children: [
              new TextRun({
                text: passage.title.toUpperCase(),
                bold: true,
                font: "Times New Roman",
                size: 21,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { line: 240, before: 30, after: 120 },
            border: {
              left: { style: BorderStyle.SINGLE, size: 8, color: "006837" },
              right: { style: BorderStyle.SINGLE, size: 8, color: "006837" },
              bottom: { style: BorderStyle.SINGLE, size: 8, color: "006837" },
            },
            shading: { fill: "F0FDF4" },
            children: [
              new TextRun({
                text: passage.content,
                font: "Times New Roman",
                size: 20,
              }),
            ],
          })
        );
      }

      examBodyParagraphs.push(
        new Paragraph({
          spacing: { line: 240, before: 80, after: 40 },
          children: [
            new TextRun({
              text: `${q.number}. `,
              bold: true,
              font: "Times New Roman",
              size: 20,
            }),
            new TextRun({
              text: q.questionText,
              font: "Times New Roman",
              size: 20,
            }),
          ],
        })
      );

      const effectiveLayout = getEffectiveOptionLayout(
        q.options,
        layoutPreference || examData.optionLayout || examData.metadata?.optionLayout || "auto"
      );

      if (effectiveLayout === "horizontal") {
        // 1 Baris Menyamping (A. 2√2        B. 4√2        C. 6√2        D. 8√2        E. 15√2)
        const runs: TextRun[] = [];
        q.options.forEach((opt, oIdx) => {
          if (oIdx > 0) {
            runs.push(
              new TextRun({
                text: "        ", // Jarak spasi antar opsi menyamping
                font: isArabicExam ? "Traditional Arabic" : "Times New Roman",
                size: 20,
              })
            );
          }
          runs.push(
            new TextRun({
              text: getDocOptionLabel(opt.key),
              bold: true,
              font: isArabicExam ? "Traditional Arabic" : "Times New Roman",
              size: 20,
            }),
            new TextRun({
              text: opt.text,
              font: isArabicExam ? "Traditional Arabic" : "Times New Roman",
              size: 20,
            })
          );
        });

        examBodyParagraphs.push(
          new Paragraph({
            indent: { left: 420 },
            spacing: { line: 220, before: 15, after: 30 },
            children: runs,
            bidirectional: isArabicExam,
            alignment: isArabicExam ? AlignmentType.RIGHT : AlignmentType.LEFT,
          })
        );
      } else if (effectiveLayout === "2col") {
        // 2 Kolom Menyamping (A / B, C / D, E)
        const colRows: TableRow[] = [];
        for (let i = 0; i < q.options.length; i += 2) {
          const opt1 = q.options[i];
          const opt2 = q.options[i + 1];
          colRows.push(
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  borders: {
                    top: { style: BorderStyle.NONE },
                    bottom: { style: BorderStyle.NONE },
                    left: { style: BorderStyle.NONE },
                    right: { style: BorderStyle.NONE },
                  },
                  children: [
                    new Paragraph({
                      spacing: { line: 200, before: 10, after: 10 },
                      children: [
                        new TextRun({
                          text: getDocOptionLabel(opt1.key),
                          bold: true,
                          font: isArabicExam ? "Traditional Arabic" : "Times New Roman",
                          size: 20,
                        }),
                        new TextRun({
                          text: opt1.text,
                          font: isArabicExam ? "Traditional Arabic" : "Times New Roman",
                          size: 20,
                        }),
                      ],
                      bidirectional: isArabicExam,
                      alignment: isArabicExam ? AlignmentType.RIGHT : AlignmentType.LEFT,
                    }),
                  ],
                }),
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  borders: {
                    top: { style: BorderStyle.NONE },
                    bottom: { style: BorderStyle.NONE },
                    left: { style: BorderStyle.NONE },
                    right: { style: BorderStyle.NONE },
                  },
                  children: opt2
                    ? [
                        new Paragraph({
                          spacing: { line: 200, before: 10, after: 10 },
                          children: [
                            new TextRun({
                              text: getDocOptionLabel(opt2.key),
                              bold: true,
                              font: isArabicExam ? "Traditional Arabic" : "Times New Roman",
                              size: 20,
                            }),
                            new TextRun({
                              text: opt2.text,
                              font: isArabicExam ? "Traditional Arabic" : "Times New Roman",
                              size: 20,
                            }),
                          ],
                          bidirectional: isArabicExam,
                          alignment: isArabicExam ? AlignmentType.RIGHT : AlignmentType.LEFT,
                        }),
                      ]
                    : [new Paragraph({})],
                }),
              ],
            })
          );
        }

        examBodyParagraphs.push(
          new Table({
            width: { size: 95, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              insideHorizontal: { style: BorderStyle.NONE },
              insideVertical: { style: BorderStyle.NONE },
            },
            rows: colRows,
          })
        );
      } else {
        // Vertikal (1 Kolom ke bawah)
        q.options.forEach((opt) => {
          examBodyParagraphs.push(
            new Paragraph({
              indent: { left: 420 },
              spacing: { line: 220, before: 10, after: 10 },
              children: [
                new TextRun({
                  text: getDocOptionLabel(opt.key),
                  bold: true,
                  font: isArabicExam ? "Traditional Arabic" : "Times New Roman",
                  size: 20,
                }),
                new TextRun({
                  text: opt.text,
                  font: isArabicExam ? "Traditional Arabic" : "Times New Roman",
                  size: 20,
                }),
              ],
              bidirectional: isArabicExam,
              alignment: isArabicExam ? AlignmentType.RIGHT : AlignmentType.LEFT,
            })
          );
        });
      }
    });
  }

  // ========================================================
  // BAGIAN: BENAR / SALAH (Jika ada)
  // ========================================================
  if (trueFalseQuestions.length > 0) {
    const letter = letters[secIdx++];
    examBodyParagraphs.push(
      new Paragraph({
        spacing: { line: 240, before: 180, after: 60 },
        children: [
          new TextRun({
            text: `${letter}. MENENTUKAN BENAR ATAU SALAH (${isArabicExam ? "تَحْدِيدُ الصَّوَابِ وَالْخَطَإِ" : "Tentukan apakah setiap pernyataan berikut BENAR atau SALAH!"})`,
            bold: true,
            font: "Times New Roman",
            size: 22,
          }),
        ],
      })
    );

    trueFalseQuestions.forEach((tf) => {
      examBodyParagraphs.push(
        new Paragraph({
          spacing: { line: 240, before: 60, after: 40 },
          children: [
            new TextRun({
              text: `Soal Nomor ${tf.number}. `,
              bold: true,
              font: "Times New Roman",
              size: 20,
            }),
            new TextRun({
              text: tf.instructions || "Berilah tanda centang (✓) pada kolom Benar jika pernyataan sesuai, atau Salah jika pernyataan keliru!",
              font: "Times New Roman",
              size: 20,
              italics: true,
            }),
          ],
        })
      );

      const tableRows: TableRow[] = [
        new TableRow({
          tableHeader: true,
          children: [
            new TableCell({
              width: { size: 8, type: WidthType.PERCENTAGE },
              shading: { fill: "F3F4F6" },
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "No", bold: true, font: "Times New Roman", size: 19 })] })],
            }),
            new TableCell({
              width: { size: 68, type: WidthType.PERCENTAGE },
              shading: { fill: "F3F4F6" },
              children: [new Paragraph({ children: [new TextRun({ text: isArabicExam ? "الْعِبَارَاتُ / الْقَضَايَا" : "Pernyataan / Kalimat", bold: true, font: "Times New Roman", size: 19 })] })],
            }),
            new TableCell({
              width: { size: 12, type: WidthType.PERCENTAGE },
              shading: { fill: "F3F4F6" },
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: isArabicExam ? "صَحِيح (ص)" : "Benar (B)", bold: true, font: "Times New Roman", size: 19 })] })],
            }),
            new TableCell({
              width: { size: 12, type: WidthType.PERCENTAGE },
              shading: { fill: "F3F4F6" },
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: isArabicExam ? "خَاطِئ (خ)" : "Salah (S)", bold: true, font: "Times New Roman", size: 19 })] })],
            }),
          ],
        }),
      ];

      tf.statements.forEach((st, sIdx) => {
        tableRows.push(
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${sIdx + 1}`, font: "Times New Roman", size: 19 })] })],
              }),
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: st.statement, font: "Times New Roman", size: 19 })] })],
              }),
              new TableCell({
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "[   ]", font: "Times New Roman", size: 19 })] })],
              }),
              new TableCell({
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "[   ]", font: "Times New Roman", size: 19 })] })],
              }),
            ],
          })
        );
      });

      examBodyParagraphs.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: tableRows,
        })
      );
    });
  }

  // ========================================================
  // BAGIAN: MENJODOHKAN / MENCOCOKKAN (Jika ada)
  // ========================================================
  if (matchingQuestions.length > 0) {
    const letter = letters[secIdx++];
    examBodyParagraphs.push(
      new Paragraph({
        spacing: { line: 240, before: 180, after: 60 },
        children: [
          new TextRun({
            text: `${letter}. MENCOCOKKAN JAWABAN / MENJODOHKAN (${isArabicExam ? "التَّوْفِيقُ بَيْنَ الْعَمُودَيْنِ" : "Jodohkanlah pernyataan pada Kolom A dengan pilihan yang tepat pada Kolom B!"})`,
            bold: true,
            font: "Times New Roman",
            size: 22,
          }),
        ],
      })
    );

    matchingQuestions.forEach((mq) => {
      examBodyParagraphs.push(
        new Paragraph({
          spacing: { line: 240, before: 60, after: 40 },
          children: [
            new TextRun({
              text: `Soal Nomor ${mq.number}. `,
              bold: true,
              font: "Times New Roman",
              size: 20,
            }),
            new TextRun({
              text: mq.instructions || "Hubungkanlah premis di Kolom A dengan pasangan yang paling tepat di Kolom B!",
              font: "Times New Roman",
              size: 20,
              italics: true,
            }),
          ],
        })
      );

      const maxRows = Math.max(mq.premises.length, mq.targets.length);
      const matchRows: TableRow[] = [
        new TableRow({
          tableHeader: true,
          children: [
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              shading: { fill: "F3F4F6" },
              children: [new Paragraph({ children: [new TextRun({ text: isArabicExam ? "الْعَمُودُ (أ) - الْمُقَدِّمَاتُ" : "KOLOM A (Pernyataan / Premis)", bold: true, font: "Times New Roman", size: 19 })] })],
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              shading: { fill: "F3F4F6" },
              children: [new Paragraph({ children: [new TextRun({ text: isArabicExam ? "الْعَمُودُ (ب) - الْخِيَارَاتُ" : "KOLOM B (Pilihan Pasangan)", bold: true, font: "Times New Roman", size: 19 })] })],
            }),
          ],
        }),
      ];

      for (let i = 0; i < maxRows; i++) {
        const p = mq.premises[i];
        const t = mq.targets[i];
        matchRows.push(
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: p ? `(${p.key}) ${p.text}` : "",
                        font: "Times New Roman",
                        size: 19,
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: t ? `[ ${t.key} ] ${t.text}` : "",
                        font: "Times New Roman",
                        size: 19,
                      }),
                    ],
                  }),
                ],
              }),
            ],
          })
        );
      }

      examBodyParagraphs.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: matchRows,
        })
      );
    });
  }

  // ========================================================
  // BAGIAN: LITERASI TEKS & DATA (Jika ada)
  // ========================================================
  if (literacyQuestions.length > 0) {
    const letter = letters[secIdx++];
    examBodyParagraphs.push(
      new Paragraph({
        spacing: { line: 240, before: 180, after: 60 },
        children: [
          new TextRun({
            text: `${letter}. LITERASI TEKS & DATA (${isArabicExam ? "أَسْئِلَةُ فَهْمِ النُّصُوصِ وَالْبَيَانَاتِ" : "Asesmen Literasi & Analisis Data Kontekstual"})`,
            bold: true,
            font: "Times New Roman",
            size: 22,
          }),
        ],
      })
    );

    literacyQuestions.forEach((lq) => {
      // Stimulus Box
      examBodyParagraphs.push(
        new Paragraph({
          spacing: { line: 240, before: 140, after: 30 },
          border: {
            top: { style: BorderStyle.SINGLE, size: 8, color: "1E40AF" },
            left: { style: BorderStyle.SINGLE, size: 8, color: "1E40AF" },
            right: { style: BorderStyle.SINGLE, size: 8, color: "1E40AF" },
          },
          shading: { fill: "EFF6FF" },
          children: [
            new TextRun({
              text: `📊 STIMULUS: ${lq.stimulusTitle.toUpperCase()} (${lq.stimulusType.toUpperCase()})`,
              bold: true,
              font: "Times New Roman",
              size: 20,
              color: "1E40AF",
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { line: 240, before: 20, after: 60 },
          border: {
            left: { style: BorderStyle.SINGLE, size: 8, color: "1E40AF" },
            right: { style: BorderStyle.SINGLE, size: 8, color: "1E40AF" },
            bottom: lq.dataSnippet ? { style: BorderStyle.DASHED, size: 4, color: "93C5FD" } : { style: BorderStyle.SINGLE, size: 8, color: "1E40AF" },
          },
          shading: { fill: "EFF6FF" },
          children: [
            new TextRun({
              text: lq.stimulusContent,
              font: "Times New Roman",
              size: 20,
            }),
          ],
        })
      );

      if (lq.dataSnippet) {
        examBodyParagraphs.push(
          new Paragraph({
            spacing: { line: 220, before: 30, after: 80 },
            border: {
              left: { style: BorderStyle.SINGLE, size: 8, color: "1E40AF" },
              right: { style: BorderStyle.SINGLE, size: 8, color: "1E40AF" },
              bottom: { style: BorderStyle.SINGLE, size: 8, color: "1E40AF" },
            },
            shading: { fill: "DBEAFE" },
            children: [
              new TextRun({
                text: `[Tabel / Data]: ${lq.dataSnippet}`,
                font: "Times New Roman",
                size: 19,
                italics: true,
              }),
            ],
          })
        );
      }

      // Question Text
      examBodyParagraphs.push(
        new Paragraph({
          spacing: { line: 240, before: 80, after: 40 },
          children: [
            new TextRun({
              text: `${lq.number}. `,
              bold: true,
              font: "Times New Roman",
              size: 20,
            }),
            new TextRun({
              text: lq.questionText,
              font: "Times New Roman",
              size: 20,
            }),
          ],
        })
      );

      // Options if available
      if (lq.options && lq.options.length > 0) {
        lq.options.forEach((opt) => {
          examBodyParagraphs.push(
            new Paragraph({
              indent: { left: 420 },
              spacing: { line: 220, before: 10, after: 10 },
              children: [
                new TextRun({
                  text: getDocOptionLabel(opt.key),
                  bold: true,
                  font: "Times New Roman",
                  size: 20,
                }),
                new TextRun({
                  text: opt.text,
                  font: "Times New Roman",
                  size: 20,
                }),
              ],
            })
          );
        });
      }

      // Sub-questions if available
      if (lq.subQuestions && lq.subQuestions.length > 0) {
        lq.subQuestions.forEach((sub, sIdx) => {
          examBodyParagraphs.push(
            new Paragraph({
              indent: { left: 420 },
              spacing: { line: 220, before: 20, after: 20 },
              children: [
                new TextRun({
                  text: `${String.fromCharCode(97 + sIdx)}. ${sub.question}`,
                  font: "Times New Roman",
                  size: 20,
                }),
              ],
            })
          );
        });
      }
    });
  }

  // ========================================================
  // BAGIAN: ESSAY / URAIAN (Jika ada)
  // ========================================================
  if (essayQuestions.length > 0) {
    const letter = letters[secIdx++];
    examBodyParagraphs.push(
      new Paragraph({
        spacing: { line: 240, before: 180, after: 60 },
        children: [
          new TextRun({
            text: `${letter}. ESSAY / URAIAN (Jawablah pertanyaan-pertanyaan berikut dengan jelas dan tepat!)`,
            bold: true,
            font: "Times New Roman",
            size: 22,
          }),
        ],
      })
    );

    essayQuestions.forEach((eq) => {
      const passage = readingPassages.find((p, pIdx) => {
        if (Array.isArray(p.essayQuestionNumbers) && p.essayQuestionNumbers.length > 0) {
          return p.essayQuestionNumbers[0] === eq.number;
        }
        const matching = essayQuestions.filter((e) => e.readingPassageId === p.id);
        if (matching.length > 0 && matching[0].number === eq.number) {
          return true;
        }
        if (
          pIdx === 0 &&
          eq.number === 1 &&
          multipleChoiceQuestions.length === 0 &&
          (!p.questionNumbers || p.questionNumbers.length === 0)
        ) {
          return true;
        }
        const isLang =
          isArabicExam ||
          /bahasa\s*(arab|indonesia|inggris|jawa|sunda)|arabic|english|indonesian/i.test(metadata.subjectName);
        const anyEssayHasPassageId = essayQuestions.some((e) => !!e.readingPassageId);
        if (isLang && !anyEssayHasPassageId && pIdx === 0 && eq.number === 1) {
          return true;
        }
        return false;
      });

      if (passage) {
        const isPassageArabic = isArabicExam || /[\u0600-\u06FF]/.test(passage.content);
        const passageFont = isPassageArabic ? "Traditional Arabic" : "Times New Roman";
        const passageSize = isPassageArabic ? 26 : 20;

        examBodyParagraphs.push(
          new Paragraph({
            spacing: { line: 240, before: 160, after: 30 },
            border: {
              top: { style: BorderStyle.SINGLE, size: 8, color: "006837" },
              left: { style: BorderStyle.SINGLE, size: 8, color: "006837" },
              right: { style: BorderStyle.SINGLE, size: 8, color: "006837" },
            },
            shading: { fill: "F0FDF4" },
            bidirectional: isPassageArabic,
            alignment: isPassageArabic ? AlignmentType.RIGHT : AlignmentType.LEFT,
            children: [
              new TextRun({
                text: isPassageArabic
                  ? `📖 اقْرَأِ النَّصَّ الْآتِيَ لِلْإِجَابَةِ عَنِ الْأَسْئِلَةِ الْمَقَالِيَّةِ (${
                      passage.essayQuestionNumbers && passage.essayQuestionNumbers.length > 0
                        ? `رَقْمُ ${passage.essayQuestionNumbers.join(", ")}`
                        : passage.questionRange || "التَّالِيَةِ"
                    })`
                  : `📖 Bacalah teks wacana berikut untuk menjawab soal essay ${
                      passage.essayQuestionNumbers && passage.essayQuestionNumbers.length > 0
                        ? `nomor ${passage.essayQuestionNumbers.join(", ")}`
                        : passage.questionRange || "berikut"
                    }!`,
                bold: true,
                font: passageFont,
                size: passageSize,
                color: "006837",
              }),
              ...(passage.source
                ? [
                    new TextRun({
                      text: ` (${passage.source})`,
                      italics: true,
                      font: passageFont,
                      size: isPassageArabic ? 22 : 18,
                      color: "555555",
                    }),
                  ]
                : []),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { line: 240, before: 40, after: 60 },
            border: {
              left: { style: BorderStyle.SINGLE, size: 8, color: "006837" },
              right: { style: BorderStyle.SINGLE, size: 8, color: "006837" },
            },
            shading: { fill: "F0FDF4" },
            bidirectional: isPassageArabic,
            children: [
              new TextRun({
                text: passage.title.toUpperCase(),
                bold: true,
                font: passageFont,
                size: isPassageArabic ? 28 : 21,
              }),
            ],
          }),
          new Paragraph({
            alignment: isPassageArabic ? AlignmentType.RIGHT : AlignmentType.JUSTIFIED,
            spacing: { line: isPassageArabic ? 360 : 240, before: 30, after: 120 },
            border: {
              left: { style: BorderStyle.SINGLE, size: 8, color: "006837" },
              right: { style: BorderStyle.SINGLE, size: 8, color: "006837" },
              bottom: { style: BorderStyle.SINGLE, size: 8, color: "006837" },
            },
            shading: { fill: "F0FDF4" },
            bidirectional: isPassageArabic,
            children: [
              new TextRun({
                text: passage.content,
                font: passageFont,
                size: passageSize,
              }),
            ],
          })
        );
      }

      examBodyParagraphs.push(
        new Paragraph({
          spacing: { line: 240, before: 80, after: 40 },
          children: [
            new TextRun({
              text: `${eq.number}. `,
              bold: true,
              font: "Times New Roman",
              size: 20,
            }),
            new TextRun({
              text: eq.questionText,
              font: "Times New Roman",
              size: 20,
            }),
          ],
        })
      );
    });
  }

  // ========================================================
  // LEMBAR KUNCI JAWABAN TERPISAH (PAGE BREAK)
  // ========================================================
  const pageBreakParagraph = new Paragraph({
    children: [new PageBreak()],
  });

  const answerSheetTitle = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { line: 240, before: 60, after: 40 },
      children: [
        new TextRun({
          text: "LEMBAR KUNCI JAWABAN & PEDOMAN PENSKORAN",
          bold: true,
          size: 24, // 12pt
          font: "Times New Roman",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { line: 240, before: 0, after: 60 },
      children: [
        new TextRun({
          text: `Mata Pelajaran: ${metadata.subjectName} | Kelas ${metadata.grade} (${metadata.gradeLevel}) | ${metadata.examType}`,
          bold: true,
          size: 20,
          font: "Times New Roman",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { line: 240, before: 0, after: 120 },
      children: [
        new TextRun({
          text: `Guru Pengampu: ${metadata.teacherName} | Tanggal: ${metadata.examDate}`,
          italics: true,
          size: 18,
          font: "Times New Roman",
        }),
      ],
    }),
  ];

  const answerKeySections: (Paragraph | Table)[] = [];
  let keyRoman = 1;
  const toRoman = (n: number) => ["I", "II", "III", "IV", "V", "VI"][n - 1] || `${n}`;

  // 1. Kunci Pilihan Ganda
  if (multipleChoiceQuestions.length > 0) {
    answerKeySections.push(
      new Paragraph({
        spacing: { line: 240, before: 100, after: 40 },
        children: [
          new TextRun({
            text: `${toRoman(keyRoman++)}. Kunci Jawaban Pilihan Ganda`,
            bold: true,
            font: "Times New Roman",
            size: 22,
          }),
        ],
      })
    );

    const mcTableRows = [
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({
            width: { size: 10, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "No", bold: true, font: "Times New Roman" })] })],
          }),
          new TableCell({
            width: { size: 15, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Kunci", bold: true, font: "Times New Roman" })] })],
          }),
          new TableCell({
            width: { size: 75, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text: "Pembahasan / Penjelasan Singkat", bold: true, font: "Times New Roman" })] })],
          }),
        ],
      }),
      ...multipleChoiceQuestions.map(
        (q) =>
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${q.number}`, font: "Times New Roman" })] })] }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${q.correctAnswer}`, bold: true, font: "Times New Roman" })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: q.explanation || "-", font: "Times New Roman" })] })] }),
            ],
          })
      ),
    ];

    answerKeySections.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: mcTableRows }));
  }

  // 2. Kunci Benar / Salah
  if (trueFalseQuestions.length > 0) {
    answerKeySections.push(
      new Paragraph({
        spacing: { line: 240, before: 140, after: 40 },
        children: [
          new TextRun({
            text: `${toRoman(keyRoman++)}. Kunci Jawaban Menentukan Benar / Salah`,
            bold: true,
            font: "Times New Roman",
            size: 22,
          }),
        ],
      })
    );

    const tfTableRows: TableRow[] = [
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({ width: { size: 8, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "No", bold: true, font: "Times New Roman" })] })] }),
          new TableCell({ width: { size: 52, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Pernyataan", bold: true, font: "Times New Roman" })] })] }),
          new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Status", bold: true, font: "Times New Roman" })] })] }),
          new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Alasan / Pembahasan", bold: true, font: "Times New Roman" })] })] }),
        ],
      }),
    ];

    trueFalseQuestions.forEach((tf) => {
      tf.statements.forEach((st, sIdx) => {
        tfTableRows.push(
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${tf.number}.${sIdx + 1}`, font: "Times New Roman" })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: st.statement, font: "Times New Roman" })] })] }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: st.isCorrect ? "BENAR" : "SALAH", bold: true, font: "Times New Roman" })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: st.explanation || "-", font: "Times New Roman" })] })] }),
            ],
          })
        );
      });
    });

    answerKeySections.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: tfTableRows }));
  }

  // 3. Kunci Menjodohkan
  if (matchingQuestions.length > 0) {
    answerKeySections.push(
      new Paragraph({
        spacing: { line: 240, before: 140, after: 40 },
        children: [
          new TextRun({
            text: `${toRoman(keyRoman++)}. Kunci Jawaban Mencocokkan Pasangan / Menjodohkan`,
            bold: true,
            font: "Times New Roman",
            size: 22,
          }),
        ],
      })
    );

    const matchKeyRows: TableRow[] = [
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Soal", bold: true, font: "Times New Roman" })] })] }),
          new TableCell({ width: { size: 45, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Pasangan Premis & Target", bold: true, font: "Times New Roman" })] })] }),
          new TableCell({ width: { size: 45, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Penjelasan Keterkaitan", bold: true, font: "Times New Roman" })] })] }),
        ],
      }),
    ];

    matchingQuestions.forEach((mq) => {
      mq.correctPairs.forEach((pair) => {
        const pObj = mq.premises.find((p) => p.key === pair.premiseKey);
        const tObj = mq.targets.find((t) => t.key === pair.targetKey);
        matchKeyRows.push(
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `No. ${mq.number}`, font: "Times New Roman" })] })] }),
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({ text: `[${pair.premiseKey}] ${pObj?.text || ""} ➔ `, bold: true, font: "Times New Roman" }),
                      new TextRun({ text: `[${pair.targetKey}] ${tObj?.text || ""}`, font: "Times New Roman" }),
                    ],
                  }),
                ],
              }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: pair.explanation || "-", font: "Times New Roman" })] })] }),
            ],
          })
        );
      });
    });

    answerKeySections.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: matchKeyRows }));
  }

  // 4. Kunci Literasi Teks & Data
  if (literacyQuestions.length > 0) {
    answerKeySections.push(
      new Paragraph({
        spacing: { line: 240, before: 140, after: 40 },
        children: [
          new TextRun({
            text: `${toRoman(keyRoman++)}. Kunci Jawaban Literasi Teks & Data`,
            bold: true,
            font: "Times New Roman",
            size: 22,
          }),
        ],
      })
    );

    literacyQuestions.forEach((lq) => {
      answerKeySections.push(
        new Paragraph({
          spacing: { line: 240, before: 60, after: 20 },
          children: [
            new TextRun({ text: `Soal No. ${lq.number} (${lq.stimulusTitle}): `, bold: true, font: "Times New Roman", size: 20 }),
            new TextRun({ text: lq.questionText, italics: true, font: "Times New Roman", size: 20 }),
          ],
        }),
        new Paragraph({
          indent: { left: 400 },
          spacing: { line: 220, before: 10, after: 10 },
          children: [
            new TextRun({ text: `Kunci Jawaban: [ ${lq.correctAnswer || "Jawaban Terurai"} ] `, bold: true, font: "Times New Roman", size: 20 }),
            new TextRun({ text: `| Pembahasan: ${lq.explanation || "-"}`, font: "Times New Roman", size: 20 }),
          ],
        })
      );

      if (lq.subQuestions && lq.subQuestions.length > 0) {
        lq.subQuestions.forEach((sub, sIdx) => {
          answerKeySections.push(
            new Paragraph({
              indent: { left: 600 },
              spacing: { line: 220, before: 5, after: 5 },
              children: [
                new TextRun({ text: `${String.fromCharCode(97 + sIdx)}. `, bold: true, font: "Times New Roman", size: 19 }),
                new TextRun({ text: `${sub.question} ➔ Kunci: ${sub.answerKey} (${sub.explanation || ""})`, font: "Times New Roman", size: 19 }),
              ],
            })
          );
        });
      }
    });
  }

  // 5. Kunci Essay
  if (essayQuestions.length > 0) {
    answerKeySections.push(
      new Paragraph({
        spacing: { line: 240, before: 140, after: 40 },
        children: [
          new TextRun({
            text: `${toRoman(keyRoman++)}. Kunci Jawaban & Rubrik Penskoran Soal Essay / Uraian`,
            bold: true,
            font: "Times New Roman",
            size: 22,
          }),
        ],
      })
    );

    essayQuestions.forEach((eq) => {
      answerKeySections.push(
        new Paragraph({
          spacing: { line: 240, before: 80, after: 20 },
          children: [
            new TextRun({ text: `Soal No. ${eq.number}: `, bold: true, font: "Times New Roman", size: 20 }),
            new TextRun({ text: eq.questionText, italics: true, font: "Times New Roman", size: 20 }),
          ],
        }),
        new Paragraph({
          indent: { left: 400 },
          spacing: { line: 220, before: 20, after: 20 },
          children: [
            new TextRun({ text: "Model Jawaban: ", bold: true, font: "Times New Roman", size: 20 }),
            new TextRun({ text: eq.modelAnswer, font: "Times New Roman", size: 20 }),
          ],
        }),
        new Paragraph({
          indent: { left: 400 },
          spacing: { line: 220, before: 20, after: 60 },
          children: [
            new TextRun({ text: "Pedoman Penskoran: ", bold: true, font: "Times New Roman", size: 19 }),
            new TextRun({ text: eq.scoringRubric || "Skor Maksimal: 10", font: "Times New Roman", size: 19 }),
          ],
        })
      );
    });
  }

  const doc = new Document({
    creator: "Question Generator Exsam",
    title: `Naskah Soal ${metadata.subjectName} Kelas ${metadata.grade}`,
    description: "Naskah Soal Ujian dan Kunci Jawaban Resmi - Kompatibel Microsoft Word 2007/2010/2013/2016/2019/2021/365",
    compatabilityModeVersion: 12,
    compatibility: { version: 12 },
    styles: {
      default: {
        document: {
          run: { font: "Times New Roman", size: 22 },
          paragraph: { spacing: { line: 240 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: paperSize === "F4" ? 12189 : 11906,
              height: paperSize === "F4" ? 18708 : 16838,
            },
            margin: { top: 1000, bottom: 1000, left: 1200, right: 1200 },
          },
        },
        children: [
          ...kopParagraphs,
          ...titleParagraphs,
          identityTable,
          ...instructionsParagraphs,
          ...examBodyParagraphs,
          pageBreakParagraph,
          ...answerSheetTitle,
          ...answerKeySections,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const safeFilename = `Soal_${metadata.subjectName.replace(/[^a-zA-Z0-9]/g, "_")}_Kelas${metadata.grade}_${metadata.examType.replace(/[^a-zA-Z0-9]/g, "_")}_${paperSize}.docx`;
  saveAs(blob, safeFilename);
}

/**
 * Export to Classic Word (.doc) format for 100% native opening in Word 2003, 2007, 2010,
 * WPS Office, LibreOffice without needing any OpenXML compatibility converter or update.
 */
export function exportToWordClassic(
  examData: ExamData,
  paperSize: PaperSize = "A4",
  layoutPreference?: OptionLayout
): void {
  const {
    schoolIdentity,
    metadata,
    generalInstructions = [],
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
    metadata.subjectName.toLowerCase().includes("arab") ||
    (multipleChoiceQuestions.length > 0 && /[\u0600-\u06FF]/.test(multipleChoiceQuestions[0].questionText)) ||
    (trueFalseQuestions.length > 0 && /[\u0600-\u06FF]/.test(trueFalseQuestions[0].instructions)) ||
    (matchingQuestions.length > 0 && /[\u0600-\u06FF]/.test(matchingQuestions[0].instructions)) ||
    (literacyQuestions.length > 0 && /[\u0600-\u06FF]/.test(literacyQuestions[0].questionText)) ||
    (essayQuestions.length > 0 && /[\u0600-\u06FF]/.test(essayQuestions[0].questionText));

  const getOptionLabel = (key: string) => {
    if (!isArabic) return `${key}.`;
    const map: Record<string, string> = { A: "أ", B: "ب", C: "ج", D: "د", E: "هـ" };
    return `${map[key.toUpperCase()] || key}.`;
  };

  const pageSizeStyle = paperSize === "F4"
    ? "size: 215mm 330mm; margin: 1.5cm 2.0cm 1.5cm 2.0cm;"
    : "size: 210mm 297mm; margin: 1.5cm 2.0cm 1.5cm 2.0cm;";

  const letters = ["A", "B", "C", "D", "E", "F"];
  let secIdx = 0;

  // Build HTML sections
  let mcHtml = "";
  if (multipleChoiceQuestions.length > 0) {
    const letter = letters[secIdx++];
    mcHtml = `
    <div style="margin-top: 10pt;">
      <p style="font-weight: bold; font-size: 11pt; border-bottom: 1px solid #888; padding-bottom: 2pt; margin-bottom: 6pt;">
        ${letter}. PILIHAN GANDA (Pilihlah salah satu jawaban yang paling tepat!)
      </p>
      ${multipleChoiceQuestions
        .map((q) => {
          const passage = readingPassages.find((p) =>
            Array.isArray(p.questionNumbers) && p.questionNumbers.length > 0
              ? p.questionNumbers[0] === q.number
              : false
          );
          const isPassageArabic = isArabic || (passage && /[\u0600-\u06FF]/.test(passage.content));
          const passageHtml = passage
            ? `
          <div class="reading-box" ${isPassageArabic ? 'dir="rtl"' : ""}>
            <div class="reading-box-header">
              📖 ${
                isPassageArabic
                  ? `اقْرَأِ النَّصَّ الْآتِيَ لِلْإِجَابَةِ عَنِ ${passage.questionRange || `الْأَسْئِلَةِ ${passage.questionNumbers?.join(", ")}`}`
                  : `Bacalah teks wacana berikut untuk menjawab ${passage.questionRange || `soal nomor ${passage.questionNumbers?.join(", ")}`}!`
              }
              ${passage.source ? `<span style="font-style: italic; font-weight: normal; font-size: 9pt;"> (${passage.source})</span>` : ""}
            </div>
            <div class="reading-box-title ${isPassageArabic ? "arabic-box" : ""}">${passage.title}</div>
            <div class="reading-box-content ${isPassageArabic ? "arabic-box" : ""}">${passage.content}</div>
          </div>
          `
            : "";

          const isQArabic = isArabic || /[\u0600-\u06FF]/.test(q.questionText);
          const effectiveLayout = getEffectiveOptionLayout(
            q.options,
            layoutPreference || examData.optionLayout || examData.metadata?.optionLayout || "auto"
          );

          let optionsHtml = "";
          if (effectiveLayout === "horizontal") {
            // 1 Baris Menyamping
            optionsHtml = `
            <div style="margin-left: 20pt; margin-top: 2pt; margin-bottom: 3pt; ${isQArabic ? 'margin-right: 20pt; direction: rtl; text-align: right;' : ''}">
              ${q.options
                .map(
                  (opt) => `
                <span style="display: inline-block; margin-right: 24pt; margin-bottom: 2pt; white-space: nowrap; ${isQArabic ? 'margin-right: 0; margin-left: 24pt; font-family: \'Traditional Arabic\', serif; font-size: 13pt;' : ''}">
                  <strong>${getOptionLabel(opt.key)}</strong> ${opt.text}
                </span>
              `
                )
                .join("")}
            </div>
            `;
          } else if (effectiveLayout === "2col") {
            // 2 Kolom Menyamping
            const rows: string[] = [];
            for (let i = 0; i < q.options.length; i += 2) {
              const o1 = q.options[i];
              const o2 = q.options[i + 1];
              rows.push(`
                <tr>
                  <td style="width: 50%; padding: 1pt 4pt; border: none; vertical-align: top; ${isQArabic ? 'font-family: \'Traditional Arabic\', serif; font-size: 13pt;' : ''}">
                    <strong>${getOptionLabel(o1.key)}</strong> ${o1.text}
                  </td>
                  <td style="width: 50%; padding: 1pt 4pt; border: none; vertical-align: top; ${isQArabic ? 'font-family: \'Traditional Arabic\', serif; font-size: 13pt;' : ''}">
                    ${o2 ? `<strong>${getOptionLabel(o2.key)}</strong> ${o2.text}` : ""}
                  </td>
                </tr>
              `);
            }
            optionsHtml = `
            <table style="width: 95%; margin-left: 20pt; border: none; margin-top: 2pt; margin-bottom: 3pt; border-collapse: collapse; font-size: 10.5pt;" ${isQArabic ? 'dir="rtl" style="margin-right: 20pt; margin-left: 0;"' : ""}>
              <tbody>
                ${rows.join("")}
              </tbody>
            </table>
            `;
          } else {
            // Vertikal (1 Kolom ke bawah)
            optionsHtml = `
            ${q.options
              .map(
                (opt) => `
              <div class="${isQArabic ? "arabic-opt" : "option-item"}" ${isQArabic ? 'dir="rtl"' : ""}>
                <strong>${getOptionLabel(opt.key)}</strong> ${opt.text}
              </div>
            `
              )
              .join("")}
            `;
          }

          return `
          ${passageHtml}
          <div class="${isQArabic ? "arabic-q" : "question-item"}" ${isQArabic ? 'dir="rtl"' : ""}>
            <strong>${q.number}.</strong> ${q.questionText}
          </div>
          ${optionsHtml}
        `;
        })
        .join("")}
    </div>
    `;
  }

  let tfHtml = "";
  if (trueFalseQuestions.length > 0) {
    const letter = letters[secIdx++];
    tfHtml = `
    <div style="margin-top: 14pt;">
      <p style="font-weight: bold; font-size: 11pt; border-bottom: 1px solid #888; padding-bottom: 2pt; margin-bottom: 6pt;">
        ${letter}. MENENTUKAN BENAR ATAU SALAH (${isArabic ? "تَحْدِيدُ الصَّوَابِ وَالْخَطَإِ" : "Tentukan apakah pernyataan berikut BENAR atau SALAH!"})
      </p>
      ${trueFalseQuestions
        .map((tf) => `
        <div style="margin-bottom: 10pt;">
          <p style="font-size: 10pt; font-weight: bold; margin: 4pt 0;">
            Soal Nomor ${tf.number}. <span style="font-weight: normal; font-style: italic;">${tf.instructions || "Berilah tanda centang (✓) pada kolom Benar atau Salah!"}</span>
          </p>
          <table class="key-table">
            <thead>
              <tr style="background-color: #f2f2f2;">
                <th style="width: 8%; text-align: center;">No</th>
                <th style="text-align: left;">${isArabic ? "الْعِبَارَاتُ" : "Pernyataan / Kalimat"}</th>
                <th style="width: 15%; text-align: center;">${isArabic ? "صَحِيح (ص)" : "Benar (B)"}</th>
                <th style="width: 15%; text-align: center;">${isArabic ? "خَاطِئ (خ)" : "Salah (S)"}</th>
              </tr>
            </thead>
            <tbody>
              ${tf.statements
                .map(
                  (st, sIdx) => `
                <tr>
                  <td style="text-align: center;">${sIdx + 1}</td>
                  <td ${isArabic ? 'dir="rtl" style="font-family: \'Traditional Arabic\'; font-size: 12pt;"' : ""}>${st.statement}</td>
                  <td style="text-align: center; font-size: 12pt;">[ &nbsp; ]</td>
                  <td style="text-align: center; font-size: 12pt;">[ &nbsp; ]</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>
      `)
        .join("")}
    </div>
    `;
  }

  let matchHtml = "";
  if (matchingQuestions.length > 0) {
    const letter = letters[secIdx++];
    matchHtml = `
    <div style="margin-top: 14pt;">
      <p style="font-weight: bold; font-size: 11pt; border-bottom: 1px solid #888; padding-bottom: 2pt; margin-bottom: 6pt;">
        ${letter}. MENCOCOKKAN JAWABAN / MENJODOHKAN (${isArabic ? "التَّوْفِيقُ بَيْنَ الْعَمُودَيْنِ" : "Jodohkanlah pernyataan Kolom A dengan pilihan di Kolom B!"})
      </p>
      ${matchingQuestions
        .map((mq) => {
          const maxRows = Math.max(mq.premises.length, mq.targets.length);
          const rows: string[] = [];
          for (let i = 0; i < maxRows; i++) {
            const p = mq.premises[i];
            const t = mq.targets[i];
            rows.push(`
              <tr>
                <td style="width: 50%; padding: 4pt 6pt;">
                  ${p ? `<strong>(${p.key})</strong> ${p.text}` : ""}
                </td>
                <td style="width: 50%; padding: 4pt 6pt;">
                  ${t ? `<strong>[ ${t.key} ]</strong> ${t.text}` : ""}
                </td>
              </tr>
            `);
          }
          return `
          <div style="margin-bottom: 10pt;">
            <p style="font-size: 10pt; font-weight: bold; margin: 4pt 0;">
              Soal Nomor ${mq.number}. <span style="font-weight: normal; font-style: italic;">${mq.instructions || "Hubungkanlah premis di Kolom A dengan pilihan yang tepat di Kolom B!"}</span>
            </p>
            <table class="key-table">
              <thead>
                <tr style="background-color: #f2f2f2;">
                  <th style="width: 50%; text-align: left;">${isArabic ? "الْعَمُودُ (أ) - الْمُقَدِّمَاتُ" : "KOLOM A (Premis / Pernyataan)"}</th>
                  <th style="width: 50%; text-align: left;">${isArabic ? "الْعَمُودُ (ب) - الْخِيَارَاتُ" : "KOLOM B (Pilihan Jawaban)"}</th>
                </tr>
              </thead>
              <tbody>
                ${rows.join("")}
              </tbody>
            </table>
          </div>
          `;
        })
        .join("")}
    </div>
    `;
  }

  let litHtml = "";
  if (literacyQuestions.length > 0) {
    const letter = letters[secIdx++];
    litHtml = `
    <div style="margin-top: 14pt;">
      <p style="font-weight: bold; font-size: 11pt; border-bottom: 1px solid #888; padding-bottom: 2pt; margin-bottom: 6pt;">
        ${letter}. LITERASI TEKS & DATA (${isArabic ? "أَسْئِلَةُ فَهْمِ النُّصُوصِ وَالْبَيَانَاتِ" : "Asesmen Literasi & Analisis Data Kontekstual"})
      </p>
      ${literacyQuestions
        .map((lq) => `
        <div style="margin-bottom: 12pt;">
          <div style="border: 1.5pt solid #1e40af; background-color: #eff6ff; padding: 6pt 10pt; margin-bottom: 6pt;">
            <div style="font-weight: bold; font-size: 9.5pt; color: #1e40af;">
              📊 STIMULUS: ${lq.stimulusTitle.toUpperCase()} (${lq.stimulusType.toUpperCase()})
            </div>
            <div style="font-size: 10pt; text-align: justify; margin-top: 3pt; line-height: 1.35;">
              ${lq.stimulusContent}
            </div>
            ${
              lq.dataSnippet
                ? `<div style="margin-top: 4pt; font-size: 9pt; background: #dbeafe; padding: 3pt 6pt; font-style: italic;">
                    [Tabel / Data]: ${lq.dataSnippet}
                   </div>`
                : ""
            }
          </div>
          <div class="question-item">
            <strong>${lq.number}.</strong> ${lq.questionText}
          </div>
          ${
            lq.options && lq.options.length > 0
              ? lq.options
                  .map(
                    (opt) => `
                <div class="option-item">
                  <strong>${getOptionLabel(opt.key)}</strong> ${opt.text}
                </div>
              `
                  )
                  .join("")
              : ""
          }
          ${
            lq.subQuestions && lq.subQuestions.length > 0
              ? lq.subQuestions
                  .map(
                    (sub, sIdx) => `
                <div style="margin-left: 15pt; margin-top: 2pt; font-size: 10pt;">
                  <strong>${String.fromCharCode(97 + sIdx)}.</strong> ${sub.question}
                </div>
              `
                  )
                  .join("")
              : ""
          }
        </div>
      `)
        .join("")}
    </div>
    `;
  }

  let essayHtml = "";
  if (essayQuestions.length > 0) {
    const letter = letters[secIdx++];
    essayHtml = `
    <div style="margin-top: 14pt;">
      <p style="font-weight: bold; font-size: 11pt; border-bottom: 1px solid #888; padding-bottom: 2pt; margin-bottom: 6pt;">
        ${letter}. ESSAY / URAIAN (Jawablah pertanyaan berikut dengan jelas dan benar!)
      </p>
      ${essayQuestions
        .map((eq) => {
          const passage = readingPassages.find((p, pIdx) => {
            if (Array.isArray(p.essayQuestionNumbers) && p.essayQuestionNumbers.length > 0) {
              return p.essayQuestionNumbers[0] === eq.number;
            }
            const matching = essayQuestions.filter((e) => e.readingPassageId === p.id);
            if (matching.length > 0 && matching[0].number === eq.number) return true;
            if (pIdx === 0 && eq.number === 1 && multipleChoiceQuestions.length === 0 && (!p.questionNumbers || p.questionNumbers.length === 0)) return true;
            const isLang = isArabic || /bahasa\s*(arab|indonesia|inggris|jawa|sunda)|arabic|english|indonesian/i.test(metadata.subjectName);
            const anyEssayHasPassageId = essayQuestions.some((e) => !!e.readingPassageId);
            if (isLang && !anyEssayHasPassageId && pIdx === 0 && eq.number === 1) return true;
            return false;
          });

          const isPassageArabic = isArabic || (passage && /[\u0600-\u06FF]/.test(passage.content));
          const passageHtml = passage
            ? `
          <div class="reading-box" ${isPassageArabic ? 'dir="rtl"' : ""}>
            <div class="reading-box-header">
              📖 ${
                isPassageArabic
                  ? `اقْرَأِ النَّصَّ الْآتِيَ لِلْإِجَابَةِ عَنِ الْأَسْئِلَةِ الْمَقَالِيَّةِ (${
                      passage.essayQuestionNumbers && passage.essayQuestionNumbers.length > 0
                        ? `رَقْمُ ${passage.essayQuestionNumbers.join(", ")}`
                        : passage.questionRange || "التَّالِيَةِ"
                    })`
                  : `Bacalah teks wacana berikut untuk menjawab soal essay ${
                      passage.essayQuestionNumbers && passage.essayQuestionNumbers.length > 0
                        ? `nomor ${passage.essayQuestionNumbers.join(", ")}`
                        : passage.questionRange || "berikut"
                    }!`
              }
              ${passage.source ? `<span style="font-style: italic; font-weight: normal; font-size: 9pt;"> (${passage.source})</span>` : ""}
            </div>
            <div class="reading-box-title ${isPassageArabic ? "arabic-box" : ""}">${passage.title}</div>
            <div class="reading-box-content ${isPassageArabic ? "arabic-box" : ""}">${passage.content}</div>
          </div>
          `
            : "";

          const isEqArabic = isArabic || /[\u0600-\u06FF]/.test(eq.questionText);
          return `
          ${passageHtml}
          <div class="${isEqArabic ? "arabic-q" : "question-item"}" ${isEqArabic ? 'dir="rtl"' : ""}>
            <strong>${eq.number}.</strong> ${eq.questionText}
          </div>
        `;
        })
        .join("")}
    </div>
    `;
  }

  // Answer Key HTML
  let keyRomanClassic = 1;
  const toRoman = (n: number) => ["I", "II", "III", "IV", "V", "VI"][n - 1] || `${n}`;

  let answerKeysHtml = "";

  if (multipleChoiceQuestions.length > 0) {
    answerKeysHtml += `
    <p style="font-weight: bold; font-size: 11pt; margin-top: 10pt; margin-bottom: 4pt;">
      ${toRoman(keyRomanClassic++)}. Kunci Jawaban Pilihan Ganda
    </p>
    <table class="key-table">
      <thead>
        <tr style="background-color: #f2f2f2;">
          <th style="width: 8%; text-align: center;">No</th>
          <th style="width: 12%; text-align: center;">Kunci</th>
          <th style="text-align: left;">Pembahasan / Penjelasan Singkat</th>
        </tr>
      </thead>
      <tbody>
        ${multipleChoiceQuestions
          .map(
            (q) => `
          <tr>
            <td style="text-align: center;">${q.number}</td>
            <td style="text-align: center; font-weight: bold;">${q.correctAnswer}</td>
            <td>${q.explanation || "-"}</td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>
    `;
  }

  if (trueFalseQuestions.length > 0) {
    answerKeysHtml += `
    <p style="font-weight: bold; font-size: 11pt; margin-top: 12pt; margin-bottom: 4pt;">
      ${toRoman(keyRomanClassic++)}. Kunci Jawaban Menentukan Benar / Salah
    </p>
    <table class="key-table">
      <thead>
        <tr style="background-color: #f2f2f2;">
          <th style="width: 8%; text-align: center;">No</th>
          <th style="width: 50%; text-align: left;">Pernyataan</th>
          <th style="width: 14%; text-align: center;">Kunci Status</th>
          <th style="text-align: left;">Alasan / Penjelasan</th>
        </tr>
      </thead>
      <tbody>
        ${trueFalseQuestions
          .map((tf) =>
            tf.statements
              .map(
                (st, sIdx) => `
            <tr>
              <td style="text-align: center;">${tf.number}.${sIdx + 1}</td>
              <td>${st.statement}</td>
              <td style="text-align: center; font-weight: bold; color: ${st.isCorrect ? "#006837" : "#b91c1c"};">
                ${st.isCorrect ? "BENAR" : "SALAH"}
              </td>
              <td>${st.explanation || "-"}</td>
            </tr>
          `
              )
              .join("")
          )
          .join("")}
      </tbody>
    </table>
    `;
  }

  if (matchingQuestions.length > 0) {
    answerKeysHtml += `
    <p style="font-weight: bold; font-size: 11pt; margin-top: 12pt; margin-bottom: 4pt;">
      ${toRoman(keyRomanClassic++)}. Kunci Jawaban Mencocokkan Pasangan / Menjodohkan
    </p>
    <table class="key-table">
      <thead>
        <tr style="background-color: #f2f2f2;">
          <th style="width: 8%; text-align: center;">Soal</th>
          <th style="width: 45%; text-align: left;">Pasangan Premis & Pilihan Tepat</th>
          <th style="text-align: left;">Penjelasan / Keterangan</th>
        </tr>
      </thead>
      <tbody>
        ${matchingQuestions
          .map((mq) =>
            mq.correctPairs
              .map((cp) => {
                const p = mq.premises.find((x) => x.key === cp.premiseKey);
                const t = mq.targets.find((x) => x.key === cp.targetKey);
                return `
                <tr>
                  <td style="text-align: center;">No. ${mq.number}</td>
                  <td><strong>[${cp.premiseKey}]</strong> ${p?.text || ""} ➔ <strong>[${cp.targetKey}]</strong> ${t?.text || ""}</td>
                  <td>${cp.explanation || "-"}</td>
                </tr>
              `;
              })
              .join("")
          )
          .join("")}
      </tbody>
    </table>
    `;
  }

  if (literacyQuestions.length > 0) {
    answerKeysHtml += `
    <div style="margin-top: 12pt;">
      <p style="font-weight: bold; font-size: 11pt; margin-bottom: 4pt;">
        ${toRoman(keyRomanClassic++)}. Kunci Jawaban Literasi Teks & Data
      </p>
      ${literacyQuestions
        .map(
          (lq) => `
        <div style="margin-bottom: 8pt; font-size: 10pt;">
          <p style="margin: 0;"><strong>Soal No. ${lq.number} (${lq.stimulusTitle}):</strong> <em>${lq.questionText}</em></p>
          <div style="margin-left: 15pt; margin-top: 2pt;">
            <p style="margin: 1pt 0;"><strong>Kunci Jawaban:</strong> <span style="font-weight: bold; color: #006837;">[ ${lq.correctAnswer || "Jawaban Terurai"} ]</span></p>
            <p style="margin: 1pt 0; color: #444;"><strong>Pembahasan:</strong> ${lq.explanation || "-"}</p>
            ${
              lq.subQuestions && lq.subQuestions.length > 0
                ? lq.subQuestions
                    .map(
                      (sub, sIdx) => `
                  <p style="margin: 1pt 0 1pt 10pt; font-size: 9.5pt;">
                    <strong>${String.fromCharCode(97 + sIdx)}.</strong> ${sub.question} ➔ <strong>Kunci:</strong> ${sub.answerKey} (${sub.explanation || ""})
                  </p>
                `
                    )
                    .join("")
                : ""
            }
          </div>
        </div>
      `
        )
        .join("")}
    </div>
    `;
  }

  if (essayQuestions.length > 0) {
    answerKeysHtml += `
    <div style="margin-top: 12pt;">
      <p style="font-weight: bold; font-size: 11pt; margin-bottom: 4pt;">
        ${toRoman(keyRomanClassic++)}. Kunci Jawaban & Rubrik Penskoran Soal Essay
      </p>
      ${essayQuestions
        .map(
          (eq) => `
        <div style="margin-bottom: 8pt; font-size: 10pt;">
          <p style="margin: 0;"><strong>Soal No. ${eq.number}:</strong> <em>${eq.questionText}</em></p>
          <div style="margin-left: 15pt; margin-top: 2pt;">
            <p style="margin: 1pt 0;"><strong>Model Jawaban:</strong> ${eq.modelAnswer}</p>
            <p style="margin: 1pt 0; color: #333;"><strong>Pedoman Penskoran:</strong> ${eq.scoringRubric || "Skor Maksimal: 10"}</p>
          </div>
        </div>
      `
        )
        .join("")}
    </div>
    `;
  }

  const html = `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'>
  <title>Naskah Soal ${metadata.subjectName}</title>
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
    div.Section1 { page: Section1; }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 11pt;
      line-height: 1.25;
      color: #000000;
      background-color: #ffffff;
    }
    .text-center { text-align: center; }
    .text-bold { font-weight: bold; }
    .text-italic { font-style: italic; }
    .kop-title1 { font-size: 11pt; font-weight: bold; margin: 0; }
    .kop-title2 { font-size: 10pt; font-weight: bold; margin: 2pt 0; }
    .kop-title3 { font-size: 14pt; font-weight: bold; margin: 3pt 0; color: #000; }
    .kop-info { font-size: 9pt; margin: 1pt 0; }
    .kop-line {
      border-bottom: 3px double #000000;
      margin-top: 4pt;
      margin-bottom: 12pt;
      padding-bottom: 2pt;
    }
    table.meta-table {
      width: 100%;
      border-collapse: collapse;
      border-top: 1px solid #444;
      border-bottom: 1px solid #444;
      margin: 8pt 0 12pt 0;
      font-size: 10pt;
    }
    table.meta-table td {
      padding: 3pt 6pt;
      vertical-align: top;
    }
    table.key-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6pt;
      font-size: 10pt;
    }
    table.key-table th, table.key-table td {
      border: 1px solid #000;
      padding: 4pt 6pt;
    }
    .question-item {
      margin-top: 6pt;
      margin-bottom: 3pt;
      text-align: justify;
    }
    .reading-box {
      border: 1.5pt solid #006837;
      background-color: #f0fdf4;
      padding: 6pt 10pt;
      margin: 8pt 0 6pt 0;
    }
    .reading-box-header {
      font-weight: bold;
      font-size: 9.5pt;
      color: #006837;
      margin-bottom: 3pt;
    }
    .reading-box-title {
      font-weight: bold;
      font-size: 10.5pt;
      text-align: center;
      margin-bottom: 4pt;
      text-transform: uppercase;
    }
    .reading-box-content {
      font-size: 10pt;
      text-align: justify;
      white-space: pre-line;
      line-height: 1.3;
    }
    .option-item {
      margin-left: 20pt;
      margin-top: 1pt;
      margin-bottom: 1pt;
    }
    .arabic-q {
      direction: rtl;
      text-align: right;
      font-family: 'Traditional Arabic', 'Amiri', 'Times New Roman', serif;
      font-size: 13.5pt;
      line-height: 1.8;
      margin-top: 6pt;
      margin-bottom: 3pt;
    }
    .arabic-opt {
      direction: rtl;
      text-align: right;
      font-family: 'Traditional Arabic', 'Amiri', 'Times New Roman', serif;
      font-size: 12.5pt;
      margin-right: 20pt;
      margin-top: 2pt;
      margin-bottom: 2pt;
      line-height: 1.7;
    }
    .arabic-box {
      direction: rtl;
      text-align: right;
      font-family: 'Traditional Arabic', 'Amiri', 'Times New Roman', serif;
      font-size: 13pt;
      line-height: 1.8;
    }
    .page-break {
      page-break-before: always;
      mso-break-type: section-break;
    }
  </style>
</head>
<body>
<div class="Section1">
  <!-- KOP RESMI -->
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 2pt;">
    <tr>
      <td style="width: 75px; vertical-align: middle; text-align: center;">
        ${
          schoolIdentity.useLeftLogo !== false && schoolIdentity.logoBase64
            ? `<img src="${schoolIdentity.logoBase64}" width="70" height="70" style="width: 70px; height: 70px; object-fit: contain;" alt="Logo Kiri" />`
            : `<div style="width: 70px;"></div>`
        }
      </td>
      <td style="text-align: center; vertical-align: middle; padding: 0 8pt;">
        <p class="kop-title1">${(schoolIdentity.ministryName || "KEMENTERIAN AGAMA REPUBLIK INDONESIA").toUpperCase()}</p>
        <p class="kop-title2">${(schoolIdentity.subMinistryName || "KANTOR KEMENTERIAN AGAMA").toUpperCase()}</p>
        <p class="kop-title3">${(schoolIdentity.schoolName || "MADRASAH ALIYAH NEGERI").toUpperCase()}</p>
        ${
          schoolIdentity.accreditation
            ? `<p style="font-size: 10pt; font-weight: bold; margin: 2pt 0; color: #111;">${schoolIdentity.accreditation}</p>`
            : ""
        }
        <p class="kop-info text-italic">${schoolIdentity.address || "Jalan Raya Pendidikan No. 1"}</p>
        <p class="kop-info text-italic">${schoolIdentity.contact || "Telp. (021) 1234567 | Email: madrasah@kemenag.go.id"}</p>
      </td>
      <td style="width: 75px; vertical-align: middle; text-align: center;">
        ${
          schoolIdentity.useRightLogo && schoolIdentity.rightLogoBase64
            ? `<img src="${schoolIdentity.rightLogoBase64}" width="70" height="70" style="width: 70px; height: 70px; object-fit: contain;" alt="Logo Kanan" />`
            : `<div style="width: 70px;"></div>`
        }
      </td>
    </tr>
  </table>
  <div class="kop-line"></div>

  <!-- JUDUL UJIAN -->
  <div class="text-center" style="margin-bottom: 8pt;">
    <p style="font-size: 12pt; font-weight: bold; margin: 0;">NASKAH SOAL ${metadata.examType.toUpperCase()}</p>
    <p style="font-size: 10.5pt; font-weight: bold; margin: 2pt 0 6pt 0;">TAHUN AJARAN ${metadata.academicYear}</p>
  </div>

  <!-- TABEL IDENTITAS (Kolom Kanan Digeser Ketengah & Rapi) -->
  <table class="meta-table" style="width: 100%; border-collapse: collapse; border-top: 1pt solid #444; border-bottom: 1pt solid #444; margin: 8pt 0 12pt 0; font-size: 10pt;">
    <tr>
      <td style="width: 15%; font-weight: bold; white-space: nowrap; padding: 2pt 4pt;">Mata Pelajaran</td>
      <td style="width: 2%; text-align: center; padding: 2pt 2pt;">:</td>
      <td style="width: 31%; padding: 2pt 4pt;">${metadata.subjectName}</td>
      <td style="width: 15%; font-weight: bold; white-space: nowrap; padding: 2pt 4pt;">Hari / Tanggal</td>
      <td style="width: 2%; text-align: center; padding: 2pt 2pt;">:</td>
      <td style="width: 35%; white-space: nowrap; padding: 2pt 4pt;">${metadata.examDate}</td>
    </tr>
    <tr>
      <td style="font-weight: bold; white-space: nowrap; padding: 2pt 4pt;">Kelas / Jenjang</td>
      <td style="text-align: center; padding: 2pt 2pt;">:</td>
      <td style="padding: 2pt 4pt;">Kelas ${metadata.grade} (${metadata.gradeLevel})</td>
      <td style="font-weight: bold; white-space: nowrap; padding: 2pt 4pt;">Waktu</td>
      <td style="text-align: center; padding: 2pt 2pt;">:</td>
      <td style="padding: 2pt 4pt;">${metadata.timeAllocation}</td>
    </tr>
    <tr>
      <td style="font-weight: bold; white-space: nowrap; padding: 2pt 4pt;">Semester</td>
      <td style="text-align: center; padding: 2pt 2pt;">:</td>
      <td style="padding: 2pt 4pt;">${metadata.semester}</td>
      <td style="font-weight: bold; white-space: nowrap; padding: 2pt 4pt;">Guru Pengampu</td>
      <td style="text-align: center; padding: 2pt 2pt;">:</td>
      <td style="white-space: nowrap; padding: 2pt 4pt;">${metadata.teacherName}</td>
    </tr>
  </table>

  <!-- PETUNJUK UMUM -->
  <div style="margin-bottom: 10pt; font-size: 10pt;">
    <p style="font-weight: bold; margin: 0 0 3pt 0;">PETUNJUK UMUM:</p>
    <ol style="margin: 0; padding-left: 18pt;">
      ${generalInstructions.map((inst) => `<li>${inst}</li>`).join("")}
    </ol>
  </div>

  <!-- SOAL SECTIONS -->
  ${mcHtml}
  ${tfHtml}
  ${matchHtml}
  ${litHtml}
  ${essayHtml}

  <!-- PAGE BREAK UNTUK KUNCI JAWABAN TERPISAH -->
  <div class="page-break"></div>
  <br clear="all" style="page-break-before: always; mso-break-type: section-break" />

  <!-- LEMBAR KUNCI JAWABAN & RUBRIK PENSKORAN -->
  <div class="text-center" style="margin-bottom: 12pt;">
    <p style="font-size: 12pt; font-weight: bold; margin: 0;">LEMBAR KUNCI JAWABAN & PEDOMAN PENSKORAN</p>
    <p style="font-size: 10pt; font-weight: bold; margin: 2pt 0;">Mata Pelajaran: ${metadata.subjectName} | Kelas ${metadata.grade} (${metadata.gradeLevel}) | ${metadata.examType}</p>
    <p style="font-size: 9pt; font-style: italic; margin: 0;">Guru Pengampu: ${metadata.teacherName} | Tanggal: ${metadata.examDate}</p>
  </div>

  ${answerKeysHtml}

</div>
</body>
</html>`;

  const blob = new Blob(["\ufeff" + html], { type: "application/msword;charset=utf-8" });
  const safeFilename = `Soal_${metadata.subjectName.replace(/[^a-zA-Z0-9]/g, "_")}_Kelas${metadata.grade}_${metadata.examType.replace(/[^a-zA-Z0-9]/g, "_")}_${paperSize}_WordClassic.doc`;
  saveAs(blob, safeFilename);
}
