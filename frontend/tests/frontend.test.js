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
    'pwa.js',
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

  describe('Progressive Web App (PWA) Standards', () => {
    it('validates manifest.json exists, parses, and contains required PWA fields', () => {
      const manifestPath = path.join(publicDir, 'manifest.json');
      assert.ok(fs.existsSync(manifestPath), 'manifest.json must exist');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

      assert.equal(manifest.name, 'CYBN — Connect Your Brain Neurons');
      assert.equal(manifest.short_name, 'CYBN');
      assert.equal(manifest.display, 'standalone');
      assert.equal(manifest.theme_color, '#070913');
      assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 3, 'Must have at least 3 icons');
      assert.ok(Array.isArray(manifest.shortcuts), 'Must have shortcut actions');
    });

    it('verifies Service Worker sw.js syntax and precache list', () => {
      const swPath = path.join(publicDir, 'sw.js');
      assert.ok(fs.existsSync(swPath), 'sw.js must exist');
      assert.doesNotThrow(() => {
        execSync(`node --check "${swPath}"`, { stdio: 'pipe' });
      }, 'Syntax check failed for sw.js');

      const swContent = fs.readFileSync(swPath, 'utf8');
      assert.ok(swContent.includes('CACHE_NAME'), 'sw.js must define CACHE_NAME');
      assert.ok(swContent.includes('STATIC_ASSETS'), 'sw.js must define precache assets');
    });

    it('verifies generated PWA PNG icons exist and are non-empty', () => {
      const icons = [
        'icon-192.png',
        'icon-512.png',
        'icon-maskable-192.png',
        'icon-maskable-512.png',
      ];
      for (const icon of icons) {
        const iconPath = path.join(publicDir, 'assets', icon);
        assert.ok(fs.existsSync(iconPath), `${icon} should exist in assets`);
        const stat = fs.statSync(iconPath);
        assert.ok(stat.size > 1000, `${icon} must be > 1KB`);
      }
    });

    it('verifies all 10 HTML pages link to manifest and pwa.js', () => {
      for (const file of requiredHtmlFiles) {
        const filePath = path.join(publicDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        assert.ok(content.includes('rel="manifest"'), `${file} must link manifest.json`);
        assert.ok(content.includes('pwa.js'), `${file} must load pwa.js`);
        assert.ok(content.includes('js-pwa-install-btn'), `${file} must contain PWA install button`);
      }
    });
  });
});

