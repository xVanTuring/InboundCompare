const md5File = require("md5-file");
const fs = require("fs");
const BUILTIN_IGNORE = ["node_modules", ".git", ".gitignore"];
const { resolve, relative } = require("path");
const { readdir } = require("fs").promises;
const URLPREFIX = "";

async function* getFiles(dir) {
  const dirents = await readdir(dir, { withFileTypes: true });
  for (const dirent of dirents) {
    if (BUILTIN_IGNORE.includes(dirent.name)) {
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
    return printUsage();
  }
  const folder1 = process.argv[2];
  const folder2 = process.argv[3];
  const twoFolder =
    fs.statSync(folder1).isDirectory() && fs.statSync(folder2).isDirectory();
  if (!twoFolder) {
    return printUsage();
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
  let oldKeys = Array.from(mapOld.keys());
  let intersection = newKeys.filter((x) => oldKeys.includes(x));

  let list = [];
  intersection.forEach((f) => {
    if (mapNew.get(f) !== mapOld.get(f)) {
      list.push(URLPREFIX + f.replace(/\\/g, "/"));
    }
  });
  console.log(list);
}
run();
