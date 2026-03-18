import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

export function getGeminiModel(modelName = "gemini-2.5-flash") {
  return genAI.getGenerativeModel({ model: modelName });
}

export async function generateText(prompt: string): Promise<string> {
  const model = getGeminiModel();
  const result = await model.generateContent(prompt);
  return result.response.text();
}

export async function generateTextWithConfig(
  prompt: string,
  config: { temperature?: number } = {}
): Promise<string> {
  const model = getGeminiModel();
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: config.temperature ?? 1.0 },
  });
  return result.response.text();
}

export function parseJSON<T>(text: string): T {
  // Strip markdown code fences if present
  const cleaned = text
    .replace(/^```json\n?/, "")
    .replace(/^```\n?/, "")
    .replace(/\n?```$/, "")
    .trim();
  return JSON.parse(cleaned) as T;
}
