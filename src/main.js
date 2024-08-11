// since the weights are mostly only used to make things repeat after x amount of rounds, they are overkill
// would be less work to just wait x rounds and immeditely show what you missed, without updating any weights.
"use strict";
import { bind, isJapanese } from "wanakana";
import {
	CONDITIONAL_UI_TIMINGS,
	getDefaultSettings,
	getVisibleConjugationSettings,
	removeNonConjugationSettings,
	showFurigana,
	showTranslation,
	findMaxScoreIndex,
	applyAllSettingsFilterWords,
	applyNonConjugationSettings,
	optionsMenuInit,
	selectCheckboxesInUi,
	showHideOptionsAndCheckErrors,
	insertSettingsFromUi,
	getDefaultAdditiveSettings,
} from "./settingManagement.js";
import { wordData } from "./wordData.js";
import { CONJUGATION_TYPES, PARTS_OF_SPEECH } from "./wordEnums.js";
import {
	toggleDisplayNone,
	createArrayOfArrays,
	toggleBackgroundNone,
} from "./utils.js";

const isTouch = "ontouchstart" in window || navigator.msMaxTouchPoints > 0;
document.getElementById("press-any-key-text").textContent = isTouch
	? "Tap to continue"
	: "Press Enter/Return to continue";

// Stored in state.activeScreen
const SCREENS = Object.freeze({
	question: 0,
	// Incorrect and correct answers are considered the same "results" screen
	results: 1,
	settings: 2,
});

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

	function createInqueryText(text, emoji) {
		return `<div class="conjugation-inquery"><div class="inquery-emoji">${emoji}</div><div class="inquery-text">${text}</div></div> `;
	}

	if (conjugation.type === CONJUGATION_TYPES.past) {
		newString += createInqueryText(CONJUGATION_TYPES.past, "⌚");
	} else if (
		conjugation.type === CONJUGATION_TYPES.te ||
		conjugation.type === CONJUGATION_TYPES.adverb
	) {
		newString += conjugation.type;
	} else if (conjugation.type === CONJUGATION_TYPES.volitional) {
		newString += createInqueryText(CONJUGATION_TYPES.volitional, "🍻");
	} else if (conjugation.type === CONJUGATION_TYPES.passive) {
		newString += createInqueryText(CONJUGATION_TYPES.passive, "🧘");
	} else if (conjugation.type === CONJUGATION_TYPES.causative) {
		newString += createInqueryText(CONJUGATION_TYPES.causative, "👩‍🏫");
	} else if (conjugation.type === CONJUGATION_TYPES.potential) {
		newString += createInqueryText(CONJUGATION_TYPES.potential, "‍🏋");
	} else if (conjugation.type === CONJUGATION_TYPES.imperative) {
		newString += createInqueryText(CONJUGATION_TYPES.imperative, "📢");
	}

	// This used to also add "Affirmative" text when affirmative was true, but it was a little redundant.
	// Now it only adds "Negative" text when affirmative is false.
	if (conjugation.affirmative === false) {
		newString += createInqueryText("Negative", "🚫");
	}

	if (conjugation.polite === true) {
		newString += createInqueryText("Polite", "👔");
	} else if (conjugation.polite === false) {
		newString += createInqueryText("Plain", "👪");
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
	changeVerbBoxFontColor("rgb(232, 232, 232)");
	return word;
}

function updateCurrentWord(word) {
	// Caution: verb-box is controlled using a combination of the background-none class and setting style.background directly.
	// The background-none class is useful for other CSS selectors to grab onto,
	// while the style.background is useful for setting variable bg colors.
	toggleBackgroundNone(document.getElementById("verb-box"), true);
	// The <rt> element had different padding on different browsers.
	// Rather than attacking it with CSS, just replace it with a span we have control over.
	const verbHtml = word.wordJSON.kanji
		.replaceAll("<rt>", '<span class="rt">')
		.replaceAll("</rt>", "</span>");
	document.getElementById("verb-text").innerHTML = verbHtml;
	document.getElementById("translation").textContent = word.wordJSON.eng;
	// Set verb-type to a non-breaking space to preserve vertical height
	document.getElementById("verb-type").textContent = "\u00A0";
	document.getElementById("conjugation-inquery-text").innerHTML =
		conjugationInqueryFormatting(word.conjugation);
}

function touConjugation(affirmative, polite, conjugationType, isKanji) {
	const firstLetter = isKanji ? "問" : "と";
	const plainForm = firstLetter + "う";
	if (conjugationType === CONJUGATION_TYPES.present) {
		if (affirmative && polite) {
			return `${firstLetter}います`;
		} else if (affirmative && !polite) {
			return `${firstLetter}う`;
		} else if (!affirmative && polite) {
			return [`${firstLetter}いません`, `${firstLetter}わないです`];
		} else if (!affirmative && !polite) {
			return `${firstLetter}わない`;
		}
	} else if (conjugationType === CONJUGATION_TYPES.past) {
		if (affirmative && polite) {
			return `${firstLetter}いました`;
		} else if (affirmative && !polite) {
			return `${firstLetter}うた`;
		} else if (!affirmative && polite) {
			return [
				`${firstLetter}いませんでした`,
				`${firstLetter}わなかったです`,
			];
		} else if (!affirmative && !polite) {
			return `${firstLetter}わなかった`;
		}
	} else if (conjugationType === CONJUGATION_TYPES.te) {
		return `${firstLetter}うて`;
	} else if (conjugationType === CONJUGATION_TYPES.volitional) {
		if (polite) {
			return `${firstLetter}いましょう`;
		} else {
			return `${firstLetter}おう`;
		}
	} else if (
		conjugationType === CONJUGATION_TYPES.passive ||
		conjugationType === CONJUGATION_TYPES.causative ||
		conjugationType === CONJUGATION_TYPES.potential ||
		conjugationType === CONJUGATION_TYPES.imperative
	) {
		return conjugationFunctions.verb[conjugationType](
			plainForm,
			"u",
			affirmative,
			polite
		);
	}
}

function aruConjugation(affirmative, polite, conjugationType) {
	if (conjugationType == CONJUGATION_TYPES.present) {
		if (affirmative && polite) {
			return "あります";
		} else if (affirmative && !polite) {
			return "ある";
		} else if (!affirmative && polite) {
			return ["ありません", "ないです"];
		} else if (!affirmative && !polite) {
			return "ない";
		}
	} else if (conjugationType == CONJUGATION_TYPES.past) {
		if (affirmative && polite) {
			return "ありました";
		} else if (affirmative && !polite) {
			return "あった";
		} else if (!affirmative && polite) {
			return ["ありませんでした", "なかったです"];
		} else if (!affirmative && !polite) {
			return "なかった";
		}
	} else if (conjugationType == CONJUGATION_TYPES.te) {
		return "あって";
	} else if (conjugationType === CONJUGATION_TYPES.volitional) {
		if (polite) {
			return "ありましょう";
		} else {
			return "あろう";
		}
	} else if (
		conjugationType === CONJUGATION_TYPES.passive ||
		conjugationType === CONJUGATION_TYPES.causative ||
		conjugationType === CONJUGATION_TYPES.imperative
	) {
		return conjugationFunctions.verb[conjugationType](
			"ある",
			"u",
			affirmative,
			polite
		);
	} else if (conjugationType === CONJUGATION_TYPES.potential) {
		// あれる seems to technically be valid but never used.
		// This leaves あれる out of the answer array so people don't enter あれる without ever seeing that ありえる is the common approach.
		if (affirmative && polite) {
			return ["ありえます", "あり得ます"];
		} else if (affirmative && !polite) {
			// ありうる is only used for the plain form
			return ["ありえる", "あり得る", "ありうる"];
		} else if (!affirmative && polite) {
			return ["ありえません", "あり得ません"];
		} else if (!affirmative && !polite) {
			return ["ありえない", "あり得ない"];
		}
	}
}

function kuruConjugation(affirmative, polite, conjugationType, isKanji) {
	let retval;
	if (conjugationType === CONJUGATION_TYPES.present) {
		if (affirmative && polite) {
			retval = "きます";
		} else if (affirmative && !polite) {
			retval = "くる";
		} else if (!affirmative && polite) {
			retval = ["きません", "こないです"];
		} else if (!affirmative && !polite) {
			retval = "こない";
		}
	} else if (conjugationType === CONJUGATION_TYPES.past) {
		if (affirmative && polite) {
			retval = "きました";
		} else if (affirmative && !polite) {
			retval = "きた";
		} else if (!affirmative && polite) {
			retval = ["きませんでした", "こなかったです"];
		} else if (!affirmative && !polite) {
			retval = "こなかった";
		}
	} else if (conjugationType === CONJUGATION_TYPES.te) {
		retval = "きて";
	} else if (conjugationType === CONJUGATION_TYPES.volitional) {
		if (polite) {
			retval = "きましょう";
		} else {
			retval = "こよう";
		}
	} else if (
		conjugationType === CONJUGATION_TYPES.passive ||
		conjugationType === CONJUGATION_TYPES.causative ||
		conjugationType === CONJUGATION_TYPES.potential
	) {
		retval = conjugationFunctions.verb[conjugationType](
			"こる",
			"ru",
			affirmative,
			polite
		);
	} else if (conjugationType === CONJUGATION_TYPES.imperative) {
		retval = "こい";
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

function suruConjugation(affirmative, polite, conjugationType) {
	if (conjugationType === CONJUGATION_TYPES.present) {
		if (affirmative && polite) {
			return "します";
		} else if (affirmative && !polite) {
			return "する";
		} else if (!affirmative && polite) {
			return ["しません", "しないです"];
		} else if (!affirmative && !polite) {
			return "しない";
		}
	} else if (conjugationType === CONJUGATION_TYPES.past) {
		if (affirmative && polite) {
			return "しました";
		} else if (affirmative && !polite) {
			return "した";
		} else if (!affirmative && polite) {
			return ["しませんでした", "しなかったです"];
		} else if (!affirmative && !polite) {
			return "しなかった";
		}
	} else if (conjugationType === CONJUGATION_TYPES.te) {
		return "して";
	} else if (conjugationType === CONJUGATION_TYPES.volitional) {
		if (polite) {
			return "しましょう";
		} else {
			return "しよう";
		}
	} else if (conjugationType === CONJUGATION_TYPES.passive) {
		if (affirmative && polite) {
			return "されます";
		} else if (affirmative && !polite) {
			return "される";
		} else if (!affirmative && polite) {
			return "されません";
		} else if (!affirmative && !polite) {
			return "されない";
		}
	} else if (conjugationType === CONJUGATION_TYPES.causative) {
		if (affirmative && polite) {
			return "させます";
		} else if (affirmative && !polite) {
			return "させる";
		} else if (!affirmative && polite) {
			return "させません";
		} else if (!affirmative && !polite) {
			return "させない";
		}
	} else if (conjugationType === CONJUGATION_TYPES.potential) {
		// I'm not sure if the kanji form 出来る is the same verb as the potential form of する, できる.
		// Just allow the kanji anyways, who gives a CRAP.
		if (affirmative && polite) {
			return ["できます", "出来ます"];
		} else if (affirmative && !polite) {
			return ["できる", "出来る"];
		} else if (!affirmative && polite) {
			return ["できません", "出来ません"];
		} else if (!affirmative && !polite) {
			return ["できない", "出来ない"];
		}
	} else if (conjugationType === CONJUGATION_TYPES.imperative) {
		return ["しろ", "せよ"];
	}
}

function ikuConjugation(affirmative, polite, conjugationType, isKanji) {
	const firstLetter = isKanji ? "行" : "い";
	const plainForm = firstLetter + "く";
	if (conjugationType === CONJUGATION_TYPES.present) {
		if (affirmative && polite) {
			return `${firstLetter}きます`;
		} else if (affirmative && !polite) {
			return `${firstLetter}く`;
		} else if (!affirmative && polite) {
			return [`${firstLetter}きません`, `${firstLetter}かないです`];
		} else if (!affirmative && !polite) {
			return `${firstLetter}かない`;
		}
	} else if (conjugationType === CONJUGATION_TYPES.past) {
		if (affirmative && polite) {
			return `${firstLetter}きました`;
		} else if (affirmative && !polite) {
			return `${firstLetter}った`;
		} else if (!affirmative && polite) {
			return [
				`${firstLetter}きませんでした`,
				`${firstLetter}かなかったです`,
			];
		} else if (!affirmative && !polite) {
			return `${firstLetter}かなかった`;
		}
	} else if (conjugationType === CONJUGATION_TYPES.te) {
		return `${firstLetter}って`;
	} else if (conjugationType === CONJUGATION_TYPES.volitional) {
		if (polite) {
			return `${firstLetter}きましょう`;
		} else {
			return `${firstLetter}こう`;
		}
	} else if (
		conjugationType === CONJUGATION_TYPES.passive ||
		conjugationType === CONJUGATION_TYPES.causative ||
		conjugationType === CONJUGATION_TYPES.potential ||
		conjugationType === CONJUGATION_TYPES.imperative
	) {
		return conjugationFunctions.verb[conjugationType](
			plainForm,
			"u",
			affirmative,
			polite
		);
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

function irregularVerbConjugation(
	hiraganaVerb,
	affirmative,
	polite,
	conjugationType
) {
	let prefix, conjugatedSuffix;
	if ((prefix = checkSuffix(hiraganaVerb, "いく")) !== false) {
		conjugatedSuffix = ikuConjugation(
			affirmative,
			polite,
			conjugationType,
			false
		);
	} else if ((prefix = checkSuffix(hiraganaVerb, "行く")) !== false) {
		conjugatedSuffix = ikuConjugation(
			affirmative,
			polite,
			conjugationType,
			true
		);
	} else if ((prefix = checkSuffix(hiraganaVerb, "する")) !== false) {
		conjugatedSuffix = suruConjugation(affirmative, polite, conjugationType);
	} else if ((prefix = checkSuffix(hiraganaVerb, "くる")) !== false) {
		conjugatedSuffix = kuruConjugation(
			affirmative,
			polite,
			conjugationType,
			false
		);
	} else if ((prefix = checkSuffix(hiraganaVerb, "来る")) !== false) {
		conjugatedSuffix = kuruConjugation(
			affirmative,
			polite,
			conjugationType,
			true
		);
	} else if ((prefix = checkSuffix(hiraganaVerb, "ある")) !== false) {
		conjugatedSuffix = aruConjugation(affirmative, polite, conjugationType);
	} else if ((prefix = checkSuffix(hiraganaVerb, "とう")) !== false) {
		conjugatedSuffix = touConjugation(
			affirmative,
			polite,
			conjugationType,
			false
		);
	} else if ((prefix = checkSuffix(hiraganaVerb, "問う")) !== false) {
		conjugatedSuffix = touConjugation(
			affirmative,
			polite,
			conjugationType,
			true
		);
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

function iiConjugation(affirmative, polite, conjugationType) {
	if (conjugationType === CONJUGATION_TYPES.present) {
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
	} else if (conjugationType === CONJUGATION_TYPES.past) {
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
	} else if (conjugationType === CONJUGATION_TYPES.adverb) {
		return ["よく", "良く"];
	}
}

function irregularAdjectiveConjugation(
	hiraganaAdjective,
	affirmative,
	polite,
	conjugationType
) {
	if (hiraganaAdjective == "いい") {
		return iiConjugation(affirmative, polite, conjugationType);
	} else if (hiraganaAdjective == "かっこいい") {
		let conjugations = [].concat(
			iiConjugation(affirmative, polite, conjugationType)
		);
		for (let i = 0; i < conjugations.length; i++) {
			conjugations[i] = "かっこ" + conjugations[i];
		}
		return conjugations;
	}
}

function changeUtoI(c) {
	if (c == "う") {
		return "い";
	} else if (c === "く") {
		return "き";
	} else if (c === "ぐ") {
		return "ぎ";
	} else if (c === "す") {
		return "し";
	} else if (c === "ず") {
		return "じ";
	} else if (c === "つ") {
		return "ち";
	} else if (c === "づ") {
		return "ぢ";
	} else if (c === "ぬ") {
		return "に";
	} else if (c === "ふ") {
		return "ひ";
	} else if (c === "ぶ") {
		return "び";
	} else if (c === "ぷ") {
		return "ぴ";
	} else if (c === "む") {
		return "み";
	} else if (c === "る") {
		return "り";
	} else {
		console.debug("Input was not う in changeUtoI, was " + c);
	}
}

function changeUtoA(c) {
	if (c === "う") {
		return "わ";
	} else if (c === "く") {
		return "か";
	} else if (c === "ぐ") {
		return "が";
	} else if (c === "す") {
		return "さ";
	} else if (c === "ず") {
		return "ざ";
	} else if (c === "つ") {
		return "た";
	} else if (c === "づ") {
		return "だ";
	} else if (c === "ぬ") {
		return "な";
	} else if (c === "ふ") {
		return "は";
	} else if (c === "ぶ") {
		return "ば";
	} else if (c === "ぷ") {
		return "ぱ";
	} else if (c === "む") {
		return "ま";
	} else if (c === "る") {
		return "ら";
	} else {
		console.debug("Input was not う in changeUtoA, was " + c);
	}
}

function changeUtoO(c) {
	if (c === "う") {
		return "お";
	} else if (c === "く") {
		return "こ";
	} else if (c === "ぐ") {
		return "ご";
	} else if (c === "す") {
		return "そ";
	} else if (c === "ず") {
		return "ぞ";
	} else if (c === "つ") {
		return "と";
	} else if (c === "づ") {
		return "ど";
	} else if (c === "ぬ") {
		return "の";
	} else if (c === "ふ") {
		return "ほ";
	} else if (c === "ぶ") {
		return "ぼ";
	} else if (c === "ぷ") {
		return "ぽ";
	} else if (c === "む") {
		return "も";
	} else if (c === "る") {
		return "ろ";
	} else {
		console.debug("Input was not う in changeUtoO, was " + c);
	}
}

function changeUtoE(c) {
	if (c === "う") {
		return "え";
	} else if (c === "く") {
		return "け";
	} else if (c === "ぐ") {
		return "げ";
	} else if (c === "す") {
		return "せ";
	} else if (c === "ず") {
		return "ぜ";
	} else if (c === "つ") {
		return "て";
	} else if (c === "づ") {
		return "で";
	} else if (c === "ぬ") {
		return "ね";
	} else if (c === "ふ") {
		return "へ";
	} else if (c === "ぶ") {
		return "べ";
	} else if (c === "ぷ") {
		return "ぺ";
	} else if (c === "む") {
		return "め";
	} else if (c === "る") {
		return "れ";
	} else {
		console.debug("Input was not う in changeUtoE, was " + c);
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
		console.debug(
			"Input was not real verb ending changeToPastPlain, was " + c
		);
	}
}

/**
 * る is dropped for ichidan, う goes to い for godan
 */
function masuStem(baseVerbText, type) {
	return type == "u"
		? baseVerbText.substring(0, baseVerbText.length - 1) +
				changeUtoI(baseVerbText.charAt(baseVerbText.length - 1))
		: baseVerbText.substring(0, baseVerbText.length - 1);
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

// Conjugation functions can return a single string value, or an array of string values
const conjugationFunctions = {
	[PARTS_OF_SPEECH.verb]: {
		[CONJUGATION_TYPES.present]: function (
			baseVerbText,
			type,
			affirmative,
			polite
		) {
			if (type == "irv") {
				return irregularVerbConjugation(
					baseVerbText,
					affirmative,
					polite,
					CONJUGATION_TYPES.present
				);
			} else if (affirmative && polite) {
				return masuStem(baseVerbText, type) + "ます";
			} else if (affirmative && !polite) {
				return baseVerbText;
			} else if (!affirmative && polite) {
				return [
					masuStem(baseVerbText, type) + "ません",
					plainNegativeComplete(baseVerbText, type) + "です",
				];
			} else if (!affirmative && !polite) {
				return plainNegativeComplete(baseVerbText, type);
			}
		},
		[CONJUGATION_TYPES.past]: function (
			baseVerbText,
			type,
			affirmative,
			polite
		) {
			if (type == "irv") {
				return irregularVerbConjugation(
					baseVerbText,
					affirmative,
					polite,
					CONJUGATION_TYPES.past
				);
			} else if (affirmative && polite) {
				return masuStem(baseVerbText, type) + "ました";
			} else if (affirmative && !polite && type == "u") {
				return (
					dropFinalLetter(baseVerbText) +
					changeToPastPlain(baseVerbText.charAt(baseVerbText.length - 1))
				);
			} else if (affirmative && !polite && type == "ru") {
				return masuStem(baseVerbText, type) + "た";
			} else if (!affirmative && polite) {
				let plainNegative = plainNegativeComplete(baseVerbText, type);
				let plainNegativePast = dropFinalLetter(plainNegative) + "かった";
				return [
					masuStem(baseVerbText, type) + "ませんでした",
					plainNegativePast + "です",
				];
			} else if (!affirmative && !polite) {
				let plainNegative = plainNegativeComplete(baseVerbText, type);
				return dropFinalLetter(plainNegative) + "かった";
			}
		},
		[CONJUGATION_TYPES.te]: function (baseVerbText, type) {
			if (type == "irv") {
				return irregularVerbConjugation(
					baseVerbText,
					false,
					false,
					CONJUGATION_TYPES.te
				);
			} else if (type == "u") {
				let finalChar = baseVerbText.charAt(baseVerbText.length - 1);
				if (finalChar == "う" || finalChar == "つ" || finalChar == "る") {
					return dropFinalLetter(baseVerbText) + "って";
				} else if (
					finalChar == "む" ||
					finalChar == "ぶ" ||
					finalChar == "ぬ"
				) {
					return dropFinalLetter(baseVerbText) + "んで";
				} else if (finalChar == "く") {
					return dropFinalLetter(baseVerbText) + "いて";
				} else if (finalChar == "ぐ") {
					return dropFinalLetter(baseVerbText) + "いで";
				} else if (finalChar == "す") {
					return dropFinalLetter(baseVerbText) + "して";
				}
			} else if (type == "ru") {
				return masuStem(baseVerbText, type) + "て";
			}
		},
		// Volitional does not distinguish between affirmative and negative,
		// but take it in as a param so this function's structure matches the other conjugation functions
		[CONJUGATION_TYPES.volitional]: function (
			baseVerbText,
			type,
			affirmative,
			polite
		) {
			if (type === "irv") {
				return irregularVerbConjugation(
					baseVerbText,
					false,
					polite,
					CONJUGATION_TYPES.volitional
				);
			} else if (polite) {
				return masuStem(baseVerbText, type) + "ましょう";
			} else if (!polite) {
				if (type === "u") {
					return (
						dropFinalLetter(baseVerbText) +
						changeUtoO(baseVerbText.charAt(baseVerbText.length - 1)) +
						"う"
					);
				} else if (type === "ru") {
					return masuStem(baseVerbText, type) + "よう";
				}
			}
		},
		[CONJUGATION_TYPES.passive]: function (
			baseVerbText,
			type,
			affirmative,
			polite
		) {
			if (type === "irv") {
				return irregularVerbConjugation(
					baseVerbText,
					affirmative,
					polite,
					CONJUGATION_TYPES.passive
				);
			}

			const verbEndingWithA =
				dropFinalLetter(baseVerbText) +
				changeUtoA(baseVerbText.charAt(baseVerbText.length - 1));

			if (affirmative && polite) {
				return verbEndingWithA + "れます";
			} else if (affirmative && !polite) {
				return verbEndingWithA + "れる";
			} else if (!affirmative && polite) {
				return verbEndingWithA + "れません";
			} else if (!affirmative && !polite) {
				return verbEndingWithA + "れない";
			}
		},
		[CONJUGATION_TYPES.causative]: function (
			baseVerbText,
			type,
			affirmative,
			polite
		) {
			if (type === "irv") {
				return irregularVerbConjugation(
					baseVerbText,
					affirmative,
					polite,
					CONJUGATION_TYPES.causative
				);
			}

			let verbCausativeRoot;
			if (type === "ru") {
				verbCausativeRoot = dropFinalLetter(baseVerbText) + "さ";
			} else if (type === "u") {
				verbCausativeRoot =
					dropFinalLetter(baseVerbText) +
					changeUtoA(baseVerbText.charAt(baseVerbText.length - 1));
			}

			if (affirmative && polite) {
				return verbCausativeRoot + "せます";
			} else if (affirmative && !polite) {
				return verbCausativeRoot + "せる";
			} else if (!affirmative && polite) {
				return verbCausativeRoot + "せません";
			} else if (!affirmative && !polite) {
				return verbCausativeRoot + "せない";
			}
		},
		[CONJUGATION_TYPES.potential]: function (
			baseVerbText,
			type,
			affirmative,
			polite
		) {
			if (type === "irv") {
				return irregularVerbConjugation(
					baseVerbText,
					affirmative,
					polite,
					CONJUGATION_TYPES.potential
				);
			}

			const roots = [];
			if (type === "u") {
				roots.push(
					dropFinalLetter(baseVerbText) +
						changeUtoE(baseVerbText.charAt(baseVerbText.length - 1))
				);
			} else if (type === "ru") {
				// The default spelling should be the dictionary correct "られる",
				// but also allow the common shortened version "れる".
				roots.push(dropFinalLetter(baseVerbText) + "られ");
				roots.push(dropFinalLetter(baseVerbText) + "れ");
			}

			if (affirmative && polite) {
				return roots.map((r) => r + "ます");
			} else if (affirmative && !polite) {
				return roots.map((r) => r + "る");
			} else if (!affirmative && polite) {
				return roots.map((r) => r + "ません");
			} else if (!affirmative && !polite) {
				return roots.map((r) => r + "ない");
			}
		},
		[CONJUGATION_TYPES.imperative]: function (baseVerbText, type) {
			if (type === "irv") {
				return irregularVerbConjugation(
					baseVerbText,
					null,
					null,
					CONJUGATION_TYPES.imperative
				);
			}

			if (type === "ru") {
				return [
					dropFinalLetter(baseVerbText) + "ろ",
					// よ seems to be used as an ending only in written Japanese, but still allow it
					dropFinalLetter(baseVerbText) + "よ",
				];
			}

			if (type === "u") {
				return (
					dropFinalLetter(baseVerbText) +
					changeUtoE(baseVerbText.charAt(baseVerbText.length - 1))
				);
			}
		},
	},

	[PARTS_OF_SPEECH.adjective]: {
		[CONJUGATION_TYPES.present]: function (
			baseAdjectiveText,
			type,
			affirmative,
			polite
		) {
			if (type == "ira") {
				return irregularAdjectiveConjugation(
					baseAdjectiveText,
					affirmative,
					polite,
					CONJUGATION_TYPES.present
				);
			} else if (affirmative && polite) {
				return baseAdjectiveText + "です";
			} else if (affirmative && !polite && type == "i") {
				return baseAdjectiveText;
			} else if (affirmative && !polite && type == "na") {
				return baseAdjectiveText + "だ";
			} else if (!affirmative && polite && type == "i") {
				return [
					dropFinalLetter(baseAdjectiveText) + "くないです",
					dropFinalLetter(baseAdjectiveText) + "くありません",
				];
			} else if (!affirmative && polite && type == "na") {
				return [
					baseAdjectiveText + "じゃないです",
					baseAdjectiveText + "ではないです",
					baseAdjectiveText + "じゃありません",
					baseAdjectiveText + "ではありません",
				];
			} else if (!affirmative && !polite && type == "i") {
				return dropFinalLetter(baseAdjectiveText) + "くない";
			} else if (!affirmative && !polite && type == "na") {
				return [
					baseAdjectiveText + "じゃない",
					baseAdjectiveText + "ではない",
				];
			}
		},
		[CONJUGATION_TYPES.past]: function (
			baseAdjectiveText,
			type,
			affirmative,
			polite
		) {
			if (type == "ira") {
				return irregularAdjectiveConjugation(
					baseAdjectiveText,
					affirmative,
					polite,
					CONJUGATION_TYPES.past
				);
			} else if (affirmative && polite && type == "i") {
				return dropFinalLetter(baseAdjectiveText) + "かったです";
			} else if (affirmative && polite && type == "na") {
				return baseAdjectiveText + "でした";
			} else if (affirmative && !polite && type == "i") {
				return dropFinalLetter(baseAdjectiveText) + "かった";
			} else if (affirmative && !polite && type == "na") {
				return baseAdjectiveText + "だった";
			} else if (!affirmative && polite && type == "i") {
				return [
					dropFinalLetter(baseAdjectiveText) + "くなかったです",
					dropFinalLetter(baseAdjectiveText) + "くありませんでした",
				];
			} else if (!affirmative && polite && type == "na") {
				return [
					baseAdjectiveText + "じゃなかったです",
					baseAdjectiveText + "ではなかったです",
					baseAdjectiveText + "じゃありませんでした",
					baseAdjectiveText + "ではありませんでした",
				];
			} else if (!affirmative && !polite && type == "i") {
				return dropFinalLetter(baseAdjectiveText) + "くなかった";
			} else if (!affirmative && !polite && type == "na") {
				return [
					baseAdjectiveText + "じゃなかった",
					baseAdjectiveText + "ではなかった",
				];
			}
		},
		[CONJUGATION_TYPES.adverb]: function (baseAdjectiveText, type) {
			if (type == "ira") {
				return irregularAdjectiveConjugation(
					baseAdjectiveText,
					false,
					false,
					CONJUGATION_TYPES.adverb
				);
			} else if (type == "i") {
				return dropFinalLetter(baseAdjectiveText) + "く";
			} else if (type == "na") {
				return baseAdjectiveText + "に";
			}
		},
	},
};

function toKanjiPlusHiragana(wordHtml) {
	// "<rt>.*?<\/rt>" ensures if there are multiple <rt> tags, they are removed one by one instead of as a huge block
	return wordHtml.replace(/<ruby>|<\/ruby>|<rt>.*?<\/rt>/g, "");
}

function toHiragana(wordHtml) {
	// ".<rt>" relies on there being exactly one kanji character before each <rt> furigana element
	return wordHtml.replace(/<ruby>|<\/ruby>|.<rt>|<\/rt>/g, "");
}

// Determines word part of speech based on wordJSON.type
function getPartOfSpeech(wordJSON) {
	if (
		wordJSON.type === "u" ||
		wordJSON.type === "ru" ||
		wordJSON.type === "irv"
	) {
		return PARTS_OF_SPEECH.verb;
	} else if (
		wordJSON.type === "i" ||
		wordJSON.type === "na" ||
		wordJSON.type === "ira"
	) {
		return PARTS_OF_SPEECH.adjective;
	}
}

// Standard variations are affirmative, negative, plain, and polite
// Returns an array of Conjugations
function getStandardVariationConjugations(
	wordJSON,
	partOfSpeech,
	conjugationType,
	validBaseWordSpellings
) {
	const conjugationObjects = [];
	let affirmative = false,
		polite = false;

	for (let i = 0; i < 4; i++) {
		if (i % 2 == 0) {
			affirmative = !affirmative;
		}
		polite = !polite;

		// don't need present plain affirmative since it's the dictionary form
		if (
			affirmative &&
			!polite &&
			conjugationType === CONJUGATION_TYPES.present &&
			wordJSON.type != "na"
		)
			continue;

		conjugationObjects.push(
			getConjugation(
				wordJSON,
				partOfSpeech,
				conjugationType,
				validBaseWordSpellings,
				affirmative,
				polite
			)
		);
	}

	return conjugationObjects;
}

function getConjugation(
	wordJSON,
	partOfSpeech,
	conjugationType,
	validBaseWordSpellings,
	affirmative,
	polite
) {
	const validConjugatedAnswers = [];
	const conjugationFunction =
		conjugationFunctions[partOfSpeech][conjugationType];

	validBaseWordSpellings?.forEach((baseWord) => {
		validConjugatedAnswers.push(
			conjugationFunction(baseWord, wordJSON.type, affirmative, polite)
		);
	});

	return new Conjugation(
		// conjugationFunction may return a string or array, so flatten to get rid of nested arrays
		validConjugatedAnswers.flat(),
		conjugationType,
		affirmative,
		polite
	);
}

function getAllConjugations(wordJSON) {
	const allConjugations = [];
	const partOfSpeech = getPartOfSpeech(wordJSON);

	// Get all valid spellings for the base word
	// For example ["あがる", "上がる", "上る"]
	let validBaseWordSpellings = [
		toHiragana(wordJSON.kanji),
		toKanjiPlusHiragana(wordJSON.kanji),
	];
	if (wordJSON.altOkurigana?.length) {
		validBaseWordSpellings = validBaseWordSpellings.concat(
			wordJSON.altOkurigana
		);
	}

	// Present and past have standard variations for verbs and adjectives
	const typesWithStandardVariations = [
		CONJUGATION_TYPES.present,
		CONJUGATION_TYPES.past,
	];

	if (partOfSpeech === PARTS_OF_SPEECH.verb) {
		typesWithStandardVariations.push(CONJUGATION_TYPES.passive);
		typesWithStandardVariations.push(CONJUGATION_TYPES.causative);
		// わかる does not have a potential form
		if (toHiragana(wordJSON.kanji) !== "わかる") {
			typesWithStandardVariations.push(CONJUGATION_TYPES.potential);
		}
	}

	typesWithStandardVariations.forEach((conjugationType) => {
		allConjugations.push(
			getStandardVariationConjugations(
				wordJSON,
				partOfSpeech,
				conjugationType,
				validBaseWordSpellings
			)
		);
	});

	if (partOfSpeech === PARTS_OF_SPEECH.verb) {
		// te
		allConjugations.push(
			getConjugation(
				wordJSON,
				partOfSpeech,
				CONJUGATION_TYPES.te,
				validBaseWordSpellings,
				null,
				null
			)
		);
		// volitional
		[true, false].forEach((polite) => {
			allConjugations.push(
				getConjugation(
					wordJSON,
					partOfSpeech,
					CONJUGATION_TYPES.volitional,
					validBaseWordSpellings,
					null,
					polite
				)
			);
		});
		// imperative
		allConjugations.push(
			getConjugation(
				wordJSON,
				partOfSpeech,
				CONJUGATION_TYPES.imperative,
				validBaseWordSpellings,
				null,
				null
			)
		);
	} else if (partOfSpeech === PARTS_OF_SPEECH.adjective) {
		// Add adverb
		allConjugations.push(
			getConjugation(
				wordJSON,
				partOfSpeech,
				CONJUGATION_TYPES.adverb,
				validBaseWordSpellings,
				null,
				null
			)
		);
	}

	// allConjugations contains either Conjugations or arrays of Conjugations.
	// Flatten to make into one array.
	return allConjugations.flat();
}

class Conjugation {
	// conjugationType is CONJUGATION_TYPES enum
	constructor(validAnswers, conjugationType, affirmative, polite) {
		this.validAnswers = validAnswers;
		this.type = conjugationType;
		this.affirmative = affirmative;
		this.polite = polite;
	}
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

function setAllProbabilitiesToValue(currentWords, value) {
	for (let i = 0; i < currentWords.length; i++) {
		for (let j = 0; j < currentWords[i].length; j++) {
			currentWords[i][j].probability = value;
		}
	}
}

// Sets all of the probabilities to the same normalized value
function equalizeProbabilities(currentWords) {
	setAllProbabilitiesToValue(currentWords, 1);

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
		// Set all probabilities except the current word to be equal to avoid getting the same question twice
		setAllProbabilitiesToValue(currentWords, 1);
		currentWord.probability = 0;
		normalizeProbabilities(currentWords);
		return;
	}

	// Lower probability of running into words in the same group
	if (currentWord.wordJSON.group) {
		const currentConjugation = currentWord.conjugation;
		const group = currentWord.wordJSON.group;

		currentWords[
			getPartOfSpeech(currentWord.wordJSON) === PARTS_OF_SPEECH.verb ? 0 : 1
		]
			.filter((word) => {
				const conjugation = word.conjugation;
				// Only alter probabilities of the exact same conjugation for other words in the group
				return (
					word.wordJSON.group === group &&
					word !== currentWord &&
					conjugation.type === currentConjugation.type &&
					conjugation.affirmative === currentConjugation.affirmative &&
					conjugation.polite === currentConjugation.polite
				);
			})
			.forEach((word) => {
				// Have to be careful with lowering this too much, because it can affect findMinProb for other conjugations.
				// Also, lowering it by a lot will make all of these words appear in a cluster after all the other words have been seen.
				// Note that this is happening whether currentWordWasCorrect is true or false,
				// so if someone got currentWord wrong many times it would tank the probabilities in this forEach over time.
				word.probability /= 3;
			});
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
		console.error(err);
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
	toggleDisplayNone(statusBox, false);

	if (word.conjugation.validAnswers.some((e) => e == entryText)) {
		statusBox.style.background = "green";
		document.getElementById("status-text").innerHTML =
			"Correct" + "<br>" + entryText + " ○";
	} else {
		document.getElementById("verb-box").style.background = typeToWordBoxColor(
			word.wordJSON.type
		);
		toggleBackgroundNone(document.getElementById("verb-box"), false);
		changeVerbBoxFontColor("white");
		document.getElementById("verb-type").textContent = wordTypeToDisplayText(
			word.wordJSON.type
		);

		statusBox.style.background = "rgb(218, 5, 5)";
		// Assuming validAnswers[0] is the hiragana answer
		document.getElementById("status-text").innerHTML =
			(entryText == "" ? "_" : entryText) +
			" ×<br>" +
			word.conjugation.validAnswers[0] +
			" ○";
	}
}

// stored in array in local storage
export class MaxScoreObject {
	constructor(score, settings) {
		this.score = score;
		this.settings = settings;
	}
}

// Array index 0 = verbs, 1 = adjectives
// Stored in an array instead of object to make parsing faster. Upon reflection this was not worth it.
function initApp() {
	new ConjugationApp([wordData.verbs, wordData.adjectives]);
}

class ConjugationApp {
	constructor(words) {
		const mainInput = document.getElementById("main-text-input");
		bind(mainInput);

		this.initState(words);

		mainInput.addEventListener("keydown", (e) => this.inputKeyPress(e));
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
		document.getElementById("main-view").classList.add("question-screen");
		document.getElementById("main-view").classList.remove("results-screen");

		document
			.getElementById("input-tooltip")
			.classList.remove("tooltip-fade-animation");

		toggleDisplayNone(document.getElementById("press-any-key-text"), true);
		toggleDisplayNone(document.getElementById("status-box"), true);

		if (this.state.currentStreak0OnReset) {
			document.getElementById("current-streak-text").textContent = "0";
			this.state.currentStreak0OnReset = false;
		}

		if (this.state.loadWordOnReset) {
			this.state.currentWord = loadNewWord(this.state.currentWordList);
			this.state.loadWordOnReset = false;
		}

		// Furigana and translation may need to be hidden during the question screen
		showFurigana(
			this.state.settings.furigana,
			this.state.settings.furiganaTiming ===
				CONDITIONAL_UI_TIMINGS.onlyAfterAnswering
		);
		showTranslation(
			this.state.settings.translation,
			this.state.settings.translationTiming ===
				CONDITIONAL_UI_TIMINGS.onlyAfterAnswering
		);

		const mainInput = document.getElementById("main-text-input");
		mainInput.disabled = false;
		mainInput.value = "";
		if (!isTouch) {
			mainInput.focus();
		}
	}

	// Handle generic keydown events that aren't targeting a specific element
	onKeyDown(e) {
		let keyCode = e.keyCode ? e.keyCode : e.which;
		if (
			this.state.activeScreen === SCREENS.results &&
			keyCode == "13" &&
			document.activeElement.id !== "options-button"
		) {
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
			e.stopPropagation();

			const mainInput = document.getElementById("main-text-input");
			let inputValue = mainInput.value;

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

			this.state.activeScreen = SCREENS.results;
			document
				.getElementById("main-view")
				.classList.remove("question-screen");
			document.getElementById("main-view").classList.add("results-screen");

			mainInput.blur();
			updateStatusBoxes(this.state.currentWord, inputValue);
			// If the furigana or translation were made transparent during the question, make them visible now
			showFurigana(this.state.settings.furigana, false);
			showTranslation(this.state.settings.translation, false);

			// update probabilities before next word is chosen so don't choose same word
			const inputWasCorrect =
				this.state.currentWord.conjugation.validAnswers.some(
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

			mainInput.disabled = true;
			toggleDisplayNone(
				document.getElementById("press-any-key-text"),
				false
			);

			mainInput.value = "";
		}
	}

	settingsButtonClicked(e) {
		this.state.activeScreen = SCREENS.settings;

		selectCheckboxesInUi(this.state.settings);
		showHideOptionsAndCheckErrors();

		toggleDisplayNone(document.getElementById("main-view"), true);
		toggleDisplayNone(document.getElementById("options-view"), false);
		toggleDisplayNone(document.getElementById("donation-section"), false);
	}

	backButtonClicked(e) {
		e.preventDefault();

		insertSettingsFromUi(this.state.settings);
		localStorage.setItem("settings", JSON.stringify(this.state.settings));

		const visibleConjugationSettings = getVisibleConjugationSettings();
		let newMaxScoreIndex = findMaxScoreIndex(
			this.state.maxScoreObjects,
			visibleConjugationSettings
		);

		if (newMaxScoreIndex === -1) {
			this.state.maxScoreObjects.push(
				new MaxScoreObject(0, visibleConjugationSettings)
			);
			localStorage.setItem(
				"maxScoreObjects",
				JSON.stringify(this.state.maxScoreObjects)
			);
			newMaxScoreIndex = this.state.maxScoreObjects.length - 1;
		}

		if (newMaxScoreIndex !== this.state.maxScoreIndex) {
			localStorage.setItem("maxScoreIndex", newMaxScoreIndex);
			this.state.maxScoreIndex = newMaxScoreIndex;
			this.state.currentStreak0OnReset = true;
			this.state.loadWordOnReset = true;

			this.applySettingsUpdateWordList();

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

		toggleDisplayNone(document.getElementById("main-view"), false);
		toggleDisplayNone(document.getElementById("options-view"), true);
		toggleDisplayNone(document.getElementById("donation-section"), true);

		this.loadMainView();
	}

	initState(words) {
		this.state = {};
		this.state.completeWordList = createWordList(words);

		if (
			!localStorage.getItem("maxScoreObjects") ||
			!localStorage.getItem("maxScoreIndex") ||
			!localStorage.getItem("settings")
		) {
			this.state.maxScoreIndex = 0;
			localStorage.setItem("maxScoreIndex", this.state.maxScoreIndex);

			this.state.settings = getDefaultSettings();
			localStorage.setItem("settings", JSON.stringify(this.state.settings));

			this.state.maxScoreObjects = [
				new MaxScoreObject(
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
				getDefaultAdditiveSettings(),
				JSON.parse(localStorage.getItem("settings"))
			);
			this.state.maxScoreObjects = JSON.parse(
				localStorage.getItem("maxScoreObjects")
			);
		}

		this.applySettingsUpdateWordList();
		this.state.currentWord = loadNewWord(this.state.currentWordList);
		this.state.wordsRecentlySeenQueue = [];

		this.state.currentStreak0OnReset = false;
		this.state.loadWordOnReset = false;

		document.getElementById("max-streak-text").textContent =
			this.state.maxScoreObjects[this.state.maxScoreIndex].score;

		this.loadMainView();
	}

	applySettingsUpdateWordList() {
		const filteredWords = applyAllSettingsFilterWords(
			this.state.settings,
			this.state.completeWordList
		);
		equalizeProbabilities(filteredWords);
		this.state.currentWordList = filteredWords;
	}
}

initApp();

// Keeping the top container hidden at the beginning prevents 1 frame of malformed UI being shown
toggleDisplayNone(document.getElementById("toppest-container"), false);
if (!isTouch) {
	document.getElementById("main-text-input").focus();
}
