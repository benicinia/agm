export function initAudioContext(editor) {
    try {
        editor.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        editor.audioContext.suspend();
        console.log("Audio Context initialized");
    } catch (e) {
        console.error("Web Audio API not supported:", e);
    }
}