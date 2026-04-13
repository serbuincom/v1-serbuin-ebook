import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const generateStep1Problems = async (niche: string, expertise: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Saya ingin membuat ebook di niche "${niche}" dengan keahlian "${expertise}". 
    Identifikasi 5 masalah yang paling sering dirasakan orang banyak di niche ini yang memiliki potensi cuan tinggi jika solusinya disediakan dalam bentuk ebook.
    Berikan output dalam format JSON array of objects dengan properti: "id", "problem", "reason_cuan", "potential_solution_brief".`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            problem: { type: Type.STRING },
            reason_cuan: { type: Type.STRING },
            potential_solution_brief: { type: Type.STRING }
          },
          required: ["id", "problem", "reason_cuan", "potential_solution_brief"]
        }
      }
    }
  });
  return JSON.parse(response.text);
};

export const generateStep2TargetMarket = async (problem: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Berdasarkan masalah ini: "${problem}", tentukan target market yang paling spesifik dan ideal.
    Berikan output dalam format JSON object dengan properti: "demographics", "psychographics", "pain_points", "buying_power".`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          demographics: { type: Type.STRING },
          psychographics: { type: Type.STRING },
          pain_points: { type: Type.STRING },
          buying_power: { type: Type.STRING }
        },
        required: ["demographics", "psychographics", "pain_points", "buying_power"]
      }
    }
  });
  return JSON.parse(response.text);
};

export const generateStep3Solution = async (problem: string, targetMarket: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Masalah: "${problem}". Target Market: "${targetMarket}". 
    Rumuskan solusi yang komprehensif yang akan dibahas dalam ebook.
    Berikan output dalam format JSON object dengan properti: "core_solution", "key_benefits", "unique_selling_point".`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          core_solution: { type: Type.STRING },
          key_benefits: { type: Type.STRING },
          unique_selling_point: { type: Type.STRING }
        },
        required: ["core_solution", "key_benefits", "unique_selling_point"]
      }
    }
  });
  return JSON.parse(response.text);
};

export const generateStep4Outline = async (problem: string, targetMarket: string, solution: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Berdasarkan Masalah: "${problem}", Target Market: "${targetMarket}", dan Solusi: "${solution}".
    Buatlah Nama Ebook yang menarik (catchy), Deskripsi singkat, dan Outline (Daftar Isi) yang terdiri dari minimal 5 bab.
    Berikan output dalam format JSON object dengan properti: "title", "description", "outline" (array of strings).`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          outline: { 
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["title", "description", "outline"]
      }
    }
  });
  return JSON.parse(response.text);
};

export const generateChapterContent = async (
  title: string, 
  chapter: string, 
  outline: string[], 
  style: string, 
  notes: string
) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Anda adalah seorang penulis ebook profesional yang ahli dalam menulis konten yang praktis, mudah dipahami, dan "to the point".
      
      TUGAS: Tulis isi materi untuk bab ebook berikut.
      
      JUDUL EBOOK: ${title}
      BAB YANG DITULIS: ${chapter}
      STRUKTUR OUTLINE LENGKAP: ${outline.join(', ')}
      GAYA PENULISAN: ${style}
      CATATAN TAMBAHAN: ${notes}
      
      ATURAN KETAT:
      1. JANGAN gunakan jargon AI yang membosankan seperti "Dalam dunia yang terus berkembang", "Penting untuk dicatat", "Kesimpulannya", atau "Membuka potensi".
      2. Tulis seperti manusia berbicara kepada teman atau muridnya: Langsung, praktis, dan penuh daging (materi inti).
      3. Gunakan Bahasa Indonesia yang natural, tidak kaku, dan hindari kata-kata klise.
      4. Fokus pada "BAGAIMANA CARANYA" (How-to) dan langkah praktis.
      5. Gunakan format Markdown (heading, list, bold) agar mudah dibaca.
      6. Jangan memberikan kata pengantar atau penutup tentang tugas ini. Langsung tulis isi babnya.
      7. Pastikan materi bab ini nyambung dengan outline bab lainnya.`,
  });
  return response.text;
};
