/**
 * Smoke-run levelEditorMod.alterSnakeCode against a snake.js build.
 * Usage: node tools/run-alter-smoke.mjs [path/to/snake.js]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import vm from "vm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const snakePath = process.argv[2] || path.join(process.env.TEMP || "/tmp", "snake_current.js");
const modPath = path.join(repoRoot, "modloadercode.js");

function diagnoseRegexError() {
  throw new Error("regex diagnose triggered");
}

function assertReplace(baseText, regex, replacement) {
  const outputText = baseText.replace(regex, replacement);
  if (baseText === outputText) {
    throw new Error("assertReplace failed: " + regex);
  }
  return outputText;
}

function findFunctionInCode(code, functionSignature, somethingInsideFunction, logging = false) {
  let functionSignatureSource = functionSignature.source;
  let functionSignatureFlags = functionSignature.flags;
  if (!functionSignatureFlags.includes("g")) functionSignatureFlags += "g";
  // Match modloader behaviour: strip trailing $
  functionSignatureSource = functionSignatureSource.replaceAll(/\$(?=\|)|\$$/g, "");
  functionSignature = new RegExp(functionSignatureSource, functionSignatureFlags);

  const indexWithinFunction = code.search(somethingInsideFunction);
  if (indexWithinFunction === -1) {
    throw new Error("Couldn't find somethingInsideFunction: " + somethingInsideFunction);
  }

  const codeBeforeMatch = code.substring(0, indexWithinFunction);
  const signatureMatches = [...codeBeforeMatch.matchAll(functionSignature)];
  if (signatureMatches.length === 0) {
    throw new Error("Couldn't find function signature: " + functionSignature + " before " + somethingInsideFunction);
  }

  const startIndex = signatureMatches[signatureMatches.length - 1].index;
  const matchedSig = signatureMatches[signatureMatches.length - 1][0];
  let bracketCount = 0;
  let foundFirstBracket = false;
  let endIndex = 0;
  for (let i = startIndex; i <= code.length; i++) {
    if (!foundFirstBracket && code[i] === "{") foundFirstBracket = true;
    if (code[i] === "{") bracketCount++;
    if (code[i] === "}") bracketCount--;
    if (foundFirstBracket && bracketCount === 0) {
      endIndex = i;
      break;
    }
    if (i === code.length) throw new Error("Couldn't pair up brackets for " + matchedSig);
  }

  const fullFunction = code.substring(startIndex, endIndex + 1);
  if (fullFunction.search(somethingInsideFunction) === -1) {
    throw new Error(
      "Function signature does not belong to the same function as somethingInsideFunction. sig=" +
        matchedSig +
        " inside=" +
        somethingInsideFunction +
        " snip=" +
        fullFunction.slice(0, 160)
    );
  }
  if (logging) console.log(fullFunction.slice(0, 120) + "...");
  return fullFunction;
}

function appendCodeWithinSnakeModule(snakeCode, codeToAdd, addSemicolonAfter) {
  if (addSemicolonAfter) codeToAdd += ";";
  const replaced = snakeCode.replace(
    /}\)\(this\._s\);\n\/\/ Google Inc\.|}\);\n\/\/ Google Inc\./,
    codeToAdd + "$&"
  );
  if (replaced === snakeCode) {
    throw new Error("appendCodeWithinSnakeModule failed to find module end marker");
  }
  return replaced;
}

String.prototype.assertReplace = function (regex, replacement) {
  return assertReplace(this.toString(), regex, replacement);
};
String.prototype.assertMatch = function (regex) {
  const m = this.toString().match(regex);
  if (!m) throw new Error("assertMatch failed: " + regex);
  return m;
};

const sandbox = {
  console,
  findFunctionInCode,
  assertReplace,
  appendCodeWithinSnakeModule,
};
// Mirror browser globals: globalThis.X assignments are visible as free vars
sandbox.globalThis = sandbox;
sandbox.window = sandbox;

// Install String helpers inside the VM realm
vm.runInNewContext(
  `
  String.prototype.assertReplace = function(regex, replacement) {
    return assertReplace(this.toString(), regex, replacement);
  };
  String.prototype.assertMatch = function(regex) {
    const m = this.toString().match(regex);
    if (!m) throw new Error("assertMatch failed: " + regex);
    return m;
  };
  `,
  sandbox
);

const modCode = fs.readFileSync(modPath, "utf8");
// Only evaluate the alterSnakeCode assignment block by extracting it
const start = modCode.indexOf("window.levelEditorMod.alterSnakeCode = function");
const end = modCode.search(/\/\/{10,}\r?\n\/\/RUNCODEAFTER/);
if (start < 0 || end < 0) throw new Error("Could not locate alterSnakeCode in modloadercode.js");

sandbox.window.levelEditorMod = {};
vm.runInNewContext(modCode.slice(start, end), sandbox, { filename: "alterSnakeCode.js" });

const snakeCode = fs.readFileSync(snakePath, "utf8");
console.log(`Running alterSnakeCode on ${snakePath} (${snakeCode.length} bytes)...`);

const out = sandbox.window.levelEditorMod.alterSnakeCode(snakeCode);
console.log(`OK: altered code length ${out.length} (delta ${out.length - snakeCode.length})`);
console.log("Captured:", {
  tileWidth: sandbox.globalThis.tileWidth,
  makeApple: sandbox.globalThis.makeApple,
  appleArray: sandbox.globalThis.appleArray,
  coordConstructor: sandbox.globalThis.coordConstructor,
  boardDimensions: sandbox.globalThis.boardDimensions,
  changeSettingFuncName: sandbox.globalThis.changeSettingFuncName,
  fullResetFuncName: sandbox.globalThis.fullResetFuncName,
});

if (!out.includes("ensureGameMode")) throw new Error("ensureGameMode missing from output");
if (!out.includes("simpleHookManager.runHook('afterResetBoard')")) {
  throw new Error("afterResetBoard hook missing from output");
}
if (!out.includes("globalThis.wholeSnakeObject = this")) {
  throw new Error("wholeSnakeObject injection missing");
}
if (!out.includes("globalThis.megaWholeSnakeObject = this")) {
  throw new Error("megaWholeSnakeObject injection missing");
}

console.log("Smoke run passed.");
