export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message } = req.body;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: `你是一個專為公司內部採購人員設計的比價查詢機器人。

你的工作是：
1. 根據使用者輸入的商品名稱，搜尋蝦皮上的相關商品
2. 整理出至少三個賣家的價格與預估出貨時間
3. 依據價格由低到高排列，標示出最推薦的選擇

回答格式如下：
商品：[商品名稱]
查詢結果：
賣家 | 價格 | 預估出貨時間 | 備註
推薦選擇：[價格最低且能在一週內到貨的賣家]

你的邊界規則：
- 只回答商品價格與出貨時間相關的問題
- 若使用者問非採購相關問題，回答：本機器人僅提供商品價格與出貨時間查詢，請重新輸入商品名稱
- 若蝦皮查無此商品，回答：查無此商品，請確認商品名稱後重新輸入
- 若使用者輸入空白或亂碼，回答：無法識別輸入內容，請輸入您想查詢的商品名稱
- 若商品無法在一週內到貨，主動標示警告：⚠️ 此賣家無法在一週內到貨
- 不捏造任何商品資訊，查無結果時必須如實告知`,
        messages: [{ role: 'user', content: message }]
      })
    });

    const data = await response.json();
    const reply = data?.content?.[0]?.text || '抱歉，無法取得回應，請稍後再試。';
res.status(200).json({ reply });
  } catch (error) {
    res.status(500).json({ error: '伺服器錯誤，請稍後再試' });
  }
}
