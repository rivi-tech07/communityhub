import { describe, expect, it } from 'vitest';
import { MOBILE_IAP_ENABLED } from '../packages/shared/src';
import { MobilePromotionEntry } from '../apps/mobile/src/mobile-promotions';

function textContent(node: unknown): string {
  if (typeof node === 'string') return node;
  if (!node || typeof node !== 'object') return '';
  const props = Object(node).props;
  const children = Array.isArray(props?.children) ? props.children : [props?.children];
  return children.map(textContent).join('');
}

describe('mobile promotion entry', () => {
  it('renders no purchase CTA while mobile IAP is disabled', () => {
    expect(MOBILE_IAP_ENABLED).toBe(false);
    const output = MobilePromotionEntry({ ViewComponent: 'View', TextComponent: 'Text' });
    expect(textContent(output)).toBe('Promotions are not available in the app.');
    expect(textContent(output)).not.toMatch(/buy|boost|price|purchase/i);
  });
});
