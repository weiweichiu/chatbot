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

    // 用 Google Custom Search 搜尋飛比價格
    const searchQuery = `${message} 價格 feebee.com.tw`;
    const googleRes = await fetch(
      `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_API_KEY}&cx=${process.env.GOOGLE_CSE_ID}&q=${encodeURIComponent(searchQuery)}&num=10`
    );
    const googleData = await googleRes.json();
    
    // 整理搜尋結果
    const searchResults = googleData.items?.map(item => ({
      title: item.title,
      snippet: item.snippet,
      link: item.link
    })) || [];

    // 把搜尋結果傳給 Claude 整理
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        system: `你是一個專為公司內部採購人員設計的比價查詢機器人。

你會收到飛比價格的 Google 搜尋結果，請從中整理出商品價格資訊。

你的工作是：
1. 從搜尋結果的 snippet 中找出有完整價格（數字+$或元）的賣家，最多顯示前3名
2. 依據價格由低到高排列，第1名標示為最推薦
3. 若只找到1~2筆有價格的資料，直接顯示找到的筆數

回答格式如下：
商品：[商品名稱]
查詢結果：
# | 賣家 | 價格 | 備註
推薦選擇：[價格最低的賣家]

你的邊界規則：
- 只回答商品價格相關的問題
- 若使用者問非採購相關問題，回答：本機器人僅提供商品價格查詢，請重新輸入商品名稱
- 若查無此商品，回答：查無此商品，請確認商品名稱後重新輸入
- 若使用者輸入空白或亂碼，回答：無法識別輸入內容，請輸入您想查詢的商品名稱
- 不捏造任何商品資訊
- 若找不到有完整價格的資料，提供以下搜尋連結：
  1. 飛比價格：https://feebee.com.tw/s/[商品名稱]
  2. 蝦皮：https://shopee.tw/search?keyword=[商品名稱]
  3. PChome：https://search.pchome.com.tw/?q=[商品名稱]
  並說明：「目前無法取得完整比價資料，建議您直接前往以下平台查詢」`,
        messages: [{
          role: 'user',
          content: `使用者查詢：${message}\n\nGoogle 搜尋結果（來自飛比價格）：\n${JSON.stringify(searchResults, null, 2)}`
        }]
      })
    });

    const data = await response.json();
    const textBlock = data?.content?.find(block => block.type === 'text');
    const reply = textBlock?.text || '抱歉，無法取得回應，請稍後再試。';
    res.status(200).json({ reply });
  } catch (error) {
    res.status(500).json({ error: '伺服器錯誤，請稍後再試' });
  }
}
