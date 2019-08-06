// make sure design is responsive
// states: not incorrect waiting for input. incorrect. settings

// adjectives: casual/polite for each, [default] present affirmative, present negative, past affirmative, past negative, adverb
// verbs: casual/polite for each, [defualt] present affirmative, present negative, past affirmative, past negative, te form

// parent abstract word class has fields: kanji(with furigana), definition, partOfSpeech(adj, verb)
// affirmTrueNegFalse, plainTruePoliteFalse, verbType(present, past, etc)
// child classes ru, u, ir, i, na define their own methods for handling conjugation. dumb because only conjugate once

// settings: show furigana, verbs, adjectives
// verbs: plain, polite | affirmative, negative | then all options. Give message must select 1 from each category

// could increase probablity of each verb after each round. If correct, wait 5 rounds to start increasing again.
// if incorrect, wait 5 rounds and then add like 5 to probability
// standard increase per round is 0.1
// make it less likely to pick same category next round
// in prob array just store as the separate categories instead of as the words

// update all weights, sum and divide by sum to keep between 0 and 1. keep ordered. 
// method 1: add all weights n, normalize all weights n, pick number between 0 1 and keep summing weights until reach O(3n)
// could store sum until each point, but requires extra array to make it O(2n + log n)\

// don't want to store redundant kanji, descriptions, etc. If all of that is stored in one object, then instances just have reference to it
"use strict";

const defaultSettings = () => {
  let inputs = document.getElementById("options-form").querySelectorAll('[type="checkbox"]');
  let retObject = {};
  for (let x of Array.from(inputs)) {
    retObject[x.name] = true;
  }

  return retObject;
}

function elt(type, props, ...children) {
    let dom = document.createElement(type);
    if (props) Object.assign(dom, props);
    for (let child of children) {
      if (typeof child != "string") dom.appendChild(child);
      else dom.appendChild(document.createTextNode(child));
    }
    return dom;
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
    newString += "<ruby>Past<rt>⌚</rt></ruby> ";
  } else if (conjugation.tense == "て-form" || conjugation.tense == "Adverb") {
    newString += conjugation.tense;
  }

  if (conjugation.affirmative === true) {
    newString += "<ruby>Affirmative<rt>✅</rt></ruby> ";
  } else if (conjugation.affirmative === false) {
    newString += "<ruby>Negative<rt>🚫</rt></ruby> ";
  }

  if (conjugation.polite === true) {
    newString += "<ruby>Polite<rt>👔</rt></ruby>";
  } else if (conjugation.polite === false) {
    newString += "<ruby>Plain<rt>👪</rt></ruby>";
  }

  return newString;
}

function updateCurrentWord(word) {
  document.getElementById("verb-box").style.background = "none";
  document.getElementById("verb-text").innerHTML = "<ruby>" + word.wordJSON.kanji + "</ruby>";
  document.getElementById("definition").textContent = word.wordJSON.eng;
  document.getElementById("verb-type").textContent = "";
  document.getElementById("conjugation-inquery-text").innerHTML = conjugationInqueryFormatting(word.conjugation);
}

// returns string indicating type
function wordPartOfSpeech(wordJSON) {
  if (wordJSON.type == "u" || wordJSON.type == "ru" || wordJSON.type == "irv") {
    return "verb";
  } else if (wordJSON.type == "i" || wordJSON.type == "na" || wordJSON.type == "ira") {
    return "adjective";
  }
}

class Conjugation {
  constructor(conjugation, tense, affirmative, polite) {
    this.conjugation = conjugation;
    this.tense = tense;
    this.affirmative = affirmative;
    this.polite = polite;
  }
}

function irregularVerbConjugation(hiraganaVerb, affirmative, polite, tense) {
 return "irr placeholder";
}

function iiConjugation(affirmative, polite, tense) {
  if (tense == "present") {
    if (affirmative && polite) {
      return "いいです";
    } else if (affirmative && !polite) {
      return "いい";
    } else if (!affirmative && polite) {
      return "よくないです";
    } else if (!affirmative && !polite) {
      return "よくない";
    }
  }
  else if (tense == "past") {
    if (affirmative && polite) {
      return "よかったです";
    } else if (affirmative && !polite) {
      return "よかった";
    } else if (!affirmative && polite) {
      return "よくなかったです";
    } else if (!affirmative && !polite) {
      return "よくなかった";
    }
  }
  else if (tense == "adverb") {
    return "よく";
  }
}

function irregularAdjectiveConjugation(hiraganaAdjective, affirmative, polite, tense) {
  if (hiraganaAdjective == "いい") {
    return iiConjugation(affirmative, polite, tense);
  }

  else if (hiraganaAdjective == "かっこいい") {
    return "かっこ" + iiConjugation(affirmative, polite, tense);
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
    return "ぢ"
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
  } else if (c == "く" || c == "ぐ") {
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
  return type == "u" ? hiraganaVerb.substring(0, hiraganaVerb.length - 1) + changeUtoI(hiraganaVerb.charAt(hiraganaVerb.length - 1)) :
  hiraganaVerb.substring(0, hiraganaVerb.length - 1);
}

// used by present plain negative and past plain negative
function plainNegativeComplete(hiraganaVerb, type) {
  return type == "u" ? hiraganaVerb.substring(0, hiraganaVerb.length - 1) + changeUtoA(hiraganaVerb.charAt(hiraganaVerb.length - 1)) + "ない" :
  hiraganaVerb.substring(0, hiraganaVerb.length - 1) + "ない";
}

function dropFinalLetter(word) {
  return word.substring(0, word.length - 1);
}

let conjugationFunctions = {
  verb: {
    present: function(hiraganaVerb, type, affirmative, polite) {
      let retWord;

      if (type == "irv") {
        retWord = irregularVerbConjugation(hiraganaVerb, affirmative, polite, "present");
      }
      else if (affirmative && polite) {
        retWord = masuStem(hiraganaVerb, type) + "ます";
      }
      else if (affirmative && !polite) {
        retWord = hiraganaVerb;
      }
      else if (!affirmative && polite) {
        retWord = masuStem(hiraganaVerb, type) + "ません";
      }
      else if (!affirmative && !polite) {
        retWord = plainNegativeComplete(hiraganaVerb, type);
      }

      return new Conjugation(retWord, "Present", affirmative, polite);
    },
    past: function(hiraganaVerb, type, affirmative, polite) {
      let retWord;

      if (type == "irv") {
        retWord = irregularVerbConjugation(hiraganaVerb, affirmative, polite, "past");
      }
      else if (affirmative && polite) {
        retWord = masuStem(hiraganaVerb, type) + "ました";
      }
      else if (affirmative && !polite && type == "u") {
        retWord = dropFinalLetter(hiraganaVerb) +
        changeToPastPlain(hiraganaVerb.charAt(hiraganaVerb.length - 1));
      } else if (affirmative && !polite && type == "ru") {
        retWord = masuStem(hiraganaVerb, type) + "た";
      }

      else if (!affirmative && polite) {
        retWord = masuStem(hiraganaVerb, type) + "ませんでした";
      }
      else if (!affirmative && !polite) {
        let plainNegative = plainNegativeComplete(hiraganaVerb, type);
        retWord = dropFinalLetter(plainNegative) + "かった";
      }

      return new Conjugation(retWord, "Past", affirmative, polite);
    },
    te: function(hiraganaVerb, type) {
      let retWord;

      if (type == "irv") {
        retWord = irregularVerbConjugation(hiraganaVerb, false, false, "te");
      }

      else if (type == "u") {
        let finalChar = hiraganaVerb.charAt(hiraganaVerb.length - 1);
        if (finalChar == "う" || finalChar == "つ" || finalChar == "る") {
          retWord = dropFinalLetter(hiraganaVerb) + "って";
        }
        else if (finalChar == "む" || finalChar == "ぶ" || finalChar == "ぬ") {
          retWord = dropFinalLetter(hiraganaVerb) + "んで";
        }
        else if (finalChar == "く") {
          retWord = dropFinalLetter(hiraganaVerb) + "いて";
        }
        else if (finalChar == "ぐ") {
          retWord = dropFinalLetter(hiraganaVerb) + "いで";
        }
        else if (finalChar == "す") {
          retWord = dropFinalLetter(hiraganaVerb) + "して";
        }
      }

      else if (type == "ru") {
        retWord = masuStem(hiraganaVerb, type) + "て";
      }

      return new Conjugation(retWord, "て-form", null, null);
    }
  },

  adjective: {
    present: function(hiraganaAdjective, type, affirmative, polite) {
      let retWord;

      if (type == "ira") {
        retWord = irregularAdjectiveConjugation(hiraganaAdjective, affirmative, polite, "present");
      }

      else if (affirmative && polite) {
        retWord = hiraganaAdjective + "です";
      }

      else if (affirmative && !polite && type == "i") {
        retWord = hiraganaAdjective;
      } else if (affirmative && !polite && type == "na") {
        retWord = hiraganaAdjective + "だ";
      }

      else if (!affirmative && polite && type == "i") {
        retWord = dropFinalLetter(hiraganaAdjective) + "くないです";
      } else if (!affirmative && polite && type == "na") {
        retWord = hiraganaAdjective + "じゃないです";
      }

      else if (!affirmative && !polite && type == "i") {
        retWord = dropFinalLetter(hiraganaAdjective) + "くない";
      } else if (!affirmative && !polite && type == "na") {
        retWord = hiraganaAdjective + "じゃない";
      }

      return new Conjugation(retWord, "Present", affirmative, polite);
    },
    past: function(hiraganaAdjective, type, affirmative, polite) {
      let retWord;

      if (type == "ira") {
        retWord = irregularAdjectiveConjugation(hiraganaAdjective, affirmative, polite, "past");
      }

      else if (affirmative && polite && type == "i") {
        retWord = dropFinalLetter(hiraganaAdjective) + "かったです";
      }　else if (affirmative && polite && type == "na") {
        retWord = hiraganaAdjective + "でした";
      }

      else if (affirmative && !polite && type == "i") {
        retWord = dropFinalLetter(hiraganaAdjective) + "かった";
      } else if (affirmative && !polite && type == "na") {
        retWord = hiraganaAdjective + "だった";
      }

      else if (!affirmative && polite && type == "i") {
        retWord = dropFinalLetter(hiraganaAdjective) + "くなかったです";
      } else if (!affirmative && polite && type == "na") {
        retWord = hiraganaAdjective + "じゃなかったです";
      }

      else if (!affirmative && !polite && type == "i") {
        retWord = dropFinalLetter(hiraganaAdjective) + "くなかった";
      } else if (!affirmative && !polite && type == "na") {
        retWord = hiraganaAdjective + "じゃなかった";
      }

      return new Conjugation(retWord, "Past", affirmative, polite);
    },
    adverb: function(hiraganaAdjective, type) {
      let retWord;

      if (type == "ira") {
        retWord = irregularAdjectiveConjugation(hiraganaAdjective, false, false, "adverb");
      }

      else if (type == "i") {
        retWord = dropFinalLetter(hiraganaAdjective) + "く";
      }

      else if (type == "na") {
        retWord = hiraganaAdjective + "に";
      }

      return new Conjugation(retWord, "Adverb", null, null);
    }
  }
};

function convertFuriganaToHiragana(word) {
  // remove anything between rb tags if exists
  // remove rt tags but leave text in middle
  // rt tag may have rb tag that was removed before it (empty) instead of kanji
  return word.replace(/<ruby>|<\/ruby>|.?<rt>|<\/rt>/g, "");
}

function getAllConjugations(wordJSON) {
  let conj = [];
  let affirmative = false, polite = false;

  let keys, conjFunctions;
  if (wordPartOfSpeech(wordJSON) == "verb") {
    conjFunctions = conjugationFunctions.verb
    keys = Object.keys(conjFunctions);
  } else if (wordPartOfSpeech(wordJSON) == "adjective") {
    conjFunctions = conjugationFunctions.adjective;
    keys = Object.keys(conjFunctions);
  }

  let hiragana = convertFuriganaToHiragana(wordJSON.kanji);

  for (let i = 0; i < (keys.length - 1)*4; i++) {

    if (i % 2 == 0) {
      affirmative = !affirmative;
    }
    polite = !polite;

    // don't need present plain affirmative
    if (affirmative && !polite && Math.floor(i / 4) == 0) continue;

    conj.push(conjFunctions[keys[Math.floor(i / 4)]](hiragana, wordJSON.type, affirmative, polite));
  }

  // te and adverb
  conj.push(conjFunctions[keys[keys.length - 1]](hiragana, wordJSON.type));

  // array of Conjugation objects
  return conj;
}

class Word {
  // conjugation is Conjugation class object
  constructor(wordJSON, conjugation, probability){
    this.wordJSON = wordJSON;
    this.conjugation = conjugation;
    this.probability = probability;
  }
}

function createArrayOfArrays(length) {
  let array = new Array(length);
  for (let i = 0; i < array.length; i++) {
    array[i] = [];
  }
  return array;
}

// words to ignore will be object with properties word, roundssinceshown, amountToAddFunction
// if amount of current words is less than 
function updateProbabilites(currentWords, wordsToIgnore) {
  const roundToWait = 4;
  let wordCount = 0, totalProbability = 0;
  for (let i = 0; i < currentWords.length; i++) {
    wordCount += currentWords[i].length;
    for (let j = 0; j < currentWords[0].length; j++) {
      // add probabilities here
    }
  }
}

// returns 2D array [verbarray, adjarray]
function createWordList(JSONWords) {
  let wordList = createArrayOfArrays(JSONWords.length);
  
  // temp pls delete
  let initialProbability = 1 / ((JSONWords[0].length + JSONWords[1].length) * 8);

  for (let i = 0; i < JSONWords.length; i++) {
    for (let j = 0; j < JSONWords[i].length; j++) {
      let conjugations = getAllConjugations(JSONWords[i][j]);

      for (let k = 0; k < conjugations.length; k++) {
        wordList[i].push(new Word(JSONWords[i][j], conjugations[k], initialProbability));
      }
    }
  }

  return wordList;
}

// eventually hook up to database
// 0 = verbs 1 = adjectives
// storing in array instead of object to make parsing faster
import {verbs, adjectives} from "./verbs.js"
function getWords() {
  return [verbs, adjectives];
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
  }
  catch (err) {
    console.log(err);
    return wordList[0][0];
  }
}

// need to assign state to empty object before applying action in order to make the state immutable
// so this copies all of states properties into {}, and then all of action's properties into that new object
function updateState(state, action) {
  return Object.assign({}, state, action);
}

function addToScore(amount = 1) {
  let max = document.getElementById("max-streak-text");
  let current = document.getElementById("current-streak-text");

  if (parseInt(max.textContent) <= parseInt(current.textContent)) {
    max.textContent = parseInt(max.textContent) + amount;
    max.classList.add("grow-animation");
    localStorage.setItem("maxScore", max.textContent);
  }

  current.textContent = parseInt(current.textContent) + amount;
  current.classList.add("grow-animation");
}
// rgb(250, 150, 0)
function typeToWordBoxColor(type) {
  switch (type) {
    case "u":
      return "rgb(255, 118, 20)";
    case "ru":
      return "rgb(0, 110, 220)";
    case "irv":
      return "gray";
    case "ira":
      return "gray";
    case "i":
      return "rgb(41, 207, 201)";
    case "na":
      return "sienna";
  }
}

function updateStatusBoxes(word, entryText) {
  let statusBox = document.getElementById("status-box");
  statusBox.style.display = "inline-flex";
  if (word.conjugation.conjugation == entryText) {
    statusBox.style.background = "green";
    statusBox.classList.add("grow-fade-animation");
    document.getElementById("status-text").innerHTML = "Correct";
  } else {
    document.getElementById("verb-box").style.background = typeToWordBoxColor(word.wordJSON.type);
    document.getElementById("verb-type").textContent = wordTypeToDisplayText(word.wordJSON.type);
    statusBox.style.background = "rgb(255, 20, 20)";
    document.getElementById("status-text").innerHTML = (entryText == "" ? "_" : entryText) +
    " ×<br>" + word.conjugation.conjugation + " ○";
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
      return;
    }
  }

  console.log("I tried to enable the back button");
  document.getElementById("back-button").disabled = false;
}

function onClickCheckboxCheckError(e) {
  optionsGroupCheckError(e.currentTarget);
}

function toggleDisplayNone(element, enabled) {
  if (enabled) {
    addClassName(element, "display-none");
  } else {
    element.className = element.className.replace(" display-none", "");
  }
}

function toggleError(errorElement, errorMessage, enabled) {
  if (enabled) {
    let backButton = document.getElementById("back-button");
    errorElement.textContent = errorMessage;
    toggleDisplayNone(errorElement, false);
    console.log("I tried to disable back button");
    backButton.disabled = true;
  } else {
    toggleDisplayNone(errorElement, true);
    checkToEnableBackButton();
  }
}

function checkInputsForError(inputs, shouldBeChecked) {
  for(let input of Array.from(inputs)) {
    if (input.checked !== shouldBeChecked) {
      return false;
    }
  }
  return true;
}

function checkInputsAndToggleError(inputs, errorElement, errorMessage, shouldBeChecked) {
  toggleError(errorElement, errorMessage, checkInputsForError(inputs, shouldBeChecked));
}

function optionsGroupCheckError(groupElement) {
  let inputs = groupElement.getElementsByTagName("input");
  let errorElement = groupElement.getElementsByClassName("must-choose-one-text")[0];

  checkInputsAndToggleError(inputs, errorElement, "*Must choose at least 1 option from this category", false);
}

function verbAndAdjCheckError() {
  let inputs = [document.querySelectorAll('input[name="verb"]')[0],
  document.querySelectorAll('input[name="adjective"]')[0]];
  toggleDisplayNone(document.getElementById("verb-options-container"), !inputs[0].checked);
  toggleDisplayNone(document.getElementById("adjective-options-container"), !inputs[1].checked);
  let errorElement = document.getElementById("top-must-choose");

  checkInputsAndToggleError(inputs, errorElement, "*Must choose at least 1 option from this category", false);
}

// --public namespace addition--
let inputsToSelectVerbPresAffPlain = [];
const verbPresentInput = document.querySelectorAll('input[name="verbpresent"]')[0];
const verbAffirmativeInput = document.querySelectorAll('input[name="verbaffirmative"]')[0];
const verbPlainInput = document.querySelectorAll('input[name="verbplain"]')[0]
inputsToSelectVerbPresAffPlain.push(verbPresentInput);
inputsToSelectVerbPresAffPlain.push(verbAffirmativeInput);
inputsToSelectVerbPresAffPlain.push(verbPlainInput);

let inputsToDeselectVerbPresAffPlain = [];
inputsToDeselectVerbPresAffPlain = inputsToDeselectVerbPresAffPlain.concat(Array.from(document.getElementById(
  "verb-tense-group").getElementsByTagName("input")).filter(e => e != verbPresentInput));
  inputsToDeselectVerbPresAffPlain = inputsToDeselectVerbPresAffPlain.concat(Array.from(document.getElementById(
  "verb-affirmative-polite-container").getElementsByTagName("input")).filter(e => e != verbAffirmativeInput && e != verbPlainInput));
// --public namespace addition end--

function verbPresAffPlainCheckError() {
  let optionsGroup = document.getElementById("verb-tense-group");
  let errorElement = optionsGroup.getElementsByClassName("must-choose-one-text")[0];

  let selected = checkInputsForError(inputsToSelectVerbPresAffPlain, true);
  let unselected = checkInputsForError(inputsToDeselectVerbPresAffPlain, false);

  if (selected && unselected) {
    toggleError(errorElement, "*Present, affirmative, plain is an invalid combination", true);
    // element could be hidden because verb is unchecked, so check to enable back button
    checkToEnableBackButton();
  } else {
    optionsGroupCheckError(optionsGroup);
  }
}

function checkUsingAffirmativePolite(inputClassName, affPolContainerName) {
  let usingAffirmativePolite = document.getElementsByClassName(inputClassName);
  let toDisable = document.getElementById(affPolContainerName);
  for (let input of Array.from(usingAffirmativePolite)) {
    if (input.checked) {
      let optionGroups = toDisable.getElementsByClassName("options-group");
      for (let optionGroup of Array.from(optionGroups)) {
        optionsGroupCheckError(optionGroup);
      }

      toggleDisplayNone(toDisable, false);
      return;
    }
  }
  toggleDisplayNone(toDisable, true);
}

function checkVerbsUsingAffirmativePolite() {
  checkUsingAffirmativePolite("verb-uses-affirmative-polite", "verb-affirmative-polite-container");
}

function checkAdjectivesUsingAffirmativePolite() {
  checkUsingAffirmativePolite("adjective-uses-affirmative-polite", "adjective-affirmative-polite-container");
}

function optionsMenuInit() {
  let optionsGroups = document.getElementsByClassName("options-group");
  for (let optionGroup of Array.from(optionsGroups)) {
    optionGroup.addEventListener("click", onClickCheckboxCheckError);
  }

  let verbsUsingAffirmativePolite = document.getElementsByClassName("verb-uses-affirmative-polite");
  for (let verb of Array.from(verbsUsingAffirmativePolite)) {
    verb.addEventListener("click", checkVerbsUsingAffirmativePolite);
  }

  let adjectivesUsingAffirmativePolite = document.getElementsByClassName("adjective-uses-affirmative-polite");
  for (let adj of Array.from(adjectivesUsingAffirmativePolite)) {
    adj.addEventListener("click", checkAdjectivesUsingAffirmativePolite);
  }

  document.querySelectorAll('input[name="verb"]')[0].addEventListener("click", verbAndAdjCheckError);
  document.querySelectorAll('input[name="adjective"]')[0].addEventListener("click", verbAndAdjCheckError);

  // top level errors
  // call verbAndAdjCheckError from 
  let optionsView = document.getElementById("options-view");
  optionsView.addEventListener("click", verbPresAffPlainCheckError);
}

// state has currentWord, previousCorrect, settingsOpen, settings, completeWordList, currentWordList
// settings has filters property which is an array of keys for filterFunctions to apply on completeWordList to get currentWordList
// can change state by pressing enter on input field, or by opening / closing settings
// if settings object does not change after settingsOpen changes to false, do not load new word. Else load new word but don't reset streak.
// reset streak only if previousCorrect is false
// if got incorrect and pressed enter, now previousCorrect is still false, but currentWord is different
// add event listener when get wrong on body for enter
class ConjugationApp {
  constructor() {
    document.getElementById("max-streak-text").textContent = localStorage.getItem("maxScore") || "0";
    let input = document.getElementsByTagName("input")[0]
    wanakana.bind(input);
    input.focus();

    this.state = {};
    this.state.completeWordList = this.state.currentWordList = createWordList(getWords());
    this.state.currentWord = pickRandomWord(this.state.currentWordList);
    updateCurrentWord(this.state.currentWord);

    this.state.settingsOpen = false;
    this.state.settings = localStorage.getItem("settings") ? JSON.parse(localStorage.getItem("settings")) : defaultSettings();

    document.getElementsByTagName("input")[0].addEventListener("keydown", e => this.inputKeyPress(e));
    document.getElementById("options-button").addEventListener("click", e => this.settingsButtonClicked(e));
    document.getElementById("options-form").addEventListener("submit", e => this.backButtonClicked(e));

    document.getElementById("current-streak-text").addEventListener("animationend", e => {
      document.getElementById("current-streak-text").classList.remove(e.animationName);
    });
    document.getElementById("max-streak-text").addEventListener("animationend", e => {
      document.getElementById("max-streak-text").classList.remove(e.animationName);
    });

    document.getElementById("status-box").addEventListener("animationend", e => {
      document.getElementById("status-box").style.display = "none";
      document.getElementById("status-box").classList.remove(e.animationName);
    });

    optionsMenuInit();

    // need to define this here so the event handler can be removed from within the function and still reference this
    let onAcceptIncorrect = function(e) {
      let keyCode = (e.keyCode ? e.keyCode : e.which);
      if (keyCode == '13') {
        document.body.removeEventListener("keydown", this.onAcceptIncorrectHandler);
        document.getElementsByTagName("input")[0].disabled = false;
        document.getElementById("press-any-key-text").style.display = "none";
        document.getElementById("status-box").style.display = "none";
        document.getElementById("current-streak-text").textContent = "0";
        this.updateState({currentWord: pickRandomWord(this.state.currentWordList)});
      }
    }

    this.onAcceptIncorrectHandler = onAcceptIncorrect.bind(this);
  }

  inputKeyPress(e) {
    let keyCode = (e.keyCode ? e.keyCode : e.which);
    if (keyCode == '13') {
      let inputElt = document.getElementsByTagName("input")[0];

      //if (inputElt.value.length == 0) return;
      e.stopPropagation();

      //let correctText = convertFuriganaToHiragana(this.state.currentWord.conjugation.conjugation);
      updateStatusBoxes(this.state.currentWord, inputElt.value);
      if (inputElt.value == this.state.currentWord.conjugation.conjugation) {
        this.updateState({currentWord: pickRandomWord(this.state.currentWordList), previousCorrect: true});
      } else {
        this.updateState({previousCorrect: false});
      }

      inputElt.value = "";
    }
  }

  settingsButtonClicked(e) {
    let inputs = document.getElementById("options-form").querySelectorAll('[type="checkbox"]');
    for (let input of Array.from(inputs)) {
      input.checked = this.state.settings[input.name];
    }

    // if errors were hidden when settings were saved, need to make sure they appear when unhidden
    let optionsGroups = document.getElementsByClassName("options-group");
    for (let group of Array.from(optionsGroups)) {
      optionsGroupCheckError(group);
    }

    checkVerbsUsingAffirmativePolite();
    verbAndAdjCheckError();

    document.getElementById("main-view").style.display = "none";
    document.getElementById("options-view").style.display = "block";
  }

  backButtonClicked(e) {
    e.preventDefault();
    
    let inputs = document.getElementById("options-form").querySelectorAll('[type="checkbox"]');
      for (let input of Array.from(inputs)) {
        this.state.settings[input.name] = input.checked;
      }
      localStorage.setItem("settings", JSON.stringify(this.state.settings));

      document.getElementById("main-view").style.display = "block";
      document.getElementById("options-view").style.display = "none";
  }

  updateState(action) {
    let {completeWordList, currentWordList, currentWord, previousCorrect, settingsOpen, settings} = this.state;
    let newState = Object.assign({}, this.state, action);
    console.log(this.state);
    console.log(action);
    console.log(newState);

    if (action.currentWord) {
      if (newState.previousCorrect === true) {
        addToScore();
      }
      updateCurrentWord(newState.currentWord);
      document.getElementsByTagName("input")[0].focus();
    } else if (action.previousCorrect === false) {
      document.getElementsByTagName("input")[0].disabled = true;
      document.getElementById("press-any-key-text").style.display = "table-cell";
      document.body.addEventListener("keydown", this.onAcceptIncorrectHandler);
    }

    this.state = newState;
  }
}

new ConjugationApp();
//init();
//updateCurrentWord("働<rt>はたら</rt>く", "work", "");
//console.log(convertFuriganaToHiragana("弾<rt>ひ</rt>く"));