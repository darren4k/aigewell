// SafeAging Accessibility Module
// Implements WCAG 2.1 AA compliance features

class AccessibilityManager {
    constructor() {
        this.fontSize = localStorage.getItem('fontSize') || 'normal';
        this.highContrast = localStorage.getItem('highContrast') === 'true';
        this.voiceEnabled = localStorage.getItem('voiceEnabled') === 'true';
        this.keyboardNav = true;
        this.synth = window.speechSynthesis;
        this.initializeAccessibility();
    }

    initializeAccessibility() {
        // Apply saved preferences
        this.applyFontSize();
        this.applyHighContrast();
        
        // Set up keyboard navigation
        this.setupKeyboardNavigation();
        
        // Add skip links
        this.addSkipLinks();
        
        // Initialize voice guidance if enabled
        if (this.voiceEnabled) {
            this.initVoiceGuidance();
        }
        
        // Add accessibility toolbar
        this.createAccessibilityToolbar();
        
        // Set up ARIA live regions
        this.setupAriaRegions();
    }

    createAccessibilityToolbar() {
        const toolbar = document.createElement('div');
        toolbar.id = 'accessibilityToolbar';
        toolbar.className = 'fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 z-50';
        toolbar.setAttribute('role', 'toolbar');
        toolbar.setAttribute('aria-label', 'Accessibility controls');
        
        toolbar.innerHTML = `
            <button 
                onclick="accessibility.toggleToolbar()" 
                class="bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center mb-2"
                aria-label="Toggle accessibility menu"
                id="a11yToggle">
                <i class="fas fa-universal-access text-xl"></i>
            </button>
            
            <div id="a11yControls" class="hidden space-y-2">
                <!-- Font Size Controls -->
                <div class="flex items-center space-x-2">
                    <button 
                        onclick="accessibility.decreaseFontSize()" 
                        class="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                        aria-label="Decrease font size">
                        A-
                    </button>
                    <span class="text-sm" aria-live="polite">Font</span>
                    <button 
                        onclick="accessibility.increaseFontSize()" 
                        class="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                        aria-label="Increase font size">
                        A+
                    </button>
                </div>
                
                <!-- High Contrast -->
                <button 
                    onclick="accessibility.toggleHighContrast()" 
                    class="w-full px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
                    aria-pressed="${this.highContrast}">
                    <i class="fas fa-adjust mr-1"></i> High Contrast
                </button>
                
                <!-- Voice Guidance -->
                <button 
                    onclick="accessibility.toggleVoice()" 
                    class="w-full px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
                    aria-pressed="${this.voiceEnabled}">
                    <i class="fas fa-volume-up mr-1"></i> Voice Guide
                </button>
                
                <!-- Keyboard Help -->
                <button 
                    onclick="accessibility.showKeyboardHelp()" 
                    class="w-full px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm">
                    <i class="fas fa-keyboard mr-1"></i> Keyboard Help
                </button>
            </div>
        `;
        
        document.body.appendChild(toolbar);
    }

    toggleToolbar() {
        const controls = document.getElementById('a11yControls');
        controls.classList.toggle('hidden');
        this.announce(controls.classList.contains('hidden') ? 
            'Accessibility menu closed' : 'Accessibility menu opened');
    }

    // Font Size Management
    increaseFontSize() {
        const sizes = ['small', 'normal', 'large', 'x-large'];
        const currentIndex = sizes.indexOf(this.fontSize);
        if (currentIndex < sizes.length - 1) {
            this.fontSize = sizes[currentIndex + 1];
            this.applyFontSize();
            this.announce(`Font size increased to ${this.fontSize}`);
        }
    }

    decreaseFontSize() {
        const sizes = ['small', 'normal', 'large', 'x-large'];
        const currentIndex = sizes.indexOf(this.fontSize);
        if (currentIndex > 0) {
            this.fontSize = sizes[currentIndex - 1];
            this.applyFontSize();
            this.announce(`Font size decreased to ${this.fontSize}`);
        }
    }

    applyFontSize() {
        const root = document.documentElement;
        const sizes = {
            'small': '14px',
            'normal': '16px',
            'large': '20px',
            'x-large': '24px'
        };
        root.style.fontSize = sizes[this.fontSize];
        localStorage.setItem('fontSize', this.fontSize);
    }

    // High Contrast Mode
    toggleHighContrast() {
        this.highContrast = !this.highContrast;
        this.applyHighContrast();
        this.announce(this.highContrast ? 
            'High contrast mode enabled' : 'High contrast mode disabled');
    }

    applyHighContrast() {
        if (this.highContrast) {
            document.body.classList.add('high-contrast');
            this.addHighContrastStyles();
        } else {
            document.body.classList.remove('high-contrast');
        }
        localStorage.setItem('highContrast', this.highContrast);
    }

    addHighContrastStyles() {
        if (!document.getElementById('highContrastStyles')) {
            const style = document.createElement('style');
            style.id = 'highContrastStyles';
            style.textContent = `
                .high-contrast {
                    filter: contrast(1.2);
                }
                .high-contrast * {
                    border-color: #000 !important;
                }
                .high-contrast button {
                    border: 2px solid #000 !important;
                }
                .high-contrast a {
                    text-decoration: underline !important;
                    font-weight: bold !important;
                }
                .high-contrast .text-gray-600,
                .high-contrast .text-gray-500 {
                    color: #000 !important;
                }
            `;
            document.head.appendChild(style);
        }
    }

    // Voice Guidance
    toggleVoice() {
        this.voiceEnabled = !this.voiceEnabled;
        localStorage.setItem('voiceEnabled', this.voiceEnabled);
        
        if (this.voiceEnabled) {
            this.initVoiceGuidance();
            this.speak('Voice guidance enabled. I will help you navigate the application.');
        } else {
            this.speak('Voice guidance disabled');
            setTimeout(() => this.synth.cancel(), 2000);
        }
    }

    initVoiceGuidance() {
        // Add voice announcements to interactive elements
        document.addEventListener('focus', (e) => {
            if (!this.voiceEnabled) return;
            
            const target = e.target;
            if (target.tagName === 'BUTTON' || target.tagName === 'A') {
                const label = target.getAttribute('aria-label') || 
                             target.textContent || 
                             'Interactive element';
                this.speak(label);
            } else if (target.tagName === 'INPUT') {
                const label = target.getAttribute('aria-label') || 
                             target.getAttribute('placeholder') || 
                             'Input field';
                this.speak(label);
            }
        }, true);
    }

    speak(text) {
        if (!this.voiceEnabled || !this.synth) return;
        
        this.synth.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        this.synth.speak(utterance);
    }

    announce(text) {
        // Update ARIA live region
        const liveRegion = document.getElementById('ariaLive');
        if (liveRegion) {
            liveRegion.textContent = text;
        }
        
        // Also speak if voice is enabled
        if (this.voiceEnabled) {
            this.speak(text);
        }
    }

    // Keyboard Navigation
    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            // Alt + A: Toggle accessibility menu
            if (e.altKey && e.key === 'a') {
                e.preventDefault();
                this.toggleToolbar();
            }
            
            // Alt + 1-5: Quick navigation
            if (e.altKey) {
                switch(e.key) {
                    case '1':
                        e.preventDefault();
                        this.navigateTo('dashboard');
                        break;
                    case '2':
                        e.preventDefault();
                        this.navigateTo('assess');
                        break;
                    case '3':
                        e.preventDefault();
                        this.navigateTo('plans');
                        break;
                    case '4':
                        e.preventDefault();
                        this.navigateTo('equipment');
                        break;
                    case '5':
                        e.preventDefault();
                        this.navigateTo('ptot');
                        break;
                }
            }
            
            // Tab navigation enhancement
            if (e.key === 'Tab') {
                const focusable = document.querySelectorAll(
                    'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                if (focusable.length > 0) {
                    // Add visual focus indicator
                    focusable.forEach(el => {
                        el.classList.add('focus-visible');
                    });
                }
            }
        });
    }

    navigateTo(view) {
        if (typeof showView === 'function') {
            showView(view);
            this.announce(`Navigated to ${view}`);
        }
    }

    // Skip Links
    addSkipLinks() {
        const skipNav = document.createElement('div');
        skipNav.className = 'sr-only focus-within:not-sr-only';
        skipNav.innerHTML = `
            <a href="#mainContent" 
               class="absolute top-0 left-0 bg-blue-600 text-white p-2 z-50 focus:not-sr-only">
                Skip to main content
            </a>
        `;
        document.body.insertBefore(skipNav, document.body.firstChild);
    }

    // ARIA Live Regions
    setupAriaRegions() {
        // Create main live region for announcements
        const liveRegion = document.createElement('div');
        liveRegion.id = 'ariaLive';
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.className = 'sr-only';
        document.body.appendChild(liveRegion);
        
        // Create alert region for urgent messages
        const alertRegion = document.createElement('div');
        alertRegion.id = 'ariaAlert';
        alertRegion.setAttribute('role', 'alert');
        alertRegion.setAttribute('aria-live', 'assertive');
        alertRegion.className = 'sr-only';
        document.body.appendChild(alertRegion);
    }

    // Keyboard Help Dialog
    showKeyboardHelp() {
        const helpDialog = document.createElement('div');
        helpDialog.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        helpDialog.setAttribute('role', 'dialog');
        helpDialog.setAttribute('aria-labelledby', 'keyboardHelpTitle');
        
        helpDialog.innerHTML = `
            <div class="bg-white rounded-lg p-6 max-w-md">
                <h2 id="keyboardHelpTitle" class="text-xl font-bold mb-4">Keyboard Shortcuts</h2>
                <dl class="space-y-2 text-sm">
                    <dt class="font-semibold">Alt + A</dt>
                    <dd class="ml-4 text-gray-600">Toggle accessibility menu</dd>
                    
                    <dt class="font-semibold">Alt + 1-5</dt>
                    <dd class="ml-4 text-gray-600">Navigate to main sections</dd>
                    
                    <dt class="font-semibold">Tab</dt>
                    <dd class="ml-4 text-gray-600">Move focus forward</dd>
                    
                    <dt class="font-semibold">Shift + Tab</dt>
                    <dd class="ml-4 text-gray-600">Move focus backward</dd>
                    
                    <dt class="font-semibold">Enter/Space</dt>
                    <dd class="ml-4 text-gray-600">Activate buttons and links</dd>
                    
                    <dt class="font-semibold">Escape</dt>
                    <dd class="ml-4 text-gray-600">Close dialogs and menus</dd>
                </dl>
                <button 
                    onclick="this.closest('.fixed').remove()" 
                    class="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                    Close
                </button>
            </div>
        `;
        
        document.body.appendChild(helpDialog);
        helpDialog.querySelector('button').focus();
        
        // Close on Escape
        helpDialog.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                helpDialog.remove();
            }
        });
    }

    // Form Validation Announcements
    announceFormError(fieldName, errorMessage) {
        const alertRegion = document.getElementById('ariaAlert');
        if (alertRegion) {
            alertRegion.textContent = `Error in ${fieldName}: ${errorMessage}`;
        }
        this.speak(`Error in ${fieldName}: ${errorMessage}`);
    }

    announceFormSuccess(message) {
        this.announce(message);
    }
}

// Initialize accessibility on page load
const accessibility = new AccessibilityManager();

// Add screen reader only styles
const srStyles = document.createElement('style');
srStyles.textContent = `
    .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0,0,0,0);
        white-space: nowrap;
        border: 0;
    }
    
    .focus-visible:focus {
        outline: 3px solid #4f46e5;
        outline-offset: 2px;
    }
    
    .not-sr-only:focus {
        position: static;
        width: auto;
        height: auto;
        padding: inherit;
        margin: inherit;
        overflow: visible;
        clip: auto;
        white-space: normal;
    }
`;
document.head.appendChild(srStyles);