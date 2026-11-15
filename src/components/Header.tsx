import React from "react";
import { BookOpen, Sparkles, GraduationCap, Award } from "lucide-react";

export const Header: React.FC = () => {
  return (
    <header className="bg-gradient-to-r from-[#005a2f] via-[#006837] to-[#0a7a42] text-white shadow-lg border-b-4 border-[#d4af37]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo & Title */}
          <div className="flex items-center gap-4 text-center md:text-left">
            <div className="relative flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/10 backdrop-blur-sm border border-[#d4af37]/50 flex items-center justify-center shadow-inner p-2">
              {/* Madrasah / Kemenag Emblem Icon */}
              <div className="w-full h-full rounded-xl bg-[#004d26] flex items-center justify-center border border-[#d4af37]/40 text-[#d4af37]">
                <BookOpen className="w-8 h-8 text-[#e6b800]" />
              </div>
              <div className="absolute -bottom-1 -right-1 bg-[#d4af37] text-[#004d26] rounded-full p-1 shadow">
                <Sparkles className="w-3 h-3" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-center md:justify-start gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/60 text-[#f3e5ab] border border-[#d4af37]/30">
                  <GraduationCap className="w-3.5 h-3.5" />
                  Kemenag & Kemendikbud Standard
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-white/15 text-emerald-100">
                  AI Gemini Flash
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white drop-shadow-sm mt-1 font-serif">
                Question Generator Exsam
              </h1>
              <p className="text-xs sm:text-sm font-medium text-[#f3e5ab] tracking-wide mt-0.5">
                Oleh : Jayadi Pebwanartha, S.Si.
              </p>
            </div>
          </div>

          {/* Quick Info Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-medium">
            <div className="bg-black/20 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-emerald-400/20 text-emerald-100 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-[#d4af37]" />
              <span>Jenjang: MI/SD, MTs/SMP, MA/SMA</span>
            </div>
            <div className="bg-black/20 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-emerald-400/20 text-emerald-100 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Kisi-Kisi, Kartu Soal & Analisis Butir (PDF & Word)</span>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
};
