const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const ApiError = require("./ApiError");

const seedProducts = [
  {
    id: 1,
    name: "Still Form Cup",
    price: 28,
    category: "Tableware",
    description: "Hand-thrown stoneware · Clay and chalk",
    image: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=900&q=85",
    tag: "BESTSELLER",
    rating: 4.9,
    reviewCount: 86
  },
  {
    id: 2,
    name: "Evening Glow Lamp",
    price: 96,
    category: "Lighting",
    description: "Brushed brass and linen",
    image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=85",
    tag: "NEW",
    rating: 4.8,
    reviewCount: 42
  },
  {
    id: 3,
    name: "Sunday Linen Throw",
    price: 74,
    category: "Textiles",
    description: "Oat · European flax",
    image: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=900&q=85",
    tag: "MAKER PICK",
    rating: 4.9,
    reviewCount: 31
  },
  {
    id: 4,
    name: "Quiet Shape Vase",
    price: 52,
    category: "Decor",
    description: "Chalk · Hand-finished ceramic",
    image: "https://images.unsplash.com/photo-1578500494198-246f612d3b3d?auto=format&fit=crop&w=900&q=85",
    tag: "LIMITED RUN",
    rating: 4.7,
    reviewCount: 19
  }
];

class Store {
  constructor(filePath = path.join(__dirname, "..", "data", "store.json")) {
    this.filePath = filePath;
    this.writeQueue = Promise.resolve();
    fs.mkdirSync(path.dirname(filePath), { recursive: true });

    if (fs.existsSync(filePath)) {
      this.state = JSON.parse(fs.readFileSync(filePath, "utf8"));
      this.assertState();
    } else {
      this.state = {
        products: seedProducts.map((product) => ({ ...product })),
        carts: {},
        orders: [],
        nextProductId: 5,
        nextOrderId: 1
      };
      fs.writeFileSync(filePath, JSON.stringify(this.state, null, 2));
    }
  }

  assertState() {
    const valid =
      this.state &&
      Array.isArray(this.state.products) &&
      this.state.carts &&
      typeof this.state.carts === "object" &&
      Array.isArray(this.state.orders) &&
      Number.isSafeInteger(this.state.nextProductId) &&
      Number.isSafeInteger(this.state.nextOrderId);
    if (!valid) {
      throw new Error(`Invalid persistent store data in ${this.filePath}`);
    }
  }

  async persist() {
    const operation = this.writeQueue.then(async () => {
      const temporaryPath = `${this.filePath}.${randomUUID()}.tmp`;
      try {
        await fs.promises.writeFile(temporaryPath, JSON.stringify(this.state, null, 2));
        await fs.promises.rename(temporaryPath, this.filePath);
      } catch (error) {
        await fs.promises.rm(temporaryPath, { force: true }).catch(() => {});
        throw error;
      }
    });
    this.writeQueue = operation.catch(() => {});
    await operation;
  }

  listProducts({ category, search } = {}) {
    return this.state.products
      .filter((product) => !category || product.category.toLowerCase() === category.toLowerCase())
      .filter((product) => !search || `${product.name} ${product.description}`.toLowerCase().includes(search.toLowerCase()))
      .map((product) => ({ ...product }));
  }

  getProduct(id) {
    const product = this.state.products.find((item) => item.id === id);
    return product ? { ...product } : null;
  }

  async createProduct(attributes) {
    const product = { id: this.state.nextProductId++, ...attributes };
    this.state.products.push(product);
    await this.persist();
    return { ...product };
  }

  async updateProduct(id, attributes, { replace = false } = {}) {
    const index = this.state.products.findIndex((product) => product.id === id);
    if (index < 0) return null;
    const product = replace
      ? { id, ...attributes }
      : { ...this.state.products[index], ...attributes, id };
    this.state.products[index] = product;
    await this.persist();
    return { ...product };
  }

  async deleteProduct(id) {
    const index = this.state.products.findIndex((product) => product.id === id);
    if (index < 0) return false;
    this.state.products.splice(index, 1);
    for (const cart of Object.values(this.state.carts)) {
      cart.items = cart.items.filter((item) => item.productId !== id);
    }
    await this.persist();
    return true;
  }

  getCart(cartId) {
    const cart = this.state.carts[cartId] || { items: [] };
    return this.expandCart(cart);
  }

  async addCartItem(cartId, productId, quantity) {
    if (!this.getProduct(productId)) throw ApiError.notFound("Product not found");
    const cart = this.getOrCreateCart(cartId);
    const item = cart.items.find((entry) => entry.productId === productId);
    if (item) item.quantity = Math.min(99, item.quantity + quantity);
    else cart.items.push({ productId, quantity });
    await this.persist();
    return this.expandCart(cart);
  }

  async setCartQuantity(cartId, productId, quantity) {
    const cart = this.state.carts[cartId];
    if (!cart || !cart.items.some((item) => item.productId === productId)) {
      throw ApiError.notFound("Cart item not found");
    }
    if (quantity === 0) {
      cart.items = cart.items.filter((item) => item.productId !== productId);
    } else {
      cart.items.find((item) => item.productId === productId).quantity = quantity;
    }
    await this.persist();
    return this.expandCart(cart);
  }

  async removeCartItem(cartId, productId) {
    const cart = this.state.carts[cartId];
    if (!cart || !cart.items.some((item) => item.productId === productId)) {
      throw ApiError.notFound("Cart item not found");
    }
    cart.items = cart.items.filter((item) => item.productId !== productId);
    await this.persist();
    return this.expandCart(cart);
  }

  async createOrder(cartId, customer) {
    const cart = this.state.carts[cartId];
    if (!cart || cart.items.length === 0) {
      throw ApiError.badRequest("Cannot create an order with an empty cart");
    }
    const items = cart.items.map((entry) => {
      const product = this.getProduct(entry.productId);
      if (!product) throw ApiError.conflict("A cart product is no longer available");
      return {
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: entry.quantity,
        lineTotal: Number((product.price * entry.quantity).toFixed(2))
      };
    });
    const subtotal = Number(items.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2));
    const order = {
      id: this.state.nextOrderId++,
      items,
      subtotal,
      shipping: subtotal >= 75 ? 0 : 8,
      total: Number((subtotal + (subtotal >= 75 ? 0 : 8)).toFixed(2)),
      customer,
      status: "received",
      createdAt: new Date().toISOString()
    };
    this.state.orders.push(order);
    cart.items = [];
    await this.persist();
    return JSON.parse(JSON.stringify(order));
  }

  listOrders() {
    return JSON.parse(JSON.stringify(this.state.orders));
  }

  getOrder(id) {
    const order = this.state.orders.find((item) => item.id === id);
    return order ? JSON.parse(JSON.stringify(order)) : null;
  }

  getOrCreateCart(cartId) {
    if (!this.state.carts[cartId]) this.state.carts[cartId] = { items: [] };
    return this.state.carts[cartId];
  }

  expandCart(cart) {
    const items = cart.items.flatMap((entry) => {
      const product = this.getProduct(entry.productId);
      return product ? [{
        product: { ...product },
        quantity: entry.quantity,
        lineTotal: Number((product.price * entry.quantity).toFixed(2))
      }] : [];
    });
    const subtotal = Number(items.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2));
    const shipping = subtotal === 0 || subtotal >= 75 ? 0 : 8;
    return { items, subtotal, shipping, total: Number((subtotal + shipping).toFixed(2)) };
  }
}

module.exports = Store;
