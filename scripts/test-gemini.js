
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.VITE_GEMINI_API_KEY;

async function testKey() {
    if (!apiKey) {
        console.error("❌ VITE_GEMINI_API_KEY is not set in .env");
        return;
    }

    console.log("Testing API Key:", apiKey.substring(0, 5) + "...");

    const ai = new GoogleGenAI({ apiKey });

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: "Hello, confirm you can read this message clearly."
        });

        console.log("✅ Success! AI Response:", response.text);
    } catch (error) {
        console.error("❌ API Call Failed:");
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", error.response.data);
        } else {
            console.error(error.message);
        }
    }
}

testKey();
