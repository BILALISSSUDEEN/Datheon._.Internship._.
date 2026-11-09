/* NovaCart — FakeStoreAPI storefront and persistent demo cart */
(() => {
  "use strict";
  const API_URL = "https://fakestoreapi.com/products";
  const STORAGE_KEY = "novacart_cart_v1";
  const TAX_RATE = 0.08;
  const FREE_SHIPPING_THRESHOLD = 100;
  const SHIPPING_FEE = 7.95;
  const $ = (selector) => document.querySelector(selector);

  let products = [];
  let activeCategory = "all";
  let searchTerm = "";
  let sortMode = "featured";
  let cart = loadCart();
  let toastTimer;

  function loadCart() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (!Array.isArray(saved)) return [];
      return saved.filter(item => Number.isInteger(item.id) && Number.isInteger(item.quantity) && item.quantity > 0);
    } catch (error) {
      console.warn("Could not read saved cart:", error);
      return [];
    }
  }

  function saveCart() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch (error) {
      showToast("Your browser couldn't save the cart.");
      console.error("Could not save cart:", error);
    }
  }

  const money = amount => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
  const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  })[char]);
  const titleCase = value => value.replace(/\b\w/g, char => char.toUpperCase());

  async function fetchProducts() {
    $("#productGrid").innerHTML = '<div class="product-skeleton"></div><div class="product-skeleton"></div><div class="product-skeleton"></div><div class="product-skeleton"></div>';
    $("#loadError").hidden = true;
    try {
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error(`Product service returned ${response.status}.`);
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error("The product service returned an unexpected response.");
      products = data;
      $("#allCount").textContent = products.length;
      renderProducts();
      renderCart();
    } catch (error) {
      $("#productGrid").innerHTML = "";
      $("#loadError").hidden = false;
      $("#loadErrorMessage").textContent = `${error.message} Check your internet connection and try again.`;
    }
  }

  function getVisibleProducts() {
    let result = products.filter(product => {
      const categoryMatch = activeCategory === "all" || product.category === activeCategory;
      const term = searchTerm.toLowerCase();
      const searchMatch = !term || `${product.title} ${product.description} ${product.category}`.toLowerCase().includes(term);
      return categoryMatch && searchMatch;
    });
    if (sortMode === "price-low") result.sort((a,b) => a.price - b.price);
    if (sortMode === "price-high") result.sort((a,b) => b.price - a.price);
    if (sortMode === "rating") result.sort((a,b) => (b.rating?.rate || 0) - (a.rating?.rate || 0));
    return result;
  }

  function renderProducts() {
    const visible = getVisibleProducts();
    $("#resultsText").textContent = `${visible.length} ${visible.length === 1 ? "find" : "finds"} to explore`;
    $("#emptyState").hidden = visible.length !== 0;
    $("#productGrid").hidden = visible.length === 0;
    $("#productGrid").innerHTML = visible.map((product, index) => {
      const badge = product.rating?.rate >= 4.5 ? "A GOOD FIND" : index === 0 && activeCategory === "all" && !searchTerm ? "THE EDIT" : "";
      const image = escapeHTML(product.image);
      return `<article class="product-card">
        <div class="product-image-wrap">
          ${badge ? `<span class="product-badge">${badge}</span>` : ""}
          <img src="${image}" alt="${escapeHTML(product.title)}" loading="lazy" onerror="this.style.opacity='.2';this.alt='Product image unavailable'">
          <button class="quick-add" data-add="${product.id}" aria-label="Add ${escapeHTML(product.title)} to bag">+</button>
        </div>
        <div class="product-info">
          <div class="product-category">${escapeHTML(product.category)}</div>
          <h3 class="product-name">${escapeHTML(product.title)}</h3>
          <div class="product-meta"><span class="product-price">${money(product.price)}</span><span class="product-rating"><span>★</span> ${(product.rating?.rate || 0).toFixed(1)} <small>(${product.rating?.count || 0})</small></span></div>
        </div>
      </article>`;
    }).join("");
  }

  function addToCart(id) {
    const product = products.find(item => item.id === id);
    if (!product) return;
    const existing = cart.find(item => item.id === id);
    if (existing) existing.quantity += 1;
    else cart.push({ id, quantity: 1 });
    saveCart();
    renderCart();
    showToast("Added to your bag — good find!");
  }

  function updateQuantity(id, change) {
    const item = cart.find(entry => entry.id === id);
    if (!item) return;
    item.quantity += change;
    if (item.quantity <= 0) cart = cart.filter(entry => entry.id !== id);
    saveCart();
    renderCart();
  }

  function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    saveCart();
    renderCart();
    showToast("Item removed from your bag.");
  }

  function cartDetails() {
    const lines = cart.map(item => {
      const product = products.find(entry => entry.id === item.id);
      return product ? { ...product, quantity: item.quantity, lineTotal: product.price * item.quantity } : null;
    }).filter(Boolean);
    const subtotal = lines.reduce((sum, item) => sum + item.lineTotal, 0);
    const tax = subtotal * TAX_RATE;
    const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
    return { lines, subtotal, tax, shipping, total: subtotal + tax + shipping, count: lines.reduce((sum,item) => sum + item.quantity, 0) };
  }

  function renderCart() {
    const details = cartDetails();
    $("#cartCount").textContent = details.count > 99 ? "99+" : details.count;
    $("#drawerItemCount").textContent = `(${details.count})`;
    const itemsHost = $("#cartItems");
    if (!details.lines.length) {
      itemsHost.innerHTML = '<div class="cart-empty"><span>♡</span><h3>Your bag is taking a breather.</h3><p>Find something lovely to bring home.</p><button id="continueShopping">Explore the collection</button></div>';
      $("#cartSummary").hidden = true;
    } else {
      $("#cartSummary").hidden = false;
      itemsHost.innerHTML = details.lines.map(item => `<article class="cart-item">
        <img src="${escapeHTML(item.image)}" alt="${escapeHTML(item.title)}">
        <div><div class="cart-item-name">${escapeHTML(item.title)}</div><div class="cart-item-category">${escapeHTML(item.category)}</div>
          <div class="quantity-control"><button data-quantity="${item.id}" data-change="-1" aria-label="Decrease quantity">−</button><span>${item.quantity}</span><button data-quantity="${item.id}" data-change="1" aria-label="Increase quantity">+</button></div>
        </div>
        <div class="cart-item-side"><strong>${money(item.lineTotal)}</strong><button class="remove-item" data-remove="${item.id}">Remove</button></div>
      </article>`).join("");
    }
    $("#subtotal").textContent = money(details.subtotal);
    $("#tax").textContent = money(details.tax);
    $("#shipping").textContent = details.shipping ? money(details.shipping) : (details.subtotal ? "Free" : money(0));
    $("#total").textContent = money(details.total);
    $("#checkoutTotal").textContent = money(details.total);
    const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - details.subtotal);
    $("#shippingMessage").textContent = details.subtotal >= FREE_SHIPPING_THRESHOLD
      ? "Lovely — you've unlocked free shipping!"
      : details.subtotal ? `You're ${money(remaining)} away from free shipping.` : `Free shipping on orders over ${money(FREE_SHIPPING_THRESHOLD)}.`;
    $("#shippingProgress").style.width = `${Math.min(100, details.subtotal / FREE_SHIPPING_THRESHOLD * 100)}%`;
    $("#checkoutButton").disabled = !details.count;
  }

  function openCart() {
    $("#cartDrawer").classList.add("open");
    $("#drawerBackdrop").classList.add("open");
    $("#cartDrawer").setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    $("#closeCart").focus();
  }
  function closeCart() {
    $("#cartDrawer").classList.remove("open");
    $("#drawerBackdrop").classList.remove("open");
    $("#cartDrawer").setAttribute("aria-hidden", "true");
    if (!$("#checkoutBackdrop").classList.contains("open")) document.body.style.overflow = "";
  }
  function openCheckout() {
    if (!cartDetails().count) return;
    $("#checkoutFormView").hidden = false;
    $("#successView").hidden = true;
    $("#checkoutBackdrop").classList.add("open");
    document.body.style.overflow = "hidden";
    $("#checkoutModal")?.focus();
  }
  function closeCheckout() {
    $("#checkoutBackdrop").classList.remove("open");
    if (!$("#cartDrawer").classList.contains("open")) document.body.style.overflow = "";
  }

  function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
  }

  $("#productGrid").addEventListener("click", event => {
    const button = event.target.closest("[data-add]");
    if (button) addToCart(Number(button.dataset.add));
  });
  $("#cartItems").addEventListener("click", event => {
    const quantityButton = event.target.closest("[data-quantity]");
    const removeButton = event.target.closest("[data-remove]");
    if (quantityButton) updateQuantity(Number(quantityButton.dataset.quantity), Number(quantityButton.dataset.change));
    if (removeButton) removeFromCart(Number(removeButton.dataset.remove));
    if (event.target.closest("#continueShopping")) closeCart();
  });
  $("#categoryTabs").addEventListener("click", event => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    activeCategory = button.dataset.category;
    document.querySelectorAll(".category-tab").forEach(tab => tab.classList.toggle("active", tab === button));
    renderProducts();
  });
  document.querySelectorAll("[data-nav-category]").forEach(link => link.addEventListener("click", () => {
    activeCategory = link.dataset.navCategory;
    document.querySelectorAll(".category-tab").forEach(tab => tab.classList.toggle("active", tab.dataset.category === activeCategory));
    renderProducts();
  }));
  $("#searchInput").addEventListener("input", event => { searchTerm = event.target.value.trim(); renderProducts(); });
  $("#sortSelect").addEventListener("change", event => { sortMode = event.target.value; renderProducts(); });
  $("#resetFilters").addEventListener("click", () => {
    activeCategory = "all"; searchTerm = ""; sortMode = "featured";
    $("#searchInput").value = ""; $("#sortSelect").value = "featured";
    document.querySelectorAll(".category-tab").forEach(tab => tab.classList.toggle("active", tab.dataset.category === "all"));
    renderProducts();
  });
  $("#retryLoad").addEventListener("click", fetchProducts);
  $("#openCart").addEventListener("click", openCart);
  $("#closeCart").addEventListener("click", closeCart);
  $("#drawerBackdrop").addEventListener("click", closeCart);
  $("#checkoutButton").addEventListener("click", openCheckout);
  $("#closeCheckout").addEventListener("click", closeCheckout);
  $("#checkoutBackdrop").addEventListener("click", event => { if (event.target === $("#checkoutBackdrop")) closeCheckout(); });
  $(".search-focus").addEventListener("click", () => { $("#searchInput").focus(); $("#shop").scrollIntoView({ behavior: "smooth" }); });
  $("#checkoutForm").addEventListener("submit", event => {
    event.preventDefault();
    const details = cartDetails();
    if (!details.count) return;
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name")).trim();
    const email = String(form.get("email")).trim();
    const orderId = `NOVA-${Date.now().toString().slice(-8)}`;
    $("#successMessage").textContent = `Thanks, ${name.split(/\s+/)[0]}! A demo confirmation for ${money(details.total)} is ready for ${email}. No payment was taken.`;
    $("#orderNumber").textContent = `ORDER REFERENCE  ·  ${orderId}`;
    $("#checkoutFormView").hidden = true;
    $("#successView").hidden = false;
    cart = [];
    saveCart();
    renderCart();
    event.currentTarget.reset();
  });
  $("#finishOrder").addEventListener("click", () => { closeCheckout(); closeCart(); showToast("Thanks for exploring NovaCart!"); });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") { closeCheckout(); closeCart(); }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault(); $("#searchInput").focus(); $("#shop").scrollIntoView({behavior:"smooth"});
    }
  });

  fetchProducts();
})();