export const MAX_PHOTO_INPUT_BYTES = 15 * 1024 * 1024;

export class PhotoError extends Error {
  constructor(readonly code: 'invalid' | 'tooLarge' | 'failed') {
    super(code);
  }
}

/** Downscale an image file to a compact JPEG data URL so trees stay small in IndexedDB and backups. */
export async function fileToPhotoDataUrl(file: File, maxSide = 480, quality = 0.85): Promise<string> {
  if (!file.type.startsWith('image/')) throw new PhotoError('invalid');
  if (file.size > MAX_PHOTO_INPUT_BYTES) throw new PhotoError('tooLarge');
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new PhotoError('failed'));
      el.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new PhotoError('failed');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}
