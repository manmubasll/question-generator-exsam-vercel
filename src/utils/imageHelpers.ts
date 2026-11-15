import { UploadedPhotoItem } from "../types";

/**
 * Compresses an image file using an off-screen HTML5 Canvas.
 * Ensures fast upload, stays well within server body limits,
 * and maintains sharp text resolution for OCR/Gemini Flash reading.
 */
export async function compressImage(
  file: File,
  maxWidth = 1600,
  maxHeight = 1600,
  quality = 0.85
): Promise<UploadedPhotoItem> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate scaling factor maintaining aspect ratio
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          // Fallback to original base64 if canvas context fails
          const rawBase64 = e.target?.result as string;
          resolve({
            id: `photo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            name: file.name,
            base64: rawBase64,
            mimeType: file.type || "image/jpeg",
            size: file.size,
          });
          return;
        }

        // Fill background with white in case PNG has transparency
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const mimeType = "image/jpeg";
        const dataUrl = canvas.toDataURL(mimeType, quality);
        const approxSize = Math.round((dataUrl.length * 3) / 4);

        resolve({
          id: `photo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          base64: dataUrl,
          mimeType,
          size: approxSize,
        });
      };

      img.onerror = () => {
        reject(new Error(`Gagal memuat gambar ${file.name}`));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error(`Gagal membaca file ${file.name}`));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Reads a PDF document file as a Base64 data URL for direct processing by Gemini multimodal API.
 */
export async function readPdfAsBase64(file: File): Promise<UploadedPhotoItem> {
  return new Promise((resolve, reject) => {
    // Maximum 25MB per PDF document
    const MAX_PDF_SIZE = 25 * 1024 * 1024;
    if (file.size > MAX_PDF_SIZE) {
      reject(
        new Error(
          `Ukuran file PDF "${file.name}" (${(file.size / (1024 * 1024)).toFixed(1)} MB) melebihi batas maksimal 25 MB.`
        )
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve({
        id: `pdf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: file.name,
        base64: result,
        mimeType: "application/pdf",
        size: file.size,
      });
    };

    reader.onerror = () => {
      reject(new Error(`Gagal membaca dokumen PDF ${file.name}`));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Processes either an image (JPG, PNG, JPEG, WEBP) with canvas compression
 * or a PDF document with direct base64 encoding.
 */
export async function processUploadedFile(file: File): Promise<UploadedPhotoItem> {
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (isPdf) {
    return readPdfAsBase64(file);
  }

  const isImage =
    file.type.startsWith("image/") ||
    /\.(jpg|jpeg|png|webp|bmp)$/i.test(file.name);
  if (isImage) {
    return compressImage(file);
  }

  throw new Error(
    `Format file "${file.name}" tidak didukung. Harap unggah format PDF, JPG, PNG, atau JPEG.`
  );
}

