// src/utils/mediaPicker.js
import { Capacitor } from "@capacitor/core";

// ─── Platform detection ───────────────────────────────────
export const isNativePlatform = () =>
  Capacitor.isNativePlatform() &&
  (Capacitor.getPlatform() === "android" || Capacitor.getPlatform() === "ios");

export const getPlatform = () => Capacitor.getPlatform();

// ═══════════════════════════════════════════════════════════
//  WEB — hidden file input
// ═══════════════════════════════════════════════════════════

// `capture` should be:
//   undefined → let user pick any file
//   "user"    → front camera
//   "environment" → back camera
const pickFromWeb = ({ capture, accept = "image/*" } = {}) =>
  new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    if (capture) input.capture = capture;

    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        // User cancelled the native file dialog — resolve with null
        resolve(null);
        return;
      }

      const reader = new FileReader();
      reader.onload = () =>
        resolve({
          dataUrl: reader.result,
          file,
          source: capture ? "camera" : "gallery",
          platform: "web",
        });
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    };

    // Fires when the dialog opens (not reliable everywhere)
    input.oncancel = () => resolve(null);

    input.click();
  });

// ═══════════════════════════════════════════════════════════
//  NATIVE — @capacitor/camera
//  CameraSource: Camera | Photos | Prompt (system sheet)
//  We only ever use Camera or Photos because our custom modal
//  already asked the user which they want.
// ═══════════════════════════════════════════════════════════

const pickFromNative = async ({ source = "gallery" } = {}) => {
  // Lazy-load so web bundles don't include the native plugin
  const { Camera, CameraResultType, CameraSource } = await import(
    "@capacitor/camera"
  );

  const cameraSource =
    source === "camera" ? CameraSource.Camera : CameraSource.Photos;

  const photo = await Camera.getPhoto({
    quality: 85,
    allowEditing: false,
    resultType: CameraResultType.DataUrl, // base64 data URL — same shape as web
    source: cameraSource,
    correctOrientation: true,
    saveToGallery: false,
    width: 800, // downscale to keep payloads small
  });

  if (!photo?.dataUrl) return null;

  // Turn the data URL into a File so downstream code is uniform
  const file = dataUrlToFile(photo.dataUrl, photo.format || "jpeg");

  return {
    dataUrl: photo.dataUrl,
    file,
    source,
    platform: Capacitor.getPlatform(),
  };
};

// ═══════════════════════════════════════════════════════════
//  UNIFIED ENTRY POINT
// ═══════════════════════════════════════════════════════════
//  source: "camera" | "gallery"
//  Returns null if the user cancelled.
// ═══════════════════════════════════════════════════════════
export const pickMedia = async ({ source = "gallery", accept = "image/*" } = {}) => {
  try {
    if (isNativePlatform()) {
      return await pickFromNative({ source });
    }
    // Web: `capture="user"` asks for the camera on mobile browsers;
    // on desktop it just falls back to a file picker.
    const capture = source === "camera" ? "user" : undefined;
    return await pickFromWeb({ capture, accept });
  } catch (err) {
    // Capacitor throws "User cancelled photos app" when the user backs out
    const msg = String(err?.message || "");
    if (msg.toLowerCase().includes("cancel")) return null;
    throw err;
  }
};

// ═══════════════════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════════════════

// Convert a data URL to a File object
export const dataUrlToFile = (dataUrl, ext = "jpeg") => {
  const [meta, base64] = String(dataUrl).split(",");
  const mimeMatch = meta.match(/data:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : `image/${ext}`;

  const byteString = atob(base64);
  const buffer = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) {
    buffer[i] = byteString.charCodeAt(i);
  }

  const blob = new Blob([buffer], { type: mime });
  const filename = `photo-${Date.now()}.${ext}`;
  return new File([blob], filename, { type: mime });
};

// Quick check — is this image file small enough to send as base64?
export const isWithinSizeLimit = (dataUrl, maxBytes = 5 * 1024 * 1024) => {
  if (!dataUrl) return false;
  const base64 = String(dataUrl).split(",")[1] || "";
  const sizeInBytes = Math.ceil((base64.length * 3) / 4);
  return sizeInBytes <= maxBytes;
};

export default { pickMedia, isNativePlatform, getPlatform };