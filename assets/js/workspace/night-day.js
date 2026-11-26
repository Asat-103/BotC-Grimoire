import Observer from "../classes/Observer.js";
import Store from "../classes/Store.js";
import { announceInput } from "../utils/elements.js";
import { getSeats, refreshWorkspace, saveWorkspace } from "./game.js";

const store = Store.create("pocket-grimoire");
const game = Observer.create("game");
const token = Observer.create("token");
const pad = document.querySelector(".js--pad").pad;
const number = document.querySelector("#night-number");
const carousel = document.querySelector(".js--night-order--carousel");
const swipe = document.querySelector("#night-order-swiped");
const stage = document.querySelector("#night-current");
const focusToggle = document.querySelector("#night-focus-toggle");
const manualList = document.querySelector("#night-manual-list");
const progress = document.querySelector("#night-progress");
const controls = {
    previous: document.querySelector("#night-previous"),
    next: document.querySelector("#night-next"),
    complete: document.querySelector("#night-complete"),
    skip: document.querySelector("#night-skip")
};
const completeLabel = controls.complete.textContent;
const reopenLabel = controls.complete.dataset.reopen;
const state = store.data.nightProgress || { number: 1, nights: {}, focus: false };
number.value = state.number;

function night() {
    return state.nights[state.number] ||= { current: "", status: {}, manual: [] };
}

function items() {
    const group = swipe.checked ? "#other-nights" : "#first-night";
    return [...document.querySelectorAll(`${group} [data-action-id]`), ...manualList.children];
}

function persistNight() {
    saveWorkspace("nightProgress", state);
    refreshWorkspace();
}

function renderNight() {
    const currentNight = night();
    const actions = items();
    const index = Math.max(0, actions.findIndex((item) => item.dataset.actionId === currentNight.current));
    const current = actions[index];
    actions.forEach((item) => {
        item.classList.toggle("is-current-action", item === current);
        item.dataset.nightStatus = currentNight.status[item.dataset.actionId] || "";
    });
    progress.max = Math.max(actions.length, 1);
    progress.value = actions.filter((item) => currentNight.status[item.dataset.actionId]).length;
    document.querySelector("#night-position").textContent = current
        ? `${index + 1} / ${actions.length} · ${progress.value} / ${actions.length} ${WORKSPACE.complete}`
        : WORKSPACE.emptyNight;
    stage.replaceChildren();
    if (current) {
        const card = document.createElement("div");
        card.className = "night-action";
        const content = current.matches(".night-order__item")
            ? [...current.children].map((child) => child.cloneNode(true))
            : [current.textContent];
        card.append(...content);
        const players = pad.getInfosByCharacterId(current.dataset.actionId);
        if (players.length) {
            const playerActions = document.createElement("div");
            playerActions.className = "folio-actions";
            players.forEach(({ character, token: element }) => {
                const button = document.createElement("button");
                button.type = "button";
                button.className = "button";
                button.textContent = pad.getPlayerName(character) || character.getName();
                button.addEventListener("click", () => token.trigger("character-click", { element }));
                playerActions.append(button);
            });
            card.append(playerActions);
        }
        if (current.dataset.nightStatus) {
            const status = document.createElement("p");
            status.textContent = current.dataset.nightStatus === "skipped" ? WORKSPACE.skipped : WORKSPACE.complete;
            card.append(status);
        }
        stage.append(card);
    }
    controls.previous.disabled = !current || index === 0;
    controls.next.disabled = !current || index >= actions.length - 1;
    controls.complete.disabled = controls.skip.disabled = !current;
    controls.complete.textContent = current?.dataset.nightStatus ? reopenLabel : completeLabel;
    carousel.hidden = manualList.hidden = state.focus;
    focusToggle.setAttribute("aria-pressed", String(state.focus));
}

function move(offset, status) {
    const actions = items();
    const currentNight = night();
    const index = Math.max(0, actions.findIndex((item) => item.dataset.actionId === currentNight.current));
    if (!actions[index]) {
        return;
    }
    const id = actions[index].dataset.actionId;
    if (status === "complete" && currentNight.status[id]) {
        delete currentNight.status[id];
        offset = 0;
    } else if (status) {
        currentNight.status[id] = status;
    }
    currentNight.current = (actions[index + offset] || actions[index]).dataset.actionId;
    persistNight();
    renderNight();
}
controls.previous.addEventListener("click", () => move(-1));
controls.next.addEventListener("click", () => move(1));
controls.complete.addEventListener("click", () => move(1, "complete"));
controls.skip.addEventListener("click", () => move(1, "skipped"));

function showNight(other) {
    swipe.checked = other;
    carousel.dataset.night = other ? "other" : "first";
    document.querySelector("#night-first").setAttribute("aria-pressed", String(!other));
    document.querySelector("#night-other").setAttribute("aria-pressed", String(other));
    renderNight();
}
function setNumber(value) {
    state.number = Math.min(99, Math.max(1, Number(value) || 1));
    number.value = state.number;
    renderManual();
    showNight(state.number !== 1);
    persistNight();
}
number.addEventListener("change", () => setNumber(number.value));
document.querySelector("#night-first").addEventListener("click", () => setNumber(1));
document.querySelector("#night-other").addEventListener("click", () => setNumber(Math.max(2, state.number)));
focusToggle.addEventListener("click", () => {
    state.focus = !state.focus;
    persistNight();
    renderNight();
});
function jumpTo(event) {
    const item = event.target.closest("[data-action-id]");
    if (item) {
        night().current = item.dataset.actionId;
        persistNight();
        renderNight();
    }
}
[carousel, manualList].forEach((list) => {
    list.addEventListener("click", jumpTo);
    list.addEventListener("keydown", (event) => {
        if (["Enter", " "].includes(event.key) && event.target.matches("[data-action-id]")) {
            event.preventDefault();
            jumpTo(event);
        }
    });
});

function renderManual() {
    manualList.replaceChildren();
    night().manual.forEach(({ id, label }) => {
        const item = document.createElement("li");
        item.className = "folio-record";
        item.textContent = label;
        item.dataset.actionId = id;
        item.tabIndex = 0;
        manualList.append(item);
    });
}
document.querySelector("#night-manual").addEventListener("submit", (event) => {
    event.preventDefault();
    const input = event.target.elements.action;
    if (input.value.trim()) {
        night().manual.push({ id: `manual-${Date.now()}`, label: input.value.trim() });
        input.value = "";
        persistNight();
        renderManual();
        renderNight();
    }
});

new MutationObserver(() => {
    carousel.querySelectorAll("[data-action-id]").forEach((item) => { item.tabIndex = 0; });
    renderNight();
}).observe(carousel, { childList: true, subtree: true });
game.on("inputs-repopulated", () => showNight(state.number !== 1));
document.querySelector("#folio").addEventListener("workspace-view", ({ detail }) => {
    if (detail === "night") {
        renderNight();
    }
});
renderManual();
showNight(state.number !== 1);
["#show-all", "#show-dead"].forEach((selector) => announceInput(document.querySelector(selector)));

const day = document.querySelector("#day-number");
const minutes = document.querySelector("#timer-minutes");
const clock = document.querySelector("#timer-clock");
const timer = store.data.dayTimer || { day: 1, minutes: 5, remaining: 300000, endsAt: 0 };
day.value = timer.day;
minutes.value = timer.minutes;
let interval;

function remaining() {
    return timer.endsAt ? Math.max(0, timer.endsAt - Date.now()) : timer.remaining;
}

function renderTimer() {
    const duration = remaining();
    const seconds = Math.ceil(duration / 1000);
    clock.value = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
    if (!duration) {
        clearInterval(interval);
    }
}

function persistTimer() {
    saveWorkspace("dayTimer", timer);
    clearInterval(interval);
    if (timer.endsAt && remaining()) {
        interval = setInterval(renderTimer, 250);
    }
    renderTimer();
}

document.querySelector("#timer-start").addEventListener("click", () => {
    if (!timer.endsAt || !remaining()) {
        timer.endsAt = Date.now() + (timer.remaining || timer.minutes * 60000);
        persistTimer();
    }
});
document.querySelector("#timer-pause").addEventListener("click", () => {
    timer.remaining = remaining();
    timer.endsAt = 0;
    persistTimer();
});
function resetTimer() {
    timer.minutes = Math.min(180, Math.max(1, Number(minutes.value) || 5));
    minutes.value = timer.minutes;
    timer.remaining = timer.minutes * 60000;
    timer.endsAt = 0;
    persistTimer();
}
document.querySelector("#timer-reset").addEventListener("click", resetTimer);
minutes.addEventListener("change", resetTimer);
day.addEventListener("change", () => {
    timer.day = Math.min(99, Math.max(1, Number(day.value) || 1));
    day.value = timer.day;
    persistTimer();
    renderNominations();
});
persistTimer();

const nominationForm = document.querySelector("#nomination-form");
const nominationHistory = document.querySelector("#nomination-history");
const nominationRecord = store.data.nominations || {};
function renderNominations() {
    const entries = nominationRecord[timer.day] || [];
    nominationHistory.replaceChildren();
    document.querySelector("#nomination-highest").textContent = entries.length
        ? `${nominationHistory.dataset.highest} ${Math.max(...entries.map(({ votes }) => votes))}`
        : "";
    entries.forEach(({ nominee, votes, executed }, index) => {
        const row = document.createElement("li");
        row.className = "folio-record";
        row.textContent = `${nominee} · ${votes}${executed ? ` · ${nominationHistory.dataset.executed}` : ""}`;
        const remove = document.createElement("button");
        remove.className = "button";
        remove.type = "button";
        remove.textContent = WORKSPACE.remove;
        remove.addEventListener("click", () => {
            if (confirm(WORKSPACE.removeConfirm)) {
                entries.splice(index, 1);
                saveWorkspace("nominations", nominationRecord);
                renderNominations();
            }
        });
        row.append(remove);
        nominationHistory.append(row);
    });
}
nominationForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const values = new FormData(nominationForm);
    const nominee = values.get("nominee").trim();
    if (nominee) {
        const entries = nominationRecord[timer.day] ||= [];
        entries.push({ nominee, votes: Number(values.get("votes")), executed: values.has("executed") });
        saveWorkspace("nominations", nominationRecord);
        nominationForm.reset();
        renderNominations();
    }
});
document.querySelector("#folio").addEventListener("workspace-view", ({ detail }) => {
    if (detail === "tools") {
        document.querySelector("#nomination-players").replaceChildren(...getSeats().map((name) => new Option(name)));
    }
});
renderNominations();
