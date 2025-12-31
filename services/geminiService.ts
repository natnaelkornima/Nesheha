import { GoogleGenAI, Chat, Type } from "@google/genai";
import { ChatMessage } from "../types";

export const getAIClient = () => {
  if (!process.env.API_KEY) {
    console.warn("API Key missing");
    return null;
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// System instruction for the "Nesha" persona
const SYSTEM_INSTRUCTION = `
You are 'Nesha' (ነሻ), a wise, spiritual, and calm Ethiopian daily companion. 
Your purpose is to provide advice, guidance, and habit motivation.
Tone: Respectful, humble, calm, and spiritually grounded.
Values: Align with Ethiopian Orthodox Tewahedo Church teachings when moral/spiritual questions arise. Encourage patience (tigist), humility (tihitina), prayer (tselot), and good deeds.
Avoid: Extremism, political controversy, or judgment.
Language: Respond primarily in Amharic unless the user asks in English. If the user input is in English, you can reply in English but maintain the Ethiopian cultural flavor.
Formatting: Keep responses concise and readable on a mobile screen.
`;

export const generateDailyAdvice = async (lang: 'am' | 'en'): Promise<string> => {
  const ai = getAIClient();
  if (!ai) return lang === 'am' 
    ? "የዛሬ ምክር: ትዕግስት የጥበብ መጀመሪያ ነው። (AI አልተገናኘም)" 
    : "Daily Wisdom: Patience is the beginning of wisdom. (AI Offline)";

  try {
    const prompt = lang === 'am' 
      ? "Give me a short, powerful piece of life wisdom or spiritual advice in Amharic. Max 2 sentences."
      : "Give me a short, powerful piece of life wisdom or spiritual advice in English, rooted in Ethiopian values. Max 2 sentences.";

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      }
    });
    
    return response.text || "";
  } catch (error) {
    console.error("Gemini Error:", error);
    return lang === 'am' ? "ምክር ማምጣት አልተቻለም።" : "Could not fetch advice.";
  }
};

export const createChatSession = (): Chat | null => {
  const ai = getAIClient();
  if (!ai) return null;

  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
    }
  });
};

export const sendMessageToAI = async (chat: Chat, message: string): Promise<string> => {
  try {
    const response = await chat.sendMessage({ message });
    return response.text || "";
  } catch (error) {
    console.error("Chat Error:", error);
    return "ይቅርታ፣ አሁን መልስ መስጠት አልችልም። (Error)";
  }
};

// New function for the Analyzer feature
export interface AnalyzedHabit {
  title: string;
  advice: string;
  frequency: 'daily' | 'weekly';
}

export const analyzeUserInput = async (input: string, lang: 'am' | 'en'): Promise<AnalyzedHabit[]> => {
  const ai = getAIClient();
  if (!ai) return [];

  const prompt = lang === 'am'
    ? `The user wants to overcome: "${input}". Provide 3 distinct, spiritual, and practical habits/actions to help them. Return in JSON.`
    : `The user wants to overcome: "${input}". Provide 3 distinct, spiritual, and practical habits/actions to help them. Return in JSON.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "You are a spiritual habit coach. Analyze the user's struggle and suggest 3 concrete habits. Output MUST be a JSON array.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "Short title of the habit (max 4 words)" },
              advice: { type: Type.STRING, description: "Why this helps (1 sentence)" },
              frequency: { type: Type.STRING, enum: ["daily", "weekly"] }
            },
            required: ["title", "advice", "frequency"]
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as AnalyzedHabit[];
    }
    return [];
  } catch (error) {
    console.error("Analyzer Error:", error);
    return [];
  }
};