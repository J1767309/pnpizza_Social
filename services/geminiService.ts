
import { GoogleGenAI, Type, Part } from '@google/genai';
import type { GeminiTextResponse, SocialMediaPosts, BrandVoice, UploadedMedia } from '../types';
import { PLATFORMS, PLATFORM_ASPECT_RATIOS } from '../constants';

// Initialize API client lazily to prevent errors during app startup
let ai: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI {
    if (!ai) {
        const apiKey = process.env.API_KEY;
        if (!apiKey) {
            throw new Error('API key is not configured. Please set GEMINI_API_KEY in your environment.');
        }
        ai = new GoogleGenAI({ apiKey });
    }
    return ai;
}

const PNP_PIZZA_BRAND_VOICE: BrandVoice = {
    websiteUrl: 'https://pnpizza.com/',
    description: 'A family-owned neighborhood pizzeria in Natick, MA, serving authentic Italian food like pizza, subs, and pasta for over 40 years. The tone is friendly, welcoming, and focuses on fresh, quality ingredients and community.',
    keywords: 'P&P Pizza, Natick MA, pizza, subs, pasta, authentic Italian, family-owned, fresh ingredients, homemade',
    phrasesToUse: 'Come on in!, Family-owned and operated, Authentic Italian recipes, Made with fresh, quality ingredients, Your neighborhood pizzeria, Daily specials',
    phrasesToAvoid: 'gourmet, artisanal, cheap, fast food, corporate jargon'
};

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        linkedin: { type: Type.STRING, description: 'A professional, long-form post for LinkedIn, including relevant hashtags.' },
        facebook: { type: Type.STRING, description: 'An engaging post for Facebook, including relevant hashtags.' },
        twitter: { type: Type.STRING, description: 'A short, punchy post for Twitter/X, under 280 characters, with hashtags.' },
        instagram: {
            type: Type.OBJECT,
            properties: {
                caption: { type: Type.STRING, description: 'A visually-focused caption for an Instagram post.' },
                hashtags: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'An array of 3-5 relevant hashtags for Instagram, without the # symbol.'
                },
                image_prompt: { type: Type.STRING, description: 'A detailed, creative prompt for an AI image generator to create a visually appealing image for this post.' },
            },
            required: ['caption', 'hashtags', 'image_prompt'],
        },
    },
    required: ['linkedin', 'facebook', 'twitter', 'instagram'],
};

const buildPrompt = (idea: string, mediaType: 'image' | 'video' | null): string => {
    const brandVoice = PNP_PIZZA_BRAND_VOICE;

    let prompt = `You are the social media manager for P&P Pizza, a beloved family-owned pizzeria. Based on the following idea, generate social media posts for LinkedIn, Facebook, Twitter/X, and Instagram.`;
    
    if (mediaType) {
        prompt += `\n\nA user-provided ${mediaType} is included. Analyze it carefully. The generated text content (captions, posts) MUST be directly related to and complementary to THIS specific ${mediaType}. The goal is to create text that would be posted alongside this ${mediaType}.`;
    }

    prompt += `
    
    Idea: "${idea}"
    `;
    
    prompt += `\n\nAdhere to the P&P Pizza brand voice guidelines strictly:`;
    prompt += `\n- **Primary Source for Brand Voice**: Analyze their website: "${brandVoice.websiteUrl}"`;
    prompt += `\n- **Brand Description**: ${brandVoice.description}`;
    prompt += `\n- **Keywords to Include**: ${brandVoice.keywords}`;
    prompt += `\n- **Phrases to Use**: ${brandVoice.phrasesToUse}`;
    prompt += `\n- **Phrases to Avoid**: ${brandVoice.phrasesToAvoid}`;
    
    if (mediaType) {
        prompt += `\n\nFor the 'image_prompt' field for Instagram, just return a brief, one-sentence description of the provided ${mediaType}. Do not generate a new image prompt.`
    } else {
        prompt += `\n\nFor Instagram, create a compelling image generation prompt based on the core idea and brand voice. The image should look like authentic, delicious food from a classic neighborhood pizzeria.`;
    }
    
    prompt += `\n\nProvide the output in the requested JSON format.`;
    
    return prompt;
};


export const generateSocialPosts = async (idea: string, uploadedMedia: UploadedMedia | null): Promise<SocialMediaPosts> => {
    try {
        // Step 1: Generate text content for all platforms
        const textGenerationModel = 'gemini-2.5-pro';
        const mediaType = uploadedMedia ? (uploadedMedia.mimeType.startsWith('video') ? 'video' : 'image') : null;
        const textPrompt = buildPrompt(idea, mediaType);

        const parts: Part[] = [{ text: textPrompt }];
        if (uploadedMedia) {
            parts.unshift({
                inlineData: {
                    mimeType: uploadedMedia.mimeType,
                    data: uploadedMedia.base64,
                },
            });
        }

        const textResult = await getAIClient().models.generateContent({
            model: textGenerationModel,
            contents: { parts },
            config: {
                responseMimeType: 'application/json',
                responseSchema: responseSchema,
            },
        });

        const textData: GeminiTextResponse = JSON.parse(textResult.text);
        
        let mediaData: { url: string; type: 'image' | 'video'; }[];

        // Step 2: Use uploaded media or generate new images if none was provided
        if (uploadedMedia) {
            const mediaUrl = `data:${uploadedMedia.mimeType};base64,${uploadedMedia.base64}`;
            const type = mediaType as 'image' | 'video';
            mediaData = Array(4).fill({ url: mediaUrl, type });
        } else {
            const imagePrompt = textData.instagram.image_prompt || `A visually stunning image representing: ${idea}.`;
            const imageGenerationModel = 'imagen-4.0-generate-001';
            
            const imagePromises = Object.values(PLATFORMS).map(platform =>
                getAIClient().models.generateImages({
                    model: imageGenerationModel,
                    prompt: imagePrompt,
                    config: {
                        numberOfImages: 1,
                        outputMimeType: 'image/jpeg',
                        aspectRatio: PLATFORM_ASPECT_RATIOS[platform],
                    },
                })
            );
            
            const imageResults = await Promise.all(imagePromises);

            const imageUrls = imageResults.map(res => {
                if (!res.generatedImages || res.generatedImages.length === 0) {
                     throw new Error("Image generation failed to return an image.");
                }
                const base64ImageBytes = res.generatedImages[0].image.imageBytes;
                return `data:image/jpeg;base64,${base64ImageBytes}`;
            });
            mediaData = imageUrls.map(url => ({ url, type: 'image' }));
        }


        // Step 3: Combine text and media
        const finalPosts: SocialMediaPosts = [
            {
                platform: PLATFORMS.LINKEDIN,
                text: textData.linkedin,
                media: mediaData[0],
            },
            {
                platform: PLATFORMS.FACEBOOK,
                text: textData.facebook,
                media: mediaData[1],
            },
            {
                platform: PLATFORMS.TWITTER,
                text: textData.twitter,
                media: mediaData[2],
            },
            {
                platform: PLATFORMS.INSTAGRAM,
                text: textData.instagram.caption,
                hashtags: textData.instagram.hashtags,
                media: mediaData[3],
            },
        ];

        return finalPosts;

    } catch (error) {
        console.error("Error generating social media content:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to generate content: ${error.message}`);
        }
        throw new Error('An unknown error occurred during content generation.');
    }
};