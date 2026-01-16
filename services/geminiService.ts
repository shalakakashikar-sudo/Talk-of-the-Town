
import { GoogleGenAI, Type } from "@google/genai";
import { GameMode, GameStats, GameTurnResponse } from "../types";

const API_KEY = process.env.API_KEY;

export class GeminiService {
  private ai: GoogleGenAI;
  private modelName = 'gemini-3-flash-preview';

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: API_KEY! });
  }

  async generateCityImage(): Promise<string | null> {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: "A breathtaking, futuristic, cinematic metropolis called Polyglot City. The city is a masterpiece of global architectures—Victorian London bridges meeting neon-drenched futuristic Tokyo skyscrapers. Signs in multiple languages glow softly in the evening mist. Wide shot, ultra-detailed, vibrant lighting." }]
        }
      });
      for (const part of response.candidates[0].content.parts) {
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
      
      Response must be in JSON format matching the schema.
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

      Rules for Slower Progression:
      1. Confidence Points: Award small increments (+2 to +5) for good English. Deduct (-5 to -10) for significant mistakes.
      2. Level Completion: ONLY set "isLevelComplete" to true if the player has reached 100% confidence AND has completed at least 4-5 meaningful dialogue exchanges in the current scenario.
      3. Feedback: Provide a detailed "Tutor Note" correcting grammar, word choice, and social appropriateness.
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
      Your goal is to guide the user to fluency through a deliberate, slow-burn RPG experience.
      
      Always respond in JSON. Ensure the "narrative" is descriptive and immersive.
      The "tutorNote" should be a linguistic goldmine for the learner.
    `;

    const response = await this.ai.models.generateContent({
      model: this.modelName,
      contents: [
        ...history.slice(-12).map(h => ({ parts: [{ text: h.content }] })),
        { parts: [{ text: prompt }] }
      ],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            narrative: {
              type: Type.STRING,
              description: "The cinematic narrative and NPC dialogue."
            },
            tutorNote: {
              type: Type.STRING,
              description: "Grammar, vocabulary, and register feedback."
            },
            isLevelComplete: {
              type: Type.BOOLEAN,
              description: "Whether the player is ready for the next level."
            },
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

    const result = JSON.parse(response.text);
    return result as GameTurnResponse;
  }
}

export const geminiService = new GeminiService();
