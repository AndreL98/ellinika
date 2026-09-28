// @ts-check
/**
 * Validates all content packs: JSON schemas plus cross-file rules.
 * Usage: node scripts/validate-content.mjs [packsDir] [schemaDir]
 */
import Ajv from 'ajv';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));

/** @param {string} file */
function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

/** @param {string} dir */
function jsonFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((name) => name.endsWith('.json')).sort();
}

/**
 * @param {string} schemaDir
 */
function loadValidators(schemaDir) {
  const ajv = new Ajv({ allErrors: true, strict: true });
  const pack = readJson(join(schemaDir, 'pack.schema.json'));
  const item = readJson(join(schemaDir, 'item.schema.json'));
  const gloss = readJson(join(schemaDir, 'gloss.schema.json'));
  ajv.addSchema(pack, 'pack.schema.json');
  ajv.addSchema(item, 'item.schema.json');
  ajv.addSchema(gloss, 'gloss.schema.json');
  return {
    pack: /** @type {import('ajv').ValidateFunction} */ (ajv.getSchema('pack.schema.json')),
    item: /** @type {import('ajv').ValidateFunction} */ (ajv.getSchema('item.schema.json')),
    gloss: /** @type {import('ajv').ValidateFunction} */ (ajv.getSchema('gloss.schema.json')),
  };
}

/**
 * @param {import('ajv').ValidateFunction} validate
 * @param {unknown} data
 * @param {string} file
 * @param {string[]} errors
 */
function checkSchema(validate, data, file, errors) {
  if (validate(data)) return true;
  for (const e of validate.errors ?? []) errors.push(`${file}: ${e.instancePath || '/'} ${e.message}`);
  return false;
}

/**
 * Approved texts need a reviewer and a review date (APP.md, content rules).
 * @param {string} file
 * @param {string} id
 * @param {{ status: string, reviewed_by?: string, reviewed_at?: string }} entry
 * @param {string[]} errors
 */
function checkApproval(file, id, entry, errors) {
  if (entry.status !== 'approved') return;
  if (!entry.reviewed_by?.trim()) errors.push(`${file}: ${id} is approved but reviewed_by is empty`);
  if (!entry.reviewed_at?.trim()) errors.push(`${file}: ${id} is approved but reviewed_at is empty`);
}

/**
 * @param {{ packsDir?: string, schemaDir?: string }} [options]
 * @returns {{ errors: string[], stats: { packs: number, items: number, texts: number, glosses: number } }}
 */
export function validateContent(options = {}) {
  const packsDir = options.packsDir ?? join(repoRoot, 'content', 'packs');
  const schemaDir = options.schemaDir ?? join(repoRoot, 'content', 'schema');
  const validators = loadValidators(schemaDir);
  /** @type {string[]} */
  const errors = [];
  const stats = { packs: 0, items: 0, texts: 0, glosses: 0 };

  const packNames = readdirSync(packsDir).filter((name) => statSync(join(packsDir, name)).isDirectory());
  for (const packName of packNames.sort()) {
    const packDir = join(packsDir, packName);
    const coreFile = `${packName}/core.json`;
    if (!existsSync(join(packDir, 'core.json'))) {
      errors.push(`${coreFile}: missing`);
      continue;
    }
    stats.packs += 1;

    const core = readJson(join(packDir, 'core.json'));
    if (!checkSchema(validators.pack, core, coreFile, errors)) continue;
    if (core.pack !== packName) errors.push(`${coreFile}: pack "${core.pack}" does not match folder "${packName}"`);

    /** @type {Set<string>} */
    const itemIds = new Set();
    for (const item of core.items) {
      if (itemIds.has(item.id)) errors.push(`${coreFile}: duplicate item id ${item.id}`);
      itemIds.add(item.id);
    }
    stats.items += itemIds.size;

    /** @type {Set<string>} */
    const unitIds = new Set();
    for (const unit of core.units) {
      if (unitIds.has(unit.id)) errors.push(`${coreFile}: duplicate unit id ${unit.id}`);
      unitIds.add(unit.id);
      for (const ref of unit.items) {
        if (!itemIds.has(ref)) errors.push(`${coreFile}: unit ${unit.id} references unknown item ${ref}`);
      }
    }

    for (const name of jsonFiles(packDir).filter((n) => n !== 'core.json')) {
      const file = `${packName}/${name}`;
      const data = readJson(join(packDir, name));
      if (!checkSchema(validators.item, data, file, errors)) continue;
      if (`${data.lang}.json` !== name) errors.push(`${file}: lang "${data.lang}" does not match file name`);
      for (const [id, entry] of Object.entries(data.items)) {
        if (!itemIds.has(id)) errors.push(`${file}: unknown item ${id} (not in core.json)`);
        checkApproval(file, id, entry, errors);
        stats.texts += 1;
      }
    }

    const glossDir = join(packDir, 'gloss');
    for (const name of jsonFiles(glossDir)) {
      const file = `${packName}/gloss/${name}`;
      const data = readJson(join(glossDir, name));
      if (!checkSchema(validators.gloss, data, file, errors)) continue;
      if (`${data.lang}.json` !== name) errors.push(`${file}: lang "${data.lang}" does not match file name`);
      for (const [id, entry] of Object.entries(data.items)) {
        if (!itemIds.has(id)) errors.push(`${file}: unknown item ${id} (not in core.json)`);
        checkApproval(file, id, entry, errors);
        stats.glosses += 1;
      }
      for (const id of Object.keys(data.units ?? {})) {
        if (!unitIds.has(id)) errors.push(`${file}: unknown unit ${id} (not in core.json)`);
      }
    }
  }

  return { errors, stats };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const [packsDir, schemaDir] = process.argv.slice(2);
  const { errors, stats } = validateContent({ packsDir, schemaDir });
  const summary = `${stats.packs} packs, ${stats.items} items, ${stats.texts} texts, ${stats.glosses} glosses`;
  if (errors.length > 0) {
    console.error(`Content validation failed (${errors.length} errors, ${summary}):`);
    for (const error of errors) console.error(`  - ${error}`);
    process.exit(1);
  }
  console.log(`Content OK: ${summary}`);
}
