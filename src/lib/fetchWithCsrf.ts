
function getCookie(name: string): string | null {
    if (typeof document === 'undefined') {
        return null;
    }
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
        return parts.pop()?.split(';').shift() || null;
    }
    return null;
}

/**
 * A wrapper around the global `fetch` function that automatically adds the
 * CSRF token to the request headers for non-GET requests.
 * @param url The URL to fetch.
 * @param options The fetch options.
 * @returns A Promise that resolves to the Response.
 */
export async function fetchWithCsrf(url: string, options: RequestInit = {}): Promise<Response> {
    const csrfToken = getCookie('csrf_token');

    const headers = new Headers(options.headers);

    // Only add CSRF token for methods that typically modify state
    if (options.method && options.method.toUpperCase() !== 'GET' && csrfToken) {
        headers.set('x-csrf-token', csrfToken);
    }

    const newOptions: RequestInit = {
        ...options,
        headers,
    };

    return fetch(url, newOptions);
}
