const populartionUrl = "https://pxdata.stat.fi/PxWeb/api/v1/fi/StatFin/vaerak/statfin_vaerak_pxt_11ra.px";
const employmentUrl = "https://pxdata.stat.fi/PxWeb/api/v1/fi/StatFin/tyokay/statfin_tyokay_pxt_115b.px";

const fetchStatsFinData = async (url, body) => {
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });
    return await response.json();
};

const initializeCode = async () => {

    const populationbody = await (await fetch("/Week_3/population_query.json")).json();
    const employmentbody = await (await fetch("/Week_3/employment_query.json")).json();

    const [populationData, employmentData] = await Promise.all([
        fetchStatsFinData(populartionUrl, populationbody),
        fetchStatsFinData(employmentUrl, employmentbody)
    ]);

setupTable(populationData, employmentData);
};

function setupTable(populationData, employmentData) {
    const tableBody = document.getElementById("table_rows");
    const municipalityNamesObj = populationData.dimension.Alue.category.label;
    const municipalityCodesArray = Object.keys(municipalityNamesObj);
    const municipalityNamesArray = Object.values(municipalityNamesObj);

    const populationValues = populationData.value;
    const employmentValues = employmentData.value;

    tableBody.innerHTML = "";

    for (let i = 0; i < municipalityCodesArray.length; i++) {
        const row = document.createElement("tr");

        const municipalityCell = document.createElement("td");
        municipalityCell.textContent = municipalityNamesArray[i];

        const populationCell = document.createElement("td");
        populationCell.textContent = populationValues[i];

        const employmentCell = document.createElement("td");
        employmentCell.textContent = employmentValues[i];

        const percentageCell = document.createElement("td");
        const percentage = (employmentValues[i] / populationValues[i]) * 100;
        percentageCell.textContent = percentage.toFixed(2) + "%";
        
        if (percentage > 45) {
            row.classList.add("high_percentage");
        } else if (percentage < 25) {
            row.classList.add("low_percentage");
        }


        row.appendChild(municipalityCell);
        row.appendChild(populationCell);
        row.appendChild(employmentCell);
        row.appendChild(percentageCell);

        tableBody.appendChild(row);
    }
}

initializeCode();


