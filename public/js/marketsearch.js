let allProducts = [];

// Fetch all products when the page loads
async function fetchProducts() {
  try {
    const res = await fetch("/api/products");
    allProducts = await res.json();
    renderProducts(allProducts);
  } catch (error) {
    console.error("Error fetching products:", error);
  }
}

// Function to render products into the marketplace container
function renderProducts(products) {
  const marketplace = document.getElementById("marketplace");
  marketplace.innerHTML = "";
  if (!products || products.length === 0) {
    marketplace.innerHTML = "<p>No products available.</p>";
    return;
  }
  products.forEach((product) => {
    const card = document.createElement("div");
    card.className = "product-card";
    card.onclick = () => openModal(product); // Assume you have this function defined
    card.innerHTML = `
      <img src="${product.image}" alt="${product.product_name}">
      <h3>${product.product_name}</h3>
      <div class="price">${product.currency ?? "₹"}${product.price}</div>
      <div class="reviews">Quality: ${product.quality}</div>
      <button class="add-to-cart-btn" onclick="event.stopPropagation(); addToCart('${
        product.product_name
      }')">Add to Cart</button>
    `;
    marketplace.appendChild(card);
  });
}

// Listen for input in the search bar
document.getElementById("searchInput").addEventListener("input", (e) => {
  const query = e.target.value.toLowerCase().trim();
  const filteredProducts = allProducts.filter((product) =>
    product.product_name.toLowerCase().includes(query)
  );
  renderProducts(filteredProducts);
});

// Call fetchProducts on DOM content load
document.addEventListener("DOMContentLoaded", fetchProducts);
