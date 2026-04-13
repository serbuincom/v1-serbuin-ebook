import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

let genAI: any = null;

function getGenAI() {
  if (!genAI) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey === "") {
      throw new Error("API Key Gemini tidak ditemukan. Pastikan sudah diatur di Environment Variables Vercel (VITE_GEMINI_API_KEY).");
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

export const generateStep1Problems = async (niche: string, expertise: string) => {
  const client = getGenAI();
  const model = client.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            id: { type: SchemaType.STRING },
            problem: { type: SchemaType.STRING },
            reason_cuan: { type: SchemaType.STRING },
            potential_solution_brief: { type: SchemaType.STRING }
          },
          required: ["id", "problem", "reason_cuan", "potential_solution_brief"]
        }
      }
    }
  }, { apiVersion: 'v1' });

  const result = await model.generateContent(`Saya ingin membuat ebook di niche "${niche}" dengan keahlian "${expertise}". 
    Identifikasi 5 masalah yang paling sering dirasakan orang banyak di niche ini yang memiliki potensi cuan tinggi jika solusinya disediakan dalam bentuk ebook.
    Berikan output dalam format JSON array of objects dengan properti: "id", "problem", "reason_cuan", "potential_solution_brief".`);
  
  const text = result.response.text();
  return JSON.parse(text);
};

export const generateStep2TargetMarket = async (problem: string) => {
  const client = getGenAI();
  const model = client.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          demographics: { type: SchemaType.STRING },
          psychographics: { type: SchemaType.STRING },
          pain_points: { type: SchemaType.STRING },
          buying_power: { type: SchemaType.STRING }
        },
        required: ["demographics", "psychographics", "pain_points", "buying_power"]
      }
    }
  }, { apiVersion: 'v1' });

  const response = await model.generateContent(`Berdasarkan masalah ini: "${problem}", tentukan target market yang paling spesifik dan ideal.
    Berikan output dalam format JSON object dengan properti: "demographics", "psychographics", "pain_points", "buying_power".`);
  
  return JSON.parse(response.response.text());
};

export const generateStep3Solution = async (problem: string, targetMarket: string) => {
  const client = getGenAI();
  const model = client.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          core_solution: { type: SchemaType.STRING },
          key_benefits: { type: SchemaType.STRING },
          unique_selling_point: { type: SchemaType.STRING }
        },
        required: ["core_solution", "key_benefits", "unique_selling_point"]
      }
    }
  }, { apiVersion: 'v1' });

  const response = await model.generateContent(`Masalah: "${problem}". Target Market: "${targetMarket}". 
    Rumuskan solusi yang komprehensif yang akan dibahas dalam ebook.
    Berikan output dalam format JSON object dengan properti: "core_solution", "key_benefits", "unique_selling_point".`);
  
  return JSON.parse(response.response.text());
};

export const generateStep4Outline = async (problem: string, targetMarket: string, solution: string) => {
  const client = getGenAI();
  const model = client.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          title: { type: SchemaType.STRING },
          description: { type: SchemaType.STRING },
          outline: { 
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING }
          }
        },
        required: ["title", "description", "outline"]
      }
    }
  }, { apiVersion: 'v1' });

  const response = await model.generateContent(`Berdasarkan Masalah: "${problem}", Target Market: "${targetMarket}", dan Solusi: "${solution}".
    Buatlah Nama Ebook yang menarik (catchy), Deskripsi singkat, dan Outline (Daftar Isi) yang terdiri dari minimal 5 bab.
    Berikan output dalam format JSON object dengan properti: "title", "description", "outline" (array of strings).`);
  
  return JSON.parse(response.response.text());
};

export const generateChapterContent = async (
  title: string, 
  chapter: string, 
  outline: string[], 
  style: string, 
  notes: string
) => {
  const client = getGenAI();
  const model = client.getGenerativeModel({ model: "gemini-1.5-flash" }, { apiVersion: 'v1' });

  const prompt = `Anda adalah seorang penulis ebook profesional yang ahli dalam menulis konten yang praktis, mudah dipahami, dan "to the point".
          
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
    7. Pastikan materi bab ini nyambung dengan outline bab lainnya.`;

  const response = await model.generateContent(prompt);
  return response.response.text();
};
