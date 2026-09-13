import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.warn("WARNING: GEMINI_API_KEY is not set in environment variables. AI features will not be available.");
  }

  const ai = new GoogleGenAI({
    apiKey: apiKey || 'NO_API_KEY_PROVIDED',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.post("/api/forecast", async (req, res) => {
    try {
      const { sales, products } = req.body;

      if (!sales || !Array.isArray(sales) || sales.length === 0) {
        return res.json({ forecast: [] });
      }

      // Group sales by day for the last 30 days
      const last30Days = Array.from({ length: 30 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (29 - i));
        return d.toISOString().split('T')[0];
      });

      const dailySales = last30Days.map(date => {
        const count = sales.filter(s => {
          if (!s.timestamp) return false;
          try {
            const ts = s.timestamp._seconds ? new Date(s.timestamp._seconds * 1000) : new Date(s.timestamp);
            return ts.toISOString().split('T')[0] === date;
          } catch (e) {
            return false;
          }
        }).reduce((acc, curr) => acc + curr.quantity, 0);
        return { date, sales: count };
      });

      if (!apiKey) {
        console.log("No API Key - Using statistical fallback for forecast");
        // Simple statistical fallback: Average of last 7 days with some random variation
        const recentSales = dailySales.slice(-7).map(d => d.sales);
        const avgRecent = recentSales.reduce((a, b) => a + b, 0) / (recentSales.length || 1);
        
        const fallbackForecast = Array.from({ length: 30 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() + (i + 1));
          // Add some seasonal variation and noise
          const variation = Math.sin(i / 7 * Math.PI) * 0.2; // weekly cycle
          const noise = (Math.random() - 0.5) * 0.1;
          const predictedSales = Math.max(0, Math.round(avgRecent * (1 + variation + noise)));
          
          return {
            date: d.toISOString().split('T')[0],
            predictedSales
          };
        });

        return res.json({ 
          forecast: fallbackForecast,
          isFallback: true,
          message: "Saadaashani waa mid ku meel gaar ah (Statistical). Si aad u hesho saadaasha AI-da, fadlan geli GEMINI_API_KEY."
        });
      }

      const prompt = `Analyze the following daily sales data for the last 30 days and predict the demand (number of units expected to be sold) for the NEXT 30 days.
      
      Historical Sales Data:
      ${JSON.stringify(dailySales)}
      
      Products List for context:
      ${JSON.stringify(products.map((p: any) => ({ name: p.name, category: p.category })))}

      Provide a 30-day forecast. Return the data in a JSON array where each object has "date" (YYYY-MM-DD) and "predictedSales" (number). 
      The dates should start from tomorrow.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                date: { type: Type.STRING },
                predictedSales: { type: Type.NUMBER }
              },
              required: ["date", "predictedSales"]
            }
          }
        }
      });

      const forecast = JSON.parse(response.text);
      res.json({ forecast });
    } catch (error: any) {
      console.error("Forecast Error:", error);
      res.status(500).json({ 
        error: error.message || "Failed to generate forecast",
        details: process.env.NODE_ENV !== 'production' ? error.stack : undefined
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
