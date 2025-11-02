
export const PLATFORMS = {
  LINKEDIN: 'LinkedIn',
  FACEBOOK: 'Facebook',
  TWITTER: 'Twitter',
  INSTAGRAM: 'Instagram',
} as const;

type AspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9';

export const PLATFORM_ASPECT_RATIOS: Record<typeof PLATFORMS[keyof typeof PLATFORMS], AspectRatio> = {
  [PLATFORMS.LINKEDIN]: '4:3',
  [PLATFORMS.FACEBOOK]: '1:1',
  [PLATFORMS.TWITTER]: '16:9',
  [PLATFORMS.INSTAGRAM]: '1:1',
};
