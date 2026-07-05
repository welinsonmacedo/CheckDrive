import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
  const prompt = `Gere um JSON com os códigos de infração de trânsito mais comuns no Brasil (baseados no CTB) que estão faltando na seguinte lista. A lista original tem ~80 itens. Tente completar com mais ~150 códigos comuns de infração do manual brasileiro de fiscalização. Retorne APENAS o objeto JSON, sem markdown, no formato {"codigo": "descricao", ...}.
Lista original: [5002, 5010, 5029, 5037, 5045, 5053, 5061, 5118, 5126, 5169, 5177, 5185, 5193, 5207, 5215, 5231, 5274, 5282, 5290, 5304, 5320, 5347, 5371, 5380, 5428, 5444, 5452, 5460, 5479, 5487, 5509, 5525, 5541, 5550, 5568, 5622, 5673, 5720, 5738, 5746, 5819, 5835, 5843, 5878, 5924, 5967, 5975, 5991, 6009, 6017, 6025, 6041, 6050, 6068, 6122, 6211, 6530, 6548, 6556, 6580, 6599, 6602, 6610, 6637, 6645, 6653, 6670, 6700, 6726, 6769, 6831, 6882, 6912, 6971, 7030, 7048, 7056, 7064, 7099, 7234, 7242, 7277, 7315, 7358, 7366, 7374, 7455, 7463, 7471, 7587, 7625, 7633, 7650, 7668, 8311]`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: prompt,
  });
  console.log(response.text);
}
run();
