const { createApp } = require("./src/app");

const port = Number(process.env.PORT) || 3001;
const server = createApp();

server.listen(port, () => {
  console.log(`Morrow Supply API listening at http://localhost:${port}`);
});
