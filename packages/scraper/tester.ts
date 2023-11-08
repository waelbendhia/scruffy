import * as path from "node:path";

console.log(path.join("http://scaruffi.com", "/vol1/beatles.html"));
console.log(path.join("http://scaruffi.com/", "/vol1/beatles.html"));
console.log(path.join("http://scaruffi.com", "vol1/beatles.html"));
