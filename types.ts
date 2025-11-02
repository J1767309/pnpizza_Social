
export interface BrandVoice {
  keywords: string;
  phrasesToUse: string;
  phrasesToAvoid: string;
  description: string;
  websiteUrl?: string;
}

export interface UploadedMedia {
  base64: string;
  mimeType: string;
}

export interface InstagramContent {
  caption: string;
  hashtags: string[];
  image_prompt: string;
}

export interface GeminiTextResponse {
  linkedin: string;
  facebook: string;
  twitter: string;
  instagram: InstagramContent;
}

export interface SocialPost {
  platform: 'LinkedIn' | 'Facebook' | 'Twitter' | 'Instagram';
  text: string;
  hashtags?: string[];
  media: {
    url: string;
    type: 'image' | 'video';
  };
}

export type SocialMediaPosts = SocialPost[];