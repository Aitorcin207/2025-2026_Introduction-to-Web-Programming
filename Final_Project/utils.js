// Final project from Aitor Martin Lopez 003355176

// This function is used to being able to download the data as a CSV file is the user wants
function download_charts_CSV() {
  // If the chart has not loaded yet(at the start or when the API saturates) shows an alert
  if (!chartExchange || !chartExchange.data.labels.length) {
    alert("There is no exchange currency data to download at the moment.");
    return;
  }
  // This const will store the CSV data that is going to be downloaded from the chart
  const labelsEX = chartExchange.data.labels;
  const datasetsEX = chartExchange.data.datasets;
  // Creates the CSV string with the data obtained from the chart
  let csvWork = "Date," + datasetsEX.map(d => d.label).join(",") + "\n";
  // For each one of the dates we make a new row with the data
  for (let i = 0; i < labelsEX.length; i++) {
    const row = [labelsEX[i], ...datasetsEX.map(d => (d.data[i] != null ? d.data[i] : ""))];
    csvWork += row.join(",") + "\n";
  }
  // This is to create the CSV file and download it
  const fileCSV = new Blob([csvWork], { type: "text/csv" });
  // And the name of the file
  const filename = document.createElement("a");
  // This is the link used for the download
  filename.href = URL.createObjectURL(fileCSV);
  filename.download = `USD_${exchangeCurrent}_exchange.csv`;
  filename.click();
}
// This function is used to download the chart as a PNG image
function download_charts_PNG() {
  // If the chart has not loaded yet(at the start or when the API saturates) shows an alert
  if (!chartExchange) {
    alert("The exchange currency chart is not ready to be downloaded at this moment.");
    return;
  }
  // This is going to be the link of the download of the image
  const toDownloadEX = document.createElement("a");
  // To get the image from the chart
  toDownloadEX.href = chartExchange.toBase64Image();
  // And the name of the file
  toDownloadEX.download = `USD_${exchangeCurrent}_exchange.png`;
  toDownloadEX.click();
}
// This function uses the API of Frankfurter to fetch the values of the exchange currencies
async function values_comparison_USD(daysnum, chart) {
  // First we clear the data of the last time range used
  try {
    const endDate = new Date();
    const startDate = new Date();
    // To set the start date depending on the time range selected by the user
    // If max is selected the chart will show from 10 years befor the day used
    // (the API used ddoes not allow me to make the range up to 20 years)
    if (daysnum === "max") {
      startDate.setFullYear(endDate.getFullYear() - 10);
    // if selected any other time range that max we use that amount of time
    } else {
      startDate.setDate(endDate.getDate() - Number(daysnum));
    }
    // We change the format of tha date used to coincide with the ones used by the API
    const startNew = startDate.toISOString().split("T")[0];
    const endNew = endDate.toISOString().split("T")[0];
    // This is the URL of the API used to ge the data of the exchange currencies
    const frankfurter = `https://api.frankfurter.app/${startNew}..${endNew}?from=USD&to=${exchangeCurrent}`;
    // sometimes it saturates
    const saturate = await fetch(frankfurter);
    // We check for errors in the fetch request
    if (!saturate.ok) throw new Error(`there's have been an error fetching Frankfurter: ${saturate.status}`);
    const data = await saturate.json();
    // Process the data to get the values with its dates
    const datesEX = Object.keys(data.rates).sort();
    const valuesEX = datesEX.map(d => {
      const recommendation = data.rates[d];
      // We return the value of the target currency obtained from the fetched data
      return recommendation ? recommendation[exchangeCurrent] : null;
    });
    // We update the chart with the new data that we obtained
    chart.data.labels = datesEX;
    chart.data.datasets = [
      {
        // the USD currency used as base against the target currency selected
        label: `USD/${exchangeCurrent}`,
        data: valuesEX,
        borderColor: "#00ff99ff",

      },
      {
        // The target currency selected by the user against the USD
        label: `${exchangeCurrent}/USD`,
        data: valuesEX.map(v => (v != null ? 1 / v : null)),
        borderColor: "#0095ffff",

      }
    ];
    chart.update();
  // Error when fetching the exchange of the currency data
  } catch (err) {
    console.error("The function values_comparison_USD has failed:", err);
  }
}
// This asyncronate function is to load the data of the exchange currencies
// depending on the time range that has been selected by the user
async function load_new_currencies(timenum) {
  exchangeTime = timenum;
  // To initialize the chart if needed
  if (!chartExchange) Exchange_currencies_chart();
  chartExchange.data.labels = [];
  chartExchange.data.datasets = [];
  // To update the chart with the new data
  chartExchange.update();
  await values_comparison_USD(timenum, chartExchange);
}
// This is the chart of the currencies exchanges(not the crypto ones)
function Exchange_currencies_chart() {
  // First create the chart object in the canvas
  const contex = document.getElementById("ExchangeChart").getContext("2d");
  // This is the chart configuration that will be in the web
  chartExchange = new Chart(contex, {
    type: "line",
    data: { labels: [], datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "nearest", intersect: false },
      // To allow the interaction of the data points like in the crypto chart
      onClick: (e, elements) => {
        // To check if the user clicks the data points
        if (elements.length) {
          const element = elements[0];
          const dataset = chartExchange.data.datasets[element.datasetIndex];
          const timeRanges = chartExchange.data.labels[element.index];
          const valuedata = dataset.data[element.index];
          // To use the modal function of before to show the info of the data points clicked
          show_more_info(`${dataset.label}<br><strong>${timeRanges}</strong><br>Rate: ${Number(valuedata).toFixed(6)}`);
        }
      },
      // the plugins used in this chart
      plugins: {
        title: {
          display: true,
          text: () => `USD to ${exchangeCurrent} exchange currency rates over the time`
        },
        // The legend fo the chart
        legend: { display: true }
      },
      // the scale depending on the time range that being selected
      scales: {
        x: { title: { display: true, text: "Date" } },
        y: { title: { display: true, text: "Rate" } }
      }
    }
  });
}
// This is the function that allows to change the currency that is being compared 
// with the USD(The API used the dollar as base currency so I have to use that)
function change_comparison_USD() {
  // to get the currency selecte by the user
  const sel = document.getElementById("CompareCurrency");
  exchangeCurrent = sel.value;
  // Function to load the data of the new used currency
  load_new_currencies(exchangeTime);
}