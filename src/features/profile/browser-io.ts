import type { DecodedImage, PhotoIo } from "./compress-photo";

interface BitmapImage extends DecodedImage {
  bitmap: ImageBitmap;
}

function canvasBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("encode failed"))),
      "image/jpeg",
      quality,
    );
  });
}

/** Canvas-based implementation used in the browser. */
export const browserIo: PhotoIo = {
  async decode(blob) {
    const bitmap = await createImageBitmap(blob, {
      imageOrientation: "from-image",
    });
    const image: BitmapImage = {
      width: bitmap.width,
      height: bitmap.height,
      bitmap,
    };
    return image;
  },
  async encode(image, width, height, quality) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("no canvas");
    // JPEG has no alpha: paint white under transparent PNG/WebP photos.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage((image as BitmapImage).bitmap, 0, 0, width, height);
    return canvasBlob(canvas, quality);
  },
  async convertHeic(file) {
    // Loaded only when the browser could not open the file itself.
    const { default: heic2any } = await import("heic2any");
    const result = await heic2any({ blob: file, toType: "image/jpeg" });
    const blob = Array.isArray(result) ? result[0] : result;
    if (!blob) throw new Error("heic conversion failed");
    return blob;
  },
};
