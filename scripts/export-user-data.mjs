import { createClient } from '@supabase/supabase-js';

function requireConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const userId = process.argv[2] ?? process.env.USER_ID;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  if (!userId) throw new Error('Provide a user ID as the first argument or USER_ID.');
  return { url, key, userId };
}

async function readRows(admin, table, column, userId) {
  const { data, error } = await admin.from(table).select('*').eq(column, userId);
  if (error) throw new Error(`${table}: ${error.message}`);
  return data ?? [];
}

export async function exportUserData(admin, userId) {
  const [
    profile,
    posts,
    comments,
    applications,
    orders,
    cvs,
    postMedia,
    businessImages,
    productImages,
    deliveryProofs,
  ] = await Promise.all([
    admin.from('profiles').select('*').eq('id', userId).maybeSingle(),
    readRows(admin, 'posts', 'author_id', userId),
    readRows(admin, 'comments', 'author_id', userId),
    readRows(admin, 'job_applications', 'applicant_id', userId),
    readRows(admin, 'orders', 'buyer_id', userId),
    readRows(admin, 'cv_documents', 'user_id', userId),
    readRows(admin, 'post_media', 'uploader_id', userId),
    readRows(admin, 'business_images', 'uploaded_by', userId),
    readRows(admin, 'product_images', 'uploaded_by', userId),
    readRows(admin, 'delivery_proofs', 'captured_by', userId),
  ]);
  if (profile.error) throw new Error(`profiles: ${profile.error.message}`);

  const orderIds = (orders ?? []).map((row) => row.id);
  const orderItems = orderIds.length
    ? await admin.from('order_items').select('*').in('order_id', orderIds)
    : { data: [], error: null };
  if (orderItems.error) throw new Error(`order_items: ${orderItems.error.message}`);

  return {
    exported_at: new Date().toISOString(),
    user_id: userId,
    profile: profile.data ?? null,
    posts,
    comments,
    applications,
    orders,
    order_items: orderItems.data ?? [],
    uploads_manifest: {
      cvs,
      post_media: postMedia,
      business_images: businessImages,
      product_images: productImages,
      delivery_proofs: deliveryProofs,
    },
    note: 'Export only. No rows or storage objects were deleted or changed.',
  };
}

async function main() {
  const { url, key, userId } = requireConfig();
  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  console.log(JSON.stringify(await exportUserData(admin, userId), null, 2));
}

if (process.argv[1]?.endsWith('export-user-data.mjs'))
  main().catch((error) => {
    console.error(error.message ?? error);
    process.exit(1);
  });
