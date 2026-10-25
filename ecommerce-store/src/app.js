const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { URL } = require("node:url");
const ApiError = require("./ApiError");
const Store = require("./Store");

const MAX_BODY_SIZE = 64 * 1024;
const productFields = ["name", "price", "category", "description", "image"];
const staticFiles = {
  "/": ["index.html", "text/html; charset=utf-8"],
  "/index.html": ["index.html", "text/html; charset=utf-8"],
  "/style.css": ["style.css", "text/css; charset=utf-8"],
  "/store.js": ["store.js", "text/javascript; charset=utf-8"]
};

function validateProduct(body, { partial = false } = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw ApiError.badRequest("Request body must be a JSON object");
  }
  const product = {};
  for (const field of productFields) {
    if (!Object.prototype.hasOwnProperty.call(body, field)) {
      if (!partial) throw ApiError.badRequest(`${field} is required`);
      continue;
    }
    const value = body[field];
    if (field === "price") {
      if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
        throw ApiError.badRequest("price must be a non-negative number");
      }
      product.price = value;
    } else {
      if (typeof value !== "string" || value.trim() === "") {
        throw ApiError.badRequest(`${field} must be a non-empty string`);
      }
      product[field] = value.trim();
    }
  }
  return product;
}

function validateCustomer(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw ApiError.badRequest("Request body must be a JSON object");
  }
  const fields = ["firstName", "lastName", "email", "address", "city", "postalCode", "payment"];
  const customer = {};
  for (const field of fields) {
    const value = body[field];
    if (typeof value !== "string" || value.trim() === "") {
      throw ApiError.badRequest(`${field} is required`);
    }
    customer[field] = value.trim();
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
    throw ApiError.badRequest("email must be valid");
  }
  return customer;
}

function validateObject(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw ApiError.badRequest("Request body must be a JSON object");
  }
  return body;
}

function readJsonBody(request) {
  const contentLength = Number(request.headers["content-length"]);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_SIZE) {
    request.resume();
    return Promise.reject(new ApiError(413, "Request body exceeds 64KB limit"));
  }
  if ((request.headers["content-type"] || "").split(";")[0].trim().toLowerCase() !== "application/json") {
    request.resume();
    return Promise.reject(ApiError.badRequest("Content-Type must be application/json"));
  }
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let settled = false;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) {
        settled = true;
        request.resume();
        reject(new ApiError(413, "Request body exceeds 64KB limit"));
      } else {
        chunks.push(chunk);
      }
    });
    request.on("end", () => {
      if (settled) return;
      try {
        const text = Buffer.concat(chunks).toString("utf8");
        if (!text.trim()) throw ApiError.badRequest("Request body cannot be empty");
        resolve(JSON.parse(text));
      } catch (error) {
        reject(error instanceof SyntaxError
          ? ApiError.badRequest("Malformed JSON request body")
          : error);
      }
    });
    request.on("error", (error) => {
      if (!settled) reject(error);
    });
  });
}

function parseId(value) {
  if (!/^[1-9]\d*$/.test(value)) throw ApiError.badRequest("ID must be a positive integer");
  const id = Number(value);
  if (!Number.isSafeInteger(id)) throw ApiError.badRequest("ID must be a safe integer");
  return id;
}

function getCartId(request) {
  const cartId = request.headers["x-cart-id"] || "default";
  if (typeof cartId !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(cartId)) {
    throw ApiError.badRequest("x-cart-id must contain 1-80 letters, numbers, underscores, or hyphens");
  }
  return cartId;
}

function sendJson(response, status, data) {
  const body = JSON.stringify(data);
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body)
  });
  response.end(body);
}

function serveStatic(pathname, response) {
  const file = staticFiles[pathname];
  if (!file) return false;
  const content = fs.readFileSync(path.join(__dirname, "..", file[0]));
  response.writeHead(200, {
    "Content-Type": file[1],
    "Content-Length": content.length
  });
  response.end(content);
  return true;
}

function createApp({ store = new Store() } = {}) {
  return http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, "http://localhost");
      if (request.method === "GET" && serveStatic(url.pathname, response)) return;

      const segments = url.pathname.split("/").filter(Boolean);
      if (segments[0] !== "api") throw ApiError.notFound("Route not found");
      const resource = segments[1];

      if (resource === "products" && segments.length === 2) {
        if (request.method === "GET") {
          const products = store.listProducts({
            category: url.searchParams.get("category") || undefined,
            search: url.searchParams.get("search") || undefined
          });
          sendJson(response, 200, { data: products });
          return;
        }
        if (request.method === "POST") {
          const product = await store.createProduct(validateProduct(await readJsonBody(request)));
          sendJson(response, 201, { data: product });
          return;
        }
      }

      if (resource === "products" && segments.length === 3) {
        const id = parseId(segments[2]);
        if (request.method === "GET") {
          const product = store.getProduct(id);
          if (!product) throw ApiError.notFound("Product not found");
          sendJson(response, 200, { data: product });
          return;
        }
        if (request.method === "PUT" || request.method === "PATCH") {
          const attributes = validateProduct(await readJsonBody(request), {
            partial: request.method === "PATCH"
          });
          const product = await store.updateProduct(id, attributes, {
            replace: request.method === "PUT"
          });
          if (!product) throw ApiError.notFound("Product not found");
          sendJson(response, 200, { data: product });
          return;
        }
        if (request.method === "DELETE") {
          if (!await store.deleteProduct(id)) throw ApiError.notFound("Product not found");
          sendJson(response, 200, { data: { message: "Product deleted" } });
          return;
        }
      }

      if (resource === "cart" && segments.length === 2) {
        const cartId = getCartId(request);
        if (request.method === "GET") {
          sendJson(response, 200, { data: store.getCart(cartId) });
          return;
        }
        if (request.method === "POST") {
          const body = validateObject(await readJsonBody(request));
          if (!Number.isSafeInteger(body.productId) || body.productId < 1) {
            throw ApiError.badRequest("productId must be a positive integer");
          }
          const quantity = body.quantity === undefined ? 1 : body.quantity;
          if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 99) {
            throw ApiError.badRequest("quantity must be an integer between 1 and 99");
          }
          sendJson(response, 200, {
            data: await store.addCartItem(cartId, body.productId, quantity)
          });
          return;
        }
      }

      if (resource === "cart" && segments[2] === "items" && segments.length === 4) {
        const cartId = getCartId(request);
        const productId = parseId(segments[3]);
        if (request.method === "PATCH") {
          const body = validateObject(await readJsonBody(request));
          if (!Number.isSafeInteger(body.quantity) || body.quantity < 0 || body.quantity > 99) {
            throw ApiError.badRequest("quantity must be an integer between 0 and 99");
          }
          sendJson(response, 200, {
            data: await store.setCartQuantity(cartId, productId, body.quantity)
          });
          return;
        }
        if (request.method === "DELETE") {
          sendJson(response, 200, {
            data: await store.removeCartItem(cartId, productId)
          });
          return;
        }
      }

      if (resource === "orders" && segments.length === 2) {
        if (request.method === "GET") {
          sendJson(response, 200, { data: store.listOrders() });
          return;
        }
        if (request.method === "POST") {
          const customer = validateCustomer(await readJsonBody(request));
          const order = await store.createOrder(getCartId(request), customer);
          sendJson(response, 201, { data: order });
          return;
        }
      }

      if (resource === "orders" && segments.length === 3 && request.method === "GET") {
        const order = store.getOrder(parseId(segments[2]));
        if (!order) throw ApiError.notFound("Order not found");
        sendJson(response, 200, { data: order });
        return;
      }

      throw ApiError.notFound("Route not found");
    } catch (error) {
      const status = Number.isInteger(error.status) ? error.status : 500;
      if (status === 500) console.error(error);
      if (!response.headersSent) {
        sendJson(response, status, {
          error: { message: status === 500 ? "Internal server error" : error.message }
        });
      } else {
        response.destroy();
      }
    }
  });
}

module.exports = { createApp, MAX_BODY_SIZE };
