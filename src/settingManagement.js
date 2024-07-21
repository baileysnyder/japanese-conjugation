import { CONJUGATION_TYPES, PARTS_OF_SPEECH } from "./wordEnums.js";
import { toggleDisplayNone, createArrayOfArrays } from "./utils.js";

// Enum for radio options that conditionally show/hide UI elements
export const CONDITIONAL_UI_TIMINGS = Object.freeze({
	always: "always",
	onlyAfterAnswering: "after",
});

const nonConjugationSettings = getNonConjugationSettingsSet();

function getNonConjugationSettingsSet() {
	const settings = new Set();
	document
		.querySelectorAll("#non-conjugation-settings input")
		.forEach((input) => settings.add(input.getAttribute("name")));
	return settings;
}

export function removeNonConjugationSettings(settings) {
	let prunedSettings = JSON.parse(JSON.stringify(settings));

	nonConjugationSettings.forEach((s) => {
		delete prunedSettings[s];
	});
	return prunedSettings;
}

export const getDefaultSettings = () => {
	let inputs = document
		.getElementById("options-form")
		.querySelectorAll('[type="checkbox"]');
	let settings = {};
	for (let x of Array.from(inputs)) {
		settings[x.name] = true;
	}

	// Set input radio values
	settings["translationTiming"] = CONDITIONAL_UI_TIMINGS.always;
	settings["furiganaTiming"] = CONDITIONAL_UI_TIMINGS.always;

	return settings;
};

export function optionsMenuInit() {
	let optionsGroups = document.getElementsByClassName("options-group");
	for (let optionGroup of Array.from(optionsGroups)) {
		// Note that this registers a listener for a click anywhere in the
		// options-group element (not just the checkboxes).
		optionGroup.addEventListener("click", (e) =>
			optionsGroupCheckError(e.currentTarget)
		);
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
		.getElementById("furigana-checkbox")
		.addEventListener("click", showHideFuriganaSubOptions);
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

function checkToEnableBackButton() {
	let errors = document.getElementsByClassName("settings-error-text");
	for (let error of Array.from(errors)) {
		// checks if any error messages take up space on the screen
		if (error.offsetWidth > 0 && error.offsetHeight > 0) {
			document.getElementById("back-button").disabled = true;
			return;
		}
	}

	document.getElementById("back-button").disabled = false;
}

/**
 * If enabled is true, sets errorElement's content to errorMessage.
 * Otherwise, hides errorElement and tries to enable the back button.
 *
 * @param {boolean} enabled
 * @param {Element} errorElement
 * @param {String} errorMessage
 */
function toggleError(enabled, errorElement, errorMessage) {
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

function doCheckboxesHaveValue(inputs, shouldBeChecked) {
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
		doCheckboxesHaveValue(inputs, shouldBeChecked),
		errorElement,
		errorMessage
	);
}

function optionsGroupCheckError(groupElement) {
	let inputs = groupElement.getElementsByTagName("input");
	let errorElement = groupElement.getElementsByClassName(
		"settings-error-text"
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

// Relies on naming between verb and adjective checkboxes being parallel in the html
function areOnlyPresAffPlainChecked(partOfSpeech) {
	const allInputsToValidate = Array.from(
		document
			.getElementById(`${partOfSpeech}-conjugation-type-group`)
			.getElementsByTagName("input")
	).concat(
		Array.from(
			document
				.getElementById(`${partOfSpeech}-variations-container`)
				.getElementsByTagName("input")
		)
	);

	const inputsToBeChecked = new Set([
		`${partOfSpeech}present`,
		`${partOfSpeech}affirmative`,
		`${partOfSpeech}plain`,
	]);
	for (const input of allInputsToValidate) {
		// We're validating that only the inputs in inputsToBeChecked are checked.
		// Otherwise, return early to prevent the error from being displayed.
		if (
			(!input.checked && inputsToBeChecked.has(input.name)) ||
			(input.checked && !inputsToBeChecked.has(input.name))
		) {
			return false;
		}
	}

	// If we make it here, then only present, affirmative, and plain were checked in their respective option groups
	return true;
}

function verbPresAffPlainCheckError() {
	let optionsGroup = document.getElementById("verb-conjugation-type-group");
	let errorElement = optionsGroup.getElementsByClassName(
		"settings-error-text"
	)[0];

	if (areOnlyPresAffPlainChecked(PARTS_OF_SPEECH.verb)) {
		toggleError(
			true,
			errorElement,
			"*Invalid combination: present, affirmative, plain"
		);
		// These inputs could be hidden because the parent "Verb" option is unchecked, so check to enable back button
		checkToEnableBackButton();
	} else {
		optionsGroupCheckError(optionsGroup);
	}
}

function adjPresAffPlainCheckError() {
	let optionsGroup = document.getElementById("adjective-type-group");
	let errorElement = optionsGroup.getElementsByClassName(
		"settings-error-text"
	)[0];

	let iAdjInput = document.querySelector('input[name="adjectivei"]');
	let irrAdjInput = document.querySelector('input[name="adjectiveirregular"]');
	let naAdjInput = document.querySelector('input[name="adjectivena"]');

	if (
		areOnlyPresAffPlainChecked(PARTS_OF_SPEECH.adjective) &&
		!naAdjInput.checked &&
		(iAdjInput.checked || irrAdjInput.checked)
	) {
		toggleError(
			true,
			errorElement,
			"*Invalid combination: い/irregular, present, affirmative, plain"
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

function showHideFuriganaSubOptions() {
	toggleDisplayNone(
		document.getElementById("furigana-sub-options"),
		!document.getElementById("furigana-checkbox").checked
	);
}

function showHideTranslationSubOptions() {
	toggleDisplayNone(
		document.getElementById("translation-sub-options"),
		!document.getElementById("translation-checkbox").checked
	);
}

export function applyNonConjugationSettings(settings) {
	showEmojis(settings.emoji);
	showStreak(settings.streak);
	// showTranslation and showFurigana are dependent on the state, so we can't set them here
}

export function applyAllSettingsFilterWords(settings, completeWordList) {
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

	return currentWordList;
}

// The input to these functions is a "Word" object defined in main.js.
// If one of these filters is applied to an array of Words,
// that type of Word will be removed from the array.
const questionRemoveFilters = {
	verbs: {
		verbpresent: function (word) {
			return word.conjugation.type !== CONJUGATION_TYPES.present;
		},
		verbpast: function (word) {
			return word.conjugation.type !== CONJUGATION_TYPES.past;
		},
		verbte: function (word) {
			return word.conjugation.type !== CONJUGATION_TYPES.te;
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
	adjectives: {
		adjectivepresent: function (word) {
			return word.conjugation.type !== CONJUGATION_TYPES.present;
		},
		adjectivepast: function (word) {
			return word.conjugation.type !== CONJUGATION_TYPES.past;
		},
		adjectiveadverb: function (word) {
			return word.conjugation.type !== CONJUGATION_TYPES.adverb;
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

/**
 * Searches the maxScoreObjects array for a maxScoreObject with specified settings.
 * Make sure visibleConjugationSettings doesn't contain any settings that aren't tied to max score (like "Show English translations" for example)
 *
 * @param {Array<MaxScoreObject>} maxScoreObjects
 * @param {Object} visibleConjugationSettings
 * @returns The index where the match was found. If no match was found, returns -1.
 */
export function findMaxScoreIndex(maxScoreObjects, visibleConjugationSettings) {
	let settingKeys = Object.keys(visibleConjugationSettings);
	let flag;
	for (let i = 0; i < maxScoreObjects.length; i++) {
		flag = true;
		for (let s of settingKeys) {
			if (maxScoreObjects[i].settings[s] != visibleConjugationSettings[s]) {
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

export function selectCheckboxesInUi(settings) {
	let checkboxInputs = document.querySelectorAll(
		`#options-form input[type="checkbox"]`
	);
	for (let input of Array.from(checkboxInputs)) {
		input.checked = settings[input.name];
	}

	selectConditionalUiRadio(
		settings.furiganaTiming,
		"furigana-always-radio",
		"furigana-after-radio"
	);
	selectConditionalUiRadio(
		settings.translationTiming,
		"translation-always-radio",
		"translation-after-radio"
	);

	function selectConditionalUiRadio(
		radioValue,
		alwaysRadioId,
		onlyAfterAnsweringRadioId
	) {
		switch (radioValue) {
			case CONDITIONAL_UI_TIMINGS.always:
				document.getElementById(alwaysRadioId).checked = true;
				break;
			case CONDITIONAL_UI_TIMINGS.onlyAfterAnswering:
				document.getElementById(onlyAfterAnsweringRadioId).checked = true;
				break;
		}
	}
}

export function showHideOptionsAndCheckErrors() {
	showHideVerbVariationOptions();
	showHideAdjectiveVariationOptions();

	showHideFuriganaSubOptions();
	showHideTranslationSubOptions();

	let optionsGroups = document.getElementsByClassName("options-group");
	for (let group of Array.from(optionsGroups)) {
		optionsGroupCheckError(group);
	}

	verbAndAdjCheckError();
}

/**
 * Overrides values in the settings object based on values selected in the UI
 *
 * @param {Object} settings
 */
export function insertSettingsFromUi(settings) {
	const checkboxInputs = document.querySelectorAll(
		'#options-form input[type="checkbox"]'
	);

	for (let input of Array.from(checkboxInputs)) {
		settings[input.name] = input.checked;
	}

	settings.furiganaTiming = getConditionalUiSetting("furiganaTiming");
	settings.translationTiming = getConditionalUiSetting("translationTiming");

	// Default to "always"
	function getConditionalUiSetting(radioName) {
		return (
			document.querySelector(`input[name="${radioName}"]:checked`)?.value ??
			CONDITIONAL_UI_TIMINGS.always
		);
	}

	return settings;
}

/**
 * Get a settings object that only contains the settings that are currently visible on the screen.
 * Useful for storing max score objects which want as little information as possible since they are stored in localStorage.
 */
export function getVisibleConjugationSettings() {
	const visibleConjugationSettings = {};
	const checkboxInputs = document.querySelectorAll(
		'#options-form input[type="checkbox"]'
	);

	for (let input of Array.from(checkboxInputs)) {
		if (
			input.offsetWidth > 0 &&
			input.offsetHeight > 0 &&
			!nonConjugationSettings.has(input.name)
		) {
			visibleConjugationSettings[input.name] = input.checked;
		}
	}

	return visibleConjugationSettings;
}
