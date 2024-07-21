export function toggleDisplayNone(element, isDisplayNone) {
	toggleClassName(element, "display-none", isDisplayNone);
}

function toggleClassName(element, className, enabled) {
	if (enabled) {
		element.classList.add(className);
	} else {
		element.classList.remove(className);
	}
}

export function createArrayOfArrays(length) {
	let array = new Array(length);
	for (let i = 0; i < array.length; i++) {
		array[i] = [];
	}
	return array;
}
