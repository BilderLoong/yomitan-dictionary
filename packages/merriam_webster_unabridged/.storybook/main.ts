import type { StorybookConfig } from "@storybook/html-vite";

const config: StorybookConfig = {
  stories: ["../tests/rendered/**/*.stories.ts"],
  framework: {
    name: "@storybook/html-vite",
    options: {},
  },
  addons: ["@storybook/addon-vitest"],
  viteFinal: async (viteConfig) => {
    // The gitignored assets dir contains a broken tracked symlink
    // (termTagMap.tsv) and the multi-GB source database; watching it crashes
    // the file watcher and serves nothing.
    viteConfig.server = {
      ...viteConfig.server,
      watch: { ...viteConfig.server?.watch, ignored: ["**/assets/**"] },
    };
    return viteConfig;
  },
};

export default config;
