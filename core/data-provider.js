const WEATHER_LAT = 38.81;
const WEATHER_LON = -94.53;
const WEATHER_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || 'auto';

const dataProvider = {
  state: { date: [10, 10, 10, 10, 10, 10], weather: [10, 10, 10, 10, 10, 10] },
  weatherData: { temp: 0, rain: 0 },

  poll(fn, interval, runNow = true) {
    if (runNow) fn();
    setInterval(fn, interval);
  },

  init() {
    this.poll(() => this.updateDate(), 60 * 1000);
    this.poll(() => this.fetchWeather(), 15 * 60 * 1000);
  },

  updateDate() {
    const now = new Date();
    const raw = `${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getFullYear() % 100).padStart(2, '0')}`;
    for (let i = 0; i < 6; i++) this.state.date[i] = +raw[i];
    invalidateDrawKeys();
  },

  async fetchWeather() {
    try {
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${WEATHER_LAT}&longitude=${WEATHER_LON}&current_weather=true&hourly=precipitation_probability&temperature_unit=fahrenheit&timezone=${encodeURIComponent(WEATHER_TIMEZONE)}`);
      const data = await res.json();
      const temp = data.current_weather.temperature;
      const currentHour = data.current_weather.time.split(':')[0] + ':00';
      const hourIdx = data.hourly.time.indexOf(currentHour);
      this.weatherData = { temp, rain: hourIdx !== -1 ? data.hourly.precipitation_probability[hourIdx] : 0 };
      const tempVal = isNaN(this.weatherData.temp) ? 0 : Math.round(this.weatherData.temp);
      const rainVal = isNaN(this.weatherData.rain) ? 0 : Math.round(this.weatherData.rain);
      const tempParsed = formatToDigits(tempVal, 3, 10, { '-': 15 }, { align: 'right', suffix: 11 });
      const rainParsed = formatToDigits(rainVal, 3, 10, {}, { align: 'right', suffix: 14 });
      for (let i = 0; i < 3; i++) this.state.weather[i] = tempParsed[i];
      for (let i = 0; i < 3; i++) this.state.weather[i + 3] = rainParsed[i];
      invalidateDrawKeys();
    } catch (e) {
      console.error('Weather fetch failed', e);
    }
  }
};
