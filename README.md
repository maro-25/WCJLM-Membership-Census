# WC Jubilee Life Ministries Membership Form

This package includes:

- `index.html` — main online form
- `thank-you.html` — thank-you page after submission
- `Code.gs` — Google Apps Script backend
- `logo.jpeg` — church logo image currently referenced by the pages

## What is included

### Website updates
- church logo at the top
- mandatory household details section
- thank-you page after submission
- repeatable child and grandchild sections

### Google Sheet updates
- `Households`
- `Parents`
- `Children`
- `Grandchildren`
- `Monthly Review`
- `Possible Duplicates`

### Admin features
- monthly review sheet for current-month exports
- possible duplicates sheet
- duplicate flag based on family name + primary contact number
- export-friendly sheet formatting

## Important note on "admin-only"

Google Sheets does not hide tabs from someone who already has access to the spreadsheet file.
So the spreadsheet itself should only be shared with church admins.

## Setup

1. Create a Google Sheet.
2. Copy the sheet ID from the Google Sheet URL.
3. Open Apps Script.
4. Paste in `Code.gs`.
5. Replace `PASTE_YOUR_GOOGLE_SHEET_ID_HERE`.
6. Run `setupSheets()` once.
7. Deploy the script as a Web App.
8. Copy the deployment URL.
9. Open `index.html` and replace `PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE`.
10. Upload `index.html`, `thank-you.html`, and `logo.jpeg` to your GitHub repository root.
11. Enable GitHub Pages.

## Duplicate check

The duplicate check does not block submission.
It flags a row as `Possible Duplicate` when the same normalized:

- family name
- primary contact number

already exists in the `Households` sheet.

This is better for church admin work because a household may submit an update more than once.
