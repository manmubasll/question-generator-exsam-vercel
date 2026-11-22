import React, { useMemo, useState } from "react";
import { ExamData } from "../types";

type ReadResult = { number: number; answer: string | null; note?: string };
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
  const [result, setResult] = useState<ReadResult[] | null>(null);
  const [error, setError] = useState("");

  const printSheet = () => {
    if (!questions.length) { alert("Naskah ini belum memiliki soal pilihan ganda."); return; }
    const rows = questions.map(q => `<tr><td class="num">${q.number}</td>${optionKeys.map(k => `<td><span class="bubble">${k}</span></td>`).join("")}</tr>`).join("");
    const html = `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Lembar Jawaban - ${escapeHtml(examData.metadata.subjectName)}</title><style>
      @page{size:A4;margin:12mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#111;font-size:11px}.kop{text-align:center;border-bottom:3px double #111;padding-bottom:8px;margin-bottom:10px}.kop b{font-size:15px}.title{text-align:center;font-weight:bold;font-size:15px;margin:12px 0}.meta{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0}.line{border-bottom:1px solid #222;display:inline-block;min-width:150px;height:18px}.instructions{border:1px solid #555;padding:7px;margin:8px 0}.grid{width:100%;border-collapse:collapse;margin-top:10px}.grid th,.grid td{border:1px solid #555;text-align:center;padding:4px}.grid th{background:#eee}.num{font-weight:bold;width:40px}.bubble{display:inline-flex;border:1.5px solid #111;border-radius:50%;width:22px;height:22px;align-items:center;justify-content:center;font-weight:bold}.foot{margin-top:20px;display:flex;justify-content:space-between}.code{font-size:9px;color:#555}@media print{button{display:none}}</style></head><body>
      <div class="kop"><b>${escapeHtml(examData.schoolIdentity.ministryName)}</b><br>${escapeHtml(examData.schoolIdentity.subMinistryName)}<br><b>${escapeHtml(examData.schoolIdentity.schoolName)}</b><br>${escapeHtml(examData.schoolIdentity.address)}</div>
      <div class="title">LEMBAR JAWABAN PESERTA UJIAN</div><div style="text-align:center">${escapeHtml(examData.metadata.examType)} • Tahun Ajaran ${escapeHtml(examData.metadata.academicYear)}</div>
      <div class="meta"><div>Nama: <span class="line">${escapeHtml(studentName)}</span></div><div>Nomor Peserta: <span class="line">${escapeHtml(studentNumber)}</span></div><div>Kelas: <span class="line">${escapeHtml(studentClass)}</span></div><div>Mata Pelajaran: <b>${escapeHtml(examData.metadata.subjectName)}</b></div><div>Hari/Tanggal: ${escapeHtml(examData.metadata.examDate)}</div><div>Guru: ${escapeHtml(examData.metadata.teacherName)}</div></div>
      <div class="instructions"><b>Petunjuk:</b> Hitamkan satu bulatan jawaban dengan pensil 2B. Jangan melingkari atau memberi tanda silang. Jika salah, hapus hingga bersih. Pastikan hanya satu jawaban untuk setiap nomor.</div>
      <table class="grid"><thead><tr><th>NO.</th>${optionKeys.map(k=>`<th>${k}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table>
      <div class="foot"><div>Jumlah soal: <b>${questions.length}</b></div><div>Tanda tangan peserta: ____________________</div></div><p class="code">Lembar jawaban dibuat otomatis oleh Question Generator Exam. Pastikan hasil scan/foto tidak terpotong, rata, dan cukup terang.</p>
      <script>window.onload=()=>window.print()</script></body></html>`;
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) { alert("Izinkan pop-up browser untuk mencetak lembar jawaban."); return; }
    w.document.open(); w.document.write(html); w.document.close();
  };

  const scanSheet = async () => {
    if (!file) { setError("Pilih foto atau hasil scan lembar jawaban terlebih dahulu."); return; }
    if (!questions.length) { setError("Tidak ada soal pilihan ganda untuk dikoreksi."); return; }
    setReading(true); setError(""); setResult(null);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const img = new Image(); const url = URL.createObjectURL(file);
        img.onload = () => { const scale = Math.min(1, 1800 / img.width); const canvas = document.createElement("canvas"); canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale); const ctx = canvas.getContext("2d"); if (!ctx) { reject(new Error("Tidak dapat memproses gambar.")); return; } ctx.drawImage(img, 0, 0, canvas.width, canvas.height); URL.revokeObjectURL(url); resolve(canvas.toDataURL("image/jpeg", 0.78)); };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("File gambar tidak dapat dibaca.")); }; img.src = url;
      });
      const response = await fetch("/api/grade-answer-sheet", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ imageBase64:dataUrl.split(",")[1], mimeType:"image/jpeg", questionCount:questions.length, optionKeys }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Gagal membaca lembar jawaban.");
      const answers: ReadResult[] = payload.answers || [];
      setResult(answers);
    } catch (e: any) { setError(e.message || "Terjadi kesalahan saat membaca lembar jawaban."); }
    finally { setReading(false); }
  };

  const score = result ? result.reduce((sum, r, i) => sum + (r.answer && r.answer === questions[i]?.correctAnswer ? 1 : 0), 0) : 0;
  const uncertain = result?.filter(r => !r.answer || r.note).length || 0;
  return <section className="bg-white border border-emerald-200 rounded-2xl p-4 sm:p-6 shadow-sm space-y-5">
    <div><h2 className="text-lg font-extrabold text-emerald-900">Lembar Jawaban & Koreksi Otomatis</h2><p className="text-sm text-slate-600 mt-1">Cetak lembar jawaban khusus untuk naskah ini, lalu unggah foto/scan untuk dibaca AI. Tahap awal mendukung pilihan ganda.</p></div>
    {!questions.length ? <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded-lg">Naskah ini belum memiliki soal pilihan ganda.</p> : <>
      <div className="grid sm:grid-cols-3 gap-3">
        <label className="text-sm font-semibold text-slate-700">Nama siswa<input className="mt-1 w-full border rounded-lg p-2 font-normal" value={studentName} onChange={e=>setStudentName(e.target.value)} placeholder="Nama lengkap"/></label>
        <label className="text-sm font-semibold text-slate-700">Nomor peserta<input className="mt-1 w-full border rounded-lg p-2 font-normal" value={studentNumber} onChange={e=>setStudentNumber(e.target.value)} placeholder="Nomor peserta"/></label>
        <label className="text-sm font-semibold text-slate-700">Kelas<input className="mt-1 w-full border rounded-lg p-2 font-normal" value={studentClass} onChange={e=>setStudentClass(e.target.value)}/></label>
      </div>
      <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><b className="text-emerald-950">1. Cetak lembar jawaban</b><p className="text-xs text-emerald-800 mt-1">Format A4, ${questions.length} nomor, opsi ${optionKeys.join(", ")}.</p></div><button onClick={printSheet} className="bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg px-4 py-2 text-sm font-bold">Cetak / Simpan PDF</button></div>
      <div className="rounded-xl bg-slate-50 border p-4 space-y-3"><div><b className="text-slate-900">2. Unggah foto atau scan jawaban</b><p className="text-xs text-slate-600 mt-1">Foto seluruh halaman dari atas, tidak miring, tidak terpotong, dan cahaya merata. Gunakan satu lembar per unggahan.</p></div><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{setFile(e.target.files?.[0]||null);setResult(null);}} className="block w-full text-sm"/><button disabled={!file||reading} onClick={scanSheet} className="bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-bold">{reading ? "Sedang membaca lembar..." : "Baca & Koreksi Jawaban"}</button></div>
      {error && <div className="bg-rose-50 text-rose-800 border border-rose-200 rounded-lg p-3 text-sm">{error}</div>}
      {result && <div className="border rounded-xl p-4 space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><b className="text-emerald-900">3. Hasil pembacaan (wajib diverifikasi guru)</b><span className="text-sm font-bold">Skor sementara: {Math.round(score/questions.length*100)} / 100 ({score}/{questions.length})</span></div><p className="text-xs text-amber-800 bg-amber-50 p-2 rounded">Jawaban kosong, ganda, atau tidak terbaca harus diperiksa manual. AI dapat keliru membaca tanda pada foto; hasil ini belum menjadi nilai final.</p><div className="grid grid-cols-5 sm:grid-cols-8 gap-2">{result.map((r,i)=><div key={r.number} className={`border rounded-lg p-2 text-center ${!r.answer||r.note?"bg-amber-50 border-amber-300":r.answer===questions[i]?.correctAnswer?"bg-emerald-50":"bg-rose-50"}`}><div className="text-xs text-slate-500">{r.number}</div><b>{r.answer || "?"}</b><div className="text-[10px] text-slate-500">{r.answer===questions[i]?.correctAnswer?"Benar":r.answer?"Salah":"Cek"}</div></div>)}</div><p className="text-xs text-slate-600">Perlu pemeriksaan manual: {uncertain} nomor. Koreksi akhir tetap menjadi tanggung jawab guru.</p><button onClick={()=>{const lines=["Nomor,Jawaban Siswa,Kunci,Status",...result.map((r,i)=>[r.number,r.answer||"",questions[i]?.correctAnswer||"",r.answer?(r.answer===questions[i]?.correctAnswer?"Benar":"Salah"):"Periksa"].join(","))];const blob=new Blob([lines.join("\n")],{type:"text/csv;charset=utf-8"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="hasil-koreksi-jawaban.csv";a.click();URL.revokeObjectURL(url);}} className="border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold">Unduh Rekap CSV</button></div>}
    </>}
  </section>;
};
