import { createServer, type Server } from "node:http"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))

export async function startFixtureServer(): Promise<{ url: string; close: () => Promise<void> }> {
  const html = readFileSync(join(__dirname, "fixtures/app.html"), "utf8")
  const server: Server = createServer((_req, res) => {
    res.writeHead(200, { "content-type": "text/html" })
    res.end(html)
  })
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  const addr = server.address()
  if (!addr || typeof addr === "string") throw new Error("server has no address")
  return {
    url: `http://127.0.0.1:${addr.port}/`,
    close: () => new Promise((res) => server.close(() => res())),
  }
}
