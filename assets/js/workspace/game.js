import Observer from "../classes/Observer.js";
import TokenStore from "../classes/TokenStore.js";
import Store from "../classes/Store.js";
import { announceInput } from "../utils/elements.js";
import { readLocal, showView } from "./navigation.js";

const game = Observer.create("game");
const token = Observer.create("token");
const store = Store.create("pocket-grimoire");
const padElement = document.querySelector(".js--pad");
const pad = padElement.pad;
const sessionsKey = "pg-saved-games";
const seatingInput = document.querySelector("#seating-names");
const seatingList = document.querySelector("#seating-list");
const assignedPlayers = document.querySelector("#assigned-players");
const roleSearch = document.querySelector("#script-search");
const currentEdition = document.querySelector("#current-edition");
const resume = document.querySelector("#resume-session");
const newSession = document.querySelector("#new-session");
const playerCount = document.querySelector("#player-count");
const seatingCount = document.querySelector("#seating-count");
function syncCount() {
    seatingCount.max = playerCount.max;
    seatingCount.min = playerCount.min;
    seatingCount.value = playerCount.value;
}
seatingCount.addEventListener("change", () => {
    if (seatingCount.value && seatingCount.checkValidity()) {
        playerCount.value = seatingCount.value;
        announceInput(playerCount);
    } else {
        syncCount();
    }
});
playerCount.addEventListener("input", syncCount);
const layout = document.querySelector("#board-layout");
let scriptRoles = [];
const libraryKey = "pg-script-library";
const librarySearch = document.querySelector("#library-search");
const favouriteScript = document.querySelector("#favourite-script");
let selectedScript;
let library = readLocal(libraryKey, []);
if (!Array.isArray(library)) {
    library = [];
}
let seats = Array.isArray(store.get().seats) ? store.get().seats : [];

export function getSeats() {
    return seats.slice();
}

export function saveWorkspace(key, value) {
    store.data[key] = value;
    store.write();
}

function button(label, action) {
    const element = document.createElement("button");
    element.type = "button";
    element.className = "button";
    element.textContent = label;
    element.addEventListener("click", action);
    return element;
}

function text(parent, value, tag = "p") {
    const element = document.createElement(tag);
    element.textContent = value;
    parent.append(element);
    return element;
}

function setSeats(names) {
    seats = names;
    saveWorkspace("seats", seats);
    if (seats.length >= Number(playerCount.min) && seats.length <= Number(playerCount.max)) {
        playerCount.value = seats.length;
        announceInput(playerCount);
    }
    renderSeating();
    refreshWorkspace();
}

function renderSeating() {
    seatingInput.value = seats.join("\n");
    seatingList.replaceChildren();
    if (!seats.length) {
        text(seatingList, WORKSPACE.noSeats, "li");
    }
    seats.forEach((name, index) => {
        const row = text(seatingList, name, "li");
        row.className = "folio-record";
        const move = (destination) => {
            const updated = getSeats();
            updated.splice(destination, 0, updated.splice(index, 1)[0]);
            setSeats(updated);
            seatingList.children[destination]?.querySelector("button:not(:disabled)")?.focus();
        };
        const controls = document.createElement("div");
        const earlier = button(WORKSPACE.earlier, () => move(index - 1));
        earlier.disabled = index === 0;
        const later = button(WORKSPACE.later, () => move(index + 1));
        later.disabled = index === seats.length - 1;
        controls.append(earlier, later, button(WORKSPACE.remove, () => setSeats(seats.filter((_, i) => i !== index))));
        row.append(controls);
        row.draggable = true;
        row.addEventListener("dragstart", (event) => event.dataTransfer.setData("application/x-pg-seat", String(index)));
        row.addEventListener("dragover", (event) => event.preventDefault());
        row.addEventListener("drop", (event) => {
            const source = event.dataTransfer.getData("application/x-pg-seat");
            if (source === "" || Number(source) === index) {
                return;
            }
            event.preventDefault();
            const updated = getSeats();
            updated.splice(index, 0, updated.splice(Number(source), 1)[0]);
            setSeats(updated);
        });
    });
}
document.querySelector("#apply-seats").addEventListener("click", () => {
    setSeats(seatingInput.value.split(/\r?\n/).map((name) => name.trim()).filter(Boolean).slice(0, 30));
});
document.querySelector("#number-seats").addEventListener("click", () => {
    setSeats(Array.from({ length: Number(playerCount.value) }, (_, index) => `${WORKSPACE.seat} ${index + 1}`));
});
document.querySelector("#reverse-seats").addEventListener("click", () => setSeats(getSeats().reverse()));
document.querySelector("#reuse-seats").addEventListener("click", () => {
    const last = getArchives()[0];
    if (last?.data.seats?.length) {
        setSeats(last.data.seats.slice());
    }
});

function orderedCharacters() {
    const seatIndex = (character) => {
        const index = seats.indexOf(pad.getPlayerName(character));
        return index < 0 ? seats.length : index;
    };
    return [...pad.characters].sort((a, b) => seatIndex(a.character) - seatIndex(b.character));
}

function renderPlayers() {
    const hasGame = Boolean(store.data.characters?.characters?.length || pad.characters.length);
    resume.hidden = newSession.hidden = !hasGame;
    document.querySelector("#current-game-meta").textContent = hasGame
        ? `${WORKSPACE.night} ${store.data.nightProgress?.number || 1} · ${pad.characters.length || seats.length || playerCount.value} ${I18N.players}`
        : "";
    document.querySelectorAll("[data-activate]").forEach((control) => {
        control.disabled = document.getElementById(control.dataset.activate)?.disabled ?? false;
    });
    document.querySelector("#board-empty").hidden = Boolean(pad.characters.length || pad.reminders.length);
    assignedPlayers.replaceChildren();
    if (!pad.characters.length) {
        text(assignedPlayers, WORKSPACE.noRoles);
    }
    orderedCharacters().forEach(({ character, token }) => {
        const row = button("", () => token.click());
        row.className = "folio-player-row";
        const name = pad.getPlayerName(character) || WORKSPACE.unassigned;
        row.append(character.drawToken());
        const label = document.createElement("span");
        text(label, name, "strong");
        const alignment = character.playerDetails?.alignment;
        const dead = character.getIsDead();
        text(label, [
            character.getName(),
            alignment && (alignment === "good" ? I18N.goodTeam : I18N.evilTeam),
            dead && WORKSPACE.dead,
            dead && !character.getHasGhostVote() && WORKSPACE.spentVote
        ].filter(Boolean).join(" · "), "small");
        row.append(label);
        assignedPlayers.append(row);
    });
    layoutBoard();
}

let playerRenderScheduled = false;
export function refreshWorkspace() {
    if (!playerRenderScheduled) {
        playerRenderScheduled = true;
        requestAnimationFrame(() => {
            playerRenderScheduled = false;
            renderPlayers();
        });
    }
}

["character-add", "character-remove", "set-player-name", "shroud-toggle", "ghost-vote-toggle", "player-details", "reminder-add", "reminder-remove", "reminder-owner"].forEach((event) => {
    token.on(event, refreshWorkspace);
});

function renderLibrary() {
    const holder = document.querySelector("#script-library");
    const filter = librarySearch.value.trim().toLocaleLowerCase();
    const entries = library.filter(({ name }) => name.toLocaleLowerCase().includes(filter))
        .sort((a, b) => Number(b.favourite) - Number(a.favourite));
    holder.replaceChildren();
    favouriteScript.hidden = !selectedScript;
    favouriteScript.setAttribute("aria-pressed", String(Boolean(library.find((entry) => entry.id === selectedScript?.id)?.favourite)));
    if (!entries.length) {
        text(holder, WORKSPACE.noScripts);
    }
    entries.forEach((entry) => {
        const row = text(holder, entry.name, "div");
        row.className = "folio-record";
        const actions = document.createElement("div");
        actions.append(button(WORKSPACE.restore, () => {
            TokenStore.ready((tokenStore) => {
                const characters = entry.characters.map((role) => typeof role === "string"
                    ? tokenStore.getCharacter(role)
                    : tokenStore.getOfficialCharacter(role.id) || tokenStore.createCustomCharacter(role)).filter(Boolean);
                game.trigger("characters-selected", { meta: entry.meta, game: entry.game, characters });
                showView("players", true);
            });
        }));
        const favourite = button(WORKSPACE.favourite, () => toggleFavourite(entry));
        favourite.setAttribute("aria-pressed", String(entry.favourite));
        actions.append(favourite);
        row.append(actions);
        holder.append(row);
    });
}
function saveLibrary() {
    try {
        localStorage.setItem(libraryKey, JSON.stringify(library));
    } catch {
        // Recent scripts remain available for the current page.
    }
    renderLibrary();
}
function toggleFavourite(script) {
    const entry = library.find(({ id }) => id === script.id);
    if (entry) {
        entry.favourite = !entry.favourite;
        saveLibrary();
    }
}
librarySearch.addEventListener("input", renderLibrary);
favouriteScript.addEventListener("click", () => toggleFavourite(selectedScript));

function renderScriptHeading(meta) {
    const heading = document.querySelector("#reference-title");
    const badge = heading.querySelector(".folio-script-title__art span");
    const image = heading.querySelector("img");
    const title = currentEdition.textContent;
    heading.hidden = !scriptRoles.length;
    heading.querySelector("h2").textContent = title;
    badge.textContent = [...title.toLocaleUpperCase()].slice(0, 2).join("");
    badge.hidden = false;
    image.hidden = true;
    image.removeAttribute("src");
    const candidate = meta?.logo || meta?.image;
    if (typeof candidate !== "string" || !candidate) {
        return;
    }
    try {
        const source = new URL(candidate, location.href);
        if (source.protocol === "https:" || (source.protocol === "http:" && source.origin === location.origin)) {
            image.referrerPolicy = "no-referrer";
            image.onload = () => {
                image.hidden = false;
                badge.hidden = true;
            };
            image.src = source.href;
        }
    } catch {
        // Keep the title initials when imported artwork has no valid URL.
    }
}

function renderScript() {
    const reference = document.querySelector("#script-reference");
    const query = roleSearch.value.trim().toLocaleLowerCase();
    const groups = Object.groupBy
        ? Object.groupBy(scriptRoles, (role) => role.getTeam())
        : scriptRoles.reduce((result, role) => {
            (result[role.getTeam()] ||= []).push(role);
            return result;
        }, Object.create(null));
    reference.replaceChildren();
    Object.entries(groups).forEach(([team, roles]) => {
        const matches = roles.filter((role) => `${role.getName()} ${role.getAbility()}`.toLocaleLowerCase().includes(query));
        if (!matches.length) {
            return;
        }
        const section = document.createElement("section");
        section.className = "folio-role-group";
        text(section, reference.dataset[team] || team, "h2");
        matches.forEach((role) => {
            const details = document.createElement("details");
            const summary = text(details, role.getName(), "summary");
            summary.prepend(role.drawToken());
            text(details, role.getAbility());
            [role.getFirstNightReminder(), role.getOtherNightReminder()].filter(Boolean).forEach((instruction) => {
                text(details, instruction.replace(/:[a-z0-9_-]+:/gi, ""), "small");
            });
            role.getJinxes().forEach((jinx) => {
                const opponent = jinx.getTrick();
                if (opponent && scriptRoles.some((entry) => entry.getId() === opponent.getId())) {
                    text(details, `${opponent.getName()} · ${jinx.getReason()}`, "small");
                }
            });
            role.getReminders().forEach((reminder) => text(details, [reminder.getCharacterName(), reminder.getText()].filter(Boolean).join(" · "), "small"));
            section.append(details);
        });
        reference.append(section);
    });
    if (!reference.childElementCount) {
        text(reference, WORKSPACE.noRoles);
    }
}

roleSearch.addEventListener("input", renderScript);
game.on("characters-selected", ({ detail }) => {
    scriptRoles = detail.characters;
    syncCount();
    currentEdition.textContent = typeof detail.meta?.name === "string" && detail.meta.name.trim()
        ? detail.meta.name
        : document.querySelector("#select-edition").textContent;
    renderScriptHeading(detail.meta);
    const wasSelecting = document.querySelector("#edition-list").open;
    const characters = detail.characters.map((role) => role.isCustom() ? role.getAllData() : role.getId());
    if (characters.length) {
        const name = currentEdition.textContent;
        const id = JSON.stringify([name, detail.game, characters.map((role) => typeof role === "string" ? role : role.id)]);
        const favourite = library.some((entry) => entry.id === id && entry.favourite);
        selectedScript = { id, name, characters, meta: detail.meta, game: detail.game, favourite };
        library = [selectedScript, ...library.filter((entry) => entry.id !== id)];
        const recent = library.filter((entry) => !entry.favourite).slice(0, 12);
        library = library.filter((entry) => entry.favourite || recent.includes(entry));
        saveLibrary();
    }
    refreshWorkspace();
    renderScript();
    if (wasSelecting) {
        showView("players", true);
    }
});
document.querySelector("#character-search").addEventListener("input", ({ target }) => {
    const query = target.value.trim().toLocaleLowerCase();
    document.querySelectorAll(".js--character-select").forEach((item) => {
        item.hidden = !item.textContent.toLocaleLowerCase().includes(query);
    });
});
game.on("characters-selected", () => {
    document.querySelector("#character-search").value = "";
});

function getArchives() {
    const saved = readLocal(sessionsKey, []);
    return Array.isArray(saved) ? saved : [];
}
function archiveCurrent(archives) {
    const current = store.get();
    if (current.characters?.characters?.length || current.tokens?.length) {
        archives.unshift({
            id: Date.now(),
            title: currentEdition.textContent,
            data: current
        });
    }
}
function activateSession(saved) {
    const archives = getArchives().filter(({ id }) => id !== saved?.id);
    const current = store.get();
    archiveCurrent(archives);
    const shared = { customReminders: current.customReminders, infoTokens: current.infoTokens, names: current.names, version: current.version, user: current.user };
    try {
        const previousArchives = localStorage.getItem(sessionsKey);
        localStorage.setItem(sessionsKey, JSON.stringify(archives));
        try {
            localStorage.setItem(store.key, JSON.stringify({ ...(saved?.data || {}), ...shared }));
        } catch (error) {
            if (previousArchives === null) {
                localStorage.removeItem(sessionsKey);
            } else {
                localStorage.setItem(sessionsKey, previousArchives);
            }
            throw error;
        }
        history.replaceState(null, "");
        location.reload();
    } catch {
        alert(WORKSPACE.saveError);
    }
}
newSession.addEventListener("click", () => {
    if (confirm(WORKSPACE.newConfirm)) {
        activateSession();
    }
});
function renderArchives() {
    const holder = document.querySelector("#saved-sessions");
    holder.replaceChildren();
    const archives = getArchives();
    document.querySelector("#reuse-seats").disabled = !archives[0]?.data.seats?.length;
    if (!archives.length) {
        text(holder, WORKSPACE.noSessions);
    }
    archives.forEach((saved) => {
        const row = text(holder, saved.title, "div");
        row.className = "folio-record";
        const actions = document.createElement("div");
        actions.append(
            button(WORKSPACE.restore, () => {
                if (confirm(WORKSPACE.restoreConfirm)) {
                    activateSession(saved);
                }
            }),
            button(WORKSPACE.remove, () => {
                if (confirm(WORKSPACE.removeConfirm)) {
                    try {
                        localStorage.setItem(sessionsKey, JSON.stringify(getArchives().filter(({ id }) => id !== saved.id)));
                        renderArchives();
                    } catch {
                        alert(WORKSPACE.saveError);
                    }
                }
            })
        );
        row.append(actions);
    });
}

function layoutBoard() {
    if (padElement.closest("[data-panel]").hidden) {
        return;
    }
    const mode = layout.value;
    padElement.dataset.layout = mode;
    const width = padElement.clientWidth;
    const tile = Math.max(102, (pad.characters[0]?.token.getBoundingClientRect().width || 80) + 20);
    const columns = Math.max(1, Math.floor(width / tile));
    const rows = Math.ceil(pad.characters.length / columns);
    const radius = Math.max(tile, pad.characters.length * tile / (2 * Math.PI));
    const diameter = radius * 2 + tile;
    padElement.style.setProperty("--board-height", mode === "circle"
        ? `${Math.max(380, diameter)}px`
        : `${Math.max(270, rows * tile + 35)}px`);
    const ownerPositions = new Map();
    orderedCharacters().forEach(({ token, character }, index) => {
        token.style.order = index;
        const angle = index / pad.characters.length * 2 * Math.PI - Math.PI / 2;
        const x = mode === "circle"
            ? Math.max(width / 2, diameter / 2) - tile / 2 + Math.cos(angle) * radius
            : (index % columns) * tile + 12;
        const y = mode === "circle"
            ? Math.max(190, diameter / 2) - tile / 2 + Math.sin(angle) * radius
            : Math.floor(index / columns) * tile + 16;
        token.style.setProperty("--layout-left", `${x}px`);
        token.style.setProperty("--layout-top", `${y}px`);
        if (character.playerDetails?.seatId) {
            ownerPositions.set(character.playerDetails.seatId, { x, y, count: 0 });
        }
    });
    pad.reminders.forEach(({ reminder, token }) => {
        const owner = ownerPositions.get(reminder.owner);
        token.classList.toggle("is-assigned-reminder", Boolean(owner));
        if (owner) {
            token.style.setProperty("--layout-left", `${owner.x + 22 + owner.count * 14}px`);
            token.style.setProperty("--layout-top", `${owner.y + 22 + owner.count * 8}px`);
            owner.count += 1;
        }
    });
}
layout.value = store.get().boardLayout || "freeform";
layout.addEventListener("change", () => {
    saveWorkspace("boardLayout", layout.value);
    layoutBoard();
});
document.querySelector("#fit-board").addEventListener("click", () => {
    padElement.style.height = "";
    padElement.scrollTo(0, 0);
    if (layout.value === "freeform") {
        layout.value = "grid";
        layout.dispatchEvent(new Event("change"));
    }
    layoutBoard();
});
document.querySelector("#folio").addEventListener("workspace-view", ({ detail }) => {
    if (detail === "grimoire") {
        pad.updatePositioner({ container: true, tokens: true });
    }
    refreshWorkspace();
});
document.querySelector("#token-size").addEventListener("input", layoutBoard);
window.addEventListener("resize", layoutBoard);
syncCount();
renderSeating();
renderArchives();
renderLibrary();
renderPlayers();
