// Final project from Aitor Martin Lopez 003355176

let graph = [];
let activeGraph = null;
// Used to make the purchases on the porfolio
const porfoliobuys = [];

// This initiate the first chart on page load
initialitate_the_chart(document.querySelector(".ChartContainer canvas"));

//This is the drag and drop setup used for charts
function Drop_zone(container) {
  container.addEventListener("dragover", e => {
    e.preventDefault();
    container.classList.add("dragover");
  });
  // To make the drag effect disappear when it is leaved outside of the designated dropzone
  container.addEventListener("dragleave", () => container.classList.remove("dragover"));
  container.addEventListener("drop", async e => {
    e.preventDefault();
    container.classList.remove("dragover");
    let load = {};
    // To being able to parse the data obtained from the drag event
    try {
      load = JSON.parse(e.dataTransfer.getData("text/plain") || "{}");
    } catch (err) {
      console.warn("There has been an error in the dragging.", err);
      return;
    }
    // The color selected by the user
    const color = document.getElementById("ChangeColor").value;
    const numdays = time_range_for_charts(document.getElementById("TimeRange").value);
    await fetch_and_add_data(load, color, numdays, container.chart);
  });
}

// this function allows to drag objects by activatiing it tactility
function Drag_objects() {
  const CryptosList = document.querySelectorAll("#CryptosList div");
  // To make each draggable object
  CryptosList.forEach(el => {
    // For the start of the draging
    el.addEventListener("touchstart", e => {
      const touch = e.touches[0];
      const load2 = {
        type: el.dataset.type,
        id: el.dataset.id,
        base: el.dataset.base,
        symbols: el.dataset.symbols,
        symbol: el.dataset.symbol
      };
      // This is for storing the crypto that is being dragged
      el.dataset.dragPayload = JSON.stringify(load2);
      // This is to create an effect that is going to be used when the dragging
      const trail = el.cloneNode(true);
      trail.style.position = "fixed";
      trail.style.opacity = "0.7";
      trail.style.left = touch.pageX + "px";
      trail.style.top = touch.pageY + "px";
      trail.id = "dragTrail";
      document.body.appendChild(trail);
    });
    // To make it move the draggable objects
    el.addEventListener("touchmove", e => {
      const trail = document.getElementById("dragTrail");
      // This is to make the effect of the dragging
      if (trail) {
        const touch2 = e.touches[0];
        trail.style.left = touch2.pageX + "px";
        trail.style.top = touch2.pageY + "px";
      }
    });
    // To be posible to drop the draggable objects
    el.addEventListener("touchend", e => {
      const trail = document.getElementById("dragTrail");
      // For removing the effect of dragging
      if (trail) trail.remove();
      // This is to get the element droppen on to the dropzone
      const touch3 = e.changedtouch3es[0];
      const dropzone = document.elementFromPoint(touch3.clientX, touch3.clientY)?.closest(".dropzone");
      // This is if the place we dropped the object is a valid dropzone we do this
      if (dropzone) {
        const load3 = JSON.parse(el.dataset.dragPayload);
        const color = document.getElementById("ChangeColor").value;
        const numdays2 = time_range_for_charts(document.getElementById("TimeRange").value);
        // This is the function to fetch the data and add it to this first chart
        fetch_and_add_data(load3, color, numdays2, dropzone.chart);
      }
    });
  });
}

// Activate the Drag & Drop function
Drag_objects();

// This are the time ranges used for the chart
function time_range_for_charts(timeval) {
  switch (timeval) {
    case "1": return 1;
    case "3": return 3;
    case "7": return 7;
    case "30": return 30;
    case "90": return 90;
    case "365": return 365;
    case "3650": return 3650;
    case "max": return "max";
    default: return parseInt(timeval, 10) || 30;
  }
}

// This is the function about the drag & drop data transfer
document.querySelectorAll("#CryptosList div").forEach(el => {
  el.addEventListener("dragstart", e => {
    const load4 = {
      type: el.dataset.type,
      id: el.dataset.id,
      base: el.dataset.base,
      symbols: el.dataset.symbols,
      symbol: el.dataset.symbol
    };
    e.dataTransfer.setData("text/plain", JSON.stringify(load4));
  });
});

// Here we add the function that creates new charts to compare the cryptocurrencies
document.getElementById("AddChart").addEventListener("click", () => {
  // Create a new container for the chart
  const section = document.getElementById("CryptoChart");
  const container = document.createElement("div");
  container.className = "ChartContainer dropzone";
  // Create the canvas for the new chart
  const canvas = document.createElement("canvas");
  container.appendChild(canvas);
  section.appendChild(container);
  initialitate_the_chart(canvas);
  Drop_zone(container);
});

// This function initializes and creates the new chart in the canvas
function initialitate_the_chart(canvas) {
  // Creates the chart object
  const chart = new Chart(canvas.getContext("2d"), {
    type: "line",
    data: { labels: [], datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "nearest", intersect: false },
      // To make possible to interact with the chart points
      onClick: (e, elements) => {
        if (elements.length) {
          const el = elements[0];
          const dataset = chart.data.datasets[el.datasetIndex];
          const value = dataset.data[el.index];
          const date = chart.data.labels[el.index];
          // The function used to show the modal
          show_more_info(`${dataset.label}<br><strong>${date}</strong><br>Value: ${Number(value).toFixed(4)}`);
        }
      },
      // The plugins that are being used in the chart
      scales: {
        x: { title: { display: true, text: "Date" } },
        y: { title: { display: true, text: "Value" } }
      }
    }
  });
  // This is used to link the chart with its own container
  canvas.parentElement.chart = chart;
  graph.push(chart);
  activeGraph = chart;
  // The setup of the dropzone used for the drag and drop function
  Drop_zone(canvas.parentElement);
  // The chart is activated when its being clicked
  canvas.addEventListener("pointerdown", () => activeGraph = chart);
}

// This function make able to Fetch & route the data obtained from the APIs(it is async to make the fetch without failing)
async function fetch_and_add_data(load4, color, times, chart) {
  try {
    // Use the active chart
    if (!chart) chart = activeGraph;
    // Calling the function depending on the type of data we need to fetch
    if (load4.type === "crypto") {
      await add_new_cryto(load4.id, color, times, chart);

    } else if (load4.type === "metal") {

    }

  // Error in fetching data
  } catch (err) {
    console.error("There has been an error in the fetching:", err);
  }
}

// This function fetches the data from CoinGecko API and adds it to the chart with the caracteristics selected by the web user
async function add_new_cryto(coinId, color, times, chart) {
  try {
    const daysParam = (times === "max") ? "max" : Math.max(1, times);
    const frankfurter = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${daysParam}`;
    const res = await fetch(frankfurter);
    // Check for some errors in the web request
    if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
    const data = await res.json();
    // Check if data.prices exists and has the data we need
    if (!data.prices || !data.prices.length) {
      console.warn("There is not price data for:", coinId);
      return;
    }
    // This function allows to map the data to the format that we need for Chart.js
    const labels = data.prices.map(p => {
      const d = new Date(p[0]);
      return d.toISOString().split("T")[0];
    });
    // This gives you the prices you obtained from the fetched data
    const prices = data.prices.map(p => p[1]);
    chart.data.labels = labels;
    // Adding a new dataset to the chart with the data that have been obtain with the fetch
    chart.data.datasets.push({
      label: `${coinId} (USD)`,
      data: prices,
      borderColor: color,
      fill: false
    });
    chart.update();
  } 
  // Error in adding new crypto to the chart
  catch (err) {
    console.error("There has been an error in add_new_cryto:", err);
  }
}

// This function tries to merge the data from two cryptos and use the currency EUR(does not work properly)
// function combine_data_cryptos(chart) {
//   const btcUSD = chart.data.datasets.find(d => d.label?.includes("bitcoin (USD)"));
//   const usdEUR = chart.data.datasets.find(d => d.label?.includes("USD/EUR"));
//   if (btcUSD && usdEUR && !chart.data.datasets.find(d => d.label?.includes("bitcoin (EUR)"))) {
//     const minLen = Math.min(btcUSD.data.length, usdEUR.data.length);
//     if (minLen <= 0) return;
//     const merged = btcUSD.data.slice(0, minLen).map((v, i) => v * usdEUR.data[i]);
//     chart.data.datasets.push({
//       label: "bitcoin (EUR)",
//       data: merged,
//       borderColor: "#008000",
//       borderDash: [5, 5],
//       fill: false
//     });
//     chart.update();
//   }
// }

// This function handles the modal used when clicking on data points of the charts
const modalUsed = document.getElementById("ExtraInfo");
const moreinfo = document.getElementById("MoreInfo");
const closeButton = document.querySelector(".CloseButton");
// Show the modal with the info of the data point in html
function show_more_info(html) {
  moreinfo.innerHTML = html;
  modalUsed.style.display = "block";
}
// Close modal events when the user clicks
if (closeButton) closeButton.onclick = () => (modalUsed.style.display = "none");
window.onclick = (e) => { if (e.target === modalUsed) modalUsed.style.display = "none"; };

// Function used for download button to work
document.getElementById("DownloadPNG").addEventListener("click", () => {
  // Download the active chart that is being used as a PNG
  if (!activeGraph) return;
  const toDownload = document.createElement("a");
  toDownload.href = activeGraph.toBase64Image();
  toDownload.download = "chart.png";
  toDownload.click();
});

// Function used for share button to work
document.getElementById("shareCrypto").addEventListener("click", async () => {
  // Share the active chart that is being used
  if (!activeGraph) return;
  try {
    const dataUrl = activeGraph.toBase64Image();
    const response = await fetch(dataUrl);
    const filecrypto = await response.blob();
    const file = new File([filecrypto], "chart.png", { type: filecrypto.type });
    // Use Web Share API if it is available
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: "Money and Crypto Portal Chart",
        text: "Chart from the web: Money and Crypto Portal",
        files: [file]
      });
    } else {
      const wndw = window.open();
      wndw.document.write(`<img src="${dataUrl}" alt="chart"><p>Right-click -> Save image or upload to social media</p>`);
    }
  // Error in the sharing process
  } catch (err) {
    console.error("Share failed", err);
    alert("There is a problem and you are not able to share to this place.");
    const wndw2 = window.open();
    wndw2.document.write(`<img src="${activeGraph.toBase64Image()}" alt="chart">`);
  }
});

// This function allows to change the time range used in the chats
document.getElementById("TimeRange").addEventListener("change", async () => {
  const newDays = time_range_for_charts(document.getElementById("TimeRange").value);
  // For each of the charts that is being used we need to fetch again the data in the new time range
  for (const chart of graph) {
    const datasets = [...chart.data.datasets];
    chart.data.datasets = [];
    chart.data.labels = [];
    // We need to re-fetch the data for each of the datasets used in the chart
    for (const dtsts of datasets) {
      const label = dtsts.label || "";
      // Determine if it is a crypto or other type of data
      if (label.includes("(USD)") && !label.includes("/")) {
        const coinId = label.split(" ")[0];
        await add_new_cryto(coinId, dtsts.borderColor || "#000", newDays, chart);
      // Other types of data
      } else {
        const coinId = label.split(" ")[0];
        await add_new_cryto(coinId, dtsts.borderColor || "#000", newDays, chart);
      }
    }
  }
});

// This function allows the porfolio of the user to work to make able the use to 
// search(or make a supposition og buying) in the purchases
document.getElementById("BuyCrypto").addEventListener("submit", async (e) => {
  e.preventDefault();
  // Get the values inserted from the user
  const coin = document.getElementById("TypeofCoin").value.trim();
  const date = document.getElementById("DateofBuy").value;
  const amount = parseFloat(document.getElementById("TotalAmount").value);
  // Validate the inputs entered by the user
  if (!coin || !date || !amount || amount <= 0) {
    if (amount <= 0)
      alert("The amount you inserted must be positive(this is to buy not to sell).");
    if(!coin)        
      alert("You have to enter a valid crypto to buy(those are: bitcoin, dogecoin or ethereum).");
    if(!date)
      alert("You have to enter a valid past date to make the purchase.");
    if(!amount || isNaN(amount))
      alert("You have to enter a valid number to buy crypto.");
    return;
  }
  // Add the purchase done to the "portfolio"
  porfoliobuys.push({ coin, date, amount });
  await porfolio_for_purchases();
  document.getElementById("BuyCrypto").reset();
});

// This function is an asyncronate one that updates the portfolio accordingly to the purchases that have been made
async function porfolio_for_purchases() {
  // Summary of the portfolio displayed for the user
  const container = document.getElementById("InformationBuy");
  container.innerHTML = "<em>Calculating...</em>";
  const summaryData = [];
  // The initial total value of the portfolio
  let StartCurrentValue = 0;
  // For each of the purchases made we need to fetch the data we get to calcule the benefit/loses from CoinGecko API
  for (const prchsd of porfoliobuys) {
    // This get the value of the coin at the current time inserted by the user(if it is valid)
    try {
      // Use the API to get the data
      const historicUrl = `https://api.coingecko.com/api/v3/coins/${prchsd.coin}/history?date=${formatDateForCG(prchsd.date)}`;
      const historicRes = await fetch(historicUrl);
      // Check if the values given by the user are considered to be valid
      if (!historicRes.ok) throw new Error(historicRes.status);
      const historicData = await historicRes.json();
      const boughtPrice = historicData.market_data && historicData.market_data.current_price && historicData.market_data.current_price.usd;
      // Gets the value of the coin at the specific time date
      const currentUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${prchsd.coin}&vs_currencies=usd`;
      const currentRes = await fetch(currentUrl);
      const currentData = await currentRes.json();
      const currentPrice = currentData[prchsd.coin] && currentData[prchsd.coin].usd;
      // If the data is not complete the summary its not done
      if (boughtPrice == null || currentPrice == null) {
        summaryData.push(`${prchsd.coin} — data missing`);
        continue;
      }
      // Calculate with the amout invested the value and the percentage of benefit/losses
      const invested = boughtPrice * prchsd.amount;
      // The value of the coin now
      const currentValue = currentPrice * prchsd.amount;
      StartCurrentValue += currentValue;
      // The value of the percentaje of gain or loss
      const percentage = ((currentValue - invested) / invested) * 100;
      let recommendation = "Hold";
      // The recommendations that are given to the user depending on the percentage obtained
      if (percentage > 5) recommendation = "You should consider selling the coins (the profit is > 5%)";
      else if (percentage < -5) recommendation = "You should consider buying more coins (the crypto has drop > 5%)";
      summaryData.push(`amount of ${prchsd.coin} bought ${prchsd.amount} @ ${boughtPrice.toFixed(2)} USD on ${prchsd.date} → current price ${currentPrice.toFixed(2)} USD → total value ${currentValue.toFixed(2)} USD (${percentage.toFixed(2)}%). Recommendation: ${recommendation}`);
    // Error in the fetching of the data that is going to be used for the portfolio item
    } catch (err) {
      console.error("The porfolio functionality has failed", err);
      summaryData.push(`${prchsd.coin} — failed to fetch the data from this purchase`);
    }
  }
  // Now we update the porfolio with the new data added and obtained
  container.innerHTML = `<strong>Portfolio</strong><br>${summaryData.join("<br>")}<br><strong>Total current value:</strong> ${StartCurrentValue.toFixed(2)} USD`;
}

// This is the chart of the currencies exchanges(not the crypto ones)
let chartExchange;
// The current target currency that is being used at starting the web
let exchangeCurrent = "EUR";
// The current amount of time used at the starting of the web
let exchangeTime = "365";

// This function is used to initialize the second chart(the exchange currencies one)
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
// Initialize the second chart on the page when this one is open
window.addEventListener("DOMContentLoaded", () => {
  // Uses function for initializing the chart
  Exchange_currencies_chart();
  // maximum one year putted by default
  load_new_currencies("365");
  // To make appear the chart in mobilephone
    window.addEventListener("resize", () => {
    if (chartExchange) {
        chartExchange.resize();
        chartExchange.update();
    }
    });
});
// This function is used to format the date to the format used by CoinGecko API(dd-mm-yyyy)
function formatDateForCG(dateGiven) {
  // Create a Date object from the input date string
  const day = new Date(dateGiven);
  const days = String(day.getUTCDate()).padStart(2, "0");
  const month = String(day.getUTCMonth() + 1).padStart(2, "0");
  const year = day.getUTCFullYear();
  // Return the date in dd-mm-yyyy format like the API
  return `${days}-${month}-${year}`;
}