// since the weights are mostly only used to make things repeat after x amount of rounds, they are overkill
// would be less work to just wait x rounds and immeditely show what you missed, without updating any weights.
"use strict";
import { bind, isJapanese } from "wanakana";
import {
	questionRemoveFilters,
	showFurigana,
	showEmojis,
	showStreak,
	showTranslation,
} from "./optionfunctions.js";
import { wordData } from "./worddata.js";

let nonConjugationSettings = new Set();
document
	.querySelectorAll("#non-conjugation-settings input")
	.forEach((input) => nonConjugationSettings.add(input.getAttribute("name")));

let isTouch = "ontouchstart" in window || navigator.msMaxTouchPoints > 0;
document.getElementById("press-any-key-text").textContent = isTouch
	? "Tap to continue"
	: "Press Enter/Return to continue";

// Enum corresponding to "translationTiming" radio values in the html
const TRANSLATION_TIMINGS = Object.freeze({
	always: "always",
	onlyAfterAnswering: "after",
});

// Stored in state.activeScreen
const SCREENS = Object.freeze({
	question: 0,
	// Incorrect and correct answers are considered the same "results" screen
	results: 1,
	settings: 2,
});

const defaultSettings = () => {
	let inputs = document
		.getElementById("options-form")
		.querySelectorAll('[type="checkbox"]');
	let settings = {};
	for (let x of Array.from(inputs)) {
		settings[x.name] = true;
	}

	// Set input radio value
	settings["translationTiming"] = TRANSLATION_TIMINGS.always;

	return settings;
};

function removeNonConjugationSettings(settings) {
	let prunedSettings = JSON.parse(JSON.stringify(settings));

	nonConjugationSettings.forEach((s) => {
		delete prunedSettings[s];
	});
	return prunedSettings;
}

function wordTypeToDisplayText(type) {
	if (type == "u") {
		return "う-verb";
	} else if (type == "ru") {
		return "る-verb";
	} else if (type == "irv" || type == "ira") {
		return "Irregular";
	} else if (type == "i") {
		return "い-adjective";
	} else if (type == "na") {
		return "な-adjective";
	}
}

function conjugationInqueryFormatting(conjugation) {
	let newString = "";

	if (conjugation.tense == "Past") {
		newString +=
			'<div class="conjugation-inquery"><div class="inquery-emoji">⌚</div><div class="inquery-text">Past</div></div> ';
	} else if (conjugation.tense == "て-form" || conjugation.tense == "Adverb") {
		newString += conjugation.tense;
	}

	if (conjugation.affirmative === true) {
		newString +=
			'<div class="conjugation-inquery"><div class="inquery-emoji">✅</div><div class="inquery-text">Affirmative</div></div> ';
	} else if (conjugation.affirmative === false) {
		newString +=
			'<div class="conjugation-inquery"><div class="inquery-emoji">🚫</div><div class="inquery-text">Negative</div></div> ';
	}

	if (conjugation.polite === true) {
		newString +=
			'<div class="conjugation-inquery"><div class="inquery-emoji">👔</div><div class="inquery-text">Polite</div></div>';
	} else if (conjugation.polite === false) {
		newString +=
			'<div class="conjugation-inquery"><div class="inquery-emoji">👪</div><div class="inquery-text">Plain</div></div>';
	}

	return newString;
}

function changeVerbBoxFontColor(color) {
	let ps = document.getElementById("verb-box").getElementsByTagName("p");
	for (let p of Array.from(ps)) {
		p.style.color = color;
	}
}

function loadNewWord(wordList) {
	let word = pickRandomWord(wordList);
	updateCurrentWord(word);
	if (!isTouch) {
		document.getElementsByTagName("input")[0].focus();
	}
	changeVerbBoxFontColor("rgb(232, 232, 232)");
	return word;
}

function updateCurrentWord(word) {
	document.getElementById("verb-box").style.background = "none";
	document.getElementById("verb-text").innerHTML =
		"<ruby>" + word.wordJSON.kanji + "</ruby>";
	document.getElementById("translation").textContent = word.wordJSON.eng;
	// Set verb-type to a non-breaking space to preserve vertical height
	document.getElementById("verb-type").textContent = "\u00A0";
	document.getElementById("conjugation-inquery-text").innerHTML =
		conjugationInqueryFormatting(word.conjugation);
}

// returns string indicating type
function wordPartOfSpeech(wordJSON) {
	if (
		wordJSON.type == "u" ||
		wordJSON.type == "ru" ||
		wordJSON.type == "irv"
	) {
		return "verb";
	} else if (
		wordJSON.type == "i" ||
		wordJSON.type == "na" ||
		wordJSON.type == "ira"
	) {
		return "adjective";
	}
}

class Conjugation {
	constructor(conjugations, tense, affirmative, polite) {
		this.conjugations = conjugations;
		this.tense = tense;
		this.affirmative = affirmative;
		this.polite = polite;
	}
}

function touConjugation(affirmative, polite, tense, isKanji) {
	let firstLetter = isKanji ? "問" : "と";
	if (tense == "present") {
		if (affirmative && polite) {
			return firstLetter + "います";
		} else if (affirmative && !polite) {
			return firstLetter + "う";
		} else if (!affirmative && polite) {
			return [firstLetter + "いません", firstLetter + "わないです"];
		} else if (!affirmative && !polite) {
			return firstLetter + "わない";
		}
	} else if (tense == "past") {
		if (affirmative && polite) {
			return firstLetter + "いました";
		} else if (affirmative && !polite) {
			return firstLetter + "うた";
		} else if (!affirmative && polite) {
			return [
				firstLetter + "いませんでした",
				firstLetter + "わなかったです",
			];
		} else if (!affirmative && !polite) {
			return firstLetter + "わなかった";
		}
	} else if (tense == "te") {
		return firstLetter + "うて";
	}
}

function aruConjugation(affirmative, polite, tense) {
	if (tense == "present") {
		if (affirmative && polite) {
			return "あります";
		} else if (affirmative && !polite) {
			return "ある";
		} else if (!affirmative && polite) {
			return ["ありません", "ないです"];
		} else if (!affirmative && !polite) {
			return "ない";
		}
	} else if (tense == "past") {
		if (affirmative && polite) {
			return "ありました";
		} else if (affirmative && !polite) {
			return "あった";
		} else if (!affirmative && polite) {
			return ["ありませんでした", "なかったです"];
		} else if (!affirmative && !polite) {
			return "なかった";
		}
	} else if (tense == "te") {
		return "あって";
	}
}

function kuruConjugation(affirmative, polite, tense, isKanji) {
	let retval;
	if (tense == "present") {
		if (affirmative && polite) {
			retval = "きます";
		} else if (affirmative && !polite) {
			retval = "くる";
		} else if (!affirmative && polite) {
			retval = ["きません", "こないです"];
		} else if (!affirmative && !polite) {
			retval = "こない";
		}
	} else if (tense == "past") {
		if (affirmative && polite) {
			retval = "きました";
		} else if (affirmative && !polite) {
			retval = "きた";
		} else if (!affirmative && polite) {
			retval = ["きませんでした", "こなかったです"];
		} else if (!affirmative && !polite) {
			retval = "こなかった";
		}
	} else if (tense == "te") {
		retval = "きて";
	}

	if (isKanji) {
		if (typeof retval === "string") {
			retval = "来" + retval.substring(1);
		} else {
			for (let i = 0; i < retval.length; i++) {
				retval[i] = "来" + retval[i].substring(1);
			}
		}
	}
	return retval;
}

function suruConjugation(affirmative, polite, tense) {
	if (tense == "present") {
		if (affirmative && polite) {
			return "します";
		} else if (affirmative && !polite) {
			return "する";
		} else if (!affirmative && polite) {
			return ["しません", "しないです"];
		} else if (!affirmative && !polite) {
			return "しない";
		}
	} else if (tense == "past") {
		if (affirmative && polite) {
			return "しました";
		} else if (affirmative && !polite) {
			return "した";
		} else if (!affirmative && polite) {
			return ["しませんでした", "しなかったです"];
		} else if (!affirmative && !polite) {
			return "しなかった";
		}
	} else if (tense == "te") {
		return "して";
	}
}

function ikuConjugation(affirmative, polite, tense, isKanji) {
	let firstLetter = isKanji ? "行" : "い";
	if (tense == "present") {
		if (affirmative && polite) {
			return firstLetter + "きます";
		} else if (affirmative && !polite) {
			return firstLetter + "く";
		} else if (!affirmative && polite) {
			return [firstLetter + "きません", firstLetter + "かないです"];
		} else if (!affirmative && !polite) {
			return firstLetter + "かない";
		}
	} else if (tense == "past") {
		if (affirmative && polite) {
			return firstLetter + "きました";
		} else if (affirmative && !polite) {
			return firstLetter + "った";
		} else if (!affirmative && polite) {
			return [
				firstLetter + "きませんでした",
				firstLetter + "かなかったです",
			];
		} else if (!affirmative && !polite) {
			return firstLetter + "かなかった";
		}
	} else if (tense == "te") {
		return firstLetter + "って";
	}
}

function checkSuffix(hiraganaWord, suffix) {
	for (let i = 1; i <= suffix.length; i++) {
		if (hiraganaWord[hiraganaWord.length - i] != suffix[suffix.length - i]) {
			return false;
		}
	}
	return hiraganaWord.replace(suffix, "");
}

function irregularVerbConjugation(hiraganaVerb, affirmative, polite, tense) {
	let prefix, conjugatedSuffix;
	if ((prefix = checkSuffix(hiraganaVerb, "いく")) !== false) {
		conjugatedSuffix = ikuConjugation(affirmative, polite, tense, false);
	} else if ((prefix = checkSuffix(hiraganaVerb, "行く")) !== false) {
		conjugatedSuffix = ikuConjugation(affirmative, polite, tense, true);
	} else if ((prefix = checkSuffix(hiraganaVerb, "する")) !== false) {
		conjugatedSuffix = suruConjugation(affirmative, polite, tense);
	} else if ((prefix = checkSuffix(hiraganaVerb, "くる")) !== false) {
		conjugatedSuffix = kuruConjugation(affirmative, polite, tense, false);
	} else if ((prefix = checkSuffix(hiraganaVerb, "来る")) !== false) {
		conjugatedSuffix = kuruConjugation(affirmative, polite, tense, true);
	} else if ((prefix = checkSuffix(hiraganaVerb, "ある")) !== false) {
		conjugatedSuffix = aruConjugation(affirmative, polite, tense);
	} else if ((prefix = checkSuffix(hiraganaVerb, "とう")) !== false) {
		conjugatedSuffix = touConjugation(affirmative, polite, tense, false);
	} else if ((prefix = checkSuffix(hiraganaVerb, "問う")) !== false) {
		conjugatedSuffix = touConjugation(affirmative, polite, tense, true);
	}

	// There may be multiple correct suffixes
	if (typeof conjugatedSuffix === "string") {
		return prefix + conjugatedSuffix;
	} else if (conjugatedSuffix && conjugatedSuffix.constructor === Array) {
		let retvals = [];
		for (let i = 0; i < conjugatedSuffix.length; i++) {
			retvals[i] = prefix + conjugatedSuffix[i];
		}
		return retvals;
	}

	return "Error";
}

function iiConjugation(affirmative, polite, tense) {
	if (tense == "present") {
		if (affirmative && polite) {
			return ["いいです", "良いです"];
		} else if (affirmative && !polite) {
			return ["いい", "良い"];
		} else if (!affirmative && polite) {
			return [
				"よくないです",
				"よくありません",
				"良くないです",
				"良くありません",
			];
		} else if (!affirmative && !polite) {
			return ["よくない", "良くない"];
		}
	} else if (tense == "past") {
		if (affirmative && polite) {
			return ["よかったです", "良かったです"];
		} else if (affirmative && !polite) {
			return ["よかった", "良かった"];
		} else if (!affirmative && polite) {
			return [
				"よくなかったです",
				"よくありませんでした",
				"良くなかったです",
				"良くありませんでした",
			];
		} else if (!affirmative && !polite) {
			return ["よくなかった", "良くなかった"];
		}
	} else if (tense == "adverb") {
		return ["よく", "良く"];
	}
}

function irregularAdjectiveConjugation(
	hiraganaAdjective,
	affirmative,
	polite,
	tense
) {
	if (hiraganaAdjective == "いい") {
		return iiConjugation(affirmative, polite, tense);
	} else if (hiraganaAdjective == "かっこいい") {
		let conjugations = [].concat(iiConjugation(affirmative, polite, tense));
		for (let i = 0; i < conjugations.length; i++) {
			conjugations[i] = "かっこ" + conjugations[i];
		}
		return conjugations;
	}
}

function changeUtoI(c) {
	if (c == "う") {
		return "い";
	} else if (c == "く") {
		return "き";
	} else if (c == "ぐ") {
		return "ぎ";
	} else if (c == "す") {
		return "し";
	} else if (c == "ず") {
		return "じ";
	} else if (c == "つ") {
		return "ち";
	} else if (c == "づ") {
		return "ぢ";
	} else if (c == "ぬ") {
		return "に";
	} else if (c == "ふ") {
		return "ひ";
	} else if (c == "ぶ") {
		return "び";
	} else if (c == "ぷ") {
		return "ぴ";
	} else if (c == "む") {
		return "み";
	} else if (c == "る") {
		return "り";
	} else {
		console.log("Input was not う in changeUtoI, was " + c);
	}
}

function changeUtoA(c) {
	if (c == "う") {
		return "わ";
	} else if (c == "く") {
		return "か";
	} else if (c == "ぐ") {
		return "が";
	} else if (c == "す") {
		return "さ";
	} else if (c == "ず") {
		return "ざ";
	} else if (c == "つ") {
		return "た";
	} else if (c == "づ") {
		return "だ";
	} else if (c == "ぬ") {
		return "な";
	} else if (c == "ふ") {
		return "は";
	} else if (c == "ぶ") {
		return "ば";
	} else if (c == "ぷ") {
		return "ぱ";
	} else if (c == "む") {
		return "ま";
	} else if (c == "る") {
		return "ら";
	} else {
		console.log("Input was not う in changeUtoA, was " + c);
	}
}

function changeToPastPlain(c) {
	if (c == "す") {
		return "した";
	} else if (c == "く") {
		return "いた";
	} else if (c == "ぐ") {
		return "いだ";
	} else if (c == "む" || c == "ぶ" || c == "ぬ") {
		return "んだ";
	} else if (c == "る" || c == "う" || c == "つ") {
		return "った";
	} else {
		console.log("Input was not real verb ending changeToPastPlain, was " + c);
	}
}

function masuStem(hiraganaVerb, type) {
	return type == "u"
		? hiraganaVerb.substring(0, hiraganaVerb.length - 1) +
				changeUtoI(hiraganaVerb.charAt(hiraganaVerb.length - 1))
		: hiraganaVerb.substring(0, hiraganaVerb.length - 1);
}

// used by present plain negative and past plain negative
function plainNegativeComplete(hiraganaVerb, type) {
	return type == "u"
		? hiraganaVerb.substring(0, hiraganaVerb.length - 1) +
				changeUtoA(hiraganaVerb.charAt(hiraganaVerb.length - 1)) +
				"ない"
		: hiraganaVerb.substring(0, hiraganaVerb.length - 1) + "ない";
}

function dropFinalLetter(word) {
	return word.substring(0, word.length - 1);
}

let conjugationFunctions = {
	verb: {
		present: function (hiraganaVerb, type, affirmative, polite) {
			if (type == "irv") {
				return irregularVerbConjugation(
					hiraganaVerb,
					affirmative,
					polite,
					"present"
				);
			} else if (affirmative && polite) {
				return masuStem(hiraganaVerb, type) + "ます";
			} else if (affirmative && !polite) {
				return hiraganaVerb;
			} else if (!affirmative && polite) {
				return [
					masuStem(hiraganaVerb, type) + "ません",
					plainNegativeComplete(hiraganaVerb, type) + "です",
				];
			} else if (!affirmative && !polite) {
				return plainNegativeComplete(hiraganaVerb, type);
			}
		},
		past: function (hiraganaVerb, type, affirmative, polite) {
			if (type == "irv") {
				return irregularVerbConjugation(
					hiraganaVerb,
					affirmative,
					polite,
					"past"
				);
			} else if (affirmative && polite) {
				return masuStem(hiraganaVerb, type) + "ました";
			} else if (affirmative && !polite && type == "u") {
				return (
					dropFinalLetter(hiraganaVerb) +
					changeToPastPlain(hiraganaVerb.charAt(hiraganaVerb.length - 1))
				);
			} else if (affirmative && !polite && type == "ru") {
				return masuStem(hiraganaVerb, type) + "た";
			} else if (!affirmative && polite) {
				let plainNegative = plainNegativeComplete(hiraganaVerb, type);
				let plainNegativePast = dropFinalLetter(plainNegative) + "かった";
				return [
					masuStem(hiraganaVerb, type) + "ませんでした",
					plainNegativePast + "です",
				];
			} else if (!affirmative && !polite) {
				let plainNegative = plainNegativeComplete(hiraganaVerb, type);
				return dropFinalLetter(plainNegative) + "かった";
			}
		},
		te: function (hiraganaVerb, type) {
			if (type == "irv") {
				return irregularVerbConjugation(hiraganaVerb, false, false, "te");
			} else if (type == "u") {
				let finalChar = hiraganaVerb.charAt(hiraganaVerb.length - 1);
				if (finalChar == "う" || finalChar == "つ" || finalChar == "る") {
					return dropFinalLetter(hiraganaVerb) + "って";
				} else if (
					finalChar == "む" ||
					finalChar == "ぶ" ||
					finalChar == "ぬ"
				) {
					return dropFinalLetter(hiraganaVerb) + "んで";
				} else if (finalChar == "く") {
					return dropFinalLetter(hiraganaVerb) + "いて";
				} else if (finalChar == "ぐ") {
					return dropFinalLetter(hiraganaVerb) + "いで";
				} else if (finalChar == "す") {
					return dropFinalLetter(hiraganaVerb) + "して";
				}
			} else if (type == "ru") {
				return masuStem(hiraganaVerb, type) + "て";
			}
		},
	},

	adjective: {
		present: function (hiraganaAdjective, type, affirmative, polite) {
			if (type == "ira") {
				return irregularAdjectiveConjugation(
					hiraganaAdjective,
					affirmative,
					polite,
					"present"
				);
			} else if (affirmative && polite) {
				return hiraganaAdjective + "です";
			} else if (affirmative && !polite && type == "i") {
				return hiraganaAdjective;
			} else if (affirmative && !polite && type == "na") {
				return hiraganaAdjective + "だ";
			} else if (!affirmative && polite && type == "i") {
				return [
					dropFinalLetter(hiraganaAdjective) + "くないです",
					dropFinalLetter(hiraganaAdjective) + "くありません",
				];
			} else if (!affirmative && polite && type == "na") {
				return [
					hiraganaAdjective + "じゃないです",
					hiraganaAdjective + "ではないです",
					hiraganaAdjective + "じゃありません",
					hiraganaAdjective + "ではありません",
				];
			} else if (!affirmative && !polite && type == "i") {
				return dropFinalLetter(hiraganaAdjective) + "くない";
			} else if (!affirmative && !polite && type == "na") {
				return [
					hiraganaAdjective + "じゃない",
					hiraganaAdjective + "ではない",
				];
			}
		},
		past: function (hiraganaAdjective, type, affirmative, polite) {
			if (type == "ira") {
				return irregularAdjectiveConjugation(
					hiraganaAdjective,
					affirmative,
					polite,
					"past"
				);
			} else if (affirmative && polite && type == "i") {
				return dropFinalLetter(hiraganaAdjective) + "かったです";
			} else if (affirmative && polite && type == "na") {
				return hiraganaAdjective + "でした";
			} else if (affirmative && !polite && type == "i") {
				return dropFinalLetter(hiraganaAdjective) + "かった";
			} else if (affirmative && !polite && type == "na") {
				return hiraganaAdjective + "だった";
			} else if (!affirmative && polite && type == "i") {
				return [
					dropFinalLetter(hiraganaAdjective) + "くなかったです",
					dropFinalLetter(hiraganaAdjective) + "くありませんでした",
				];
			} else if (!affirmative && polite && type == "na") {
				return [
					hiraganaAdjective + "じゃなかったです",
					hiraganaAdjective + "ではなかったです",
					hiraganaAdjective + "じゃありませんでした",
					hiraganaAdjective + "ではありませんでした",
				];
			} else if (!affirmative && !polite && type == "i") {
				return dropFinalLetter(hiraganaAdjective) + "くなかった";
			} else if (!affirmative && !polite && type == "na") {
				return [
					hiraganaAdjective + "じゃなかった",
					hiraganaAdjective + "ではなかった",
				];
			}
		},
		adverb: function (hiraganaAdjective, type) {
			if (type == "ira") {
				return irregularAdjectiveConjugation(
					hiraganaAdjective,
					false,
					false,
					"adverb"
				);
			} else if (type == "i") {
				return dropFinalLetter(hiraganaAdjective) + "く";
			} else if (type == "na") {
				return hiraganaAdjective + "に";
			}
		},
	},
};

function convertFuriganaToKanji(word) {
	return word.replace(/<ruby>|<\/ruby>|<rt>.*?<\/rt>/g, "");
}

function convertFuriganaToHiragana(word) {
	return word.replace(/<ruby>|<\/ruby>|.?<rt>|<\/rt>/g, "");
}

function conjFuncIndexToName(index, wordPartOfSpeech) {
	if (index == 0) {
		return "Present";
	} else if (index == 1) {
		return "Past";
	} else if (index == 2 && wordPartOfSpeech == "verb") {
		return "て-form";
	} else if (index == 2 && wordPartOfSpeech == "adjective") {
		return "Adverb";
	}
}

function getAllConjugations(wordJSON) {
	let conj = [];
	let affirmative = false,
		polite = false;

	let keys, conjFunctions;
	let partOfSpeech = wordPartOfSpeech(wordJSON);
	if (partOfSpeech == "verb") {
		conjFunctions = conjugationFunctions.verb;
		keys = Object.keys(conjFunctions);
	} else if (partOfSpeech == "adjective") {
		conjFunctions = conjugationFunctions.adjective;
		keys = Object.keys(conjFunctions);
	}

	let hiragana = convertFuriganaToHiragana(wordJSON.kanji);
	let kanji = convertFuriganaToKanji(wordJSON.kanji);

	let hiraganaConj, kanjiConj;
	// Loop through all 4 permutations of affirmative/negative and polite/plain
	for (let i = 0; i < (keys.length - 1) * 4; i++) {
		if (i % 2 == 0) {
			affirmative = !affirmative;
		}
		polite = !polite;

		let keyIndex = Math.floor(i / 4);

		// don't need present plain affirmative since it's the dictionary form
		if (affirmative && !polite && keyIndex == 0 && wordJSON.type != "na")
			continue;

		hiraganaConj = conjFunctions[keys[keyIndex]](
			hiragana,
			wordJSON.type,
			affirmative,
			polite
		);
		kanjiConj = conjFunctions[keys[keyIndex]](
			kanji,
			wordJSON.type,
			affirmative,
			polite
		);

		let altOkuriganaConj = [];
		if (wordJSON.altOkurigana && wordJSON.altOkurigana.length) {
			for (
				let altIndex = 0;
				altIndex < wordJSON.altOkurigana.length;
				altIndex++
			) {
				let altOkurigana = wordJSON.altOkurigana[altIndex];
				altOkuriganaConj = altOkuriganaConj.concat(
					conjFunctions[keys[keyIndex]](
						altOkurigana,
						wordJSON.type,
						affirmative,
						polite
					)
				);
			}
		}

		let allConj = [];
		allConj = allConj.concat(hiraganaConj, kanjiConj, altOkuriganaConj);
		conj.push(
			new Conjugation(
				allConj,
				conjFuncIndexToName(keyIndex, partOfSpeech),
				affirmative,
				polite
			)
		);
	}

	// te and adverb
	hiraganaConj = conjFunctions[keys[keys.length - 1]](hiragana, wordJSON.type);
	kanjiConj = conjFunctions[keys[keys.length - 1]](kanji, wordJSON.type);
	let allConj = [];
	allConj = allConj.concat(hiraganaConj, kanjiConj);
	conj.push(
		new Conjugation(
			allConj,
			conjFuncIndexToName(keys.length - 1, partOfSpeech),
			null,
			null
		)
	);

	// array of Conjugation objects
	return conj;
}

class Word {
	// conjugation is Conjugation class object
	constructor(wordJSON, conjugation) {
		this.wordJSON = wordJSON;
		this.conjugation = conjugation;

		// Probability is updated directly by external functions
		this.probability = 0;
		// wasRecentlyIncorrect is used when calculating probability
		this.wasRecentlyIncorrect = false;
	}
}

function createArrayOfArrays(length) {
	let array = new Array(length);
	for (let i = 0; i < array.length; i++) {
		array[i] = [];
	}
	return array;
}

class WordRecentlySeen {
	constructor(word, wasCorrect) {
		this.word = word;
		this.wasCorrect = wasCorrect;
	}
}

function findMinProb(currentWords) {
	let min = 2;
	for (let i = 0; i < currentWords.length; i++) {
		for (let j = 0; j < currentWords[i].length; j++) {
			min =
				currentWords[i][j].probability < min &&
				currentWords[i][j].probability != 0
					? currentWords[i][j].probability
					: min;
		}
	}
	return min;
}

function findMaxProb(currentWords) {
	let max = 0;
	for (let i = 0; i < currentWords.length; i++) {
		for (let j = 0; j < currentWords[i].length; j++) {
			max =
				currentWords[i][j].probability > max
					? currentWords[i][j].probability
					: max;
		}
	}
	return max;
}

function normalizeProbabilities(currentWords) {
	let totalProbability = 0;
	// get total of probabilities
	for (let i = 0; i < currentWords.length; i++) {
		for (let j = 0; j < currentWords[i].length; j++) {
			totalProbability += currentWords[i][j].probability;
		}
	}

	// normalize
	for (let i = 0; i < currentWords.length; i++) {
		for (let j = 0; j < currentWords[i].length; j++) {
			currentWords[i][j].probability /= totalProbability;
		}
	}
}

// Sets all of the probabilities to the same value
function equalizeProbabilities(currentWords) {
	for (let i = 0; i < currentWords.length; i++) {
		for (let j = 0; j < currentWords[i].length; j++) {
			currentWords[i][j].probability = 1;
		}
	}

	// Now that all of the probabilities are equal,
	// normalize them so together they all add up to 1.
	normalizeProbabilities(currentWords);
}

function updateProbabilites(
	currentWords,
	wordsRecentlySeenQueue,
	currentWord,
	currentWordWasCorrect
) {
	const roundsToWait = 2;

	// If the number of current verb + adjective conjugations is less than roundsToWait + 1,
	// the pool of conjugations is too small for our wordsRecentlySeenQueue to work.
	if (currentWords[0].length + currentWords[1].length < roundsToWait + 1) {
		return;
	}

	// We wait "roundsToWait" rounds to set the probability of questions.
	// This allows us to have a few rounds immediately after a question where it's guaranteed to not appear again,
	// followed by the ability to set a high probability for the question to show up immediately after that waiting period (if the answer was incorrect).
	if (wordsRecentlySeenQueue.length >= roundsToWait) {
		let dequeuedWord = wordsRecentlySeenQueue.shift();
		// Using findMinProb isn't a good solution because if you get one correct it's going to shrink the min prob a lot and affect future questions you get right or wrong.
		// In the future there should probably be a static probability given to corrects, incorrects, and unseens, where that probability slowly grows the longer the word hasn't been seen.
		let currentMinProb = findMinProb(currentWords);
		const correctProbModifier = 0.5;
		const incorrectProbModifier = 0.85;

		let newProbability;

		if (dequeuedWord.wasCorrect && !dequeuedWord.word.wasRecentlyIncorrect) {
			newProbability = currentMinProb * correctProbModifier;
		} else if (
			dequeuedWord.wasCorrect &&
			dequeuedWord.word.wasRecentlyIncorrect
		) {
			newProbability = currentMinProb * incorrectProbModifier;
			dequeuedWord.word.wasRecentlyIncorrect = false;
		} else if (!dequeuedWord.wasCorrect) {
			// Set to an arbitrary high number to (nearly) guarantee this question is asked next.
			newProbability = 10;
		}

		dequeuedWord.word.probability = newProbability;
	}

	// Keep track of misses so when the user finally gets it right,
	// we can still give it a higher probability of appearing again than
	// questions they got right on the first try.
	if (!currentWordWasCorrect) {
		currentWord.wasRecentlyIncorrect = true;
	}

	wordsRecentlySeenQueue.push(
		new WordRecentlySeen(currentWord, currentWordWasCorrect)
	);
	// Make sure the user will not see the current question until at least "roundsToWait" number of rounds
	currentWord.probability = 0;

	normalizeProbabilities(currentWords);
}

// returns 2D array [verbarray, adjarray]
function createWordList(JSONWords) {
	let wordList = createArrayOfArrays(JSONWords.length);

	for (let i = 0; i < JSONWords.length; i++) {
		for (let j = 0; j < JSONWords[i].length; j++) {
			let conjugations = getAllConjugations(JSONWords[i][j]);

			for (let k = 0; k < conjugations.length; k++) {
				wordList[i].push(new Word(JSONWords[i][j], conjugations[k]));
			}
		}
	}
	return wordList;
}

// 0 = verbs 1 = adjectives
// storing in array instead of object to make parsing faster

function getWords() {
	new ConjugationApp([wordData.verbs, wordData.adjectives]);
}

function pickRandomWord(wordList) {
	let random = Math.random();

	try {
		for (let i = 0; i < wordList.length; i++) {
			for (let j = 0; j < wordList[i].length; j++) {
				if (random < wordList[i][j].probability) {
					return wordList[i][j];
				}
				random -= wordList[i][j].probability;
			}
		}
		throw "no random word chosen";
	} catch (err) {
		console.log(err);
		return wordList[0][0];
	}
}

function addToScore(amount = 1, maxScoreObjects, maxScoreIndex) {
	if (amount == 0) {
		return;
	}
	let max = document.getElementById("max-streak-text");
	let current = document.getElementById("current-streak-text");

	if (parseInt(max.textContent) <= parseInt(current.textContent)) {
		let newAmount = parseInt(max.textContent) + amount;
		max.textContent = newAmount;
		if (
			!document
				.getElementById("max-streak")
				.classList.contains("display-none")
		) {
			max.classList.add("grow-animation");
		}

		maxScoreObjects[maxScoreIndex].score = newAmount;
		localStorage.setItem("maxScoreObjects", JSON.stringify(maxScoreObjects));
	}

	current.textContent = parseInt(current.textContent) + amount;
	if (
		!document
			.getElementById("current-streak")
			.classList.contains("display-none")
	) {
		current.classList.add("grow-animation");
	}
}

function typeToWordBoxColor(type) {
	switch (type) {
		case "u":
			return "rgb(255, 125, 0)";
		case "ru":
			return "rgb(5, 80, 245)";
		case "irv":
			return "gray";
		case "ira":
			return "gray";
		case "i":
			return "rgb(0, 180, 240)";
		case "na":
			return "rgb(143, 73, 40)";
	}
}

function updateStatusBoxes(word, entryText) {
	let statusBox = document.getElementById("status-box");
	statusBox.style.display = "inline-flex";

	if (word.conjugation.conjugations.some((e) => e == entryText)) {
		statusBox.style.background = "green";
		document.getElementById("status-text").innerHTML =
			"Correct" + "<br>" + entryText + " ○";
	} else {
		document.getElementById("verb-box").style.background = typeToWordBoxColor(
			word.wordJSON.type
		);
		changeVerbBoxFontColor("white");
		document.getElementById("verb-type").textContent = wordTypeToDisplayText(
			word.wordJSON.type
		);

		statusBox.style.background = "rgb(218, 5, 5)";
		document.getElementById("status-text").innerHTML =
			(entryText == "" ? "_" : entryText) +
			" ×<br>" +
			word.conjugation.conjugations[0] +
			" ○";
	}
}

function addClassName(element, name) {
	let arr = element.className.split(" ");
	if (arr.indexOf(name) == -1) {
		element.className += " " + name;
	}
}

function checkToEnableBackButton() {
	let errors = document.getElementsByClassName("must-choose-one-text");
	for (let error of Array.from(errors)) {
		// checks if any error messages take up space on the screen
		if (error.offsetWidth > 0 && error.offsetHeight > 0) {
			document.getElementById("back-button").disabled = true;
			return;
		}
	}

	document.getElementById("back-button").disabled = false;
}

function onClickCheckboxCheckError(e) {
	optionsGroupCheckError(e.currentTarget);
}

function toggleClassName(element, className, enabled) {
	if (enabled) {
		addClassName(element, className);
	} else {
		element.className = element.className.replace(className, "");
	}
}

function toggleDisplayNone(element, enabled) {
	toggleClassName(element, "display-none", enabled);
}

function toggleError(errorElement, errorMessage, enabled) {
	if (enabled) {
		let backButton = document.getElementById("back-button");
		errorElement.textContent = errorMessage;
		toggleDisplayNone(errorElement, false);
		backButton.disabled = true;
	} else {
		toggleDisplayNone(errorElement, true);
		checkToEnableBackButton();
	}
}

function checkInputsForError(inputs, shouldBeChecked) {
	for (let input of Array.from(inputs)) {
		if (input.checked !== shouldBeChecked) {
			return false;
		}
	}
	return true;
}

function checkInputsAndToggleError(
	inputs,
	errorElement,
	errorMessage,
	shouldBeChecked
) {
	toggleError(
		errorElement,
		errorMessage,
		checkInputsForError(inputs, shouldBeChecked)
	);
}

function optionsGroupCheckError(groupElement) {
	let inputs = groupElement.getElementsByTagName("input");
	let errorElement = groupElement.getElementsByClassName(
		"must-choose-one-text"
	)[0];

	checkInputsAndToggleError(
		inputs,
		errorElement,
		"*Must choose at least 1 option from this category",
		false
	);
}

function verbAndAdjCheckError() {
	let inputs = [
		document.querySelector('input[name="verb"]'),
		document.querySelector('input[name="adjective"]'),
	];
	toggleDisplayNone(
		document.getElementById("verb-options-container"),
		!inputs[0].checked
	);
	toggleDisplayNone(
		document.getElementById("adjective-options-container"),
		!inputs[1].checked
	);
	let errorElement = document.getElementById("top-must-choose");

	checkInputsAndToggleError(
		inputs,
		errorElement,
		"*Must choose at least 1 option from this category",
		false
	);
}

// --public namespace addition--
let inputsToSelectVerbPresAffPlain = [];
const verbPresentInput = document.querySelector('input[name="verbpresent"]');
const verbAffirmativeInput = document.querySelector(
	'input[name="verbaffirmative"]'
);
const verbPlainInput = document.querySelector('input[name="verbplain"]');
inputsToSelectVerbPresAffPlain.push(verbPresentInput);
inputsToSelectVerbPresAffPlain.push(verbAffirmativeInput);
inputsToSelectVerbPresAffPlain.push(verbPlainInput);

let inputsToDeselectVerbPresAffPlain = [];
inputsToDeselectVerbPresAffPlain = inputsToDeselectVerbPresAffPlain.concat(
	Array.from(
		document.getElementById("verb-tense-group").getElementsByTagName("input")
	).filter((e) => e != verbPresentInput)
);
inputsToDeselectVerbPresAffPlain = inputsToDeselectVerbPresAffPlain.concat(
	Array.from(
		document
			.getElementById("verb-variations-container")
			.getElementsByTagName("input")
	).filter((e) => e != verbAffirmativeInput && e != verbPlainInput)
);
// --public namespace addition end--

function verbPresAffPlainCheckError() {
	let optionsGroup = document.getElementById("verb-tense-group");
	let errorElement = optionsGroup.getElementsByClassName(
		"must-choose-one-text"
	)[0];

	let selected = checkInputsForError(inputsToSelectVerbPresAffPlain, true);
	let unselected = checkInputsForError(
		inputsToDeselectVerbPresAffPlain,
		false
	);

	if (selected && unselected) {
		toggleError(
			errorElement,
			"*Invalid combination: present, affirmative, plain",
			true
		);
		// element could be hidden because verb is unchecked, so check to enable back button
		checkToEnableBackButton();
	} else {
		optionsGroupCheckError(optionsGroup);
	}
}

// --public namespace addition--
let inputsToSelectAdjPresAffPlain = [];
const adjPresentInput = document.querySelector(
	'input[name="adjectivepresent"]'
);
const adjAffirmativeInput = document.querySelector(
	'input[name="adjectiveaffirmative"]'
);
const adjPlainInput = document.querySelector('input[name="adjectiveplain"]');
inputsToSelectAdjPresAffPlain.push(adjPresentInput);
inputsToSelectAdjPresAffPlain.push(adjAffirmativeInput);
inputsToSelectAdjPresAffPlain.push(adjPlainInput);

let inputsToDeselectAdjPresAffPlain = [];
inputsToDeselectAdjPresAffPlain = inputsToDeselectAdjPresAffPlain.concat(
	Array.from(
		document
			.getElementById("adjective-tense-group")
			.getElementsByTagName("input")
	).filter((e) => e != adjPresentInput)
);
inputsToDeselectAdjPresAffPlain = inputsToDeselectAdjPresAffPlain.concat(
	Array.from(
		document
			.getElementById("adjective-variations-container")
			.getElementsByTagName("input")
	).filter((e) => e != adjAffirmativeInput && e != adjPlainInput)
);
// --public namespace addition end--

function adjPresAffPlainCheckError() {
	let optionsGroup = document.getElementById("adjective-type-group");
	let errorElement = optionsGroup.getElementsByClassName(
		"must-choose-one-text"
	)[0];

	let selected = checkInputsForError(inputsToSelectAdjPresAffPlain, true);
	let unselected = checkInputsForError(inputsToDeselectAdjPresAffPlain, false);

	let iAdjInput = document.querySelector('input[name="adjectivei"]');
	let irrAdjInput = document.querySelector('input[name="adjectiveirregular"]');
	let naAdjInput = document.querySelector('input[name="adjectivena"]');
	if (
		selected &&
		unselected &&
		!naAdjInput.checked &&
		(iAdjInput.checked || irrAdjInput.checked)
	) {
		toggleError(
			errorElement,
			"*Invalid combination: い/irregular, present, affirmative, plain",
			true
		);
		// element could be hidden because verb is unchecked, so check to enable back button
		checkToEnableBackButton();
	} else if (document.querySelector('input[name="adjective"]').checked) {
		optionsGroupCheckError(optionsGroup);
	}
}

// In this context the options Affirmative, Negative, Plain, and Polite
// are considered "variations" on other conjugation types.
// Not all types (like て for verbs, adverbs for adjectives) have variations.
function showHideConjugationVariationOptions(
	inputWithVariationsClass,
	variationsContainerId
) {
	let inputsWithVariations = document.getElementsByClassName(
		inputWithVariationsClass
	);
	let variationsContainer = document.getElementById(variationsContainerId);

	for (let input of Array.from(inputsWithVariations)) {
		if (input.checked) {
			let optionGroups =
				variationsContainer.getElementsByClassName("options-group");
			for (let optionGroup of Array.from(optionGroups)) {
				optionsGroupCheckError(optionGroup);
			}

			toggleDisplayNone(variationsContainer, false);
			return;
		}
	}

	// If no conjugations with variations were selected, hide the variation options.
	toggleDisplayNone(variationsContainer, true);
}

function showHideVerbVariationOptions() {
	showHideConjugationVariationOptions(
		"verb-has-variations",
		"verb-variations-container"
	);
}

function showHideAdjectiveVariationOptions() {
	showHideConjugationVariationOptions(
		"adjective-has-variations",
		"adjective-variations-container"
	);
}

function showHideTranslationSubOptions() {
	toggleDisplayNone(
		document.getElementById("translation-sub-options"),
		!document.getElementById("translation-checkbox").checked
	);
}

function optionsMenuInit() {
	let optionsGroups = document.getElementsByClassName("options-group");
	for (let optionGroup of Array.from(optionsGroups)) {
		// Note that this registers a listener for a click anywhere in the
		// options-group element (not just the checkboxes).
		optionGroup.addEventListener("click", onClickCheckboxCheckError);
	}

	let verbInputsWithVariations = document.getElementsByClassName(
		"verb-has-variations"
	);
	for (let input of Array.from(verbInputsWithVariations)) {
		input.addEventListener("click", showHideVerbVariationOptions);
	}

	let adjectiveInputsWithVariations = document.getElementsByClassName(
		"adjective-has-variations"
	);
	for (let input of Array.from(adjectiveInputsWithVariations)) {
		input.addEventListener("click", showHideAdjectiveVariationOptions);
	}

	document
		.getElementById("translation-checkbox")
		.addEventListener("click", showHideTranslationSubOptions);

	document
		.getElementById("verbs-checkbox")
		.addEventListener("click", verbAndAdjCheckError);
	document
		.getElementById("adjectives-checkbox")
		.addEventListener("click", verbAndAdjCheckError);

	// top level errors
	let optionsView = document.getElementById("options-view");
	optionsView.addEventListener("click", verbPresAffPlainCheckError);
	optionsView.addEventListener("click", adjPresAffPlainCheckError);
}

function applyNonConjugationSettings(settings) {
	showFurigana(settings.furigana);
	showEmojis(settings.emoji);
	showStreak(settings.streak);
	// "showTranslation" is dependent on the state, so we can't set it here
}

function applySettingsLoadWords(settings, completeWordList) {
	applyNonConjugationSettings(settings);

	let currentWordList = createArrayOfArrays(completeWordList.length);

	const verbRegex = /^verb.+/;
	if (settings.verb !== false) {
		// Copy all of the verbs over
		currentWordList[0] = [...completeWordList[0]];

		let verbOptions = Object.keys(settings).filter((el) =>
			verbRegex.test(el)
		);
		// Filter out the verbs we don't want
		for (let i = 0; i < verbOptions.length; i++) {
			if (settings[verbOptions[i]] === false) {
				currentWordList[0] = currentWordList[0].filter(
					questionRemoveFilters.verbs[verbOptions[i]]
				);
			}
		}
	}

	const adjectiveRegex = /^adjective.+/;
	if (settings.adjective !== false) {
		// Copy all of the adjectives over
		currentWordList[1] = [...completeWordList[1]];

		let adjectiveOptions = Object.keys(settings).filter((el) =>
			adjectiveRegex.test(el)
		);
		// Filter out the adjectives we don't want
		for (let i = 0; i < adjectiveOptions.length; i++) {
			if (settings[adjectiveOptions[i]] === false) {
				currentWordList[1] = currentWordList[1].filter(
					questionRemoveFilters.adjectives[adjectiveOptions[i]]
				);
			}
		}
	}

	equalizeProbabilities(currentWordList);
	return currentWordList;
}

// stored in array in local storage
class maxScoreObject {
	constructor(score, settings) {
		this.score = score;
		this.settings = settings;
	}
}

function findSettingCombination(maxScoreObjects, settings) {
	let settingKeys = Object.keys(settings);
	let flag;
	for (let i = 0; i < maxScoreObjects.length; i++) {
		flag = true;
		for (let s of settingKeys) {
			if (maxScoreObjects[i].settings[s] != settings[s]) {
				flag = false;
				break;
			}
		}
		if (flag == true) {
			return i;
		}
	}
	return -1;
}

class ConjugationApp {
	constructor(words) {
		let input = document.getElementsByTagName("input")[0];
		bind(input);

		this.initState(words);

		document
			.getElementsByTagName("input")[0]
			.addEventListener("keydown", (e) => this.inputKeyPress(e));
		document
			.getElementById("options-button")
			.addEventListener("click", (e) => this.settingsButtonClicked(e));
		document
			.getElementById("options-form")
			.addEventListener("submit", (e) => this.backButtonClicked(e));

		document
			.getElementById("current-streak-text")
			.addEventListener("animationend", (e) => {
				document
					.getElementById("current-streak-text")
					.classList.remove(e.animationName);
			});
		document
			.getElementById("max-streak-text")
			.addEventListener("animationend", (e) => {
				document
					.getElementById("max-streak-text")
					.classList.remove(e.animationName);
			});

		document
			.getElementById("status-box")
			.addEventListener("animationend", (e) => {
				document
					.getElementById("status-box")
					.classList.remove(e.animationName);
			});

		document
			.getElementById("input-tooltip")
			.addEventListener("animationend", (e) => {
				document
					.getElementById("input-tooltip")
					.classList.remove(e.animationName);
			});

		document.addEventListener("keydown", this.onKeyDown.bind(this));
		document.addEventListener("touchend", this.onTouchEnd.bind(this));

		optionsMenuInit();
	}

	loadMainView() {
		this.state.activeScreen = SCREENS.question;

		document.getElementsByTagName("input")[0].disabled = false;
		document.getElementsByTagName("input")[0].value = "";
		document
			.getElementById("input-tooltip")
			.classList.remove("tooltip-fade-animation");

		document.getElementById("press-any-key-text").style.display = "none";
		document.getElementById("status-box").style.display = "none";

		if (this.state.currentStreak0OnReset) {
			document.getElementById("current-streak-text").textContent = "0";
			this.state.currentStreak0OnReset = false;
		}

		if (this.state.loadWordOnReset) {
			this.state.currentWord = loadNewWord(this.state.currentWordList);
			this.state.loadWordOnReset = false;
		}

		// Translation may need to be hidden during the question screen
		showTranslation(
			this.state.settings.translation,
			this.state.settings.translationTiming ===
				TRANSLATION_TIMINGS.onlyAfterAnswering
		);
	}

	// Handle generic keydown events that aren't targeting a specific element
	onKeyDown(e) {
		let keyCode = e.keyCode ? e.keyCode : e.which;
		if (this.state.activeScreen === SCREENS.results && keyCode == "13") {
			this.loadMainView();
		}
	}

	// Handle generic touchend events that aren't targeting a specific element
	onTouchEnd(e) {
		if (
			this.state.activeScreen === SCREENS.results &&
			e.target != document.getElementById("options-button")
		) {
			this.loadMainView();
		}
	}

	inputKeyPress(e) {
		let keyCode = e.keyCode ? e.keyCode : e.which;
		if (keyCode == "13") {
			this.state.activeScreen = SCREENS.results;

			let inputEl = document.getElementsByTagName("input")[0];
			e.stopPropagation();

			let inputValue = inputEl.value;
			const finalChar = inputValue[inputValue.length - 1];
			switch (finalChar) {
				// Set hanging n to ん
				case "n":
					inputValue = inputValue.replace(/n$/, "ん");
					break;
				// Remove hanging 。
				case "。":
					inputValue = inputValue.replace(/。$/, "");
			}

			if (!isJapanese(inputValue)) {
				document
					.getElementById("input-tooltip")
					.classList.add("tooltip-fade-animation");
				return;
			} else {
				document
					.getElementById("input-tooltip")
					.classList.remove("tooltip-fade-animation");
			}

			inputEl.blur();
			updateStatusBoxes(this.state.currentWord, inputValue);
			// If the translation was made transparent during the question, make it visible now
			showTranslation(this.state.settings.translation, false);

			// update probabilities before next word is chosen so don't choose same word
			let inputWasCorrect =
				this.state.currentWord.conjugation.conjugations.some(
					(e) => e == inputValue
				);

			updateProbabilites(
				this.state.currentWordList,
				this.state.wordsRecentlySeenQueue,
				this.state.currentWord,
				inputWasCorrect
			);

			if (inputWasCorrect) {
				addToScore(1, this.state.maxScoreObjects, this.state.maxScoreIndex);
				this.state.currentStreak0OnReset = false;
			} else {
				this.state.currentStreak0OnReset = true;
			}
			this.state.loadWordOnReset = true;

			document.getElementsByTagName("input")[0].disabled = true;
			document.getElementById("press-any-key-text").style.display =
				"table-cell";

			inputEl.value = "";
		}
	}

	settingsButtonClicked(e) {
		this.state.activeScreen = SCREENS.settings;

		let checkboxInputs = document.querySelectorAll(
			`#options-form input[type="checkbox"]`
		);
		for (let input of Array.from(checkboxInputs)) {
			input.checked = this.state.settings[input.name];
		}

		switch (this.state.settings.translationTiming) {
			case TRANSLATION_TIMINGS.always:
				document.getElementById("translation-always-radio").checked = true;
				break;
			case TRANSLATION_TIMINGS.onlyAfterAnswering:
				document.getElementById("translation-after-radio").checked = true;
				break;
		}

		let optionsGroups = document.getElementsByClassName("options-group");
		for (let group of Array.from(optionsGroups)) {
			optionsGroupCheckError(group);
		}

		showHideVerbVariationOptions();
		showHideAdjectiveVariationOptions();
		showHideTranslationSubOptions();

		verbAndAdjCheckError();

		document.getElementById("main-view").style.display = "none";
		document.getElementById("options-view").style.display = "block";
		document.getElementById("donation-section").style.display = "block";
	}

	backButtonClicked(e) {
		e.preventDefault();

		let checkboxInputs = document.querySelectorAll(
			'#options-form input[type="checkbox"]'
		);
		let newMaxScoreSettings = {};
		for (let input of Array.from(checkboxInputs)) {
			this.state.settings[input.name] = input.checked;
			if (
				input.offsetWidth > 0 &&
				input.offsetHeight > 0 &&
				!nonConjugationSettings.has(input.name)
			) {
				newMaxScoreSettings[input.name] = input.checked;
			}
		}

		// Set the one input radio setting
		this.state.settings.translationTiming =
			document.querySelector(`input[name="translationTiming"]:checked`)
				?.value ?? TRANSLATION_TIMINGS.always;

		localStorage.setItem("settings", JSON.stringify(this.state.settings));

		let settingsIndex = findSettingCombination(
			this.state.maxScoreObjects,
			newMaxScoreSettings
		);
		if (settingsIndex == -1) {
			this.state.maxScoreObjects.push(
				new maxScoreObject(0, newMaxScoreSettings)
			);
			localStorage.setItem(
				"maxScoreObjects",
				JSON.stringify(this.state.maxScoreObjects)
			);
			settingsIndex = this.state.maxScoreObjects.length - 1;
		}

		if (settingsIndex !== this.state.maxScoreIndex) {
			localStorage.setItem("maxScoreIndex", settingsIndex);
			this.state.maxScoreIndex = settingsIndex;
			this.state.currentStreak0OnReset = true;
			this.state.loadWordOnReset = true;

			this.state.currentWordList = applySettingsLoadWords(
				this.state.settings,
				this.state.completeWordList
			);

			// Note that the wordsRecentlySeenQueue is not cleared.
			// This is intentional, so if the new word list happens to include the words you recently missed,
			// they still have the chance of appearing again in a couple of rounds to retry.
			// If currentWordList doesn't contain those words in the queue, they won't be chosen anyways so the queue probability logic silenty fails.
		} else {
			// If none of the conjugation settings were changed, don't reload the word list or reset the probabilities
			applyNonConjugationSettings(this.state.settings);
		}

		document.getElementById("max-streak-text").textContent =
			this.state.maxScoreObjects[this.state.maxScoreIndex].score;

		this.loadMainView();

		document.getElementById("main-view").style.display = "block";
		document.getElementById("options-view").style.display = "none";
		document.getElementById("donation-section").style.display = "none";
	}

	initState(words) {
		this.state = {};
		this.state.completeWordList = createWordList(words);

		if (!localStorage.getItem("maxScoreIndex")) {
			this.state.maxScoreIndex = 0;
			localStorage.setItem("maxScoreIndex", this.state.maxScoreIndex);

			this.state.settings = defaultSettings();
			localStorage.setItem("settings", JSON.stringify(this.state.settings));

			this.state.maxScoreObjects = [
				new maxScoreObject(
					0,
					removeNonConjugationSettings(this.state.settings)
				),
			];
			localStorage.setItem(
				"maxScoreObjects",
				JSON.stringify(this.state.maxScoreObjects)
			);
		} else {
			this.state.maxScoreIndex = parseInt(
				localStorage.getItem("maxScoreIndex")
			);
			this.state.settings = Object.assign(
				defaultSettings(),
				JSON.parse(localStorage.getItem("settings"))
			);
			this.state.maxScoreObjects = JSON.parse(
				localStorage.getItem("maxScoreObjects")
			);
		}

		this.state.currentWordList = applySettingsLoadWords(
			this.state.settings,
			this.state.completeWordList
		);
		this.state.currentWord = loadNewWord(this.state.currentWordList);
		this.state.wordsRecentlySeenQueue = [];

		this.state.currentStreak0OnReset = false;
		this.state.loadWordOnReset = false;

		document.getElementById("max-streak-text").textContent =
			this.state.maxScoreObjects[this.state.maxScoreIndex].score;

		this.loadMainView();
	}
}

getWords();
// Keeping the top container hidden at the beginning prevents 1 frame of malformed UI being shown
toggleDisplayNone(document.getElementById("toppest-container"), false);
