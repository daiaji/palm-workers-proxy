addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

// Helper function to pick specific headers from a Headers object
const pickHeaders = (headers, keys) => {
  const picked = new Headers();
  for (const key of headers.keys()) {
    if (keys.some(k => typeof k === 'string' ? k === key : k.test(key))) {
      picked.set(key, headers.get(key));
    }
  }
  return picked;
};

// Define CORS headers for preflight requests
const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': '*',
  'access-control-allow-headers': '*',
};

// Main function to handle incoming requests
async function handleRequest(request) {
  // Handle preflight requests (OPTIONS)
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: CORS_HEADERS,
    });
  }

  // Handle root path request for information
  const { pathname, searchParams } = new URL(request.url);
  if (pathname === '/') {
    const blank_html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Google PaLM API proxy on Cloudflare Workers</title>
</head>
<body>
  <h1 id="google-palm-api-proxy-on-cloudflare-workers">Google PaLM API proxy on Cloudflare Workers</h1>
  <p>Tips: This project uses a reverse proxy to solve problems such as location restrictions in Google APIs. </p>
  <p>If you have any of the following requirements, you may need the support of this project.</p>
  <ol>
  <li>When you see the error message "User location is not supported for the API use" when calling the Google PaLM API</li>
  <li>You want to customize the Google PaLM API</li>
  </ol>
  <p>For technical discussions, please visit <a href="https://simonmy.com/posts/使用netlify反向代理google-palm-api.html">https://simonmy.com/posts/使用netlify反向代理google-palm-api.html</a></p>
</body>
</html>
    `;
    return new Response(blank_html, {
      headers: {
        ...CORS_HEADERS,
        'content-type': 'text/html',
      },
    });
  }

  // Construct the target URL for the Google PaLM API
  const url = new URL(pathname, 'https://generativelanguage.googleapis.com');
  searchParams.delete('_path'); // Remove unnecessary parameter

  // Append search parameters to the target URL
  searchParams.forEach((value, key) => {
    url.searchParams.append(key, value);
  });

  // Select relevant headers for the request
  const headers = pickHeaders(
    request.headers,
    ['content-type', 'x-goog-api-client', 'x-goog-api-key', 'accept-encoding'],
  );

  // Forward the request to the Google PaLM API
  const response = await fetch(url, {
    body: request.body,
    method: request.method,
    duplex: 'half',
    headers,
  });

  // Create the response headers, including CORS headers and original response headers
  const responseHeaders = new Headers({
    ...CORS_HEADERS,
    ...Object.fromEntries(response.headers),
  });
  responseHeaders.delete('content-encoding'); // Remove content-encoding header

  // Return the response with adjusted headers
  return new Response(response.body, {
    headers: responseHeaders,
    status: response.status,
  });
}
