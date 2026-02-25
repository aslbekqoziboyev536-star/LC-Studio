import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { MODEL_CHAT, MODEL_IMAGE, SYSTEM_INSTRUCTION_CHAT } from "../constants";

// Initialize the API client
// Ideally this should be outside to avoid re-init, but we need to ensure process.env is ready if it were dynamic (here it is static)
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Creates a chat session with the default model.
 */
export const createChatSession = (): Chat => {
  return ai.chats.create({
    model: MODEL_CHAT,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION_CHAT,
    },
  });
};

/**
 * Helper to convert File to Base64
 */
export const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve({
        inlineData: {
          data: base64String,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Generates an image using the Gemini 2.5 Flash Image model.
 * Note: The model returns the image as inline data in the response parts.
 */
export const generateImageFromText = async (prompt: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_IMAGE,
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
        },
      },
    });

    // Extract image from response
    // The response candidates content parts will contain the image
    const parts = response.candidates?.[0]?.content?.parts;
    
    if (parts) {
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        }
      }
    }
    
    throw new Error("No image data found in response");
  } catch (error) {
    console.error("Image generation error:", error);
    throw error;
  }
};

/**
 * Generates text content (one-off)
 */
export const generateTextContent = async (prompt: string, model: string = MODEL_CHAT): Promise<string> => {
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: model,
        contents: prompt
    });
    return response.text || "No response generated.";
}
