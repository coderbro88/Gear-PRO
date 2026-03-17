# GearPro2 - Outdoor Gear Management App

A comprehensive iOS app for managing outdoor gear, planning trips, and tracking packing lists for hunting, backpacking, and camping adventures.

## Documentation

This is the master README for the full project.

### 📦 Storage & Sync
- **[Storage Visual Guide](STORAGE_VISUAL_GUIDE.md)** - 🎯 **START HERE!** Visual explanation with diagrams
- **[How to Verify Storage](HOW_TO_VERIFY_STORAGE.md)** - Step-by-step verification guide
- **[Storage Testing Guide](STORAGE_TESTING_GUIDE.md)** - Comprehensive testing scenarios
- **[Storage Implementation Summary](STORAGE_IMPLEMENTATION_SUMMARY.md)** - Technical details

### 🌐 Web App Docs
- **[`web/README.md`](web/README.md)** - Purpose: setup, privacy model (local-only storage), backup import/export, and GitHub Pages deployment for the public web version

### 📱 App Features
- **[Setup Instructions](SETUP_INSTRUCTIONS.md)** - Initial setup and configuration
- **[Trip Check-In System](TRIP_CHECKIN_SYSTEM.md)** - Check-in functionality

## Features

### 🎒 Dashboard
- View upcoming trips with pack weights
- Quick stats: total gear, trips, and alerts
- Real-time alerts for:
  - Expiring items (first aid, water filters, etc.)
  - Low stock consumables (fuel, batteries, etc.)
  - Gear maintenance reminders

### 📦 Gear Library
- Complete gear inventory with details:
  - Brand, name, category, weight
  - Quantity tracking (multiple items)
  - Base camp designation
  - Consumable stock levels
  - Expiration dates
  - Notes and maintenance reminders
- Search and filter by category
- Edit, delete, and manage gear
- Visual status indicators

### 🏕️ Trip Planning
- Create trips with:
  - Name, location, dates
  - Duration calculation
  - Multiple bag/pack assignments
- Pack-in weight vs. base camp weight tracking
- Trip summary with:
  - Total weight breakdown
  - Gear by category
  - Per-bag statistics

### 🎒 Packing Lists
- Multiple bags per trip (customizable)
- Bag management:
  - Custom names and colors
  - Adjustable max weight targets
  - Weight progress indicators
- Add/remove gear from bags
- Base camp gear tracking
- Category-based summaries
- Quantity conflict detection

### 🍽️ Meal Planning
- Create meal plans for trips
- Manual meal entry with custom details
- Track nutrition (calories, protein, carbs, fat)
- Save meals to library for reuse
- Assign meals to specific bags
- Weight tracking for food items
- Unlimited meal quantities (no stock limits)

### ⚙️ Settings & Storage
- **Push Notifications**: Get alerts for upcoming trips (adjustable days ahead)
- **Multi-Language Support**: 9 languages (English, Spanish, French, German, Italian, Portuguese, Chinese, Japanese, Korean)
- **Dark/Light Mode**: System-wide theme switching
- **Data Storage**: 
  - **Apple Cloud**: Automatic iCloud sync across devices
  - **Offline Only**: Local storage without cloud sync
- **Storage Details**: View sync status and data sizes
- **Profile Management**: Edit account information

## Project Structure

```
GearPro2/
├── Models/
│   ├── GearItem.swift       # Gear data model
│   ├── Trip.swift            # Trip data model
│   ├── Bag.swift             # Bag data model with colors
│   └── GearAlert.swift       # Alert system models
├── ViewModels/
│   └── GearTrackerViewModel.swift  # Main state management
├── Views/
│   ├── MainView.swift        # Main navigation container
│   ├── DashboardView.swift   # Dashboard screen
│   ├── PackingView.swift     # Packing/bag management
│   ├── GearLibraryView.swift # Gear library screen
│   ├── TripsView.swift       # All trips screen
│   └── Modals/
│       ├── AddGearView.swift      # Add new gear
│       ├── EditGearView.swift     # Edit existing gear
│       ├── AddTripView.swift      # Create new trip
│       ├── GearPickerView.swift   # Select gear for bag
│       ├── ManageBagsView.swift   # Bag configuration
│       └── TripSummaryView.swift  # Trip weight summary
├── GearPro2App.swift         # App entry point
└── ContentView.swift         # Legacy compatibility
```

## Technical Details

- **Platform**: iOS 17+
- **Framework**: SwiftUI
- **Architecture**: MVVM (Model-View-ViewModel)
- **State Management**: ObservableObject with @Published properties
- **Data Persistence**: 
  - Local: UserDefaults (always cached)
  - Cloud: NSUbiquitousKeyValueStore (iCloud Key-Value Storage)
  - Conflict Resolution: Timestamp-based (newer data wins)
- **Notifications**: UNUserNotificationCenter for trip alerts
- **Localization**: Dynamic language switching with 9 languages

## Key Features Implementation

### Weight Calculations
- Total trip weight
- Pack-in weight (excluding base camp gear)
- Base camp weight (stays at camp)
- Per-bag weight tracking
- Max weight targets with visual indicators

### Alert System
- Automatic alert generation based on:
  - Expiration dates (90, 30, 7 day warnings)
  - Stock levels (<25% threshold)
  - Priority sorting (high, medium, low)

### Quantity Management
- Track multiple quantities of the same item
- Prevent over-allocation across trips
- Visual availability indicators
- "All in use" / "X left" badges

### Bag Color System
- 6 color options: blue, pink, green, orange, purple, gray
- Gradient backgrounds for selection
- Color-coded throughout UI

## Sample Data

The app includes sample data for demonstration:
- 9 gear items across multiple categories
- 2 trips (upcoming and active)
- 2 bags with different weight targets
- Pre-configured alerts

## Recent Updates

### ✅ Completed Features
- ✅ Data persistence (UserDefaults + iCloud)
- ✅ iCloud sync with multi-device support
- ✅ Push notifications for upcoming trips
- ✅ Multi-language support (9 languages)
- ✅ Dark/Light mode
- ✅ Manual meal planning with nutrition tracking
- ✅ Trip check-in system
- ✅ Offline mode support

### 🔄 Future Enhancements
- [ ] PDF export for packing lists
- [ ] Sharing/collaboration
- [ ] Photo attachments for gear
- [ ] Gear maintenance history
- [ ] Weather integration
- [ ] Map integration for trip locations
- [ ] CloudKit migration (for >1MB data)
- [ ] Export/import backup files

## Building

1. Open `GearPro2.xcodeproj` in Xcode
2. Select your target device or simulator
3. Build and run (⌘R)

## Original Design

This app is based on a React/JSX prototype found in `GearPro2/use this/gear-tracker-with-trip-summary.jsx`. The SwiftUI version maintains all core functionality while following iOS design patterns and best practices.

