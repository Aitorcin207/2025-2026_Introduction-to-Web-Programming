// Final project from Aitor Martin Lopez 003355176

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