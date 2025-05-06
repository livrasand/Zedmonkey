// Define grammar rules with string patterns that will be converted to RegExp
const jsGrammar = [
    { "name": "comment",    "pattern": "\\/\\/.*|\\/\\*[\\s\\S]*?\\*\\/" },
    { "name": "string",     "pattern": "\"(?:\\\\.|[^\"\\\\])*\"|'(?:\\\\.|[^'\\\\])*'|`(?:\\\\.|[^`\\\\])*`" },
    { "name": "number",     "pattern": "\\b\\d+(\\.\\d+)?\\b" },
    { "name": "keyword",    "pattern": "\\b(?:function|const|let|var|if|else|for|while|return)\\b" },
    { "name": "boolean",    "pattern": "\\b(?:true|false)\\b" },
    { "name": "operator",   "pattern": "[=+\\-*/%<>!&|~^?:]+" },
    { "name": "punctuation","pattern": "[{}\\[\\]();,.]" },
    { "name": "identifier", "pattern": "[a-zA-Z_$][a-zA-Z0-9_$]*" }
];