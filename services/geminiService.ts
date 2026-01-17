import { GoogleGenAI, Type } from "@google/genai";
import { GameMode, GameStats, GameTurnResponse } from "../types";

export class GeminiService {
  // Use 'gemini-3-pro-preview' for advanced reasoning as per guidelines
  private modelName = 'gemini-3-pro-preview';
  private imageModel = 'gemini-2.5-flash-image';

  private getAI() {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.warn("API_KEY is missing from environment variables. Please ensure it is named 'API_KEY' exactly in your Vercel settings.");
    }
    return new GoogleGenAI({ apiKey: apiKey || "" });
  }

  async generateCityImage(): Promise<string | null> {
    try {
      const ai = this.getAI();
      const response = await ai.models.generateContent({
        model: this.imageModel,
        contents: "A breathtaking, futuristic, cinematic metropolis called Polyglot City. Victorian London bridges meeting neon Tokyo skyscrapers. Signs in multiple languages glow softly. Wide shot, ultra-detailed, vibrant lighting."
      });
      
      const parts = response.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    } catch (e) {
      console.error("City image generation failed", e);
    }
    return null;
  }

  async startNewGame(mode: GameMode): Promise<GameTurnResponse> {
    const prompt = `
      Start a new immersive English learning RPG in Polyglot City.
      Mode: ${mode}.
      Initial State: Level 1, Confidence 0%.
      Provide an opening scenario where the player is an absolute beginner in this context. 
      Set the scene vividly.
    `;

    return this.generateTurn(prompt);
  }

  async processTurn(
    mode: GameMode,
    stats: GameStats,
    history: { role: string; content: string }[],
    userInput: string
  ): Promise<GameTurnResponse> {
    const prompt = `
      The player says: "${userInput}"
      
      Game State:
      Level: ${stats.level}
      Confidence: ${stats.confidence}%
      Inventory: ${stats.inventory.join(', ') || 'None'}
      Location: ${stats.location}
      Mode: ${mode}

      Progress Rules:
      - Award +3 to +7 Confidence for natural English.
      - Deduct -5 for significant errors.
      - Set isLevelComplete to true only if they reach 100% confidence and finished the area task.
    `;

    return this.generateTurn(prompt, history);
  }

  private cleanJsonResponse(text: string): string {
    return text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
  }

  private async generateTurn(
    prompt: string,
    history: { role: string; content: string }[] = []
  ): Promise<GameTurnResponse> {
    const ai = this.getAI();

    const systemInstruction = `
      You are "Talk of the Town," a professional English Immersion Game Engine.
      Respond ONLY with a JSON object. No other text.
      JSON Schema:
      {
        "narrative": "the story text and dialogue",
        "tutorNote": "helpful linguistic feedback on the player's English usage",
        "isLevelComplete": boolean,
        "statsUpdate": {
          "confidenceDelta": number,
          "newInventoryItem": "optional string",
          "removedInventoryItem": "optional string",
          "newLocation": "optional string"
        }
      }
    `;

    const historyBlock = history.length > 0 
      ? "CONVERSATION HISTORY:\n" + history.map(h => `${h.role === 'assistant' ? 'NPC' : 'Player'}: ${h.content}`).join('\n') + "\n\n"
      : "";

    const fullPrompt = `${historyBlock}TASK:\n${prompt}`;

    try {
      const response = await ai.models.generateContent({
        model: this.modelName,
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
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
      return JSON.parse(this.cleanJsonResponse(text)) as GameTurnResponse;
    } catch (err: any) {
      console.error("Critical API Error:", err);
      throw new Error(`Polyglot City connection error: ${err.message || "Ensure your environment variable is named 'API_KEY'."}`);
    }
  }
}

export const geminiService = new GeminiService();