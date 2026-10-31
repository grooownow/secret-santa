import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import nextPlugin from "@next/eslint-plugin-next";
import oxlint from "eslint-plugin-oxlint";
import boundaries from "eslint-plugin-boundaries";

export default defineConfig(
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      // Deliberately broken by design: every file under here carries one planted
      // rule violation, and the review skill's detection eval is scored on
      // finding them (scripts/skill-detection-eval.ts). Linting them would turn
      // the fixtures into lint errors, and "fixing" the lint errors would delete
      // the eval. They are only ever compiled inside a disposable worktree.
      "tests/fixtures/planted-defects/**",
    ],
  },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [tseslint.configs.recommended],
    plugins: { "@next/next": nextPlugin, boundaries },
    settings: {
      "import/resolver": { typescript: {} },
      "boundaries/include": ["src/**/*"],
      "boundaries/elements": [
        { type: "app", pattern: "src/app/**" },
        {
          type: "feature",
          pattern: "src/features/*",
          capture: ["featureName"],
        },
        {
          type: "shared",
          pattern: ["src/components/**", "src/lib/**", "src/db/**"],
        },
      ],
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      "no-restricted-properties": [
        "error",
        {
          object: "window",
          property: "location",
          message:
            "Use next/navigation (useRouter/redirect) instead of full page loads.",
        },
      ],
      "no-restricted-globals": [
        "error",
        {
          name: "location",
          message: "Use next/navigation instead of full page loads.",
        },
      ],
      // Import-direction rules (spec §5.7): app -> features -> shared(components|lib|db).
      // Cross-feature imports are only allowed via the target feature's index.ts/tsx;
      // a feature's own internal files are unrestricted for files within that same feature.
      //
      // NOTE: eslint-plugin-boundaries v7 merged the old `element-types` + `entry-point`
      // rules into a single `dependencies` rule with object-based policy selectors
      // (Handlebars `{{...}}` templates instead of the legacy `${...}` string syntax).
      // We use that current, non-deprecated syntax here instead of the brief's legacy
      // array/template shorthand, which no longer resolves captures correctly in v7.
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          message:
            "{{from.type}} may not import {{to.type}} (see docs/rules/architecture.md)",
          policies: [
            {
              from: { element: { type: "app" } },
              allow: {
                to: {
                  element: {
                    type: "feature",
                    fileInternalPath: ["index.ts", "index.tsx"],
                  },
                },
              },
            },
            {
              from: { element: { type: "app" } },
              allow: { to: { element: { type: "shared" } } },
            },
            {
              from: { element: { type: "feature" } },
              allow: { to: { element: { type: "shared" } } },
            },
            {
              from: { element: { type: "feature" } },
              allow: {
                to: {
                  element: {
                    type: "feature",
                    captured: {
                      featureName: "{{from.element.captured.featureName}}",
                    },
                  },
                },
              },
            },
            {
              from: { element: { type: "feature" } },
              allow: {
                to: {
                  element: {
                    type: "feature",
                    fileInternalPath: ["index.ts", "index.tsx"],
                  },
                },
              },
            },
            {
              from: { element: { type: "shared" } },
              allow: { to: { element: { type: "shared" } } },
            },
          ],
        },
      ],
    },
  },
  ...oxlint.configs["flat/recommended"],
);
