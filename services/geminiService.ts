
import { GoogleGenAI, Type } from "@google/genai";
import { GameMode, GameStats, GameTurnResponse } from "../types";

export class GeminiService {
  private modelName = 'gemini-3-flash-preview';

  private getAI(): GoogleGenAI {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API_KEY environment variable is not set. Please add it to your Vercel project settings.");
    }
    return new GoogleGenAI({ apiKey });
  }

  async generateCityImage(): Promise<string | null> {
    try {
      const ai = this.getAI();
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: "A breathtaking, futuristic, cinematic metropolis called Polyglot City. Victorian London bridges meeting neon Tokyo skyscrapers. Signs in multiple languages glow softly. Wide shot, ultra-detailed, vibrant lighting."
      });
      
      const parts = response.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    } catch (e) {
      console.error("Image generation failed", e);
    }
    return null;
  }

  async startNewGame(mode: GameMode): Promise<GameTurnResponse> {
    const prompt = `
      Start a new immersive English learning RPG in Polyglot City.
      Mode: ${mode}.
      Initial State: Level 1, Confidence 0%.
      Return a JSON response with an opening scenario for an absolute beginner.
    `;

    return this.generateTurn(prompt, mode);
  }

  async processTurn(
    mode: GameMode,
    stats: GameStats,
    history: { role: string; content: string }[],
    userInput: string
  ): Promise<GameTurnResponse> {
    const prompt = `
      The player says: "${userInput}"
      
      State: Level ${stats.level}, Confidence ${stats.confidence}%, Location ${stats.location}.
      Inventory: ${stats.inventory.join(', ') || 'None'}.
      
      Process this turn and return the updated state in JSON.
    `;

    return this.generateTurn(prompt, mode, history);
  }

  private cleanJsonResponse(text: string): string {
    // Aggressively clean markdown and whitespace
    let cleaned = text.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    }
    return cleaned;
  }

  private async generateTurn(
    prompt: string,
    mode: GameMode,
    history: { role: string; content: string }[] = []
  ): Promise<GameTurnResponse> {
    const ai = this.getAI();

    const systemInstruction = `
      You are "Talk of the Town," an English learning RPG engine.
      YOU MUST ONLY RESPOND WITH RAW JSON. DO NOT WRAP IN MARKDOWN.
      Schema: { "narrative": string, "tutorNote": string, "isLevelComplete": boolean, "statsUpdate": { "confidenceDelta": number, "newInventoryItem": string, "removedInventoryItem": string, "newLocation": string } }
    `;

    const historyText = history.length > 0 
      ? "HISTORY:\n" + history.map(h => `${h.role}: ${h.content}`).join('\n') + "\n\n"
      : "";

    const combinedPrompt = `${historyText}TASK:\n${prompt}`;

    try {
      const response = await ai.models.generateContent({
        model: this.modelName,
        contents: combinedPrompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              narrative: { type: Type.STRING },
              tutorNote: { type: Type.STRING },
              isLevelComplete: { type: Type.BOOLEAN },
              statsUpdate: {
                type: Type.OBJECT,
                properties: {
                  confidenceDelta: { type: Type.NUMBER },
                  newInventoryItem: { type: Type.STRING },
                  removedInventoryItem: { type: Type.STRING },
                  newLocation: { type: Type.STRING }
                },
                required: ["confidenceDelta"]
              }
            },
            required: ["narrative", "tutorNote", "statsUpdate"]
          }
        }
      });

      const text = response.text || '';
      const cleaned = this.cleanJsonResponse(text);
      return JSON.parse(cleaned) as GameTurnResponse;
    } catch (err: any) {
      console.error("Gemini Error:", err);
      // Fallback object to prevent UI crash if API fails
      throw new Error(err.message || "Failed to parse response from Polyglot City.");
    }
  }
}

export const geminiService = new GeminiService();
