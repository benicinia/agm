export function setupImageEditor(editor) {
    editor.canvas = editor.editorCanvas;
    editor.ctx = editor.canvas.getContext('2d');
    
    editor.canvas.addEventListener('mousedown', (e) => editor.handleCanvasMouseDown(e));
    editor.canvas.addEventListener('mousemove', (e) => editor.handleCanvasMouseMove(e));
    editor.canvas.addEventListener('mouseup', () => editor.handleCanvasMouseUp());
    editor.canvas.addEventListener('wheel', (e) => editor.handleCanvasWheel(e));
}