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

// ========================================
// 🆕 新增：信用卡數據 API 端點
// ========================================

// 5a. 獲取所有信用卡數據
// GET /api/cards
app.get('/api/cards', async (req, res) => {
    try {
        console.log('📡 收到請求: GET /api/cards');

        // 從 Supabase 讀取所有信用卡數據
        const { data, error } = await supabase
            .from('credit_cards') // 確保你的 Supabase 有這個資料表
            .select('*')
            .order('發卡機構', { ascending: true }); // 按發卡機構排序

        if (error) {
            console.error('❌ Supabase 讀取錯誤:', error);
            return res.status(500).json({
                error: '無法讀取信用卡資料',
                details: error.message
            });
        }

        console.log(`✅ 成功讀取 ${data.length} 張信用卡資料`);

        // 回傳數據給前端
        res.json(data);

    } catch (error) {
        console.error("❌ 伺服器錯誤:", error);
        res.status(500).json({
            error: "伺服器發生錯誤",
            details: error.message,
            fullError: error
        });
    }
});

// 5b. 根據篩選條件獲取信用卡（可選功能）
// GET /api/cards?category=dining&region=local
app.get('/api/cards/filter', async (req, res) => {
    try {
        const { category, region } = req.query;
        console.log('📡 收到篩選請求:', { category, region });

        let query = supabase.from('credit_cards').select('*');

        // 根據消費種類篩選
        if (category) {
            query = query.ilike('消費種類', `%${category}%`);
        }

        // 根據簽帳地區篩選
        if (region) {
            query = query.ilike('簽帳地區', `%${region}%`);
        }

        const { data, error } = await query;

        if (error) {
            console.error('❌ Supabase 讀取錯誤:', error);
            return res.status(500).json({
                error: '無法讀取信用卡資料',
                details: error.message
            });
        }

        console.log(`✅ 篩選後找到 ${data.length} 張信用卡`);
        res.json(data);

    } catch (error) {
        console.error("❌ 伺服器錯誤:", error);
        res.status(500).json({
            error: "伺服器發生錯誤",
            details: error.message
        });
    }
});

// 5c. 新增信用卡（可選功能，需要身份驗證）
// POST /api/cards
app.post('/api/cards', async (req, res) => {
    try {
        const cardData = req.body;
        console.log('📝 收到新增信用卡請求');

        // 驗證必要欄位
        const requiredFields = ['發卡機構', '卡名', '消費種類', '回饋數值'];
        for (const field of requiredFields) {
            if (!cardData[field]) {
                return res.status(400).json({
                    error: `缺少必要欄位: ${field}`
                });
            }
        }

        // 插入資料到 Supabase
        const { data, error } = await supabase
            .from('credit_cards')
            .insert([cardData])
            .select();

        if (error) {
            console.error('❌ Supabase 新增錯誤:', error);
            return res.status(500).json({
                error: '無法新增信用卡資料',
                details: error.message
            });
        }

        console.log('✅ 成功新增信用卡:', data);
        res.status(201).json({
            success: true,
            data: data[0]
        });

    } catch (error) {
        console.error("❌ 伺服器錯誤:", error);
        res.status(500).json({
            error: "伺服器發生錯誤",
            details: error.message
        });
    }
});

// 5d. 更新信用卡（可選功能）
// PUT /api/cards/:id
app.put('/api/cards/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const cardData = req.body;
        console.log(`📝 收到更新信用卡請求: ID=${id}`);

        const { data, error } = await supabase
            .from('credit_cards')
            .update(cardData)
            .eq('id', id)
            .select();

        if (error) {
            console.error('❌ Supabase 更新錯誤:', error);
            return res.status(500).json({
                error: '無法更新信用卡資料',
                details: error.message
            });
        }

        if (data.length === 0) {
            return res.status(404).json({
                error: '找不到該信用卡'
            });
        }

        console.log('✅ 成功更新信用卡:', data);
        res.json({
            success: true,
            data: data[0]
        });

    } catch (error) {
        console.error("❌ 伺服器錯誤:", error);
        res.status(500).json({
            error: "伺服器發生錯誤",
            details: error.message
        });
    }
});

// 5e. 刪除信用卡（可選功能）
// DELETE /api/cards/:id
app.delete('/api/cards/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`🗑️ 收到刪除信用卡請求: ID=${id}`);

        const { data, error } = await supabase
            .from('credit_cards')
            .delete()
            .eq('id', id)
            .select();

        if (error) {
            console.error('❌ Supabase 刪除錯誤:', error);
            return res.status(500).json({
                error: '無法刪除信用卡資料',
                details: error.message
            });
        }

        if (data.length === 0) {
            return res.status(404).json({
                error: '找不到該信用卡'
            });
        }

        console.log('✅ 成功刪除信用卡');
        res.json({
            success: true,
            message: '信用卡已刪除'
        });

    } catch (error) {
        console.error("❌ 伺服器錯誤:", error);
        res.status(500).json({
            error: "伺服器發生錯誤",
            details: error.message
        });
    }
});

// ========================================
// 原有的 Gemini AI 聊天端點
// ========================================

// 6. 建立一個 API 路由 (Endpoint)
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

// ========================================
// 測試端點（用於檢查伺服器是否正常運作）
// ========================================

// 健康檢查
app.get('/', (req, res) => {
    res.json({
        status: 'OK',
        message: '香港信用卡助手後端服務運行中',
        endpoints: {
            cards: {
                getAll: 'GET /api/cards',
                filter: 'GET /api/cards/filter?category=dining&region=local',
                create: 'POST /api/cards',
                update: 'PUT /api/cards/:id',
                delete: 'DELETE /api/cards/:id'
            },
            ai: {
                chat: 'POST /api/chat'
            }
        }
    });
});

// 7. 啟動伺服器
app.listen(port, () => {
    console.log(`🚀 伺服器正在運行，Port: ${port}`);
    console.log(`📍 本地測試: http://localhost:${port}`);
    console.log(`📡 API 端點: http://localhost:${port}/api/cards`);
});
