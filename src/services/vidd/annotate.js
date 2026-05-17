// Image Format Converter Class
class Annotations {
    constructor(appInstance) {
        this.app = appInstance;
        this.cropOverlay = null;
this.isCropMode = false;
this.cropButton = null;
 this.libraryImages = [];
this.imageBlobs = {}; // Cache for image blobs
        this.classes = [];
        this.images = [];
        this.currentImageIndex = -1;
        this.annotations = {};
        this.currentMode = 'select';
        this.isDrawing = false;
        this.isDraggingBox = false;
        this.isResizingBox = false;
        this.startX, startY, currentX, currentY;
        this.selectedClass = null;
        this.boundingBoxes = [];
        this.selectedBoxIndex = -1;
        this.dragOffsetX = 0, dragOffsetY = 0;
        this.db;
        this.scaleX = 1, scaleY = 1;
        this.currentResizeHandle = null;
        this.cropStartX, cropStartY, cropEndX, cropEndY;
        this.isCropping = false;
        this.bboxOverlays = [];
    }

    addAnnotationUI() {
        // Add converter section to control panel
        const controlPanel = document.querySelector('.control-panel');
        
        const annotationSection = document.createElement('div');
        annotationSection.className = 'panel-section annotation-section';
        annotationSection.id = 'annotationSection';
        annotationSection.innerHTML = `
            <h3><i class="fas fa-exchange-alt"></i> Image Format Converter</h3>
            
            <div class="control-group">
                <label>
                    <i class="fas fa-file-image"></i> Convert Format
                </label>
                <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                    <select id="conversionSourceFormat" class="form-control-small" style="flex: 1;">
                        <option value="jpg">JPG/JPEG</option>
                        <option value="webp">WebP</option>
                        <option value="png">PNG</option>
                    </select>
                    <span style="color: var(--accent-color); align-self: center;">
                        <i class="fas fa-arrow-right"></i>
                    </span>
                    <select id="conversionTargetFormat" class="form-control-small" style="flex: 1;">
                        <option value="jpg">JPG/JPEG</option>
                        <option value="webp">WebP</option>
                        <option value="png">PNG</option>
                    </select>
                </div>
            </div>
            
            <div class="control-group">
                <label>
                    <i class="fas fa-cog"></i> Quality Settings
                    <span class="value-display" id="qualityValue">85</span>
                </label>
                <input type="range" id="conversionQuality" min="10" max="100" value="85" class="slider">
                <div class="slider-labels">
                    <span>Smaller</span>
                    <span>Balanced</span>
                    <span>Better Quality</span>
                </div>
            </div>
            
            <div class="control-group">
                <label>
                    <i class="fas fa-check-circle"></i> Conversion Options
                </label>
                <div class="filter-options">
                    <label class="checkbox">
                        <input type="checkbox" id="preserveOriginal" checked>
                        <span>Keep original files</span>
                    </label>
                    <label class="checkbox">
                        <input type="checkbox" id="resizeOnConvert">
                        <span>Resize images (max 1920px)</span>
                    </label>
                    <label class="checkbox">
                        <input type="checkbox" id="convertAnnotatedOnly">
                        <span>Convert annotated images only</span>
                    </label>
                </div>
            </div>
            
            <div class="button-group">
                <button id="convertBtn" class="btn btn-primary">
                    <i class="fas fa-sync-alt"></i> Convert Selected
                </button>
                <button id="batchConvertBtn" class="btn btn-secondary">
                    <i class="fas fa-layer-group"></i> Batch Convert All
                </button>
            </div>
            
            <div id="conversionProgress" style="display: none; margin-top: 15px;">
                <div class="progress-header">
                    <span id="conversionStatus">Preparing conversion...</span>
                    <span id="conversionPercent">0%</span>
                </div>
                <div class="progress-bar">
                    <div id="conversionProgressFill" class="progress-fill" style="width: 0%;"></div>
                </div>
                <div id="conversionStats" style="font-size: 0.85rem; margin-top: 8px; color: var(--text-secondary);">
                    Ready to convert
                </div>
            </div>
        `;
        
        // Insert after the Analysis Controls or at the beginning of control panel
        const firstSection = controlPanel.firstChild;
        if (firstSection) {
            controlPanel.insertBefore(converterSection, firstSection.nextSibling);
        } else {
            controlPanel.appendChild(converterSection);
        }
        
        // Add converter tab to results area
        const tabs = document.querySelector('.tabs');
        if (tabs) {
            const annotationTab = document.createElement('button');
            annotationTab.className = 'tab-btn';
            annotationTab.dataset.tab = 'annotation';
            annotationTab.innerHTML = `
                <i class="fas fa-exchange-alt"></i> Annotation Controls
            `;
            tabs.appendChild(annotationTab);
            
            // Add converter tab content
            const tabContents = document.querySelectorAll('.tab-content');
            const lastTabContent = tabContents[tabContents.length - 1];
            
            const annotationTabContent = document.createElement('div');
            annotationTabContent.className = 'tab-content';
            annotationTabContent.id = 'annotation-tab';
            annotationTabContent.innerHTML = `
                <div class="tab-header">
                    <h3><i class="fas fa-file-export"></i> Converted Images</h3>
                    <div class="tab-actions">
                        <span id="convertedCount">0 images converted</span>
                        <button id="downloadAllConvertedBtn" class="btn-small">
                            <i class="fas fa-download"></i> Download All
                        </button>
                        <button id="clearConvertedBtn" class="btn-small">
                            <i class="fas fa-trash"></i> Clear History
                        </button>
                    </div>
                </div>
                <div class="groups-container" id="convertedImagesContainer">
                    <div class="empty-state">
                        <i class="fas fa-images"></i>
                        <h4>No Converted Images</h4>
                        <p>Use the converter to transform images between formats</p>
                    </div>
                </div>
            `;
            
            if (lastTabContent) {
                lastTabContent.parentNode.insertBefore(annotationTabContent, lastTabContent.nextSibling);
            } else {
                document.querySelector('.results-area').appendChild(annotationTabContent);
            }
        }
        
        // Add custom styles for converter
        this.addAnnotationrStyles();
    }

    addAnnotationStyles() {
        if (document.getElementById('annotation-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'annotation-styles';
        style.textContent = `
            .annotation-section {
                margin-bottom: 20px;
            }
            
            .converted-badge {
                position: absolute;
                top: 8px;
                left: 8px;
                background: var(--accent-color);
                color: var(--bg-primary);
                width: 24px;
                height: 24px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 0.8rem;
                font-weight: bold;
                z-index: 2;
            }
            
            .format-tag {
                position: absolute;
                bottom: 8px;
                right: 8px;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 0.7rem;
                font-weight: bold;
                text-transform: uppercase;
                z-index: 2;
            }
            
            .conversion-actions {
                display: flex;
                gap: 10px;
                margin-top: 15px;
                padding-top: 15px;
                border-top: 1px solid var(--border-color);
            }
            
            .conversion-item {
                display: flex;
                align-items: center;
                padding: 12px;
                background: var(--bg-secondary);
                border-radius: var(--radius-md);
                margin-bottom: 10px;
            }
            
            .conversion-preview {
                width: 60px;
                height: 60px;
                object-fit: cover;
                border-radius: var(--radius-sm);
                margin-right: 15px;
            }
            
            .conversion-info {
                flex: 1;
            }
            
            .conversion-filename {
                font-weight: 600;
                color: var(--text-primary);
                margin-bottom: 4px;
            }
            
            .conversion-details {
                font-size: 0.8rem;
                color: var(--text-secondary);
            }
            
            .conversion-download-btn {
                padding: 6px 12px;
                background: var(--success-color);
                color: white;
                border: none;
                border-radius: var(--radius-sm);
                cursor: pointer;
                font-size: 0.8rem;
                display: flex;
                align-items: center;
                gap: 5px;
            }
            
            .conversion-download-btn:hover {
                filter: brightness(1.1);
            }
        `;
        document.head.appendChild(style);
    }

    setupEventListeners() {
        // Wait for DOM to be ready
        setTimeout(() => {
            
           // DOM elements
        const classNameInput = document.getElementById('className');
        const addClassBtn = document.getElementById('addClassBtn');
        const classList = document.getElementById('classList');
        const uploadImagesBtn = document.getElementById('uploadImagesBtn');
        const imageUpload = document.getElementById('imageUpload');
        const currentImage = document.getElementById('currentImage');
        const annotationCanvas = document.getElementById('annotationCanvas');
        const imageContainer = document.getElementById('imageContainer');
        const ctx = annotationCanvas.getContext('2d');
        const bboxList = document.getElementById('bboxList');
        const saveAnnotationsBtn = document.getElementById('saveAnnotationsBtn');
        const nextImageBtn = document.getElementById('nextImageBtn');
        const prevImageBtn = document.getElementById('prevImageBtn');
        const exportBtn = document.getElementById('exportBtn');
        const exportFormat = document.getElementById('exportFormat');
        const exportStatus = document.getElementById('exportStatus');
        const exportProgress = document.getElementById('exportProgress');
        const selectModeBtn = document.getElementById('selectModeBtn');
        const drawModeBtn = document.getElementById('drawModeBtn');
        const deleteModeBtn = document.getElementById('deleteModeBtn');
        const cropModeBtn = document.getElementById('cropModeBtn');
       // const sendToColabBtn = document.getElementById('sendToColabBtn');
        const colabStatus = document.getElementById('colabStatus');
        const colabProgress = document.getElementById('colabProgress');
        const colabUrlInput = document.getElementById('colabUrl');
        const modelNameInput = document.getElementById('modelName');
        const epochsInput = document.getElementById('epochs');
        const imageSizeInput = document.getElementById('imageSize');
        const cropModal = document.getElementById('cropModal');
        const cropPreview = document.getElementById('cropPreview');
        const confirmCropBtn = document.getElementById('confirmCropBtn');
        const cancelCropBtn = document.getElementById('cancelCropBtn');
        const boxControls = document.getElementById('boxControls');
        const boxClassSelect = document.getElementById('boxClassSelect');
        const boxXInput = document.getElementById('boxXInput');
        const boxYInput = document.getElementById('boxYInput');
        const boxWidthInput = document.getElementById('boxWidthInput');
        const boxHeightInput = document.getElementById('boxHeightInput');
        const updateBoxBtn = document.getElementById('updateBoxBtn');
            
          
            
            // Event listeners
        addClassBtn.addEventListener('click', addClass);
        uploadImagesBtn.addEventListener('click', () => imageUpload.click());
        imageUpload.addEventListener('change', handleImageUpload);
        saveAnnotationsBtn.addEventListener('click', saveAnnotations);
        nextImageBtn.addEventListener('click', loadNextImage);
        prevImageBtn.addEventListener('click', loadPrevImage);
        exportBtn.addEventListener('click', exportAnnotations);
       // sendToColabBtn.addEventListener('click', prepareColabNotebook);
        confirmCropBtn.addEventListener('click', confirmCrop);
        cancelCropBtn.addEventListener('click', cancelCrop);
        updateBoxBtn.addEventListener('click', updateSelectedBox);

        // Mode buttons
        selectModeBtn.addEventListener('click', () => setMode('select'));
        drawModeBtn.addEventListener('click', () => setMode('draw'));
        deleteModeBtn.addEventListener('click', () => setMode('delete'));
        cropModeBtn.addEventListener('click', () => setMode('crop'));

        // Mouse events for drawing boxes
        annotationCanvas.addEventListener('mousedown', handlePointerStart);
        annotationCanvas.addEventListener('mousemove', handlePointerMove);
        annotationCanvas.addEventListener('mouseup', handlePointerEnd);
        annotationCanvas.addEventListener('mouseleave', handlePointerEnd);

        // Touch events for drawing boxes
        annotationCanvas.addEventListener('touchstart', handlePointerStart, { passive: false });
        annotationCanvas.addEventListener('touchmove', handlePointerMove, { passive: false });
        annotationCanvas.addEventListener('touchend', handlePointerEnd);
            
            // Add converter tab event listener
            document.querySelectorAll('.tab-btn').forEach(btn => {
                if (btn.dataset.tab === 'annotation') {
                    btn.addEventListener('click', (e) => {
                        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                        
                        e.target.classList.add('active');
                        document.getElementById('annotation-tab').classList.add('active');
                        
                        this.refreshConvertedImages();
                    });
                }
            });
            
          
            
          
        }, 100);
    }

  
   

 setMode(mode) {
    currentMode = mode;
    selectModeBtn.classList.toggle('active', mode === 'select');
    drawModeBtn.classList.toggle('active', mode === 'draw');
    deleteModeBtn.classList.toggle('active', mode === 'delete');
    cropModeBtn.classList.toggle('active', mode === 'crop');
    selectedBoxIndex = -1;
    isDraggingBox = false;
    isResizingBox = false;
    isCropMode = (mode === 'crop');
    
    // Remove existing crop overlay if switching away from crop mode
    if (mode !== 'crop' && cropOverlay) {
        cropOverlay.remove();
        cropOverlay = null;
        
        // Remove crop button if exists
        if (cropButton && cropButton.parentNode) {
            cropButton.parentNode.removeChild(cropButton);
            cropButton = null;
        }
    } else if (mode === 'crop') {
        // Add crop action button to the annotation-mode section
        addCropActionButton();
    }
    
    boxControls.style.display = 'none';
    
    // Update overlay selection
    bboxOverlays.forEach(overlay => overlay.classList.remove('selected'));
    
    redrawBoxes();
}       
 
 addCropActionButton() {
    // Remove existing button if present
    if (cropButton && cropButton.parentNode) {
        cropButton.parentNode.removeChild(cropButton);
    }
    
    // Create crop action button
    cropButton = document.createElement('button');
    cropButton.id = 'applyCropBtn';
    cropButton.className = 'tool-btn';
    cropButton.textContent = 'Apply Crop';
    cropButton.style.backgroundColor = '#FFA500'; // Orange color
    cropButton.style.marginTop = '10px';
    cropButton.disabled = true; // Disabled until crop area is created
    
    // Insert after the annotation mode buttons
    const annotationModeDiv = document.querySelector('.annotation-mode');
    annotationModeDiv.parentNode.insertBefore(cropButton, annotationModeDiv.nextSibling);
    
    // Add event listener
    cropButton.addEventListener('click', () => {
        if (cropOverlay) {
            showCropModal();
        }
    });
}

 addClass() {
            const className = classNameInput.value.trim();
            if (className && !classes.includes(className)) {
                classes.push(className);
                renderClassList();
                classNameInput.value = '';
                saveClassesToDB();
                
                if (!selectedClass) {
                    selectClass(className);
                }
            }
        }

         renderClassList() {
            if (classes.length === 0) {
                classList.innerHTML = '<p>No classes added yet</p>';
                return;
            }
            
            classList.innerHTML = '';
            classes.forEach((className, index) => {
                const classTag = document.createElement('div');
                classTag.className = `class-tag ${className === selectedClass ? 'active' : ''}`;
                classTag.innerHTML = `
                    ${className}
                    <button class="remove-class" data-class="${className}">×</button>
                `;
                classTag.addEventListener('click', () => selectClass(className));
                classList.appendChild(classTag);
                
                const removeBtn = classTag.querySelector('.remove-class');
                removeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    removeClass(className);
                });
            });
        }

         selectClass(className) {
            selectedClass = className;
            renderClassList();
        }

         removeClass(className) {
            classes = classes.filter(c => c !== className);
            
            // Remove boxes with this class from all images
            for (const imageName in annotations) {
                annotations[imageName] = annotations[imageName].filter(box => box.class !== className);
            }
            
            if (selectedClass === className) {
                selectedClass = null;
            }
            
            renderClassList();
            saveClassesToDB();
            
            // Update current image if needed
            if (currentImageIndex >= 0) {
                const currentImageName = images[currentImageIndex].file.name;
                boundingBoxes = annotations[currentImageName] || [];
                renderBBoxList();
                clearBBoxOverlays();
                createBBoxOverlays();
            }
        }

  handleImageUpload(e) {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    files.forEach(file => {
        if (!file.type.match('image.*')) return;
        
        const reader = new FileReader();
        reader.onload = async (event) => {
            // Convert ArrayBuffer to Blob
            const blob = new Blob([event.target.result], { type: file.type });
            
            // Create object URL for display
            const dataUrl = URL.createObjectURL(blob);
            
            // Check if image already exists
            const existingIndex = images.findIndex(img => img.file.name === file.name);
            
            if (existingIndex === -1) {
                // Save image to DB
                try {
                    await saveImageToDB(file.name, blob);
                    
                    // Add to images array
                    images.push({
                        file: file,
                        dataUrl: dataUrl
                    });
                    
                    // Add to library display if not already there
                    const imgExistsInLibrary = libraryImages.some(img => img.imageName === file.name);
                    if (!imgExistsInLibrary) {
                        libraryImages.push({
                            imageName: file.name,
                            blob: blob,
                            type: file.type,
                            size: file.size,
                            timestamp: Date.now()
                        });
                    }
                    
                    // If this is the first image, set it as current
                    if (currentImageIndex === -1) {
                        currentImageIndex = 0;
                        loadCurrentImage();
                    } else {
                        // Otherwise, set the newly uploaded image as current
                        currentImageIndex = images.length - 1;
                        loadCurrentImage();
                    }
                    
                    // Immediately update library display
                   // renderLibrary();
                    
                } catch (error) {
                    console.error('Error saving image to DB:', error);
                    alert('Failed to save image to database');
                }
            } else {
                // Image already exists, switch to it
                currentImageIndex = existingIndex;
                loadCurrentImage();
            }
        };
        reader.readAsArrayBuffer(file);
    });
    
    e.target.value = '';
}
    loadCurrentImage() {
    if (currentImageIndex < 0 || currentImageIndex >= images.length) return;
    
    const image = images[currentImageIndex];
    currentImage.src = image.dataUrl;
    currentImage.style.display = 'block';
    
    // Clear any existing overlays BEFORE loading new image
    clearBBoxOverlays();
    
    // Also clear any crop overlay that might be present
    if (cropOverlay && cropOverlay.parentNode) {
        cropOverlay.parentNode.removeChild(cropOverlay);
        cropOverlay = null;
    }
    
    // Clear the crop button if it exists
    if (cropButton && cropButton.parentNode) {
        cropButton.parentNode.removeChild(cropButton);
        cropButton = null;
    }
    
    // Reset bounding boxes array for the new image
    boundingBoxes = [];
    selectedBoxIndex = -1;
    boxControls.style.display = 'none';
    
    currentImage.onload = () => {
        // Wait a bit for image to fully load
        setTimeout(() => {
            setupCanvas();
            
            // Load existing annotations if available
            const imageKey = image.file.name;
            boundingBoxes = annotations[imageKey] || [];
            renderBBoxList();
            createBBoxOverlays();
            
            // Reset crop mode if active
            if (currentMode === 'crop') {
                addCropActionButton();
                if (cropButton) {
                    cropButton.disabled = true;
                }
            }
        }, 50);
    };
    
    currentImage.onerror = () => {
        console.error('Failed to load image:', image.file.name);
        // Try to reload from DB
        getImageFromDB(image.file.name).then(blob => {
            if (blob) {
                const newDataUrl = URL.createObjectURL(blob);
                image.dataUrl = newDataUrl;
                currentImage.src = newDataUrl;
            }
        });
    };
} 

 loadNextImage() {
    if (images.length === 0) return;
    
    // Clear current overlays before switching
    clearBBoxOverlays();
    selectedBoxIndex = -1;
    boxControls.style.display = 'none';
    
    currentImageIndex = (currentImageIndex + 1) % images.length;
    loadCurrentImage();
}

 loadPrevImage() {
    if (images.length === 0) return;
    
    // Clear current overlays before switching
    clearBBoxOverlays();
    selectedBoxIndex = -1;
    boxControls.style.display = 'none';
    
    currentImageIndex = (currentImageIndex - 1 + images.length) % images.length;
    loadCurrentImage();
}
 resetAnnotationState() {
    clearBBoxOverlays();
    boundingBoxes = [];
    selectedBoxIndex = -1;
    boxControls.style.display = 'none';
    renderBBoxList();
    
    // Clear canvas
    if (ctx) {
        ctx.clearRect(0, 0, annotationCanvas.width, annotationCanvas.height);
    }
}
// Update handlePointerStart  for crop mode
 handlePointerStart(e) {
    if (currentMode === 'draw') {
        handleDrawStart(e);
    } else if (currentMode === 'crop') {
        handleCropStart(e);
    }
}
// Update handleCropStart  to enable the crop button
 handleCropStart(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const pos = getEventPos(e);
    const x = pos.x;
    const y = pos.y;
    
    // Remove existing crop overlay
    if (cropOverlay) {
        cropOverlay.remove();
        cropOverlay = null;
    }
    
    // Create crop overlay
    cropOverlay = document.createElement('div');
    cropOverlay.className = 'bbox-overlay crop-overlay';
    
    cropOverlay.style.left = `${x}px`;
    cropOverlay.style.top = `${y}px`;
    cropOverlay.style.width = '0px';
    cropOverlay.style.height = '0px';
    
    // Add label
    const label = document.createElement('div');
    label.className = 'bbox-label';
    label.textContent = 'Crop Area';
    cropOverlay.appendChild(label);
    
    // Add resize handles
    const handles = ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'];
    handles.forEach(handle => {
        const handleEl = document.createElement('div');
        handleEl.className = `resize-handle ${handle}`;
        cropOverlay.appendChild(handleEl);
    });
    
    imageContainer.appendChild(cropOverlay);
    
    // Setup event listeners for the crop overlay
    setupCropOverlayEvents(cropOverlay, x, y);
    
    // Enable the crop button after creating overlay
    if (cropButton) {
        cropButton.disabled = false;
        cropButton.style.opacity = '1';
        cropButton.style.cursor = 'pointer';
    }
}
// Update setupCropOverlayEvents - remove the automatic modal trigger
 setupCropOverlayEvents(overlay, startX, startY) {
    let isDragging = false;
    let isResizing = false;
    let startLeft = startX;
    let startTop = startY;
    let startWidth = 0;
    let startHeight = 0;
    let resizeHandle = null;
    
    // Mouse events
    overlay.addEventListener('mousedown', handleCropMoveStart);
    overlay.addEventListener('touchstart', handleCropMoveStart, { passive: false });
    
     handleCropMoveStart(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const isTouch = e.type === 'touchstart';
        const clientX = isTouch ? e.touches[0].clientX : e.clientX;
        const clientY = isTouch ? e.touches[0].clientY : e.clientY;
        
        startX = clientX;
        startY = clientY;
        
        // Get current position and size
        startLeft = parseInt(overlay.style.left);
        startTop = parseInt(overlay.style.top);
        startWidth = parseInt(overlay.style.width);
        startHeight = parseInt(overlay.style.height);
        
        // Check if we're on a resize handle
        if (e.target.classList.contains('resize-handle')) {
            isResizing = true;
            resizeHandle = e.target.classList[1];
        } else {
            isDragging = true;
        }
        
        // Add move and end listeners
        document.addEventListener('mousemove', handleCropMove);
        document.addEventListener('touchmove', handleCropMove, { passive: false });
        document.addEventListener('mouseup', handleCropMoveEnd);
        document.addEventListener('touchend', handleCropMoveEnd);
    }
    
     handleCropMove(e) {
        if (!isDragging && !isResizing) return;
        
        e.preventDefault();
        
        const isTouch = e.type === 'touchmove';
        const clientX = isTouch ? e.touches[0].clientX : e.clientX;
        const clientY = isTouch ? e.touches[0].clientY : e.clientY;
        
        const deltaX = clientX - startX;
        const deltaY = clientY - startY;
        
        if (isDragging) {
            // Move the overlay
            const newLeft = startLeft + deltaX;
            const newTop = startTop + deltaY;
            
            // Keep within container bounds
            const maxLeft = imageContainer.clientWidth - startWidth;
            const maxTop = imageContainer.clientHeight - startHeight;
            
            overlay.style.left = `${Math.max(0, Math.min(newLeft, maxLeft))}px`;
            overlay.style.top = `${Math.max(0, Math.min(newTop, maxTop))}px`;
        } else if (isResizing) {
            // Resize the overlay based on the handle
            let newLeft = startLeft;
            let newTop = startTop;
            let newWidth = startWidth;
            let newHeight = startHeight;
            
            switch (resizeHandle) {
                case 'nw':
                    newLeft = startLeft + deltaX;
                    newTop = startTop + deltaY;
                    newWidth = startWidth - deltaX;
                    newHeight = startHeight - deltaY;
                    break;
                case 'n':
                    newTop = startTop + deltaY;
                    newHeight = startHeight - deltaY;
                    break;
                case 'ne':
                    newTop = startTop + deltaY;
                    newWidth = startWidth + deltaX;
                    newHeight = startHeight - deltaY;
                    break;
                case 'w':
                    newLeft = startLeft + deltaX;
                    newWidth = startWidth - deltaX;
                    break;
                case 'e':
                    newWidth = startWidth + deltaX;
                    break;
                case 'sw':
                    newLeft = startLeft + deltaX;
                    newWidth = startWidth - deltaX;
                    newHeight = startHeight + deltaY;
                    break;
                case 's':
                    newHeight = startHeight + deltaY;
                    break;
                case 'se':
                    newWidth = startWidth + deltaX;
                    newHeight = startHeight + deltaY;
                    break;
            }
            
            // Ensure minimum size
            newWidth = Math.max(50 / scaleX, newWidth);
            newHeight = Math.max(50 / scaleY, newHeight);
            
            // Adjust position for handles that change it
            if (resizeHandle.includes('w')) {
                newLeft = startLeft + (startWidth - newWidth);
            }
            if (resizeHandle.includes('n')) {
                newTop = startTop + (startHeight - newHeight);
            }
            
            // Keep within container bounds
            newLeft = Math.max(0, Math.min(newLeft, imageContainer.clientWidth - newWidth));
            newTop = Math.max(0, Math.min(newTop, imageContainer.clientHeight - newHeight));
            newWidth = Math.min(newWidth, imageContainer.clientWidth - newLeft);
            newHeight = Math.min(newHeight, imageContainer.clientHeight - newTop);
            
            overlay.style.left = `${newLeft}px`;
            overlay.style.top = `${newTop}px`;
            overlay.style.width = `${newWidth}px`;
            overlay.style.height = `${newHeight}px`;
        }
    }
    
     handleCropMoveEnd() {
        isDragging = false;
        isResizing = false;
        resizeHandle = null;
        
        // Remove event listeners
        document.removeEventListener('mousemove', handleCropMove);
        document.removeEventListener('touchmove', handleCropMove);
        document.removeEventListener('mouseup', handleCropMoveEnd);
        document.removeEventListener('touchend', handleCropMoveEnd);
        
        // No automatic modal trigger here - user must click "Apply Crop" button
    }
}// Separate  for draw start
 handleDrawStart(e) {
    if (!selectedClass) {
        alert('Please select a class first');
        return;
    }
    
    e.preventDefault();
    
    const pos = getEventPos(e);
    const x = pos.x;
    const y = pos.y;
    
    isDrawing = true;
    startX = x;
    startY = y;
    currentX = x;
    currentY = y;
}


 handlePointerMove(e) {
    if (isDrawing && currentMode === 'draw') {
        handleDrawMove(e);
    }
    // No need for crop move handler anymore
}
 handleDrawMove(e) {
    if (!isDrawing) return;
    
    e.preventDefault();
    
    const pos = getEventPos(e);
    currentX = pos.x;
    currentY = pos.y;
    redrawBoxes();
}

     handlePointerEnd(e) {
    if (isDrawing && currentMode === 'draw') {
        handleDrawEnd(e);
    }
    // No need for crop end handler anymore
}
 handleDrawEnd(e) {
    if (!isDrawing) return;
    
    e.preventDefault();
    
    const pos = getEventPos(e);
    const endX = pos.x;
    const endY = pos.y;
    
    // Create box (ensure positive width/height)
    const box = {
        x: Math.min(startX, endX) * scaleX,
        y: Math.min(startY, endY) * scaleY,
        width: Math.abs(endX - startX) * scaleX,
        height: Math.abs(endY - startY) * scaleY,
        class: selectedClass
    };
    
    // Minimum size threshold (10x10 pixels)
    if (box.width > 10 && box.height > 10) {
        boundingBoxes.push(box);
        selectedBoxIndex = boundingBoxes.length - 1;
        createBBoxOverlay(box, boundingBoxes.length - 1);
        selectBBox(selectedBoxIndex);
        renderBBoxList();
    }
    
    isDrawing = false;
    redrawBoxes();
}
         renderBBoxList() {
            if (boundingBoxes.length === 0) {
                bboxList.innerHTML = '<p>No bounding boxes added yet</p>';
                return;
            }
            
            bboxList.innerHTML = '';
            boundingBoxes.forEach((box, index) => {
                const item = document.createElement('div');
                item.className = 'bbox-item';
                item.innerHTML = `
                    ${box.class} (${Math.round(box.x)}, ${Math.round(box.y)}, ${Math.round(box.width)}, ${Math.round(box.height)})
                    <button data-index="${index}">×</button>
                `;
                item.addEventListener('click', () => {
                    selectBBox(index);
                });
                
                item.querySelector('button').addEventListener('click', (e) => {
                    e.stopPropagation();
                    boundingBoxes.splice(index, 1);
                    
                    // Remove overlay
                    if (bboxOverlays[index]) {
                        bboxOverlays[index].remove();
                        bboxOverlays.splice(index, 1);
                    }
                    
                    // Update indices for remaining overlays
                    for (let i = index; i < bboxOverlays.length; i++) {
                        bboxOverlays[i].dataset.index = i;
                    }
                    
                    selectedBoxIndex = -1;
                    updateBoxControls();
                    renderBBoxList();
                });
                
                bboxList.appendChild(item);
            });
        }
// Update showCropModal to check for valid crop area
 showCropModal() {
    if (!cropOverlay) {
        alert('Please create a crop area first by clicking and dragging on the image');
        return;
    }
    
    // Get crop area from overlay
    const displayX = parseInt(cropOverlay.style.left);
    const displayY = parseInt(cropOverlay.style.top);
    const displayWidth = parseInt(cropOverlay.style.width);
    const displayHeight = parseInt(cropOverlay.style.height);
    
    // Convert to image coordinates
    const cropX = displayX * scaleX;
    const cropY = displayY * scaleY;
    const cropWidth = displayWidth * scaleX;
    const cropHeight = displayHeight * scaleY;
    
    // Minimum crop size check
    if (cropWidth < 50 || cropHeight < 50) {
        alert('Crop area is too small. Minimum size is 50x50 pixels.');
        return;
    }
    
    // Store crop coordinates for later use
    cropStartX = displayX;
    cropStartY = displayY;
    cropEndX = displayX + displayWidth;
    cropEndY = displayY + displayHeight;
    
    // Create a temporary canvas to show the crop preview
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = cropWidth;
    tempCanvas.height = cropHeight;
    const tempCtx = tempCanvas.getContext('2d');
    
    // Draw the cropped portion
    tempCtx.drawImage(
        currentImage,
        cropX, cropY, cropWidth, cropHeight,
        0, 0, cropWidth, cropHeight
    );
    
    // Show the cropped image in the modal
    cropPreview.src = tempCanvas.toDataURL('image/jpeg', 0.9);
    cropModal.style.display = 'flex';
    
    // Add info about crop size
    const cropInfo = document.createElement('div');
    cropInfo.className = 'crop-info';
    cropInfo.innerHTML = `
        <p>Crop size: ${Math.round(cropWidth)}x${Math.round(cropHeight)} pixels</p>
        <p class="crop-warning">This will create a new separate image in your library.</p>
    `;
    
    // Remove previous info if exists
    const existingInfo = document.querySelector('.crop-info');
    if (existingInfo) {
        existingInfo.remove();
    }
    
    cropModal.querySelector('.modal-content').appendChild(cropInfo);
}

// Replace the entire confirmCrop  with this updated version:
 confirmCrop() {
    // Calculate crop area
    const cropX = Math.min(cropStartX, cropEndX) * scaleX;
    const cropY = Math.min(cropStartY, cropEndY) * scaleY;
    const cropWidth = Math.abs(cropEndX - cropStartX) * scaleX;
    const cropHeight = Math.abs(cropEndY - cropStartY) * scaleY;
    
    // Create a canvas to get the cropped image as blob
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = cropWidth;
    tempCanvas.height = cropHeight;
    const tempCtx = tempCanvas.getContext('2d');
    
    // Draw the cropped portion
    tempCtx.drawImage(
        currentImage,
        cropX, cropY, cropWidth, cropHeight,
        0, 0, cropWidth, cropHeight
    );
    
    // Convert canvas to blob and save
    tempCanvas.toBlob(async (blob) => {
        if (!blob) {
            console.error('Failed to create blob from cropped image');
            alert('Failed to save cropped image');
            return;
        }
        
        const originalImageName = images[currentImageIndex].file.name;
        const croppedName = `cropped_${Date.now()}_${originalImageName}`;
        
        try {
            // Save cropped image to DB
            await saveImageToDB(croppedName, blob);
            
            // Create object URL for the cropped image
            const croppedDataUrl = URL.createObjectURL(blob);
            
            // Add the cropped image to images array as a new image
            const croppedFile = new File([blob], croppedName, { 
                type: blob.type,
                lastModified: Date.now()
            });
            
            images.push({
                file: croppedFile,
                dataUrl: croppedDataUrl
            });
            
            // Update current image index to the new cropped image
            currentImageIndex = images.length - 1;
            
            // Load the cropped image
            currentImage.src = croppedDataUrl;
            
            // Update image blob cache
            imageBlobs[croppedName] = blob;
            
            // Add to library display
            const imgExistsInLibrary = libraryImages.some(img => img.imageName === croppedName);
            if (!imgExistsInLibrary) {
                libraryImages.push({
                    imageName: croppedName,
                    blob: blob,
                    type: blob.type,
                    size: blob.size,
                    timestamp: Date.now()
                });
            }
            
            // Update annotations for the cropped image - scale existing annotations
            const originalAnnotations = annotations[originalImageName] || [];
            const scaledAnnotations = [];
            
            if (originalAnnotations.length > 0) {
                // Calculate scale factors
                const originalWidth = currentImage.naturalWidth;
                const originalHeight = currentImage.naturalHeight;
                
                originalAnnotations.forEach(box => {
                    // Check if box intersects with crop area
                    const boxRight = box.x + box.width;
                    const boxBottom = box.y + box.height;
                    
                    if (boxRight > cropX && box.x < cropX + cropWidth &&
                        boxBottom > cropY && box.y < cropY + cropHeight) {
                        
                        // Calculate intersection
                        const intersectX = Math.max(box.x, cropX);
                        const intersectY = Math.max(box.y, cropY);
                        const intersectRight = Math.min(boxRight, cropX + cropWidth);
                        const intersectBottom = Math.min(boxBottom, cropY + cropHeight);
                        
                        const intersectWidth = intersectRight - intersectX;
                        const intersectHeight = intersectBottom - intersectY;
                        
                        // Only keep boxes with reasonable size
                        if (intersectWidth > 10 && intersectHeight > 10) {
                            // Scale to new image dimensions
                            const scaledBox = {
                                x: ((intersectX - cropX) / cropWidth) * tempCanvas.width,
                                y: ((intersectY - cropY) / cropHeight) * tempCanvas.height,
                                width: (intersectWidth / cropWidth) * tempCanvas.width,
                                height: (intersectHeight / cropHeight) * tempCanvas.height,
                                class: box.class
                            };
                            
                            // Ensure boxes are within bounds
                            scaledBox.x = Math.max(0, Math.min(scaledBox.x, tempCanvas.width - scaledBox.width));
                            scaledBox.y = Math.max(0, Math.min(scaledBox.y, tempCanvas.height - scaledBox.height));
                            
                            scaledAnnotations.push(scaledBox);
                        }
                    }
                });
            }
            
            // Save annotations for cropped image
            annotations[croppedName] = scaledAnnotations;
            
            // Save annotations to database
            await saveToDB(croppedName, scaledAnnotations, blob);
            
            // Update bounding boxes for current display
            boundingBoxes = scaledAnnotations;
            
            // Update library display
           // renderLibrary();
            
            // Close the modal
            cropModal.style.display = 'none';
            
            // Redraw everything
            currentImage.onload = () => {
                setupCanvas();
                renderBBoxList();
                clearBBoxOverlays();
                createBBoxOverlays();
                
                // Show success message
                showCropProgress('Cropped image saved as a new image!', false);
            };
            
        } catch (error) {
            console.error('Error saving cropped image:', error);
            showCropProgress('Failed to save cropped image: ' + error.message, true);
            
            // Revert to original image
            loadCurrentImage();
        }
        
    }, 'image/jpeg', 0.9); // 0.9 is the quality for JPEG
}

// Add this helper  to show crop progress messages
 showCropProgress(message, isError = false) {
    const progressDiv = document.createElement('div');
    progressDiv.textContent = message;
    progressDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: ${isError ? '#f44336' : '#4CAF50'};
        color: white;
        padding: 10px 20px;
        border-radius: 5px;
        z-index: 9999;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    `;
    document.body.appendChild(progressDiv);
    
    setTimeout(() => {
        if (progressDiv.parentNode) {
            progressDiv.parentNode.removeChild(progressDiv);
        }
    }, 3000);
}
     // Update cancelCrop 
 cancelCrop() {
    cropModal.style.display = 'none';
    // Don't remove the crop overlay - user might want to adjust it
} 

 updateSelectedBox() {
            if (selectedBoxIndex === -1) return;
            
            const box = boundingBoxes[selectedBoxIndex];
            
            // Update box properties from controls
            box.class = boxClassSelect.value;
            box.x = parseInt(boxXInput.value);
            box.y = parseInt(boxYInput.value);
            box.width = parseInt(boxWidthInput.value);
            box.height = parseInt(boxHeightInput.value);
            
            // Update the overlay
            if (bboxOverlays[selectedBoxIndex]) {
                const overlay = bboxOverlays[selectedBoxIndex];
                
                // Convert from image coordinates to display coordinates
                const displayX = box.x / scaleX;
                const displayY = box.y / scaleY;
                const displayWidth = box.width / scaleX;
                const displayHeight = box.height / scaleY;
                
                overlay.style.left = `${displayX}px`;
                overlay.style.top = `${displayY}px`;
                overlay.style.width = `${displayWidth}px`;
                overlay.style.height = `${displayHeight}px`;
                
                // Update label
                const label = overlay.querySelector('.bbox-label');
                label.textContent = box.class;
            }
            
            // Update the display
            renderBBoxList();
        }

saveAnnotations = async () => {
    if (currentImageIndex < 0 || currentImageIndex >= images.length) {
        alert('No image loaded');
        return;
    }
    
    const imageKey = images[currentImageIndex].file.name;
    const boxes = [...boundingBoxes];
    annotations[imageKey] = boxes;
    
    // Get image blob
    let imageBlob = null;
    
    if (imageBlobs[imageKey]) {
        imageBlob = imageBlobs[imageKey];
    } else {
        // Try to get image from current image data
        try {
            const response = await fetch(images[currentImageIndex].dataUrl);
            imageBlob = await response.blob();
            imageBlobs[imageKey] = imageBlob;
        } catch (error) {
            console.error('Error getting image blob:', error);
        }
    }
    
    try {
        await saveToDB(imageKey, boxes, imageBlob);
        
        // Update libraryImages array with current image if not already there
        const imageExistsInLibrary = libraryImages.some(img => img.imageName === imageKey);
        if (!imageExistsInLibrary && imageBlob) {
            libraryImages.push({
                imageName: imageKey,
                blob: imageBlob,
                type: imageBlob.type || 'image/jpeg',
                size: imageBlob.size || 0,
                timestamp: Date.now()
            });
        } else if (imageExistsInLibrary) {
            // Update existing entry timestamp
            const imgIndex = libraryImages.findIndex(img => img.imageName === imageKey);
            if (imgIndex !== -1) {
                libraryImages[imgIndex].timestamp = Date.now();
            }
        }
        
        // Immediately update library display
     //   renderLibrary();
        
        // Show temporary feedback
        const originalText = saveAnnotationsBtn.textContent;
        saveAnnotationsBtn.textContent = 'Saved!';
        saveAnnotationsBtn.style.backgroundColor = '#4CAF50';
        
        setTimeout(() => {
            saveAnnotationsBtn.textContent = originalText;
            saveAnnotationsBtn.style.backgroundColor = '';
        }, 2000);
        
    } catch (error) {
        console.error('Error saving annotations:', error);
        alert('Failed to save annotations');
    }
}
exportAnnotations = async () => {
            if (Object.keys(annotations).length === 0) {
                exportStatus.textContent = 'No annotations to export';
                return;
            }
            
            const format = exportFormat.value;
            this.exportData;
            
            exportStatus.textContent = 'Preparing export...';
            exportProgress.style.width = '0%';
            
            try {
                // Simulate processing (in a real app, this would process all images)
                for (let i = 0; i <= 100; i += 10) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    exportProgress.style.width = `${i}%`;
                }
                
                switch (format) {
                    case 'pascal':
                        this.exportData = convertToPascalVOC();
                        downloadFile('annotations.zip', exportData);
                        break;
                    case 'coco':
                        this.exportData = JSON.stringify(convertToCOCO(), null, 2);
                        downloadFile('annotations.json', exportData);
                        break;
                    case 'yolo':
                        this.exportData = convertToYOLO();
                        downloadFile('annotations.zip', exportData);
                        break;
                    case 'tfrecord':
                        exportStatus.textContent = 'TFRecord conversion requires server-side processing';
                        break;
                }
                
                exportStatus.textContent = `Annotations exported as ${format.toUpperCase()}`;
                exportProgress.style.width = '100%';
            } catch (error) {
                console.error('Export error:', error);
                exportStatus.textContent = 'Export failed: ' + error.message;
            }
        }

         convertToPascalVOC() {
            // Simulated Pascal VOC XML data
            let xmlData = '<?xml version="1.0"?>\n<annotations>\n';
            
            Object.keys(annotations).forEach(imageName => {
                xmlData += `  <image name="${imageName}">\n`;
                annotations[imageName].forEach(box => {
                    xmlData += `    <box label="${box.class}" x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}"/>\n`;
                });
                xmlData += '  </image>\n';
            });
            
            xmlData += '</annotations>';
            return xmlData;
        }

         convertToCOCO() {
            // COCO format JSON structure
            const coco = {
                info: {
                    description: "COCO format annotations",
                    version: "1.0",
                    year: new Date().getFullYear(),
                    contributor: "Object Detection Annotation Tool"
                },
                images: [],
                annotations: [],
                categories: classes.map((cls, id) => ({ id: id + 1, name: cls }))
            };
            
            Object.keys(annotations).forEach((imageName, imgId) => {
                coco.images.push({
                    id: imgId + 1,
                    file_name: imageName,
                    width: currentImage.naturalWidth,
                    height: currentImage.naturalHeight
                });
                
                annotations[imageName].forEach((box, annId) => {
                    const categoryId = classes.indexOf(box.class) + 1;
                    coco.annotations.push({
                        id: annId + 1,
                        image_id: imgId + 1,
                        category_id: categoryId,
                        bbox: [box.x, box.y, box.width, box.height],
                        area: box.width * box.height,
                        iscrowd: 0
                    });
                });
            });
            
            return coco;
        }

         convertToYOLO() {
            // YOLO format: one txt file per image with normalized coordinates
            let yoloData = '';
            
            Object.keys(annotations).forEach(imageName => {
                yoloData += `# ${imageName}\n`;
                annotations[imageName].forEach(box => {
                    const classId = classes.indexOf(box.class);
                    const xCenter = (box.x + box.width/2) / currentImage.naturalWidth;
                    const yCenter = (box.y + box.height/2) / currentImage.naturalHeight;
                    const width = box.width / currentImage.naturalWidth;
                    const height = box.height / currentImage.naturalHeight;
                    
                    yoloData += `${classId} ${xCenter.toFixed(6)} ${yCenter.toFixed(6)} ${width.toFixed(6)} ${height.toFixed(6)}\n`;
                });
                yoloData += '\n';
            });
            
            return yoloData;
        }

         prepareColabNotebook() {
            colabStatus.textContent = 'Preparing Colab notebook...';
            colabProgress.style.width = '0%';
            
            // Simulate processing
            const interval = setInterval(() => {
                const current = parseInt(colabProgress.style.width) || 0;
                if (current < 100) {
                    colabProgress.style.width = `${current + 10}%`;
                } else {
                    clearInterval(interval);
                    
                    // Generate Colab notebook template
                    const modelName = modelNameInput.value.trim() || 'ObjectDetector';
                    const epochs = epochsInput.value || 10;
                    const imageSize = imageSizeInput.value || 640;
                    
                    const notebookContent = `# Object Detection Training Notebook
# Generated by Annotation Tool

!pip install tensorflow tensorflow-object-detection-api pycocotools

import tensorflow as tf
import os
import json
from google.colab import files

# Parameters
MODEL_NAME = "${modelName}"
EPOCHS = ${epochs}
IMAGE_SIZE = ${imageSize}
BATCH_SIZE = 8

# Download annotations
# (In a real implementation, this would download your exported annotations)
print("Please upload your annotations file:")
uploaded = files.upload()
annotation_file = next(iter(uploaded))

# Load annotations
if annotation_file.endswith('.json'):
    # COCO format
    with open(annotation_file) as f:
        annotations = json.load(f)
elif annotation_file.endswith('.txt'):
    # YOLO format
    pass  # YOLO processing would go here
else:
    # Pascal VOC or other formats
    pass

# Prepare dataset
# (Dataset preparation code would go here)

# Model configuration
# (Model setup code would go here)

# Training
print(f"Training {MODEL_NAME} for {EPOCHS} epochs...")
# (Training code would go here)

# Save model
model.save(f"{MODEL_NAME}.h5")
files.download(f"{MODEL_NAME}.h5")

print("Training complete!");
`;
                    
                    colabStatus.innerHTML = `
                        <p>Colab notebook prepared successfully!</p>
                        <p>Copy this code into a new Colab notebook:</p>
                        <textarea style="height: 300px;
    
   
    
   
   margin-top: -10em;height:300px; font-family: monospace;">${notebookContent}</textarea>
                        <p>Or <a href="https://colab.research.google.com/#create=true" target="_blank">open a new Colab notebook</a> and paste the code.</p>
                    `;
                }
            }, 300);
        }

         downloadFile(filename, content) {
            const blob = new Blob([content], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
}