// functions.js — correct scaling (x1000), mapping, and search-by-municipality
window.addEventListener("load", async () => {
  const baseUrl = "https://statfin.stat.fi/PxWeb/api/v1/en/StatFin/synt/statfin_synt_pxt_12dy.px";

  const wantedYears = [
    "2000","2001","2002","2003","2004","2005",
    "2006","2007","2008","2009","2010","2011",
    "2012","2013","2014","2015","2016","2017",
    "2018","2019","2020","2021"
  ];

  let areaMap = {}; // nameLower -> code
  let defaultAreaCode = "SSS"; // fallback
  let chart = null;

  // load area codes & names (GET to baseUrl returns variables with values & valueTexts)
  async function loadAreaMap() {
    const r = await fetch(baseUrl);
    if (!r.ok) throw new Error("Failed to fetch area list: " + r.status);
    const meta = await r.json();

    const areaVar = meta.variables.find(v => v.code === "Alue");
    if (!areaVar) throw new Error("Area variable not found in API response");

    areaMap = {};
    areaVar.values.forEach((code, i) => {
      const name = (areaVar.valueTexts[i] || "").toLowerCase();
      areaMap[name] = code;
    });

    // try to detect whole-country code from labels, else fall back to SSS or first value
    const wholeKey = Object.keys(areaMap).find(k => k.includes("whole country") || k.includes("whole"));
    if (wholeKey) defaultAreaCode = areaMap[wholeKey];
    else if (areaMap["ss s"] && !defaultAreaCode) defaultAreaCode = areaMap["ss s"];
    else if (areaVar.values && areaVar.values.length) defaultAreaCode = areaVar.values[0];

    console.log("Loaded area map (example):", Object.keys(areaMap).slice(0,8));
    console.log("Default area code:", defaultAreaCode);
  }

  // fetch population for a specific area code and render chart
  async function fetchAndRender(areaCode = defaultAreaCode, areaName = "Whole country") {
    const body = {
      query: [
        { code: "Vuosi", selection: { filter: "item", values: wantedYears } },
        { code: "Alue", selection: { filter: "item", values: [areaCode] } },
        { code: "Tiedot", selection: { filter: "item", values: ["vaesto"] } }
      ],
      response: { format: "json-stat2" }
    };

    const resp = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!resp.ok) throw new Error("Failed to fetch population: " + resp.status);
    const data = await resp.json();

    // Map values to the requested years using category.index (robust ordering)
    const yearCategory = data.dimension?.Vuosi?.category;
    if (!yearCategory) throw new Error("Unexpected response: missing Vuosi.category");

    const yearIndex = yearCategory.index; // maps year -> index in data.value
    // Compose labels array in the same order as wantedYears (2000..2021)
    const labels = wantedYears.map(y => yearCategory.label[y] ?? y);

    // rawNumbers mapped to each wanted year using the category.index
    const rawNumbers = wantedYears.map(y => {
      const idx = yearIndex[y];
      return (typeof idx === "number" && Array.isArray(data.value)) ? Number(data.value[idx]) : NaN;
    });

    console.log("Raw values from API (may be in thousands):", rawNumbers);

    // CORRECT SCALING: If values are small (< 10000) they are in thousands -> multiply by 1000
    // NOTE: Do NOT multiply by 10000 (that was the earlier mistake)
    const numericRaw = rawNumbers.map(v => Number.isFinite(v) ? v : NaN);
    const maxRaw = Math.max(...numericRaw.filter(v => !Number.isNaN(v)));
    let populations;
    if (!Number.isFinite(maxRaw)) {
      throw new Error("No numeric data returned from API for the selection.");
    }
    if (maxRaw < 10000) {
      // likely in thousands (e.g., 5548.241 -> 5,548,241)
      populations = numericRaw.map(v => Number.isNaN(v) ? v : Math.round(v * 1000));
      console.log("Detected values in thousands — scaling by x1000.");
    } else {
      // already per-person counts, just round to integers
      populations = numericRaw.map(v => Number.isNaN(v) ? v : Math.round(v));
      console.log("Values appear to be already in persons (no scaling).");
    }

    console.log("Final population values:", populations);

    // Render chart: recreate container to reliably update title + values
    const container = document.getElementById("chart");
    container.innerHTML = ""; // clear previous chart (if any)

    chart = new frappe.Chart("#chart", {
      title: `Population of ${areaName} (2000–2021)`,
      data: {
        labels,
        datasets: [{ name: "Population", type: "line", values: populations }]
      },
      type: "line",
      height: 450,
      colors: ["#eb5146"],
      axisOptions: { xAxisMode: "tick", yAxisMode: "tick" },
      lineOptions: { regionFill: 1 },
      tooltipOptions: {
        formatTooltipY: d => {
          const n = Number(d);
          return Number.isFinite(n) ? new Intl.NumberFormat("en-US").format(n) : d;
        }
      }
    });

    // expose chart for debugging in console: window.populationChart.data.datasets[0].values
    window.populationChart = chart;
  }

  // init: load areas and initial chart
  try {
    await loadAreaMap();
    await fetchAndRender(defaultAreaCode, "Whole country");
  } catch (err) {
    console.error("Initialization error:", err);
    const c = document.getElementById("chart");
    if (c) c.innerHTML = "<p style='color:crimson'>Failed to load population data — check console.</p>";
  }

  // wire up the form: case-insensitive search and Enter key support
  const inputEl = document.getElementById("input-area");
  const buttonEl = document.getElementById("submit-data");
  if (inputEl && buttonEl) {
    buttonEl.addEventListener("click", async () => {
      const raw = (inputEl.value || "").trim().toLowerCase();
      if (!raw) return alert("Please enter a municipality name.");

      const matchedCode = areaMap[raw];
      if (!matchedCode) {
        alert(`No municipality found for "${inputEl.value}". Try another name (case-insensitive).`);
        return;
      }

      try {
        await fetchAndRender(matchedCode, inputEl.value.trim());
      } catch (err) {
        console.error("Error fetching municipality data:", err);
        alert("Failed to fetch data for that municipality. Check console for details.");
      }
    });

    // allow Enter to submit
    inputEl.addEventListener("keydown", e => {
      if (e.key === "Enter") buttonEl.click();
    });
  }
});
