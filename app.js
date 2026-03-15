class TranslationApp {
    constructor() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }

    initialize() {
        this.initializeElements();
        this.initializeEventListeners();
        this.loadInitialTranslation();
        this.debounceTimer = null;
    }

    initializeElements() {
        this.sourceText = document.getElementById('source-text');
        this.targetText = document.getElementById('target-text');
        this.sourceLanguage = document.getElementById('source-language');
        this.targetLanguage = document.getElementById('target-language');
        this.translateBtn = document.getElementById('translate-btn');
        this.swapBtn = document.getElementById('swap-languages');
        this.loadingIndicator = document.getElementById('loading-indicator');
        this.errorMessage = document.getElementById('error-message');
        this.sourceCounter = document.getElementById('source-counter');
        this.targetCounter = document.getElementById('target-counter');

        this.speakSource = document.getElementById('speak-source');
        this.speakTarget = document.getElementById('speak-target');
        this.copySource = document.getElementById('copy-source');
        this.copyTarget = document.getElementById('copy-target');
        this.clearSource = document.getElementById('clear-source');
    }

    initializeEventListeners() {
        if (this.translateBtn) {
            this.translateBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.translate();
            });
        }

        if (this.sourceText) {
            this.sourceText.addEventListener('input', (e) => {
                this.updateCharCount(e.target.value, this.sourceCounter);
                this.debounceTranslate();
            });
        }

        if (this.sourceLanguage) {
            this.sourceLanguage.addEventListener('change', () => this.translate());
        }
        if (this.targetLanguage) {
            this.targetLanguage.addEventListener('change', () => this.translate());
        }

        if (this.swapBtn) {
            this.swapBtn.addEventListener('click', () => this.swapLanguages());
        }

        if (this.speakSource) {
            this.speakSource.addEventListener('click', () => this.speak(this.sourceText.value, this.getLanguageCode(this.sourceLanguage.value)));
        }
        if (this.speakTarget) {
            this.speakTarget.addEventListener('click', () => this.speak(this.targetText.value, this.getLanguageCode(this.targetLanguage.value)));
        }
        if (this.copySource) {
            this.copySource.addEventListener('click', () => this.copyToClipboard(this.sourceText.value, 'Source text'));
        }
        if (this.copyTarget) {
            this.copyTarget.addEventListener('click', () => this.copyToClipboard(this.targetText.value, 'Translated text'));
        }
        if (this.clearSource) {
            this.clearSource.addEventListener('click', () => this.clearSourceText());
        }
    }

    async loadInitialTranslation() {
        if (this.sourceText) {
            this.sourceText.value = 'Hello, how are you';
            this.updateCharCount(this.sourceText.value, this.sourceCounter);
            setTimeout(() => this.translate(), 100);
        }
    }

    debounceTranslate() {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => this.translate(), 500);
    }

    async translate() {
        const text = this.sourceText.value.trim();
        
        if (!text) {
            if (this.targetText) this.targetText.value = '';
            return;
        }

        this.showLoading(true);
        this.hideError();

        try {
            const sourceLang = this.sourceLanguage.value;
            const targetLang = this.targetLanguage.value;

            let langpair;
            if (sourceLang === 'auto') {
                langpair = `auto|${targetLang}`;
            } else {
                langpair = `${sourceLang}|${targetLang}`;
            }

            console.log('Translating:', { text, langpair });

            const translatedText = await this.callTranslationAPI(text, langpair);
            
            if (this.targetText) {
                this.targetText.value = translatedText;
                this.updateCharCount(translatedText, this.targetCounter);
            }
        } catch (error) {
            console.error('Translation error:', error);
            this.showError('Translation failed. Please try again.');
            if (this.targetText) {
                this.targetText.value = '';
            }
        } finally {
            this.showLoading(false);
        }
    }

    async callTranslationAPI(text, langpair) {
        const url = 'https://api.mymemory.translated.net/get';

        const params = new URLSearchParams({
            q: text,
            langpair: langpair
        });

        try {
            const response = await fetch(`${url}?${params.toString()}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('API Response:', data);

            if (data.responseStatus === 200) {
                return data.responseData.translatedText;
            } else {
                if (langpair.startsWith('auto|')) {
                    const alternativePair = `|${langpair.split('|')[1]}`;
                    console.log('Trying alternative format:', alternativePair);
                    
                    const alternativeParams = new URLSearchParams({
                        q: text,
                        langpair: alternativePair
                    });
                    
                    const alternativeResponse = await fetch(`${url}?${alternativeParams.toString()}`, {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json'
                        }
                    });
                    
                    const alternativeData = await alternativeResponse.json();
                    
                    if (alternativeData.responseStatus === 200) {
                        return alternativeData.responseData.translatedText;
                    }
                }
                throw new Error(data.responseDetails || 'Translation failed');
            }
        } catch (error) {
            console.error('API call failed:', error);
            throw error;
        }
    }

    getLanguageCode(selectValue) {
        const langMap = {
            'en': 'en-US',
            'fr': 'fr-FR',
            'auto': 'en-US'
        };
        return langMap[selectValue] || 'en-US';
    }

    swapLanguages() {
        const sourceLang = this.sourceLanguage.value;
        const targetLang = this.targetLanguage.value;
        const sourceText = this.sourceText.value;
        const targetText = this.targetText.value;

        if (sourceLang !== 'auto' && targetLang !== 'auto') {
            this.sourceLanguage.value = targetLang;
            this.targetLanguage.value = sourceLang;
            this.sourceText.value = targetText;
            this.targetText.value = sourceText;
            this.updateCharCount(this.sourceText.value, this.sourceCounter);
            this.updateCharCount(this.targetText.value, this.targetCounter);
        } else {
            this.showError('Cannot swap when language detection is enabled');
        }
    }

    speak(text, lang) {
        if (!text) {
            this.showError('No text to speak');
            return;
        }

        if (!window.speechSynthesis) {
            this.showError('Text-to-speech is not supported in your browser');
            return;
        }

        try {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = lang;
            utterance.rate = 1;
            utterance.pitch = 1;
            window.speechSynthesis.speak(utterance);
        } catch (error) {
            console.error('Speech error:', error);
            this.showError('Failed to speak text');
        }
    }

    async copyToClipboard(text, type) {
        if (!text) {
            this.showError(`No ${type} to copy`);
            return;
        }

        try {
            await navigator.clipboard.writeText(text);
            this.showTemporaryMessage(`${type} copied to clipboard!`);
        } catch (err) {
            try {
                const textarea = document.createElement('textarea');
                textarea.value = text;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                this.showTemporaryMessage(`${type} copied to clipboard!`);
            } catch (fallbackErr) {
                this.showError('Failed to copy text');
            }
        }
    }

    clearSourceText() {
        this.sourceText.value = '';
        this.targetText.value = '';
        this.updateCharCount('', this.sourceCounter);
        this.updateCharCount('', this.targetCounter);
        this.sourceText.focus();
    }

    updateCharCount(text, counterElement) {
        if (!counterElement) return;
        
        const count = text.length;
        counterElement.textContent = `${count}/500`;

        if (count > 450) {
            counterElement.style.color = '#dc3545';
        } else if (count > 400) {
            counterElement.style.color = '#ffc107';
        } else {
            counterElement.style.color = '#666';
        }
    }

    showLoading(show) {
        if (this.loadingIndicator) {
            if (show) {
                this.loadingIndicator.classList.remove('hidden');
                if (this.translateBtn) this.translateBtn.disabled = true;
            } else {
                this.loadingIndicator.classList.add('hidden');
                if (this.translateBtn) this.translateBtn.disabled = false;
            }
        }
    }

    showError(message) {
        if (this.errorMessage) {
            this.errorMessage.textContent = message;
            this.errorMessage.classList.remove('hidden');

            setTimeout(() => {
                this.hideError();
            }, 5000);
        }
    }

    hideError() {
        if (this.errorMessage) {
            this.errorMessage.classList.add('hidden');
        }
    }

    showTemporaryMessage(message) {
        if (this.errorMessage) {
            const originalText = this.errorMessage.textContent;
            const originalBg = this.errorMessage.style.background;
            const originalColor = this.errorMessage.style.color;
            
            this.errorMessage.textContent = message;
            this.errorMessage.classList.remove('hidden');
            this.errorMessage.style.background = '#d4edda';
            this.errorMessage.style.color = '#155724';
            
            setTimeout(() => {
                this.errorMessage.classList.add('hidden');
                this.errorMessage.style.background = originalBg;
                this.errorMessage.style.color = originalColor;
                this.errorMessage.textContent = originalText;
            }, 2000);
        }
    }
}

const app = new TranslationApp();