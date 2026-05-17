// ffmpeg-renderer.js
//import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';

class FFmpegRenderer {
    constructor() {
        this.ffmpeg = createFFmpeg({ 
            log: true,
            corePath: 'https://unpkg.com/@ffmpeg/core@0.12.2/dist/ffmpeg-core.js'
        });
        this.loaded = false;
        this.renderQueue = [];
        this.isRendering = false;
    }

    async init() {
        if (this.loaded) return;
        // ffmpeg-renderer.js (ES5 version)
var FFmpegRenderer = (function() {
    
    function FFmpegRenderer() {
        this.ffmpeg = null;
        this.loaded = false;
        this.renderQueue = [];
        this.isRendering = false;
        
        // Initialize FFmpeg
        if (typeof createFFmpeg !== 'undefined') {
            this.ffmpeg = createFFmpeg({ 
                log: false,  // Set to true for debugging
                corePath: 'https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js'
            });
        } else {
            console.warn('FFmpeg library not loaded');
        }
    }
    
    // ... rest of the FFmpegRenderer implementation from earlier ...
    // Make sure to convert all async/await to Promise-based if needed
    // but keep async/await if you're supporting modern browsers
    
    return FFmpegRenderer;
})();
        try {
            console.log('🔄 Loading FFmpeg.wasm...');
            await this.ffmpeg.load();
            this.loaded = true;
            console.log('✅ FFmpeg.wasm loaded successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to load FFmpeg.wasm:', error);
            throw error;
        }
    }

    async renderFromDatabase(dbManager, projectId, editor) {
        if (!this.loaded) {
            await this.init();
        }

        // Load project data from IndexedDB
        const project = await this.loadProjectData(dbManager, projectId, editor);
        
        // Show render modal
        const modal = this.showRenderModal();
        
        try {
            const result = await this.renderProject(project, modal);
            return result;
        } catch (error) {
            modal.update({ error: error.message });
            throw error;
        }
    }

    async loadProjectData(dbManager, projectId, editor) {
        console.log('📂 Loading project data from database...');
        
        // 1. Get project metadata
        const project = await dbManager._getProject(projectId);
        if (!project) {
            throw new Error('Project not found');
        }

        // 2. Get all clips
        const clips = await dbManager._getAllByProject('clips', projectId);
        
        // 3. Get all media
        const mediaItems = await dbManager._getAllByProject('media', projectId);
        
        // 4. Get settings
        const settingsArray = await dbManager._getAllByProject('settings', projectId);
        const settings = {};
        settingsArray.forEach(s => {
            settings[s.settingKey] = s.value;
        });

        // 5. Get audio analysis if exists
        let audioAnalysis = null;
        try {
            const analysis = await dbManager._getByCompoundKey('audio_analysis', projectId);
            if (analysis) audioAnalysis = analysis;
        } catch (e) {
            console.log('No audio analysis found');
        }

        // Process clips with their media
        const processedClips = [];
        for (const clipData of clips) {
            const clip = clipData.data || clipData;
            
            // Find corresponding media
            const media = mediaItems.find(m => 
                m.mediaId === clip.mediaId || 
                m.name === clip.fileName
            );
            
            if (!media && clip.url) {
                // Create media from clip data
                const clipMedia = {
                    mediaId: clip.id || Date.now(),
                    name: clip.name || clip.fileName,
                    type: clip.type,
                    url: clip.url,
                    duration: clip.duration || 5
                };
                processedClips.push({
                    ...clip,
                    media: clipMedia
                });
            } else if (media) {
                processedClips.push({
                    ...clip,
                    media: media
                });
            }
        }

        return {
            metadata: project,
            clips: processedClips,
            settings: settings,
            audioAnalysis: audioAnalysis,
            editor: editor // Keep editor reference for preview
        };
    }

    async renderProject(projectData, modal) {
        console.log('🎬 Starting FFmpeg render...');
        
        // Create temporary directory structure in FFmpeg's virtual filesystem
        await this.setupVirtualFS();
        
        // Prepare all media files
        await this.prepareMediaFiles(projectData.clips, modal);
        
        // Generate FFmpeg command
        const ffmpegCommand = this.buildFFmpegCommand(projectData);
        
        console.log('📝 FFmpeg command:', ffmpegCommand);
        
        // Execute FFmpeg
        return await this.executeFFmpeg(ffmpegCommand, modal, projectData.metadata.name);
    }

    async setupVirtualFS() {
        // Create necessary directories
        this.ffmpeg.FS('mkdir', '/input');
        this.ffmpeg.FS('mkdir', '/output');
        this.ffmpeg.FS('mkdir', '/audio');
        this.ffmpeg.FS('mkdir', '/temp');
    }

    async prepareMediaFiles(clips, modal) {
        let processed = 0;
        const total = clips.length;
        
        for (const clip of clips) {
            modal.update({
                status: `Preparing ${clip.media?.name || clip.name} (${processed + 1}/${total})`,
                progress: (processed / total) * 30 // First 30% is preparation
            });
            
            await this.processClip(clip);
            processed++;
            
            modal.update({
                progress: (processed / total) * 30
            });
        }
    }

    async processClip(clip) {
        const media = clip.media;
        
        if (!media || !media.url) {
            console.warn('Skipping clip without media:', clip.name);
            return;
        }
        
        const fileName = `${clip.id || Date.now()}_${media.name.replace(/[^a-z0-9]/gi, '_')}`;
        
        if (media.type === 'image') {
            // Handle images
            await this.processImage(clip, fileName);
        } else if (media.type === 'video') {
            // Handle videos from ./vid/ folder
            await this.processVideo(clip, fileName);
        } else if (media.type === 'audio') {
            // Handle audio
            await this.processAudio(clip, fileName);
        }
    }

    async processImage(clip, fileName) {
        try {
            let imageData;
            
            if (clip.editedUrl) {
                // Use edited image if available
                imageData = await this.fetchDataURL(clip.editedUrl);
            } else if (clip.media?.url.startsWith('data:')) {
                // Already a data URL
                imageData = clip.media.url;
            } else if (clip.media?.url.startsWith('blob:')) {
                // Convert blob URL to data URL
                const response = await fetch(clip.media.url);
                const blob = await response.blob();
                imageData = await this.blobToDataURL(blob);
            } else {
                // Try to fetch from URL
                const response = await fetch(clip.media.url);
                const blob = await response.blob();
                imageData = await this.blobToDataURL(blob);
            }
            
            // Convert data URL to binary
            const binaryString = atob(imageData.split(',')[1]);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            
            // Write to virtual filesystem
            this.ffmpeg.FS('writeFile', `/input/${fileName}.png`, bytes);
            
            // Create a video from image with duration
            await this.createVideoFromImage(`/input/${fileName}.png`, clip.duration, fileName);
            
        } catch (error) {
            console.error('Failed to process image:', clip.name, error);
            throw error;
        }
    }

    async processVideo(clip, fileName) {
        try {
            let videoUrl = clip.media.url;
            
            // Handle relative paths
            if (videoUrl.startsWith('./vid/')) {
                // Convert relative path to absolute URL
                videoUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/') + videoUrl.substring(2);
            }
            
            // Fetch video file
            const response = await fetch(videoUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch video: ${response.status} ${response.statusText}`);
            }
            
            const videoBlob = await response.blob();
            const arrayBuffer = await videoBlob.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            
            // Write to virtual filesystem
            const ext = this.getFileExtension(clip.media.name) || 'mp4';
            this.ffmpeg.FS('writeFile', `/input/${fileName}.${ext}`, uint8Array);
            
            // If clip has specific start/end times, create trimmed version
            if (clip.startTime > 0 || clip.duration < clip.media.duration) {
                await this.trimVideo(`/input/${fileName}.${ext}`, clip.startTime, clip.duration, fileName);
            }
            
        } catch (error) {
            console.error('Failed to process video:', clip.name, error);
            throw error;
        }
    }

    async processAudio(clip, fileName) {
        try {
            let audioData;
            
            if (clip.media?.url.startsWith('blob:')) {
                // Convert blob URL to binary
                const response = await fetch(clip.media.url);
                const blob = await response.blob();
                const arrayBuffer = await blob.arrayBuffer();
                audioData = new Uint8Array(arrayBuffer);
            } else if (clip.media?.url.startsWith('data:')) {
                // Convert data URL to binary
                const base64Data = clip.media.url.split(',')[1];
                const binaryString = atob(base64Data);
                audioData = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    audioData[i] = binaryString.charCodeAt(i);
                }
            } else {
                // Try to fetch from URL
                const response = await fetch(clip.media.url);
                const blob = await response.blob();
                const arrayBuffer = await blob.arrayBuffer();
                audioData = new Uint8Array(arrayBuffer);
            }
            
            // Write to virtual filesystem
            const ext = this.getFileExtension(clip.media.name) || 'mp3';
            this.ffmpeg.FS('writeFile', `/audio/${fileName}.${ext}`, audioData);
            
        } catch (error) {
            console.error('Failed to process audio:', clip.name, error);
            throw error;
        }
    }

    async createVideoFromImage(imagePath, duration, outputName) {
        // Create video from image using FFmpeg
        await this.ffmpeg.run(
            '-loop', '1',
            '-i', imagePath,
            '-c:v', 'libx264',
            '-t', duration.toString(),
            '-pix_fmt', 'yuv420p',
            '-vf', 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2',
            `/temp/${outputName}.mp4`
        );
    }

    async trimVideo(videoPath, startTime, duration, outputName) {
        // Trim video to specific segment
        await this.ffmpeg.run(
            '-i', videoPath,
            '-ss', startTime.toString(),
            '-t', duration.toString(),
            '-c', 'copy',
            `/temp/${outputName}_trimmed.mp4`
        );
    }

    buildFFmpegCommand(projectData) {
        const clips = projectData.clips;
        const settings = projectData.settings;
        
        // Sort clips by start time
        clips.sort((a, b) => a.startTime - b.startTime);
        
        // Build filter complex for concatenation
        let inputFiles = [];
        let filterComplex = '';
        let videoInputs = [];
        let audioInputs = [];
        
        // Process video/image clips
        clips.forEach((clip, index) => {
            if (clip.type === 'video' || clip.type === 'image') {
                const fileName = `${clip.id || index}_${clip.media?.name.replace(/[^a-z0-9]/gi, '_')}`;
                const ext = clip.type === 'video' ? 
                    (this.getFileExtension(clip.media.name) || 'mp4') : 'mp4';
                
                const inputPath = clip.startTime > 0 || clip.duration < clip.media.duration ?
                    `/temp/${fileName}_trimmed.mp4` :
                    (clip.type === 'image' ? `/temp/${fileName}.mp4` : `/input/${fileName}.${ext}`);
                
                videoInputs.push(`-i ${inputPath}`);
                
                if (filterComplex) filterComplex += ';';
                filterComplex += `[${index}:v]`;
                
                // Add fade in/out effects if specified
                if (clip.effects?.fadeIn) {
                    filterComplex += `fade=in:st=0:d=${clip.effects.fadeIn},`;
                }
                if (clip.effects?.fadeOut) {
                    filterComplex += `fade=out:st=${clip.duration - clip.effects.fadeOut}:d=${clip.effects.fadeOut},`;
                }
                
                filterComplex += `setpts=PTS-STARTPTS[v${index}]`;
            }
        });
        
        // Add audio inputs
        clips.forEach((clip, index) => {
            if (clip.type === 'audio') {
                const fileName = `${clip.id || index}_${clip.media?.name.replace(/[^a-z0-9]/gi, '_')}`;
                const ext = this.getFileExtension(clip.media.name) || 'mp3';
                
                audioInputs.push(`-i /audio/${fileName}.${ext}`);
                
                if (filterComplex) filterComplex += ';';
                filterComplex += `[${videoInputs.length + index}:a]adelay=${clip.startTime * 1000}|${clip.startTime * 1000}[a${index}]`;
            }
        });
        
        // Concatenate video streams
        let concatFilter = '';
        videoInputs.forEach((_, index) => {
            concatFilter += `[v${index}]`;
        });
        concatFilter += `concat=n=${videoInputs.length}:v=1:a=0[outv]`;
        
        if (filterComplex && concatFilter) {
            filterComplex += ';' + concatFilter;
        } else if (concatFilter) {
            filterComplex = concatFilter;
        }
        
        // Mix audio streams
        let audioMixFilter = '';
        audioInputs.forEach((_, index) => {
            if (audioMixFilter) audioMixFilter += ';';
            audioMixFilter += `[a${index}]`;
        });
        
        if (audioInputs.length > 0) {
            audioMixFilter += `amix=inputs=${audioInputs.length}:duration=longest[outa]`;
            if (filterComplex) {
                filterComplex += ';' + audioMixFilter;
            } else {
                filterComplex = audioMixFilter;
            }
        }
        
        // Build final command
        const command = [
            ...videoInputs.flatMap(v => v.split(' ')),
            ...audioInputs.flatMap(a => a.split(' ')),
            '-filter_complex', filterComplex,
            '-map', '[outv]'
        ];
        
        if (audioInputs.length > 0) {
            command.push('-map', '[outa]');
        }
        
        command.push(
            '-c:v', 'libx264',
            '-preset', 'medium',
            '-crf', '23',
            '-c:a', 'aac',
            '-b:a', '128k',
            '-shortest',
            '/output/output.mp4'
        );
        
        return command;
    }

    async executeFFmpeg(command, modal, projectName) {
        return new Promise((resolve, reject) => {
            // Set up progress tracking
            let lastProgress = 0;
            
            const progressInterval = setInterval(() => {
                // Update progress (FFmpeg doesn't have built-in progress in wasm version)
                // We'll simulate progress based on time
                lastProgress = Math.min(lastProgress + 2, 98);
                modal.update({
                    progress: lastProgress,
                    status: 'Encoding video...',
                    timeRemaining: `${Math.round((100 - lastProgress) / 2)}s`
                });
            }, 1000);
            
            // Execute FFmpeg
            this.ffmpeg.run(...command)
                .then(async () => {
                    clearInterval(progressInterval);
                    
                    // Read output file
                    const data = this.ffmpeg.FS('readFile', '/output/output.mp4');
                    
                    // Create blob
                    const blob = new Blob([data.buffer], { type: 'video/mp4' });
                    const url = URL.createObjectURL(blob);
                    
                    modal.update({
                        progress: 100,
                        status: 'Render complete!',
                        downloadUrl: url
                    });
                    
                    // Clean up virtual filesystem
                    this.cleanupVirtualFS();
                    
                    resolve({
                        blob: blob,
                        url: url,
                        fileName: `${projectName.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.mp4`
                    });
                })
                .catch(error => {
                    clearInterval(progressInterval);
                    reject(error);
                });
        });
    }

    cleanupVirtualFS() {
        try {
            // Clean up temporary files
            ['/input', '/output', '/audio', '/temp'].forEach(dir => {
                try {
                    const files = this.ffmpeg.FS('readdir', dir);
                    files.forEach(file => {
                        if (file !== '.' && file !== '..') {
                            this.ffmpeg.FS('unlink', `${dir}/${file}`);
                        }
                    });
                    this.ffmpeg.FS('rmdir', dir);
                } catch (e) {
                    // Directory might not exist
                }
            });
        } catch (error) {
            console.warn('Error cleaning up virtual FS:', error);
        }
    }

    // Utility methods
    async fetchDataURL(url) {
        const response = await fetch(url);
        const blob = await response.blob();
        return await this.blobToDataURL(blob);
    }

    blobToDataURL(blob) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        });
    }

    getFileExtension(filename) {
        return filename.split('.').pop().toLowerCase();
    }

    showRenderModal() {
        // Same modal implementation as before
        const modal = document.createElement('div');
        modal.className = 'render-modal';
        modal.innerHTML = `
            <div class="render-modal-content">
                <div class="render-header">
                    <h3>🎬 Rendering Video with FFmpeg</h3>
                    <button class="close-render-btn">×</button>
                </div>
                <div class="render-body">
                    <div class="render-progress">
                        <div class="progress-bar">
                            <div class="progress-fill"></div>
                        </div>
                        <div class="progress-text">0%</div>
                    </div>
                    <div class="render-status">Initializing FFmpeg...</div>
                    <div class="render-details">
                        <div class="render-time">Time remaining: --:--</div>
                        <div class="render-frames">Processing files...</div>
                    </div>
                </div>
                <div class="render-footer">
                    <button class="cancel-render-btn">Cancel</button>
                    <button class="download-render-btn" disabled>Download MP4</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const update = (data = {}) => {
            const progress = data.progress || 0;
            const status = data.status || '';
            const timeRemaining = data.timeRemaining || '--:--';
            
            modal.querySelector('.progress-fill').style.width = `${progress}%`;
            modal.querySelector('.progress-text').textContent = `${Math.round(progress)}%`;
            modal.querySelector('.render-status').textContent = status;
            modal.querySelector('.render-time').textContent = `Time remaining: ${timeRemaining}`;
            
            if (data.downloadUrl) {
                const downloadBtn = modal.querySelector('.download-render-btn');
                downloadBtn.disabled = false;
                downloadBtn.onclick = () => {
                    const a = document.createElement('a');
                    a.href = data.downloadUrl;
                    a.download = data.fileName || 'render.mp4';
                    a.click();
                    setTimeout(() => modal.remove(), 1000);
                };
            }
            
            if (data.error) {
                modal.querySelector('.render-status').textContent = `Error: ${data.error}`;
                modal.querySelector('.render-status').style.color = '#e94560';
            }
        };
        
        // Close button
        modal.querySelector('.close-render-btn').onclick = () => modal.remove();
        modal.querySelector('.cancel-render-btn').onclick = () => {
            modal.querySelector('.render-status').textContent = 'Render cancelled';
            setTimeout(() => modal.remove(), 2000);
        };
        
        return { update, element: modal };
    }
}

export default FFmpegRenderer;