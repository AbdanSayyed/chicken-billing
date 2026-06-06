const OS_APP_ID = '3b540044-d263-4a0e-9f16-dd9c95fd4614';
const OS_REST_KEY = process.env.ONESIGNAL_REST_KEY;

exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method Not Allowed' };

  try {
    const { title, message, billNo } = JSON.parse(event.body || '{}');

    if (!title || !message) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'title and message required' }) };
    }

    if (!OS_REST_KEY) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'ONESIGNAL_REST_KEY not set' }) };
    }

    // Build click URL — opens app at bills page with bill highlighted
    const clickUrl = billNo
      ? `https://bismillah-foods-billing.netlify.app/index.html#bill-${billNo}`
      : `https://bismillah-foods-billing.netlify.app/index.html`;

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${OS_REST_KEY}`
      },
      body: JSON.stringify({
        app_id: OS_APP_ID,
        filters: [
          { field: 'tag', key: 'role', relation: '=', value: 'admin' },
          { operator: 'AND' },
          { field: 'tag', key: 'shop', relation: '=', value: 'bismillahfoods' }
        ],
        headings: { en: title },
        contents: { en: message },
        web_url: clickUrl,
        chrome_web_icon: 'https://bismillah-foods-billing.netlify.app/icon-192.png',
        chrome_web_badge: 'https://bismillah-foods-billing.netlify.app/icon-192.png',
        // Keep notification visible until tapped
        chrome_web_image: 'https://bismillah-foods-billing.netlify.app/icon-512.png',
        ttl: 3600, // Keep for 1 hour if phone offline
        priority: 10, // High priority
        data: { billNo: billNo || null }
      })
    });

    const data = await response.json();

    if (data.errors) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: data.errors }) };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, recipients: data.recipients || 0, id: data.id })
    };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};