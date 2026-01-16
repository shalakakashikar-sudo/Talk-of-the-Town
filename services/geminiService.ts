
import { GoogleGenAI, Type } from "@google/genai";
import { GameMode, GameStats, GameTurnResponse } from "../types";

export class GeminiService {
  private modelName = 'gemini-3-flash-preview';

  private getAI(): GoogleGenAI {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API_KEY is missing. Check your Vercel Environment Variables.");
    }
    return new GoogleGenAI({ apiKey });
  }

  async generateCityImage(): Promise<string | null> {
    try {
      const ai = this.getAI();
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: [{
          parts: [{ text: "A breathtaking, futuristic, cinematic metropolis called Polyglot City. The city is a masterpiece of global architectures—Victorian London bridges meeting neon-drenched futuristic Tokyo skyscrapers. Signs in multiple languages glow softly in the evening mist. Wide shot, ultra-detailed, vibrant lighting." }]
        }]
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
      Objective: Provide an opening scenario where the player is an absolute beginner in this specific context. Describe the atmospheric surroundings vividly and present a clear initial challenge.
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
    `;

    return this.generateTurn(prompt, mode, history);
  }

  private async generateTurn(
    prompt: string,
    mode: GameMode,
    history: { role: string; content: string }[] = []
  ): Promise<GameTurnResponse> {
    const systemInstruction = `
      You are "Talk of the Town," a state-of-the-art English Immersion Game Engine.
      Always respond in JSON. Ensure the "narrative" is descriptive.
      The "tutorNote" should be linguistic feedback.
    `;

    const ai = this.getAI();

    // Correctly map history roles for Gemini API (user -> user, assistant -> model)
    const formattedContents = history.slice(-10).map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    // Add the current prompt
    formattedContents.push({
      role: 'user',
      parts: [{ text: prompt }]
    });

    const response = await ai.models.generateContent({
      model: this.modelName,
      contents: formattedContents,
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

    try {
      return JSON.parse(response.text || '{}') as GameTurnResponse;
    } catch (err) {
      console.error("JSON Parse Error:", response.text);
      throw new Error("Invalid AI response format");
    }
  }
}

export const geminiService = new GeminiService();
