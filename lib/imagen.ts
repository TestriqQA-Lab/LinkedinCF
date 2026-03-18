import { GoogleGenAI } from "@google/genai";
import { put } from "@vercel/blob";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY! });

// ─── Image Generation ────────────────────────────────────────────────────────

export async function generatePostImage(
  imagePrompt: string,
  postId: string,
  industry?: string
): Promise<string | null> {
  // ONLY use the imagePrompt (scene/metaphor description) — never pass post
  // title or body text, as image models will attempt to render any text they see.
  const sceneDescription = imagePrompt || "Professional abstract business concept";

  const prompt = `${sceneDescription}

Style: Professional, polished, visually compelling. Cinematic composition, natural lighting, professional color grading.
Industry context: ${industry || "business"}.
The image must contain ZERO text — no words, letters, numbers, labels, captions, watermarks, or typography of any kind.
Square format (1:1). High quality, suitable for LinkedIn.`;

  console.log(`[Imagen] Scene: ${sceneDescription.slice(0, 80)}...`);

  // Try imagen-4.0-fast-generate-001 ($0.02/image — cheapest option)
  try {
    const response = await ai.models.generateImages({
      model: "imagen-4.0-fast-generate-001",
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
      console.log("[Imagen] Generated via Imagen 4.0 Fast:", blob.url);
      return blob.url;
    }
    console.warn("[Imagen] Imagen 4.0 Fast returned no image bytes, trying fallback");
  } catch (err) {
    console.error("[Imagen] Imagen 4.0 Fast failed:", (err as Error).message);
  }

  // Fallback: imagen-3.0-generate-002
  try {
    const response = await ai.models.generateImages({
      model: "imagen-3.0-generate-002",
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
    console.warn("[Imagen] Imagen 3.0 returned no image bytes");
  } catch (err) {
    console.error("[Imagen] Imagen 3.0 failed:", (err as Error).message);
  }

  // Fallback: gemini-2.0-flash-preview-image-generation via generateContent
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-preview-image-generation",
      contents: prompt,
      config: { responseModalities: ["IMAGE"] },
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
        console.log("[Imagen] Generated via Gemini Flash Image Gen:", blob.url);
        return blob.url;
      }
    }
    console.warn("[Imagen] Gemini Flash Image Gen returned no image data");
  } catch (err) {
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
