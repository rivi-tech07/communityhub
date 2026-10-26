import { createElement, type ElementType } from 'react';
import { MOBILE_IAP_ENABLED } from '@communityhub/shared';

export function MobilePromotionEntry({
  ViewComponent,
  TextComponent,
}: {
  ViewComponent: ElementType;
  TextComponent: ElementType;
}) {
  if (!MOBILE_IAP_ENABLED)
    return createElement(
      ViewComponent,
      { accessibilityRole: 'text' },
      createElement(TextComponent, null, 'Promotions are not available in the app.'),
    );

  return null;
}
