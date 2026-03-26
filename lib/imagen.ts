import { GoogleGenAI } from "@google/genai";
import { put } from "@vercel/blob";

let _ai: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!_ai) {
    _ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY! });
  }
  return _ai;
}

// Track last generation error for better debugging
export let lastImageGenError: string | null = null;

// ─── Image Generation ────────────────────────────────────────────────────────

export async function generatePostImage(
  imagePrompt: string,
  postId: string,
  industry?: string
): Promise<string | null> {
  lastImageGenError = null;

  // ONLY use the imagePrompt (scene/metaphor description) — never pass post
  // title or body text, as image models will attempt to render any text they see.
  const sceneDescription = imagePrompt || "Professional abstract business concept";

  const prompt = `${sceneDescription}

Style: Professional, polished, visually compelling. Cinematic composition, natural lighting, professional color grading.
Industry context: ${industry || "business"}.
The image must contain ZERO text — no words, letters, numbers, labels, captions, watermarks, or typography of any kind.
Square format (1:1). High quality, suitable for LinkedIn.`;

  console.log(`[Imagen] Scene: ${sceneDescription.slice(0, 80)}...`);

  // Method 1: Gemini native image generation (most reliable)
  try {
    const response = await getAI().models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: prompt,
      config: { responseModalities: ["IMAGE", "TEXT"] },
    });

    const parts = response.candidates?.[0]?.content?.parts ?? [];
    for (const part of parts) {
      if (part.inlineData?.mimeType?.startsWith("image/") && part.inlineData.data) {
        const buffer = Buffer.from(part.inlineData.data, "base64");
        const ext = part.inlineData.mimeType === "image/jpeg" ? "jpg" : "png";
        const contentType = part.inlineData.mimeType === "image/jpeg" ? "image/jpeg" : "image/png";
        const filename = `post-${postId}-${Date.now()}.${ext}`;
        const blob = await put(`generated/${filename}`, buffer, {
          access: "public",
          contentType,
        });
        console.log("[Imagen] Generated via Gemini 2.0 Flash Exp:", blob.url);
        return blob.url;
      }
    }
    console.warn("[Imagen] Gemini 2.0 Flash Exp returned no image data, trying fallback");
  } catch (err) {
    lastImageGenError = `Gemini Flash Exp: ${(err as Error).message}`;
    console.error("[Imagen] Gemini 2.0 Flash Exp failed:", (err as Error).message);
  }

  // Method 2: Imagen 3.0 (stable)
  try {
    const response = await getAI().models.generateImages({
      model: "imagen-3.0-generate-001",
      prompt,
      config: {
        numberOfImages: 1,
        aspectRatio: "1:1",
      },
    });

    const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
    if (imageBytes) {
      const buffer = Buffer.from(imageBytes, "base64");
      const filename = `post-${postId}-${Date.now()}.png`;
      const blob = await put(`generated/${filename}`, buffer, {
        access: "public",
        contentType: "image/png",
      });
      console.log("[Imagen] Generated via Imagen 3.0:", blob.url);
      return blob.url;
    }
    console.warn("[Imagen] Imagen 3.0 returned no image bytes, trying fallback");
  } catch (err) {
    lastImageGenError = `Imagen 3.0: ${(err as Error).message}`;
    console.error("[Imagen] Imagen 3.0 failed:", (err as Error).message);
  }

  // Method 3: Gemini 2.5 Flash native image gen
  try {
    const response = await getAI().models.generateContent({
      model: "gemini-2.5-flash-preview-image-generation",
      contents: prompt,
      config: { responseModalities: ["IMAGE", "TEXT"] },
    });

    const parts = response.candidates?.[0]?.content?.parts ?? [];
    for (const part of parts) {
      if (part.inlineData?.mimeType?.startsWith("image/") && part.inlineData.data) {
        const buffer = Buffer.from(part.inlineData.data, "base64");
        const ext = part.inlineData.mimeType === "image/jpeg" ? "jpg" : "png";
        const contentType = part.inlineData.mimeType === "image/jpeg" ? "image/jpeg" : "image/png";
        const filename = `post-${postId}-${Date.now()}.${ext}`;
        const blob = await put(`generated/${filename}`, buffer, {
          access: "public",
          contentType,
        });
        console.log("[Imagen] Generated via Gemini 2.5 Flash:", blob.url);
        return blob.url;
      }
    }
    console.warn("[Imagen] Gemini 2.5 Flash returned no image data");
  } catch (err) {
    lastImageGenError = `All methods failed. Last: ${(err as Error).message}`;
    console.error("[Imagen] All image generation methods failed:", (err as Error).message);
  }

  return null;
}

// ─── Image Prompt Builder ────────────────────────────────────────────────────

export function buildImagePrompt(
  postTitle: string,
  postType: string,
  industry: string
): string {
  // This is a fallback when no imagePrompt exists on the post.
  // Describes a visual concept — no actual post text is included.
  return `Professional abstract visual metaphor representing the concept of ${postType} content in the ${industry} industry.
Clean, modern composition with symbolic imagery. No text, no words, no letters, no numbers anywhere in the image.
Square format (1:1). High quality, suitable for LinkedIn.`;
}
