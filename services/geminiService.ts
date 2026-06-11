import { GoogleGenAI } from "@google/genai";
import { Product, Sale } from '../types';

const getAiInstance = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API Key is missing for Gemini");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generateBusinessInsight = async (products: Product[], recentSales: Sale[], lowStockThreshold: number = 10): Promise<string> => {
  const ai = getAiInstance();
  if (!ai) return "API açarı tapılmadı. Zəhmət olmasa konfiqurasiyanı yoxlayın.";

  // Prepare a summary of data to send to the model
  const lowStockItems = products.filter(p => p.stock < lowStockThreshold).map(p => `${p.name} (${p.stock} ${p.unit})`).join(", ");
  const totalRevenue = recentSales.reduce((acc, s) => acc + s.total, 0);
  
  const prompt = `
    Sən bir tikinti materialları mağazasının ağıllı ERP məsləhətçisisən.
    Aşağıdakı məlumatlara əsasən mağaza müdirinə qısa, konkret biznes məsləhətləri və təhlil ver (Azərbaycan dilində).
    
    Vəziyyət:
    - Kritik az qalan mallar (Limit: ${lowStockThreshold}): ${lowStockItems || "Yoxdur"}
    - Son satışların ümumi dövriyyəsi: ${totalRevenue} AZN
    - Ümumi məhsul çeşidi sayı: ${products.length}
    - Son satış əməliyyatlarının sayı: ${recentSales.length}

    Zəhmət olmasa:
    1. Satışları artırmaq üçün nə etmək olar?
    2. Anbar vəziyyəti ilə bağlı xəbərdarlıq et.
    3. Ümumi motivasiya verici bir cümlə yaz.
    Cavabı formatlı (Markdown) şəkildə ver.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 } 
      }
    });
    return response.text || "Təhlil alına bilmədi.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Süni intellekt hazırda cavab verə bilmir. Zəhmət olmasa bir az sonra yoxlayın.";
  }
};