const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const Store = require("./src/Store");
const { createApp } = require("./src/app");

let temporaryDirectory;
let databasePath;
let server;
let baseUrl;

async function startServer() {
  server = createApp({ store: new Store(databasePath) });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
}

async function stopServer() {
  if (!server) return;
  const currentServer = server;
  const stopped = new Promise((resolve, reject) => {
    currentServer.close((error) => error ? reject(error) : resolve());
  });
  currentServer.closeAllConnections();
  await stopped;
  server = null;
}

test.before(async () => {
  temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "morrow-api-test-"));
  databasePath = path.join(temporaryDirectory, "store.json");
  await startServer();
});

test.after(async () => {
  await stopServer();
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

async function request(endpoint, method = "GET", body, headers = {}) {
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...headers
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  return { status: response.status, body: await response.json() };
}

test("products support filters and complete CRUD with validation", async () => {
  const all = await request("/api/products");
  assert.equal(all.status, 200);
  assert.equal(all.body.data.length, 4);
  assert.equal((await request("/api/products?category=Lighting")).body.data[0].id, 2);
  assert.equal((await request("/api/products?search=stoneware")).body.data.length, 1);

  const created = await request("/api/products", "POST", {
    name: "Woven Basket",
    price: 39.5,
    category: "Decor",
    description: "Handwoven natural fibers",
    image: "https://example.com/basket.jpg",
    unexpected: "stripped"
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.data.id, 5);
  assert.equal("unexpected" in created.body.data, false);
  const id = created.body.data.id;

  const patched = await request(`/api/products/${id}`, "PATCH", { price: 41 });
  assert.equal(patched.status, 200);
  assert.equal(patched.body.data.name, "Woven Basket");
  assert.equal(patched.body.data.price, 41);

  const replaced = await request(`/api/products/${id}`, "PUT", {
    name: "New Basket",
    price: 42,
    category: "Decor",
    description: "Updated description",
    image: "https://example.com/new-basket.jpg"
  });
  assert.equal(replaced.body.data.name, "New Basket");

  assert.equal((await request("/api/products", "POST", { name: "Missing fields" })).status, 400);
  assert.equal((await request(`/api/products/${id}`, "DELETE")).status, 200);
  assert.equal((await request(`/api/products/${id}`)).status, 404);
});

test("cart and orders persist and order submission empties the cart", async () => {
  const cartHeaders = { "x-cart-id": "integration-test-cart" };
  const added = await request("/api/cart", "POST", { productId: 1, quantity: 2 }, cartHeaders);
  assert.equal(added.status, 200);
  assert.equal(added.body.data.subtotal, 56);
  await request("/api/cart/items/1", "PATCH", { quantity: 3 }, cartHeaders);
  assert.equal((await request("/api/cart", "GET", undefined, cartHeaders)).body.data.subtotal, 84);
  assert.equal(
    (await request("/api/cart", "POST", { productId: 999, quantity: 1 }, cartHeaders)).status,
    404
  );

  const customer = {
    firstName: "Amina",
    lastName: "Khan",
    email: "amina@example.com",
    address: "10 Main Street",
    city: "Lahore",
    postalCode: "54000",
    payment: "Pay on delivery"
  };
  const createdOrder = await request("/api/orders", "POST", customer, cartHeaders);
  assert.equal(createdOrder.status, 201);
  assert.equal(createdOrder.body.data.total, 84);
  assert.equal(createdOrder.body.data.status, "received");
  assert.equal((await request("/api/cart", "GET", undefined, cartHeaders)).body.data.items.length, 0);
  assert.equal((await request(`/api/orders/${createdOrder.body.data.id}`)).body.data.id, 1);
  assert.equal((await request("/api/orders")).body.data.length, 1);
  assert.equal((await request("/api/orders", "POST", customer, cartHeaders)).status, 400);

  await stopServer();
  await startServer();
  assert.equal((await request("/api/orders/1")).body.data.customer.email, customer.email);
  assert.equal((await request("/api/products/1")).body.data.name, "Still Form Cup");
});

test("cart quantity, delete behavior, and standard API errors work", async () => {
  const headers = { "x-cart-id": "other-test-cart" };
  await request("/api/cart", "POST", { productId: 2 }, headers);
  assert.equal(
    (await request("/api/cart/items/2", "PATCH", { quantity: 0 }, headers)).body.data.items.length,
    0
  );
  assert.equal(
    (await request("/api/cart/items/2", "DELETE", undefined, headers)).status,
    404
  );
  assert.equal((await request("/missing")).status, 404);

  const malformed = await fetch(`${baseUrl}/api/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{"
  });
  assert.equal(malformed.status, 400);
  assert.match((await malformed.json()).error.message, /Malformed JSON/);
});
