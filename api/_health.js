// Plain JS, CommonJS-style export — bypasses TS compilation, ESM resolution,
// and any module/type issues. If this works while the .ts files don't,
// the bug is in TypeScript/ESM handling for api/* on Vercel's bundler.
module.exports = function handler(_req, res) {
  res.status(200).json({ ok: true, where: 'health-js' });
};
