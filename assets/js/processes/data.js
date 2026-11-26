import CharacterToken from "../classes/CharacterToken.js";
import Observer from "../classes/Observer.js";
import TokenStore from "../classes/TokenStore.js";

const gameObserver = Observer.create("game");

Promise.all([
    new Promise((resolve) => {
        gameObserver.on("characters-loaded", ({ detail }) => {
            resolve(detail.characters);
        });
    }),
    new Promise((resolve) => {
        gameObserver.on("jinxes-loaded", ({ detail }) => {
            resolve(detail.jinxes);
        });
    }),
    new Promise((resolve) => {
        gameObserver.on("scripts-loaded", ({ detail }) => {
            resolve(detail.scripts);
        });
    }),
]).then(([ characters, jinxes, scripts ]) => {

    TokenStore.create({
        characters: [
            // Create an empty character which we can use as a token placeholder.
            {
                id: TokenStore.EMPTY,
                image: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
                ability: I18N.emptyCharacterAbility,
                [CharacterToken.empty]: true,
            },
            ...characters
        ],
        reminders: [
            {
                id: TokenStore.EMPTY,
                name: "",
                text: I18N.goodTeam,
                image: "/build/img/roles/generic/good.webp",
                isGlobal: true
            },
            {
                id: TokenStore.EMPTY,
                name: "",
                text: I18N.evilTeam,
                image: "/build/img/roles/generic/evil.webp",
                isGlobal: true
            }
        ],
        jinxes,
        scripts,
    });

});

function loadCatalogue() {
    if (window.PG) {
        return Promise.resolve(window.PG);
    }
    const current = document.querySelector('script[src*="/build/data/"]');
    const fallback = "/build/data/en_GB.js";
    if (!current || new URL(current.src).pathname === fallback) {
        return Promise.reject(new Error("Character data was not built"));
    }
    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = fallback;
        script.onload = () => resolve(window.PG);
        script.onerror = () => reject(new Error("Character data was not built"));
        document.head.append(script);
    });
}

// Delay dispatch until all listeners have been registered.
Promise.resolve().then(loadCatalogue).then((catalogue) => {
    const { roles, jinxes, game, scripts } = catalogue || {};
    if (!roles?.length || !Array.isArray(jinxes) || !game?.length || !scripts) {
        throw new Error("Incomplete character catalogue");
    }
    gameObserver.trigger("characters-loaded", { characters: roles });
    gameObserver.trigger("jinxes-loaded", { jinxes });
    gameObserver.trigger("team-breakdown-loaded", { breakdown: game });
    gameObserver.trigger("scripts-loaded", { scripts });
}).catch((error) => {
    console.error(error);
    ["workspace-data-error", "edition-data-error"].forEach((id) => {
        const status = document.getElementById(id);
        if (status) {
            status.hidden = false;
        }
    });
    gameObserver.trigger("data-unavailable");
});
