// Final project from Aitor Martin Lopez 003355176

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