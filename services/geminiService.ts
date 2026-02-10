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
      model: "gemini-2.0-flash",
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
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Calculate key metrics for context
    const deadStock = products.filter(p => !sales.some(s => s.productId === p.id)).map(p => p.name).slice(0, 10);
    const lowStock = products.filter(p => p.quantity <= p.minThreshold).map(p => p.name).slice(0, 10);
    const totalRevenue = sales.reduce((acc, s) => acc + s.totalPrice, 0);
    const totalProfit = sales.reduce((acc, s) => acc + s.profit, 0);

    // Contextual Data Injection
    const topProducts = products
      .map(p => ({
        name: p.name,
        profit: p.sellPrice - p.buyPrice,
        stock: p.quantity,
        sold: sales.filter(s => s.productId === p.id).reduce((sum, s) => sum + s.quantity, 0)
      }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5);

    const context = `
      You are an EXPERT RETAIL BUSINESS CONSULTANT and AI Assistant for "Stock Master".
      Your name is "Stock Master Advisor".

      YOUR GOAL:
      To help the shop owner MAXIMIZE PROFIT, reduce waste, and grow their business. You are not just a chatbot; you are a business partner.

      CORE DIRECTIVES:
      1. **LANGUAGE ADAPTABILITY**: You MUST detect the language of the user's message and RESPOND IN THE EXACT SAME LANGUAGE. (e.g., User: "Habari?" -> You: "Nzuri! Naitwa...").
      2. **BE PROACTIVE**: Don't just answer the question. Offer *strategic advice* based on the data below.
      3. **USE DATA**: Always reference the specific shop data provided below to back up your advice.
      
      SHOP DATA DASHBOARD:
      - **Financial Health**: Total Revenue: ${totalRevenue.toLocaleString()}, Total Profit: ${totalProfit.toLocaleString()}.
      - **Top Money Makers**: ${JSON.stringify(topProducts.map(p => `${p.name} (Profit/Unit: ${p.profit}, Sold: ${p.sold})`))}
      - **DEAD STOCK (Action Needed)**: ${deadStock.length > 0 ? deadStock.join(', ') : "None! Good job."} (These items have 0 sales. Suggest clearance or bundling).
      - **LOW STOCK ALERT**: ${lowStock.length > 0 ? lowStock.join(', ') : "Inventory levels are healthy."} (Warn the user to restock these).

      BUSINESS PRINCIPLES TO TEACH:
      - **Turnover**: "Stock that sits is money lost." Encourage selling dead stock at cost to free up cash.
      - **Margins**: "Revenue is vanity, Profit is sanity." Focus on high-margin items.
      - **Customer Retention**: Suggest loyalty ideas if asked about growth.
      
      TONE:
      Professional, enthusiastic, wise, and action-oriented. Keep answers concise.
    `;

    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: context }] },
        { role: 'model', parts: [{ text: "Understood. I am ready to act as an Expert Retail Consultant. I will analyze the provided shop data (Dead Stock, Margins, Sales) to give specific, profitable advice in the user's language." }] }
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
