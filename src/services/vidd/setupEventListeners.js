 function setupEventListeners(editor) {
    editor.playBtn.addEventListener('click', () => editor.play());
    editor.pauseBtn.addEventListener('click', () => editor.pause());
  
        this.playBtn.addEventListener('click', () => this.play());
        this.pauseBtn.addEventListener('click', () => this.pause());
        this.stopBtn.addEventListener('click', () => this.stop());
        
        this.playheadSlider.addEventListener('input', (e) => {
            const percentage = parseInt(e.target.value);
            const time = (percentage / 100) * this.timelineDuration;
            this.jumpToTime(time);
        });
        
        this.mediaUpload.addEventListener('change', (e) => this.handleMediaUpload(e));
        
       // In setupEventListeners() method
this.clipDuration.addEventListener('input', () => {
    const newDuration = parseInt(this.clipDuration.value);
    this.defaultClipDuration = newDuration;
    this.durationValue.textContent = `${newDuration}s`;
    
    // Update ALL selected clips if any are selected
    if (this.selectedClips.size > 0) {
        this.selectedClips.forEach(clipId => {
            const clip = this.clips.find(c => c.id == clipId);
            if (clip && (clip.type === 'image' || clip.type === 'video')) {
                clip.duration = newDuration;
                this.updateClipElement(clip);
            }
        });
    } else if (this.draggingClip && this.draggingHandle) {
        // Fallback to the old behavior if dragging
        const clipId = this.draggingClip.dataset.clipId;
        const clip = this.clips.find(c => c.id == clipId);
        if (clip && clip.type === 'image') {
            clip.duration = newDuration;
            this.updateClipElement(clip);
        }
    }
    
    // Also update media library for future clips
    this.updateMediaLibraryDurations(newDuration);
});
        this.textDuration.addEventListener('input', () => {
            this.textDurationValue.textContent = `${this.textDuration.value}s`;
        });
        
        this.addTextBtn.addEventListener('click', () => this.addTextClip());
        this.snapGridSelect.addEventListener('change', () => {
            this.snapGrid = parseFloat(this.snapGridSelect.value);
        });
        
        this.timelineZoomSlider.addEventListener('input', () => {
            this.timelineZoom = parseInt(this.timelineZoomSlider.value);
            this.timelineZoomInput.value = this.timelineZoom;
            this.zoomValue.textContent = `${this.timelineZoom}x (${this.timelineZoom * 10}%)`;
            this.updateTimeRuler();
            this.updateClipsPosition();
        });
        
        this.timelineZoomInput.addEventListener('input', () => {
            this.timelineZoom = parseInt(this.timelineZoomInput.value);
            this.timelineZoomSlider.value = this.timelineZoom;
            this.zoomValue.textContent = `${this.timelineZoom}x (${this.timelineZoom * 10}%)`;
            this.updateTimeRuler();
            this.updateClipsPosition();
        });
        
        this.clearTimelineBtn.addEventListener('click', () => this.clearTimeline());
        
        this.masterVolume.addEventListener('input', () => {
            const volume = this.masterVolume.value / 100;
            this.volumeValue.textContent = `${this.masterVolume.value}%`;
            this.audioElements.forEach(audio => {
                audio.volume = volume;
            });
        });
        
        this.maxDurationInput.addEventListener('change', () => {
            this.maxDuration = parseInt(this.maxDurationInput.value);
            if (this.timelineDuration > this.maxDuration) {
                this.timelineDuration = this.maxDuration;
                this.updateTimeRuler();
            }
        });
        
        this.zoomInBtn.addEventListener('click', () => {
            this.timelineZoom = Math.min(10, this.timelineZoom + 1);
            this.timelineZoomSlider.value = this.timelineZoom;
            this.timelineZoomInput.value = this.timelineZoom;
            this.zoomValue.textContent = `${this.timelineZoom}x (${this.timelineZoom * 10}%)`;
            this.updateTimeRuler();
            this.updateClipsPosition();
        });
        
        this.zoomOutBtn.addEventListener('click', () => {
            this.timelineZoom = Math.max(1, this.timelineZoom - 1);
            this.timelineZoomSlider.value = this.timelineZoom;
            this.timelineZoomInput.value = this.timelineZoom;
            this.zoomValue.textContent = `${this.timelineZoom}x (${this.timelineZoom * 10}%)`;
            this.updateTimeRuler();
            this.updateClipsPosition();
        });
        
        this.ratioBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.ratioBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                const ratio = e.target.dataset.ratio;
                document.querySelector('.video-container').style.aspectRatio = ratio;
            });
        });
        
        // Audio analysis listeners
        this.analyzeAudioBtn.addEventListener('click', () => this.analyzeAllAudio());
        this.beatSyncToggle.addEventListener('change', (e) => {
            this.beatSyncEnabled = e.target.checked;
            this.showStatus(`Beat sync ${this.beatSyncEnabled ? 'enabled' : 'disabled'}`, 'info');
        });
        
        this.beatSensitivitySlider.addEventListener('input', () => {
            this.beatSensitivity = this.beatSensitivitySlider.value;
            this.beatSensitivityValue.textContent = `${this.beatSensitivity}%`;
            this.beatThreshold = (100 - this.beatSensitivity) / 100;
        });
        
        this.autoSnapBeats.addEventListener('change', (e) => {
            this.applyBeatSnapping(e.target.value);
        });
        
        // Video sync listeners
        this.syncSelectedVideosBtn.addEventListener('click', () => this.syncSelectedVideos());
        this.syncAllVideosBtn.addEventListener('click', () => this.syncAllVideos());
        this.autoSyncVideosBtn.addEventListener('click', () => this.autoSyncVideos());
        this.clearVideoSyncBtn.addEventListener('click', () => this.clearVideoSync());
        
        this.beatsPerVideoSlider.addEventListener('input', () => {
            this.beatsPerVideo = parseInt(this.beatsPerVideoSlider.value);
            this.beatsPerVideoValue.textContent = this.beatsPerVideo;
        });
        
        this.syncModeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.syncModeBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.videoSyncMode = e.target.dataset.mode;
                this.showStatus(`Video sync mode: ${this.videoSyncMode}`, 'info');
            });
        });
        
        this.syncPrecisionSelect.addEventListener('change', (e) => {
            this.syncPrecision = e.target.value;
        });
        
        // Image sync listeners
        this.syncSelectedImagesBtn.addEventListener('click', () => this.syncSelectedImages());
        
        this.beatsPerImageSlider.addEventListener('input', () => {
            this.beatsPerImage = parseInt(this.beatsPerImageSlider.value);
            this.beatsPerImageValue.textContent = this.beatsPerImage;
        });
        
        // Beat visualization listeners
        this.toggleBeatVizBtn.addEventListener('click', () => this.toggleBeatVisualization());
        this.showBeatNumbersCheckbox.addEventListener('change', (e) => this.toggleBeatNumbers(e.target.checked));
        this.vizIntensitySlider.addEventListener('input', (e) => this.updateVizIntensity(e.target.value));
        
        // Image editor listeners
        this.cancelEditBtn.addEventListener('click', () => this.closeImageEditor());
        this.applyEditBtn.addEventListener('click', () => this.applyImageEdits());
        
        this.editorTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchEditorTab(tabName);
            });
        });
        
        // Canvas controls
        this.zoomInCanvasBtn.addEventListener('click', () => this.canvasZoomIn());
        this.zoomOutCanvasBtn.addEventListener('click', () => this.canvasZoomOut());
        this.resetZoomBtn.addEventListener('click', () => this.resetCanvasZoom());
        this.resetTransformBtn.addEventListener('click', () => this.resetCanvasTransform());
        this.rotateLeftBtn.addEventListener('click', () => this.rotateCanvas(-90));
        this.rotateRightBtn.addEventListener('click', () => this.rotateCanvas(90));
        this.flipHorizontalBtn.addEventListener('click', () => this.flipCanvasHorizontal());
        this.flipVerticalBtn.addEventListener('click', () => this.flipCanvasVertical());
        
        // Crop controls
        this.cropAspect.addEventListener('change', (e) => this.updateCropAspect(e.target.value));
        this.cropCenterBtn.addEventListener('click', () => this.centerCrop());
        this.cropResetBtn.addEventListener('click', () => this.resetCrop());
        this.applyCropBtn.addEventListener('click', () => this.applyCrop());
        
        // Enhance controls
        this.brightnessSlider.addEventListener('input', (e) => this.applyBrightness(e.target.value));
        this.contrastSlider.addEventListener('input', (e) => this.applyContrast(e.target.value));
        this.saturationSlider.addEventListener('input', (e) => this.applySaturation(e.target.value));
        this.sharpnessSlider.addEventListener('input', (e) => this.applySharpness(e.target.value));
        
        this.presetBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const preset = e.target.dataset.preset;
                this.applyPreset(preset);
            });
        });
        
        // Remove BG controls
        this.bgRemoveMethod.addEventListener('change', (e) => this.toggleBgMethod(e.target.value));
        this.thresholdSlider.addEventListener('input', (e) => this.previewThreshold(e.target.value));
        this.toleranceSlider.addEventListener('input', (e) => this.previewChroma(e.target.value));
        this.colorSwatches.forEach(swatch => {
            swatch.addEventListener('click', (e) => {
                this.colorSwatches.forEach(s => s.classList.remove('active'));
                e.target.classList.add('active');
                this.previewChroma();
            });
        });
        this.applyBgRemoveBtn.addEventListener('click', () => this.applyBackgroundRemoval());
        
        // Adjust controls
        this.rotationSlider.addEventListener('input', (e) => this.applyRotation(e.target.value));
        this.scaleSlider.addEventListener('input', (e) => this.applyScale(e.target.value));
        this.opacitySlider.addEventListener('input', (e) => this.applyOpacity(e.target.value));
        this.centerBtn.addEventListener('click', () => this.centerImage());
        this.topLeftBtn.addEventListener('click', () => this.positionImage('top-left'));
        this.topRightBtn.addEventListener('click', () => this.positionImage('top-right'));
        this.bottomLeftBtn.addEventListener('click', () => this.positionImage('bottom-left'));
        this.bottomRightBtn.addEventListener('click', () => this.positionImage('bottom-right'));
        
        // Resume audio context on user interaction
        document.addEventListener('click', () => {
            if (this.audioContext && this.audioContext.state === 'suspended') {
                this.audioContext.resume().then(() => {
                    console.log("Audio Context resumed");
                });
            }
        }, { once: true });
   
}
 