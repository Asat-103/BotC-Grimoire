/**
 * Creates an array that's a shuffled version of the given array. The original
 * array is not modified.
 * Fisher–Yates with rejection sampling to avoid modulo bias.
 *
 * @param  {Array} array
 *         Array to shuffle.
 * @return {Array}
 *         Shuffled array.
 */
export function shuffle(array) {

    const result = Array.from(array);
    const random = new Uint32Array(1);
    for (let index = result.length - 1; index > 0; index -= 1) {
        const range = index + 1;
        const ceiling = 2 ** 32 - (2 ** 32 % range);
        do {
            window.crypto.getRandomValues(random);
        } while (random[0] >= ceiling);
        const other = random[0] % range;
        [result[index], result[other]] = [result[other], result[index]];
    }
    return result;

}

/**
 * Groups the items in the given array based on the the getGroup function.
 *
 * @param  {Array} array
 *         Array whose items should be grouped up.
 * @param  {Function} getGroup
 *         A function that should create the name of the group. It's passed the
 *         item and the index.
 * @return {Object}
 *         An object with the groups as keys and all the matching items as
 *         values.
 */
export function groupBy(array, getGroup) {

    return array.reduce((grouped, item, i) => {

        const group = getGroup(item, i);

        if (!grouped[group]) {
            grouped[group] = [];
        }

        grouped[group].push(item);

        return grouped;

    }, Object.create(null));

}
