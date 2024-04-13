// it would be better to put this duplicated function in separate file
function wordPartOfSpeech(word) {
	if (
		word.wordJSON.type == "u" ||
		word.wordJSON.type == "ru" ||
		word.wordJSON.type == "irv"
	) {
		return "v";
	} else if (
		word.wordJSON.type == "i" ||
		word.wordJSON.type == "na" ||
		word.wordJSON.type == "ira"
	) {
		return "a";
	}
}

function isNotTense(word, s) {
	return word.conjugation.tense != s;
}

// The input to these functions is a "Word" object defined in main.js.
// If one of these filters is applied to an array of Words,
// that type of Word will be removed from the array.
export const questionRemoveFilters = {
	verb: function (word) {
		return wordPartOfSpeech(word) != "v";
	},

	verbs: {
		verbpresent: function (word) {
			return isNotTense(word, "Present");
		},
		verbpast: function (word) {
			return isNotTense(word, "Past");
		},
		verbte: function (word) {
			return isNotTense(word, "て-form");
		},

		verbaffirmative: function (word) {
			return word.conjugation.affirmative !== true;
		},
		verbnegative: function (word) {
			return word.conjugation.affirmative !== false;
		},

		verbplain: function (word) {
			return word.conjugation.polite !== false;
		},
		verbpolite: function (word) {
			return word.conjugation.polite !== true;
		},

		verbu: function (word) {
			return word.wordJSON.type != "u";
		},
		verbru: function (word) {
			return word.wordJSON.type != "ru";
		},
		verbirregular: function (word) {
			return word.wordJSON.type != "irv";
		},
	},

	adjective: function (word) {
		return wordPartOfSpeech(word) != "a";
	},

	adjectives: {
		adjectivepresent: function (word) {
			return isNotTense(word, "Present");
		},
		adjectivepast: function (word) {
			return isNotTense(word, "Past");
		},
		adjectiveadverb: function (word) {
			return isNotTense(word, "Adverb");
		},

		adjectiveaffirmative: function (word) {
			return word.conjugation.affirmative !== true;
		},
		adjectivenegative: function (word) {
			return word.conjugation.affirmative !== false;
		},

		adjectiveplain: function (word) {
			return word.conjugation.polite !== false;
		},
		adjectivepolite: function (word) {
			return word.conjugation.polite !== true;
		},

		adjectivei: function (word) {
			return word.wordJSON.type != "i";
		},
		adjectivena: function (word) {
			return word.wordJSON.type != "na";
		},
		adjectiveirregular: function (word) {
			return word.wordJSON.type != "ira";
		},
	},
};

export const showFurigana = function (show) {
	document.getElementById("verb-text").className = show ? "" : "hide-furigana";
};

export const showEmojis = function (show) {
	document.getElementById("conjugation-inquery-text").className = show
		? ""
		: "hide-emojis";
};

export const showStreak = function (show) {
	document.querySelectorAll(".streak").forEach((s) => {
		if (show) {
			s.classList.remove("display-none");
		} else {
			s.classList.add("display-none");
		}
	});
};

// The translation can be shown never, always, or only after answering.
// If it's only after answering, we make it transparent before answering
// so the app height doesn't change between question and answer.
export const showTranslation = function (showInDom, makeTransparent = false) {
	let el = document.getElementById("translation");

	// Reset state
	el.classList.remove("display-none");
	el.classList.remove("transparent");

	if (!showInDom) {
		el.classList.add("display-none");
		return;
	}

	if (makeTransparent) {
		el.classList.add("transparent");
		return;
	}
};
