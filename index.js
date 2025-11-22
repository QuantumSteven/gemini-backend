// 1. 引入必要的套件
require('dotenv').config(); // 讀取 .env 檔案裡的設定
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js');

// 2. 初始化 App 和設定
const app = express();
const port = process.env.PORT || 3000;

// 3. 設定中間件 (Middleware)
app.use(cors()); // 允許跨域請求
app.use(express.json()); // 讓伺服器看得懂 JSON 格式的資料

// 4. 初始化 Gemini 和 Supabase
// 從環境變數讀取 Key，確保安全
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// 5. 建立一個 API 路由 (Endpoint)
// 前端會發送 POST 請求到 http://你的網址/api/chat
app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body; // 從前端取得使用者的訊息

        if (!message) {
            return res.status(400).json({ error: '請提供訊息 (message)' });
        }

        // --- 步驟 A: 呼叫 Gemini ---
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash"});
        const result = await model.generateContent(message);
        const response = await result.response;
        const aiText = response.text(); // 取得 AI 的回應文字

        // --- 步驟 B: 存入 Supabase (記錄 Log) ---
        // 這裡我們把使用者的問題和 AI 的回答存進資料庫
        const { data, error } = await supabase
            .from('ai_logs') // 你的 Table 名稱
            .insert([
                { prompt: message, response: aiText }
            ]);

        if (error) {
            console.error('Supabase 儲存錯誤:', error);
            // 注意：即使存資料庫失敗，我們通常還是會回傳 AI 的答案給使用者，只是在後台記個錯
        }

        // --- 步驟 C: 回傳結果給前端 ---
        res.json({
            reply: aiText,
            saved: !error // 告訴前端是否有成功存檔
        });

    } catch (error) {
  console.error("錯誤詳細資訊:", error);
  // 把 error.message 直接傳回去，這樣你在 Thunder Client 就能看到具體錯誤
  res.status(500).json({ 
    error: "伺服器發生錯誤", 
    details: error.message,
    fullError: error // 有時候這裡會有更多資訊
  });
}
});

// 6. 啟動伺服器
app.listen(port, () => {
    console.log(`伺服器正在運行，Port: ${port}`);
});