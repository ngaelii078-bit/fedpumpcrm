// Next on Windows exports prefetch files as __next.page/__PAGE__.txt,
// while the client asks for __next.page.__PAGE__.txt. Copy them to the flat name.
import { cpSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const out = join(import.meta.dirname, "out");
let n = 0;
function flatten(base, dir, prefix) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) flatten(base, p, `${prefix}.${f}`);
    else {
      cpSync(p, join(base, `${prefix}.${f}`));
      n++;
    }
  }
}
function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (!statSync(p).isDirectory()) continue;
    if (f.startsWith("__next.")) flatten(dir, p, f);
    else if (f !== "_next") walk(p);
  }
}
walk(out);
console.log(`postbuild: ${n} prefetch files flattened`);
