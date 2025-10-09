// fetchPopulation.js
// Runs when the page loads and also when you click "Fetch population data"

const url = "https://statfin.stat.fi/PxWeb/api/v1/en/StatFin/synt/statfin_synt_pxt_12dy.px";

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
        values: ["vaesto"] // Population data
      }
    }
  ],
  response: { format: "json" }
};

const outputEl = document.getElementById("output");
const statusEl = document.getElementById("status");
const btn = document.getElementById("reloadBtn");

async function fetchPopulation() {
  statusEl.textContent = "Fetching…";
  outputEl.textContent = ""; // clear previous output

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        // the important header you asked for
        "Content-Type": "application/json",
        // also ask for JSON in the response
        "Accept": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    if (!resp.ok) {
      // try to get any error text returned by the server
      let text;
      try { text = await resp.text(); } catch(e) { text = ""; }
      throw new Error(`Network response was not ok (status ${resp.status}) ${text ? "- " + text : ""}`);
    }

    const data = await resp.json();
    // pretty-print the whole JSON response
    outputEl.textContent = JSON.stringify(data, null, 2);
    statusEl.textContent = "Data fetched successfully.";
    console.log("Population data received:", data);
  } catch (err) {
    // common cause: CORS or network issue — show message for debugging
    outputEl.textContent = `Error fetching data:\n${err.message}\n\n(See console for details)`;
    statusEl.textContent = "Error";
    console.error("Error fetching population data:", err);
  }
}

// fetch on load
window.addEventListener("load", fetchPopulation);
// allow manual retry
btn.addEventListener("click", fetchPopulation);
