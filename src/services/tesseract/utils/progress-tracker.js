export class ProgressTracker {
    updateOCRProgress(progress) {
        const loadingEl = document.getElementById('loading');
        if (!loadingEl) return;

        switch (progress.status) {
            case 'loading tesseract core':
                loadingEl.textContent = 'Loading OCR engine...';
                break;
            case 'initializing tesseract':
                loadingEl.textContent = 'Initializing OCR...';
                break;
            case 'loading language traineddata':
                loadingEl.textContent = 'Loading language data from IndexedDB...';
                break;
            case 'initializing api':
                loadingEl.textContent = 'Finalizing OCR...';
                break;
            case 'recognizing text':
                const percent = Math.round(progress.progress * 100);
                loadingEl.textContent = `OCR Processing: ${percent}%`;
                break;
        }
    }

    showLoading(show) {
        const loadingEl = document.getElementById('loading');
        if (loadingEl) {
            loadingEl.style.display = show ? 'block' : 'none';
            if (!show) {
                loadingEl.textContent = 'Ready';
            }
        }
    }
}