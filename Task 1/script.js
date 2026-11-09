// ========================================
// BILAL PORTFOLIO - JAVASCRIPT
// ========================================

document.documentElement.classList.add("js-reveal");

// ========================================
// 1. MOBILE NAVIGATION
// ========================================

const menuToggle = document.getElementById("menu-toggle");
const navMenu = document.getElementById("nav-menu");
const navLinks = document.querySelectorAll(".nav-link");

function closeMenu() {
  navMenu.classList.remove("open");
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Open navigation");
}

menuToggle.addEventListener("click", () => {
  const isOpen = navMenu.classList.toggle("open");

  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute(
    "aria-label",
    isOpen ? "Close navigation" : "Open navigation",
  );
});

navLinks.forEach((link) => {
  link.addEventListener("click", closeMenu);
});

document.addEventListener("click", (event) => {
  if (!navMenu.contains(event.target) && !menuToggle.contains(event.target)) {
    closeMenu();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeMenu();
  }
});

// ========================================
// 2. DARK / LIGHT THEME
// ========================================

const themeToggle = document.getElementById("theme-toggle");

function updateThemeButton() {
  const isLight = document.body.classList.contains("light-theme");

  themeToggle.textContent = isLight ? "☾" : "☼";
  themeToggle.setAttribute(
    "aria-label",
    isLight ? "Switch to dark theme" : "Switch to light theme",
  );

  document
    .querySelector('meta[name="theme-color"]')
    .setAttribute("content", isLight ? "#f5f7fc" : "#080b12");
}

// Load saved theme if available.
try {
  if (localStorage.getItem("bilal-portfolio-theme") === "light") {
    document.body.classList.add("light-theme");
  }
} catch (error) {
  // The website still works if local storage is unavailable.
}

updateThemeButton();

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("light-theme");

  const selectedTheme = document.body.classList.contains("light-theme")
    ? "light"
    : "dark";

  try {
    localStorage.setItem("bilal-portfolio-theme", selectedTheme);
  } catch (error) {
    // Theme switching still works for the current page.
  }

  updateThemeButton();
});

// ========================================
// 3. TYPING ANIMATION
// ========================================

const typingElement = document.getElementById("typing-text");

if (typingElement) {
  const words = ["HTML & CSS", "JavaScript", "React", "UI/UX Design", "Java"];

  let wordIndex = 0;
  let charIndex = words[0].length;
  let deleting = true;

  function typeWords() {
    const currentWord = words[wordIndex];

    if (deleting) {
      charIndex--;

      typingElement.textContent = currentWord.slice(0, Math.max(0, charIndex));

      if (charIndex <= 0) {
        deleting = false;
        wordIndex = (wordIndex + 1) % words.length;

        setTimeout(typeWords, 300);
        return;
      }
    } else {
      const nextWord = words[wordIndex];

      charIndex++;
      typingElement.textContent = nextWord.slice(0, charIndex);

      if (charIndex >= nextWord.length) {
        deleting = true;

        setTimeout(typeWords, 1200);
        return;
      }
    }

    setTimeout(typeWords, deleting ? 45 : 85);
  }

  setTimeout(typeWords, 1500);
}

// ========================================
// 4. PROJECT CATEGORY FILTER
// ========================================

const filterButtons = document.querySelectorAll(".filter-btn");
const projectCards = document.querySelectorAll(".project-card");
const projectCount = document.getElementById("project-count");

function updateProjectCount(count) {
  const number = String(count).padStart(2, "0");
  projectCount.textContent = `${number} PROJECT${count === 1 ? "" : "S"}`;
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const selectedFilter = button.dataset.filter;

    // Update active filter button.
    filterButtons.forEach((item) => {
      const isActive = item === button;

      item.classList.toggle("active", isActive);
      item.setAttribute("aria-pressed", String(isActive));
    });

    // Show matching projects.
    let visibleCount = 0;

    projectCards.forEach((card) => {
      const category = card.dataset.category;

      const shouldShow =
        selectedFilter === "all" || category === selectedFilter;

      card.classList.toggle("is-hidden", !shouldShow);

      if (shouldShow) {
        visibleCount++;
      }
    });

    updateProjectCount(visibleCount);
  });
});

// Set accessible initial filter states.
filterButtons.forEach((button) => {
  button.setAttribute(
    "aria-pressed",
    String(button.classList.contains("active")),
  );
});

// ========================================
// 5. PROJECT DETAILS POPUP
// ========================================

const modal = document.getElementById("project-modal");
const modalTitle = document.getElementById("modal-title");
const modalDescription = document.getElementById("modal-description");
const modalStack = document.getElementById("modal-stack");

const modalClose = document.getElementById("modal-close");
const modalDone = document.getElementById("modal-done");

let previouslyFocusedElement = null;

function openModal(button) {
  previouslyFocusedElement = button;

  modalTitle.textContent = button.dataset.title || "Project details";

  modalDescription.textContent =
    button.dataset.description || "Project description not available.";

  modalStack.textContent = button.dataset.stack || "Add your technologies.";

  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");

  document.body.style.overflow = "hidden";

  modalClose.focus();
}

function closeModal() {
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");

  document.body.style.overflow = "";

  if (previouslyFocusedElement) {
    previouslyFocusedElement.focus();
  }
}

document.querySelectorAll(".project-open").forEach((button) => {
  button.addEventListener("click", () => {
    openModal(button);
  });
});

modalClose.addEventListener("click", closeModal);
modalDone.addEventListener("click", closeModal);

// Close the popup when clicking its backdrop.
modal.querySelectorAll("[data-close-modal]").forEach((element) => {
  element.addEventListener("click", closeModal);
});

// Close the popup with Escape.
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && modal.classList.contains("open")) {
    closeModal();
  }
});

// ========================================
// 6. SCROLL REVEAL ANIMATIONS
// ========================================

const revealItems = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("revealed");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.12,
    },
  );

  revealItems.forEach((item) => {
    revealObserver.observe(item);
  });
} else {
  revealItems.forEach((item) => {
    item.classList.add("revealed");
  });
}

// ========================================
// 7. ACTIVE NAVIGATION ON SCROLL
// ========================================

const trackedSections = document.querySelectorAll("main section[id]");

if ("IntersectionObserver" in window) {
  const activeObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          navLinks.forEach((link) => {
            const matches = link.getAttribute("href") === `#${entry.target.id}`;

            link.classList.toggle("active", matches);
          });
        }
      });
    },
    {
      rootMargin: "-28% 0px -62% 0px",
    },
  );

  trackedSections.forEach((section) => {
    activeObserver.observe(section);
  });
}

// ========================================
// 8. SCROLL PROGRESS BAR
// ========================================

const progressBar = document.getElementById("scroll-progress");

function updateScrollProgress() {
  const scrollableHeight =
    document.documentElement.scrollHeight - window.innerHeight;

  const scrollPercent =
    scrollableHeight > 0 ? (window.scrollY / scrollableHeight) * 100 : 0;

  progressBar.style.width = `${scrollPercent}%`;
}

window.addEventListener("scroll", updateScrollProgress, {
  passive: true,
});

updateScrollProgress();

// ========================================
// 9. BACK TO TOP BUTTON
// ========================================

const backToTopButton = document.getElementById("back-to-top");

function updateBackToTop() {
  backToTopButton.classList.toggle("visible", window.scrollY > 400);
}

window.addEventListener("scroll", updateBackToTop, {
  passive: true,
});

backToTopButton.addEventListener("click", () => {
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
});

updateBackToTop();

// ========================================
// 10. AUTOMATIC FOOTER YEAR
// ========================================

document.getElementById("year").textContent = new Date().getFullYear();
