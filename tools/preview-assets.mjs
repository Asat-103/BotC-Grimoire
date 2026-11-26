// Copies the published upstream English catalogue for local testing.
// The pinned digest identifies the exact JavaScript catalogue reviewed for this preview.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const curl = promisify(execFile);
const upstream = "https://www.pocketgrimoire.co.uk";
const digest = "572c2e1c73c66a9b9d2fbf1af63bca5dd6f25e5641159b39818a78340fcd5b8a";
const cataloguePath = new URL("../assets/data/compiled/en_GB.js", import.meta.url);

async function readExisting(path) {
    try {
        const contents = await readFile(path);
        return contents.length ? contents : null;
    } catch (error) {
        if (error.code !== "ENOENT") {
            throw error;
        }
        return null;
    }
}

async function download(path) {
    const { stdout } = await curl("curl", ["--fail", "--silent", "--show-error", "--max-time", "30", upstream + path], {
        encoding: "buffer",
        maxBuffer: 4 * 1024 * 1024
    });
    return stdout;
}

let catalogue = await readExisting(cataloguePath);
if (!catalogue) {
    catalogue = await download("/build/data/en_GB.js");
    if (createHash("sha256").update(catalogue).digest("hex") !== digest) {
        throw new Error("The upstream preview catalogue has changed. Use the normal fetch and translate commands to generate assets.");
    }
    await mkdir(new URL(".", cataloguePath), { recursive: true });
    await writeFile(cataloguePath, catalogue);
}

const assets = [...new Set([
    ...catalogue.toString().matchAll(/\/build\/img\/roles\/[a-z0-9_/-]+\.(?:webp|png)/gi)
].map(([path]) => path).concat(
    "/build/img/roles/generic/good.webp",
    "/build/img/roles/generic/evil.webp"
))];
let missing = 0;
for (let index = 0; index < assets.length; index += 12) {
    await Promise.all(assets.slice(index, index + 12).map(async (path) => {
        const destination = new URL(`../assets/${path.slice("/build/".length)}`, import.meta.url);
        if (await readExisting(destination)) {
            return;
        }
        try {
            const image = await download(path);
            await mkdir(new URL(".", destination), { recursive: true });
            await writeFile(destination, image);
        } catch (error) {
            missing += 1;
            console.warn(error.message);
        }
    }));
}
console.log(`English catalogue ready. ${assets.length - missing}/${assets.length} role images available. Run npm run build.`);
