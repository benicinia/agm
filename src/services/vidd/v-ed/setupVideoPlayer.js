export function setupVideoPlayer(editor) {
    editor.mainVideoPlayer = document.createElement('video');
    editor.mainVideoPlayer.id = 'mainVideoPlayer';
    editor.mainVideoPlayer.muted = true;
    editor.mainVideoPlayer.setAttribute('playsinline', '');
    editor.mainVideoPlayer.style.position = 'absolute';
    editor.mainVideoPlayer.style.top = '0';
    editor.mainVideoPlayer.style.left = '0';
    editor.mainVideoPlayer.style.width = '100%';
    editor.mainVideoPlayer.style.height = '100%';
    editor.mainVideoPlayer.style.objectFit = 'contain';
    editor.mainVideoPlayer.style.display = 'none';
    editor.mainVideoPlayer.preload = 'auto';
    
    editor.videoContainer.appendChild(editor.mainVideoPlayer);
    
    editor.mainVideoPlayer.addEventListener('timeupdate', () => editor.handleVideoTimeUpdate());
    editor.mainVideoPlayer.addEventListener('ended', () => editor.handleVideoEnded());
    editor.mainVideoPlayer.addEventListener('error', (e) => {
        console.error('Video playback error:', e);
        editor.showStatus('Video playback error', 'error');
    });
}