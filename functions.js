window.addEventListener("load", async () => {
  const url =
    "https://statfin.stat.fi/PxWeb/api/v1/en/StatFin/synt/statfin_synt_pxt_12dy.px";

  const inputEl = document.getElementById("input-area");
  const submitBtn = document.getElementById("submit-data");
  // Create add-data button if it's not present in the HTML
  let addBtn = document.getElementById("add-data");
  if (!addBtn) {
    addBtn = document.createElement("button");
    addBtn.id = "add-data";
    addBtn.textContent = "Add prediction";
    const form = document.getElementById("form-container") || document.body;
    form.appendChild(addBtn);
  }

  const chartContainer = document.getElementById("chart");

  // State
  let areaCodes = [];
  let areaNames = [];
  let currentYears = [];
  let currentValues = [];
  let currentAreaName = "Finland";
  let chart = null;

  // disable prediction until first data load
  addBtn.disabled = true;

  try {
    // Fetch metadata to get area codes and names
    const metaResp = await fetch(url);
    if (!metaResp.ok) throw new Error("Failed to load area metadata");
    const meta = await metaResp.json();

    const areaVar = (meta.variables || []).find(v => v.code === "Alue");
    if (!areaVar) throw new Error("Area (Alue) variable not found in metadata");

    // Robustly extract codes and names (covers common pxweb shapes)
    if (Array.isArray(areaVar.values)) {
      areaCodes = areaVar.values.map(v => (typeof v === "object" ? (v.code ?? v.id ?? v) : String(v)));
    } else {
      areaCodes = [];
    }
    if (Array.isArray(areaVar.valueTexts)) {
      areaNames = areaVar.valueTexts.map(n => String(n));
    } else if (Array.isArray(areaVar.value_text) || Array.isArray(areaVar.valueText)) {
      areaNames = (areaVar.valueTexts || areaVar.value_text || areaVar.valueText).map(n => String(n));
    } else {
      // fallback: if names not provided, use codes as names
      areaNames = areaCodes.slice();
    }

    // helper: fetch population data for a given area code
    async function fetchPopulation(areaCode) {
      const requestBody = {
        query: [
          {
            code: "Vuosi",
            selection: {
              filter: "item",
              values: [
                "2000","2001","2002","2003","2004","2005",
                "2006","2007","2008","2009","2010","2011",
                "2012","2013","2014","2015","2016","2017",
                "2018","2019","2020","2021"
              ]
            }
          },
          {
            code: "Alue",
            selection: {
              filter: "item",
              values: [areaCode]
            }
          },
          {
            code: "Tiedot",
            selection: {
              filter: "item",
              values: ["vaesto"]
            }
          }
        ],
        response: { format: "json-stat2" }
      };

      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      });
      if (!resp.ok) throw new Error("Data fetch failed");

      const data = await resp.json();

      // Years and values
      const years = Object.values(data.dimension.Vuosi.category.label).map(y => String(y));
      // Ensure values are plain numbers
      const values = Array.isArray(data.value)
        ? data.value.map(v => Number(v))
        : [Number(data.value)];

      return { years, values };
    }

    // draw chart (re-create to avoid update API mismatches)
    function drawChart(areaName, predictedToYear = null) {
      // clear container
      chartContainer.innerHTML = "";
      const title = predictedToYear
        ? `Population of ${areaName} (Predicted to ${predictedToYear})`
        : `Population of ${areaName} (${currentYears[0]}–${currentYears[currentYears.length - 1]})`;

      chart = new frappe.Chart("#chart", {
        title,
        data: {
          labels: currentYears,
          datasets: [
            {
              name: "Population",
              type: "line",
              values: currentValues
            }
          ]
        },
        type: "line",
        height: 450,
        colors: ["#eb5146"]
      });

      // enable prediction button now that the chart exists
      addBtn.disabled = false;
    }

    // Initial default chart (whole country)
    const defaultData = await fetchPopulation("SSS");
    currentYears = defaultData.years;
    currentValues = defaultData.values;
    currentAreaName = "Finland";
    drawChart(currentAreaName);

    // Search button handler (case-insensitive exact match)
    submitBtn.addEventListener("click", async () => {
      const input = (inputEl.value || "").trim().toLowerCase();
      if (!input) {
        alert("Please type a municipality name.");
        return;
      }

      const idx = areaNames.findIndex(n => n.toLowerCase() === input);
      if (idx === -1) {
        alert("Municipality not found. Please check the spelling (case-insensitive).");
        return;
      }

      const code = areaCodes[idx];
      const name = areaNames[idx] || code;

      try {
        // temporarily disable prediction while loading new area
        addBtn.disabled = true;
        const d = await fetchPopulation(code);
        currentYears = d.years;
        currentValues = d.values;
        currentAreaName = name;
        drawChart(currentAreaName);
      } catch (err) {
        console.error(err);
        alert("Failed to fetch municipality data.");
      }
    });

    // Prediction button handler: add one predicted data point
    addBtn.addEventListener("click", () => {
      if (!currentValues || currentValues.length < 2) {
        alert("Not enough data points to predict.");
        return;
      }

      // Convert to numbers (safety) and compute deltas
      const numeric = currentValues.map(v => Number(v));
      const deltas = [];
      for (let i = 1; i < numeric.length; i++) {
        deltas.push(numeric[i] - numeric[i - 1]);
      }
      const meanDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;

      const nextValueRaw = numeric[numeric.length - 1] + meanDelta;
      const nextValue = Math.round(nextValueRaw);

      // next year
      const lastYear = parseInt(currentYears[currentYears.length - 1], 10);
      const nextYear = (Number.isFinite(lastYear) ? lastYear + 1 : (currentYears.length + 1)).toString();

      currentValues.push(nextValue);
      currentYears.push(nextYear);

      drawChart(currentAreaName, nextYear);
    });
  } catch (error) {
    console.error("Error initializing the page:", error);
    alert("Initialization failed; see console for details.");
  }
});
