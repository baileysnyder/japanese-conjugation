export function toggleDisplayNone(element, isDisplayNone) {
	toggleClassName(element, "display-none", isDisplayNone);
}

export function toggleBackgroundNone(element, isBackgroundNone) {
	toggleClassName(element, "background-none", isBackgroundNone);
}

function toggleClassName(element, className, enabled) {
	if (enabled) {
		element.classList.add(className);
	} else {
		element.classList.remove(className);
	}
}
