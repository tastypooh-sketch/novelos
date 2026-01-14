import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

export const API_KEY_ERROR = "AI features require a configured API Key in the environment.";

export const hasAPIKey = () => {
    const envKey = process.env.API_KEY; 
    return !!(envKey && envKey !== 'undefined' && envKey !== '');
};

export const getAI = () => {
    const envKey = process.env.API_KEY; 

    if (!envKey || envKey === 'undefined' || envKey === '') {
        console.warn("Novelos: No API Key found in environment.");
        // We initialize with a placeholder to prevent immediate crashes, 
        // though calls will fail until a key is present.
        return new GoogleGenAI({ apiKey: "REPLACE_WITH_VALID_KEY" }); 
    }

    if (!aiInstance) {
        aiInstance = new GoogleGenAI({ apiKey: envKey });
    }

    return aiInstance;
};
