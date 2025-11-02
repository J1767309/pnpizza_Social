import type { SocialMediaPosts, UploadedMedia } from '../types';

const API_ENDPOINT = process.env.API_ENDPOINT || '/api/generate';

export async function generateSocialPostsViaAPI(idea: string, uploadedMedia: UploadedMedia | null): Promise<SocialMediaPosts> {
    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                idea,
                uploadedMedia,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || `Server error: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error calling API:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to generate content: ${error.message}`);
        }
        throw new Error('An unknown error occurred during content generation.');
    }
}
