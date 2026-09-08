import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload size limit for camera base64 images
  app.use(express.json({ limit: "20mb" }));

  // Initialize Gemini API client
  const getGeminiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing");
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  };

  // API Route: Analyze Waste Image
  app.post("/api/analyze-waste", async (req, res) => {
    try {
      const { image, userPrompt } = req.body;

      if (!image) {
        return res.status(400).json({ error: "โปรดระบุรูปภาพขยะเพื่อทำการวิเคราะห์ (Image is required)" });
      }

      // Format base64 image data
      let base64Data = image;
      let mimeType = "image/jpeg";

      if (image.includes(";base64,")) {
        const parts = image.split(";base64,");
        mimeType = parts[0].replace("data:", "");
        base64Data = parts[1];
      }

      const ai = getGeminiClient();

      const systemInstruction = `คุณคือวิศวกรสิ่งแวดล้อมและผู้เชี่ยวชาญด้านระบบการคัดแยกขยะ เศรษฐกิจหมุนเวียน (Circular Economy) และมาตรฐานถังขยะ 5 สีของประเทศไทย
หน้าที่ของคุณคือวิเคราะห์รูปภาพขยะที่ส่งมาอย่างละเอียด ระบุวัตถุและชิ้นส่วนย่อย (เช่น แยกตัวขวด ฝา ฉลาก) จัดหมวดหมู่เข้าถังขยะสีที่ถูกต้องของไทย ให้ขั้นตอนการเตรียมขยะ และคำนวณผลกระทบ CO2

หมวดหมู่ถังขยะมาตรฐานประเทศไทย:
1. recyclable (ขยะรีไซเคิล): สีเหลือง (#EAB308) - เช่น ขวดพลาสติก PET, กระป๋องอลูมิเนียม, กล่องกระดาษ, ขวดแก้ว, โลหะ
2. organic (ขยะย่อยสลาย / ขยะอินทรีย์): สีเขียว (#16A34A) - เช่น เศษอาหาร, เปลือกผลไม้, เศษผัก, เศษใบไม้, ซากพืช
3. general (ขยะทั่วไป): สีน้ำเงิน (#2563EB) - เช่น ถุงพลาสติกเปื้อนอาหาร, ซองขนมขบเคี้ยว, ซองซอส, กล่องโฟมเปื้อน, กระดาษทิชชู่ใช้แล้ว
4. hazardous (ขยะอันตราย): สีแดง (#DC2626) - เช่น ถ่านไฟฉาย, หลอดไฟ, กระป๋องสเปรย์, ขวดยาพ่น, สารเคมี, แบตเตอรี่
5. ewaste (ขยะอิเล็กทรอนิกส์): สีม่วง/เทา (#7C3AED) - เช่น โทรศัพท์เก่า, สายชาร์จ, แผงวงจร, พาวเวอร์แบงก์, อุปกรณ์คอมพิวเตอร์

คำตอบต้องกระชับ ทันสมัย เข้าใจง่าย และถูกต้องตามหลักการจัดการขยะ`;

      const prompt = userPrompt
        ? `ระบุชนิดขยะในภาพนี้อย่างละเอียด และตอบคำถามเพิ่มเติม: "${userPrompt}"`
        : "จำแนกชนิดขยะในภาพนี้ บอกประเภทถังขยะ สีถังขยะ วิธีคัดแยกทีละขั้นตอน การแยกชิ้นส่วนย่อย (ถ้ามี) การคำนวณลดก๊าซคาร์บอน CO2 และไอเดีย DIY";

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType,
              },
            },
            {
              text: prompt,
            },
          ],
        },
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              itemName: {
                type: Type.STRING,
                description: "ชื่อวัตถุหรือขยะที่พบในภาพ เช่น ขวดน้ำดื่มพลาสติก PET พร้อมฝาและฉลาก",
              },
              categoryKey: {
                type: Type.STRING,
                description: "รหัสหมวดหมู่หลัก: recyclable, organic, general, hazardous, ewaste",
              },
              categoryName: {
                type: Type.STRING,
                description: "ชื่อหมวดหมู่ภาษาไทย เช่น ขยะรีไซเคิล, ขยะย่อยสลาย, ขยะทั่วไป, ขยะอันตราย, ขยะอิเล็กทรอนิกส์",
              },
              binColor: {
                type: Type.STRING,
                description: "สีถังขยะตามมาตรฐานไทย เช่น ถังสีเหลือง, ถังสีเขียว, ถังสีน้ำเงิน, ถังสีแดง, ถังสีม่วง/เทา",
              },
              binHexColor: {
                type: Type.STRING,
                description: "รหัสสี Hex code เช่น #EAB308, #16A34A, #2563EB, #DC2626, #7C3AED",
              },
              confidence: {
                type: Type.NUMBER,
                description: "ระดับความมั่นใจ 0-100",
              },
              material: {
                type: Type.STRING,
                description: "ชนิดของวัสดุหลัก เช่น พลาสติก PET เบอร์ 1, อลูมิเนียม, แก้วโซดาไลม์",
              },
              recyclableValue: {
                type: Type.STRING,
                description: "ราคาประเมินการขายต่อกิโลกรัมหรือต่อชิ้น",
              },
              co2SavedKg: {
                type: Type.NUMBER,
                description: "ปริมาณการลด CO2 เมื่อจัดการถูกวิธี (kg CO2e) เช่น 0.08, 0.15, 0.5",
              },
              subComponents: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    partName: { type: Type.STRING, description: "ชื่อชิ้นส่วน เช่น ตัวขวด, ฝาขวด, ฉลากพลาสติก" },
                    binColor: { type: Type.STRING, description: "ถังขยะที่ต้องทิ้ง เช่น ถังสีเหลือง, ถังสีน้ำเงิน" },
                    instruction: { type: Type.STRING, description: "วิธีแยก เช่น บิดฝาออกทิ้งแยกถัง, แกะฉลากออก" }
                  },
                  required: ["partName", "binColor", "instruction"]
                },
                description: "การแยกชิ้นส่วนย่อยของขยะชิ้นนั้น"
              },
              sortingSteps: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "ขั้นตอนการจัดการเตรียมขยะก่อนทิ้งทีละขั้นตอน",
              },
              environmentalImpact: {
                type: Type.STRING,
                description: "ระยะเวลาย่อยสลาย และผลกระทบต่อระบบนิเวศ",
              },
              ecoPoints: {
                type: Type.NUMBER,
                description: "คะแนนแต้มรักษ์โลก 10-50 แต้ม",
              },
              creativeUpcyclingTip: {
                type: Type.STRING,
                description: "ไอเดียประดิษฐ์ D.I.Y. หรือนำกลับมาใช้ประโยชน์ใหม่",
              },
              warningNote: {
                type: Type.STRING,
                description: "คำเตือนความปลอดภัยถ้ามี เช่น วัตถุไวไฟ สารพิษ",
              },
            },
            required: [
              "itemName",
              "categoryKey",
              "categoryName",
              "binColor",
              "binHexColor",
              "confidence",
              "material",
              "sortingSteps",
              "environmentalImpact",
              "ecoPoints",
            ],
          },
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("ไม่ได้รับข้อมูลการวิเคราะห์จาก AI");
      }

      const result = JSON.parse(responseText);
      return res.json({ success: true, data: result });
    } catch (error: any) {
      console.error("Error analyzing waste image:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "เกิดข้อผิดพลาดในการวิเคราะห์ขยะ กรุณาลองใหม่อีกครั้ง",
      });
    }
  });

  // API Route: Eco AI Chat Advisor (ผู้ช่วยถามตอบเรื่องการแยกขยะและรีไซเคิล)
  app.post("/api/chat-advisor", async (req, res) => {
    try {
      const { message, contextItem } = req.body;

      if (!message) {
        return res.status(400).json({ error: "โปรดระบุข้อความคำถาม" });
      }

      const ai = getGeminiClient();

      const systemInstruction = `คุณคือ EcoBot ผู้ช่วย AI อัจฉริยะด้านการคัดแยกขยะ รีไซเคิล และสิ่งแวดล้อมประจำประเทศไทย
ตอบคำถามด้วยภาษาไทยที่ทันสมัย เป็นมิตร สุภาพ มีอิโมจิประกอบ ให้อธิบายตามมาตรฐานถังขยะไทย 5 สี (เหลือง=รีไซเคิล, เขียว=อินทรีย์, น้ำเงิน=ทั่วไป, แดง=อันตราย, ม่วง/เทา=ขยะอิเล็กทรอนิกส์)
หากมีบริบทขยะที่กำลังดูอยู่ ให้เชื่อมโยงคำตอบเข้ากับขยะชิ้นนั้น`;

      const promptContext = contextItem
        ? `บริบทขยะที่ผู้ใช้กำลังดูอยู่: ${JSON.stringify(contextItem)}\nคำถามของผู้ใช้: "${message}"`
        : `คำถามของผู้ใช้: "${message}"`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: promptContext,
        config: {
          systemInstruction,
        },
      });

      return res.json({
        success: true,
        reply: response.text || "ขออภัย ไม่สามารถประมวลผลคำตอบได้ในขณะนี้",
      });
    } catch (error: any) {
      console.error("Chat advisor error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "เกิดข้อผิดพลาดในการตอบคำถาม",
      });
    }
  });

  // Vite development middleware vs Static Production
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
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
