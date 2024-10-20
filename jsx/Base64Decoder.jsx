function decodeBase64(base64Str) {
    var binaryStr = atob(base64Str);
    return binaryStr;
}

// Polyfill for atob if not available
if (typeof atob === 'undefined') {
    function atob(str) {
        // Implement a simple Base64 decoder or use a library
        // For brevity, this is left as an exercise
        return "";
    }
}