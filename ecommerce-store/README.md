# Morrow Supply REST API

The storefront and API use only native Node.js modules. Product, cart, and order
data is stored in `data/store.json` and survives server restarts. The first
server run creates the file with the four products from the storefront.

## Run

From this directory:

```sh
node server.js
```

Open `http://localhost:3001`. Set `PORT` to choose a different port. The cart
identifier is sent as the `x-cart-id` header; the storefront creates and saves
one in browser local storage.

Successful responses use `{ "data": ... }`; errors use
`{ "error": { "message": "..." } }`.

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/products` | List products; optional `category` and `search` query filters |
| GET | `/api/products/:id` | Read one product |
| POST | `/api/products` | Create a product |
| PUT | `/api/products/:id` | Replace a product |
| PATCH | `/api/products/:id` | Update supplied product fields |
| DELETE | `/api/products/:id` | Delete a product and remove it from carts |
| GET | `/api/cart` | Read this cart and its totals |
| POST | `/api/cart` | Add `{ "productId": 1, "quantity": 1 }` |
| PATCH | `/api/cart/items/:productId` | Set item quantity; zero removes the item |
| DELETE | `/api/cart/items/:productId` | Remove an item |
| GET | `/api/orders` | List saved orders |
| GET | `/api/orders/:id` | Read one saved order |
| POST | `/api/orders` | Create an order from the cart and clear the cart |

Product create/update bodies require `name`, `price`, `category`, `description`,
and `image`. Order creation requires `firstName`, `lastName`, `email`, `address`,
`city`, `postalCode`, and `payment`. This demo records orders but does not
process payments or authenticate customers.

Run the API tests with `npm test`.
