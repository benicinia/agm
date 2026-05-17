export function setupTimelineDrag(editor) {
    document.addEventListener('mousemove', (e) => editor.handleTimelineMouseMove(e));
    document.addEventListener('mouseup', () => editor.handleTimelineMouseUp());
}