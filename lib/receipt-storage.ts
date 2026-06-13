import { supabaseAdmin } from '@/lib/supabase';

const BUCKET = 'receipts';

export async function uploadReceiptImage(
  userId: number,
  file: File
): Promise<string | null> {
  const mime = file.type || 'image/jpeg';
  const ext = mime.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();

  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, arrayBuffer, {
      contentType: mime,
      upsert: false,
    });

  if (error) {
    console.error('[receipt-storage] upload failed:', error.message);
    return null;
  }

  const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Extract the storage path from a public URL and delete it from the bucket.
 * Silently ignores errors (file already deleted, wrong bucket, etc.)
 */
export async function deleteReceiptImage(publicUrl: string | null | undefined): Promise<void> {
  if (!publicUrl) return;
  try {
    // Public URL format: https://<project>.supabase.co/storage/v1/object/public/receipts/<path>
    const marker = `/object/public/${BUCKET}/`;
    const idx = publicUrl.indexOf(marker);
    if (idx === -1) return; // not a receipts bucket URL

    // Strip query params (cache-busting timestamps)
    const pathWithQuery = publicUrl.slice(idx + marker.length);
    const storagePath = pathWithQuery.split('?')[0];

    const { error } = await supabaseAdmin.storage.from(BUCKET).remove([storagePath]);
    if (error) {
      console.warn('[receipt-storage] delete warning:', error.message);
    }
  } catch (e) {
    console.warn('[receipt-storage] delete error:', e);
  }
}
