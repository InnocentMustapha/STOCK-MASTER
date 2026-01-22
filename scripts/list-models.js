
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.VITE_GEMINI_API_KEY;

async function listModels() {
    const ai = new GoogleGenAI({ apiKey });

    try {
        const models = await ai.models.list();
        console.log("Available Models:");
        models.forEach(m => console.log(`- ${m.name} (supports: ${m.supportedGenerationMethods})`));
    } catch (error) {
        console.error("❌ Failed to list models:", error.message);
    }
}

listModels();
