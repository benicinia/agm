export function animate(editor) {
    const now = Date.now();
    
    if (editor.isPlaying) {
        const activeVideoClip = editor.findActiveVideoClip(editor.currentTime);
        const isVideoPlaying = activeVideoClip && 
                              editor.mainVideoPlayer && 
                              !editor.mainVideoPlayer.paused && 
                              !editor.mainVideoPlayer.ended;
        
        if (!isVideoPlaying) {
            editor.currentTime += 0.033;
            
            if (editor.currentTime >= editor.timelineDuration) {
                editor.currentTime = editor.timelineDuration;
                editor.pause();
                
                if (editor.mainVideoPlayer && !editor.mainVideoPlayer.paused) {
                    editor.mainVideoPlayer.pause();
                }
            }
            
            const percentage = (editor.currentTime / editor.timelineDuration) * 100;
            editor.playheadSlider.value = percentage;
            
            editor.updatePlayhead();
            
            if (now - editor.lastUpdateTime > editor.updateInterval) {
                editor.updatePreview();
                editor.lastUpdateTime = now;
            }
        }
        
        if (editor.beatSyncEnabled && editor.beatMarkers.length > 0) {
            editor.checkBeatSync();
        }
    }
    
    requestAnimationFrame(() => animate(editor));
}