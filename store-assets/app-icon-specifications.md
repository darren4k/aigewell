# SafeAging Home - App Icon Specifications

## Design Requirements

### Visual Identity
- **Primary Color:** #667eea (Healthcare Blue)
- **Secondary Color:** #764ba2 (Trust Purple)  
- **Accent Color:** #4ecdc4 (Safety Teal)
- **Background:** Clean white or subtle gradient

### Icon Elements
1. **House Symbol:** Simple, modern home silhouette
2. **Shield/Cross:** Medical/safety protection symbol
3. **Heart:** Care and health emphasis
4. **Typography:** "SA" monogram option

### Design Principles
- **Clarity:** Recognizable at 16x16 pixels
- **Simplicity:** Clean, uncluttered design
- **Medical Authority:** Professional healthcare aesthetic
- **Accessibility:** High contrast, colorblind-friendly
- **Scalability:** Vector-based for all sizes

## iOS App Icon Sizes

### App Store and System
| Size | Usage | Pixels | File Format |
|------|-------|--------|-------------|
| 1024x1024 | App Store | 1024×1024 | PNG (no alpha) |
| 180x180 | iPhone @3x | 180×180 | PNG |
| 120x120 | iPhone @2x | 120×120 | PNG |
| 152x152 | iPad @2x | 152×152 | PNG |
| 76x76 | iPad @1x | 76×76 | PNG |
| 167x167 | iPad Pro @2x | 167×167 | PNG |

### System Integration
| Size | Usage | Pixels |
|------|-------|--------|
| 40x40 | Spotlight @2x | 40×40 |
| 60x60 | Spotlight @3x | 60×60 |
| 58x58 | Settings @2x | 58×58 |
| 87x87 | Settings @3x | 87×87 |
| 80x80 | Spotlight iPad @2x | 80×80 |
| 29x29 | Settings iPad @1x | 29×29 |

### Apple Watch (Optional)
| Size | Usage | Pixels |
|------|-------|--------|
| 88x88 | Watch @2x | 88×88 |
| 100x100 | Watch @2x | 100×100 |
| 172x172 | Watch @2x | 172×172 |
| 196x196 | Watch @2x | 196×196 |

## Android App Icon Sizes

### Play Store and System
| Density | Size | Pixels | Usage |
|---------|------|--------|-------|
| MDPI | 48dp | 48×48 | Standard density |
| HDPI | 72dp | 72×72 | High density |
| XHDPI | 96dp | 96×96 | Extra high density |
| XXHDPI | 144dp | 144×144 | Extra extra high |
| XXXHDPI | 192dp | 192×192 | Extra extra extra high |

### Play Store Specific
| Size | Usage | Format |
|------|-------|--------|
| 512×512 | Play Store listing | PNG (no alpha) |
| 1024×500 | Feature graphic | JPG/PNG |

### Adaptive Icons (Android 8.0+)
- **Foreground:** 108×108dp safe area (72×72dp visible)
- **Background:** 108×108dp solid color or pattern
- **Format:** Vector drawable (XML) preferred

## Icon Asset Generation Script

```bash
#!/bin/bash
# Generate all required app icon sizes from master 1024x1024 source

# iOS Icons
convert master-icon-1024.png -resize 180x180 ios-icon-180.png
convert master-icon-1024.png -resize 120x120 ios-icon-120.png  
convert master-icon-1024.png -resize 152x152 ios-icon-152.png
convert master-icon-1024.png -resize 76x76 ios-icon-76.png
convert master-icon-1024.png -resize 167x167 ios-icon-167.png

# iOS System Icons
convert master-icon-1024.png -resize 40x40 ios-icon-40.png
convert master-icon-1024.png -resize 60x60 ios-icon-60.png
convert master-icon-1024.png -resize 58x58 ios-icon-58.png
convert master-icon-1024.png -resize 87x87 ios-icon-87.png
convert master-icon-1024.png -resize 80x80 ios-icon-80.png
convert master-icon-1024.png -resize 29x29 ios-icon-29.png

# Android Icons  
convert master-icon-1024.png -resize 48x48 android-icon-mdpi.png
convert master-icon-1024.png -resize 72x72 android-icon-hdpi.png
convert master-icon-1024.png -resize 96x96 android-icon-xhdpi.png  
convert master-icon-1024.png -resize 144x144 android-icon-xxhdpi.png
convert master-icon-1024.png -resize 192x192 android-icon-xxxhdpi.png

# Play Store
convert master-icon-1024.png -resize 512x512 play-store-icon-512.png
```

## Design Guidelines Compliance

### Apple App Store Guidelines ✅
- No Apple hardware or interface elements
- No rounded corners (system applies automatically)
- No drop shadows or gloss effects
- Consistent visual hierarchy across sizes
- Works well on various backgrounds

### Google Play Store Guidelines ✅  
- Material Design principles followed
- Adaptive icon support for Android 8.0+
- Consistent brand identity across densities
- No copyrighted or trademarked elements
- Professional healthcare app appearance

## Accessibility Considerations

### Color Contrast
- **WCAG AA Compliant:** 4.5:1 minimum contrast ratio
- **Colorblind Friendly:** Tested with deuteranopia/protanopia simulators
- **High Contrast Mode:** Icon remains clear in system accessibility modes

### Visual Clarity
- **Minimum Size Test:** Legible at 16x16 pixels
- **Recognition Test:** Identifiable at distance/peripheral vision
- **Memory Test:** Distinctive enough to remember and recognize

## Brand Consistency

### Logo Relationship
- App icon derives from main SafeAging brand logo
- Maintains brand recognition while optimizing for mobile
- Consistent color palette across all brand touchpoints
- Scalable vector format preserves quality

### Marketing Integration
- Icon works well in app store screenshots
- Integrates with website and marketing materials
- Professional healthcare industry appearance
- Builds trust and credibility with target demographic

## Quality Assurance Checklist

### Technical Requirements ✅
- [ ] All required sizes generated
- [ ] PNG format without transparency (where required)
- [ ] Vector source file maintained
- [ ] Compression optimized for file size
- [ ] iOS and Android folder structure correct

### Design Quality ✅
- [ ] Tested at smallest required size (16x16)
- [ ] High contrast accessibility test passed
- [ ] Colorblind simulation test passed  
- [ ] Brand guideline compliance verified
- [ ] Healthcare industry appropriateness confirmed

### Device Testing ✅
- [ ] iOS devices: iPhone 12/13/14, iPad Pro
- [ ] Android devices: Samsung Galaxy, Google Pixel
- [ ] Various screen densities and sizes
- [ ] Light and dark system themes
- [ ] Accessibility modes enabled

## Implementation Notes

### iOS Implementation
```json
// Contents.json structure for iOS app icons
{
  "images": [
    {
      "idiom": "iphone",
      "size": "20x20",
      "scale": "2x",
      "filename": "icon-40.png"
    },
    // ... additional entries
  ],
  "info": {
    "version": 1,
    "author": "xcode"
  }
}
```

### Android Implementation  
```xml
<!-- Android adaptive icon configuration -->
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@drawable/ic_launcher_foreground"/>
</adaptive-icon>
```

### Capacitor Integration
Icons are automatically managed by Capacitor during the build process when placed in the correct directory structure:
- `ios/App/App/Assets.xcassets/AppIcon.appiconset/`  
- `android/app/src/main/res/mipmap-*/`