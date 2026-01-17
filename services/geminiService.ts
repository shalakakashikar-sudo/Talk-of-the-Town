
import { GoogleGenAI, Type } from "@google/genai";
import { GameMode, GameStats, GameTurnResponse } from "../types";

export class GeminiService {
  // Use gemini-3-pro-preview for advanced reasoning and language feedback
  private modelName = 'gemini-3-pro-preview';
  private imageModel = 'gemini-2.5-flash-image';

  private getAI() {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API_KEY is not defined. Please ensure your environment variable is named exactly 'API_KEY' and contains a valid Google Gemini key (starts with AIza).");
    }
    return new GoogleGenAI({ apiKey });
  }

  async generateCityImage(): Promise<string | null> {
    try {
      const ai = this.getAI();
      const response = await ai.models.generateContent({
        model: this.imageModel,
        contents: "Cinematic ultra-realistic view of Polyglot City, a neon-lit futuristic metropolis blending Tokyo, London, and New York. Digital billboards in multiple languages. Cyberpunk aesthetic, 8k, rainy street reflections, volumetric lighting."
      });
      
      const parts = response.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    } catch (e) {
      console.error("Visual engine error:", e);
    }
    return null;
  }

  async startNewGame(mode: GameMode): Promise<GameTurnResponse> {
    const prompt = `INITIALIZE NEW RPG SESSION. Setting: Polyglot City. Player Role: ${mode}. Goal: Welcome the player and start the story with an NPC interaction.`;
    return this.generateTurn(prompt);
  }

  async processTurn(
    mode: GameMode,
    stats: GameStats,
    history: { role: string; content: string }[],
    userInput: string
  ): Promise<GameTurnResponse> {
    const prompt = `
      PLAYER INPUT: "${userInput}"
      CURRENT STATS: Level ${stats.level}, Confidence ${stats.confidence}%, Location: ${stats.location}.
      GAME MODE: ${mode}.
      
      RULES:
      1. Provide a narrative response.
      2. Provide linguistic feedback (tutorNote).
      3. Increase confidence by 3-7% for good English.
      4. If user English is poor, explain why in tutorNote and NPC may react with confusion.
    `;
    return this.generateTurn(prompt, history);
  }

  private async generateTurn(
    prompt: string,
    history: { role: string; content: string }[] = []
  ): Promise<GameTurnResponse> {
    const ai = this.getAI();

    const systemInstruction = `
      You are the "Talk of the Town" Game Engine. You simulate a high-fidelity English learning RPG.
      Respond ONLY with a valid JSON object.
      Schema:
      {
        "narrative": "Story text and NPC dialogue",
        "tutorNote": "Linguistic feedback or grammar tips",
        "isLevelComplete": boolean,
        "statsUpdate": {
          "confidenceDelta": number,
          "newInventoryItem": "string | null",
          "removedInventoryItem": "string | null",
          "newLocation": "string | null"
        }
      }
    `;

    const contents = history.map(h => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }]
    }));
    contents.push({ role: 'user', parts: [{ text: prompt }] });

    try {
      const response = await ai.models.generateContent({
        model: this.modelName,
        contents: contents as any,
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
      return JSON.parse(text) as GameTurnResponse;
    } catch (err: any) {
      console.error("Neural Link Failure:", err);
      // More descriptive error for the UI
      if (err.message?.includes("API_KEY") || err.message?.includes("401") || err.message?.includes("403")) {
        throw new Error("Neural link authentication failed. Please ensure you are using a valid Google Gemini API Key (starts with AIza). Groq keys are not compatible with this SDK.");
      }
      throw new Error("The city's mainframe is unresponsive. Please try your request again.");
    }
  }
}

export const geminiService = new GeminiService();
