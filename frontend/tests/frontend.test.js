const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

describe('Frontend Integrity & Syntax Tests', () => {
  const publicDir = path.join(__dirname, '..', 'public');
  const jsDir = path.join(publicDir, 'js');
  const cssFile = path.join(publicDir, 'css', 'output.css');

  const requiredHtmlFiles = [
    'index.html',
    'login.html',
    'signup.html',
    'dashboard.html',
    'problems.html',
    'problem.html',
    'add-problem.html',
    'stats.html',
    'forgot-password.html',
    'reset-password.html',
  ];

  const requiredJsFiles = [
    'api.js',
    'config.js',
    'dashboard.js',
    'palette.js',
    'theme.js',
  ];

  describe('HTML Document Validity', () => {
    for (const file of requiredHtmlFiles) {
      it(`verifies ${file} exists, has valid DOCTYPE, and CYBN branding`, () => {
        const filePath = path.join(publicDir, file);
        assert.ok(fs.existsSync(filePath), `${file} should exist`);

        const content = fs.readFileSync(filePath, 'utf8');
        assert.ok(content.includes('<!DOCTYPE html>'), `${file} must contain <!DOCTYPE html>`);
        assert.ok(content.includes('<meta name="viewport"'), `${file} must contain viewport meta tag`);
        assert.ok(content.includes('<title>'), `${file} must contain a <title> tag`);
        assert.ok(content.includes('CYBN') || content.includes('cybn'), `${file} must contain CYBN brand reference`);
      });
    }
  });

  describe('JavaScript Syntax Checks', () => {
    for (const file of requiredJsFiles) {
      it(`validates JS syntax with node --check for ${file}`, () => {
        const filePath = path.join(jsDir, file);
        assert.ok(fs.existsSync(filePath), `${file} should exist in public/js`);
        assert.doesNotThrow(() => {
          execSync(`node --check "${filePath}"`, { stdio: 'pipe' });
        }, `Syntax check failed for ${file}`);
      });
    }
  });

  describe('Tailwind CSS Production Build', () => {
    it('verifies output.css exists and has compiled utility classes', () => {
      assert.ok(fs.existsSync(cssFile), 'output.css must exist');
      const css = fs.readFileSync(cssFile, 'utf8');
      assert.ok(css.length > 5000, 'output.css should contain compiled styles (>5KB)');
      assert.ok(css.includes('font-sans') || css.includes('font-mono') || css.includes('flex'), 'output.css must contain Tailwind utilities');
    });
  });
});
