import { protectPresentation } from "./navigation.js";

const dialog = document.querySelector("#character-presentation");
const heading = document.querySelector("#character-presentation-title");
const roles = document.querySelector("#character-presentation-roles");

export function presentCharacters(characters, title) {
    heading.textContent = title;
    roles.replaceChildren(...characters.filter(Boolean).map((character) => {
        const row = document.createElement("div");
        const label = document.createElement("strong");
        const ability = document.createElement("p");
        label.textContent = character.getName();
        ability.textContent = character.getAbility();
        row.append(character.drawToken(), label, ability);
        return row;
    }));
    dialog.showModal();
    protectPresentation(dialog);
}
document.querySelector("#character-presentation-return").addEventListener("click", () => dialog.close());
dialog.addEventListener("cancel", (event) => event.preventDefault());
dialog.addEventListener("close", () => {
    roles.replaceChildren();
    heading.textContent = "";
});
