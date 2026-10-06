import { existsSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import ts from "typescript";

const sdkStub = new URL("./chain-sdk.mjs", import.meta.url).href;
const sourceExtensions = ["", ".ts", ".tsx", "/index.ts"];
const srcRoot = new URL("../../src/", import.meta.url);

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "@chain/sdk") return { url: sdkStub, shortCircuit: true };
  if (specifier.endsWith("?url")) {
    const { url } = await resolve(specifier.slice(0, -"?url".length), context, nextResolve);
    return { url: `${url}?url`, shortCircuit: true };
  }
  const fromSrc = specifier.startsWith("@/");
  if (fromSrc || (specifier.startsWith(".") && context.parentURL?.startsWith("file:"))) {
    for (const extension of sourceExtensions) {
      const url = fromSrc
        ? new URL(specifier.slice(2) + extension, srcRoot)
        : new URL(specifier + extension, context.parentURL);
      const path = fileURLToPath(url);
      if (existsSync(path) && statSync(path).isFile()) return { url: url.href, shortCircuit: true };
    }
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.endsWith("?url"))
    return {
      format: "module",
      source: `export default ${JSON.stringify(url.slice(0, -"?url".length))};`,
      shortCircuit: true
    };
  if (!/\.tsx?$/.test(url)) return nextLoad(url, context);
  const source = await readFile(fileURLToPath(url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    fileName: fileURLToPath(url),
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.ReactJSX
    }
  });
  return { format: "module", source: outputText, shortCircuit: true };
}
