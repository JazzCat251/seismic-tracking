const loadNavbar = () => {
  fetch("components/navbar/navbar.html")
    .then(res => res.text())
    .then(html => {
      document.getElementById("navbar").innerHTML = html;

      const path = window.location.pathname.split("/").pop();
      const links = document.querySelectorAll(".nav-link");
      links.forEach(link => {
        if (link.getAttribute("href") === path) {
          link.classList.add("active");
        }
      });
    })
    .catch(err => console.error("Failed to load navbar:", err));
};

document.addEventListener("DOMContentLoaded", loadNavbar);