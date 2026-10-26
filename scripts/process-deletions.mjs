import { createClient } from '@supabase/supabase-js';

const TOMBSTONE_NAME = 'Deleted user';
const TOMBSTONE_BIOGRAPHY = 'This account has been deleted.';

function isMissingAuthUser(error) {
  const message = String(error?.message ?? error ?? '').toLowerCase();
  return message.includes('user not found') || message.includes('not found');
}

async function removeFiles(admin, bucket, paths) {
  if (paths.length === 0) return;
  const { error } = await admin.storage.from(bucket).remove(paths);
  if (error) throw error;
}

async function queryPaths(admin, table, column, value) {
  const { data, error } = await admin.from(table).select('storage_path').eq(column, value);
  if (error) throw error;
  return (data ?? []).map((row) => row.storage_path).filter(Boolean);
}

async function anonymizeProfile(admin, userId) {
  const { error } = await admin
    .from('profiles')
    .update({
      display_name: TOMBSTONE_NAME,
      biography: TOMBSTONE_BIOGRAPHY,
      profile_photo_url: null,
      mobile_number: null,
      date_of_birth: null,
      city: null,
      country: null,
    })
    .eq('id', userId);
  if (error) throw error;
}

async function deletePrivateContent(admin, userId) {
  const cvPaths = await queryPaths(admin, 'cv_documents', 'user_id', userId);
  await removeFiles(admin, 'private-documents', cvPaths);
  const { error: cvError } = await admin.from('cv_documents').delete().eq('user_id', userId);
  if (cvError) throw cvError;

  const businessResult = await admin.from('businesses').select('id').eq('owner_id', userId);
  if (businessResult.error) throw businessResult.error;
  const businessIds = (businessResult.data ?? []).map((business) => business.id);
  const businessPaths = await queryPaths(admin, 'business_images', 'uploaded_by', userId);
  const productPaths = await queryPaths(admin, 'product_images', 'uploaded_by', userId);
  let productIds = [];
  if (businessIds.length > 0) {
    const products = await admin.from('products').select('id').in('business_id', businessIds);
    if (products.error) throw products.error;
    productIds = (products.data ?? []).map((product) => product.id);
  }
  if (productIds.length > 0) {
    const ownedProductImages = await admin
      .from('product_images')
      .select('storage_path')
      .in('product_id', productIds);
    if (ownedProductImages.error) throw ownedProductImages.error;
    productPaths.push(...(ownedProductImages.data ?? []).map((image) => image.storage_path));
  }
  if (businessIds.length > 0) {
    const ownedBusinessImages = await admin
      .from('business_images')
      .select('storage_path')
      .in('business_id', businessIds);
    if (ownedBusinessImages.error) throw ownedBusinessImages.error;
    businessPaths.push(...(ownedBusinessImages.data ?? []).map((image) => image.storage_path));
  }
  await removeFiles(admin, 'business-media', [...new Set([...businessPaths, ...productPaths])]);
  const { error: businessImageError } = await admin
    .from('business_images')
    .delete()
    .eq('uploaded_by', userId);
  if (businessImageError) throw businessImageError;
  const { error: productImageError } = await admin
    .from('product_images')
    .delete()
    .eq('uploaded_by', userId);
  if (productImageError) throw productImageError;
  if (businessIds.length > 0) {
    const { error } = await admin.from('business_images').delete().in('business_id', businessIds);
    if (error) throw error;
  }
  if (productIds.length > 0) {
    const { error } = await admin.from('product_images').delete().in('product_id', productIds);
    if (error) throw error;
  }

  await removeFiles(admin, 'profile-media', [
    `${userId}/avatar.jpg`,
    `${userId}/avatar.jpeg`,
    `${userId}/avatar.png`,
    `${userId}/avatar.webp`,
  ]);
}

async function ensureAuditEntry(admin, request) {
  const reason = `deletion_request:${request.id}`;
  const existing = await admin
    .from('moderation_audit_log')
    .select('id')
    .eq('action', 'account_deletion')
    .eq('reason', reason)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) return;
  const { error } = await admin.from('moderation_audit_log').insert({
    actor_id: request.user_id,
    target_user_id: request.user_id,
    action: 'account_deletion',
    reason,
  });
  if (error) throw error;
}

export async function processDeletionRequest(admin, request) {
  if (request.status === 'completed') return { status: 'completed', noop: true };
  try {
    const signOut = await admin.auth.admin.signOut(request.user_id, 'global');
    if (signOut.error && !isMissingAuthUser(signOut.error)) throw signOut.error;
    await anonymizeProfile(admin, request.user_id);
    await deletePrivateContent(admin, request.user_id);
    await ensureAuditEntry(admin, request);
    const deletion = await admin.auth.admin.deleteUser(request.user_id);
    if (deletion.error && !isMissingAuthUser(deletion.error)) throw deletion.error;
    const { error } = await admin
      .from('deletion_requests')
      .update({ status: 'completed', completed_at: new Date().toISOString(), last_error: null })
      .eq('id', request.id);
    if (error) throw error;
    return { status: 'completed', noop: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await admin
      .from('deletion_requests')
      .update({ status: 'failed', last_error: message.slice(0, 2000) })
      .eq('id', request.id);
    return { status: 'failed', error: message };
  }
}

export async function processNextDeletion(admin) {
  const { data, error } = await admin.rpc('claim_deletion_request');
  if (error) throw error;
  const request = Array.isArray(data) ? data[0] : data;
  return request ? processDeletionRequest(admin, request) : null;
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey)
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const requestId = process.argv[2];
  if (requestId) {
    const { data, error } = await admin
      .from('deletion_requests')
      .select('*')
      .eq('id', requestId)
      .single();
    if (error) throw error;
    console.log(JSON.stringify(await processDeletionRequest(admin, data)));
    return;
  }
  console.log(JSON.stringify(await processNextDeletion(admin)));
}

if (process.argv[1]?.endsWith('process-deletions.mjs')) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
