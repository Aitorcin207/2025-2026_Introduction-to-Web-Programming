// functions.js
window.addEventListener("load", async () => {
  const baseUrl = "https://statfin.stat.fi/PxWeb/api/v1/en/StatFin/synt/statfin_synt_pxt_12dy.px";

  const wantedYears = [
    "2000","2001","2002","2003","2004","2005",
    "2006","2007","2008","2009","2010","2011",
    "2012","2013","2014","2015","2016","2017",
    "2018","2019","2020","2021"
  ];

  let areaCodes = {};
  let chart = null;

  // 🗺️ Load all municipality names and codes
  async function loadAreaCodes() {
    const response = await fetch(baseUrl);
    if (!response.ok) throw new Error("Failed to fetch area list");
    const data = await response.json();

    const areas = data.variables.find(v => v.code === "Alue");
    if (!areas) throw new Error("No area data found");

    // Build map: lowercase name → code
    areaCodes = {};
    areas.values.forEach((code, i) => {
      const name = areas.valueTexts[i].toLowerCase();
      areaCodes[name] = code;
    });

    console.log("Loaded area codes:", areaCodes);
  }

  // 📈 Fetch and render population data for a specific area code
  async function fetchPopulation(areaCode, areaName) {
    const requestBody = {
      query: [
        {
          code: "Vuosi",
          selection: { filter: "item", values: wantedYears }
        },
        {
          code: "Alue",
          selection: { filter: "item", values: [areaCode] }
        },
        {
          code: "Tiedot",
          selection: { filter: "item", values: ["vaesto"] }
        }
      ],
      response: { format: "json-stat2" }
    };

    const response = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) throw new Error("Failed to fetch population data");

    const data = await response.json();
    const years = Object.values(data.dimension.Vuosi.category.label);
    const rawValues = data.value.map(Number);

    // Detect scaling (API returns thousands)
    const maxRaw = Math.max(...rawValues);
    const populations = maxRaw < 10000 ? rawValues.map(v => v * 1000) : rawValues;

    console.log(`Population data for ${areaName}:`, populations);

    // Render or update chart
    const chartData = {
      labels: years,
      datasets: [
        {
          name: "Population",
          type: "line",
          values: populations
        }
      ]
    };

    if (chart) {
      chart.update(chartData);
      chart.title = `Population of ${areaName} (2000–2021)`;
    } else {
      chart = new frappe.Chart("#chart", {
        title: `Population of ${areaName} (2000–2021)`,
        data: chartData,
        type: "line",
        height: 450,
        colors: ["#eb5146"],
        axisOptions: { xAxisMode: "tick", yAxisMode: "tick" },
        lineOptions: { regionFill: 1 }
      });
    }
  }

  // 🚀 Initialize app
  try {
    await loadAreaCodes();
    // Show whole country by default
    const defaultCode = Object.values(areaCodes)[0];
    const defaultName = Object.keys(areaCodes).find(k => areaCodes[k] === defaultCode) || "Whole country";
    await fetchPopulation(defaultCode, defaultName);
  } catch (error) {
    console.error("Error initializing app:", error);
  }

  // 🎯 Handle user search
  document.getElementById("submit-data").addEventListener("click", async () => {
    const input = document.getElementById("input-area").value.trim().toLowerCase();

    if (!input) return alert("Please enter a municipality name!");

    const areaCode = areaCodes[input];
    if (!areaCode) {
      alert(`No data found for "${input}". Try another name.`);
      return;
    }

    await fetchPopulation(areaCode, input.charAt(0).toUpperCase() + input.slice(1));
  });
});
