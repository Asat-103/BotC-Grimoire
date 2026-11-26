import { identify } from "../utils/elements.js";

const colors = ["ink", "wine", "parchment"];

function appendFormatted(element, value) {
    element.replaceChildren();
    value.split(/(\*\*[^*]+\*\*)/).forEach((part) => {
        if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
            const strong = document.createElement("strong");
            strong.textContent = part.slice(2, -2);
            element.append(strong);
        } else {
            element.append(part);
        }
    });
}

export default class InfoToken {
    static setTemplates(templates) {
        this.templates = templates;
    }

    static setHolders(holders) {
        this.holders = holders;
    }

    static definition(input) {
        const value = typeof input === "string" ? { front: input } : input;
        if (!value || typeof value.front !== "string" || !value.front.trim()
            || value.front.length > 1200
            || (value.back != null && (typeof value.back !== "string" || value.back.length > 1200))) {
            return null;
        }
        return {
            front: value.front,
            back: value.back || "",
            color: colors.includes(value.color) ? value.color : "ink",
            favourite: value.favourite === true
        };
    }

    constructor({ raw, definition, markup, id, custom, colour } = {}) {
        this.id = id ? `info-token-${id}` : identify({}, "info-token-");
        this.definition = InfoToken.definition(definition ?? raw);
        this.markup = markup;
        this.custom = Boolean(custom);
        this.colour = colour;
        this.backVisible = false;
    }

    draw() {
        const { holders, templates } = InfoToken;
        const holder = this.custom ? holders.custom : holders.button;
        const trigger = templates.button.draw({
            ".js--info-token--button": (element) => {
                element.dataset.dialog = `#${this.id}`;
            }
        });
        this.trigger = trigger.firstElementChild;
        holder.append(trigger);
        const dialog = templates.dialog.draw({
            ".js--info-token--dialog": (element) => {
                element.id = this.id;
                if (this.colour) {
                    element.style.setProperty("--colour", `var(--${this.colour})`);
                }
            }
        });
        this.dialog = dialog.firstElementChild;
        holders.dialog.append(dialog);
        this.front = this.dialog.querySelector(".info-token__front");
        this.back = this.dialog.querySelector(".info-token__back");
        this.flip = this.dialog.querySelector(".info-token__flip");
        this.card = this.dialog.querySelector(".info-token__card");
        this.updateDefinition(this.definition);
        this.flip.addEventListener("click", () => this.flipSide());
        this.card.addEventListener("click", () => this.flipSide());
        this.dialog.addEventListener("cancel", (event) => event.preventDefault());
        this.dialog.addEventListener("close", () => this.setSide(false));
    }

    updateDefinition(definition) {
        this.definition = definition;
        if (definition) {
            appendFormatted(this.front, definition.front);
            appendFormatted(this.back, definition.back);
            this.dialog.dataset.color = definition.color;
        } else {
            // Built-in and translated token markup comes from the Twig catalogue.
            this.front.innerHTML = this.markup;
        }
        this.trigger.querySelector("button").textContent = this.front.textContent;
        this.flip.hidden = !definition?.back;
        this.card.classList.toggle("is-flippable", Boolean(definition?.back));
        this.setSide(false);
    }

    setSide(back) {
        this.backVisible = back;
        this.card.classList.toggle("is-flipped", back);
        this.front.setAttribute("aria-hidden", String(back));
        this.back.setAttribute("aria-hidden", String(!back));
        this.flip.setAttribute("aria-pressed", String(back));
        this.dialog.querySelector(".info-token__side").textContent = this.definition?.back
            ? (back ? WORKSPACE.sideBack : WORKSPACE.sideFront)
            : "";
    }

    flipSide() {
        if (this.definition?.back) {
            this.setSide(!this.backVisible);
        }
    }

    getDefinition() {
        return { ...this.definition };
    }

    remove() {
        this.dialog.remove();
        this.trigger.remove();
    }
}
