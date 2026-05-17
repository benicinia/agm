export function setupClipContextMenu(editor) {
    document.addEventListener('contextmenu', (e) => {
        const clipElement = e.target.closest('.clip');
        if (clipElement) {
            e.preventDefault();
            
            const clipId = clipElement.dataset.clipId;
            const clip = editor.clips.find(c => c.id == clipId);
            if (!clip) return;
            
            const menu = document.createElement('div');
            menu.style.cssText = `
                position: fixed;
                top: ${e.clientY}px;
                left: ${e.clientX}px;
                background: var(--secondary-bg);
                border: 1px solid var(--border-color);
                border-radius: 4px;
                padding: 5px 0;
                min-width: 150px;
                z-index: 10000;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            `;
            
            menu.innerHTML = `
                <div class="context-menu-item" style="padding: 8px 12px; cursor: pointer; color: var(--text-primary); font-size: 0.9rem; display: flex; align-items: center; gap: 8px;">
                    🗑️ Delete "${clip.name}"
                </div>
                <div class="context-menu-item" style="padding: 8px 12px; cursor: pointer; color: var(--text-primary); font-size: 0.9rem; display: flex; align-items: center; gap: 8px;">
                    ⏱️ Jump to start
                </div>
                <div class="context-menu-item" style="padding: 8px 12px; cursor: pointer; color: var(--text-primary); font-size: 0.9rem; display: flex; align-items: center; gap: 8px;">
                    📋 Copy clip info
                </div>
            `;
            
            document.body.appendChild(menu);
            
            const items = menu.querySelectorAll('.context-menu-item');
            items[0].addEventListener('click', () => {
                editor.deleteClip(clip.id);
                menu.remove();
            });
            
            items[1].addEventListener('click', () => {
                editor.jumpToTime(clip.startTime);
                menu.remove();
            });
            
            items[2].addEventListener('click', () => {
                navigator.clipboard.writeText(`${clip.name} (${clip.type}) - Start: ${clip.startTime}s, Duration: ${clip.duration}s`);
                editor.showStatus('Clip info copied', 'success');
                menu.remove();
            });
            
            setTimeout(() => {
                const closeMenu = (e) => {
                    if (!menu.contains(e.target)) {
                        menu.remove();
                        document.removeEventListener('click', closeMenu);
                    }
                };
                document.addEventListener('click', closeMenu);
            }, 0);
        }
    });
}