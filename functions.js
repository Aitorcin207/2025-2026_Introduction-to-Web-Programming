const form = document.getElementById('form-show');
const input = document.getElementById('input-show');
const showContainer = document.querySelector('.show-container');

form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const query = input.value.trim();
    if (query) {
        const showData = await fetchShowData(query);
        displayShowData(showData);
    }
    input.value = '';
});

async function fetchShowData(query) {
    const response = await fetch(`https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(query)}`);
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    return await response.json();
}  
function displayShowData(show) {
    showContainer.innerHTML = `
        <div class="show-data">
            <img src="${show.image ? show.image.medium : 'https://via.placeholder.com/210x295?text=No+Image'}" alt="${show.name}">
            <div class="show-info">
                <h1>${show.name}</h1>
                <p>${show.summary || 'No summary available.'}</p>
            </div>
        </div>
    `;
}