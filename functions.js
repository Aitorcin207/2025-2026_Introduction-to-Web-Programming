// fetchPopulation.js
// Sends a POST request on page load to get Finland's population data (2000–2021)

window.addEventListener("load", () => {
  const url = "https://statfin.stat.fi/PxWeb/api/v1/en/StatFin/synt/statfin_synt_pxt_12dy.px";

  const requestBody = {
    query: [
      {
        code: "Vuosi",
        selection: {
          filter: "item",
          values: [
            "2000", "2001", "2002", "2003", "2004", "2005",
            "2006", "2007", "2008", "2009", "2010", "2011",
            "2012", "2013", "2014", "2015", "2016", "2017",
            "2018", "2019", "2020", "2021"
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
          values: ["vaesto"] // Population data
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
      console.log("Population data fetched successfully:", data);
      // Data is not displayed yet, per instructions
    })
    .catch(error => {
      console.error("Error fetching population data:", error);
    });
});
