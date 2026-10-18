import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key)
  throw new Error(
    'Seed requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. No seed data was written.',
  );
if (process.env.NODE_ENV === 'production') throw new Error('Refusing to seed production.');

const ownerId = process.env.SEED_OWNER_USER_ID;
if (!ownerId) {
  console.log('Sample seed skipped: set SEED_OWNER_USER_ID to a disposable local auth user.');
  process.exit(0);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const samples = [
  {
    name: 'Gujarati Community UK',
    slug: 'gujarati-community-uk',
    description: 'A welcoming space for Gujarati speakers and families across the UK.',
    community_type: 'language',
    visibility: 'public',
    country: 'United Kingdom',
    city: null,
    language_code: 'gu',
    created_by: ownerId,
  },
  {
    name: 'Bengali Community London',
    slug: 'bengali-community-london',
    description: 'Connect with Bengali culture, food, language, and events in London.',
    community_type: 'culture',
    visibility: 'public',
    country: 'United Kingdom',
    city: 'London',
    language_code: 'bn',
    created_by: ownerId,
  },
  {
    name: 'Indian Students in London',
    slug: 'indian-students-in-london',
    description: 'A private sample community for Indian students sharing practical support.',
    community_type: 'profession',
    visibility: 'private',
    country: 'United Kingdom',
    city: 'London',
    language_code: 'en',
    created_by: ownerId,
  },
] as const;

async function seed() {
  const { data: communities, error: communityError } = await supabase
    .from('communities')
    .upsert(
      samples.map((sample) => ({ ...sample, is_sample: true })),
      { onConflict: 'slug' },
    )
    .select('id, slug');
  if (communityError) throw communityError;
  if (!communities) throw new Error('Sample communities were not returned.');
  for (const community of communities) {
    await supabase
      .from('community_memberships')
      .upsert({ community_id: community.id, user_id: ownerId, role: 'owner', status: 'active' });
  }
  const posts = [
    {
      slug: 'gujarati-community-uk',
      body: 'Sample announcement: welcome to our Gujarati community. Share local events and helpful resources.',
      is_announcement: true,
    },
    {
      slug: 'bengali-community-london',
      body: 'Sample post: what local Bengali events should we add to the community calendar?',
      is_announcement: false,
    },
    {
      slug: 'indian-students-in-london',
      body: 'Sample private post: orientation week tips will be shared here for verified members.',
      is_announcement: false,
    },
  ];
  for (const post of posts) {
    const community = communities.find((item) => item.slug === post.slug);
    if (!community) continue;
    const { data: existing } = await supabase
      .from('posts')
      .select('id')
      .eq('community_id', community.id)
      .eq('body', post.body)
      .maybeSingle();
    if (!existing) {
      const { error } = await supabase.from('posts').insert({
        community_id: community.id,
        author_id: ownerId,
        body: post.body,
        is_announcement: post.is_announcement,
        is_sample: true,
      });
      if (error) throw error;
    }
  }
  const businesses = [
    {
      owner_id: ownerId,
      name: 'Sample Nook Grocers',
      slug: 'sample-nook-grocers',
      category: 'Groceries',
      description: 'Sample catalog for local produce and pantry essentials.',
      city: 'London',
      country: 'United Kingdom',
      postcode: 'E1',
      is_published: true,
      verification_status: 'verified',
      is_sample: true,
    },
    {
      owner_id: ownerId,
      name: 'Sample Mitti Studio',
      slug: 'sample-mitti-studio',
      category: 'Handmade goods',
      description: 'Sample catalog for locally made gifts and home goods.',
      city: 'London',
      country: 'United Kingdom',
      postcode: 'N1',
      is_published: true,
      verification_status: 'verified',
      is_sample: true,
    },
  ] as const;
  const { data: businessRows, error: businessError } = await supabase
    .from('businesses')
    .upsert(businesses, { onConflict: 'slug' })
    .select('id, slug');
  if (businessError) throw businessError;
  for (const business of businessRows ?? []) {
    await supabase.from('delivery_configs').upsert(
      {
        business_id: business.id,
        delivery_enabled: true,
        collection_available: true,
        delivery_charge: 2.5,
        minimum_order_value: 15,
        currency: 'GBP',
        estimated_min_minutes: 30,
        estimated_max_minutes: 90,
        opening_hours: {
          mon: ['09:00-18:00'],
          tue: ['09:00-18:00'],
          wed: ['09:00-18:00'],
          thu: ['09:00-18:00'],
          fri: ['09:00-18:00'],
          sat: ['10:00-16:00'],
          sun: [],
        },
      },
      { onConflict: 'business_id' },
    );
    const { count } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', business.id)
      .eq('is_sample', true);
    if (!count) {
      const { error } = await supabase.from('products').insert([
        {
          business_id: business.id,
          name: 'Sample seasonal veg box',
          slug: `${business.slug}-veg-box`,
          description: 'Sample seeded product; not a live offer.',
          price: 12.5,
          currency: 'GBP',
          unit: 'box',
          stock_quantity: 20,
          availability: true,
          discount_percentage: 0,
          is_sample: true,
        },
        {
          business_id: business.id,
          name: 'Sample pantry bundle',
          slug: `${business.slug}-pantry-bundle`,
          description: 'Sample seeded product; not a live offer.',
          price: 18,
          currency: 'GBP',
          unit: 'bundle',
          stock_quantity: 10,
          availability: true,
          discount_percentage: 10,
          is_sample: true,
        },
      ]);
      if (error) throw error;
    }
    const { count: areaCount } = await supabase
      .from('delivery_areas')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', business.id);
    if (!areaCount)
      await supabase.from('delivery_areas').insert({
        business_id: business.id,
        name: 'Sample East London area',
        supported_postcodes: ['E1', 'E2', 'N1'],
        delivery_charge: 2.5,
        minimum_order_value: 15,
        available_time_slots: [
          { day: 'sat', start: '10:00', end: '14:00' },
          { day: 'sun', start: '12:00', end: '16:00' },
        ],
        is_active: true,
      });
  }
  const { data: employer } = await supabase
    .from('employer_profiles')
    .upsert(
      {
        owner_id: ownerId,
        name: 'Sample Community Employer',
        description: 'Sample employer profile for development only.',
        city: 'London',
        country: 'United Kingdom',
        is_sample: true,
      },
      { onConflict: 'owner_id,name' },
    )
    .select('id')
    .single();
  if (employer)
    await supabase.from('job_listings').insert({
      employer_id: employer.id,
      title: 'Sample Community Coordinator',
      description: 'Sample job listing for development only. This is not a live vacancy.',
      job_type: 'part_time',
      location: 'London',
      salary_currency: 'GBP',
      sponsorship_status: 'unknown',
      status: 'published',
      is_sample: true,
    });
  await supabase.from('services').insert({
    owner_id: ownerId,
    name: 'Sample Translation Help',
    category: 'Language',
    description: 'Sample local service listing for development only.',
    pricing: 'Enquire for pricing',
    service_areas: ['London'],
    status: 'published',
    is_sample: true,
  });
  await supabase.from('events').insert({
    organizer_id: ownerId,
    title: 'Sample Community Welcome Meetup',
    description: 'Sample event for development only.',
    venue_name: 'Sample Hall',
    venue_address: 'London',
    starts_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    ends_at: new Date(Date.now() + 7 * 86400000 + 2 * 3600000).toISOString(),
    capacity: 50,
    status: 'published',
    is_free: true,
    is_sample: true,
  });
  console.log(
    `Seeded ${communities.length} sample communities, sample posts, ${businessRows?.length ?? 0} sample businesses, and Phase 5 fixtures. All fixtures are marked sample.`,
  );
}

seed().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
