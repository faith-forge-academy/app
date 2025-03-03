/**
 * This function takes a string of scripture text and splits it on a space.
 * It then loops through each word creating an object:
 *      If the "word" ends with punctuation, increment the phrase counter and add phrase to the object
 *      Add an index to the object
 *      Initialize "said" and "correct" both to boolean false
 *      add the word to a "word" property
 * 
 * @param {string} scriptureText
 * 
 * returns an array of word objects 
 */
function createWordsCollection(scriptureText) {
    let scriptureSimpleWordArray = scriptureText.split(/\s+/);
    let scriptureWordsCollection = [];
    let currentWord;
    let currentWordObject;
    let currentPhrase = 1;

    for (let i=0; i < scriptureSimpleWordArray.length; i++) {
        currentWord = scriptureSimpleWordArray[i];
        currentWordObject = {};

        currentWordObject.idx = i;
        currentWordObject.word = currentWord;
        currentWordObject.said = false;
        currentWordObject.correct = null;

        currentWordObject.phrase = currentPhrase;
        
        if (currentWord.match(/[.,/#!$%^&*;:{}=\-_`~()?]/gu)) {
            currentPhrase++
        }

        scriptureWordsCollection.push(currentWordObject)
    }

    return scriptureWordsCollection;
}

export default createWordsCollection;