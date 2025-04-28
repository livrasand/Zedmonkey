// Remove the export statement since we're not using modules
const jsGrammar = [
    { name: "comment",    pattern: /\/\/.*|\/\*[\s\S]*?\*\//y },
    { name: "string",     pattern: /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`/y },
    { name: "number",     pattern: /\b\d+(\.\d+)?\b/y },
    { name: "keyword",    pattern: /\b(?:function|const|let|var|if|else|for|while|return)\b/y },
    { name: "boolean",    pattern: /\b(?:true|false)\b/y },
    { name: "operator",   pattern: /[=+\-*/%<>!&|~^?:]+/y },
    { name: "punctuation",pattern: /[{}[\]();,.]/y },
    { name: "identifier", pattern: /[a-zA-Z_$][a-zA-Z0-9_$]*/y }
];