// functions.js — robust async fetch + mapping + scaling for StatFin json-stat2
window.addEventListener("load", async () => {
  const base = "https://statfin.stat.fi/PxWeb/api/v1/en/StatFin/synt/statfin_synt_pxt_12dy.px";

  // years we want (keeps control of x-axis)
  const wantedYears = [
    "2000","2001","2002","2003","2004","2005",
    "2006","2007","2008","2009","2010","2011",
    "2012","2013","2014","2015","2016","2017",
    "2018","2019","2020","2021"
  ];
  

  try {
    // 1) fetch metadata so we can pick the correct Area code (WHOLE COUNTRY)
    const metaResp = await fetch(`${base}/metadata`);
    if (!metaResp.ok) throw new Error("Failed to load metadata: " + metaResp.status);
    const meta = await metaResp.json();

    // find the code for the 'WHOLE COUNTRY' label in the Area dimension (robust, case-insensitive)
    const areaLabels = meta.dimension?.Alue?.category?.label || {};
    let wholeCode = Object.keys(areaLabels).find(
      k => String(areaLabels[k]).toLowerCase().includes("whole country")
           || String(areaLabels[k]).toLowerCase().includes("whole")
           || String(areaLabels[k]).toLowerCase().includes("whole country".toLowerCase())
    );

    // fallback: try some likely candidates or use the first entry if nothing found
    if (!wholeCode) {
      // common fallback used by some StatFin tables — keep a safe fallback but prefer auto-find above
      wholeCode = "SSS";
      console.warn("Could not auto-detect WHOLE COUNTRY code — falling back to 'SSS'.");
    } else {
      console.log("Detected WHOLE COUNTRY code:", wholeCode, "label:", areaLabels[wholeCode]);
    }

    // 2) Build POST body (request only the wanted years + whole country + population)
    const requestBody = {
      query: [
        {
          code: "Vuosi",
          selection: { filter: "item", values: wantedYears }
        },
        {
          code: "Alue",
          selection: { filter: "item", values: [wholeCode] }
        },
        {
          code: "Tiedot",
          selection: { filter: "item", values: ["vaesto"] } // population info
        }
      ],
      response: { format: "json-stat2" }
    };

    // 3) fetch the actual data
    const resp = await fetch(base, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });
    if (!resp.ok) throw new Error("Data fetch failed: " + resp.status);
    const data = await resp.json();

    // 4) Map values -> years using JSON-stat2 ordering (category.index)
    const yearCategory = data.dimension?.Vuosi?.category;
    if (!yearCategory) throw new Error("Unexpected response shape: missing Vuosi.category");

    // category.index maps year string -> position in data.value
    const yearIndex = yearCategory.index;
    // build years array in the same order as the data.value positions for selected years:
    // (we use wantedYears to guarantee x-axis order is 2000..2021)
    const labels = wantedYears.map(y => yearCategory.label[y] ?? y);

    // data.value should be an array with one value per year (since other dims are single-selection)
    // Map each wanted year to its place in the data.value array using yearIndex.
    const rawValues = wantedYears.map(y => {
      const idx = yearIndex[y];
      // defensively handle missing index
      return (typeof idx === "number" && Array.isArray(data.value)) ? Number(data.value[idx]) : NaN;
    });

    console.log("Raw values from API (may be scaled):", rawValues);

    // 5) Auto-scale small numbers (common case: API returns thousands or decimals)
    // Heuristic: if max raw value is smaller than 10_000 it's probably given in thousands -> multiply by 1000.
    let values = rawValues.slice();
    const maxRaw = Math.max(...values.filter(v => !Number.isNaN(v)));
    let scaleApplied = 1;
    if (!Number.isFinite(maxRaw)) {
      throw new Error("No numeric data returned from the API for the requested selection.");
    }
    if (maxRaw < 10000) {
      values = values.map(v => Number.isNaN(v) ? v : Math.round(v * 1000)); // convert thousands -> individuals
      scaleApplied = 1000;
      console.warn("Small raw values detected; scaling by x1000 to convert to actual population counts.");
    } else {
      // already large enough — just round to integers
      values = values.map(v => Number.isNaN(v) ? v : Math.round(v));
    }

    console.log("Final population values (after optional scaling x" + scaleApplied + "):", values);

    // 6) ensure DOM is ready (tiny pause helps flakiness in tests)
    await new Promise(r => setTimeout(r, 50));

    // 7) Create the Frappe chart exactly as required
    new frappe.Chart("#chart", {
      title: "Population of Finland (2000-2021)",
      data: {
        labels,
        datasets: [
          {
            name: "Population",
            type: "line",
            values
          }
        ]
      },
      type: "line",
      height: 450,
      colors: ["#eb5146"],
      axisOptions: {
        xAxisMode: "tick",
        yAxisMode: "tick"
      },
      // present tooltips as formatted integers with thousands separators
      tooltipOptions: {
        formatTooltipY: d => {
          // d may be number or formatted string; ensure numeric formatting
          const n = Number(d);
          if (Number.isFinite(n)) return new Intl.NumberFormat("en-US").format(Math.round(n));
          return d;
        }
      },
      lineOptions: {
        regionFill: 1
      }
    });

  } catch (err) {
    console.error("Error in population chart workflow:", err);
    // show a minimal user-visible message so test/devs can notice error quickly
    const c = document.getElementById("chart");
    if (c) c.innerHTML = "<p style='color:crimson'>Failed to load population data — check console.</p>";
  }
});
