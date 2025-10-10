window.addEventListener("load", async () => {
  const url =
    "https://statfin.stat.fi/PxWeb/api/v1/en/StatFin/synt/statfin_synt_pxt_12dy.px";

  const inputEl = document.getElementById("input-area");
  const submitBtn = document.getElementById("submit-data");
  const addBtn = document.getElementById("add-data");
  const navBtn = document.getElementById("navigation");
  const chartContainer = document.getElementById("chart");

  let areaCodes = [];
  let areaNames = [];
  let currentYears = [];
  let currentValues = [];
  let currentAreaName = "Finland";
  let currentAreaCode = "SSS";
  let chart = null;

  addBtn.disabled = true;

  try {
    const metaResp = await fetch(url);
    const meta = await metaResp.json();
    const areaVar = meta.variables.find(v => v.code === "Alue");
    areaCodes = areaVar.values;
    areaNames = areaVar.valueTexts;

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

      const data = await resp.json();
      const years = Object.values(data.dimension.Vuosi.category.label);
      const values = data.value.map(Number);
      return { years, values };
    }

    function drawChart(areaName, predictedToYear = null) {
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

      addBtn.disabled = false;
    }

    // Default: Finland
    const defaultData = await fetchPopulation("SSS");
    currentYears = defaultData.years;
    currentValues = defaultData.values;
    drawChart(currentAreaName);

    submitBtn.addEventListener("click", async () => {
      const input = inputEl.value.trim().toLowerCase();
      const idx = areaNames.findIndex(n => n.toLowerCase() === input);
      if (idx === -1) {
        alert("Municipality not found. Please check the spelling.");
        return;
      }

      const code = areaCodes[idx];
      const name = areaNames[idx];
      const data = await fetchPopulation(code);
      currentYears = data.years;
      currentValues = data.values;
      currentAreaName = name;
      currentAreaCode = code;
      drawChart(name);
    });

    addBtn.addEventListener("click", () => {
      if (currentValues.length < 2) return;
      const deltas = [];
      for (let i = 1; i < currentValues.length; i++) {
        deltas.push(currentValues[i] - currentValues[i - 1]);
      }
      const meanDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;
      const nextValue = currentValues[currentValues.length - 1] + meanDelta;
      const nextYear = (parseInt(currentYears[currentYears.length - 1]) + 1).toString();

      currentValues.push(Math.round(nextValue));
      currentYears.push(nextYear);
      drawChart(currentAreaName, nextYear);
    });

    // 🧭 Navigation button → store selected area & navigate
    navBtn.addEventListener("click", () => {
      localStorage.setItem("selectedAreaCode", currentAreaCode);
      localStorage.setItem("selectedAreaName", currentAreaName);
      window.location.href = "/newchart.html";
    });

  } catch (err) {
    console.error("Error:", err);
  }
});
