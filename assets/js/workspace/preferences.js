const haptics = document.querySelector("#prefer-haptics");
try {
    haptics.checked = localStorage.getItem("pg-haptics") === "on";
} catch {
    haptics.checked = false;
}
haptics.addEventListener("change", () => {
    try {
        localStorage.setItem("pg-haptics", haptics.checked ? "on" : "off");
    } catch {
        // The setting still applies for the current page.
    }
});
export function vibrate() {
    if (haptics.checked && typeof navigator.vibrate === "function") {
        navigator.vibrate(15);
    }
}
