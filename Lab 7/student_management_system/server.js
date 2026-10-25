const { createApp } = require("./src/app");

const port = Number(process.env.PORT) || 3000;
const server = createApp();

server.listen(port, () => {
  console.log(`Student Management API listening on port ${port}`);
});
