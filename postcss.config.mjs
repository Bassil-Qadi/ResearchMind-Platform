import { fileURLToPath } from "node:url";

/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    // Named explicitly: Tailwind otherwise looks for its config in the
    // process's working directory, which is not this folder when the dev
    // server is launched from elsewhere.
    tailwindcss: {
      config: fileURLToPath(new URL("./tailwind.config.ts", import.meta.url)),
    },
  },
};

export default config;
