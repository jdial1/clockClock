let wDigits = [10, 10, 10, 10, 10, 10];
let weatherData = { temp: 0, rain: 0 };

const WEATHER_LAT = 38.81;
const WEATHER_LON = -94.53;
const WEATHER_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || 'auto';

const updateWeatherDigits = () => {
  let tVal = isNaN(weatherData.temp) ? 0 : Math.round(weatherData.temp);
  let rVal = isNaN(weatherData.rain) ? 0 : Math.round(weatherData.rain);
  
  let tAbs = Math.abs(tVal).toString();
  let rStr = rVal.toString();

  if (tVal < 0) {
    if (tAbs.length === 1) {
      wDigits[0] = 15; wDigits[1] = +tAbs[0]; wDigits[2] = 11;
    } else {
      wDigits[0] = 15; wDigits[1] = +tAbs[0]; wDigits[2] = +tAbs[1];
    }
  } else {
    if (tAbs.length === 1) {
      wDigits[0] = 10; wDigits[1] = +tAbs[0]; wDigits[2] = 11;
    } else if (tAbs.length === 2) {
      wDigits[0] = +tAbs[0]; wDigits[1] = +tAbs[1]; wDigits[2] = 11;
    } else {
      wDigits[0] = +tAbs[0]; wDigits[1] = +tAbs[1]; wDigits[2] = +tAbs[2];
    }
  }

  if (rStr.length === 1) {
    wDigits[3] = 10; wDigits[4] = +rStr[0]; wDigits[5] = 14;
  } else if (rStr.length === 2) {
    wDigits[3] = +rStr[0]; wDigits[4] = +rStr[1]; wDigits[5] = 14;
  } else {
    wDigits[3] = +rStr[0]; wDigits[4] = +rStr[1]; wDigits[5] = +rStr[2];
  }
};

const fetchWeather = async () => {
  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${WEATHER_LAT}&longitude=${WEATHER_LON}&current_weather=true&hourly=precipitation_probability&temperature_unit=fahrenheit&timezone=${encodeURIComponent(WEATHER_TIMEZONE)}`);
    const data = await res.json();
    const temp = data.current_weather.temperature;
    
    const currentIso = data.current_weather.time;
    const currentHour = currentIso.split(':')[0] + ':00';
    const hourIdx = data.hourly.time.indexOf(currentHour);
    const rain = hourIdx !== -1 ? data.hourly.precipitation_probability[hourIdx] : 0;
    
    weatherData = { temp, rain };
    updateWeatherDigits();
  } catch (e) {
    console.error('Weather fetch failed', e);
  }
};

fetchWeather();
setInterval(fetchWeather, 15 * 60 * 1000);

const weatherIdle = (data, frameData) => {
  if (data.isRing) {
    let pos;
    if (data.x === 0 && data.y === 0) pos = BR;
    else if (data.x === 27 && data.y === 0) pos = BL;
    else if (data.x === 0 && data.y === 7) pos = TR;
    else if (data.x === 27 && data.y === 7) pos = TL;
    else if (data.y === 0 || data.y === 7) pos = H;
    else pos = V;
    data.out.h = pos.h;
    data.out.m = pos.m;
    data.out.ringWeight = 1;
    return;
  }

  if (data.isColon) {
    data.out.h = 225;
    data.out.m = 225;
    data.out.ringWeight = 1;
    return;
  }

  const c = digits[wDigits[data.digitIdx]][data.clockIdx];
  if (c.isIdle) {
    // Ambient wind breeze: gentle atmospheric current rippling across background elements
    const wind = Math.sin(frameData.t * 0.7 + data.x * 0.15 + data.y * 0.1) * 12;
    data.out.h = 225 + wind;
    data.out.m = 225 - wind;
    data.out.ringWeight = 1;
    return;
  }
  
  data.out.h = c.h;
  data.out.m = c.m;
  data.out.ringWeight = 1;
};
