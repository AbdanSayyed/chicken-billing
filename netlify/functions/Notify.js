// Netlify Function — sends push notification to all admin devices via OneSignal
// This runs server-side so the REST API key is never exposed in the app

const OS_APP_ID = '3b540044-d263-4a0e-9f16-dd9c95fd4614';
const OS_REST_KEY = process.env.ONESIGNAL_REST_KEY; // Set in Netlify environment variables

exports.handler = async function(event, context) {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': 'https://bismillah-foods-billing.netlify.app',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { title, message } = JSON.parse(event.body || '{}');

    if (!title || !message) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'title and message are required' })
      };
    }

    if (!OS_REST_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'ONESIGNAL_REST_KEY not set in Netlify environment variables' })
      };
    }

    // Send to all devices tagged as admin
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
        web_url: 'https://bismillah-foods-billing.netlify.app/index.html',
        chrome_web_icon: 'https://bismillah-foods-billing.netlify.app/icon-192.png',
        chrome_web_badge: 'https://bismillah-foods-billing.netlify.app/icon-192.png'
      })
    });

    const data = await response.json();

    if (data.errors) {
      console.error('OneSignal errors:', data.errors);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: data.errors })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        recipients: data.recipients || 0,
        id: data.id
      })
    };

  } catch (err) {
    console.error('Notify function error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};