#!/usr/bin/env node
/**
 * 将 Sub-Store proxy-utils 源码打包成 substorebot 可用的 proxy-utils.esm.js
 */
const fs = require('node:fs');
const path = require('node:path');
const peggy = require('peggy');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'src');
const BUILD = path.join(ROOT, '.build');
const PEGGY_DIR = path.join(BUILD, 'src/core/proxy-utils/parsers/peggy');
const GENERATED_DIR = path.join(PEGGY_DIR, 'generated');
const PROJECT_ROOT = path.resolve(ROOT, '..');
const OUTPUT = path.join(PROJECT_ROOT, '..', 'proxy-utils.esm.js');

function ensureDir(dirPath) {
    fs.mkdirSync(dirPath, { recursive: true });
}

function cleanBuild() {
    fs.rmSync(BUILD, { recursive: true, force: true });
    ensureDir(BUILD);
    fs.cpSync(SRC, path.join(BUILD, 'src'), { recursive: true });
}

function extractGrammar(source) {
    const startMarker = 'String.raw`';
    const startIdx = source.indexOf(startMarker);
    if (startIdx === -1) return null;
    const grammarStart = startIdx + startMarker.length;
    let i = grammarStart;
    while (i < source.length) {
        if (source[i] === '\\') {
            i += 2;
            continue;
        }
        if (source[i] === '`') {
            return source.substring(grammarStart, i);
        }
        i++;
    }
    return null;
}

function compilePeggy() {
    ensureDir(GENERATED_DIR);
    const jsFiles = fs.readdirSync(PEGGY_DIR)
        .filter((f) => f.endsWith('.js') && fs.readFileSync(path.join(PEGGY_DIR, f), 'utf-8').includes('String.raw`'))
        .sort();

    console.log('Pre-compiling Peggy grammars...');
    for (const fileName of jsFiles) {
        const sourcePath = path.join(PEGGY_DIR, fileName);
        const baseName = path.parse(fileName).name;
        const outputPath = path.join(GENERATED_DIR, `${baseName}.js`);

        const source = fs.readFileSync(sourcePath, 'utf-8');
        const grammar = extractGrammar(source);
        if (!grammar) {
            throw new Error(`Could not extract grammar from ${fileName}`);
        }
        const parserSource = peggy.generate(grammar, { output: 'source', format: 'es' });
        fs.writeFileSync(
            outputPath,
            `// Auto-generated from ${fileName} - DO NOT EDIT\n${parserSource}\nlet cachedParser = null;\nexport default function getParser() {\n    if (!cachedParser) {\n        cachedParser = peg$parse;\n        cachedParser.parse = peg$parse;\n    }\n    return cachedParser;\n}\n`,
            'utf-8',
        );
        console.log(`  Generated: ${path.relative(ROOT, outputPath)}`);
    }

    // Rewrite parsers/index.js imports
    const parsersIndexPath = path.join(BUILD, 'src/core/proxy-utils/parsers/index.js');
    let indexSource = fs.readFileSync(parsersIndexPath, 'utf-8');
    for (const fileName of jsFiles) {
        const baseName = path.parse(fileName).name;
        indexSource = indexSource.replaceAll(`./peggy/${baseName}`, `./peggy/generated/${baseName}`);
    }
    fs.writeFileSync(parsersIndexPath, indexSource, 'utf-8');
    console.log(`  Rewired: ${path.relative(ROOT, parsersIndexPath)}`);
}

function aliasPlugin() {
    return {
        name: 'alias',
        resolveId(source, importer) {
            if (source === 'buffer') {
                const bufferPath = path.join(BUILD, 'src', 'buffer.js');
                if (fs.existsSync(bufferPath)) return bufferPath;
            }
            if (source.startsWith('@/')) {
                const base = path.join(BUILD, 'src', source.slice(2));
                if (fs.existsSync(base) && fs.statSync(base).isDirectory()) {
                    return path.join(base, 'index.js');
                }
                const withJs = base.endsWith('.js') ? base : `${base}.js`;
                if (fs.existsSync(withJs)) {
                    return withJs;
                }
            }
            return null;
        },
    };
}

async function bundle() {
    console.log('Starting bundle...');
    const rollup = require('rollup');
    const { nodeResolve } = require('@rollup/plugin-node-resolve');
    const commonjs = require('@rollup/plugin-commonjs');
    const json = require('@rollup/plugin-json');
    console.log('Rollup modules loaded');

    const entryPoint = path.join(BUILD, 'src/core/proxy-utils/index.js');
    const bundle = await rollup.rollup({
        input: entryPoint,
        plugins: [
            aliasPlugin(),
            json(),
            commonjs({
                ignoreTryCatch: true,
            }),
            nodeResolve({
                preferBuiltins: false,
                browser: true,
            }),
        ],
    });

    const { output } = await bundle.generate({
        format: 'esm',
        exports: 'named',
    });

    let code = output[0].code;

    // CF Worker 没有 process，补一个最小 shim
    code = `/* Sub-Store proxy-utils for substorebot | built from sub-store-org/Sub-Store master */\nconst process = { env: { NODE_ENV: 'production' }, nextTick: (cb) => cb(), platform: '', version: '' };\n${code}`;

    fs.writeFileSync(OUTPUT, code, 'utf-8');
    console.log(`\nOutput: ${OUTPUT}`);
    console.log(`Size: ${(fs.statSync(OUTPUT).size / 1024).toFixed(2)} KB`);
}

(async () => {
    cleanBuild();
    compilePeggy();
    await bundle();
})().catch((err) => {
    console.error(err);
    process.exit(1);
});
