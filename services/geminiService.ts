
import { GoogleGenAI, Type } from "@google/genai";
import { GameMode, GameStats, GameTurnResponse } from "../types";

export class GeminiService {
  // Guidelines: Use 'gemini-3-pro-preview' for complex reasoning and storytelling tasks
  private modelName = 'gemini-3-pro-preview';
  private imageModel = 'gemini-2.5-flash-image';

  private getAI() {
    // In Vercel, the env var is accessed via process.env.API_KEY
    // We check if it exists and provide a highly descriptive error for the specific Vercel workflow
    const apiKey = process.env.API_KEY;
    
    if (!apiKey || apiKey.trim() === "") {
      throw new Error(
        "Neural Link Offline: API_KEY is missing. " +
        "If you just added it to Vercel, you MUST trigger a new 'Redeploy' for the changes to take effect."
      );
    }

    if (apiKey.startsWith('gsk_')) {
      throw new Error("Neural Link Conflict: A Groq key was detected. This game requires a Google Gemini key (starting with 'AIza').");
    }

    return new GoogleGenAI({ apiKey });
  }

  async generateCityImage(): Promise<string | null> {
    try {
      const ai = this.getAI();
      const response = await ai.models.generateContent({
        model: this.imageModel,
        contents: "Cinematic 8k wide shot of Polyglot City, a sprawling futuristic metropolis. Neon billboards in various languages. Fusion of London and Tokyo architecture. Deep blue and neon magenta lighting."
      });
      
      const parts = response.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    } catch (e) {
      console.warn("Visual generator failed:", e);
    }
    return null;
  }

  async startNewGame(mode: GameMode): Promise<GameTurnResponse> {
    const prompt = `INITIALIZE RPG SESSION. Mode: ${mode}. Set the scene in Polyglot City and introduce an NPC with a question or task for the player.`;
    return this.generateTurn(prompt);
  }

  async processTurn(
    mode: GameMode,
    stats: GameStats,
    history: { role: string; content: string }[],
    userInput: string
  ): Promise<GameTurnResponse> {
    const prompt = `
      USER INPUT: "${userInput}"
      PLAYER STATE: Level ${stats.level}, Confidence ${stats.confidence}%, Mode: ${mode}.
      
      TASKS:
      1. React to the player's input naturally within the story.
      2. Analyze their English grammar/fluency and provide constructive feedback in tutorNote.
      3. Update confidence (+/- 5%) based on language quality.
    `;
    return this.generateTurn(prompt, history);
  }

  private async generateTurn(
    prompt: string,
    history: { role: string; content: string }[] = []
  ): Promise<GameTurnResponse> {
    const ai = this.getAI();

    const systemInstruction = `
      You are the "Talk of the Town" Simulation Engine. You facilitate high-immersion English language learning RPGs.
      Always respond in strict JSON format.
      
      JSON SCHEMA:
      {
        "narrative": "Cinematic story text including NPC dialogue",
        "tutorNote": "Expert linguistic feedback: correct mistakes, suggest better idioms, or praise natural phrasing.",
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

      const text = response.text || "{}";
      return JSON.parse(text) as GameTurnResponse;
    } catch (err: any) {
      console.error("Neural Link Error:", err);
      if (err.message?.includes("API_KEY")) throw err;
      throw new Error("Communication relay failure. The city's neural net is unstable. Please try again.");
    }
  }
}

export const geminiService = new GeminiService();
