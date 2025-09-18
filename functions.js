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
    const tableBody = document.getElementById("table-rows");
    const populationValues = populationData.value;
    const employmentValues = employmentData.value;
    console.log(populationValues);
    console.log(employmentValues);

    tableBody.innerHTML = "";

    for (let i = 0; i < populationValues.length; i++) {
        const row = document.createElement("tr");

        const populationCell = document.createElement("td");
        populationCell.textContent = populationValues[i];

        const employmentCell = document.createElement("td");
        employmentCell.textContent = employmentValues[i];

        row.appendChild(populationCell);
        row.appendChild(employmentCell);

        tableBody.appendChild(row);
    }
}

initializeCode();
