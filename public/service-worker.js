const CACHE = "pocket-grimoire-shell-v2";
const localeHome = /^\/[a-z]{2,3}(?:_[A-Z]{2})?\/$/;
const publicAsset = /^\/(?:build\/(?:css|js|data|fonts|img|images)\/[^?#]+|build\/[\w.-]+\.js|site\.webmanifest|android-chrome-(?:192|512)x(?:192|512)\.png)$/;

function cacheable(response) {
    return response.ok && response.type === "basic" && !/no-store|private/i.test(response.headers.get("cache-control") || "");
}

async function networkFirst(request, cache, cacheKey = request) {
    try {
        const response = await fetch(request);
        if (cacheable(response)) {
            await cache.put(cacheKey, response.clone()).catch(() => {});
        }
        return response;
    } catch (error) {
        return (await cache.match(cacheKey)) || Response.error();
    }
}

self.addEventListener("install", (event) => event.waitUntil(self.skipWaiting()));
self.addEventListener("activate", (event) => {
    event.waitUntil((async () => {
        const names = await caches.keys();
        await Promise.all(names.filter((name) => name.startsWith("pocket-grimoire-shell-") && name !== CACHE)
            .map((name) => caches.delete(name)));
        await self.clients.claim();
    })());
});

self.addEventListener("fetch", (event) => {
    const { request } = event;
    const url = new URL(request.url);
    if (request.method !== "GET" || url.origin !== self.location.origin || url.search) {
        return;
    }
    const shell = request.mode === "navigate" && (localeHome.test(url.pathname) || url.pathname === "/");
    if (!shell && !publicAsset.test(url.pathname)) {
        return;
    }
    event.respondWith((async () => {
        const cache = await caches.open(CACHE);
        const key = url.pathname === "/" ? "/" : request;
        if (shell || /^\/build\/data\//.test(url.pathname)) {
            return networkFirst(request, cache, key);
        }
        return (await cache.match(request)) || networkFirst(request, cache);
    })());
});

self.addEventListener("message", (event) => {
    if (event.data?.type !== "cache-grimoire-shell" || !Array.isArray(event.data.urls)
        || event.data.urls.length > 600 || !event.source?.url) {
        return;
    }
    const page = new URL(event.source.url);
    if (page.origin !== self.location.origin || !localeHome.test(page.pathname) || page.search) {
        return;
    }
    const urls = new Set([page.pathname, "/", "/site.webmanifest", ...event.data.urls.filter((value) => {
        if (typeof value !== "string" || !value.startsWith("/")) {
            return false;
        }
        const url = new URL(value, page.origin);
        return url.origin === page.origin && !url.search && publicAsset.test(url.pathname);
    })]);
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE);
        await Promise.all([...urls].map(async (url) => {
            if (!(await cache.match(url))) {
                await networkFirst(new Request(new URL(url, page.origin)), cache, url);
            }
        }));
    })());
});
