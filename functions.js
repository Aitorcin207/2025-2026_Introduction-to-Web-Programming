const form = document.getElementById('form-show');
const input = document.getElementById('input-show');
const showContainer = document.querySelector('.show-container');

form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const query = input.value.trim();
    if (query) {
        const showsData = await fetchShowData(query);
        displayShowData(showsData);
    }
    input.value = '';
});

async function fetchShowData(query) {
    const response = await fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query)}`);
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    return await response.json(); // devuelve un array de resultados
}

function displayShowData(shows) {
    showContainer.innerHTML = ''; // limpia el contenedor antes de mostrar los resultados

    if (shows.length === 0) {
        showContainer.innerHTML = '<p>No se encontraron series.</p>';
        return;
    }

    shows.forEach(result => {
        const show = result.show;
        const showElement = document.createElement('div');
        showElement.classList.add('show-data');

        showElement.innerHTML = `
            <img src="${show.image ? show.image.medium : 'https://via.placeholder.com/210x295?text=No+Image'}" alt="${show.name}">
            <div class="show-info">
                <h1>${show.name}</h1>
                <p>${show.summary || 'No summary available.'}</p>
            </div>
        `;

        showContainer.appendChild(showElement);
    });
}
