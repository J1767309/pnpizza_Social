import React, { useEffect, useState, useRef } from 'react';
import type { UploadedMedia } from '../types';
import { SparklesIcon, ImageIcon, XCircleIcon, MicrophoneIcon } from './icons';

// Fix for missing Web Speech API types. These are not yet part of standard TypeScript DOM library.
interface SpeechRecognitionResult {
    readonly [index: number]: { readonly transcript: string };
}
interface SpeechRecognitionResultList {
    readonly [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEvent extends Event {
    readonly results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
    readonly error: string;
}
interface SpeechRecognition {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onstart: () => void;
    onresult: (event: SpeechRecognitionEvent) => void;
    onerror: (event: SpeechRecognitionErrorEvent) => void;
    onend: () => void;
    start: () => void;
    stop: () => void;
}

interface InputSectionProps {
    idea: string;
    setIdea: (idea: string) => void;
    uploadedMedia: UploadedMedia | null;
    setUploadedMedia: (media: UploadedMedia | null) => void;
    onGenerate: () => void;
    isLoading: boolean;
}

export const InputSection: React.FC<InputSectionProps> = ({ idea, setIdea, uploadedMedia, setUploadedMedia, onGenerate, isLoading }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isSpeechRecognitionSupported, setIsSpeechRecognitionSupported] = useState(false);
    const [speechError, setSpeechError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const recognitionRef = useRef<SpeechRecognition | null>(null);

    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        setIsSpeechRecognitionSupported(!!SpeechRecognition);
        
        // Cleanup on unmount
        return () => {
            recognitionRef.current?.stop();
        };
    }, []);

    useEffect(() => {
        if (speechError) {
            const timer = setTimeout(() => setSpeechError(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [speechError]);

    const handleToggleRecording = () => {
        if (isRecording) {
            recognitionRef.current?.stop();
            return;
        }

        setSpeechError(null);
        if (!navigator.onLine) {
            setSpeechError("You appear to be offline. Please check your internet connection.");
            return;
        }

        const SpeechRecognitionImpl = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognitionImpl) {
            setSpeechError("Speech recognition is not supported in your browser.");
            return;
        }
        
        try {
            const recognition = new SpeechRecognitionImpl();
            recognitionRef.current = recognition;

            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-US';

            recognition.onstart = () => {
                setIsRecording(true);
            };

            recognition.onresult = (event: SpeechRecognitionEvent) => {
                const transcript = event.results[0][0].transcript;
                setIdea(prevIdea => prevIdea ? `${prevIdea.trim()} ${transcript}`.trim() : transcript);
                setSpeechError(null);
            };

            recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
                console.error('Speech recognition error:', event.error);
                let message = 'An error occurred during speech recognition. Please try again.';
                switch (event.error) {
                    case 'network':
                        message = 'Network error. Please check your connection and try again.';
                        break;
                    case 'no-speech':
                        message = 'No speech was detected. Please try again.';
                        break;
                    case 'not-allowed':
                    case 'service-not-allowed':
                        message = 'Microphone access denied. Please allow access in your browser settings.';
                        break;
                }
                setSpeechError(message);
                // onend will be called automatically by the browser after an error.
            };

            recognition.onend = () => {
                setIsRecording(false);
                recognitionRef.current = null;
            };

            recognition.start();
        } catch (e) {
            console.error("Could not start recognition service:", e);
            setSpeechError("Could not start microphone. It may be in use by another app.");
            setIsRecording(false);
        }
    };

    const handleIdeaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setSpeechError(null);
        setIdea(e.target.value);
    };
    
    const processFile = (file: File | null) => {
        if (!file) return;

        if (file.size > 20 * 1024 * 1024) { // 20MB limit
            alert("File is too large. Please select a file under 20MB.");
            return;
        }

        const acceptedTypes = ['image/png', 'image/jpeg', 'image/webp', 'video/mp4', 'video/webm'];
        if (!acceptedTypes.includes(file.type)) {
            alert(`Unsupported file type: ${file.type}. Please use PNG, JPG, WEBP, MP4, or WEBM.`);
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            setUploadedMedia({
                base64: base64String.split(',')[1],
                mimeType: file.type,
            });
        };
        reader.readAsDataURL(file);
    };

    const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        processFile(e.target.files?.[0] ?? null);
    };
    
    const removeMedia = () => {
        setUploadedMedia(null);
    };

    useEffect(() => {
        const handlePaste = (event: ClipboardEvent) => {
            if (isLoading || !event.clipboardData) return;

            const items = event.clipboardData.items;
            for (let i = 0; i < items.length; i++) {
                if (items[i].kind === 'file' && items[i].type.startsWith('image/')) {
                    const file = items[i].getAsFile();
                    if (file) {
                        event.preventDefault();
                        processFile(file);
                        return; // Handle first image found
                    }
                }
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [isLoading, setUploadedMedia]);

    const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isLoading) setIsDragging(true);
    };
    
    const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation(); // Necessary to allow drop
    };

    const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (isLoading) return;

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            processFile(e.dataTransfer.files[0]);
            e.dataTransfer.clearData();
        }
    };

    return (
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 shadow-lg">
            <div className="flex flex-col gap-6">
                <div>
                    <label htmlFor="idea" className="block text-sm font-medium text-gray-300 mb-2">
                        Your Content Idea
                    </label>
                    <div className="relative">
                        <textarea
                            id="idea"
                            value={idea}
                            onChange={handleIdeaChange}
                            placeholder="e.g., A special on our famous pepperoni pizza..."
                            className="w-full h-28 p-3 pr-12 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors placeholder-gray-500"
                            disabled={isLoading}
                        />
                         {isSpeechRecognitionSupported && (
                            <div className="absolute bottom-3 right-3">
                                <button
                                    type="button"
                                    onClick={handleToggleRecording}
                                    disabled={isLoading}
                                    className={`p-2 rounded-full transition-all duration-200 ${
                                        isRecording 
                                        ? 'bg-red-600 text-white animate-pulse' 
                                        : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                                    aria-label={isRecording ? 'Stop recording' : 'Start recording'}
                                >
                                    <MicrophoneIcon className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                    </div>
                    {speechError && <p className="mt-2 text-sm text-red-400">{speechError}</p>}
                </div>

                 {/* Media Upload Section */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Upload Image or Video for Inspiration (Optional)
                    </label>
                    {uploadedMedia ? (
                        <div className="relative group">
                            {uploadedMedia.mimeType.startsWith('image/') && (
                                <img src={`data:${uploadedMedia.mimeType};base64,${uploadedMedia.base64}`} alt="Uploaded preview" className="w-full h-40 object-cover rounded-md border border-gray-600" />
                            )}
                            {uploadedMedia.mimeType.startsWith('video/') && (
                                <video src={`data:${uploadedMedia.mimeType};base64,${uploadedMedia.base64}`} controls className="w-full h-40 object-cover rounded-md border border-gray-600" />
                            )}
                            <button
                                onClick={removeMedia}
                                disabled={isLoading}
                                className="absolute top-2 right-2 bg-gray-900/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity disabled:cursor-not-allowed"
                                aria-label="Remove media"
                            >
                                <XCircleIcon className="w-6 h-6" />
                            </button>
                        </div>
                    ) : (
                        <>
                            <input
                                type="file"
                                id="media-upload"
                                accept="image/png, image/jpeg, image/webp, video/mp4, video/webm"
                                onChange={handleMediaUpload}
                                className="sr-only"
                                disabled={isLoading}
                            />
                            <label
                                htmlFor="media-upload"
                                onDragEnter={handleDragEnter}
                                onDragLeave={handleDragLeave}
                                onDragOver={handleDragOver}
                                onDrop={handleDrop}
                                className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed  rounded-lg transition-colors ${
                                    isLoading 
                                    ? 'opacity-50 cursor-not-allowed border-gray-600' 
                                    : isDragging 
                                    ? 'border-purple-500 bg-gray-700/50' 
                                    : 'border-gray-600 cursor-pointer hover:bg-gray-700/50 hover:border-purple-500'
                                }`}
                            >
                                <ImageIcon className="w-10 h-10 text-gray-500 mb-2" />
                                <span className="text-sm text-gray-400">Click to upload, paste an image, or drag & drop</span>
                                <span className="text-xs text-gray-500">PNG, JPG, WEBP, MP4, WEBM up to 20MB</span>
                            </label>
                        </>
                    )}
                </div>

                <button
                    onClick={onGenerate}
                    disabled={isLoading || !idea.trim()}
                    className="w-full mt-4 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-4 rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                >
                    <SparklesIcon className="w-5 h-5" />
                    {isLoading ? 'Generating...' : 'Generate Content'}
                </button>
            </div>
        </div>
    );
};