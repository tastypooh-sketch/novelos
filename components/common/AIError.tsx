import React from 'react';
import { API_KEY_ERROR } from '../../utils/ai';

interface AIErrorProps {
    message: string | null;
    className?: string;
    onDismiss?: () => void;
}

export const AIError: React.FC<AIErrorProps> = ({ message, className = "text-red-400 text-sm mt-2", onDismiss }) => {
    if (!message) return null;

    const isKeyError = message === API_KEY_ERROR || 
                       message.includes("API Key") || 
                       message.includes("An error occurred during processing") ||
                       message.includes("Failed to generate") ||
                       message.includes("Failed to analyze") ||
                       message.includes("Sorry, something went wrong");

    return (
        <div className={`${className} bg-red-900/20 border border-red-500/30 rounded p-2`}>
            {isKeyError ? (
                <div className="flex flex-col items-center gap-1 text-center">
                    <p>AI features require a Google API Key.</p>
                    <p className="text-xs opacity-80">(Google's Free Tier is usually sufficient.)</p>
                    <a 
                        href="https://aistudio.google.com/app/apikey" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="underline font-bold hover:text-red-300 mt-1"
                    >
                        Get one here
                    </a>
                </div>
            ) : (
                <p className="text-center">{message}</p>
            )}
            {onDismiss && (
                <button onClick={onDismiss} className="text-xs underline mt-2 opacity-80 hover:opacity-100 block mx-auto">
                    Dismiss
                </button>
            )}
        </div>
    );
};