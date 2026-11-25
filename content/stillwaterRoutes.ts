import type { Href } from 'expo-router';

export const STILLWATER_ROUTES = {
  plans: '/plans' as Href,
  settings: '/settings' as Href,
  sanctuary: '/sanctuary' as Href,
  programmePreview: '/programme-preview' as Href,
  programmes: '/programmes' as Href,
  shared: '/shared' as Href,
  circles: '/circles' as Href,
  host: '/host' as Href,
  plus: '/plus' as Href,
  publishers: '/publishers' as Href,
  publisherProfile: (id: string): Href =>
    ('/publishers?id=' + encodeURIComponent(id)) as Href,
} as const;
