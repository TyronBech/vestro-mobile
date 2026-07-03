import { supabase } from '../services/supabase';
import { SUPABASE_STORAGE_BUCKET } from '../services/api/config';

// Helper: Convert local URI to a Blob using XMLHttpRequest (stable in React Native)
const uriToBlob = (uri: string): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = function () {
      resolve(xhr.response);
    };
    xhr.onerror = function () {
      reject(new Error("Failed to read local file URI"));
    };
    xhr.responseType = "blob";
    xhr.open("GET", uri, true);
    xhr.send(null);
  });
};

// Helper: Convert Blob to Base64 data URL
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Helper: Convert base64 string to Uint8Array using atob (supported natively in Hermes)
const base64ToUint8Array = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

/**
 * Uploads a local file URI to Supabase Storage and returns its public URL.
 * Uses binary Uint8Array data formatting to avoid React Native fetch polyfill bugs.
 * @param uri Local file URI from image picker
 * @param bucket Supabase storage bucket name
 * @returns Public URL of the uploaded image
 */
export async function uploadImageToSupabase(uri: string, bucket: string = SUPABASE_STORAGE_BUCKET): Promise<string> {
  try {
    // 1. Get Blob from URI
    const blob = await uriToBlob(uri);

    // 2. Convert Blob to Base64
    const dataUrl = await blobToBase64(blob);
    const base64 = dataUrl.split(',')[1];
    if (!base64) {
      throw new Error("Failed to parse base64 string from data URL");
    }

    // 3. Convert Base64 to Uint8Array
    const binaryData = base64ToUint8Array(base64);

    // 4. Generate a unique file name
    const extension = uri.split('.').pop() || 'jpg';
    const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;
    const filePath = `icons/${filename}`;

    // 5. Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, binaryData.buffer as ArrayBuffer, {
        contentType: `image/${extension === 'png' ? 'png' : 'jpeg'}`,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      throw error;
    }

    // 6. Retrieve public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    if (!urlData || !urlData.publicUrl) {
      throw new Error("Failed to get public URL from Supabase Storage");
    }

    return urlData.publicUrl;
  } catch (error: any) {
    console.error("Error uploading image to Supabase:", error);
    throw new Error(error.message || "Failed to upload image to Supabase");
  }
}
