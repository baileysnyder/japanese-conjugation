// since the weights are mostly only used to make things repeat after x amount of rounds, they are overkill
// would be less work to just wait x rounds and immeditely show what you missed, without updating any weights.
"use strict";
import { bind, isJapanese } from "wanakana";
import {
	CONDITIONAL_UI_TIMINGS,
	getDefaultSettings,
	showFurigana,
	showTranslation,
	applyAllSettingsFilterWords,
	applyNonConjugationSettings,
	optionsMenuInit,
	selectCheckboxesInUi,
	showHideOptionsAndCheckErrors,
	insertSettingsFromUi,
	getDefaultAdditiveSettings,
	calculateMaxScoreIndex,
	convertMaxScoreObjectsToV2,
} from "./settingManagement.js";
import { wordData } from "./wordData.js";
import { CONJUGATION_TYPES, PARTS_OF_SPEECH } from "./constants.js";
import { toggleDisplayNone, toggleBackgroundNone } from "./utils.js";

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
	stats: 3
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

function conjugationInqueryFormatting(conjugation, emojisOnly = false) {
	let newString = "";

	function createInqueryText(text, emoji) {
		if (emojisOnly) {
			return emoji;
		}
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
	} else if (conjugation.type === CONJUGATION_TYPES.causativePassive) {
		newString += createInqueryText(CONJUGATION_TYPES.causativePassive, "😒");
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

function loadNewWord(wordList, normalized) {
	let word = pickRandomWord(wordList, normalized);
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
		conjugationType === CONJUGATION_TYPES.imperative ||
		conjugationType === CONJUGATION_TYPES.causativePassive
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
		conjugationType === CONJUGATION_TYPES.imperative ||
		conjugationType === CONJUGATION_TYPES.causativePassive
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
		conjugationType === CONJUGATION_TYPES.potential ||
		conjugationType === CONJUGATION_TYPES.causativePassive
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
	} else if (conjugationType === CONJUGATION_TYPES.causativePassive) {
		if (affirmative && polite) {
			return "させられます";
		} else if (affirmative && !polite) {
			return "させられる";
		} else if (!affirmative && polite) {
			return "させられません";
		} else if (!affirmative && !polite) {
			return "させられない";
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
		conjugationType === CONJUGATION_TYPES.imperative ||
		conjugationType === CONJUGATION_TYPES.causativePassive
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
		[CONJUGATION_TYPES.causativePassive]: function (
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
					CONJUGATION_TYPES.causativePassive
				);
			}
			const causativePassiveRoot = [];
			if (type === "u") {
				const finalChar = baseVerbText.charAt(baseVerbText.length - 1);
				const root = dropFinalLetter(baseVerbText) + changeUtoA(finalChar);
				if (finalChar === "す") {
					causativePassiveRoot.push(root + "せられ");
				} else {
					causativePassiveRoot.push(root + "せられ");
					causativePassiveRoot.push(root + "され");
				}
			} else if (type === "ru") {
				causativePassiveRoot.push(
					dropFinalLetter(baseVerbText) + "させられ"
				);
			}
			if (affirmative && polite) {
				return causativePassiveRoot.map((r) => r + "ます");
			} else if (affirmative && !polite) {
				return causativePassiveRoot.map((r) => r + "る");
			} else if (!affirmative && polite) {
				return causativePassiveRoot.map((r) => r + "ません");
			} else if (!affirmative && !polite) {
				return causativePassiveRoot.map((r) => r + "ない");
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
		typesWithStandardVariations.push(CONJUGATION_TYPES.causativePassive);
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
		// Weights for recency of responses when calculating speed score
		this.recencyWeights = [10, 3, 1];
		// Response times in ms for this word
		this.responseTimesMs = [];
	}

	addResponseTime(inputWasCorrect, responseTimeMs) {
		let maxResponseTimeSlots = this.recencyWeights.length;
		if (inputWasCorrect) {
			this.responseTimesMs.push(responseTimeMs);
		} else {
			this.responseTimesMs.push(Number.MAX_SAFE_INTEGER);
		}
		// Delete the oldest response time if we are full
		if (this.responseTimesMs.length > maxResponseTimeSlots) {
			this.responseTimesMs.shift()
		}
	}

	getSpeedScore() {
		// Response times are converted to response type answer scores as
		// follows:
		//
		// FAST_RESPONSE     3 answer was correct with a fast response time
		// MEDIUM_RESPONSE   2 answer was correct with a medium response time
		// SLOW_RESPONSE     1 answer was correct with a slow response time
		// WRONG_RESPONSE  -10 answer was incorrect
		//
		// The three most recent response type speed scores are combined into
		// a total speed score by multiplying the most recent score by 10,
		// the next most recent by 3, and the oldest by 1, and summing the
		// result.
		//
		// Example speed scores:
		//
		// answered thrice with FAST_RESPONSE                  [3, 3, 3] -> 42
		// answered thrice with improving response each time   [1, 2, 3] -> 37
		// answered once with FAST_RESPONSE                          [3] -> 30
		// answered twice with MEDIUM_RESPONSE                    [2, 2] -> 26
		// answered once with SLOW_RESPONSE                          [1] -> 10
		// word not seen yet                                          [] -> 0
		// answered WRONG_RESPONSE after two FAST_RESPONSES  [3, 3, -10] -> -88
		// answered once with WRONG_RESPONSE                       [-10] -> -100
		// answered thrice with WRONG_RESPONSE           [-10, -10, -10] -> -140
		//
		let wordLength = this.conjugation.validAnswers[0].length;
		let responseTimesMsCopy = structuredClone(this.responseTimesMs);
		let score = 0;
		for (let i = 0; i < this.recencyWeights.length; i++) {
			let responseTimeMs = responseTimesMsCopy.pop();
			if (responseTimeMs === undefined) {
				break;
			}
			let responseType = getResponseTypeFromTimeMs(
				responseTimeMs,
				wordLength
			);
			score += responseType.answerScore * this.recencyWeights[i];
		}
		return score;
	}

	getSpeedProbabilityWeight() {
		// The probability weights when using the default streak scoring is
		// calculated by halving the probability weight of word each time it is
		// answered correctly. Three correct answers in a row would approximately
		// reduce the probability weight to 1/8 (2**-3) of the original value.
		// For incorrect answers, the probability weight is set to an arbitrarily
		// high value, which in practice results increases the probability weight
		// several hundredfold.
		//
		// The probability weights when using speed scoring attempt to match this
		// behavior. The score to probabilty weight calculation is similarly
		// exponential rather than linear. A formula of 2**(-score/10), results in
		// the following score to probability weight values:
		//
		// [3, 3, 3]       -> score: 42    probability weight: 0.0544  ~1/20
		// [1, 2, 3]       -> score: 37    probability weight: 0.0769  ~1/13
		// [3]             -> score: 30    probability weight: 0.125    1/8
		// [2, 2]          -> score: 26    probability weight: 0.165   ~1/6
		// [1]             -> score: 10    probability weight: 0.5      1/4
		// []              -> score: 0     probability weight: 1
		// [3, 3, -10]     -> score: -88   probability weight: 445
		// [-10]           -> score: -100  probability weight: 1024
		// [-10, -10, -10] -> score: -140  probability weight: 16384
		return 2 ** (-this.getSpeedScore() / 10);
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
		min =
			currentWords[i].probability < min && currentWords[i].probability != 0
				? currentWords[i].probability
				: min;
	}
	return min;
}

function findMaxProb(currentWords) {
	let max = 0;
	for (let i = 0; i < currentWords.length; i++) {
		max =
			currentWords[i].probability > max ? currentWords[i].probability : max;
	}
	return max;
}

function normalizeProbabilities(currentWords) {
	let totalProbability = 0;
	// get total of probabilities
	for (let i = 0; i < currentWords.length; i++) {
		totalProbability += currentWords[i].probability;
	}

	// normalize
	for (let i = 0; i < currentWords.length; i++) {
		currentWords[i].probability /= totalProbability;
	}
}

function setAllProbabilitiesToValue(currentWords, value) {
	for (let i = 0; i < currentWords.length; i++) {
		currentWords[i].probability = value;
	}
}

class StreakScorer {
	normalized = true;

	// Sets all of the probabilities to the same value
	equalizeProbabilities(currentWords) {
		setAllProbabilitiesToValue(currentWords, 1);
		// Now that all of the probabilities are equal,
		// normalize them so together they all add up to 1.
		normalizeProbabilities(currentWords);
	}

	updateProbabilites(
		currentWords,
		wordsRecentlySeenQueue,
		currentWord,
		currentWordWasCorrect
	) {
		const roundsToWait = 2;

		// If the number of current verb + adjective conjugations is less than roundsToWait + 1,
		// the pool of conjugations is too small for our wordsRecentlySeenQueue to work.
		if (currentWords.length < roundsToWait + 1) {
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

			currentWords
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

	positiveStatusEmojis(word) {
		return "";
	}

	negativeStatusEmojis(word) {
		return " x";
	}
}

class SpeedScorer {
	normalized = false;

	// Sets all of the probabilities to the same value
	equalizeProbabilities(currentWords) {
		setAllProbabilitiesToValue(currentWords, 1);
	}

	updateProbabilites(
		currentWords,
		wordsRecentlySeenQueue,
		currentWord,
		currentWordWasCorrect
	) {
		const roundsToWait = 2;

		// If the number of current verb + adjective conjugations is less than roundsToWait + 1,
		// the pool of conjugations is too small for our wordsRecentlySeenQueue to work.
		if (currentWords.length < roundsToWait + 1) {
			// Set all probabilities except the current word to be equal to avoid getting the same question twice
			this.equalizeProbabilities(currentWords);
			currentWord.probability = 0;
			return;
		}
		// We wait "roundsToWait" rounds to set the probability of questions.
		// This allows us to have a few rounds immediately after a question where it's guaranteed to not appear again,
		// followed by the ability to set a high probability for the question to show up immediately after that waiting period (if the answer was incorrect).
		if (wordsRecentlySeenQueue.length >= roundsToWait) {
			let dequeuedWord = wordsRecentlySeenQueue.shift();
			let probabilityWeight = dequeuedWord.word.getSpeedProbabilityWeight();
			dequeuedWord.word.probability = probabilityWeight
		}

		wordsRecentlySeenQueue.push(
			new WordRecentlySeen(currentWord, currentWordWasCorrect)
		);

		// Make sure the user will not see the current question until at least "roundsToWait" number of rounds
		currentWord.probability = 0;
	}

	positiveStatusEmojis(word) {
		return " " + getSpeedEmojisForWord(word);
	}

	negativeStatusEmojis(word) {
		return " " + getSpeedEmojisForWord(word);
	}
}

function clearResponseTimes(currentWords) {
    for (let i = 0; i < currentWords.length; i++) {
        currentWords[i].responseTimesMs = [];
    }
}

class ResponseTypes {
    constructor(text, emoji, answerScore) {
        this.text = text;
        this.emoji = emoji;
        this.answerScore = answerScore;
    }
}

const FAST_RESPONSE = new ResponseTypes("fast", "🐇", 3);
const MEDIUM_RESPONSE = new ResponseTypes("medium", "🦔", 2);
const SLOW_RESPONSE = new ResponseTypes("slow", "🐢", 1);
const WRONG_RESPONSE = new ResponseTypes("wrong", "🐍", -10);

function getResponseTypeFromTimeMs(responseTimeMs, wordLength) {
    // A correct response is categorized as fast, medium, or slow,
    // adjusted for word length to account for typing time.
    const perCharacterTimeMs = 500;
    const fastTimeMs = 1000;
    const moderateTimeMs = 2500;
    if (responseTimeMs == Number.MAX_SAFE_INTEGER) {
        return WRONG_RESPONSE;
    }
    if (responseTimeMs <= fastTimeMs + perCharacterTimeMs * wordLength) {
        return FAST_RESPONSE;
    }
    if (responseTimeMs <= moderateTimeMs + perCharacterTimeMs * wordLength) {
        return MEDIUM_RESPONSE;
    }
    return SLOW_RESPONSE;
}

function updateScores(currentWordList, currentWord) {
	let unseenScore = 0;
	let wrongScore = 0;
	let slowScore = 0;
	let mediumScore = 0;
	let fastScore = 0;
	for (let i = 0; i < currentWordList.length; i++) {
		let word = currentWordList[i];
		if (word.responseTimesMs.length == 0) {
			unseenScore++;
			continue;
		}
		let responseType = getResponseTypeFromTimeMs(
			word.responseTimesMs[word.responseTimesMs.length - 1],
			word.conjugation.validAnswers[0].length
		);
		switch (responseType) {
			case FAST_RESPONSE:
				fastScore++;
				break;
			case MEDIUM_RESPONSE:
				mediumScore++;
				break;
			case SLOW_RESPONSE:
				slowScore++;
				break;
			case WRONG_RESPONSE:
				wrongScore++;
				break;
		}
	}

	// Force grow animation on the score for the current word's response type
	// even if the score doesn't change, to give feedback to the user.
	let currentWordResponseType = null;
	if (currentWord != null) {
		currentWordResponseType = getResponseTypeFromTimeMs(
			currentWord.responseTimesMs[currentWord.responseTimesMs.length - 1],
			currentWord.conjugation.validAnswers[0].length
		);
	}
	updateScoreText(
		"unseen-score-text",
		unseenScore,
		false
	);
	updateScoreText(
		"wrong-score-text",
		wrongScore,
		currentWordResponseType == WRONG_RESPONSE
	);
	updateScoreText(
		"slow-score-text",
		slowScore,
		currentWordResponseType == SLOW_RESPONSE
	);
	updateScoreText(
		"medium-score-text",
		mediumScore,
		currentWordResponseType == MEDIUM_RESPONSE
	);
	updateScoreText(
		"fast-score-text",
		fastScore,
		currentWordResponseType == FAST_RESPONSE
	);
}

function updateScoreText(id, score, forceGrow) {
    let element = document.getElementById(id);
    if (element.textContent != score) {
        element.textContent = score;
        element.classList.add("grow-animation");
    } else if (forceGrow) {
        element.classList.add("grow-animation");
    }
}

function getSpeedEmojisForWord(word) {
    let emojis = ""
    for (let i = 0; i < word.responseTimesMs.length; i++) {
        let responseType = getResponseTypeFromTimeMs(
            word.responseTimesMs[i],
            word.conjugation.validAnswers[0].length
        );
        emojis += responseType.emoji;
    }
    return emojis;
}

function loadStatsView(currentWords) {
    const tableBody = document.getElementById("stats-table-body");
    // clear existing rows
    tableBody.replaceChildren();

    // build row content
    let rowData = []
    for (let i = 0; i < currentWords.length; i++) {
        let word = currentWords[i];
        if (word.responseTimesMs.length == 0) {
            continue;
        }

        let rowObject = {
            kanji: toKanjiPlusHiragana(word.wordJSON.kanji),
            hiragana: word.conjugation.validAnswers[0],
            conjugation: conjugationInqueryFormatting(word.conjugation, true),
            emojis: getSpeedEmojisForWord(word),
            score: word.getSpeedScore(),
        }
        rowData.push(rowObject);
    }

    // sort by score descending; within that by kana reading
    function sortFunction(a, b) {
        let diff = b.score - a.score;
        if (diff != 0) {
            return diff;
        }
        return Intl.Collator("ja").compare(a.hiragana, b.hiragana);
    }
    rowData.sort(sortFunction);

    // insert rows
	let row = tableBody.insertRow();
	row.insertCell().innerHTML = "<b>Kanji</b>";
	row.insertCell().innerHTML = "<b>Conjugation</b>";
	row.insertCell().innerHTML = "<b>Results</b>";
	row.insertCell().innerHTML = "<b>Word Score</b>";
    for (let i = 0; i < rowData.length; i++) {
        let row = tableBody.insertRow();
        row.insertCell().textContent = rowData[i].kanji;
        row.insertCell().textContent = rowData[i].conjugation;
        row.insertCell().textContent = rowData[i].emojis;
        row.insertCell().textContent = rowData[i].score;
    }
}

// returns new object with all conjugations
function createWordList(JSONWords) {
	let wordList = {};
	for (const [key, value] of Object.entries(JSONWords)) {
		wordList[key] = [];
		for (let i = 0; i < value.length; i++) {
			let conjugations = getAllConjugations(value[i]);
			for (let j = 0; j < conjugations.length; j++) {
				wordList[key].push(new Word(value[i], conjugations[j]));
			}
		}
	}
	return wordList;
}

function pickRandomWord(wordList, normalized) {
	let random = Math.random();
	if (!normalized) {
		let sum = 0;
		for (let i = 0; i < wordList.length; i++) {
			sum += wordList[i].probability;
		}
		random *= sum;
	}
	try {
		for (let i = 0; i < wordList.length; i++) {
			if (random < wordList[i].probability) {
				return wordList[i];
			}
			random -= wordList[i].probability;
		}
		throw "no random word chosen";
	} catch (err) {
		console.error(err);
		return wordList[0];
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
		localStorage.setItem(
			"maxScoreObjectsV2",
			JSON.stringify(maxScoreObjects)
		);
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

function updateStatusBoxes(word, entryText, scorer) {
	let statusBox = document.getElementById("status-box");
	toggleDisplayNone(statusBox, false);
	if (word.conjugation.validAnswers.some((e) => e == entryText)) {
		let emojis = scorer.positiveStatusEmojis(word);
		statusBox.style.background = "green";
		const subConjugationForm = getSubConjugationForm(word, entryText);
		document.getElementById("status-text").innerHTML = `Correct${
			subConjugationForm != null
			? '<span class="sub-conjugation-indicator">(' +
			subConjugationForm +
			")</span>"
			: ""
		}${emojis}<br>${entryText} ○`;
	} else {
		let emojis = scorer.negativeStatusEmojis(word);
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
			emojis + "<br>" +
			word.conjugation.validAnswers[0] +
			" ○";
	}
}

// If this valid answer is in a non-standard form worth pointing out to the user,
// return a string containing that form's name.
// This applies to conjugation types that allow multiple correct answers for the same question,
// where the user may enter a correct answer without realizing why it was correct.
function getSubConjugationForm(word, validAnswer) {
	const kanjiWord = toKanjiPlusHiragana(word.wordJSON.kanji);
	const hiraganaWord = toHiragana(word.wordJSON.kanji);

	// Check for potential "れる" short form
	if (
		word.conjugation.type === CONJUGATION_TYPES.potential &&
		(word.wordJSON.type === "ru" || kanjiWord === "来る")
	) {
		const shortFormStems = [];

		shortFormStems.push(dropFinalLetter(kanjiWord) + "れ");
		if (word.wordJSON.type === "ru") {
			shortFormStems.push(dropFinalLetter(hiraganaWord) + "れ");
		} else if (kanjiWord === "来る") {
			shortFormStems.push("これ");
		}

		if (shortFormStems.some((stem) => validAnswer.startsWith(stem))) {
			return "ら-omitted short form";
		}
	}

	return null;
}

// Used to store max streaks in localStorage
export class MaxScoreObject {
	constructor(score) {
		this.score = score;
	}
}

function initApp() {
	new ConjugationApp(wordData);
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
			.getElementById("stats-button")
			.addEventListener("click", (e) => this.statsButtonClicked(e));
		document
			.getElementById("stats-back-button")
			.addEventListener("click", (e) => this.statsBackButtonClicked(e));

		this.addAnimationEndEventListener("current-streak-text");
		this.addAnimationEndEventListener("max-streak-text");
		this.addAnimationEndEventListener("unseen-score-text");
		this.addAnimationEndEventListener("wrong-score-text");
		this.addAnimationEndEventListener("slow-score-text");
		this.addAnimationEndEventListener("medium-score-text");
		this.addAnimationEndEventListener("fast-score-text");
		this.addAnimationEndEventListener("status-box");
		this.addAnimationEndEventListener("input-tooltip");
		document.addEventListener("keydown", this.onKeyDown.bind(this));
		document.addEventListener("touchend", this.onTouchEnd.bind(this));

		optionsMenuInit();
	}

	addAnimationEndEventListener(id) {
		document
			.getElementById(id)
			.addEventListener("animationend", (e) => {
				document
					.getElementById(id)
					.classList.remove(e.animationName);
			});
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

		if (this.state.loadScoresOnReset) {
			updateScores(this.state.currentWordList, null);
			this.state.loadScoresOnReset = false;
		}

		if (this.state.loadWordOnReset) {
			this.state.currentWord = loadNewWord(this.state.currentWordList, this.state.scorer.normalized);
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
		this.state.startTimestamp = Date.now();
		if (!isTouch) {
			mainInput.focus();
		}
	}

	// Handle generic keydown events that aren't targeting a specific element
	onKeyDown(e) {
		let keyCode = e.keyCode ? e.keyCode : e.which;
		let buttons = ["options-button", "stats-button"];
		if (
			this.state.activeScreen === SCREENS.results &&
			keyCode == "13" &&
			!buttons.includes(document.activeElement.id)
		) {
			this.loadMainView();
		}
	}

	// Handle generic touchend events that aren't targeting a specific element
	onTouchEnd(e) {
		let buttonIds = [
			document.getElementById("options-button"),
			document.getElementById("stats-button")
		];
		if (
			this.state.activeScreen === SCREENS.results &&
			!buttonIds.includes(e.target)
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

			const inputWasCorrect =
				this.state.currentWord.conjugation.validAnswers.some(
					(e) => e == inputValue
				);

			// record response time
			this.state.currentWord.addResponseTime(
				inputWasCorrect,
				Date.now() - this.state.startTimestamp
			);

			// show stats button if using speed scoring
			if (
				this.state.settings.streakOrSpeedScoring ===
				CONDITIONAL_UI_TIMINGS.speed
			) {
				toggleDisplayNone(
					document.getElementById("stats-button"),
					false
				);
			}

			mainInput.blur();
			updateStatusBoxes(this.state.currentWord, inputValue, this.state.scorer);
			// If the furigana or translation were made transparent during the question, make them visible now
			showFurigana(this.state.settings.furigana, false);
			showTranslation(this.state.settings.translation, false);

			// update probabilities before next word is chosen so don't choose same word
			this.state.scorer.updateProbabilites(
				this.state.currentWordList,
				this.state.wordsRecentlySeenQueue,
				this.state.currentWord,
				inputWasCorrect
			);

			switch (this.state.settings.streakOrSpeedScoring) {
			case CONDITIONAL_UI_TIMINGS.streak:
				if (inputWasCorrect) {
					addToScore(1, this.state.maxScoreObjects, this.state.maxScoreIndex);
					this.state.currentStreak0OnReset = false;
				} else {
					this.state.currentStreak0OnReset = true;
				}
				break;
			case CONDITIONAL_UI_TIMINGS.speed:
				updateScores(this.state.currentWordList, this.state.currentWord);
				this.state.loadScoresOnReset = false;
				break;
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
		toggleDisplayNone(document.getElementById("stats-view"), true);
		toggleDisplayNone(document.getElementById("donation-section"), false);
	}

	backButtonClicked(e) {
		e.preventDefault();

		let previousSettings = structuredClone(this.state.settings);
		insertSettingsFromUi(this.state.settings);
		localStorage.setItem("settings", JSON.stringify(this.state.settings));

		let newMaxScoreIndex = calculateMaxScoreIndex(this.state.settings);

		if (this.state.maxScoreObjects[newMaxScoreIndex] == null) {
			this.state.maxScoreObjects[newMaxScoreIndex] = new MaxScoreObject(0);
			localStorage.setItem(
				"maxScoreObjectsV2",
				JSON.stringify(this.state.maxScoreObjects)
			);
		}

		let conjugationSettingsChanged =
			newMaxScoreIndex !== this.state.maxScoreIndex;

		let scoringMethodChanged =
			previousSettings.streakOrSpeedScoring !=
			this.state.settings.streakOrSpeedScoring;

		if (conjugationSettingsChanged) {
			localStorage.setItem("maxScoreIndex", newMaxScoreIndex);
			this.state.maxScoreIndex = newMaxScoreIndex;
		}

		if (conjugationSettingsChanged || scoringMethodChanged) {
			switch (this.state.settings.streakOrSpeedScoring) {
			case CONDITIONAL_UI_TIMINGS.streak:
				this.state.scorer = new StreakScorer();
				this.state.currentStreak0OnReset = true;
				break;
			case CONDITIONAL_UI_TIMINGS.speed:
				this.state.scorer = new SpeedScorer();
				this.state.loadScoresOnReset = true;
				break;
			}
			this.state.loadWordOnReset = true;
			this.applySettingsUpdateWordList();

			// Note that the wordsRecentlySeenQueue is not cleared.
			// This is intentional, so if the new word list happens to include the words you recently missed,
			// they still have the chance of appearing again in a couple of rounds to retry.
			// If currentWordList doesn't contain those words in the queue, they won't be chosen anyways so the queue probability logic silenty fails.
		} else {
			// If none of the conjugation settings were changed, don't reload the word list or reset the probabilities
			applyNonConjugationSettings(this.state.settings, false);
		}

		document.getElementById("max-streak-text").textContent =
			this.state.maxScoreObjects[this.state.maxScoreIndex].score;

		toggleDisplayNone(document.getElementById("main-view"), false);
		toggleDisplayNone(document.getElementById("options-view"), true);
		toggleDisplayNone(document.getElementById("stats-view"), true);
		toggleDisplayNone(document.getElementById("donation-section"), true);

		this.loadMainView();
	}

	statsButtonClicked(e) {
		this.state.activeScreen = SCREENS.stats;
		loadStatsView(this.state.currentWordList);
		toggleDisplayNone(document.getElementById("main-view"), true);
		toggleDisplayNone(document.getElementById("options-view"), true);
		toggleDisplayNone(document.getElementById("stats-view"), false);
		toggleDisplayNone(document.getElementById("donation-section"), false);
	}

	statsBackButtonClicked(e) {
		toggleDisplayNone(document.getElementById("main-view"), false);
		toggleDisplayNone(document.getElementById("options-view"), true);
		toggleDisplayNone(document.getElementById("stats-view"), true);
		toggleDisplayNone(document.getElementById("donation-section"), true);
		this.loadMainView();
	}

	initState(words) {
		this.state = {};
		this.state.completeWordList = createWordList(words);

		// If they have none or only some of the expected localStorage objects,
		// just set everything to their default values
		if (
			!localStorage.getItem("settings") ||
			(!localStorage.getItem("maxScoreObjects") &&
				!localStorage.getItem("maxScoreObjectsV2"))
		) {
			this.state.settings = getDefaultSettings();
			localStorage.setItem("settings", JSON.stringify(this.state.settings));

			this.state.maxScoreIndex = calculateMaxScoreIndex(this.state.settings);

			this.state.maxScoreObjects = {};
			this.state.maxScoreObjects[this.state.maxScoreIndex] =
				new MaxScoreObject(0);
			localStorage.setItem(
				"maxScoreObjectsV2",
				JSON.stringify(this.state.maxScoreObjects)
			);
		} else {
			this.state.settings = Object.assign(
				getDefaultAdditiveSettings(),
				JSON.parse(localStorage.getItem("settings"))
			);

			this.state.maxScoreIndex = calculateMaxScoreIndex(this.state.settings);

			// If they have the "V1" maxScoreObjects, we need to update to V2
			const scoresV1 = localStorage.getItem("maxScoreObjects");
			if (scoresV1 != null) {
				const scoresV2 = convertMaxScoreObjectsToV2(JSON.parse(scoresV1));

				// If things converted correctly there should always be a MaxScoreObject for this maxScoreIndex, but check just in case
				if (scoresV2[this.state.maxScoreIndex] == null) {
					scoresV2[this.state.maxScoreIndex] = new MaxScoreObject(0);
				}

				this.state.maxScoreObjects = scoresV2;
				localStorage.setItem(
					"maxScoreObjectsV2",
					JSON.stringify(this.state.maxScoreObjects)
				);

				// Remove stale data
				localStorage.removeItem("maxScoreObjects");
				localStorage.removeItem("maxScoreIndex");
			} else {
				this.state.maxScoreObjects = JSON.parse(
					localStorage.getItem("maxScoreObjectsV2")
				);
			}
		}

		switch (this.state.settings.streakOrSpeedScoring) {
		case CONDITIONAL_UI_TIMINGS.speed:
			this.state.scorer = new SpeedScorer();
			this.state.loadScoresOnReset = true;
			break;
		case CONDITIONAL_UI_TIMINGS.streak:
			this.state.scorer = new StreakScorer();
			document.getElementById("max-streak-text").textContent =
				this.state.maxScoreObjects[this.state.maxScoreIndex].score;
			break;
		}

		this.applySettingsUpdateWordList();
		this.state.currentWord = loadNewWord(
			this.state.currentWordList,
			this.state.scorer.normalized
		);
		this.state.wordsRecentlySeenQueue = [];

		this.state.currentStreak0OnReset = false;
		this.state.loadWordOnReset = false;

		this.loadMainView();
	}

	applySettingsUpdateWordList() {
		const filteredWords = applyAllSettingsFilterWords(
			this.state.settings,
			this.state.completeWordList
		);
		clearResponseTimes(filteredWords);
		this.state.scorer.equalizeProbabilities(filteredWords);
		this.state.currentWordList = filteredWords;
	}
}

initApp();

// Keeping the top container hidden at the beginning prevents 1 frame of malformed UI being shown
toggleDisplayNone(document.getElementById("toppest-container"), false);
if (!isTouch) {
	document.getElementById("main-text-input").focus();
}
