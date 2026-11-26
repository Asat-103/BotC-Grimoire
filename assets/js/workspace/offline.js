import Observer from "../classes/Observer.js";

if ("serviceWorker" in navigator && window.ENVIRONMENT === "prod") {
    const registration = navigator.serviceWorker.register("/service-worker.js")
        .then(() => navigator.serviceWorker.ready)
        .catch((error) => {
            console.warn("Unable to enable offline grimoire", error);
            return null;
        });

    function cacheShell(roles = []) {
        const urls = new Set();
        function add(url) {
            if (!url) {
                return;
            }
            try {
                const asset = new URL(url, location.href);
                if (asset.origin === location.origin && asset.pathname.startsWith("/build/") && !asset.search) {
                    urls.add(asset.pathname);
                }
            } catch {
                // A malformed homebrew image URL has no offline resource.
            }
        }
        document.querySelectorAll('script[src], link[rel="stylesheet"][href]').forEach((element) => add(element.src || element.href));
        performance.getEntriesByType("resource").forEach(({ name }) => add(name));
        roles.forEach((role) => add(role.getImage()));
        ["good", "evil"].forEach((alignment) => add(`/build/img/roles/generic/${alignment}.webp`));
        registration.then((worker) => {
            worker?.active?.postMessage({ type: "cache-grimoire-shell", urls: [...urls].slice(0, 600) });
        });
    }

    window.addEventListener("load", () => cacheShell(), { once: true });
    Observer.create("game").on("characters-selected", ({ detail }) => cacheShell(detail.characters));
}
