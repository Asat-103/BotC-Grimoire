import Observer from "../../classes/Observer.js";
import Store from "../../classes/Store.js";
import ReminderToken from "../../classes/ReminderToken.js";
import { makeUUID } from "../../utils/strings.js";
import Dialog from "../../classes/Dialog.js";
import TokenStore from "../../classes/TokenStore.js";
import {
    empty,
    identify,
    lookup,
    lookupOne,
    lookupOneCached
} from "../../utils/elements.js";

const tokenObserver = Observer.create("token");
const pad = lookupOneCached(".js--pad").pad;
const reminderList = lookupOneCached("#reminder-list");
const reminderListDialog = Dialog.create(reminderList);

const reminderSearch = lookupOne("#reminder-search");
reminderSearch.addEventListener("input", () => {
    const query = reminderSearch.value.trim().toLocaleLowerCase();
    lookup("#reminder-list__list li").forEach((item) => {
        item.hidden = !item.textContent.toLocaleLowerCase().includes(query);
    });
});
reminderListDialog.on(Dialog.HIDE, () => {
    reminderSearch.value = "";
    lookup("#reminder-list__list li[hidden]").forEach((item) => { item.hidden = false; });
    delete reminderList.dataset.coords;
    delete reminderList.dataset.owner;
});

function getCoords(element) {
    return JSON.parse(element.dataset.coords || "null");
}

function setOwner(reminder, player) {
    if (player && !player.playerDetails?.seatId) {
        pad.setPlayerDetails(player, { ...player.playerDetails, seatId: makeUUID() });
    }
    pad.setReminderOwner(reminder, player?.playerDetails?.seatId);
}
function addReminderQuick(target, tokenStore, coords, owner) {

    const button = target?.closest("[data-reminder-id]");

    if (!button) {
        return;
    }

    const clone = tokenStore.getReminderClone(button.dataset.reminderId);
    const {
        token
    } = pad.addReminder(clone);

    if (coords) {
        pad.moveToken(token, coords.x + 22, coords.y + 18);
    }
    if (owner) {
        setOwner(clone, pad.getCharacterByToken(document.getElementById(owner)));
    }

    reminderListDialog.hide();

}

function toggleReminder(target) {

    const button = target.closest("[data-reminder-id]");
    const checkbox = lookupOne(
        `.js--reminder-list--checkbox[value="${button?.dataset.reminderId}"]`
    );

    if (!button || !checkbox) {
        return;
    }

    checkbox.checked = !checkbox.checked;

}

TokenStore.ready((tokenStore) => {

    let isAddMultiple = false;

    // Add a reminder to the page if it's clicked from the list.
    lookupOneCached("#reminder-list__list").addEventListener("click", ({ target }) => {

        if (isAddMultiple) {
            toggleReminder(target);
        } else {

            addReminderQuick(target, tokenStore, getCoords(reminderList), reminderList.dataset.owner);
            reminderListDialog.hide();

        }

    });

    const multipleReminders = lookupOne("#multiple-reminders");
    const addAllReminders = lookupOne(".js--reminder-list--multiple");

    multipleReminders.addEventListener("change", () => {

        const isNowAddMultiple = multipleReminders.checked;

        isAddMultiple = isNowAddMultiple;
        addAllReminders.hidden = !isNowAddMultiple;

        if (!isNowAddMultiple) {

            lookup(".js--reminder-list--checkbox").forEach((checkbox) => {
                checkbox.checked = false;
            });

        }

    });

    addAllReminders.addEventListener("click", () => {

        const coords = getCoords(reminderList) || { x: 0, y: 0 };

        lookup(".js--reminder-list--checkbox:checked").forEach((checkbox) => {

            // TODO: replace this with a Positioner?
            coords.x += 15;
            coords.y += 15;
            addReminderQuick(
                lookupOne(`.js--reminder-list--button[data-reminder-id="${checkbox.value}"]`),
                tokenStore,
                coords,
                reminderList.dataset.owner
            );
            checkbox.checked = false;

        });

        reminderListDialog.hide();

    });

    const recentReminders = lookupOneCached("#character-show-reminders");

    // Add a reminder token to the page if the recently-added-reminder is clicked.
    recentReminders.addEventListener("click", ({ target }) => {

        addReminderQuick(target, tokenStore, getCoords(recentReminders), recentReminders.dataset.owner);
        Dialog.create(lookupOneCached("#character-show")).hide();

    });

    const reminderDialog = Dialog.create(lookupOne("#reminder-show"));
    const reminderHolder = lookupOne("#reminder-show-token");
    const ownerSelect = lookupOne("#reminder-owner");
    ownerSelect.addEventListener("change", () => {
        const token = lookupOne(reminderHolder.dataset.token);
        const reminder = pad.getReminderByToken(token);
        const player = pad.getCharacterByToken(document.getElementById(ownerSelect.value));
        if (reminder) {
            setOwner(reminder, player);
            if (player) {
                const { x, y } = pad.getTokenPosition(pad.getInfoByCharacter(player).token);
                pad.moveToken(token, x + 22, y + 18);
            }
        }
    });
    tokenObserver.on("token-drop", ({ detail: { token } }) => {
        const reminder = pad.getReminderByToken(token);
        if (!reminder || pad.element.dataset.layout !== "freeform") {
            return;
        }
        const bounds = token.getBoundingClientRect();
        const x = bounds.x + bounds.width / 2;
        const y = bounds.y + bounds.height / 2;
        const player = pad.characters.find(({ token: playerToken }) => {
            const rect = playerToken.getBoundingClientRect();
            return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
        });
        const owner = player?.character;
        if (reminder.owner || owner) {
            setOwner(reminder, owner);
        }
    });
    const store = Store.create("pocket-grimoire");
    function registerCustomReminder(definition) {
        const reminder = tokenStore.createReminder({
            id: definition.id,
            text: definition.text,
            name: "",
            image: "/build/img/roles/generic/good.webp",
            isGlobal: true
        }, 0);
        ReminderToken.addGlobal(reminder);
        return reminder;
    }
    store.data.customReminders.forEach(registerCustomReminder);
    lookupOne("#create-reminder").addEventListener("submit", (event) => {
        event.preventDefault();
        const input = event.currentTarget.elements.reminder;
        const text = input.value.trim();
        if (!text) {
            return;
        }
        const definition = { id: `customreminder${makeUUID()}`, text };
        const reminder = registerCustomReminder(definition);
        store.data.customReminders.push(definition);
        store.write();
        const row = reminder.drawList();
        const trigger = row.querySelector("button");
        lookupOne("#reminder-list__list").append(row);
        addReminderQuick(trigger, tokenStore, getCoords(reminderList), reminderList.dataset.owner);
        input.value = "";
    });

    // Populate the reminder dialog as a reminder is clicked.
    tokenObserver.on("reminder-click", ({ detail }) => {

        const {
            element
        } = detail;
        const reminder = pad.getReminderByToken(element);
        ownerSelect.replaceChildren(new Option(WORKSPACE.unassigned, ""));
        pad.characters.forEach(({ character, token }, index) => {
            const option = new Option(pad.getPlayerName(character) || `${WORKSPACE.seat} ${index + 1}`, identify(token));
            option.selected = Boolean(reminder.owner && reminder.owner === character.playerDetails?.seatId);
            ownerSelect.add(option);
        });

        empty(reminderHolder).append(reminder.drawToken());
        reminderHolder.dataset.token = `#${identify(element)}`;
        lookupOneCached("#reminder-show-orphan").hidden = (
            !element.classList.contains("is-orphan")
        );
        reminderDialog.show();

    });

    // Remove a reminder when its "remove" button is clicked.
    lookupOne("#reminder-remove").addEventListener("click", () => {

        const token = lookupOne(reminderHolder.dataset.token);

        if (!token) {
            return;
        }

        pad.removeReminderByToken(token);
        reminderDialog.hide();

    });

    const counts = Object.create(null);
    const list = lookupOneCached("#reminder-list__list");

    // If a character is added to the grimoire, make sure that its reminders are
    // visible in the list.
    tokenObserver.on("character-add", ({ detail }) => {

        const {
            character
        } = detail;
        const characterId = character.getId();

        if (!counts[characterId]) {
            counts[characterId] = 0;
        }

        counts[characterId] += 1;

        character.getReminders().forEach((reminder) => {

            lookupOne(
                `[data-reminder-id="${reminder.getId()}"]`,
                list
            )?.classList.add("is-in-play");

        });

    });

    // If a character is removed from the grimoire, and there are no other
    // copies of that character in the grimoire, hide its reminders.
    tokenObserver.on("character-remove", ({ detail }) => {

        const {
            character
        } = detail;
        const characterId = character.getId();

        if (counts[characterId]) {
            counts[characterId] -= 1;
        }

        if (!counts[characterId]) {

            character.getReminders().forEach((reminder) => {

                lookupOne(
                    `[data-reminder-id="${reminder.getId()}"]`,
                    list
                )?.classList.remove("is-in-play");

            });

        }

    });

    lookupOne("#show-all-reminders").addEventListener("change", ({ target }) => {
        list.classList.toggle("is-show-all", target.checked);
    });

});

reminderListDialog.on(Dialog.HIDE, ({ target }) => {
    target.removeAttribute("data-coords");
});
