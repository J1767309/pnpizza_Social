
import React, { useState, useCallback } from 'react';
import { InputSection } from './components/InputSection';
import { ResultCard } from './components/ResultCard';
import { LoadingSpinner } from './components/LoadingSpinner';
import { generateSocialPosts } from './services/geminiService';
import { generateSocialPostsViaAPI } from './services/apiService';
import type { SocialPost, UploadedMedia } from './types';
import { PLATFORMS } from './constants';
import { LinkedInIcon, TwitterIcon, InstagramIcon, SparklesIcon, FacebookIcon } from './components/icons';

const App: React.FC = () => {
    const [idea, setIdea] = useState<string>('');
    const [uploadedMedia, setUploadedMedia] = useState<UploadedMedia | null>(null);
    const [posts, setPosts] = useState<SocialPost[] | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const platformIcons: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = {
        [PLATFORMS.LINKEDIN]: LinkedInIcon,
        [PLATFORMS.FACEBOOK]: FacebookIcon,
        [PLATFORMS.TWITTER]: TwitterIcon,
        [PLATFORMS.INSTAGRAM]: InstagramIcon,
    };

    const handleGenerate = useCallback(async () => {
        if (!idea.trim()) {
            setError('Please enter an idea to generate content.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setPosts(null);

        try {
            // Use API service when API_KEY is not available (production deployment)
            // Use direct service when API_KEY is available (.env.local for local dev)
            const useAPI = !process.env.API_KEY;
            const result = useAPI
                ? await generateSocialPostsViaAPI(idea, uploadedMedia)
                : await generateSocialPosts(idea, uploadedMedia);
            setPosts(result);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(errorMessage);
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [idea, uploadedMedia]);

    return (
        <div className="min-h-screen bg-amber-50 text-gray-800 font-sans p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <header className="text-center mb-8">
                    <img
                        src="https://images.squarespace-cdn.com/content/v1/5773ed83414fb5b92b37751e/1470189220065-Y0K0RHVII5Y5D5NIDO4I/Final.png?format=1500w"
                        alt="P&P Pizza Logo"
                        className="mx-auto h-32 w-auto mb-6"
                    />
                    <h1 className="text-4xl sm:text-5xl font-bold text-red-700">
                        Social Content AI
                    </h1>
                    <p className="mt-2 text-lg text-gray-700">
                        Your one-click solution for cross-platform social media content for P&P Pizza.
                    </p>
                </header>

                <main>
                    <InputSection
                        idea={idea}
                        setIdea={setIdea}
                        uploadedMedia={uploadedMedia}
                        setUploadedMedia={setUploadedMedia}
                        onGenerate={handleGenerate}
                        isLoading={isLoading}
                    />

                    {error && (
                        <div className="mt-8 text-center bg-red-50 border-2 border-red-600 text-red-800 px-4 py-3 rounded-lg shadow-md">
                            <p className="font-semibold">{error}</p>
                        </div>
                    )}

                    <div className="mt-10">
                        {isLoading && <LoadingSpinner />}
                        
                        {!isLoading && !posts && !error && (
                             <div className="text-center text-gray-600 py-16">
                                <SparklesIcon className="mx-auto h-12 w-12 text-red-600" />
                                <h2 className="mt-4 text-xl font-semibold text-gray-800">Ready to create?</h2>
                                <p className="mt-1 text-gray-600">Your generated content will appear here.</p>
                            </div>
                        )}
                        
                        {posts && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                {posts.map((post) => (
                                    <ResultCard
                                        key={post.platform}
                                        post={post}
                                        icon={platformIcons[post.platform]}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default App;
