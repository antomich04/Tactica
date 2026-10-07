import { compile } from "json-schema-to-typescript";
import { readFileSync, writeFileSync } from "node:fs";

// Match the JSON that the backend actually sends, while still reading the models from backend.
function shim(def, label, notes) {
  if (!def.properties) return;
  def.required = Object.keys(def.properties);
  for (const [k, p] of Object.entries(def.properties))
    if (p.default === null && typeof p.type === "string") { p.type = [p.type, "null"]; notes.push(`${label}.${k}`); }
}

function withoutGeneratedComments(ts) {
  return ts.replace(/\/\*\*[\s\S]*?\*\/\n/g, "").replace(/\/\*[\s\S]*?\*\/\n\n?/g, "");
}

for (const [name, out] of [["event", "MatchEvent"], ["overlay", "Overlay"]]) {
  const schema = JSON.parse(readFileSync(`contracts/${name}.schema.json`, "utf8"));
  const notes = [];
  shim(schema, out, notes);
  for (const [n, def] of Object.entries(schema.$defs ?? {})) shim(def, n, notes);
  const ts = await compile(schema, out, {
    bannerComment: "",
    additionalProperties: false,
  });
  writeFileSync(`src/contracts/${name}.generated.ts`, withoutGeneratedComments(ts));
  console.log(`wrote src/contracts/${name}.generated.ts; widened to nullable: ${notes.join(", ") || "none"}`);
}
