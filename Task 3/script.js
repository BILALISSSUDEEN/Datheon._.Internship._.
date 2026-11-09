/* Atmos Weather — OpenWeatherMap Current Weather + 5 day / 3 hour Forecast API */
(() => {
  "use strict";

  // 1) Create a free API key at https://home.openweathermap.org/api_keys
  // 2) Paste it between the quotes below. Keep this key private for production apps.
  const API_KEY = "YOUR_OPENWEATHERMAP_API_KEY";
  const BASE_URL = "https://api.openweathermap.org/data/2.5";

  const $ = (selector) => document.querySelector(selector);
  const ui = {
    form: $("#searchForm"), input: $("#cityInput"), loading: $("#loadingState"),
    dashboard: $("#weatherDashboard"), error: $("#errorPanel"), errorTitle: $("#errorTitle"),
    errorMessage: $("#errorMessage"), forecast: $("#forecastGrid"), unit: $("#unitToggle")
  };
  let unit = "metric";
  let lastWeather = null;
  let lastForecast = null;
  let requestController = null;

  const weatherEmoji = (main, icon = "") => {
    const key = String(main || "").toLowerCase();
    if (icon.endsWith("n")) return "🌙";
    if (key.includes("thunder")) return "⛈️";
    if (key.includes("drizzle") || key.includes("rain")) return "🌧️";
    if (key.includes("snow")) return "❄️";
    if (key.includes("mist") || key.includes("fog") || key.includes("haze") || key.includes("smoke")) return "🌫️";
    if (key.includes("cloud")) return "☁️";
    if (key.includes("clear")) return "☀️";
    return "🌤️";
  };

  function setLoading(isLoading) {
    ui.loading.hidden = !isLoading;
    if (isLoading) {
      ui.dashboard.hidden = true;
      ui.error.hidden = true;
    }
    ui.form.querySelector("button").disabled = isLoading;
    ui.form.querySelector("button").innerHTML = isLoading ? "Loading…" : 'Search <span>→</span>';
  }

  function showError(title, message) {
    ui.errorTitle.textContent = title;
    ui.errorMessage.textContent = message;
    ui.error.hidden = false;
  }

  function formatClock(timestamp, timezoneOffset = 0) {
    const date = new Date((timestamp + timezoneOffset) * 1000);
    return date.toLocaleTimeString("en-GB", { timeZone: "UTC", hour: "2-digit", minute: "2-digit" });
  }

  function formatLongDate(timestamp, timezoneOffset = 0) {
    const date = new Date((timestamp + timezoneOffset) * 1000);
    return date.toLocaleDateString("en-US", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric" });
  }

  function formatDay(dateString) {
    return new Date(`${dateString}T12:00:00`).toLocaleDateString(undefined, { weekday: "short" });
  }

  function convertTemp(value) {
    return unit === "metric" ? Math.round(value) : Math.round(value * 9 / 5 + 32);
  }

  function speedValue(metersPerSecond) {
    const value = unit === "metric" ? metersPerSecond * 3.6 : metersPerSecond * 2.236936;
    return `${Math.round(value)} ${unit === "metric" ? "km/h" : "mph"}`;
  }

  function getWeatherClass(weather, icon) {
    const main = String(weather || "").toLowerCase();
    if (icon && icon.endsWith("n")) return "weather-night";
    if (main.includes("rain") || main.includes("drizzle") || main.includes("thunder")) return "weather-rain";
    if (main.includes("snow")) return "weather-snow";
    if (main.includes("cloud") || main.includes("mist") || main.includes("fog") || main.includes("haze")) return "weather-clouds";
    return "weather-clear";
  }

  function setWeatherTheme(weather, icon) {
    document.body.classList.remove("weather-clear", "weather-clouds", "weather-rain", "weather-snow", "weather-night");
    document.body.classList.add(getWeatherClass(weather, icon));
    const art = $("#weatherArt");
    art.className = "weather-art";
    if (String(weather).toLowerCase().includes("cloud") || String(weather).toLowerCase().includes("mist")) art.classList.add("cloudy");
    if (["Rain", "Drizzle", "Thunderstorm"].includes(weather)) art.classList.add("rainy");
    if (weather === "Snow") art.classList.add("snowy");
    if (icon && icon.endsWith("n")) art.classList.add("night");
  }

  async function fetchJSON(url, signal) {
    const response = await fetch(url, { signal });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = data.message || (response.status === 404 ? "We couldn't find that city. Check the spelling and try again." : `Weather service returned an error (${response.status}).`);
      const error = new Error(message);
      error.status = response.status;
      throw error;
    }
    return data;
  }

  async function loadCity(city) {
    const cleanCity = city.trim();
    if (!cleanCity) {
      showError("Enter a city name", "Type a city such as London, Tokyo or Mumbai.");
      ui.input.focus();
      return;
    }
    if (!API_KEY || API_KEY === "YOUR_OPENWEATHERMAP_API_KEY") {
      showError("API key required", "Add your free OpenWeatherMap API key to the API_KEY constant near the top of script.js, then reload this page.");
      return;
    }
    if (requestController) requestController.abort();
    requestController = new AbortController();
    const signal = requestController.signal;
    setLoading(true);
    try {
      const query = encodeURIComponent(cleanCity);
      const units = "metric"; // Fetch in Celsius; convert locally for the °F toggle.
      const currentUrl = `${BASE_URL}/weather?q=${query}&appid=${API_KEY}&units=${units}`;
      const forecastUrl = `${BASE_URL}/forecast?q=${query}&appid=${API_KEY}&units=${units}`;
      const [current, forecast] = await Promise.all([
        fetchJSON(currentUrl, signal),
        fetchJSON(forecastUrl, signal)
      ]);
      lastWeather = current;
      lastForecast = forecast;
      renderWeather();
      ui.input.value = `${current.name}${current.sys?.country ? ", " + current.sys.country : ""}`;
      ui.dashboard.hidden = false;
      ui.error.hidden = true;
    } catch (error) {
      if (error.name === "AbortError") return;
      showError(error.status === 404 ? "City not found" : "Unable to load weather", error.message || "Check your connection and try again.");
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }

  function renderWeather() {
    if (!lastWeather || !lastForecast) return;
    const w = lastWeather;
    const condition = w.weather?.[0] || {};
    const icon = condition.icon || "01d";
    const timezone = w.timezone || 0;
    const temp = convertTemp(w.main.temp);
    $("#cityName").textContent = w.name;
    $("#countryCode").textContent = w.sys?.country || "";
    $("#currentDate").textContent = formatLongDate(w.dt, timezone);
    $("#updatedAt").textContent = `Updated ${new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}`;
    $("#conditionPill").textContent = condition.description || condition.main || "Current weather";
    $("#temperature").innerHTML = `${temp}<sup>°${unit === "metric" ? "C" : "F"}</sup>`;
    $("#feelsLike").textContent = `${convertTemp(w.main.feels_like)}°${unit === "metric" ? "C" : "F"}`;
    $("#conditionDescription").textContent = condition.description || "Weather conditions";
    $("#humidity").textContent = `${w.main.humidity}%`;
    $("#wind").textContent = speedValue(w.wind.speed);
    $("#windDirection").textContent = `${w.wind.deg ?? 0}° direction`;
    $("#pressure").textContent = `${w.main.pressure} hPa`;
    $("#visibility").textContent = `${(w.visibility / 1000).toFixed(1)} km`;
    $("#clouds").textContent = `${w.clouds?.all ?? 0}%`;
    $("#gust").textContent = w.wind.gust ? speedValue(w.wind.gust) : "—";
    $("#sunrise").textContent = formatClock(w.sys.sunrise, timezone);
    $("#sunset").textContent = formatClock(w.sys.sunset, timezone);
    $("#cityTime").textContent = formatClock(w.dt, timezone);
    $("#coordinates").textContent = `Coordinates: ${w.coord.lat.toFixed(2)}°, ${w.coord.lon.toFixed(2)}°`;
    setWeatherTheme(condition.main, icon);
    renderForecast(lastForecast);
  }

  function groupForecastByDay(list) {
    const groups = new Map();
    list.forEach(item => {
      const date = item.dt_txt.slice(0, 10);
      if (!groups.has(date)) groups.set(date, []);
      groups.get(date).push(item);
    });
    return [...groups.entries()].slice(0, 5);
  }

  function renderForecast(data) {
    const days = groupForecastByDay(data.list);
    ui.forecast.innerHTML = days.map(([date, entries], index) => {
      // Pick the forecast closest to midday for a representative daily icon/description.
      const representative = entries.reduce((best, item) => {
        const hour = Number(item.dt_txt.slice(11, 13));
        const bestHour = Number(best.dt_txt.slice(11, 13));
        return Math.abs(hour - 12) < Math.abs(bestHour - 12) ? item : best;
      }, entries[0]);
      const min = Math.min(...entries.map(item => item.main.temp_min));
      const max = Math.max(...entries.map(item => item.main.temp_max));
      const rainChance = Math.round(Math.max(...entries.map(item => (item.pop || 0) * 100)));
      const weather = representative.weather[0];
      const dayName = index === 0 ? "Today" : formatDay(date);
      return `<article class="forecast-card">
        <div class="forecast-day">${dayName}</div>
        <div class="forecast-date">${new Date(`${date}T12:00:00`).toLocaleDateString(undefined,{month:"short",day:"numeric"})}</div>
        <div class="forecast-icon" aria-label="${weather.description}">${weatherEmoji(weather.main, weather.icon)}</div>
        <div class="forecast-desc">${weather.description}</div>
        <div class="forecast-temps"><span>${convertTemp(max)}°</span><span>${convertTemp(min)}°</span></div>
        <div class="forecast-rain">💧 ${rainChance}% rain</div>
      </article>`;
    }).join("");
  }

  ui.form.addEventListener("submit", event => {
    event.preventDefault();
    loadCity(ui.input.value);
  });
  document.querySelectorAll("[data-city]").forEach(button => {
    button.addEventListener("click", () => {
      ui.input.value = button.dataset.city;
      loadCity(button.dataset.city);
    });
  });
  ui.unit.addEventListener("click", () => {
    unit = unit === "metric" ? "imperial" : "metric";
    ui.unit.innerHTML = unit === "metric" ? "°C <span>/</span> °F" : "°F <span>/</span> °C";
    renderWeather();
  });
  $("#dismissError").addEventListener("click", () => { ui.error.hidden = true; });
  setInterval(() => {
    $("#localClock").textContent = new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
  }, 1000);
  $("#localClock").textContent = new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});

  // Initial demo location. Add your API key first.
  loadCity("London");
})();