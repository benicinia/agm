export function createTimeRuler(editor) {
    editor.timeRuler.innerHTML = '';
    const width = editor.timeRuler.offsetWidth - editor.trackContentLeft;
    const totalSeconds = Math.ceil(editor.timelineDuration);
    
    for (let i = 0; i <= totalSeconds; i++) {
        const left = (i * editor.timelineZoom) + editor.trackContentLeft;
        
        const marker = document.createElement('div');
        marker.className = 'time-marker';
        marker.style.left = `${left}px`;
        
        if (i % 5 === 0) {
            const label = document.createElement('div');
            label.className = 'time-label';
            label.textContent = editor.formatTime(i);
            label.style.left = `${left}px`;
            editor.timeRuler.appendChild(label);
        }
        
        editor.timeRuler.appendChild(marker);
    }
    
}