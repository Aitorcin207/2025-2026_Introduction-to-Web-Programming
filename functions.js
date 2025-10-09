window.addEventListener("load", async () => {
  try {
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
      response: { format: "json-stat2" }
    };

    // Await the fetch request
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) throw new Error("Network response was not ok");

    const data = await response.json();

    // Extract labels and multiply population values by 1000
    const years = Object.values(data.dimension.Vuosi.category.label);
    const populations = data.value;

    console.log("Population data (actual numbers):", populations);

    // Wait a tick to ensure DOM is ready for Cypress timing
    await new Promise(resolve => setTimeout(resolve, 100));

    // Create the chart
    new frappe.Chart("#chart", {
      title: "Population of Finland (2000-2021)",
      data: {
        labels: years,
        datasets: [
          {
            name: "Population",
            type: "line",
            values: populations
          }
        ]
      },
      type: "line",
      height: 454,
      colors: ["#eb5146"],
      axisOptions: {
        xAxisMode: "tick",
        yAxisMode: "tick"
      },
      lineOptions: { regionFill: 1 }
    });
  } catch (error) {
    console.error("Error fetching or rendering population data:", error);
  }
});
