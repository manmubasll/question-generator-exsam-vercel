import React, { useState } from "react";
import { SchoolIdentity } from "../types";
import { X, Building2, Upload, RefreshCw, Trash2, CheckSquare, Square, Award } from "lucide-react";

interface SchoolIdentityModalProps {
  isOpen: boolean;
  onClose: () => void;
  identity: SchoolIdentity;
  onSave: (updated: SchoolIdentity) => void;
}

export const SchoolIdentityModal: React.FC<SchoolIdentityModalProps> = ({
  isOpen,
  onClose,
  identity,
  onSave,
}) => {
  const [formData, setFormData] = useState<SchoolIdentity>({
    ...identity,
    useLeftLogo: identity.useLeftLogo !== undefined ? identity.useLeftLogo : true,
    useRightLogo: identity.useRightLogo !== undefined ? identity.useRightLogo : false,
    accreditation: identity.accreditation || "Terakreditasi A (Unggul)",
  });

  if (!isOpen) return null;

  const handleLeftLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({
        ...prev,
        logoBase64: reader.result as string,
        useLeftLogo: true,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleRightLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({
        ...prev,
        rightLogoBase64: reader.result as string,
        useRightLogo: true, // Otomatis aktifkan ceklis saat guru upload logo kanan
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleResetDefault = () => {
    setFormData({
      ministryName: "KEMENTERIAN AGAMA REPUBLIK INDONESIA",
      subMinistryName: "KANTOR KEMENTERIAN AGAMA KABUPATEN / KOTA",
      schoolName: "MADRASAH TSANAWIYAH NEGERI 1",
      accreditation: "Terakreditasi A (Unggul)",
      address: "Jl. Raya Pendidikan No. 01, Kecamatan Sukamakmur",
      contact: "Telp. (021) 7891011 | Website: https://kemenag.go.id | Email: mtsn1@kemenag.go.id",
      logoBase64: undefined,
      useLeftLogo: true,
      rightLogoBase64: undefined,
      useRightLogo: false,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const ACCREDITATION_SUGGESTIONS = [
    "Terakreditasi A (Unggul)",
    "Terakreditasi A",
    "Terakreditasi B (Baik)",
    "Terakreditasi B",
    "Terakreditasi C",
    "Akreditasi Unggul",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-emerald-100 overflow-y-auto max-h-[92vh]">
        <div className="flex items-center justify-between border-b pb-4 border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-[#006837] flex items-center justify-center">
              <Building2 className="w-5 h-5 text-[#006837]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-800 font-serif">
                Pengaturan KOP Madrasah / Sekolah
              </h3>
              <p className="text-xs text-slate-500">
                Atur identitas teks 6 baris resmi, logo sebelah kiri, dan logo sebelah kanan KOP
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-sm">
          {/* Baris 1: Instansi Induk */}
          <div>
            <label className="block font-bold text-slate-700 mb-1 text-xs uppercase tracking-wider">
              Baris 1: Nama Instansi Induk
            </label>
            <input
              type="text"
              value={formData.ministryName}
              onChange={(e) =>
                setFormData({ ...formData, ministryName: e.target.value })
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs sm:text-sm font-semibold"
              placeholder="e.g. KEMENTERIAN AGAMA REPUBLIK INDONESIA atau DINAS PENDIDIKAN"
            />
          </div>

          {/* Baris 2: Unit / Kantor Daerah */}
          <div>
            <label className="block font-bold text-slate-700 mb-1 text-xs uppercase tracking-wider">
              Baris 2: Unit / Kantor Wilayah / Daerah
            </label>
            <input
              type="text"
              value={formData.subMinistryName}
              onChange={(e) =>
                setFormData({ ...formData, subMinistryName: e.target.value })
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs sm:text-sm font-semibold"
              placeholder="e.g. KANTOR KEMENTERIAN AGAMA KABUPATEN SLEMAN"
            />
          </div>

          {/* Baris 3: Nama Lengkap Madrasah / Sekolah */}
          <div>
            <label className="block font-bold text-slate-700 mb-1 text-xs uppercase tracking-wider">
              Baris 3: Nama Lengkap Madrasah / Sekolah <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.schoolName}
              onChange={(e) =>
                setFormData({ ...formData, schoolName: e.target.value })
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-[#006837] font-black focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm sm:text-base uppercase"
              placeholder="e.g. MADRASAH TSANAWIYAH NEGERI 1 KOTA MALANG"
            />
          </div>

          {/* BARIS 4: JENIS AKREDITASI SEKOLAH (SESUAI REQUEST USER) */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block font-bold text-amber-950 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-600" />
                <span>Baris 4: Jenis Akreditasi Sekolah / Madrasah</span>
              </label>
              <span className="text-[11px] text-amber-800 font-medium">
                Tepat setelah Nama Sekolah
              </span>
            </div>
            <input
              type="text"
              value={formData.accreditation || ""}
              onChange={(e) =>
                setFormData({ ...formData, accreditation: e.target.value })
              }
              className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs sm:text-sm shadow-2xs"
              placeholder="e.g. Terakreditasi A (Unggul) atau Akreditasi: A"
            />
            {/* Quick Suggestion Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-amber-900 font-semibold">Pilihan Cepat:</span>
              {ACCREDITATION_SUGGESTIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFormData({ ...formData, accreditation: item })}
                  className={`text-[11px] px-2 py-0.5 rounded-md border font-medium transition-colors ${
                    formData.accreditation === item
                      ? "bg-amber-600 text-white border-amber-600 font-bold"
                      : "bg-white text-amber-900 border-amber-200 hover:bg-amber-100"
                  }`}
                >
                  {item}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setFormData({ ...formData, accreditation: "" })}
                className="text-[11px] px-2 py-0.5 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-100"
              >
                Kosongkan
              </button>
            </div>
          </div>

          {/* Baris 5: Alamat Lengkap */}
          <div>
            <label className="block font-bold text-slate-700 mb-1 text-xs uppercase tracking-wider">
              Baris 5: Alamat Lengkap Madrasah / Sekolah
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs sm:text-sm"
              placeholder="e.g. Jl. Bandung No. 7, Penanggungan, Klojen, Kota Malang"
            />
          </div>

          {/* Baris 6: Kontak */}
          <div>
            <label className="block font-bold text-slate-700 mb-1 text-xs uppercase tracking-wider">
              Baris 6: Kontak (Telepon, Email, Website)
            </label>
            <input
              type="text"
              value={formData.contact}
              onChange={(e) =>
                setFormData({ ...formData, contact: e.target.value })
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs sm:text-sm"
              placeholder="e.g. Telp: (0341) 551xxx | Email: info@mtsn1kotamalang.sch.id"
            />
          </div>

          {/* ========================================================= */}
          {/* PENGATURAN LOGO KOP (KIRI & KANAN BESERTA CEKLIS PENGGUNAAN) */}
          {/* ========================================================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            
            {/* 1. LOGO SEBELAH KIRI KOP */}
            <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/70 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                  Logo Sebelah Kiri KOP
                </span>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-emerald-800">
                  <input
                    type="checkbox"
                    checked={formData.useLeftLogo !== false}
                    onChange={(e) => setFormData({ ...formData, useLeftLogo: e.target.checked })}
                    className="w-4 h-4 text-[#006837] rounded focus:ring-emerald-500 border-slate-300"
                  />
                  <span>Gunakan</span>
                </label>
              </div>

              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 cursor-pointer bg-white hover:bg-slate-100 text-slate-700 font-semibold px-3 py-1.5 rounded-lg border border-slate-300 text-xs transition-colors shadow-2xs">
                  <Upload className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Upload Logo Kiri</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLeftLogoUpload}
                    className="hidden"
                  />
                </label>
                {formData.logoBase64 && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, logoBase64: undefined })}
                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200"
                    title="Hapus logo kustom (kembali ke logo standar)"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3 pt-1">
                {formData.logoBase64 ? (
                  <img
                    src={formData.logoBase64}
                    alt="Logo Kiri"
                    className="w-12 h-12 object-contain border rounded-lg p-1 bg-white shadow-2xs"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg border border-emerald-300 bg-emerald-50 flex items-center justify-center text-[9px] font-bold text-[#006837] text-center p-1 leading-tight">
                    Kemenag Standar
                  </div>
                )}
                <div className="text-[11px] text-slate-500 leading-tight">
                  <p className="font-semibold text-slate-700">
                    {formData.useLeftLogo !== false ? "✓ Logo Kiri Ditampilkan" : "✗ Logo Kiri Disembunyikan"}
                  </p>
                  <p>{formData.logoBase64 ? "Menggunakan logo kustom" : "Emblem standar Kemenag RI"}</p>
                </div>
              </div>
            </div>

            {/* 2. LOGO SEBELAH KANAN KOP (DENGAN CEKLIS AKTIF / TIDAK) */}
            <div className="border border-emerald-200 rounded-xl p-3.5 bg-emerald-50/50 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-emerald-950 uppercase tracking-wider">
                  Logo Sebelah Kanan KOP
                </span>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-emerald-900 bg-white px-2 py-0.5 rounded-md border border-emerald-300 shadow-2xs">
                  <input
                    type="checkbox"
                    checked={Boolean(formData.useRightLogo)}
                    onChange={(e) => setFormData({ ...formData, useRightLogo: e.target.checked })}
                    className="w-4 h-4 text-[#006837] rounded focus:ring-emerald-500 border-slate-300"
                  />
                  <span>Pakai Logo Kanan</span>
                </label>
              </div>

              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 cursor-pointer bg-[#006837] hover:bg-[#00522c] text-white font-semibold px-3 py-1.5 rounded-lg border border-emerald-700 text-xs transition-colors shadow-2xs">
                  <Upload className="w-3.5 h-3.5 text-amber-200" />
                  <span>Upload Logo Kanan</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleRightLogoUpload}
                    className="hidden"
                  />
                </label>
                {formData.rightLogoBase64 && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, rightLogoBase64: undefined, useRightLogo: false })}
                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200"
                    title="Hapus logo kanan"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3 pt-1">
                {formData.rightLogoBase64 ? (
                  <img
                    src={formData.rightLogoBase64}
                    alt="Logo Kanan"
                    className="w-12 h-12 object-contain border border-emerald-300 rounded-lg p-1 bg-white shadow-2xs"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg border border-dashed border-emerald-300 bg-white flex items-center justify-center text-[9px] font-semibold text-emerald-800 text-center p-1 leading-tight">
                    Belum Ada Logo Kanan
                  </div>
                )}
                <div className="text-[11px] text-slate-600 leading-tight">
                  <p className="font-bold text-emerald-900">
                    {formData.useRightLogo && formData.rightLogoBase64
                      ? "✓ Logo Kanan AKAN TAMPIL di KOP"
                      : formData.useRightLogo && !formData.rightLogoBase64
                      ? "⚠️ Ceklis aktif, silakan upload file logo kanan"
                      : "✗ Logo Kanan TIDAK DIPAKAI (Nonaktif)"}
                  </p>
                  <p className="text-slate-500">
                    {formData.rightLogoBase64 ? "File logo kanan tersimpan" : "Dapat diisi Logo Tut Wuri, Yayasan, dsb."}
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* PREVIEW MINI KOP SURAT */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
              Pratinjau Hasil Tampilan KOP Resmi:
            </span>
            <div className="bg-white p-3 rounded-lg border border-slate-300 text-center font-serif text-slate-900 leading-tight">
              <div className="flex items-center justify-between gap-2">
                {/* Mini Logo Kiri */}
                <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center">
                  {formData.useLeftLogo !== false ? (
                    formData.logoBase64 ? (
                      <img src={formData.logoBase64} alt="Preview Kiri" className="w-9 h-9 object-contain" />
                    ) : (
                      <div className="w-8 h-8 rounded-full border border-emerald-600 bg-emerald-50 flex items-center justify-center text-[7px] font-bold text-[#006837]">
                        LOGO
                      </div>
                    )
                  ) : null}
                </div>

                {/* Teks Tengah 6 Baris */}
                <div className="flex-1">
                  <p className="text-[9px] font-bold uppercase">{formData.ministryName || "KEMENTERIAN AGAMA REPUBLIK INDONESIA"}</p>
                  <p className="text-[9px] font-bold uppercase">{formData.subMinistryName || "KANTOR KEMENTERIAN AGAMA"}</p>
                  <p className="text-[12px] font-black uppercase text-[#006837]">{formData.schoolName || "MADRASAH ALIYAH NEGERI"}</p>
                  {formData.accreditation && (
                    <p className="text-[9px] font-bold text-slate-800">{formData.accreditation}</p>
                  )}
                  <p className="text-[8px] italic font-sans">{formData.address || "Jalan Pendidikan No. 01"}</p>
                  <p className="text-[7.5px] font-sans text-slate-600">{formData.contact || "Telp. (021) 123456"}</p>
                </div>

                {/* Mini Logo Kanan */}
                <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center">
                  {formData.useRightLogo && formData.rightLogoBase64 ? (
                    <img src={formData.rightLogoBase64} alt="Preview Kanan" className="w-9 h-9 object-contain" />
                  ) : (
                    <div className="w-9 h-9"></div>
                  )}
                </div>
              </div>
              <div className="mt-2 border-t-2 border-black"></div>
              <div className="border-t border-black mt-[1px]"></div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleResetDefault}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Standar</span>
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#006837] hover:bg-[#005a2f] text-white font-bold rounded-lg shadow-sm text-xs"
              >
                Simpan & Terapkan KOP
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

