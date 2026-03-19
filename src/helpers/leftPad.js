// TODO: method comments
function leftPad(number, minCharacters, placeCharacter = " ") {
    let returnString = "";
    let leng = `${number}`.length;
    if (leng < minCharacters) {
        for (let i = 0; i < minCharacters - leng; i++) {
            returnString += placeCharacter;
        }
    }
    returnString += `${number}`;
    return returnString;
}

module.exports = { leftPad };