(function () {
  const NAV_OPEN_CLASS = "nav-open";
  const NAV_READY_CLASS = "nav-ready";

  function initResponsiveNav() {
    const nav = document.getElementById("main-nav");
    if (!nav) return;

    const navList = nav.querySelector("ul");
    if (!navList) return;

    if (!navList.id) navList.id = "main-nav-links";

    let toggleButton = nav.querySelector(".nav-toggle");
    if (!toggleButton) {
      toggleButton = document.createElement("button");
      toggleButton.className = "nav-toggle";
      toggleButton.type = "button";
      toggleButton.setAttribute("aria-controls", navList.id);
      toggleButton.innerHTML = "<span></span><span></span><span></span>";
      nav.insertBefore(toggleButton, navList);
    }

    function setMenuOpen(isOpen) {
      nav.classList.toggle(NAV_OPEN_CLASS, isOpen);
      toggleButton.setAttribute("aria-expanded", String(isOpen));
      toggleButton.setAttribute(
        "aria-label",
        isOpen ? "Close navigation" : "Open navigation"
      );
    }

    setMenuOpen(false);
    nav.classList.add(NAV_READY_CLASS);

    toggleButton.addEventListener("click", () => {
      setMenuOpen(!nav.classList.contains(NAV_OPEN_CLASS));
    });

    navList.addEventListener("click", (event) => {
      const clickedElement =
        event.target instanceof Element ? event.target : null;
      if (clickedElement && clickedElement.closest("a")) setMenuOpen(false);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    });

    document.addEventListener("click", (event) => {
      if (!nav.contains(event.target)) setMenuOpen(false);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initResponsiveNav);
  } else {
    initResponsiveNav();
  }
})();
