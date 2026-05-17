export class TextProcessor {
    detectLanguage(text) {
        const ethiopicChars = /[ሀ-ፕ]/;
        const latinChars = /[a-zA-Z]/;
        
        const hasEthiopic = ethiopicChars.test(text);
        const hasLatin = latinChars.test(text);
        
        if (hasEthiopic && hasLatin) return 'amh+eng';
        if (hasEthiopic) return 'amh';
        if (hasLatin) return 'eng';
        return 'unknown';
    }

    extractTopics(text) {
        const words = text.split(/\s+/);
        const wordFreq = {};
        
        words.forEach(word => {
            const cleanWord = word.replace(/[^\wሀ-ፕ]/g, '');
            const minLength = /[ሀ-ፕ]/.test(cleanWord) ? 2 : 4;
            if (cleanWord.length >= minLength && !this.isCommonWord(cleanWord)) {
                wordFreq[cleanWord] = (wordFreq[cleanWord] || 0) + 1;
            }
        });
        
        return Object.entries(wordFreq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([word]) => word);
    }

    extractKeywords(text) {
        const words = text.toLowerCase().split(/\s+/);
        const wordFreq = {};
        
        words.forEach(word => {
            const cleanWord = word.replace(/[^\wሀ-ፕ]/g, '');
            const minLength = /[ሀ-ፕ]/.test(cleanWord) ? 2 : 3;
            if (cleanWord.length >= minLength) {
                wordFreq[cleanWord] = (wordFreq[cleanWord] || 0) + 1;
            }
        });
        
        const maxFreq = Math.max(...Object.values(wordFreq));
        
        return Object.entries(wordFreq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([term, count]) => ({
                term,
                score: count / maxFreq
            }));
    }

    isCommonWord(word) {
        const commonWords = [
            'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'your', 
            'have', 'with', 'this', 'that', 'from', 'የ', 'አ', 'በ', 'እ', 'ወ', 'ከ', 'ለ', 'ማ', 'ነ', 'ስ'
        ];
        return commonWords.includes(word.toLowerCase());
    }
}