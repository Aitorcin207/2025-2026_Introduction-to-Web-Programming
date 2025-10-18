// Final project from Aitor Martin Lopez 003355176

let activeGraph = null;
let graph = [];
// Used to make the purchases on the porfolio
const porfoliobuys = [];

// This is the chart of the currencies exchanges(not the crypto ones)
let chartExchange;
// The current amount of time used at the starting of the web
let exchangeTime = "365";
// The current target currency that is being used at starting the web
let exchangeCurrent = "EUR";

// This function is created to get more info by clicking a point in the chart
const moreinfo = document.getElementById("MoreInfo");
// This function handles the close button of the pop up
const closeButton = document.querySelector(".CloseButton");
// This function handles the modal used when clicking on data points of the charts
const modalUsed = document.getElementById("ExtraInfo");

// This function assures the all the other JS have been loaded before this one starts to work
// (so it can call all the functions of them).
window.addEventListener("DOMContentLoaded", () => {
    // This function will see if any of the function is not available at the moment and
    // if that's the case it will stop the window website to continue to start until the three
    // of them have been started and work correctly 
    if (typeof initialitate_the_chart !== "function" || typeof Drop_zone !== "function" || typeof Drag_objects !== "function") {
        // Ensure chart creation function exists
        if (typeof initialitate_the_chart !== "function") {
            console.error("chart_creation.js has not been loaded jet so initialitate_the_chart is not defined for now.");
            return;
        }
        if (typeof Drop_zone !== "function") {
            console.error("drag_and_drop.js has not been loaded jet so Drop_zone is not defined for now.");
            return;
        }
        if (typeof Drag_objects !== "function") {
            console.error("drag_and_drop.js has not been loaded jet so Drag_objects is not defined for now.");
            return;
        }
    }

    // This constant contains the canvas where the chart is going to be located
    const cryptoCanvas = document.querySelector(".ChartContainer canvas");
    // This initiate the chart that compare the cryptocurrencies
    if (cryptoCanvas) {
        initialitate_the_chart(cryptoCanvas);
    // If there is an error with the location of the chart canvas
    } else {
        console.warn("The .ChartContainer canvas has not been found");
    }

    // This activates the dragging function on the drag_and_drop.js
    try {
        // Calls the function of dragging in the drag_and_drop.js
        Drag_objects();
    // If the function Drag_objects do not work correctly the error its cached
    } catch (err) {
        console.error("The function Drag_objects does not work correctly:", err);
    }

    // This function allows the dragging transfer
    const cryptos = document.querySelectorAll("#CryptosList div");
    // When we have the data of what crypto is and what is the time range we can dragg them it to the chart
    if (cryptos && cryptos.length) {
        cryptos.forEach(el => {
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
    } else {
        console.warn("the elements for #CryptosList div have not been found");
    }

    // The function for creating more charts to compare the cryptos between them
    const addChartButton = document.getElementById("AddChart");
    if (addChartButton) {
        addChartButton.addEventListener("click", () => {
        // Here we create a new container for the chart
        const section = document.getElementById("CryptoChart");
        const container = document.createElement("div");
        container.className = "ChartContainer dropzone";
        // Here we create a new container for the nwe chart
        const canvas = document.createElement("canvas");
        container.appendChild(canvas);
        section.appendChild(container);
        initialitate_the_chart(canvas);
        Drop_zone(container);
        });
    }

    // To show more detail information when clicking a point in the chart
    // The funcion used is if user_interface.js
    if (closeButton) closeButton.onclick = () => (modalUsed.style.display = "none");
    window.onclick = (e) => { if (e.target === modalUsed) modalUsed.style.display = "none"; };

    // Function used for download button to work
    const downloadButton = document.getElementById("DownloadPNG");
    if (downloadButton) {
        downloadButton.addEventListener("click", () => {
        // Download the active chart that is being used as a PNG
        if (!activeGraph) return;
        const toDownload = document.createElement("a");
        toDownload.href = activeGraph.toBase64Image();
        toDownload.download = "chart.png";
        toDownload.click();
        });
    }

    // Function used for share button to work
    const shareButton = document.getElementById("shareCrypto");
    if (shareButton) {
        shareButton.addEventListener("click", async () => {
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
  } else {
    console.warn("shareCrypto button not found");
  }

    // This function allows to change the time range used in the chats
    const timeRangeChosen = document.getElementById("TimeRange");
    if (timeRangeChosen) {
        timeRangeChosen.addEventListener("change", async () => {
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
    }

    // This function allows the porfolio of the user to work to make able the use to 
    // search(or make a supposition og buying) in the purchases
    const buyCoin = document.getElementById("BuyCrypto");
    if (buyCoin) {
        buyCoin.addEventListener("submit", async (e) => {
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
    }

    // Initialize the second chart on the page when this one is open
    if (typeof Exchange_currencies_chart === "function" && typeof load_new_currencies === "function") {
         // Uses function for initializing the chart  
        Exchange_currencies_chart();
        // maximum one year putted by default
        load_new_currencies("365");
    // If the functions Exchange_currencies_chart or load_new_currencies do not work correctly the errors are cached
    } else {
        console.warn("Exchange_currencies_chart or load_new_currencies is not defined yet.");
    }
    });
