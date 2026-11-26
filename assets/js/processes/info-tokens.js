import Template from "../classes/Template.js";
import InfoToken from "../classes/InfoToken.js";
import Observer from "../classes/Observer.js";
import Dialog from "../classes/Dialog.js";
import Store from "../classes/Store.js";

const buttonHolder = document.querySelector("#info-token-button-holder");
const customHolder = document.querySelector("#info-token-custom-holder");
const dialogHolder = document.querySelector("#info-token-dialog-holder");
const editor = Dialog.create(document.querySelector("#info-token-editor"));
const form = document.querySelector("#info-editor-form");
const observer = Observer.create("info-token");
const store = Store.create("pocket-grimoire");
let editing = null;

InfoToken.setTemplates({
    button: Template.create(document.querySelector("#info-token-button-template")),
    dialog: Template.create(document.querySelector("#info-token-dialog-template"))
});
InfoToken.setHolders({ button: buttonHolder, custom: customHolder, dialog: dialogHolder });

JSON.parse(buttonHolder.dataset.infoTokens).forEach((data) => new InfoToken(data).draw());

function add(definition) {
    const token = new InfoToken({ definition, custom: true });
    token.draw();
    observer.trigger("info-token-added", { token });
}

function edit(token = null) {
    editing = token;
    form.reset();
    if (token) {
        const definition = token.getDefinition();
        form.elements.front.value = definition.front;
        form.elements.back.value = definition.back;
        form.elements.color.value = definition.color;
        form.elements.frontArt.value = definition.frontArt;
        form.elements.backArt.value = definition.backArt;
        form.elements.favourite.checked = definition.favourite;
    }
    editor.show();
}

function preview(definition) {
    const token = new InfoToken({ definition });
    token.draw();
    token.trigger.hidden = true;
    token.dialog.addEventListener("close", () => token.remove(), { once: true });
    Dialog.create(token.dialog).show();
}

form.addEventListener("submit", (event) => {
    event.preventDefault();
    const fields = new FormData(form);
    const definition = InfoToken.definition({
        front: fields.get("front"),
        back: fields.get("back"),
        color: fields.get("color"),
        frontArt: fields.get("frontArt"),
        backArt: fields.get("backArt"),
        favourite: fields.has("favourite")
    });
    if (!definition) {
        return;
    }
    if (event.submitter.id === "preview-info-token") {
        preview(definition);
        return;
    }
    if (editing) {
        editing.updateDefinition(definition);
        observer.trigger("info-token-updated", { token: editing });
    } else {
        add(definition);
    }
    editor.hide();
});
document.querySelector("#add-info-token").addEventListener("click", () => edit());

function manage(token, label, action) {
    const control = document.createElement("button");
    control.type = "button";
    control.className = "button";
    control.textContent = label;
    control.addEventListener("click", action);
    token.trigger.querySelector(".info-library__actions").append(control);
}

function markFavourite(token) {
    token.trigger.classList.toggle("is-favourite", token.getDefinition().favourite);
    token.trigger.querySelector("[data-favourite]").setAttribute("aria-pressed", String(token.getDefinition().favourite));
}

observer.on("info-token-added", ({ detail: { token } }) => {
    token.trigger.className = "info-library__entry";
    const actions = document.createElement("div");
    actions.className = "info-library__actions";
    token.trigger.append(actions);
    manage(token, WORKSPACE.edit, () => edit(token));
    manage(token, WORKSPACE.duplicate, () => add(token.getDefinition()));
    manage(token, WORKSPACE.favourite, () => {
        const definition = token.getDefinition();
        token.updateDefinition({ ...definition, favourite: !definition.favourite });
        observer.trigger("info-token-updated", { token });
    });
    actions.lastElementChild.dataset.favourite = "";
    markFavourite(token);
    [[WORKSPACE.earlier, -1], [WORKSPACE.later, 1]].forEach(([label, offset]) => {
        manage(token, label, () => {
            const sibling = offset < 0 ? token.trigger.previousElementSibling : token.trigger.nextElementSibling;
            if (sibling?.matches(".info-library__entry")) {
                if (offset < 0) {
                    sibling.before(token.trigger);
                } else {
                    sibling.after(token.trigger);
                }
                store.moveInfoToken(token, offset);
            }
        });
    });
    manage(token, WORKSPACE.remove, () => {
        if (confirm(WORKSPACE.removeConfirm)) {
            token.remove();
            observer.trigger("info-token-deleted", { token });
        }
    });
});
observer.on("info-token-updated", ({ detail: { token } }) => markFavourite(token));

document.querySelector("#export-info-tokens").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(store.data.infoTokens.map(InfoToken.definition).filter(Boolean), null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "information-tokens.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
});
document.querySelector("#import-info-tokens").addEventListener("change", ({ target }) => {
    const [file] = target.files;
    if (!file) {
        return;
    }
    target.value = "";
    file.text().then((contents) => {
        const data = JSON.parse(contents);
        if (!Array.isArray(data) || data.length > 100 || data.some((entry) => !InfoToken.definition(entry))) {
            throw new Error("Invalid information token library");
        }
        data.forEach((entry) => add(InfoToken.definition(entry)));
    }).catch(() => alert(WORKSPACE.badImport));
});
["message", "number"].forEach((field) => {
    document.querySelector(`#quick-${field}-form`).addEventListener("submit", (event) => {
        event.preventDefault();
        const definition = InfoToken.definition(event.currentTarget.elements[field].value);
        if (definition) {
            preview(definition);
        }
    });
});
document.querySelectorAll("[data-quick-info]").forEach((button) => {
    button.addEventListener("click", () => preview(InfoToken.definition(button.dataset.quickInfo)));
});
