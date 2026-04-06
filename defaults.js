export function getDefaultName() {
    return 'the recipient';
}

export function getNamedActionRequiredInstructions(name) {
    const fixedName = name || getDefaultName();

    return "Based on the content of the email, determine if there are any action items for " + fixedName + " that require a response. " +
        "You must only return true if the email specifically requires a response by " + fixedName + ". " +
        "You will be penalized for returning `true` if the content requires a response from people other than " + fixedName + ". " +
        "You will be penalized for returning `true` if the content is promotional or informational in nature and not specific to any individual. " +
        "Return the literal string `true` or `false`. " +
        "You will be penalized for returning a string other than `true` or `false`.";
}


export function getDefaultSummaryInstructions() {
    return "Provide a two paragraph summary of the email. " +
        "The summary must highlight the important points, dates, people, questions, and action items.";
}
