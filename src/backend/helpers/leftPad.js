/**
 * Pads a string with characters on the left to reach a minimum length
 * @param {string|number} string - The string (or number) to pad
 * @param {number} minCharacters - The minimum length of the resulting string
 * @param {string} placeCharacter - The character to use for padding (default: space)
 * @returns {string} The padded string
 */
function leftPad(string, minCharacters, placeCharacter = " ") {
    let returnString = "";
    let leng = `${string}`.length;
    if (leng < minCharacters) {
        for (let i = 0; i < minCharacters - leng; i++) {
            returnString += placeCharacter;
        }
    }
    returnString += `${string}`;
    return returnString;
}

module.exports = { leftPad };