export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

export const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function validateImage(file: File): ImageValidationResult {
  if (!file) {
    return { valid: false, error: "No file selected" };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid image format. Supported: JPEG, PNG, WebP, GIF`,
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`,
    };
  }

  return { valid: true };
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")?.[1];
      if (base64) {
        resolve(base64);
      } else {
        reject(new Error("Failed to convert file to base64"));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export function canvasToBase64(canvas: HTMLCanvasElement): string | null {
  const dataUrl = canvas.toDataURL("image/jpeg");
  return dataUrl.split(",")?.[1] || null;
}

export function getMimeType(file: File): string {
  return file.type || "image/jpeg";
}
