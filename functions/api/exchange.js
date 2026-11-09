// Cloudflare Pages Function: /api/exchange
// Handles visitor lead submissions from "Exchange Contacts"

export async function onRequestPost(context) {
  try {
    const data = await context.request.json();
    console.log('[Lead Submission Received]', data);

    // Optional: Forward to Feishu / DingTalk / WeChat Work bot webhook if env configured
    const webhookUrl = context.env ? context.env.LEAD_WEBHOOK_URL : null;
    if (webhookUrl) {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          msg_type: 'text',
          content: {
            text: `📢 新的名片交换留资提醒！\n名片所属: ${data.card_owner_name} (${data.card_slug})\n客户姓名: ${data.visitor_name}\n客户手机: ${data.visitor_phone}\n客户邮箱: ${data.visitor_email || '无'}\n客户公司: ${data.visitor_company || '无'}`
          }
        })
      });
    }

    return new Response(JSON.stringify({ success: true, message: '交换信息已成功接收' }), {
      headers: {
        'Content-Type': 'application/json;charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json;charset=utf-8' }
    });
  }
}
