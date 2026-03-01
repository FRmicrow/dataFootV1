# User Story: Frontend Visual Rework & Contrast Fixes

**ID**: US-FE-001  
**Title**: Rework Frontend UI for Readability and Professional Aesthetic  
**Role**: Frontend Expert Agent  
**Status**: Ready for Dev  

---

## 📖 User Story
**As a** User of the StatFoot application,  
**I want** a clean, professional, and accessible user interface with high-contrast text and cohesive colors,  
**So that** I can easily read statistics and navigate the app without visual confusion or eye strain.

---

## 🎨 Context & Problem
The current application suffers from severe design and contrast issues that hinder usability:
- **Contrast Issues**: Text is currently displaying as "white on white" or "grey on dark blue," making it illegible.
- **Aesthetic**: The color scheme is clashing and lacks a professional polish.
- **Goal**: Move towards a modern, premium sport-tech aesthetic (clean lines, readable typography, high contrast).

---

## ✅ Acceptance Criteria

### 1. Fix Color Contrast & Readability
- [ ] **Eliminate "White on White"**: Ensure all text elements have sufficient contrast against their background.
- [ ] **Fix "Grey on Dark Blue"**: Adjust the dark mode/theme palette so that secondary text (grey) is legible against primary backgrounds.
- [ ] **WCAG Compliance**: Aim for WCAG AA standards for text contrast.

### 2. Implementation of Design System
- [ ] **Color Palette**: Define a strict color palette (Primary, Secondary, Background, Surface, Text-Primary, Text-Secondary).
    - *Suggestion*: Use a deep "Midnight Blue" or "Slate" for dark mode backgrounds, with crisp White for primary text and Light Grey for secondary text.
- [ ] **Typography**: Ensure font weights and sizes are appropriate for data density (stats tables need to be readable).

### 3. Professional Polish
- [ ] **Container Styling**: Ensure data cards and tables have distinct backgrounds/borders to separate them from the main page background.
- [ ] **Feedback**: Interactive elements (buttons, links) must have clear hover/active states.

---

## 🛠 Technical Notes
- **File Focus**: Primary changes likely needed in your global CSS logic (e.g., `index.css`, `App.css`, or Tailwind config if applicable).
- **Theme Variables**: If not already present, introduce CSS variables for colors (e.g., `--bg-primary`, `--text-main`) to prevent hardcoded color clashes in the future.
- **Data Tables**: Specifically check the player/team statistic tables, as these are the most data-dense areas usually reduced to "shades of grey."
