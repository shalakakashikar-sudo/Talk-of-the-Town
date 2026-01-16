
import { GoogleGenAI, Type } from "@google/genai";
import { GameMode, GameStats, GameTurnResponse } from "../types";

export class GeminiService {
  // Use gemini-3-pro-preview for advanced reasoning and complex simulation tasks
  private modelName = 'gemini-3-pro-preview';

  async generateCityImage(): Promise<string | null> {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
      console.error("City image generation failed", e);
    }
    return null;
  }

  async startNewGame(mode: GameMode): Promise<GameTurnResponse> {
    const prompt = `
      Start a new immersive English learning RPG in Polyglot City.
      Mode: ${mode}.
      Initial State: Level 1, Confidence 0%.
      Objective: Provide an opening scenario where the player is an absolute beginner in this specific context. Describe the atmospheric surroundings vividly and present a clear initial challenge.
      Return raw JSON only.
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
      
      Current Game State:
      Level: ${stats.level}
      Confidence: ${stats.confidence}%
      Inventory: ${stats.inventory.join(', ') || 'None'}
      Location: ${stats.location}
      Mode: ${mode}

      Rules for Progression:
      1. Confidence: Award small increments (+2 to +5) for good English. Deduct (-5 to -10) for significant mistakes.
      2. Level Completion: Set "isLevelComplete" to true ONLY if confidence reaches 100% and the current task is fulfilled.
      3. Feedback: Provide a detailed "Tutor Note" correcting grammar and register.
      Return raw JSON only.
    `;

    return this.generateTurn(prompt, mode, history);
  }

  private cleanJsonResponse(text: string): string {
    // Aggressive cleaning to ensure JSON parse succeeds even if model includes markdown
    return text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
  }

  private async generateTurn(
    prompt: string,
    mode: GameMode,
    history: { role: string; content: string }[] = []
  ): Promise<GameTurnResponse> {
    // Create instance inside method to ensure it always picks up injected environment variables
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const systemInstruction = `
      You are "Talk of the Town," a state-of-the-art English Immersion Game Engine.
      Respond ONLY in raw JSON format matching the requested schema.
      The narrative should be immersive, descriptive, and atmospheric.
      The tutorNote should be constructive linguistic feedback on the player's English usage.
    `;

    // Flatten history into a single prompt block to avoid role-alternation validation issues in the SDK
    const historyText = history.length > 0 
      ? "CONVERSATION HISTORY:\n" + history.map(h => `${h.role === 'assistant' ? 'NPC' : 'Player'}: ${h.content}`).join('\n') + "\n\n"
      : "";

    const finalPrompt = `${historyText}CURRENT CHALLENGE:\n${prompt}`;

    try {
      const response = await ai.models.generateContent({
        model: this.modelName,
        contents: [{ role: 'user', parts: [{ text: finalPrompt }] }],
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

      const rawText = response.text || '';
      const cleanedText = this.cleanJsonResponse(rawText);
      return JSON.parse(cleanedText) as GameTurnResponse;
    } catch (err: any) {
      console.error("Gemini Core Communication Error:", err);
      throw err;
    }
  }
}

export const geminiService = new GeminiService();
