// Calls the backend API and parses the JSON response when present.
export async function apiRequest(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}
/*
File summary:
- Small fetch wrapper for client-to-server API calls.
- Adds JSON headers, handles empty responses, and throws on HTTP errors.
- Use this for all frontend API requests to keep network behavior consistent.
*/
