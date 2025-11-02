import React, { useState } from 'react';
import type { SocialPost } from '../types';
import { CopyIcon, CheckIcon } from './icons';

interface ResultCardProps {
    post: SocialPost;
    icon: React.FC<React.SVGProps<SVGSVGElement>>;
}

export const ResultCard: React.FC<ResultCardProps> = ({ post, icon: IconComponent }) => {
    const [textCopied, setTextCopied] = useState(false);
    const [hashtagsCopied, setHashtagsCopied] = useState(false);

    const handleCopyText = () => {
        navigator.clipboard.writeText(post.text).then(() => {
            setTextCopied(true);
            setTimeout(() => setTextCopied(false), 2000);
        });
    };

    const handleCopyHashtags = () => {
        if (post.hashtags && post.hashtags.length > 0) {
            const hashtagsToCopy = post.hashtags.map(h => `#${h}`).join(' ');
            navigator.clipboard.writeText(hashtagsToCopy).then(() => {
                setHashtagsCopied(true);
                setTimeout(() => setHashtagsCopied(false), 2000);
            });
        }
    };

    return (
        <div className="bg-gray-800/60 backdrop-blur-sm border border-gray-700 rounded-xl shadow-lg overflow-hidden flex flex-col transition-all duration-300 hover:border-purple-500 hover:shadow-purple-500/10">
            <div className="p-4 flex items-center gap-3 bg-gray-900/50 border-b border-gray-700">
                <IconComponent className="w-6 h-6 text-gray-300" />
                <h3 className="font-bold text-lg text-white">{post.platform}</h3>
            </div>
            
            <div className="aspect-w-1 aspect-h-1 bg-gray-900">
                 {post.media.type === 'image' ? (
                    <img src={post.media.url} alt={`Generated for ${post.platform}`} className="object-cover w-full h-full"/>
                 ) : (
                    <video src={post.media.url} controls className="object-contain w-full h-full"/>
                 )}
            </div>

            <div className="p-4 flex flex-col flex-grow">
                <p className="text-gray-300 whitespace-pre-wrap flex-grow">{post.text}</p>
                {post.hashtags && post.hashtags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                        {post.hashtags.map((tag, index) => (
                            <span key={index} className="text-sm text-purple-300 bg-purple-900/50 px-2 py-1 rounded">
                                #{tag}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-gray-700 bg-gray-900/50 flex flex-col gap-2">
                <button
                    onClick={handleCopyText}
                    className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-gray-200 font-semibold py-2 px-4 rounded-md transition-colors"
                >
                    {textCopied ? <CheckIcon className="w-5 h-5 text-green-400" /> : <CopyIcon className="w-5 h-5" />}
                    {textCopied ? 'Text Copied!' : 'Copy Text'}
                </button>
                {post.hashtags && post.hashtags.length > 0 && (
                    <button
                        onClick={handleCopyHashtags}
                        className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-gray-200 font-semibold py-2 px-4 rounded-md transition-colors"
                    >
                        {hashtagsCopied ? <CheckIcon className="w-5 h-5 text-green-400" /> : <CopyIcon className="w-5 h-5" />}
                        {hashtagsCopied ? 'Hashtags Copied!' : 'Copy Hashtags'}
                    </button>
                )}
            </div>
        </div>
    );
};