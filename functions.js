// functions.js — correct scaling (x1000), mapping, search-by-municipality & predictive data button

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

    // detect whole country code
    const wholeKey = Object.keys(areaMap).find(k => k.includes("whole country"));
    if (wholeKey) defaultAreaCode = areaMap[wholeKey];
    else if (areaVar.values && areaVar.values.length) defaultAreaCode = areaVar.values[0];
  }

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

    const yearCategory = data.dimension?.Vuosi?.category;
    if (!yearCategory) throw new Error("Unexpected response: missing Vuosi.category");

    const yearIndex = yearCategory.index;
    const labels = wantedYears.map(y => yearCategory.label[y] ?? y);

    const rawNumbers = wantedYears.map(y => {
      const idx = yearIndex[y];
      return (typeof idx === "number" && Array.isArray(data.value)) ? Number(data.value[idx]) : NaN;
    });

    // Fix scaling: if small numbers, multiply by 1000
    const maxRaw = Math.max(...rawNumbers.filter(v => !Number.isNaN(v)));
    let populations;
    if (maxRaw < 10000) {
      populations = rawNumbers.map(v => Math.round(v * 1000));
    } else {
      populations = rawNumbers.map(v => Math.round(v));
    }

    // Render chart
    const container = document.getElementById("chart");
    container.innerHTML = ""; // clear old chart

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
        // format with dots (European style)
        formatTooltipY: d => {
          const n = Number(d);
          return Number.isFinite(n)
            ? n.toLocaleString("de-DE") // e.g., 5.548.241
            : d;
        }
      }
    });

    window.populationChart = chart;
  }

  try {
    await loadAreaMap();
    await fetchAndRender(defaultAreaCode, "Whole country");
  } catch (err) {
    console.error("Initialization error:", err);
    document.getElementById("chart").innerHTML =
      "<p style='color:crimson'>Failed to load data.</p>";
  }

  // --- Municipality search ---
  const inputEl = document.getElementById("input-area");
  const buttonEl = document.getElementById("submit-data");

  if (inputEl && buttonEl) {
    buttonEl.addEventListener("click", async () => {
      const raw = (inputEl.value || "").trim().toLowerCase();
      if (!raw) return alert("Please enter a municipality name.");

      const matchedCode = areaMap[raw];
      if (!matchedCode) {
        alert(`No municipality found for "${inputEl.value}".`);
        return;
      }

      try {
        await fetchAndRender(matchedCode, inputEl.value.trim());
      } catch (err) {
        console.error("Error fetching municipality data:", err);
        alert("Failed to fetch data.");
      }
    });

    inputEl.addEventListener("keydown", e => {
      if (e.key === "Enter") buttonEl.click();
    });
  }

  // --- Prediction Button ---
  const addBtn = document.getElementById("add-data");
  if (addBtn) {
    addBtn.addEventListener("click", () => {
      if (!chart) return;

      const dataset = chart.data.datasets[0];
      const vals = dataset.values.map(v => Number(v));
      if (vals.length < 2) return alert("Not enough data points.");

      // Calculate mean delta
      const deltas = [];
      for (let i = 1; i < vals.length; i++) {
        deltas.push(vals[i] - vals[i - 1]);
      }
      const meanDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;

      // Predict next value
      const nextVal = Math.round(vals[vals.length - 1] + meanDelta);

      // Add new label (next year)
      const labels = chart.data.labels;
      const lastYear = parseInt(labels[labels.length - 1]);
      const nextYear = isNaN(lastYear) ? labels.length + 1 : lastYear + 1;

      labels.push(nextYear.toString());
      dataset.values.push(nextVal);

      chart.update({
        labels,
        datasets: [dataset]
      });
    });
  }
});
