# Changelog — Amadeco_OpcacheGui

All notable changes to this module are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [2.3.0] - 2026-04-13

React 19 / react-umd 19.2.5 migration.

### Added

- **`react-dom-client.min.js` vendor file** — React 19 removed official UMD builds and split
  `createRoot` / `hydrateRoot` into `react-dom/client`. The `react-umd` project
  (`https://github.com/magicdawn/react-umd/`) provides a compatible UMD build;
  `react-dom-client.umd.js` (v 19.2.5) is now vendored as
  `view/adminhtml/web/js/vendor/react-dom-client.min.js`.

### Changed

- **`requirejs-config.js`** — `react-dom/client` path added pointing to the new vendor file;
  shim entry declares `deps: ['react-dom']` and `exports: 'ReactDOMClient'`.

- **`gui.js` bootstrap** — `ReactDOMClient` loaded as a dedicated AMD dependency;
  `ReactDOMClient.createRoot()` replaces the previous `ReactDOM.createRoot()` call,
  resolving the `TypeError: ReactDOM.createRoot is not a function` runtime error.
  All other React APIs (`React.createElement`, class components, `React.Fragment`,
  `React.Component`) are unchanged and fully compatible with React 19.

---

## [2.2.2] - 2026-04-13

Admin UI polish and PHP 8.1 constructor property promotion.

### Added

- **Sort `<select>` inputs styled with Magento admin class** (`gui.js`, `gui.less`) —
  both sort-by and sort-direction dropdowns in the file-list filter bar now carry
  `className="admin__control-select"`, matching the existing `admin__control-text`
  on the search input. `gui.less` extends `.opcache-gui .paginate-filter .filter`
  with a flexbox gap layout and scoped height / padding / font-size overrides on
  `.admin__control-select` so the dropdowns sit inline and compact within the bar.

### Changed

- **Constructor property promotion** (`Block\Adminhtml\Gui`, `Controller\Adminhtml\Api\State`,
  `Controller\Adminhtml\Gui\Index`) — all injected dependencies migrated from
  separate `private $property` declarations + manual `$this->prop = $arg` assignments
  to PHP 8.1 `protected readonly` promoted constructor parameters. Separate `@var`
  docblocks and property declarations removed; constructor signatures are now
  self-documenting. No behaviour change.

---

## [2.2.1] - 2026-04-13

PHP 8.3 compatibility pass and serializer service-contract adoption.

### Changed

- **`SerializerInterface` replaces concrete `Serializer\Json`** (`Block\Adminhtml\Gui.php`) —
  the constructor parameter, `@var` docblock, and `use` statement now reference
  `Magento\Framework\Serialize\SerializerInterface` instead of the concrete
  `Magento\Framework\Serialize\Serializer\Json`. No `di.xml` preference needed:
  Magento's framework already maps the interface to `Serializer\Json` globally.
  Consumers can now substitute any serializer implementation without touching the block.

- **PHP 8.3 typed class constants** — all `const` declarations across the module
  now carry explicit type annotations, as required by PHP 8.3 best practices and
  the Magento 2.4.8 coding standard:
  - `Block\Adminhtml\Gui`: `private const int MIN_FREE_MEMORY_BYTES`,
    `private const int RECOMMENDED_MAX_FILES`, `private const int RECOMMENDED_MEMORY_MB`
  - `Controller\Adminhtml\Api\State`: `public const string ADMIN_RESOURCE`,
    `private const array ALLOWED_ACTIONS`, `private const array GET_PROXY_KEYS`
  - `Controller\Adminhtml\Gui\Index`: `public const string ADMIN_RESOURCE`

---

## [2.2.0] - 2026-04-13

Full Magento 2.4.8 coding-standard pass, security hardening, interface
introduction, and LESS/i18n corrections.

### Added

- **`Block\Adminhtml\GuiInterface`** — new interface covering all six public
  methods of `Gui` (`getOpcache`, `getOpcacheOption`, `getConfig`,
  `getSerializedConfig`, `getPerformanceData`, `isOpcacheAvailable`). Preference
  wired in `di.xml`. Consumers can now type-hint the interface rather than the
  concrete block.

- **`fr_FR.csv` — 30+ missing translations added** — all `__()` strings emitted
  by `Block\Adminhtml\Gui.php` (status card labels, warnings, errors) and the
  new JS strings introduced in v1.1.0 (real-time alert messages, "Real-time
  required", error-catch messages) were absent. All now translated.

### Fixed — Bugs

- **`@media` rules leaked outside `.opcache-gui` scope** (`gui.less`) — the two
  responsive breakpoints (750 px and 550 px) sat outside the `.opcache-gui { }`
  wrapper, applying generic class names like `.nav-tab-list` and `.nav-tab`
  globally across the Magento admin. Moved both `@media` blocks inside
  `.opcache-gui` so they compile to scoped selectors. `@keyframes pulse` kept
  at root level (CSS requirement).

- **Dead selectors removed from 750 px breakpoint** (`gui.less`) — `.nav-tab-link`
  and `.nav-tab-link[data-for].active` were referenced in the `@media` block but
  neither class exists in the stylesheet. Removed.

- **`#E5E7E7E7` → `#E5E7E7`** (`gui.less`) — the 8-digit hex on
  `@widget-graph-background-color` encoded an unintended 90 % alpha channel.
  Corrected to the 6-digit value.

- **`_beforeToHtml()` removed** (`Block\Adminhtml\Gui.php`) — the override
  called `$this->setData('opcache', $this->getOpcache())` but no template or
  method ever read that data key; calls went through the public `getOpcache()`
  method directly. The hook triggered `handle()` as a side-effect with no
  consumer. Removed entirely.

### Fixed — Magento 2.4.8 Standards

- **`<sequence>` added to `module.xml`** — `Magento_Backend` and `Magento_Csp`
  declared as load-order dependencies, preventing intermittent DI compilation
  failures.

- **`@return` docblock corrected in `State::execute()`** — was
  `\Magento\Framework\App\ResponseInterface`, now matches the actual return type
  `\Magento\Framework\Controller\ResultInterface`.

- **`@var` tags standardised in `State.php`** — all three property docblocks now
  use the short class name (matching the `use` statement) instead of a mix of
  FQN-with-`\` and bare names.

- **`getOpcacheOption()` return type added** — declared `mixed` per PHP 8.0+
  and Magento 2.4.8 standard.

- **Copyright header added to `State.php`**.

- **`"version": "1.1.1"` added to `composer.json`**.

- **French comment translated** (`gui.less`) — `/* Performance cards (isolé) */`
  → `/* Performance cards (scoped) */`.

- **`init.phtml` deleted** — orphaned template no longer referenced by any
  layout handle since v1.1.0 merged its content into `gui.phtml`.

- **`csp_whitelist.xml` deleted** — file had already been emptied in v1.1.0
  when CDN resources were removed; the empty `<policies>` element served no
  purpose.

### Fixed — Security

- **Exception message no longer returned to client** (`State.php`) — the `500`
  error response previously included `$e->getMessage()`, exposing internal
  detail (file paths, library state). The full exception is now logged via
  `LoggerInterface` and a generic `"An internal error occurred"` message is
  returned instead.

### Optimized

- **`getConfig()` result cached** (`Block\Adminhtml\Gui.php`) — the method
  previously rebuilt the config array on every call. Added a `?array $config`
  property; the array is built once and reused for subsequent calls within the
  same request.

---

## [2.1.1] - 2026-04-13

### Security

- **axios updated from 1.11.0 to 1.15.0** (`view/adminhtml/web/js/vendor/axios.min.js`) —
  axios `1.14.1` was a confirmed supply-chain compromise (2026-03-31, ~3h window):
  the malicious release injected `plain-crypto-js@4.2.1`, a remote-access trojan
  targeting macOS, Windows, and Linux. Projects using caret ranges (`^1.x`) on a
  fresh install during that window were silently infected. `1.15.0` is the current
  safe release and includes hardening against similar attacks. The vendored
  UMD build is updated in-place; no path or config change required.

---

## [2.1.0] - 2026-04-13

Full code-review pass. No behavioural regressions intended; all changes are
bug-fixes, security hardening, dead-code removal, or standards compliance.

### Fixed — Incorrect Behaviour

- **Non-realtime action paths were silent no-ops** (`view/adminhtml/web/js/gui.js`) —
  The `resetHandler`, `handleInvalidateAll`, and `handleInvalidate` methods each
  contained an `else` branch that fell back to `window.location.href = '?reset=1'`
  (and similar). These navigated to `opcache_gui/gui/index` which ignores those
  GET params entirely — the admin believed an action fired but nothing happened.
  Replaced all three dead branches with a `showAlert()` informing the user that
  real-time mode must be enabled to perform the action.

- **Dual block instantiation caused `OpcacheService::handle()` to run twice per
  page** (`view/adminhtml/layout/opcache_gui_gui_index.xml`) — two separate
  instances of `Block\Adminhtml\Gui` were registered (`opcache.gui` and
  `opcache.gui.init`), each with its own `$this->handled` cache. `handle()` calls
  `opcache_get_status(true)` which is expensive on large caches. Removed the
  second block; its `text/x-magento-init` output is now rendered at the bottom of
  `gui.phtml` by the single existing block instance.

- **`fetching` state never reset on polling response** (`gui.js`) — the realtime
  polling set `fetching: true` before the axios call but only updated `opstate`
  in the `.then()` handler, never clearing `fetching`. Added `fetching: false`
  to the success state update.

- **`UsageGraph` percentage formula was a no-op identity** (`gui.js`) —
  `Math.round(3.6 * props.value / 360 * 100)` simplifies to `Math.round(props.value)`
  since `3.6 / 360 * 100 === 1`. `props.value` is already a 0–100 percentage.
  Simplified to `Math.round(props.value)`.

### Fixed — Security

- **React and ReactDOM loaded from CDN without version lock** (`requirejs-config.js`) —
  paths used `react@18` (major only), allowing any future `18.x.x` release to
  silently replace the running code. Combined with loading from a public CDN, a
  compromised package or CDN outage would break or hijack the admin page.
  React 18.3.1, ReactDOM 18.3.1, and axios 1.11.0 UMD production builds are now
  vendored locally under `view/adminhtml/web/js/vendor/` and all CDN paths removed.

- **Broad `https://unpkg.com` `script-src` CSP allowance removed**
  (`etc/csp_whitelist.xml`) — the whitelist entry permitted any script hosted on
  `unpkg.com` to execute in the admin context. Now that all JS assets are local,
  the entry has been removed, tightening the Content Security Policy.

- **`console.log` exposed OPcache API response data in browser console** (`gui.js`) —
  three `console.log('success: ', response.data)` calls printed raw service
  responses (file counts, memory stats, hit rates) to the browser console.
  All three removed.

### Fixed — Dead Code

- **Dead imports in `State.php`** — `CsrfAwareActionInterface` and
  `InvalidRequestException` were imported but neither used nor implemented.
  Removed both `use` statements.

### Fixed — Standards Compliance

- **`execute()` missing return type** (`Controller/Adminhtml/Api/State.php`) —
  the method had no return type declaration while the sibling `Gui/Index.php`
  controller correctly declares `): ResultInterface`. Added
  `): \Magento\Framework\Controller\ResultInterface`.

- **Unhandled promise rejections on all axios calls** (`gui.js`) — four axios
  `.then()` chains had no `.catch()` handler. Network errors, 400/500 responses,
  and timeouts were silently swallowed. Added `.catch()` to all four: polling
  stops the realtime timer; reset/invalidate calls surface an error alert.

- **Missing `@copyright` header** (`Block/Adminhtml/Gui.php`) — the class docblock
  had `@author` and `@license` but no `@copyright` line, unlike every other PHP
  file in the module. Added `Copyright © Amadeco. All rights reserved.`

- **French comments in production JavaScript** (`gui.js`) — six inline comments
  were written in French (`garde-fou: pas de doublon`, `optimisé`, `évite re-création
  inline`, etc.). Translated to English.

---

## [2.0.2] — Initial release

Module first committed. Wraps the `amnuts/opcache-gui` library (^3.6) in a
Magento 2 admin panel: ACL-protected route under System → Tools, React-based
dashboard served via RequireJS, dedicated JSON API controller
(`opcache_gui/api/state`) supporting poll / reset / invalidate actions with
Magento form-key CSRF protection, and a PHP-side OPcache status card with
memory, hit-rate, and configuration warnings.
