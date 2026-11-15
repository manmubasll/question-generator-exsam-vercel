import React, { useState } from "react";
import { Header } from "./components/Header";
import { ExamForm } from "./components/ExamForm";
import { ExamViewer } from "./components/ExamViewer";
import { SchoolIdentityModal } from "./components/SchoolIdentityModal";
import {
  ExamData,
  GenerateExamPayload,
  SchoolIdentity,
} from "./types";
import {
  Sparkles,
  BookCheck,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  ShieldCheck,
  Layers,
  ChevronRight,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

// Default School Identity (Kemenag Madrasah style)
const INITIAL_SCHOOL_IDENTITY: SchoolIdentity = {
  ministryName: "KEMENTERIAN AGAMA REPUBLIK INDONESIA",
  subMinistryName: "KANTOR KEMENTERIAN AGAMA KABUPATEN / KOTA",
  schoolName: "MADRASAH TSANAWIYAH NEGERI 1",
  accreditation: "Terakreditasi A (Unggul)",
  address: "Jalan Raya Pendidikan No. 01, Kecamatan Sukamakmur",
  contact: "Telp. (021) 7891011 | Website: https://kemenag.go.id | Email: mtsn1@kemenag.go.id",
  useLeftLogo: true,
  useRightLogo: false,
};

export default function App() {
  const [schoolIdentity, setSchoolIdentity] = useState<SchoolIdentity>(INITIAL_SCHOOL_IDENTITY);
  const [isKopModalOpen, setIsKopModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [examData, setExamData] = useState<ExamData | null>(null);
  const [lastPayload, setLastPayload] = useState<GenerateExamPayload | null>(null);

  // Interval to update loading steps for better user feedback
  React.useEffect(() => {
    let interval: any;
    if (isLoading) {
      setLoadingStep(1);
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev < 3 ? prev + 1 : 3));
      }, 3500);
    } else {
      setLoadingStep(1);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleGenerateExam = async (payload: GenerateExamPayload) => {
    setIsLoading(true);
    setErrorMessage(null);
    setLastPayload(payload);

    try {
      const response = await fetch("/api/generate-exam", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const rawText = await response.text();
      let data: any = null;

      try {
        data = JSON.parse(rawText);
      } catch (parseErr) {
        if (!response.ok) {
          throw new Error(
            response.status === 504 || response.status === 408
              ? "Waktu pembuatan soal melampaui batas (timeout). Jika melampirkan banyak foto/PDF, silakan kurangi jumlah halaman atau klik 'Coba Lagi Sekarang'."
              : response.status === 413
              ? "Ukuran file gambar/PDF yang diunggah terlalu besar. Silakan gunakan foto yang lebih ringkas atau kompres file terlebih dahulu."
              : `Server sedang memuat ulang sistem (Status: ${response.status}). Silakan klik tombol 'Coba Lagi Sekarang' di samping.`
          );
        } else {
          throw new Error(
            "Koneksi ke server sempat terputus atau server sedang memuat ulang konfigurasi. Silakan klik tombol 'Coba Lagi Sekarang' di samping."
          );
        }
      }

      if (!response.ok) {
        throw new Error(data?.error || `Terjadi kendala pada server pembuatan soal (Status: ${response.status}).`);
      }

      setExamData(data);
      // Smooth scroll to top of exam viewer
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      console.error("Error generating exam:", err);
      let userFriendlyMessage = err.message || "Terjadi kendala saat menyusun soal. Silakan klik tombol 'Coba Lagi' di samping.";
      if (
        userFriendlyMessage.includes("<!doctype") ||
        userFriendlyMessage.includes("is not valid JSON") ||
        userFriendlyMessage.includes("Unexpected token")
      ) {
        userFriendlyMessage =
          "Koneksi ke server sempat terputus karena server baru saja memuat ulang pembaruan. Silakan klik tombol 'Coba Lagi Sekarang' di samping.";
      }
      setErrorMessage(userFriendlyMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    if (lastPayload) {
      handleGenerateExam(lastPayload);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f2f8f4] via-[#f7faf8] to-[#edf4f0] flex flex-col font-sans relative">
      {/* Header Utama Kemenag */}
      <Header />

      {/* Loading Overlay Modal */}
      {isLoading && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-emerald-100 text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-emerald-100 border-t-[#006837] animate-spin"></div>
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-[#006837]">
                <Sparkles className="w-6 h-6 text-[#d4af37] animate-pulse" />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900 font-serif">
                Menyusun Naskah Soal Ujian...
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                AI Gemini Flash sedang memproses spesifikasi dan materi soal Anda.
              </p>
            </div>

            {/* Stepper indicator */}
            <div className="space-y-2.5 text-left text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className={`flex items-center gap-2.5 transition-colors ${loadingStep >= 1 ? "text-emerald-800 font-bold" : "text-slate-400"}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${loadingStep >= 1 ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500"}`}>
                  1
                </div>
                <span>
                  {lastPayload?.uploadedPhotos && lastPayload.uploadedPhotos.length > 0
                    ? `Menganalisis & Membaca Teks ${lastPayload.uploadedPhotos.length} File (PDF/Foto) Materi`
                    : "Menganalisis Kurikulum & Capaian Materi"}
                </span>
              </div>

              <div className={`flex items-center gap-2.5 transition-colors ${loadingStep >= 2 ? "text-emerald-800 font-bold" : "text-slate-400"}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${loadingStep >= 2 ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500"}`}>
                  2
                </div>
                <span>
                  {lastPayload?.uploadedPhotos && lastPayload.uploadedPhotos.length > 0
                    ? `Menyusun Wacana Teks & Butir Soal (${lastPayload.questionsPerPassage || 5} Soal/Bacaan)`
                    : "Menyusun Butir Soal Bebas LaTeX & Opsi Standar"}
                </span>
              </div>

              <div className={`flex items-center gap-2.5 transition-colors ${loadingStep >= 3 ? "text-emerald-800 font-bold" : "text-slate-400"}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${loadingStep >= 3 ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500"}`}>
                  3
                </div>
                <span>Menyiapkan Lembar Kunci & Rubrik Penskoran</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 italic">
              Mohon tunggu sejenak, soal akan otomatis ditampilkan setelah selesai.
            </p>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        
        {/* Error Notification */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Pemberitahuan:</span>
                <span>{errorMessage}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              {lastPayload && (
                <button
                  onClick={handleRetry}
                  disabled={isLoading}
                  className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  Coba Lagi Sekarang
                </button>
              )}
              <button
                onClick={() => setErrorMessage(null)}
                className="text-xs font-semibold text-rose-600 hover:underline px-2 py-1"
              >
                Tutup
              </button>
            </div>
          </div>
        )}

        {/* View Switcher */}
        {!examData ? (
          <div className="space-y-8">
            
            {/* Quick Hero Introduction (Kemenag Green) */}
            <div className="bg-gradient-to-r from-[#004d26] via-[#006837] to-[#0d6e38] rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-[#d4af37]/40">
              <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-[#d4af37]/10 rounded-full blur-2xl pointer-events-none"></div>
              
              <div className="max-w-3xl relative z-10">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#d4af37] text-[#004d26] mb-3 shadow-xs">
                  <Sparkles className="w-3.5 h-3.5" />
                  Kecerdasan Buatan Generasi Baru • AI Gemini Flash
                </div>
                <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight font-serif text-white">
                  Pembuatan Naskah Soal & Kunci Jawaban Otomatis
                </h2>
                <p className="text-sm sm:text-base text-emerald-100 mt-2 leading-relaxed">
                  Dirancang khusus untuk Bapak/Ibu Guru Madrasah dan Sekolah di seluruh Indonesia. Susun naskah soal Ulangan Harian, UTS/PTS, UAS/PAS, dan Ujian Akhir secara praktis dengan opsi berstandar jenjang (SD/MI: 3 opsi, SMP/MTs: 4 opsi, SMA/MA: 5 opsi), bebas kode LaTeX, kop madrasah resmi, serta lembar kunci jawaban terpisah yang siap diekspor ke <strong>Word (.docx)</strong>, <strong>PDF</strong>, dan <strong>Excel (.xlsx)</strong>.
                </p>

                {/* Feature Pills */}
                <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2.5 border border-white/10 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#d4af37]" />
                    <span>Kisi-Kisi & Kartu Soal</span>
                  </div>
                  <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2.5 border border-white/10 flex items-center gap-2">
                    <BookCheck className="w-4 h-4 text-[#d4af37]" />
                    <span>Analisis Butir & Bloom</span>
                  </div>
                  <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2.5 border border-white/10 flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-[#d4af37]" />
                    <span>Export Word (.docx) & PDF</span>
                  </div>
                  <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2.5 border border-white/10 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#d4af37]" />
                    <span>Standar Asesmen Kemenag</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Exam Parameters Form */}
            <ExamForm
              schoolIdentity={schoolIdentity}
              onOpenKopModal={() => setIsKopModalOpen(true)}
              onSubmit={handleGenerateExam}
              isLoading={isLoading}
            />

          </div>
        ) : (
          /* Result View */
          <ExamViewer
            examData={examData}
            onReset={() => setExamData(null)}
            onUpdateExamData={(updated) => setExamData(updated)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="no-print mt-12 bg-[#00381b] text-emerald-100 border-t-4 border-[#d4af37] py-6 text-xs text-center">
        <div className="max-w-7xl mx-auto px-4 space-y-1.5">
          <p className="font-bold text-sm text-white font-serif tracking-wide">
            Question Generator Exsam
          </p>
          <p className="text-[#f3e5ab] font-medium">
            Oleh : Jayadi Pebwanartha, S.Si.
          </p>
          <p className="text-emerald-300/80 text-[11px] pt-1">
            Aplikasi Pembuatan Soal Otomatis Berbasis AI Gemini Flash untuk Lingkungan Kementerian Agama & Kemendikbudristek RI.
          </p>
        </div>
      </footer>

      {/* Modal Pengaturan Kop Madrasah */}
      <SchoolIdentityModal
        isOpen={isKopModalOpen}
        onClose={() => setIsKopModalOpen(false)}
        identity={schoolIdentity}
        onSave={(updated) => setSchoolIdentity(updated)}
      />
    </div>
  );
}
