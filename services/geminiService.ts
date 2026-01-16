
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
          parts: [{ text: "A breathtaking, futuristic metropolis called Polyglot City. The city is a blend of global architectures—European cobblestone streets meeting neon-lit Tokyo skyscrapers. Signs in dozens of different languages (English, Kanji, Arabic, etc.) glow softly against a twilight sky. Cinematic, wide shot, vibrant colors, digital painting style." }]
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
      Start a new immersive English learning RPG game in Polyglot City.
      Mode: ${mode}.
      Objective: Provide an opening scenario (Level 1) relevant to this mode. Describe the environment and a challenge requiring user dialogue.
      
      Response must be in JSON format matching the schema provided.
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
      Inventory: ${stats.inventory.join(', ') || 'Empty'}
      Location: ${stats.location}
      Mode: ${mode}

      Rules:
      1. Analyze the player's English (grammar, vocab, tone appropriateness for ${mode} at Level ${stats.level}).
      2. If good, progress the story. If poor, create a misunderstanding.
      3. CRITERIA FOR LEVEL COMPLETION: If the player has successfully resolved the current dialogue task (e.g. bought the item, finished the interview phase, or successfully handled the crisis moment) with a confidence level of 70% or higher, set "isLevelComplete" to true.
      4. If "isLevelComplete" is true, describe the transition to a NEW, harder location for Level ${stats.level + 1}.
      5. Provide a "Tutor Note" correcting mistakes.
    `;

    return this.generateTurn(prompt, mode, history);
  }

  private async generateTurn(
    prompt: string,
    mode: GameMode,
    history: { role: string; content: string }[] = []
  ): Promise<GameTurnResponse> {
    const systemInstruction = `
      You are "Talk of the Town," a world-class English RPG Game Engine.
      Your tone adapts to the selected mode.
      Level progression (1-5) increases complexity of vocabulary and sentence structure.
      
      "isLevelComplete" should ONLY be true when a specific interaction is successfully finalized.
      Always respond in the specified JSON schema.
    `;

    const response = await this.ai.models.generateContent({
      model: this.modelName,
      contents: [
        ...history.slice(-10).map(h => ({ parts: [{ text: h.content }] })),
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
              description: "The NPC dialogue and descriptive narrative."
            },
            tutorNote: {
              type: Type.STRING,
              description: "English learning feedback and corrections."
            },
            isLevelComplete: {
              type: Type.BOOLEAN,
              description: "Whether the player has finished the current scenario's goal."
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
