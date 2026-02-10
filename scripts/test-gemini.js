import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.VITE_GEMINI_API_KEY;

console.log("-----------------------------------------");
console.log("Diagnosing Gemini API Connection...");
console.log("API Key Present:", !!apiKey);
if (apiKey) console.log("API Key Preview:", apiKey.substring(0, 5) + "...");

if (!apiKey) {
    console.error("ERROR: NO API KEY FOUND IN .env");
    process.exit(1);
}

const runTest = async () => {
    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        console.log("Attempting simple prompt...");
        const result = await model.generateContent("Say 'Hello Stock Master' if you can hear me.");
        const response = await result.response;
        const text = response.text();

        console.log("SUCCESS! API Response:", text);
    } catch (error) {
        console.error("-----------------------------------------");
        console.error("API CALL FAILED!");
        console.error("Error Name:", error.name);
        console.error("Error Message:", error.message);

        if (error.message.includes("429")) {
            console.error("DIAGNOSIS: Quota Exceeded (429). The API key has hit its rate limit.");
        } else if (error.message.includes("403")) {
            console.error("DIAGNOSIS: Invalid API Key (403). The key is wrong or has no access.");
        } else if (error.message.includes("fetch")) {
            console.error("DIAGNOSIS: Network Error. Check internet connection.");
        }
        console.error("Full Error:", error);
        console.error("-----------------------------------------");
    }
};

runTest();
