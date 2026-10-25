# TypeFlow — Typing Speed Tester

TypeFlow is a modern, responsive typing speed tester built with HTML, CSS, and vanilla JavaScript. Practice typing with different difficulty levels, measure your speed and accuracy, and track your personal records.

## Features

- **Three difficulty levels:** Easy, Medium, and Hard.
- **15 sample passages:** Five original passages for each difficulty.
- **Adjustable test duration:** 15, 30, 60, or 120 seconds.
- **Live statistics:** Words per minute (WPM), accuracy, character counts, and remaining time.
- **Character highlighting:** Green for correct characters and red for incorrect characters.
- **Three-second countdown:** Prepare before each test begins.
- **Results screen:** Final WPM, accuracy, correct and incorrect characters, elapsed time, and performance feedback.
- **Personal bests:** Save your best WPM and accuracy using `localStorage`.
- **WPM history chart:** A lightweight chart built with CSS and JavaScript.
- **Optional sound effects:** Enable or disable typing sounds.
- **Keyboard shortcut:** Press `Escape` to restart the current test.
- **Responsive interface:** Designed for desktop, tablet, and mobile screens.
- **No dependencies:** No frameworks, backend, database, or external APIs.

## Technologies Used

- HTML5
- CSS3
- Vanilla JavaScript
- Browser `localStorage`
- Web Audio API for optional sound effects

## Getting Started

1. Download or clone this repository.
2. Open the project folder.
3. Open `index.html` in a modern web browser.
4. Choose a test duration and difficulty.
5. Select **Start test** and begin typing after the countdown.

No package installation or build process is required.

## Project Structure

```text
typeflow/
├── index.html
├── style.css
├── script.js
└── README.md
```

## How WPM Is Calculated

TypeFlow uses the standard five-character word convention:

**WPM = Correct characters ÷ 5 ÷ elapsed minutes**

Accuracy is calculated as:

**Accuracy = Correct characters ÷ Total typed characters × 100**

Untyped characters are not included in the accuracy denominator. If no characters are typed, the final accuracy is shown as 0%.

## Data Storage

Personal bests and the latest eight completed test results are stored in the browser using `localStorage`. Your records are not uploaded to a server or automatically synced across devices. Clearing the browser's stored site data may erase them.

## Keyboard Controls

- `Escape` — Restart the current test.
- Normal typing keys — Enter the displayed passage.
- Backspace — Correct previously typed characters.

## Deployment

This is a static website and can be hosted for free with GitHub Pages.

1. Upload the project files to a GitHub repository.
2. Open the repository's **Settings → Pages**.
3. Choose **Deploy from a branch**.
4. Select the `main` branch and `/ (root)` folder.
5. Save and open the published URL when deployment completes.

## License and Credit

© 2026 mujtabacloud. All rights reserved.
