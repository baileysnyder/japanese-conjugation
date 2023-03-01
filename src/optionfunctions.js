// it would be better to put this duplicated function in separate file
function wordPartOfSpeech(word) {
    if (word.wordJSON.type == "u" || word.wordJSON.type == "ru" || word.wordJSON.type == "irv") {
      return "v";
    } else if (word.wordJSON.type == "i" || word.wordJSON.type == "na" || word.wordJSON.type == "ira") {
      return "a";
    }
}

function isNotTense(word, s) {
    return word.conjugation.tense != s;
}

// would be better to store inquery words as const in separate file
// when an option is set to true, these filter functions will be used
// input is a Word from main.js
// create sub array with all verbs, then run affirmative, polite checks on sub array to avoid checking if verb twice
export const optionRemoveFunctions = {
    verb: function(x) {
        return wordPartOfSpeech(x) != "v";
    },

    verbs: {
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
            return x.conjugation.affirmative !== true;
        },
        verbnegative: function(x) {
            return x.conjugation.affirmative !== false;
        },
    
        verbplain: function(x) {
            return x.conjugation.polite !== false;
        },
        verbpolite: function(x) {
            return x.conjugation.polite !== true;
        },
    
        verbu: function(x) {
            return x.wordJSON.type != "u";
        },
        verbru: function(x) {
            return x.wordJSON.type != "ru";
        },
        verbirregular: function(x) {
            return x.wordJSON.type != "irv";
        }
    },

    adjective: function(x) {
        return wordPartOfSpeech(x) != "a";
    },

    adjectives: {
        adjectivepresent: function(x) {
            return isNotTense(x, "Present");
        },
        adjectivepast: function(x) {
            return isNotTense(x, "Past");
        },
        adjectiveadverb: function(x) {
            return isNotTense(x, "Adverb");
        },
    
        adjectiveaffirmative: function(x) {
            return x.conjugation.affirmative !== true;
        },
        adjectivenegative: function(x) {
            return x.conjugation.affirmative !== false;
        },
    
        adjectiveplain: function(x) {
            return x.conjugation.polite !== false;
        },
        adjectivepolite: function(x) {
            return x.conjugation.polite !== true;
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
    }
};

export const showFurigana = function(show) {
    document.getElementById("verb-text").className = show ? "" : "hide-furigana";
}

export const showEmojis = function(show) {
    document.getElementById("conjugation-inquery-text").className = show ? "" : "hide-emojis";
}

export const showStreak = function(show) {
    document.getElementById("streak-container").className = show ? "" : "hide-streak";
}