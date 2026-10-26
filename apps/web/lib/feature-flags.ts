import {
  createFeatureFlagResolver,
  FEATURE_FLAGS,
  type FeatureFlagKey,
  type FlagEnvironment,
} from '@communityhub/shared';
import { NextResponse } from 'next/server';
import { getAdminClient } from './server-auth';

export const FEATURE_DISABLED_CODE = 'FEATURE_DISABLED';

export function disabledFeaturePayload(key: FeatureFlagKey) {
  return {
    error: {
      code: FEATURE_DISABLED_CODE,
      message: 'This feature is not available yet.',
    },
    feature: key,
  } as const;
}

export function featureDisabledResponse(key: FeatureFlagKey) {
  return NextResponse.json(disabledFeaturePayload(key), { status: 501 });
}

const requestResolvers = new WeakMap<Request, ReturnType<typeof createFeatureFlagResolver>>();

function environment(): FlagEnvironment {
  const value = process.env.APP_ENV ?? process.env.NODE_ENV;
  return value === 'test' || value === 'staging' || value === 'production' ? value : 'development';
}

export async function isFeatureEnabled(request: Request, key: FeatureFlagKey) {
  let resolver = requestResolvers.get(request);
  if (!resolver) {
    resolver = createFeatureFlagResolver({
      environment: environment(),
      env: process.env,
      loadDbOverride: async (flagKey) => {
        try {
          const { data, error } = await getAdminClient()
            .from('feature_flags')
            .select('enabled')
            .eq('key', flagKey)
            .maybeSingle();
          if (error) return undefined;
          return data?.enabled;
        } catch {
          return undefined;
        }
      },
    });
    requestResolvers.set(request, resolver);
  }
  return resolver.isEnabled(key);
}

export async function requireFeature(request: Request, key: FeatureFlagKey) {
  return (await isFeatureEnabled(request, key)) ? null : featureDisabledResponse(key);
}

export function isKnownFeatureKey(value: string): value is FeatureFlagKey {
  return Object.prototype.hasOwnProperty.call(FEATURE_FLAGS, value);
}
