const root = document.querySelector("#folio");
const panels = [...root.querySelectorAll("[data-panel]")];
const curtain = document.querySelector("#privacy-curtain");

export function readLocal(key, fallback) {
    try {
        return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
        return fallback;
    }
}

export function showView(view, focus = false) {
    if (!panels.some((panel) => panel.dataset.panel === view)) {
        view = "home";
    }
    panels.forEach((panel) => {
        panel.hidden = panel.dataset.panel !== view;
        if (!panel.hidden) {
            panel.querySelectorAll(":scope > details.details").forEach((details) => {
                details.open = true;
            });
            if (focus) {
                panel.tabIndex = -1;
                panel.focus({ preventScroll: true });
            }
        }
    });
    root.querySelectorAll(".folio-nav-button[data-view]").forEach((button) => {
        if (button.dataset.view === view) {
            button.setAttribute("aria-current", "page");
        } else {
            button.removeAttribute("aria-current");
        }
    });
    window.scrollTo(0, 0);
    root.dispatchEvent(new CustomEvent("workspace-view", { detail: view }));
}

root.addEventListener("click", ({ target }) => {
    const button = target.closest("button");
    if (!button) {
        return;
    }
    if (button.dataset.view) {
        showView(button.dataset.view, true);
    }
    if (button.dataset.activate) {
        document.getElementById(button.dataset.activate)?.click();
        if (button.hasAttribute("data-edition-import")) {
            document.querySelector('#select-edition-form [data-id="upload"]').open = true;
        }
    }
    if (button.dataset.edition) {
        document.querySelector("#select-edition").click();
        const section = document.querySelector('#select-edition-form [data-id="official"]');
        section.open = true;
        const radio = section.querySelector(`input[value="${button.dataset.edition}"]`);
        radio.checked = true;
        radio.dispatchEvent(new Event("input", { bubbles: true }));
    }
});

const theme = document.querySelector("#theme-select");
theme.value = document.documentElement.dataset.theme || "dark";
if (!theme.value) {
    theme.value = "dark";
}
theme.addEventListener("change", () => {
    document.documentElement.dataset.theme = theme.value;
    try {
        localStorage.setItem("pg-theme", theme.value);
    } catch {
        // The selected theme still applies for the current page.
    }
});


function privateDialogs() {
    return [...document.querySelectorAll("dialog.dialog--hide-background[open]")];
}

function hideWorkspace() {
    if (!curtain.open) {
        curtain.showModal();
    }
    armPrivacyHistory();
}

function armPrivacyHistory() {
    const state = { ...history.state, grimoireEntry: true, grimoirePrivacy: true };
    if (history.state?.grimoireEntry) {
        history.replaceState(state, "");
    } else {
        history.pushState(state, "");
    }
}

document.addEventListener("close", () => {
    if (history.state?.grimoirePrivacy && !curtain.open && !privateDialogs().length) {
        history.replaceState({ ...history.state, grimoirePrivacy: false }, "");
    }
}, true);

document.querySelector("#privacy-button").addEventListener("click", hideWorkspace);
document.querySelector("#privacy-return").addEventListener("click", () => curtain.close());
curtain.addEventListener("cancel", (event) => event.preventDefault());

window.addEventListener("popstate", (event) => {
    if (curtain.open || privateDialogs().length || event.state?.grimoirePrivacy) {
        privateDialogs().reverse().forEach((dialog) => dialog.close());
        hideWorkspace();
    } else {
        showView("home");
    }
});

window.addEventListener("pagehide", () => {
    if (privateDialogs().length || curtain.open) {
        privateDialogs().reverse().forEach((dialog) => dialog.close());
        hideWorkspace();
    }
});

export function protectPresentation(dialog) {
    if (dialog.matches(".dialog--hide-background")) {
        armPrivacyHistory();
    }
}

if (history.state?.grimoirePrivacy) {
    hideWorkspace();
}
