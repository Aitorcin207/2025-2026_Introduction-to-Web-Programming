window.addEventListener("load", async () => {
  const url =
    "https://statfin.stat.fi/PxWeb/api/v1/en/StatFin/synt/statfin_synt_pxt_12dy.px";

  const areaCode = localStorage.getItem("selectedAreaCode") || "SSS";
  const areaName = localStorage.getItem("selectedAreaName") || "Finland";

  document.getElementById("navigation").addEventListener("click", () => {
    window.location.href = "/index.html";
  });

  async function fetchData(code) {
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
            values: [code] // "vm01" for births, "vm11" for deaths
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

    const data = await response.json();
    const years = Object.values(data.dimension.Vuosi.category.label);
    const values = data.value.map(Number);
    return { years, values };
  }

  try {
    const birthData = await fetchData("vm01");
    const deathData = await fetchData("vm11");

    new frappe.Chart("#chart", {
      title: `Births and Deaths in ${areaName} (2000–2021)`,
      data: {
        labels: birthData.years,
        datasets: [
          {
            name: "Births",
            type: "bar",
            values: birthData.values
          },
          {
            name: "Deaths",
            type: "bar",
            values: deathData.values
          }
        ]
      },
      type: "bar",
      height: 450,
      colors: ["#63d0ff", "#363636"]
    });
  } catch (error) {
    console.error("Error fetching births/deaths data:", error);
  }
});
