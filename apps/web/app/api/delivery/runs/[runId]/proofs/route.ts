import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { authenticate } from '../../../../../../lib/server-auth';

const allowedMime = new Set(['image/jpeg', 'image/png', 'image/webp']);
const proofTypes = new Set(['pickup_selfie', 'pickup_items', 'delivery_selfie']);
const maxBytes = 10 * 1024 * 1024;

export async function POST(request: Request, context: { params: Promise<{ runId: string }> }) {
  const result = await authenticate(request);
  if (result instanceof NextResponse) return result;
  const { runId } = await context.params;
  const body = (await request.json().catch(() => null)) as {
    proofType?: string; stopId?: string; fileName?: string; mimeType?: string; sizeBytes?: number;
    latitude?: number; longitude?: number;
  } | null;
  if (!body?.proofType || !proofTypes.has(body.proofType) || !body.fileName || !body.mimeType || !body.sizeBytes || !allowedMime.has(body.mimeType) || body.sizeBytes > maxBytes)
    return NextResponse.json({ error: 'Use a valid proof type and JPEG, PNG, or WebP up to 10 MB.' }, { status: 400 });
  if (body.proofType.startsWith('pickup_') && !body.stopId)
    return NextResponse.json({ error: 'Pickup proofs require a delivery stop.' }, { status: 400 });
  if (body.proofType === 'delivery_selfie' && body.stopId)
    return NextResponse.json({ error: 'Delivery selfies belong to the delivery run, not a shop stop.' }, { status: 400 });
  const safeName = body.fileName.toLowerCase().replace(/[^a-z0-9._-]/g, '-').slice(-80);
  const path = `delivery/${runId}/${body.proofType}/${randomUUID()}-${safeName}`;
  const { data: upload, error: uploadError } = await result.client.storage.from('delivery-proofs').createSignedUploadUrl(path);
  if (uploadError || !upload) return NextResponse.json({ error: 'Delivery proof upload is unavailable.' }, { status: 503 });
  const { data: proof, error } = await result.client.from('delivery_proofs').insert({
    run_id: runId, stop_id: body.stopId ?? null, captured_by: result.user.id,
    proof_type: body.proofType as 'pickup_selfie' | 'pickup_items' | 'delivery_selfie', storage_path: path,
    latitude: body.latitude ?? null, longitude: body.longitude ?? null,
  }).select('id,proof_type,storage_path,captured_at').single();
  if (error || !proof) return NextResponse.json({ error: 'Only the assigned rider can upload this proof.' }, { status: 403 });
  return NextResponse.json({ proof, upload }, { status: 201 });
}
