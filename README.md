# Env Form Fill

A Chrome extension that fills web forms from a **`.env` file**, matching each key to a form field **case-insensitively** (`FIRST_NAME` fills `first_name`, `firstName`, `first-name` or a field labelled "First Name").

Useful for repeatedly filling the same sign-up, checkout or test forms during development, without retyping or keeping a password manager profile in sync.

## Features

- Matches keys against a field's `name`, `id`, `<label>` text, `aria-label` / `aria-labelledby` and `placeholder`
- Matching ignores **case, spaces, underscores, dashes and punctuation**
- Fills text inputs, textareas, dropdowns, checkboxes and radio buttons
- Works with React/Vue-controlled inputs (fires real `input` and `change` events)
- Fills forms inside iframes on the same page
- Never fills automatically: only when you click the button or press **Alt+Shift+F**
- Runs entirely locally and makes no network requests

## Installation

Env Form Fill isn't on the Chrome Web Store, so you load it as an unpacked extension.

1. **Get the code**
   ```bash
   git clone https://github.com/<your-username>/form_fill.git
   ```
   Or download the repo as a ZIP from GitHub and extract it.

2. **Create your `.env`**
   ```bash
   cd form_fill/extension
   cp env.example .env
   ```
   Then edit `.env` with your own values.

3. **Load it in Chrome**
   1. Open `chrome://extensions`
   2. Turn on **Developer mode** (top-right toggle)
   3. Click **Load unpacked** and select the `extension` folder

4. **Pin it** (optional): click the puzzle-piece icon in the toolbar and pin **Env Form Fill**.

It requires a Chrome version with Manifest V3 support (Chrome 102 or newer). Other Chromium browsers such as Edge, Brave and Opera should also work, but they haven't been tested.

## Usage

1. Open a page with a form.
2. Click the Env Form Fill icon and press **Fill from .env**, or press **Alt+Shift+F**.
3. The popup shows how many fields were filled.

**After editing `.env`, click the reload icon on the extension's card in `chrome://extensions`.** The file is bundled with the extension, so Chrome only picks up changes on reload.

To change the shortcut, go to `chrome://extensions/shortcuts`.

### The `.env` format

```bash
# Comments start with #
FIRST_NAME=Jane
export LAST_NAME=Doe            # "export" prefix is allowed
PHONE="+1 555 0100"             # quotes are stripped
ADDRESS="Line 1\nLine 2"        # \n and \t are expanded inside double quotes
COUNTRY=United States           # inline comments are removed from unquoted values
SUBSCRIBE=true
```

### How values are applied

| Field type | Behaviour |
|---|---|
| Text, email, password, textarea, etc. | Value is set as-is |
| `<select>` | Picks the option whose value **or** visible text matches (case-insensitive) |
| Checkbox | `true`, `1`, `yes`, `on`, `y` → checked; anything else → unchecked |
| Radio | Selects the radio in the group whose value matches |
| Hidden, file, button, submit, disabled, read-only | Skipped |

### Matching examples

| `.env` key | Matches |
|---|---|
| `FIRST_NAME` | `name="first_name"`, `id="firstName"`, `<label>First Name</label>`, `placeholder="First-name"` |
| `EMAIL` | `<label>E-mail</label>`, `aria-label="Email"` |
| `ZIP_CODE` | `name="zipcode"`, `placeholder="Zip code"` |

A key must match the whole (normalized) identifier: `EMAIL` does **not** match `billing_email`.

## How it works

```
Click / Alt+Shift+F ──► background.js ──► fetch bundled .env ──► parse
                                                                   │
                                                                   ▼
                                   chrome.scripting.executeScript (all frames)
                                                                   │
                                                                   ▼
                                                fill matching fields on the page
```

- **`background.js`** (service worker): loads and parses `.env`, then injects the fill function into the active tab. Handles both the keyboard shortcut and messages from the popup.
- **`popup.html` / `popup.js`**: the Fill button and status line.
- **`env.example`**: a sample `.env` to copy.
- **`test.html`**: a page with one field of each kind for trying the extension.

There are no dependencies and no build step. The files in the folder are the extension.

## Permissions

| Permission | Why |
|---|---|
| `activeTab` | Access the current tab only when you click the extension or press the shortcut |
| `scripting` | Inject the code that fills the form |

The extension has no host permissions, so it can't read or change any page until you invoke it there. Your `.env` values never leave your computer.

## Known limitations

- **Reload required:** changes to `.env` aren't seen until the extension is reloaded.
- **One profile:** there's a single `.env`, so every site gets the same values.
- **Cross-origin iframes:** forms embedded from a different site (e.g. some payment widgets) may not be filled, because `activeTab` only grants access to the page's own origin.
- **Exact-name matching:** a key only fills a field whose normalized name, id, label, aria-label or placeholder equals the normalized key.
- **Restricted pages:** Chrome doesn't allow scripts on `chrome://` pages or the Chrome Web Store.
- **Local files:** to use it on `file://` pages (such as `test.html`), turn on **Allow access to file URLs** on the extension's details page.
- **Dotfiles:** if your Chrome build refuses to serve `.env`, name the file `env` instead; the extension tries both.

## Security

`.env` files often contain secrets. Keep only form data in this one, and make sure it isn't committed:

```bash
echo "extension/.env" >> .gitignore
```

## Development

1. Edit the files.
2. Click the **reload** icon on the Env Form Fill card in `chrome://extensions`.
3. Reopen the popup or press the shortcut again.

For debugging:
- **Popup:** right-click the popup → *Inspect*
- **Service worker:** click *service worker* on the extension card; errors from the shortcut are logged there with an `[env-fill]` prefix

To change which attributes are matched, edit the `candidates` list in `findValue()` inside `background.js`.

## Contributing

Issues and pull requests are welcome. Ideas for improvement:
- Multiple profiles or per-site `.env` sections
- Loading `.env` from the popup instead of bundling it
- Optional partial ("contains") matching
- Highlighting filled fields

## License

MIT.
