import Observer from "../classes/Observer.js";
import { shuffle } from "../utils/arrays.js";
import { getSeats } from "./game.js";
import { protectPresentation } from "./navigation.js";

const dialog = document.querySelector("#seat-distribution");
const labels = document.querySelector("#distribution-labels").dataset;
const heading = document.querySelector("#distribution-heading");
const roleHolder = document.querySelector("#distribution-role");
const manualHolder = document.querySelector("#distribution-manual");
const advance = document.querySelector("#distribution-advance");
const stop = document.querySelector("#distribution-stop");
const game = Observer.create("game");

let names = [];
let roles = [];
let index = 0;
let stage = "";

function commit(role, name) {
    game.trigger("character-drawn", { character: role.clone(), isAutoAdd: true, name });
}

function renderHandoff() {
    roleHolder.replaceChildren();
    if (index >= roles.length) {
        stage = "done";
        heading.textContent = labels.done;
        advance.textContent = labels.finish;
    } else {
        stage = "handover";
        heading.textContent = `${labels.handover} ${names[index]}`;
        advance.textContent = labels.reveal;
    }
    advance.focus();
}

function renderManual() {
    heading.textContent = labels.manual;
    advance.textContent = labels.confirm;
    roles.forEach((_, seatIndex) => {
        const label = document.createElement("label");
        const select = document.createElement("select");
        label.textContent = names[seatIndex];
        label.append(select);
        select.className = "input";
        select.dataset.noStore = "";
        roles.forEach((role, roleIndex) => {
            const option = new Option(role.getName(), roleIndex);
            select.add(option);
        });
        select.selectedIndex = seatIndex;
        select.addEventListener("change", () => {
            const old = currentAssignments[seatIndex];
            const other = currentAssignments.indexOf(select.selectedIndex);
            currentAssignments[seatIndex] = select.selectedIndex;
            currentAssignments[other] = old;
            manualHolder.querySelectorAll("select")[other].selectedIndex = old;
        });
        manualHolder.append(label);
    });
}

let currentAssignments = [];
game.on("character-draw", ({ detail }) => {
    if (!["sequential", "manual"].includes(detail.mode)) {
        return;
    }
    roles = detail.mode === "manual" ? detail.characters : shuffle(detail.characters);
    const seats = getSeats();
    names = roles.map((_, seatIndex) => seats[seatIndex] || `${WORKSPACE.seat} ${seatIndex + 1}`);
    index = 0;
    stage = detail.mode;
    dialog.showModal();
    protectPresentation(dialog);
    if (stage === "manual") {
        currentAssignments = roles.map((_, roleIndex) => roleIndex);
        renderManual();
    } else {
        renderHandoff();
    }
});

advance.addEventListener("click", () => {
    if (stage === "manual") {
        currentAssignments.forEach((assignment, seatIndex) => commit(roles[assignment], names[seatIndex]));
        dialog.close();
    } else if (stage === "handover") {
        stage = "role";
        const role = roles[index];
        const ability = document.createElement("p");
        const team = document.createElement("p");
        ability.textContent = role.getAbility();
        const alignment = ["demon", "minion"].includes(role.getTeam()) ? I18N.evilTeam
            : ["townsfolk", "outsider"].includes(role.getTeam()) ? I18N.goodTeam
            : WORKSPACE.traveller;
        team.textContent = alignment;
        heading.textContent = role.getName();
        roleHolder.append(role.drawToken(), team, ability);
        advance.textContent = labels.acknowledge;
    } else if (stage === "role") {
        roleHolder.replaceChildren();
        commit(roles[index], names[index]);
        index += 1;
        renderHandoff();
    } else {
        dialog.close();
    }
});
stop.addEventListener("click", () => dialog.close());
dialog.addEventListener("cancel", (event) => event.preventDefault());
dialog.addEventListener("close", () => {
    roles = [];
    names = [];
    currentAssignments = [];
    heading.textContent = "";
    manualHolder.replaceChildren();
    roleHolder.replaceChildren();
});
