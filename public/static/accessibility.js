// SafeAging Accessibility Module
// Implements WCAG 2.1 AA compliance features

class AccessibilityManager {
    constructor() {
        this.fontSize = 'medium';
        this.highContrast = false;
        this.voiceEnabled = false;
        this.init();
    }

    init() {
        this.addAccessibilityControls();
        this.setupKeyboardNavigation();
        this.setupScreenReaderSupport();
        this.setupVoiceGuidance();
        this.addSkipLinks();
    }

    addAccessibilityControls() {
        // Create accessibility toolbar
        const toolbar = document.createElement('div');
        toolbar.id = 'accessibility-toolbar';
        toolbar.className = 'fixed top-0 right-0 z-50 bg-white border-l border-b border-gray-300 p-2 flex flex-col space-y-2';
        toolbar.innerHTML = `
            <button id="toggle-font-size" class="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700" title="Increase font size">
                <i class="fas fa-font"></i> Aa
            </button>
            <button id="toggle-contrast" class="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700" title="High contrast mode">
                <i class="fas fa-adjust"></i>
            </button>
            <button id="toggle-voice" class="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700" title="Voice guidance">
                <i class="fas fa-volume-up"></i>
            </button>
            <button id="screen-reader-help" class="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700" title="Screen reader help">
                <i class="fas fa-question"></i>
            </button>
        `;
        
        document.body.appendChild(toolbar);

        // Event listeners
        document.getElementById('toggle-font-size').addEventListener('click', () => this.toggleFontSize());
        document.getElementById('toggle-contrast').addEventListener('click', () => this.toggleHighContrast());
        document.getElementById('toggle-voice').addEventListener('click', () => this.toggleVoiceGuidance());
        document.getElementById('screen-reader-help').addEventListener('click', () => this.showScreenReaderHelp());
    }

    toggleFontSize() {
        const sizes = ['small', 'medium', 'large', 'x-large'];
        const currentIndex = sizes.indexOf(this.fontSize);
        this.fontSize = sizes[(currentIndex + 1) % sizes.length];
        
        document.documentElement.style.fontSize = {
            'small': '14px',
            'medium': '16px',
            'large': '18px',
            'x-large': '22px'
        }[this.fontSize];

        this.announceToScreenReader(`Font size changed to ${this.fontSize}`);
    }

    toggleHighContrast() {
        this.highContrast = !this.highContrast;
        
        if (this.highContrast) {
            document.body.classList.add('high-contrast');
            this.addHighContrastStyles();
        } else {
            document.body.classList.remove('high-contrast');
            this.removeHighContrastStyles();
        }

        this.announceToScreenReader(`High contrast mode ${this.highContrast ? 'enabled' : 'disabled'}`);
    }

    addHighContrastStyles() {
        const style = document.createElement('style');
        style.id = 'high-contrast-styles';
        style.textContent = `
            .high-contrast {
                background: #000000 !important;
                color: #ffffff !important;
            }
            .high-contrast * {
                background-color: #000000 !important;
                color: #ffffff !important;
                border-color: #ffffff !important;
            }
            .high-contrast .bg-blue-600,
            .high-contrast .bg-blue-500,
            .high-contrast .bg-green-600,
            .high-contrast .bg-green-500 {
                background-color: #ffffff !important;
                color: #000000 !important;
            }
            .high-contrast .text-gray-600,
            .high-contrast .text-gray-500 {
                color: #cccccc !important;
            }
        `;
        document.head.appendChild(style);
    }

    removeHighContrastStyles() {
        const style = document.getElementById('high-contrast-styles');
        if (style) style.remove();
    }

    toggleVoiceGuidance() {
        this.voiceEnabled = !this.voiceEnabled;
        
        if (this.voiceEnabled) {
            this.speak('Voice guidance enabled. I will help you navigate the SafeAging application.');
            this.setupVoiceNavigation();
        } else {
            this.speak('Voice guidance disabled.');
        }
    }

    speak(text) {
        if (!this.voiceEnabled || !window.speechSynthesis) return;
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.8;
        utterance.pitch = 1;
        utterance.volume = 0.8;
        window.speechSynthesis.speak(utterance);
    }

    setupVoiceNavigation() {
        // Add voice announcements for key interactions
        document.addEventListener('click', (e) => {
            if (!this.voiceEnabled) return;
            
            const target = e.target.closest('button, a, [role="button"]');
            if (target) {
                const text = target.textContent.trim() || target.getAttribute('title') || target.getAttribute('aria-label');
                if (text) this.speak(text);
            }
        });

        document.addEventListener('focus', (e) => {
            if (!this.voiceEnabled) return;
            
            const element = e.target;
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                const label = element.getAttribute('placeholder') || element.previousElementSibling?.textContent || 'Input field';
                this.speak(label);
            }
        });
    }

    setupKeyboardNavigation() {
        // Add keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Alt + A = Accessibility menu
            if (e.altKey && e.key === 'a') {
                e.preventDefault();
                document.getElementById('accessibility-toolbar').focus();
            }
            
            // Alt + 1-5 = Navigate to main sections
            if (e.altKey && e.key >= '1' && e.key <= '5') {
                e.preventDefault();
                this.navigateToSection(parseInt(e.key) - 1);
            }

            // Alt + H = Home/Dashboard
            if (e.altKey && e.key === 'h') {
                e.preventDefault();
                if (typeof showView === 'function') showView('dashboard');
            }

            // Escape = Close modals
            if (e.key === 'Escape') {
                const modals = document.querySelectorAll('.fixed[class*="z-50"]:not(.hidden)');
                modals.forEach(modal => {
                    const closeBtn = modal.querySelector('button[onclick*="close"], button[onclick*="Close"]');
                    if (closeBtn) closeBtn.click();
                });
            }
        });

        // Ensure all interactive elements are focusable
        this.makeFocusable();
    }

    makeFocusable() {
        const interactiveElements = document.querySelectorAll('div[onclick], span[onclick]');
        interactiveElements.forEach(el => {
            if (!el.getAttribute('tabindex')) {
                el.setAttribute('tabindex', '0');
                el.setAttribute('role', 'button');
            }
        });
    }

    navigateToSection(index) {
        const navButtons = document.querySelectorAll('.nav-btn');
        if (navButtons[index]) {
            navButtons[index].click();
            navButtons[index].focus();
            
            if (this.voiceEnabled) {
                this.speak(`Navigated to ${navButtons[index].textContent}`);
            }
        }
    }

    setupScreenReaderSupport() {
        // Add ARIA labels and live regions
        this.addAriaLabels();
        this.setupLiveRegions();
    }

    addAriaLabels() {
        // Add labels to common elements
        const nav = document.querySelector('.bg-white.shadow-sm.border-b');
        if (nav) nav.setAttribute('aria-label', 'Main navigation');

        const buttons = document.querySelectorAll('button:not([aria-label]):not([title])');
        buttons.forEach(btn => {
            const text = btn.textContent.trim();
            if (text) btn.setAttribute('aria-label', text);
        });

        // Add landmarks
        const main = document.getElementById('mainContent');
        if (main) main.setAttribute('role', 'main');

        const header = document.querySelector('.gradient-bg');
        if (header) header.setAttribute('role', 'banner');
    }

    setupLiveRegions() {
        // Create live region for announcements
        const liveRegion = document.createElement('div');
        liveRegion.id = 'aria-live-region';
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.style.cssText = 'position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden;';
        document.body.appendChild(liveRegion);
    }

    announceToScreenReader(message) {
        const liveRegion = document.getElementById('aria-live-region');
        if (liveRegion) {
            liveRegion.textContent = message;
            // Clear after announcement
            setTimeout(() => liveRegion.textContent = '', 1000);
        }
    }

    addSkipLinks() {
        const skipLinks = document.createElement('div');
        skipLinks.innerHTML = `
            <a href="#mainContent" class="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 bg-blue-600 text-white p-2 z-50">
                Skip to main content
            </a>
            <a href="#navigation" class="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-24 bg-blue-600 text-white p-2 z-50">
                Skip to navigation
            </a>
        `;
        document.body.insertBefore(skipLinks, document.body.firstChild);
    }

    showScreenReaderHelp() {
        const helpText = `
            SafeAging Accessibility Help:
            
            Keyboard Shortcuts:
            - Alt + A: Access accessibility menu
            - Alt + 1-5: Navigate to main sections
            - Alt + H: Go to home/dashboard
            - Escape: Close modals
            - Tab: Navigate between elements
            - Enter/Space: Activate buttons and links
            
            Screen Reader Features:
            - All images have alternative text
            - Form fields are properly labeled
            - Navigation landmarks are defined
            - Live regions announce updates
            
            Voice Guidance:
            - Click the voice button to enable spoken navigation
            - Buttons and links will be read aloud when clicked
            - Form fields will be announced when focused
        `;
        
        alert(helpText);
        this.announceToScreenReader('Screen reader help displayed');
    }
}

// Add CSS for screen reader only content
const srStyles = document.createElement('style');
srStyles.textContent = `
    .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
    }
    .focus\\:not-sr-only:focus {
        position: static;
        width: auto;
        height: auto;
        padding: 0.5rem;
        margin: 0;
        overflow: visible;
        clip: auto;
        white-space: normal;
    }
`;
document.head.appendChild(srStyles);

// Initialize accessibility features when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new AccessibilityManager();
});

// Export for global access
window.AccessibilityManager = AccessibilityManager;