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

// Can be shown never, always, or only after answering.
export const showFurigana = function (showInDom, makeTransparent = false) {
	const el = document.getElementById("verb-text");
	setDisplayAndTransparency(
		el,
		showInDom,
		"hide-furigana",
		makeTransparent,
		"transparent-furigana"
	);
};

// Can be shown never, always, or only after answering.
export const showTranslation = function (showInDom, makeTransparent = false) {
	const el = document.getElementById("translation");
	setDisplayAndTransparency(
		el,
		showInDom,
		"display-none",
		makeTransparent,
		"transparent"
	);
};

// removeClass should lead to display:none
// transparentClass should lead to something like opacity: 0 to keep height when hidden
function setDisplayAndTransparency(
	element,
	showInDom,
	removeClass,
	makeTransparent,
	transparentClass
) {
	// Reset state
	element.classList.remove(removeClass);
	element.classList.remove(transparentClass);

	if (!showInDom) {
		element.classList.add(removeClass);
		return;
	}

	if (makeTransparent) {
		element.classList.add(transparentClass);
		return;
	}
}
