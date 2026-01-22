import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { Product, Sale, InventoryInsight } from "../types";

// Note: Using the stable @google/generative-ai library for reliability
const getAIClient = () => {
  // @ts-ignore
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error("API_KEY_MISSING");
  }
  return new GoogleGenerativeAI(apiKey);
};

// --- Local Fallback Logic ---
// --- Local Fallback Logic ---
const generateFallbackInsights = (products: Product[], sales: Sale[]): InventoryInsight => {
  // Enhanced Heuristic Analysis for Profit/Loss
  const lowStock = products.filter(p => p.quantity <= p.minThreshold).map(p => p.name);

  // Calculate top performers by PROFIT, not just quantity
  const productStats = products.map(p => {
    const pSales = sales.filter(s => s.productId === p.id);
    const totalProfit = pSales.reduce((acc, s) => acc + s.profit, 0);
    const totalSold = pSales.reduce((acc, s) => acc + s.quantity, 0);
    return { ...p, totalProfit, totalSold };
  });

  const topProfitItems = [...productStats].sort((a, b) => b.totalProfit - a.totalProfit).slice(0, 3);
  const deadStock = productStats.filter(p => p.totalSold === 0 && p.quantity > 0).slice(0, 3);
  const potentialLostRevenue = deadStock.reduce((acc, p) => acc + (p.quantity * p.sellPrice), 0);

  return {
    analysis: `Standard Mode Analysis: You have ${deadStock.length} items with zero sales, tying up capital. Your top profit driver is ${topProfitItems[0]?.name || 'N/A'}. Optimizing these areas will directly improve your bottom line.`,
    recommendations: [
      deadStock.length > 0 ? `Clear Dead Stock: Run a clearance sale for ${deadStock.map(p => p.name).join(', ')}.` : "Monitor slow-moving items.",
      `Maximize Winners: Increase stock for ${topProfitItems.map(p => p.name).join(', ')} to prevent stockouts.`,
      lowStock.length > 0 ? `Restock Critical: ${lowStock.slice(0, 3).join(", ")}` : "Inventory levels differ from optimal."
    ],
    businessGrowthAdvice: [
      `Loss Prevention: You have potentially ${potentialLostRevenue.toLocaleString()} in revenue stuck in dead stock. Liquidate it.`,
      "Profit Maximization: Bundle high-margin items with fast-selling low-margin ones.",
      "Cost Control: Review supplier prices for your bestsellers to widen the profit gap."
    ],
    riskLevel: potentialLostRevenue > 5000 ? "HIGH" : "MEDIUM" // Dynamic risk based on stuck capital
  };
};

export const getInventoryInsights = async (products: Product[], sales: Sale[]): Promise<InventoryInsight> => {
  try {
    const genAI = getAIClient();
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            analysis: { type: SchemaType.STRING },
            recommendations: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            businessGrowthAdvice: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            riskLevel: { type: SchemaType.STRING }
          },
          required: ["analysis", "recommendations", "businessGrowthAdvice", "riskLevel"]
        }
      }
    });

    const totalStockValue = products.reduce((acc, p) => acc + (p.quantity * p.buyPrice), 0);
    const totalPotentialRevenue = products.reduce((acc, p) => acc + (p.quantity * p.sellPrice), 0);
    const productPerformance = products.map(p => {
      const pSales = sales.filter(s => s.productId === p.id);
      return {
        name: p.name,
        qty: p.quantity,
        buyPrice: p.buyPrice,
        sellPrice: p.sellPrice,
        margin: p.sellPrice - p.buyPrice,
        sold: pSales.reduce((acc, s) => acc + s.quantity, 0),
        totalProfit: pSales.reduce((acc, s) => acc + s.profit, 0)
      };
    });

    const prompt = `
      ACT AS A RETAIL PROFIT EXPERT.
      Your Goal: Provide a ruthless analysis on how to MAXIMIZE PROFIT and DECREASE LOSS.
      
      DATA:
      Total Invested Capital (Stock): ${totalStockValue}
      Total Potential Revenue: ${totalPotentialRevenue}
      Product Performance Table (Name, Qty, Cost, Price, Margin, Sold, Profit): 
      ${JSON.stringify(productPerformance.slice(0, 40))}
      
      REQUIRED OUTPUT:
      1. Analysis: Focus on "Cash Flow" and "Dead Money" (unsold stock).
      2. Recommendations: Specific actions to move dead stock and double down on winners.
      3. Business Growth Advice: Strategic pricing adjustments, bundling, or marketing for PROFIT (not just revenue).
      4. Risk Level: Based on ability to cover costs.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return JSON.parse(response.text());
  } catch (error) {
    console.warn("AI Offline, switching to fallback:", error);
    return generateFallbackInsights(products, sales);
  }
};

export const chatWithAdvisor = async (messages: { role: 'user' | 'model', content: string }[], products: Product[], sales: Sale[]): Promise<string> => {
  try {
    const genAI = getAIClient();
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Calculate top movers for context
    const topProducts = products
      .map(p => ({
        name: p.name,
        profit: p.sellPrice - p.buyPrice,
        stock: p.quantity
      }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5);

    const context = `
      You are a Smart AI Business Assistant for "Stock Master".
      
      CORE DIRECTIVES:
      1. **LANGUAGE ADAPTABILITY**: You MUST detect the language of the user's message and RESPOND IN THE EXACT SAME LANGUAGE. (e.g., User: "Habari?" -> You: "Nzuri! Naitwa..."). This is critical.
      2. **SCOPE**: You can answer ANY question related to business, not just about this shop. (e.g., Marketing theories, general accounting, hiring tips).
      3. **DATA AWARENESS**: You have access to the shop's live data (below). Use it to give specific examples if the user asks about *their* shop.
      
      Shop Data Preview:
      - Top Profitable Items: ${JSON.stringify(topProducts)}
      - Active Products: ${products.length}
      - Total Sales History: ${sales.length}
      
      Be professional, concise, and helpful in the user's chosen language.
    `;

    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: context }] },
        { role: 'model', parts: [{ text: "Understood. I will listen to the user's language and answer any business question they have, using the shop data when needed." }] }
      ]
    });

    const lastMsg = messages[messages.length - 1].content;
    const result = await chat.sendMessage(lastMsg);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.warn("AI Chat Offline, using fallback");

    // Smart Fallback: Detect intent/language locally
    const lastMsg = messages[messages.length - 1].content.toLowerCase();

    // 1. Swahili Detection
    if (lastMsg.includes('habari') || lastMsg.includes('mambo') || lastMsg.includes('vipi') || lastMsg.includes('shikamoo')) {
      return "Nzuri! Samahani, mfumo wangu wa AI umepumzika kwa muda (Daily Limit Limit). \n\nKwa sasa, naweza kukushauri: Angalia bidhaa zako zinazotoka haraka na uhakikishe hazijaisha dukani.";
    }

    // 2. English Greetings
    if (lastMsg.includes('hello') || lastMsg.includes('hi') || lastMsg.includes('hey')) {
      return "Hello! I am currently in 'Standard Mode' due to daily limits.\n\nQuick Tip: Check your top-selling items and ensure they are fully stocked to maximize profit today.";
    }

    // 3. General Fallback (Bilingual)
    return "System Note / Taarifa ya Mfumo:\n\nMy AI brain is recharging (Daily Limit Reached). I will be fully smart again tomorrow!\n\nUbongo wangu wa AI umepumzika kwa leo. Kesho nitakuwa hewani kama kawaida!";
  }
};
