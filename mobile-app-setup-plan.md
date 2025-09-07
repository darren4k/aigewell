# SafeAging Mobile App Setup Plan

## Current Status: Web-Only Platform
The SafeAging platform is currently a web-based application built with:
- **Frontend**: Vite + vanilla JavaScript
- **Backend**: Hono + Cloudflare Workers
- **Deployment**: Cloudflare Pages
- **Database**: D1 (SQLite)

## Required: Mobile App Packaging Implementation

### Recommended Approach: Capacitor
**Why Capacitor**:
- Native performance with web technologies
- Excellent healthcare app support
- Strong plugin ecosystem for medical devices
- Apple App Store and Google Play compliance
- HIPAA-friendly architecture

### Implementation Steps

#### 1. Install Capacitor
```bash
npm install @capacitor/core @capacitor/cli
npm install @capacitor/ios @capacitor/android
npx cap init SafeAging com.safeaging.app
```

#### 2. Configure for Healthcare App Requirements
```json
// capacitor.config.json
{
  "appId": "com.safeaging.app",
  "appName": "SafeAging Home",
  "webDir": "dist",
  "plugins": {
    "StatusBar": {
      "style": "LIGHT_CONTENT",
      "backgroundColor": "#667eea"
    },
    "SplashScreen": {
      "launchShowDuration": 2000,
      "backgroundColor": "#667eea",
      "showSpinner": false
    },
    "Keyboard": {
      "resize": "body"
    },
    "Camera": {
      "permissions": ["camera"]
    },
    "Device": {
      "permissions": ["device-info"]
    }
  },
  "ios": {
    "scheme": "SafeAging"
  },
  "android": {
    "allowMixedContent": true,
    "captureInput": true
  }
}
```

#### 3. Add Required Healthcare Plugins
```bash
# Core mobile functionality
npm install @capacitor/camera
npm install @capacitor/filesystem
npm install @capacitor/storage
npm install @capacitor/network
npm install @capacitor/app

# Healthcare-specific
npm install @capacitor/push-notifications
npm install @capacitor/local-notifications
npm install @capacitor/status-bar
npm install @capacitor/splash-screen
```

#### 4. Create Platform Projects
```bash
npx cap add ios
npx cap add android
```

### Mobile-Specific Code Modifications Required

#### A. Add Mobile-Responsive CSS
```css
/* Add to existing CSS */
@media (max-width: 768px) {
  .clinical-assessment-wizard {
    padding: 10px;
    font-size: 16px; /* Prevent zoom on iOS */
  }
  
  .touch-target {
    min-height: 44px;
    min-width: 44px;
  }
}

/* Safe area handling for notched devices */
.app-container {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}
```

#### B. Mobile Platform Detection
```javascript
// Add to app.js
import { Capacitor } from '@capacitor/core';

const isMobile = Capacitor.isNativePlatform();
const platform = Capacitor.getPlatform(); // 'ios' or 'android'

if (isMobile) {
  // Enable mobile-specific features
  enableOfflineSync();
  registerPushNotifications();
}
```

#### C. Camera Integration for Room Photos
```javascript
import { Camera, CameraResultType } from '@capacitor/camera';

async function takePicture() {
  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.DataUrl
    });
    
    // Use the image for room analysis
    return image.dataUrl;
  } catch (error) {
    console.error('Camera error:', error);
  }
}
```

### Timeline Estimate
- **Setup & Configuration**: 2-3 days
- **Mobile UI Adaptations**: 3-4 days  
- **iOS Build & Testing**: 2-3 days
- **Android Build & Testing**: 2-3 days
- **App Store Assets**: 1-2 days
- **Total**: 10-15 days

### Next Steps
1. Implement Capacitor integration
2. Create iOS and Android projects
3. Test on physical devices
4. Prepare app store assets and listings