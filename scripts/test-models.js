
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.VITE_GEMINI_API_KEY;

async function testModels() {
    const ai = new GoogleGenAI({ apiKey });
    const candidates = ['gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-pro', 'gemini-2.0-flash-exp'];

    for (const model of candidates) {
        console.log(`\n--- Testing Model: ${model} ---`);
        try {
            const response = await ai.models.generateContent({
                model: model,
                contents: "Hello"
            });
            console.log(`✅ Success with ${model}! Response:`, response.text);
            return; // Stop if we find one that works
        } catch (error) {
            console.log(`❌ Failed with ${model}:`, error.message);
        }
    }
}

testModels();
