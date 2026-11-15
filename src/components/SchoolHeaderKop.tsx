import React from "react";
import { SchoolIdentity } from "../types";

interface SchoolHeaderKopProps {
  identity?: SchoolIdentity;
  schoolIdentity?: SchoolIdentity;
  onEdit?: () => void;
}

const DEFAULT_IDENTITY: SchoolIdentity = {
  ministryName: "KEMENTERIAN AGAMA REPUBLIK INDONESIA",
  subMinistryName: "KANTOR KEMENTERIAN AGAMA KABUPATEN / KOTA",
  schoolName: "MADRASAH TSANAWIYAH NEGERI",
  address: "Jalan Raya Pendidikan No. 01, Wilayah Pendidikan",
  contact: "Telp. (021) 1234567 | Email: madrasah@kemenag.go.id",
  useLeftLogo: true,
  useRightLogo: false,
};

export const SchoolHeaderKop: React.FC<SchoolHeaderKopProps> = ({
  identity: propIdentity,
  schoolIdentity,
  onEdit,
}) => {
  const identity = propIdentity || schoolIdentity || DEFAULT_IDENTITY;
  const showLeft = identity.useLeftLogo !== false;
  const showRight = Boolean(identity.useRightLogo && identity.rightLogoBase64);

  return (
    <div className="relative group bg-white p-4 sm:p-6 rounded-t-xl">
      <div className="flex items-center justify-between gap-3 sm:gap-5">
        {/* Logo Sebelah Kiri KOP */}
        {showLeft ? (
          <div className="flex-shrink-0 flex items-center justify-center w-20 sm:w-24">
            {identity.logoBase64 ? (
              <img
                src={identity.logoBase64}
                alt="Logo Kiri Madrasah"
                className="w-18 h-18 sm:w-22 sm:h-22 object-contain"
              />
            ) : (
              /* Kemenag / Madrasah Ikhlas Beramal Emblem SVG */
              <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center p-1 rounded-full bg-emerald-50 border-2 border-[#006837] shadow-xs">
                <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
                  <circle cx="50" cy="50" r="46" fill="#006837" stroke="#d4af37" strokeWidth="2.5" />
                  <circle cx="50" cy="50" r="41" fill="#ffffff" />
                  <path
                    d="M50 18 L76 34 L76 66 L50 82 L24 66 L24 34 Z"
                    fill="#005a2f"
                    stroke="#d4af37"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M32 46 C40 44 48 48 50 50 C52 48 60 44 68 46 L68 62 C60 60 52 64 50 66 C48 64 40 60 32 62 Z"
                    fill="#ffffff"
                    stroke="#d4af37"
                    strokeWidth="1"
                  />
                  <path d="M50 50 L50 66" stroke="#d4af37" strokeWidth="1.5" />
                  <polygon
                    points="50,22 52,27 57,27 53,30 55,35 50,32 45,35 47,30 43,27 48,27"
                    fill="#d4af37"
                  />
                  <text
                    x="50"
                    y="74"
                    textAnchor="middle"
                    fontSize="5"
                    fontWeight="bold"
                    fill="#f3e5ab"
                    letterSpacing="0.5"
                  >
                    IKHLAS BERAMAL
                  </text>
                </svg>
              </div>
            )}
          </div>
        ) : (
          /* Placeholder agar posisi tengah tetap simetris */
          showRight ? <div className="w-20 sm:w-24 flex-shrink-0" /> : null
        )}

        {/* Identitas Teks Kop Tengah */}
        <div className="flex-1 text-center font-serif text-slate-900 leading-tight">
          {/* Baris 1: Instansi Induk */}
          <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800">
            {identity.ministryName || "KEMENTERIAN AGAMA REPUBLIK INDONESIA"}
          </h4>

          {/* Baris 2: Kantor Daerah */}
          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800 mt-0.5">
            {identity.subMinistryName || "KANTOR KEMENTERIAN AGAMA KABUPATEN / KOTA"}
          </h3>

          {/* Baris 3: Nama Lengkap Sekolah */}
          <h2 className="text-base sm:text-xl md:text-2xl font-black uppercase text-[#006837] tracking-normal mt-1">
            {identity.schoolName || "MADRASAH TSANAWIYAH NEGERI"}
          </h2>

          {/* Baris 4: Jenis Akreditasi Sekolah (Sesuai Permintaan) */}
          {identity.accreditation && (
            <p className="text-xs sm:text-sm font-bold text-slate-800 mt-0.5 tracking-wide">
              {identity.accreditation}
            </p>
          )}

          {/* Baris 5: Alamat Lengkap */}
          <p className="text-[11px] sm:text-xs text-slate-600 mt-1 italic font-sans font-normal">
            {identity.address || "Jalan Raya Pendidikan No. 01, Kecamatan Sejahtera"}
          </p>

          {/* Baris 6: Kontak */}
          <p className="text-[10px] sm:text-xs text-slate-600 font-sans font-normal mt-0.5">
            {identity.contact || "Telp. (021) 1234567 | Email: info@madrasah.kemenag.go.id"}
          </p>
        </div>

        {/* Logo Sebelah Kanan KOP (Dengan Ceklis Aktif/Tidak) */}
        {showRight ? (
          <div className="flex-shrink-0 flex items-center justify-center w-20 sm:w-24">
            <img
              src={identity.rightLogoBase64}
              alt="Logo Kanan Madrasah"
              className="w-18 h-18 sm:w-22 sm:h-22 object-contain"
            />
          </div>
        ) : (
          /* Placeholder simetris jika hanya logo kiri yang aktif */
          showLeft ? <div className="hidden sm:block w-20 sm:w-24 flex-shrink-0" /> : null
        )}
      </div>

      {/* Garis Ganda Kop Surat Resmi (Double Line) */}
      <div className="mt-3">
        <div className="border-t-[3px] border-black"></div>
        <div className="border-t-[1px] border-black mt-[2px]"></div>
      </div>

      {onEdit && (
        <button
          onClick={onEdit}
          className="no-print absolute top-3 right-3 text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-md transition-colors"
          title="Ubah Identitas Kop Madrasah"
        >
          Ubah Kop Surat
        </button>
      )}
    </div>
  );
};
