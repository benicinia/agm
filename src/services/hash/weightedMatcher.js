// image-hashes.js
class ImageHasher {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
    }

    // Resize image to standard size
    async resizeImage(img, size = 64) {
        this.canvas.width = size;
        this.canvas.height = size;
        this.ctx.drawImage(img, 0, 0, size, size);
        return this.ctx.getImageData(0, 0, size, size);
    }

    // Convert ImageData to grayscale
    toGrayscale(imageData) {
        const data = imageData.data;
        const gray = new Uint8Array(imageData.width * imageData.height);
        
        for (let i = 0, j = 0; i < data.length; i += 4, j++) {
            // Standard luminance formula
            gray[j] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        }
        return gray;
    }

    // Average Hash (aHash)
    async aHash(img) {
        const imageData = await this.resizeImage(img, 8);
        const gray = this.toGrayscale(imageData);
        
        // Calculate average
        const sum = gray.reduce((acc, val) => acc + val, 0);
        const avg = sum / gray.length;
        
        // Generate hash
        let hash = '';
        for (let i = 0; i < gray.length; i++) {
            hash += gray[i] > avg ? '1' : '0';
        }
        
        return this.binaryToHex(hash);
    }

    // Difference Hash (dHash)
    async dHash(img) {
        const imageData = await this.resizeImage(img, 9); // 9x8 for 72 differences
        const gray = this.toGrayscale(imageData);
        const width = 9, height = 8;
        
        let hash = '';
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width - 1; x++) {
                const left = gray[y * width + x];
                const right = gray[y * width + x + 1];
                hash += left > right ? '1' : '0';
            }
        }
        
        return this.binaryToHex(hash);
    }

    // Perceptual Hash (pHash) - simplified DCT-based
    async pHash(img) {
        const imageData = await this.resizeImage(img, 32);
        const gray = this.toGrayscale(imageData);
        
        // Apply simple 2D DCT (simplified for browser)
        const dct = this.computeDCT(gray, 32);
        
        // Use top-left 8x8 DCT coefficients (excluding DC)
        let hash = '';
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                if (y === 0 && x === 0) continue; // Skip DC coefficient
                hash += dct[y * 8 + x] > 0 ? '1' : '0';
            }
        }
        
        return this.binaryToHex(hash);
    }

    // Wavelet Hash (wHash) - using Haar wavelet approximation
    async wHash(img) {
        const imageData = await this.resizeImage(img, 32);
        const gray = this.toGrayscale(imageData);
        
        // Simple Haar-like wavelet transform
        const wavelet = this.haarWavelet(gray, 32);
        
        // Generate hash from wavelet coefficients
        let hash = '';
        const threshold = 0;
        for (let i = 0; i < 64; i++) { // Use first 64 coefficients
            hash += wavelet[i] > threshold ? '1' : '0';
        }
        
        return this.binaryToHex(hash);
    }

    // Helper: Binary string to hex
    binaryToHex(binary) {
        let hex = '';
        for (let i = 0; i < binary.length; i += 4) {
            const chunk = binary.substr(i, 4);
            hex += parseInt(chunk, 2).toString(16);
        }
        return hex;
    }

    // Helper: Hamming distance between two hex hashes
    hammingDistance(hash1, hash2) {
        if (hash1.length !== hash2.length) return Infinity;
        
        let distance = 0;
        for (let i = 0; i < hash1.length; i++) {
            const xor = parseInt(hash1[i], 16) ^ parseInt(hash2[i], 16);
            distance += this.popcount(xor);
        }
        return distance;
    }

    // Helper: Population count (number of 1 bits)
    popcount(x) {
        x = x - ((x >> 1) & 0x55555555);
        x = (x & 0x33333333) + ((x >> 2) & 0x33333333);
        x = (x + (x >> 4)) & 0x0F0F0F0F;
        x = x + (x >> 8);
        x = x + (x >> 16);
        return x & 0x7F;
    }

    // Simplified DCT (for pHash)
    computeDCT(signal, size) {
        const dct = new Float32Array(size * size);
        const factor = Math.PI / (2 * size);
        
        for (let u = 0; u < size; u++) {
            for (let v = 0; v < size; v++) {
                let sum = 0;
                for (let x = 0; x < size; x++) {
                    for (let y = 0; y < size; y++) {
                        sum += signal[x * size + y] * 
                               Math.cos((2 * x + 1) * u * factor) * 
                               Math.cos((2 * y + 1) * v * factor);
                    }
                }
                dct[u * size + v] = sum;
            }
        }
        return dct;
    }

    // Simplified Haar wavelet (for wHash)
    haarWavelet(signal, size) {
        const result = new Float32Array(signal.length);
        result.set(signal);
        
        let step = size;
        while (step > 1) {
            const half = step / 2;
            for (let i = 0; i < half; i++) {
                const a = result[i * 2];
                const b = result[i * 2 + 1];
                result[i] = (a + b) / 2;
                result[half + i] = (a - b) / 2;
            }
            step = half;
        }
        
        return result;
    }
}