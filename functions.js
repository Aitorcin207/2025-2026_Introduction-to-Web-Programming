// fetchPopulation.js
// Fetches population data and displays it on a Frappe line chart

window.addEventListener("load", () => {
  const url =
    "https://statfin.stat.fi/PxWeb/api/v1/en/StatFin/synt/statfin_synt_pxt_12dy.px";

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
          values: ["SSS"] // Whole country
        }
      },
      {
        code: "Tiedot",
        selection: {
          filter: "item",
          values: ["vaesto"] // Population
        }
      }
    ],
    response: {
      format: "json-stat2"
    }
  };

  fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(requestBody)
  })
    .then(response => {
      if (!response.ok) throw new Error("Network response was not ok");
      return response.json();
    })
    .then(data => {
      console.log("Population data fetched:", data);

      // Extract population values from response
      const years = data.dimension.Vuosi.category.label;
      const yearLabels = Object.values(years);
      const populationValues = data.value;

      // Create Frappe Chart
      const chart = new frappe.Chart("#chart", {
        title: "Population of Finland (2000–2021)",
        data: {
          labels: yearLabels,
          datasets: [
            {
              name: "Population",
              type: "line",
              values: populationValues
            }
          ]
        },
        type: "line", // line chart
        height: 450,
        colors: ["#eb5146"]
      });
    })
    .catch(error => {
      console.error("Error fetching population data:", error);
    });
});
