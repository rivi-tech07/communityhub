export type FlagEnvironment = 'development' | 'test' | 'staging' | 'production';

export const FEATURE_FLAGS = {
  checkout: {
    envName: 'CHECKOUT',
    defaults: { development: false, test: false, staging: false, production: false },
    description: 'Enable server-created physical and service checkout.',
  },
  promotions: {
    envName: 'PROMOTIONS',
    defaults: { development: false, test: false, staging: false, production: false },
    description: 'Enable paid promotion requests and promotion checkout.',
  },
  service_enquiries: {
    envName: 'SERVICE_ENQUIRIES',
    defaults: { development: false, test: false, staging: false, production: false },
    description: 'Enable authenticated service enquiries.',
  },
  jobs: {
    envName: 'JOBS',
    defaults: { development: true, test: true, staging: true, production: true },
    description: 'Enable job browsing and applications.',
  },
  shop: {
    envName: 'SHOP',
    defaults: { development: true, test: true, staging: true, production: true },
    description: 'Enable public shop browsing.',
  },
  delivery: {
    envName: 'DELIVERY',
    defaults: { development: false, test: false, staging: false, production: false },
    description: 'Enable delivery operations.',
  },
  community_posts: {
    envName: 'COMMUNITY_POSTS',
    defaults: { development: true, test: true, staging: true, production: true },
    description: 'Enable community posting.',
  },
} as const;

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;
export type FeatureFlagDbOverride = boolean | null | undefined;

function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return undefined;
}

export function resolveFeatureFlag(
  key: FeatureFlagKey,
  input: {
    environment: FlagEnvironment;
    env?: Record<string, string | undefined>;
    dbOverride?: FeatureFlagDbOverride;
  },
): boolean {
  const definition = FEATURE_FLAGS[key];
  const envOverride = parseBoolean(input.env?.[`FEATURE_${definition.envName}`]);
  if (envOverride !== undefined) return envOverride;
  if (input.dbOverride !== undefined && input.dbOverride !== null) return input.dbOverride;
  return definition.defaults[input.environment];
}

export function createFeatureFlagResolver(input: {
  environment: FlagEnvironment;
  env?: Record<string, string | undefined>;
  loadDbOverride: (key: FeatureFlagKey) => Promise<FeatureFlagDbOverride>;
}) {
  const cache = new Map<FeatureFlagKey, boolean>();
  return {
    async isEnabled(key: FeatureFlagKey) {
      const cached = cache.get(key);
      if (cached !== undefined) return cached;
      const value = resolveFeatureFlag(key, {
        environment: input.environment,
        env: input.env,
        dbOverride: await input.loadDbOverride(key),
      });
      cache.set(key, value);
      return value;
    },
  };
}
