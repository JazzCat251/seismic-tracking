const images = [
  {
    src: "assets/earthquake1.jpg",
    alt: "Earthquake 1",
    title: "Global Seismic Events",
    desc: "Live visualization of tectonic movements worldwide."
  },
  {
    src: "assets/earthquake2.jpg",
    alt: "Earthquake 2",
    title: "Fault Lines in Motion",
    desc: "Understand the geography behind the quakes."
  },
  {
    src: "assets/earthquake3.jpg",
    alt: "Earthquake 3",
    title: "Real-Time Alerts",
    desc: "Stay ahead of natural disruptions with live updates."
  },
    {
    src: "assets/earthquake4.jpg",
    alt: "Earthquake 3",
    title: "Real-Time Alerts",
    desc: "Stay ahead of natural disruptions with live updates."
  }
];

const generateCarousel = (items) => {
  const container = document.getElementById("earthquake-carousel-container");

  const carouselId = "earthquakeCarousel";
  const indicators = items
    .map((_, idx) =>
      `<button type="button" data-bs-target="#${carouselId}" data-bs-slide-to="${idx}"${idx === 0 ? " class='active'" : ""}></button>`
    )
    .join("");

  const slides = items
    .map((item, idx) => `
      <div class="carousel-item${idx === 0 ? " active" : ""}">
        <img src="${item.src}" class="d-block w-100" alt="${item.alt}">
        <div class="carousel-caption d-none d-md-block bg-dark bg-opacity-50 rounded">
          <h5>${item.title}</h5>
          <p>${item.desc}</p>
        </div>
      </div>
    `)
    .join("");

  container.innerHTML = `
    <div id="${carouselId}" class="carousel slide" data-bs-ride="carousel">
      <div class="carousel-indicators">${indicators}</div>
      <div class="carousel-inner">${slides}</div>
      <button class="carousel-control-prev" type="button" data-bs-target="#${carouselId}" data-bs-slide="prev">
        <span class="carousel-control-prev-icon"></span>
      </button>
      <button class="carousel-control-next" type="button" data-bs-target="#${carouselId}" data-bs-slide="next">
        <span class="carousel-control-next-icon"></span>
      </button>
    </div>
  `;
}

generateCarousel(images);
