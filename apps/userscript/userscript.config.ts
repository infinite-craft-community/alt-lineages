import { defineConfig } from "usts/config";

export default defineConfig({
  header: {
    name: "Alternative Lineages",
    namespace: "rman.dev",
    match: "https://infinibrowser.wiki/item*",
    version: "4.0.1",
    description: "Adds alternative lineages to InfiniBrowser",
    grant: ["GM"],
    author: "gameroman",
    license: "MIT",
  },
});
