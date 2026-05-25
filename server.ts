import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// API route first
app.post("/api/oracle", async (req, res) => {
  try {
    const { speechText } = req.body;
    if (!speechText || typeof speechText !== "string" || !speechText.trim()) {
      return res.status(400).json({ error: "Missing morning thoughts text proclamation!" });
    }

    const systemInstruction = `You are the Royal Oracle, a wise fantasy advisor in a medieval RPG kingdom. The user has just spoken their morning thoughts. Your job is to: (1) Extract 1–3 clear action items from what they said and format them as royal decrees. (2) Identify if any recurring stressor or distraction was mentioned. (3) Give one short motivational line in a regal, fantasy tone. Keep your entire response under 120 words. Format strictly as JSON with this exact key structure: { "decrees": string[], "stressor": string | null, "blessing": string }`;

    const userPrompt = `The traveler's morning proclamation is: "${speechText}"`;

    // 1. Try Claude if ANTHROPIC_API_KEY is configured
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        console.log("Oracle routing request via Claude API...");
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": process.env.ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 500,
            system: systemInstruction,
            messages: [
              {
                role: "user",
                content: userPrompt,
              },
            ],
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const contentText = data.content?.[0]?.text || "";
          const jsonMatch = contentText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (Array.isArray(parsed.decrees) && typeof parsed.blessing === "string") {
              return res.json(parsed);
            }
          }
        } else {
          console.warn("Claude API returned non-200 status:", response.status);
        }
      } catch (e) {
        console.error("Claude API execution failed, falling back to Gemini:", e);
      }
    }

    // 2. Fallback / Default: Gemini (Native workspace environment API key)
    if (process.env.GEMINI_API_KEY) {
      console.log("Oracle routing request via Gemini API...");
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: userPrompt,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              decrees: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "1-3 clear action items formatted as royal decrees (e.g., 'Thou shalt read the history scroll today.')",
              },
              stressor: {
                type: Type.STRING,
                description: "The recurring stressor/distraction mentioned, or null if none",
              },
              blessing: {
                type: Type.STRING,
                description: "Regal fantasy encouragement/blessing",
              },
            },
            required: ["decrees", "stressor", "blessing"],
          },
        },
      });

      const contentText = response.text || "";
      const jsonMatch = contentText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return res.json(parsed);
      } else {
        const parsed = JSON.parse(contentText);
        return res.json(parsed);
      }
    }

    throw new Error("No active AI API keys configured inside the server settings!");
  } catch (err) {
    console.error("Oracle execution failure:", err);
    return res.status(500).json({ error: "The Oracle's vision is clouded today. Return tomorrow." });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}

startServer();
