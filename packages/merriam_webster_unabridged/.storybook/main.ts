import type { StorybookConfig } from "@storybook/html-vite";

const config: StorybookConfig = {
  stories: ["../tests/rendered/**/*.stories.ts"],
  framework: {
    name: "@storybook/html-vite",
    options: {},
  },
  addons: ["@storybook/addon-vitest"],
  viteFinal: async (viteConfig) => {
    // The gitignored assets dir contains the source database.
    // Storybook does not need to watch or serve these files.
    viteConfig.server = {
      ...viteConfig.server,
      watch: { ...viteConfig.server?.watch, ignored: ["**/assets/**"] },
    };
    return viteConfig;
  },
};

export default config;
