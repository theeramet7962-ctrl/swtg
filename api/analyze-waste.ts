import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // รองรับเฉพาะ POST request
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { image } = req.body; // รับรูปภาพจาก client
    const apiKey = process.env.GEMINI_API_KEY; // ดึง API Key จาก Vercel Environment Variables

    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
    }

    // เรียกใช้งาน Gemini API
    const ai = new GoogleGenAI({ apiKey });
    // ... ใส่โค้ดวิเคราะห์ขยะของคุณตรงนี้ ...

    return res.status(200).json({ result: "ผลการวิเคราะห์..." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to analyze waste' });
  }
}
