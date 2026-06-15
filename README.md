# Clock of Clocks

A creative, animated digital clock built entirely with vanilla HTML, CSS, and JavaScript. The display is constructed using a grid of smaller analog clocks whose hands rotate to form digits and various animations.

## Features

- **Time Display**: Shows the current time using synchronized, animated clock hands.
- **Multiple Visual Modes**:
  - **Time**: Standard time display.
  - **Ridgeline**: An ambient animation of a ridgeline plot (joyplot).
  - **Weather**: Displays the current temperature and precipitation probability.
  - **Neon Pulse**: A mesmerizing, pulsing geometric animation.
  - **Vortex**: A swirling vortex animation.
  - **Auto**: Automatically cycles between the time display and the various animations.
- **Live Weather Integration**: Fetches real-time temperature and rain data using the free Open-Meteo API.

## Usage

This project requires no build steps or bundlers to run. 

1. Simply open `index.html` in any modern web browser.
2. Alternatively, if you have Node.js installed, you can run the included dev script to serve it locally:
   ```bash
   npm run dev
   ```

## Configuration

### Weather Location

By default, the weather is set to a specific latitude and longitude. To change this to your location, open `index.html` and modify the following variables (around line 374):

```javascript
const WEATHER_LAT = 38.8119;
const WEATHER_LON = -94.5316;
const WEATHER_TIMEZONE = 'America/Chicago';
```

## Deployment

This repository is pre-configured to deploy automatically to GitHub Pages. 
Whenever you push to the `main` branch, the GitHub Action located in `.github/workflows/static.yml` will automatically publish the site.
