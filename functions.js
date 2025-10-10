window.addEventListener("load", async () => {
  const url =
    "https://statfin.stat.fi/PxWeb/api/v1/en/StatFin/synt/statfin_synt_pxt_12dy.px";

  let currentYears = [];
  let currentValues = [];
  let currentAreaName = "Finland";
  let chart = null;

  try {
    // --- 1. Fetch area codes and names ---
    const areaResponse = await fetch(url);
    if (!areaResponse.ok) throw new Error("Failed to load area metadata");

    const areaData = await areaResponse.json();
    const areaVariable = areaData.variables.find(v => v.code === "Alue");
    const areaCodes = areaVariable.values;
    const areaNames = areaVariable.valueTexts;

    // --- 2. Function to fetch and render chart ---
    async function fetchAndRender(areaCode, areaName) {
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

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) throw new Error("Data fetch failed");

      const data = await response.json();
      const years = Object.values(data.dimension.Vuosi.category.label);
      const populations = data.value;

      currentYears = years;
      currentValues = populations;
      currentAreaName = areaName;

      // Render or update chart
      if (chart) {
        chart.update({
          title: `Population of ${areaName} (2000–2021)`,
          data: {
            labels: years,
            datasets: [{ name: "Population", type: "line", values: populations }]
          }
        });
      } else {
        chart = new frappe.Chart("#chart", {
          title: `Population of ${areaName} (2000–2021)`,
          data: {
            labels: years,
            datasets: [{ name: "Population", type: "line", values: populations }]
          },
          type: "line",
          height: 450,
          colors: ["#eb5146"]
        });
      }
    }

    // --- 3. Show default chart for whole country ---
    fetchAndRender("SSS", "Finland");

    // --- 4. Handle municipality search ---
    document.getElementById("submit-data").addEventListener("click", () => {
      const input = document.getElementById("input-area").value.trim().toLowerCase();
      const index = areaNames.findIndex(name => name.toLowerCase() === input);

      if (index === -1) {
        alert("Municipality not found. Please check the spelling.");
        return;
      }

      const areaCode = areaCodes[index];
      const areaName = areaNames[index];
      fetchAndRender(areaCode, areaName);
    });

    // --- 5. Handle prediction button ---
    document.getElementById("add-data").addEventListener("click", () => {
      if (currentValues.length < 2) {
        alert("Not enough data points to predict.");
        return;
      }

      // Compute mean delta
      let deltas = [];
      for (let i = 1; i < currentValues.length; i++) {
        deltas.push(currentValues[i] - currentValues[i - 1]);
      }
      const meanDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;

      // Compute next predicted value
      const nextValue = currentValues[currentValues.length - 1] + meanDelta;

      // Add new data point
      const lastYear = parseInt(currentYears[currentYears.length - 1]);
      const nextYear = (lastYear + 1).toString();
      currentYears.push(nextYear);
      currentValues.push(Math.round(nextValue));

      // Update chart
      chart.update({
        title: `Population of ${currentAreaName} (Predicted to ${nextYear})`,
        data: {
          labels: currentYears,
          datasets: [
            {
              name: "Population",
              type: "line",
              values: currentValues
            }
          ]
        }
      });
    });

  } catch (error) {
    console.error("Error fetching or rendering population data:", error);
  }
});
