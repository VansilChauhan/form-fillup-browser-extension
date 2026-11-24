# Env Form Fill

Fill web forms in one click from a simple text file of your details. Press **Alt+Shift+F** (or click the extension) and every matching field is filled. Everything stays on your computer.

## Setup

1. Download this repo as a ZIP and unzip it somewhere permanent.
2. In the `extension` folder, copy `env.example` to a file named `env` (or `.env`) and fill in your details.
3. Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked** and select the `extension` folder.

## Usage

On any form, press **Alt+Shift+F** or click the extension → **Fill from .env**. Review the form before submitting.

After editing your `env` file, click **reload** on the extension in `chrome://extensions`.

## The env file

```
FIRST_NAME=Jane
LAST_NAME=Doe
EMAIL=jane@example.com
COUNTRY=United States    # drop-downs: option text or value
SUBSCRIBE=true           # checkboxes: true/yes/1/on
ADDRESS="Flat #4, Main St"  # quote values containing #
```

Each name is matched against a field's name, id, label or placeholder, **ignoring case, spaces, dashes and underscores**, so `FIRST_NAME` fills "First name", `firstName` and `first-name`. The match must be whole: `EMAIL` won't fill "Billing email". Add another line with that label if needed.

## Troubleshooting

- **"No .env file found"**: the file must be named exactly `env` or `.env` (not `env.txt`) and sit in the `extension` folder. Reload afterwards.
- **A field isn't filled**: its label differs from your names. Add a line matching it.
- **Shortcut does nothing**: change it at `chrome://extensions/shortcuts`.
- **Trying `test.html`**: enable **Allow access to file URLs** in the extension's details.

## Privacy

Only acts on the current tab when you invoke it (`activeTab` + `scripting` permissions). No network requests. Websites can't see your file; until you click Fill, a page gets nothing. After that, it gets only the values that matched its fields, and like anything typed into a form, the site may receive them even before you submit. Don't store passwords or card numbers in the file.

## License

MIT.
