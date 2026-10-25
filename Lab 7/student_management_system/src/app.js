const http = require("node:http");
const { URL } = require("node:url");
const ApiError = require("./ApiError");
const { createEntities } = require("./entities");

const MAX_BODY_SIZE = 64 * 1024;

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

function parseId(segment) {
  if (!/^[1-9]\d*$/.test(segment)) {
    throw ApiError.badRequest("ID must be a positive integer");
  }
  const id = Number(segment);
  if (!Number.isSafeInteger(id)) {
    throw ApiError.badRequest("ID must be a safe integer");
  }
  return id;
}

function sendJson(response, status, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body)
  });
  response.end(body);
}

function createApp({ entities = createEntities() } = {}) {
  return http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, "http://localhost");
      const segments = url.pathname.split("/").filter(Boolean).map((segment) => {
        try {
          return decodeURIComponent(segment);
        } catch {
          throw ApiError.badRequest("Malformed URL path");
        }
      });
      if (segments.length < 1 || segments.length > 2) {
        throw ApiError.notFound("Route not found");
      }

      const controller = entities[segments[0]];
      if (!controller) throw ApiError.notFound("Route not found");
      const id = segments.length === 2 ? parseId(segments[1]) : null;
      let result;
      let status = 200;

      if (request.method === "GET" && id === null) {
        result = controller.list(Object.fromEntries(url.searchParams.entries()));
      } else if (request.method === "GET" && id !== null) {
        result = controller.show(id);
      } else if (request.method === "POST" && id === null) {
        result = controller.create(await readJsonBody(request));
        status = 201;
      } else if (request.method === "PUT" && id !== null) {
        result = controller.replace(id, await readJsonBody(request));
      } else if (request.method === "PATCH" && id !== null) {
        result = controller.patch(id, await readJsonBody(request));
      } else if (request.method === "DELETE" && id !== null) {
        result = controller.destroy(id);
      } else {
        throw new ApiError(405, "Method not allowed");
      }

      sendJson(response, status, { data: result });
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
