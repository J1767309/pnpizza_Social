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
    
    const compressImage = (file: File): Promise<{ base64: string; mimeType: string }> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        reject(new Error('Could not get canvas context'));
                        return;
                    }

                    // Target max dimension and file size
                    const MAX_DIMENSION = 2048;
                    const TARGET_SIZE_MB = 10;

                    let width = img.width;
                    let height = img.height;

                    // Resize if image is too large
                    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
                        if (width > height) {
                            height = (height / width) * MAX_DIMENSION;
                            width = MAX_DIMENSION;
                        } else {
                            width = (width / height) * MAX_DIMENSION;
                            height = MAX_DIMENSION;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);

                    // Start with high quality and reduce if needed
                    let quality = 0.9;
                    let base64 = canvas.toDataURL('image/jpeg', quality).split(',')[1];

                    // Reduce quality if still too large
                    while (base64.length > TARGET_SIZE_MB * 1024 * 1024 * 1.37 && quality > 0.5) {
                        quality -= 0.1;
                        base64 = canvas.toDataURL('image/jpeg', quality).split(',')[1];
                    }

                    resolve({
                        base64,
                        mimeType: 'image/jpeg',
                    });
                };
                img.onerror = () => reject(new Error('Failed to load image'));
                img.src = e.target?.result as string;
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    };

    const processFile = async (file: File | null) => {
        if (!file) return;

        if (file.size > 100 * 1024 * 1024) { // 100MB hard limit
            alert("File is too large. Please select a file under 100MB.");
            return;
        }

        const acceptedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif', 'video/mp4', 'video/webm'];
        if (!acceptedTypes.includes(file.type)) {
            alert(`Unsupported file type: ${file.type}. Please use PNG, JPG, WEBP, HEIC, MP4, or WEBM.`);
            return;
        }

        // Compress images if they're large
        if (file.type.startsWith('image/')) {
            try {
                const compressed = await compressImage(file);
                setUploadedMedia(compressed);
            } catch (error) {
                console.error('Error compressing image:', error);
                alert('Failed to process image. Please try a different file.');
            }
        } else {
            // For videos, just read as-is
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setUploadedMedia({
                    base64: base64String.split(',')[1],
                    mimeType: file.type,
                });
            };
            reader.readAsDataURL(file);
        }
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
        <div className="bg-white border-2 border-red-200 rounded-xl p-6 shadow-lg">
            <div className="flex flex-col gap-6">
                <div>
                    <label htmlFor="idea" className="block text-sm font-semibold text-gray-800 mb-2">
                        Your Content Idea
                    </label>
                    <div className="relative">
                        <textarea
                            id="idea"
                            value={idea}
                            onChange={handleIdeaChange}
                            placeholder="e.g., A special on our famous pepperoni pizza..."
                            className="w-full h-28 p-3 pr-12 bg-amber-50 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors placeholder-gray-500 text-gray-800"
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
                                        : 'bg-red-100 hover:bg-red-200 text-red-700'
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
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                        Upload Image or Video for Inspiration (Optional)
                    </label>
                    {uploadedMedia ? (
                        <div className="relative group">
                            {uploadedMedia.mimeType.startsWith('image/') && (
                                <img src={`data:${uploadedMedia.mimeType};base64,${uploadedMedia.base64}`} alt="Uploaded preview" className="w-full max-h-96 object-contain bg-gray-100 rounded-md border-2 border-gray-300" />
                            )}
                            {uploadedMedia.mimeType.startsWith('video/') && (
                                <video src={`data:${uploadedMedia.mimeType};base64,${uploadedMedia.base64}`} controls className="w-full max-h-96 object-contain bg-gray-100 rounded-md border-2 border-gray-300" />
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
                                accept="image/png, image/jpeg, image/webp, image/heic, image/heif, video/mp4, video/webm"
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
                                    ? 'opacity-50 cursor-not-allowed border-gray-400 bg-gray-50'
                                    : isDragging
                                    ? 'border-red-500 bg-red-50'
                                    : 'border-gray-400 cursor-pointer hover:bg-amber-50 hover:border-red-400'
                                }`}
                            >
                                <ImageIcon className="w-10 h-10 text-gray-600 mb-2" />
                                <span className="text-sm text-gray-700">Click to upload, paste an image, or drag & drop</span>
                                <span className="text-xs text-gray-600">PNG, JPG, WEBP, HEIC, MP4, WEBM (images auto-compressed)</span>
                            </label>
                        </>
                    )}
                </div>

                <button
                    onClick={onGenerate}
                    disabled={isLoading || !idea.trim()}
                    className="w-full mt-4 flex items-center justify-center gap-2 bg-red-700 hover:bg-red-800 text-white font-bold py-3 px-4 rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                >
                    <SparklesIcon className="w-5 h-5" />
                    {isLoading ? 'Generating...' : 'Generate Content'}
                </button>
            </div>
        </div>
    );
};