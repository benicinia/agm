    export function cacheElements(editor) {
    editor.videoPreview = document.getElementById('videoPreview');
    editor.playhead = document.getElementById('playhead');
    editor.snapIndicator = document.getElementById('snapIndicator');
    
        this.videoPreview = document.getElementById('videoPreview');
        this.playhead = document.getElementById('playhead');
        this.snapIndicator = document.getElementById('snapIndicator');
        this.previewOverlay = document.getElementById('previewOverlay');
        this.timeDisplay = document.getElementById('timeDisplay');
        this.timeRuler = document.getElementById('timeRuler');
        this.playheadSlider = document.getElementById('playheadSlider');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        
        this.videoTrack = document.getElementById('videoTrack');
        this.imageTrack = document.getElementById('imageTrack');
        this.audioTrack = document.getElementById('audioTrack');
        this.textTrack = document.getElementById('textTrack');
        
        this.playBtn = document.getElementById('playBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.mediaUpload = document.getElementById('mediaUpload');
        this.clipDuration = document.getElementById('clipDuration');
        this.durationValue = document.getElementById('durationValue');
        this.textContent = document.getElementById('textContent');
        this.textDuration = document.getElementById('textDuration');
        this.textDurationValue = document.getElementById('textDurationValue');
        this.addTextBtn = document.getElementById('addTextBtn');
        this.snapGridSelect = document.getElementById('snapGrid');
        this.timelineZoomSlider = document.getElementById('timelineZoomSlider');
        this.timelineZoomInput = document.getElementById('timelineZoom');
        this.zoomValue = document.getElementById('zoomValue');
        this.clearTimelineBtn = document.getElementById('clearTimelineBtn');
        this.mediaGrid = document.getElementById('mediaGrid');
        this.statusMessage = document.getElementById('statusMessage');
        this.masterVolume = document.getElementById('masterVolume');
        this.volumeValue = document.getElementById('volumeValue');
        this.maxDurationInput = document.getElementById('maxDuration');
        
        this.ratioBtns = document.querySelectorAll('.ratio-btn');
        this.zoomInBtn = document.getElementById('zoomInBtn');
        this.zoomOutBtn = document.getElementById('zoomOutBtn');
        
        this.videoContainer = document.querySelector('.video-container');
        
        // Audio analysis elements
        this.analyzeAudioBtn = document.getElementById('analyzeAudioBtn');
        this.beatSyncToggle = document.getElementById('beatSyncToggle');
        this.audioAnalysisInfo = document.getElementById('audioAnalysisInfo');
        this.beatSensitivitySlider = document.getElementById('beatSensitivity');
        this.beatSensitivityValue = document.getElementById('beatSensitivityValue');
        this.autoSnapBeats = document.getElementById('autoSnapBeats');
        
        // Video sync elements
        this.syncSelectedVideosBtn = document.getElementById('syncSelectedVideosBtn');
        this.syncAllVideosBtn = document.getElementById('syncAllVideosBtn');
        this.autoSyncVideosBtn = document.getElementById('autoSyncVideosBtn');
        this.clearVideoSyncBtn = document.getElementById('clearVideoSyncBtn');
        this.beatsPerVideoSlider = document.getElementById('beatsPerVideo');
        this.beatsPerVideoValue = document.getElementById('beatsPerVideoValue');
        this.syncModeBtns = document.querySelectorAll('.sync-mode-btn');
        this.syncPrecisionSelect = document.getElementById('syncPrecision');
        
        // Image sync elements
        this.syncSelectedImagesBtn = document.getElementById('syncSelectedImagesBtn');
        this.beatsPerImageSlider = document.getElementById('beatsPerImage');
        this.beatsPerImageValue = document.getElementById('beatsPerImageValue');
        this.imageTransitionSelect = document.getElementById('imageTransition');
        
        // Beat visualization elements
        this.toggleBeatVizBtn = document.getElementById('toggleBeatVizBtn');
        this.showBeatNumbersCheckbox = document.getElementById('showBeatNumbers');
        this.vizIntensitySlider = document.getElementById('vizIntensitySlider');
        this.vizIntensityValue = document.getElementById('vizIntensityValue');
        
        // Image editor elements
        this.imageEditorPanel = document.getElementById('imageEditorPanel');
        this.editorCanvas = document.getElementById('editorCanvas');
        this.editorTitle = document.getElementById('editorTitle');
        this.cancelEditBtn = document.getElementById('cancelEditBtn');
        this.applyEditBtn = document.getElementById('applyEditBtn');
        this.editorTabs = document.querySelectorAll('.editor-tab');
        this.tabContents = document.querySelectorAll('.editor-tab-content');
        
        // Canvas controls
        this.zoomInCanvasBtn = document.getElementById('zoomInCanvasBtn');
        this.zoomOutCanvasBtn = document.getElementById('zoomOutCanvasBtn');
        this.resetZoomBtn = document.getElementById('resetZoomBtn');
        this.resetTransformBtn = document.getElementById('resetTransformBtn');
        this.rotateLeftBtn = document.getElementById('rotateLeftBtn');
        this.rotateRightBtn = document.getElementById('rotateRightBtn');
        this.flipHorizontalBtn = document.getElementById('flipHorizontalBtn');
        this.flipVerticalBtn = document.getElementById('flipVerticalBtn');
        
        // Crop tab
        this.cropAspect = document.getElementById('cropAspect');
        this.cropCenterBtn = document.getElementById('cropCenterBtn');
        this.cropResetBtn = document.getElementById('cropResetBtn');
        this.applyCropBtn = document.getElementById('applyCropBtn');
        
        // Enhance tab
        this.brightnessSlider = document.getElementById('brightnessSlider');
        this.contrastSlider = document.getElementById('contrastSlider');
        this.saturationSlider = document.getElementById('saturationSlider');
        this.sharpnessSlider = document.getElementById('sharpnessSlider');
        this.presetBtns = document.querySelectorAll('.preset-btn');
        
        // Remove BG tab
        this.bgRemoveMethod = document.getElementById('bgRemoveMethod');
        this.thresholdControls = document.getElementById('thresholdControls');
        this.thresholdSlider = document.getElementById('thresholdSlider');
        this.chromaControls = document.getElementById('chromaControls');
        this.toleranceSlider = document.getElementById('toleranceSlider');
        this.colorSwatches = document.querySelectorAll('.color-swatch');
        this.newBackground = document.getElementById('newBackground');
        this.applyBgRemoveBtn = document.getElementById('applyBgRemoveBtn');
        this.bgPreviewCanvas = document.getElementById('bgPreviewCanvas');
        
        // Adjust tab
        this.rotationSlider = document.getElementById('rotationSlider');
        this.scaleSlider = document.getElementById('scaleSlider');
        this.opacitySlider = document.getElementById('opacitySlider');
        this.centerBtn = document.getElementById('centerBtn');
        this.topLeftBtn = document.getElementById('topLeftBtn');
        this.topRightBtn = document.getElementById('topRightBtn');
        this.bottomLeftBtn = document.getElementById('bottomLeftBtn');
        this.bottomRightBtn = document.getElementById('bottomRightBtn');
   
}