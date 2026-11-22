import React, { useMemo, useState } from "react";
import { ExamData } from "../types";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

type ReadResult = {
  page: number;
  student: { name: string; studentNumber: string; className: string };
  answers: { number: number; answer: string | null; note?: string }[];
};
interface Props { examData: ExamData; }

const escapeHtml = (value: string) => String(value || "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c] || c));

export const AnswerSheetPanel: React.FC<Props> = ({ examData }) => {
  const questions = examData.multipleChoiceQuestions || [];
  const optionKeys = useMemo(() => Array.from(new Set(questions.flatMap(q => q.options.map(o => o.key.toUpperCase())))).sort(), [questions]);
  const [studentName, setStudentName] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [studentClass, setStudentClass] = useState(String(examData.metadata.grade));
  const [file, setFile] = useState<File | null>(null);
  const [reading, setReading] = useState(false);
  const [progress, setProgress] = useState("");
  const [results, setResults] = useState<ReadResult[] | null>(null);
  const [error, setError] = useState("");

  const printSheet = () => {
    if (!questions.length) { alert("Naskah ini belum memiliki soal pilihan ganda."); return; }
    const rows = questions.map(q => `<tr><td class="num">${q.number}</td>${optionKeys.map(k => `<td><span class="bubble">${k}</span></td>`).join("")}</tr>`).join("");
    const html = `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Lembar Jawaban - ${escapeHtml(examData.metadata.subjectName)}</title><style>
      @page{size:A4;margin:12mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#111;font-size:11px}.kop{text-align:center;border-bottom:3px double #111;padding-bottom:8px;margin-bottom:10px}.kop b{font-size:15px}.title{text-align:center;font-weight:bold;font-size:15px;margin:12px 0}.meta{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0}.line{border-bottom:1px solid #222;display:inline-block;min-width:150px;height:18px}.instructions{border:1px solid #555;padding:7px;margin:8px 0}.grid{width:100%;border-collapse:collapse;margin-top:10px}.grid th,.grid td{border:1px solid #555;text-align:center;padding:4px}.grid th{background:#eee}.num{font-weight:bold;width:40px}.bubble{display:inline-flex;border:1.5px solid #111;border-radius:50%;width:22px;height:22px;align-items:center;justify-content:center;font-weight:bold}.foot{margin-top:20px;display:flex;justify-content:space-between}.code{font-size:9px;color:#555}</style></head><body>
      <div class="kop"><b>${escapeHtml(examData.schoolIdentity.ministryName)}</b><br>${escapeHtml(examData.schoolIdentity.subMinistryName)}<br><b>${escapeHtml(examData.schoolIdentity.schoolName)}</b><br>${escapeHtml(examData.schoolIdentity.address)}</div>
      <div class="title">LEMBAR JAWABAN PESERTA UJIAN</div><div style="text-align:center">${escapeHtml(examData.metadata.examType)} • Tahun Ajaran ${escapeHtml(examData.metadata.academicYear)}</div>
      <div class="meta"><div>Nama: <span class="line">${escapeHtml(studentName)}</span></div><div>Nomor Peserta: <span class="line">${escapeHtml(studentNumber)}</span></div><div>Kelas: <span class="line">${escapeHtml(studentClass)}</span></div><div>Mata Pelajaran: <b>${escapeHtml(examData.metadata.subjectName)}</b></div><div>Hari/Tanggal: ${escapeHtml(examData.metadata.examDate)}</div><div>Guru: ${escapeHtml(examData.metadata.teacherName)}</div></div>
      <div class="instructions"><b>Petunjuk:</b> Hitamkan satu bulatan jawaban dengan pensil 2B. Jangan melingkari atau memberi tanda silang. Jika salah, hapus hingga bersih. Pastikan hanya satu jawaban untuk setiap nomor.</div>
      <table class="grid"><thead><tr><th>NO.</th>${optionKeys.map(k=>`<th>${k}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table>
      <div class="foot"><div>Jumlah soal: <b>${questions.length}</b></div><div>Tanda tangan peserta: ____________________</div></div><p class="code">Question Generator Exam • Pastikan hasil scan/foto tidak terpotong, rata, dan cukup terang.</p></body></html>`;
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) { alert("Izinkan pop-up browser untuk mencetak lembar jawaban."); return; }
    w.document.open(); w.document.write(html); w.document.close(); w.onload = () => w.print();
  };

  const readImage = async (imageBase64: string, page: number) => {
    const response = await fetch("/api/grade-answer-sheet", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ imageBase64, mimeType:"image/jpeg", questionCount:questions.length, optionKeys }) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || `Gagal membaca halaman ${page}.`);
    return { page, student: payload.student || { name:"", studentNumber:"", className:"" }, answers: payload.answers || [] } as ReadResult;
  };

  const scanFile = async () => {
    if (!file) { setError("Pilih satu PDF berisi beberapa halaman LJK, atau satu foto LJK."); return; }
    if (!questions.length) { setError("Tidak ada soal pilihan ganda untuk dikoreksi."); return; }
    setReading(true); setError(""); setResults(null);
    const completed: ReadResult[] = [];
    try {
      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
        if (pdf.numPages > 50) throw new Error("PDF maksimal 50 halaman per proses. Silakan bagi dokumen menjadi beberapa file.");
        for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
          setProgress(`Membaca halaman ${pageNo} dari ${pdf.numPages}...`);
          const page = await pdf.getPage(pageNo);
          const viewport = page.getViewport({ scale: 1.7 });
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(viewport.width); canvas.height = Math.round(viewport.height);
          const context = canvas.getContext("2d");
          if (!context) throw new Error("Browser tidak dapat memproses halaman PDF.");
          await page.render({ canvasContext: context, viewport }).promise;
          const dataUrl = canvas.toDataURL("image/jpeg", 0.78);
          completed.push(await readImage(dataUrl.split(",")[1], pageNo));
          setResults([...completed]);
        }
        await pdf.destroy();
      } else {
        setProgress("Membaca foto LJK...");
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const img = new Image(); const url = URL.createObjectURL(file);
          img.onload = () => { const scale = Math.min(1, 1800 / img.width); const canvas = document.createElement("canvas"); canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale); const ctx = canvas.getContext("2d"); if (!ctx) { reject(new Error("Tidak dapat memproses gambar.")); return; } ctx.drawImage(img, 0, 0, canvas.width, canvas.height); URL.revokeObjectURL(url); resolve(canvas.toDataURL("image/jpeg", 0.78)); };
          img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("File gambar tidak dapat dibaca.")); }; img.src = url;
        });
        completed.push(await readImage(dataUrl.split(",")[1], 1)); setResults(completed);
      }
      setProgress(`Selesai membaca ${completed.length} halaman.`);
    } catch (e: any) {
      setError(e.message || "Terjadi kesalahan saat membaca dokumen.");
      if (completed.length) setResults(completed);
    } finally { setReading(false); }
  };

  const exportCsv = () => {
    if (!results?.length) return;
    const rows = [["Halaman","Nama Siswa","Nomor Peserta","Kelas","Benar","Salah","Perlu Dicek","Nilai"]];
    results.forEach(r => {
      const correct = r.answers.filter((a,i)=>a.answer && a.answer===questions[i]?.correctAnswer && !a.note).length;
      const uncertain = r.answers.filter(a=>!a.answer || a.note).length;
      rows.push([String(r.page),r.student.name,r.student.studentNumber,r.student.className,String(correct),String(questions.length-correct-uncertain),String(uncertain),String(Math.round(correct/questions.length*100))]);
    });
    const csv = rows.map(row=>row.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(",")).join("\r\n");
    const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download="rekap-koreksi-massal.csv"; a.click(); URL.revokeObjectURL(url);
  };

  return <section className="bg-white border border-emerald-200 rounded-2xl p-4 sm:p-6 shadow-sm space-y-5">
    <div><h2 className="text-lg font-extrabold text-emerald-900">Lembar Jawaban & Koreksi Otomatis</h2><p className="text-sm text-slate-600 mt-1">Cetak LJK A4, lalu unggah satu PDF berisi banyak halaman siswa. Setiap halaman diproses sebagai satu siswa.</p></div>
    {!questions.length ? <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded-lg">Naskah ini belum memiliki soal pilihan ganda.</p> : <>
      <div className="grid sm:grid-cols-3 gap-3">
        <label className="text-sm font-semibold text-slate-700">Nama siswa (untuk cetak satu lembar)<input className="mt-1 w-full border rounded-lg p-2 font-normal" value={studentName} onChange={e=>setStudentName(e.target.value)} placeholder="Nama lengkap"/></label>
        <label className="text-sm font-semibold text-slate-700">Nomor peserta<input className="mt-1 w-full border rounded-lg p-2 font-normal" value={studentNumber} onChange={e=>setStudentNumber(e.target.value)} placeholder="Nomor peserta"/></label>
        <label className="text-sm font-semibold text-slate-700">Kelas<input className="mt-1 w-full border rounded-lg p-2 font-normal" value={studentClass} onChange={e=>setStudentClass(e.target.value)}/></label>
      </div>
      <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><b className="text-emerald-950">1. Cetak lembar jawaban</b><p className="text-xs text-emerald-800 mt-1">Format A4, {questions.length} nomor, opsi {optionKeys.join(", ")}.</p></div><button onClick={printSheet} className="bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg px-4 py-2 text-sm font-bold">Cetak / Simpan PDF</button></div>
      <div className="rounded-xl bg-slate-50 border p-4 space-y-3"><div><b className="text-slate-900">2. Unggah LJK (PDF atau gambar)</b><p className="text-xs text-slate-600 mt-1">Satu halaman PDF untuk satu siswa. Bisa unggah PDF berisi hingga 50 halaman atau satu foto JPG/PNG. Pastikan nama dan identitas ditulis jelas pada setiap LJK.</p></div><input type="file" accept="application/pdf,image/jpeg,image/png,image/webp,.pdf" onChange={e=>{setFile(e.target.files?.[0]||null);setResults(null);setProgress("");setError("");}} className="block w-full text-sm"/><button disabled={!file||reading} onClick={scanFile} className="bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-bold">{reading ? "Sedang memproses..." : "Baca & Koreksi Semua LJK"}</button>{progress && <p className="text-xs text-blue-800">{progress}</p>}</div>
      {error && <div className="bg-rose-50 text-rose-800 border border-rose-200 rounded-lg p-3 text-sm">{error}</div>}
      {results && results.length>0 && <div className="border rounded-xl p-4 space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><b className="text-emerald-900">3. Rekap hasil pembacaan ({results.length} siswa/halaman)</b><button onClick={exportCsv} className="border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold">Unduh Rekap CSV</button></div><p className="text-xs text-amber-800 bg-amber-50 p-2 rounded">Hasil pembacaan AI wajib diverifikasi guru sebelum nilai ditetapkan. Halaman yang identitasnya tidak terbaca atau jawabannya meragukan harus diperiksa manual.</p>
      <div className="overflow-x-auto"><table className="w-full text-sm border-collapse"><thead><tr className="bg-slate-100"><th className="border p-2">Hal.</th><th className="border p-2 text-left">Nama Siswa</th><th className="border p-2">No. Peserta</th><th className="border p-2">Kelas</th><th className="border p-2">Benar</th><th className="border p-2">Perlu cek</th><th className="border p-2">Nilai*</th></tr></thead><tbody>{results.map(r=>{const correct=r.answers.filter((a,i)=>a.answer&&a.answer===questions[i]?.correctAnswer&&!a.note).length;const uncertain=r.answers.filter(a=>!a.answer||a.note).length;return <tr key={r.page}><td className="border p-2 text-center">{r.page}</td><td className="border p-2">{r.student.name||<span className="text-amber-700">Tidak terbaca</span>}</td><td className="border p-2 text-center">{r.student.studentNumber||"-"}</td><td className="border p-2 text-center">{r.student.className||"-"}</td><td className="border p-2 text-center">{correct}</td><td className="border p-2 text-center">{uncertain}</td><td className="border p-2 text-center font-bold">{Math.round(correct/questions.length*100)}</td></tr>})}</tbody></table></div><p className="text-xs text-slate-500">*Nilai sementara dari jawaban yang terbaca benar; jawaban yang perlu dicek belum dihitung benar.</p>
      <details className="border rounded-lg p-3"><summary className="font-semibold cursor-pointer">Lihat rincian jawaban per siswa</summary>{results.map(r=><div key={r.page} className="py-3 border-b last:border-0"><b>Halaman {r.page} — {r.student.name||"Identitas belum terbaca"}</b><div className="flex flex-wrap gap-2 mt-2">{r.answers.map((a,i)=><span key={a.number} className={`border rounded px-2 py-1 text-xs ${!a.answer||a.note?"bg-amber-50":a.answer===questions[i]?.correctAnswer?"bg-emerald-50":"bg-rose-50"}`}>{a.number}: {a.answer||"?"}</span>)}</div></div>)}</details></div>}
    </>}
  </section>;
};
