# Env Form Fill

Fill web forms in one click from a list of your details. Press **Alt+Shift+F** (or click the extension) and every matching field is filled. Everything stays on your computer.

## Setup

1. Download this repo as a ZIP and unzip it somewhere permanent.
2. Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked** and select the `extension` folder.
3. Click the extension → **Edit details**, replace the example rows with yours and click **Save**.

## Usage

On any form, press **Alt+Shift+F** or click the extension → **Fill form**. Review the form before submitting.

The popup lists anything it couldn't fill. With the shortcut, the toolbar icon briefly shows how many fields were filled; orange means some were skipped, so open the popup and click **Fill form** to see which.

## Your details

Each row is a **Name** and a **Value**. Name each detail the way forms label it: the name is matched against a field's name, id, label or placeholder, **ignoring case, spaces, dashes and underscores**. So "First name" fills `first_name`, `firstName` and "First Name". The match must be whole: "Email" won't fill "Billing email". Add another row with that label if needed.

| Field type | Value |
|---|---|
| Text | Anything |
| Drop-down, radio buttons | The option as shown on screen, e.g. `United States` |
| Checkbox | `yes` to tick, `no` to untick |
| Date | `2025-03-14`, `14 March 2025` or `March 14, 2025`. Ambiguous dates like `03/04/2025` are skipped by date pickers. Plain text date boxes get your value exactly as typed. |
| Time | `14:30` or `2:30 pm` |

**Import .env** / **Export .env** in the editor load from or back up to a `.env` file (`NAME=value` per line).

## Troubleshooting

- **"No details saved yet"**: open **Edit details** and click **Save**.
- **A field isn't filled**: its label differs from your names. Add a row matching it.
- **Radio group isn't filled**: the group's heading often isn't linked to the buttons. Use the name the site gives the group instead (right-click a button → *Inspect* → its `name`).
- **Pop-up calendar isn't filled**: some sites use custom date widgets that ignore filled values. Pick the date by hand.
- **Shortcut does nothing**: change it at `chrome://extensions/shortcuts`.
- **Trying `test.html`**: enable **Allow access to file URLs** in the extension's details.

## Privacy

Only acts on the current tab when you invoke it (`activeTab` + `scripting` permissions). Your details are kept in Chrome's local extension storage (`storage` permission), which isn't synced. No network requests. Websites can't see your details; until you click Fill, a page gets nothing. After that, it gets only the values that matched its fields, and like anything typed into a form, the site may receive them even before you submit. Don't store passwords or card numbers. Removing the extension deletes your saved details.

## License

MIT.
