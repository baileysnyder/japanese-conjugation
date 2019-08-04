// it would be better to put this duplicated function in separate file
function wordPartOfSpeech(wordJSON) {
    if (wordJSON.type == "u" || wordJSON.type == "ru" || wordJSON.type == "irv") {
      return "verb";
    } else if (wordJSON.type == "i" || wordJSON.type == "na" || wordJSON.type == "ira") {
      return "adjective";
    }
}

function isNotTense(word, s) {
    return word.conjugation.tense != s;
}

// would be better to store inquery words as const in separate file
// when an option is set to false, these filter functions will be used
// input is a Word from main.js
export let optionRemoveFunctions = {
    // Verbs
    verb: function(x) {
        return wordPartOfSpeech(x.wordJSON) != "verb";
    },

    verbpresent: function(x) {
        return isNotTense(x, "Present");
    },
    verbpast: function(x) {
        return isNotTense(x, "Past");
    },
    verbte: function(x) {
        return isNotTense(x, "て-form");
    },

    verbaffirmative: function(x) {
        return word.conjugation.affirmative !== true;
    },
    verbnegative: function(x) {
        return word.conjugation.affirmative !== false;
    },

    verbplain: function(x) {
        return word.conjugation.polite !== false;
    },
    verbpolite: function(x) {
        return word.conjugation.polite !== true;
    },

    verbu: function(x) {
        return x.wordJSON.type != "u";
    },
    verbru: function(x) {
        return x.wordJSON.type != "ru";
    },
    verbirregular: function(x) {
        return x.wordJSON.type != "irv";
    },

    // Adjectives
    adjective: function(x) {
        return wordPartOfSpeech(x.wordJSON) != "adjective";
    },

    adjectivepresent: function(x) {
        return isNotTense(x, "Present");
    },
    adjectivepast: function(x) {
        return isNotTense(x, "Past");
    },
    adjectiveteadverb: function(x) {
        return isNotTense(x, "て-form");
    },

    adjectiveaffirmative: function(x) {
        return word.conjugation.affirmative !== true;
    },
    adjectivenegative: function(x) {
        return word.conjugation.affirmative !== false;
    },

    adjectiveplain: function(x) {
        return word.conjugation.polite !== false;
    },
    adjectivepolite: function(x) {
        return word.conjugation.polite !== true;
    },

    adjectivei: function(x) {
        return x.wordJSON.type != "i";
    },
    adjectivena: function(x) {
        return x.wordJSON.type != "na";
    },
    adjectiveirregular: function(x) {
        return x.wordJSON.type != "ira";
    }
};

export let showFurigana = function(show) {
    document.getElementById("verb-text").className = show ? "" : "hide-furigana";
}

export let showEmojis = function(show) {
    document.getElementById("conjugation-inquery-text").className = show ? "" : "hide-furigana";
}