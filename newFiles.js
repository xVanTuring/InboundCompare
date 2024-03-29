const md5File = require("md5-file");
const fs = require("fs");
const BUILTIN_IGNORE = ["node_modules", ".git", ".gitignore", ".DS_Store"];
const { resolve, relative, basename } = require("path");
const path = require("path");
const { readdir } = require("fs").promises;
const fse = require("fs-extra");
const URLPREFIX = "";

async function* getFiles(dir) {
  const dirents = await readdir(dir, { withFileTypes: true });
  for (const dirent of dirents) {
    if (BUILTIN_IGNORE.includes(basename(dirent.name))) {
      continue;
    }
    const res = resolve(dir, dirent.name);
    if (dirent.isDirectory()) {
      yield* getFiles(res);
    } else {
      yield res;
    }
  }
}

function checkInput() {
  if (process.argv.length !== 4) {
    printUsage();
    process.exit();
  }
  const folder1 = process.argv[2];
  const folder2 = process.argv[3];
  const twoFolder =
    fs.statSync(folder1).isDirectory() && fs.statSync(folder2).isDirectory();
  if (!twoFolder) {
    printUsage();
    process.exit();
  }
  return {
    old: folder1,
    new: folder2,
  };
}
function printUsage() {
  console.log("========================");
  console.log("Usage:");
  console.log("node index.js oldFolder newFolder");
  console.log("========================");
}

const mapNew = new Map();
const mapOld = new Map();

async function processFolder(map, dir) {
  for await (const fName of getFiles(dir)) {
    const hash = await md5File(fName);
    map.set(relative(dir, fName), hash);
  }
}

async function run() {
  const result = checkInput();
  await Promise.all([
    processFolder(mapNew, result.new),
    processFolder(mapOld, result.old),
  ]);
  let newKeys = Array.from(mapNew.keys());
  let oldKeys = new Set(Array.from(mapOld.keys()));
  let intersection = newKeys.filter((x) => !oldKeys.has(x));
  const folder2 = process.argv[3];
  for (const file of intersection) {
    const targetPath = path.join("./result", file);
    const sourcePath = path.join(folder2, file);
    console.log(sourcePath, "->", targetPath);
    await fse.copy(sourcePath, targetPath);
  }
}
run();
