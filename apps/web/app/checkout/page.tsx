import { requireFeature } from '../../lib/feature-flags';
import CheckoutClient from './checkout-client';

export default async function CheckoutPage() {
  const disabled = await requireFeature(new Request('http://local/checkout'), 'checkout');
  if (disabled) return null;
  return <CheckoutClient />;
}
