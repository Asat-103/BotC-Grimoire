import Store from "../../classes/Store.js";
import Observer from "../../classes/Observer.js";
import Dialog from "../../classes/Dialog.js";
import TokenStore from "../../classes/TokenStore.js";
import Template from "../../classes/Template.js";
import {
    empty,
    lookupOne,
    lookupOneCached,
    replaceContentsMany
} from "../../utils/elements.js";
import {
    shuffle
} from "../../utils/arrays.js";

const gameObserver = Observer.create("game");
const characterDecisionDialog = Dialog.create(lookupOne("#character-decision"));
const playerName = lookupOne("#player-name");
const concealedRoles = new WeakMap();

gameObserver.on("character-draw", ({ detail }) => {

    if (detail.mode && detail.mode !== "bag" || detail.isShowAll) {
        return;
    }

    const template = Template.create(
        lookupOneCached("#character-choice-template")
    );

    replaceContentsMany(
        lookupOneCached("#character-choice-wrapper"),
        shuffle(detail.characters)
            .map((character, i) => template.draw({
                "[data-id]"(element) {
                    concealedRoles.set(element, character);
                },
                ".js--character-choice--number"(element) {
                    element.textContent = i + 1;
                }
            }))
    );

    Dialog.create(lookupOneCached("#character-choice")).show();

});

gameObserver.on("character-draw", ({ detail }) => {

    if (!detail.isShowAll) {
        return;
    }

    lookupOneCached("#grimoire").open = true;

    TokenStore.ready((tokenStore) => {

        const seats = Store.create("pocket-grimoire").data.seats || [];
        detail.characters.forEach((character, index) => {

            gameObserver.trigger("character-drawn", {
                character: character.clone(),
                isAutoAdd: true,
                name: seats[index]
            });

        });

    });

});

lookupOneCached("#character-choice").addEventListener("click", ({ target }) => {

    const element = target.closest("[data-id]");

    if (!element || element.disabled) {
        return;
    }

    const role = concealedRoles.get(element);
    if (role) {
        gameObserver.trigger("character-drawn", { element, character: role.clone() });
    }

});

gameObserver.on("character-drawn", ({ detail }) => {

    const {
        element
    } = detail;

    if (element) {
        element.disabled = true;
    }

});

gameObserver.on("character-drawn", ({ detail }) => {

    const {
        isAutoAdd,
        character
    } = detail;

    if (isAutoAdd) {
        return;
    }

    empty(lookupOneCached("#character-decision-wrapper")).append(
        character.drawToken()
    );
    lookupOneCached("#character-decision-ability").textContent = (
        character.getAbility()
    );
    characterDecisionDialog.show();

});

// Allow a name to be set when the character is revealed.
// We do this by checking to see if a name was entered when the "remember your
// character" dialog is closed, using it if it was.

let character = null;

gameObserver.on("character-drawn", ({ detail }) => {
    character = detail.character;
});

characterDecisionDialog.on(Dialog.SHOW, () => {
    const seat = lookupOneCached(".js--pad").pad.characters.length - 1;
    playerName.value = Store.create("pocket-grimoire").data.seats?.[seat] || playerName.defaultValue;
});

characterDecisionDialog.getElement().addEventListener("cancel", (event) => event.preventDefault());

characterDecisionDialog.on(Dialog.HIDE, () => {
    empty(lookupOneCached("#character-decision-wrapper"));
    lookupOneCached("#character-decision-ability").textContent = "";

    const {
        pad
    } = lookupOneCached(".js--pad");
    const {
        value
    } = playerName;
    const trimmed = (value || "").trim();

    if (pad && trimmed && character) {
        pad.setPlayerName(character, trimmed);
    }

    character = null;

});

lookupOne("#character-decision-form").addEventListener("submit", (e) => {
    e.preventDefault();
    characterDecisionDialog.hide();
});
