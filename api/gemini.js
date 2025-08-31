module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    try {
        // Robust JSON body parsing (Vercel Node functions may not auto-parse)
        let body = req.body;
        if (!body || typeof body === 'string') {
            try { body = JSON.parse(body || '{}'); } catch { body = {}; }
        }
        const { base64ImageData } = body || {};
        if (!base64ImageData) return res.status(400).json({ error: 'Missing image data' });
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) return res.status(500).json({ error: 'Server misconfigured: GEMINI_API_KEY missing' });

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
        const payload = {
            contents: [{
                parts: [
                    { text: "You are a precise data extraction engine. Your only job is to extract information from the receipt image. For each distinct line item, you MUST extract the following three fields from their corresponding columns: 1. `name`: The text from the 'Item Name' column. 2. `rate`: The numerical value from the 'Rate' column (price for a single unit). 3. `price`: The numerical value from the 'Amount' column (the total price for that line). CRITICAL INSTRUCTIONS: - Do NOT extract the 'Qty' column. - Do NOT aggregate items. Create a separate JSON object for each line. - The fields `name`, `rate`, and `price` are all mandatory for every item. Also extract the overall `summary` containing `subtotal`, `tax`, `service_charge`, `discounts`, and `total`. Provide clean JSON." },
                    { inlineData: { mimeType: 'image/jpeg', data: base64ImageData } }
                ]
            }],
            generationConfig: {
                responseMimeType: 'application/json', responseSchema: {
                    type: 'OBJECT', properties: {
                        items: {
                            type: 'ARRAY', items: {
                                type: 'OBJECT', properties: {
                                    name: { type: 'STRING' }, rate: { type: 'NUMBER' }, price: { type: 'NUMBER' }
                                }, required: ['name', 'rate', 'price']
                            }
                        },
                        summary: { type: 'OBJECT', properties: { subtotal: { type: 'NUMBER' }, tax: { type: 'NUMBER' }, service_charge: { type: 'NUMBER' }, discounts: { type: 'NUMBER' }, total: { type: 'NUMBER' } }, required: ['subtotal', 'tax', 'total'] }
                    }
                }
            }
        };
        const r = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const data = await r.json().catch(async () => ({ raw: await r.text() }));
        return res.status(r.ok ? 200 : 500).json(data);
    } catch (e) {
        return res.status(500).json({ error: 'Proxy error', details: e && e.message ? e.message : String(e) });
    }
};
