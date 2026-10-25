const cartStorageKey = "morrow-cart-id";
let cartId = localStorage.getItem(cartStorageKey);
if (!cartId) {
  cartId = crypto.randomUUID
    ? crypto.randomUUID()
    : `cart-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  localStorage.setItem(cartStorageKey, cartId);
}

const productGrid = document.querySelector("#product-grid");
const cartLines = document.querySelector("#cart-lines");
const checkoutStatus = document.querySelector("#checkout-status");

async function api(path, options = {}) {
  const headers = {
    "x-cart-id": cartId,
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...options.headers
  };
  const response = await fetch(path, { ...options, headers });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error?.message || `Request failed (${response.status})`);
  }
  return result.data;
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function money(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(value);
}

function showProductError(error) {
  productGrid.replaceChildren(element("p", "api-status api-status-error", `Could not load products: ${error.message}`));
}

function renderProduct(product) {
  const article = element("article", "col");
  article.id = `product-${product.id}`;
  const card = element("div", "product-card");
  const link = element("a", "product-image-link");
  link.href = `#product-details-${product.id}`;
  link.setAttribute("aria-label", `View ${product.name}`);

  if (product.tag) {
    const tag = element("span", "product-tag", product.tag);
    if (product.tag === "NEW") tag.classList.add("tag-new");
    if (product.tag === "LIMITED RUN") tag.classList.add("tag-limited");
    link.append(tag);
  }

  const image = document.createElement("img");
  image.src = product.image;
  image.alt = product.name;
  image.loading = "lazy";
  link.append(image);

  const details = element("div", "product-details");
  details.id = `product-details-${product.id}`;
  const titleRow = element("div", "product-title-row");
  titleRow.append(element("h3", "", product.name));
  titleRow.append(element("span", "product-price", money(product.price)));
  details.append(titleRow);
  details.append(element("p", "", product.description));

  if (Number.isFinite(product.rating)) {
    const rating = element("div", "rating-line");
    const stars = element("span", "", "★★★★★");
    stars.setAttribute("aria-label", `Rated ${product.rating} out of 5`);
    rating.append(stars, document.createTextNode(` ${product.rating.toFixed(1)} `));
    rating.append(element("span", "review-count", `(${product.reviewCount || 0})`));
    details.append(rating);
  }

  const action = element("div", "product-action");
  const button = element("button", "btn btn-dark add-button", "Add to bag");
  button.type = "button";
  button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      await api("/api/cart", {
        method: "POST",
        body: JSON.stringify({ productId: product.id, quantity: 1 })
      });
      button.textContent = "Added ✓";
      await refreshCart();
    } catch (error) {
      button.textContent = error.message;
    } finally {
      window.setTimeout(() => {
        button.textContent = "Add to bag";
        button.disabled = false;
      }, 1400);
    }
  });
  action.append(button);
  details.append(action);
  card.append(link, details);
  article.append(card);
  return article;
}

async function loadProducts(category = "") {
  productGrid.replaceChildren(element("p", "api-status", "Loading the collection…"));
  try {
    const query = category ? `?category=${encodeURIComponent(category)}` : "";
    const products = await api(`/api/products${query}`);
    productGrid.replaceChildren(
      ...(products.length
        ? products.map(renderProduct)
        : [element("p", "api-status", "No products found in this category.")])
    );
    const count = document.querySelector("#product-count");
    count.textContent = String(products.length).padStart(2, "0");
  } catch (error) {
    showProductError(error);
  }
}

function renderCart(cart) {
  cartLines.replaceChildren();
  const empty = document.querySelector("#empty-cart");
  empty.hidden = cart.items.length > 0;

  let itemCount = 0;
  for (const item of cart.items) {
    const product = item.product;
    itemCount += item.quantity;
    const line = element("article", "cart-line");
    const image = document.createElement("img");
    image.src = product.image;
    image.alt = product.name;
    image.loading = "lazy";

    const copy = element("div", "cart-item-copy");
    copy.append(element("h3", "", product.name));
    copy.append(element("p", "", product.description));
    const quantityLabel = element("label", "", "Quantity");
    const quantity = element("input", "cart-quantity");
    quantity.type = "number";
    quantity.min = "1";
    quantity.max = "99";
    quantity.value = String(item.quantity);
    quantity.setAttribute("aria-label", `Quantity for ${product.name}`);
    quantity.addEventListener("change", async () => {
      const nextQuantity = Number(quantity.value);
      if (!Number.isInteger(nextQuantity) || nextQuantity < 1 || nextQuantity > 99) {
        await refreshCart();
        return;
      }
      try {
        await api(`/api/cart/items/${product.id}`, {
          method: "PATCH",
          body: JSON.stringify({ quantity: nextQuantity })
        });
        await refreshCart();
      } catch (error) {
        checkoutStatus.textContent = error.message;
      }
    });
    copy.append(quantityLabel, quantity);

    const total = element("strong", "", money(item.lineTotal));
    const actions = element("div", "cart-item-actions");
    const remove = element("button", "remove-link", "Remove");
    remove.type = "button";
    remove.addEventListener("click", async () => {
      try {
        await api(`/api/cart/items/${product.id}`, { method: "DELETE" });
        await refreshCart();
      } catch (error) {
        checkoutStatus.textContent = error.message;
      }
    });
    actions.append(remove);
    line.append(image, copy, total, actions);
    cartLines.append(line);
  }

  document.querySelector("#bag-count").textContent = String(itemCount);
  document.querySelector("#cart-subtotal").textContent = money(cart.subtotal);
  document.querySelector("#cart-shipping").textContent =
    cart.shipping === 0 ? "Complimentary" : money(cart.shipping);
  document.querySelector("#checkout-total").textContent = money(cart.total);
}

async function refreshCart() {
  renderCart(await api("/api/cart"));
}

document.querySelectorAll(".category-nav a[data-category]").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    document.querySelectorAll(".category-nav a").forEach((item) => {
      item.classList.toggle("category-active", item === link);
    });
    loadProducts(link.dataset.category);
  });
});

document.querySelector("#place-order").addEventListener("click", async () => {
  const fieldIds = ["first-name", "last-name", "email", "address", "city", "postal-code"];
  const fields = fieldIds.map((id) => document.querySelector(`#${id}`));
  const invalid = fields.find((field) => !field.value.trim() || !field.checkValidity());
  if (invalid) {
    invalid.reportValidity();
    return;
  }

  const customer = {
    firstName: document.querySelector("#first-name").value,
    lastName: document.querySelector("#last-name").value,
    email: document.querySelector("#email").value,
    address: document.querySelector("#address").value,
    city: document.querySelector("#city").value,
    postalCode: document.querySelector("#postal-code").value,
    payment: document.querySelector("#payment").value
  };
  const button = document.querySelector("#place-order");
  button.disabled = true;
  checkoutStatus.textContent = "Saving your order…";
  try {
    const order = await api("/api/orders", {
      method: "POST",
      body: JSON.stringify(customer)
    });
    checkoutStatus.textContent = `Order #${order.id} received. Payment is not processed in this demo.`;
    await refreshCart();
  } catch (error) {
    checkoutStatus.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

Promise.all([loadProducts(), refreshCart()]).catch((error) => {
  checkoutStatus.textContent = `Store API error: ${error.message}`;
});
