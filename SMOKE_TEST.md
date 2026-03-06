SMOKE TEST CHECKLIST

This file contains a concise browser smoke-test checklist and troubleshooting tips for the project.

1) Start a local static server (PowerShell)

- Open PowerShell in the workspace folder (`c:\Users\Admin\Desktop\Modularized_Version1.2.3`).
- Run one of the following commands:

```powershell
python -m http.server 8000
# or
python3 -m http.server 8000
# To open the default browser (Edge) to the app after starting server:
Start-Process msedge "http://localhost:8000/index.html"
```

Outcome: files served at http://localhost:8000

2) Basic page load & console

- Open browser at: http://localhost:8000/index.html
- Open DevTools → Console and Network (Ctrl+Shift+I)
- Expected: no syntax/uncaught ReferenceError on load. If errors appear, copy the console stack and network failures.

3) Verify `NVC` namespace & modules

- In Console run:

```javascript
console.log('NVC', typeof NVC);
console.log('NVC.Utils', typeof (NVC && NVC.Utils));
console.log('NVC.Api', typeof (NVC && NVC.Api));
console.log('NVC.UI', typeof (NVC && NVC.UI));
```

- Expected: `object` or `function` values for keys. If `undefined`, note which module didn't load.

4) Check script load order

- In Network tab, confirm that `script.js` loads before `utils.js`, `api.js`, `ui.js`, `ai_chatbot.js`, `main.js`. Module scripts must be present and in correct order.

5) Data refresh & Google Sheets

- Click any "Refresh" or `Refresh` button.
- Expected: If `GOOGLE_SHEETS_CONFIG.WEB_APP_URL` is configured, network requests appear; otherwise app falls back to local data and shows a warning toast.
- Capture failing requests (URL, status, response body).

6) Complaint create flow

- Open the complaint form (modal or `form1.html`). Fill minimal fields.
  - Date: use `getCurrentNepaliDate()` output or type `2081-11-03`
  - Name: Test User
  - Description: Smoke test
- Submit. Expected: validation passes, loading indicator displays, and either success toast or local-save warning. No uncaught exceptions.

7) Complaint edit flow

- Edit an existing complaint and save. Expected: UI updates and no exceptions.

8) Datepicker & Nepali digits

- Click a Nepali date input and open the picker. Expected: library or fallback modal opens; selected date normalized to `YYYY-MM-DD`.
- Check that numeric display conversions to Devanagari digits appear where applicable (badges, counters, dates).

9) Chatbot

- Toggle chatbot and send a message. Expected: no JS errors; if AI module missing, graceful fallback or console warning.

10) Dashboard save/cancel

- Open dashboard form and click Save and Cancel. Expected: `NVC.UI.saveDashboardEdit` and `NVC.UI.cancelDashboardEdit` used or safe fallbacks; no console errors.

11) Visual / UX checks

- Check that loading spinner and toasts appear and disappear as expected.

12) Capture & report failures

- Save console log (right-click console → Save as) and paste here if anything fails.
- Note failing action and the console stack trace (file path and line numbers).

Troubleshooting quick tips

- Blank page: check Network for 404 on script files. Ensure `script.js` is included and loaded first.
- `ReferenceError: NVC is not defined`: verify `utils.js` or `main.js` introduced a safe `window.NVC` stub; ensure module scripts are loaded.
- `No postToGoogleSheets implementation available` (thrown): ensure `NVC.Api.postToGoogleSheets` exists (`api.js` loaded) or run app in local mode (disabled Sheets).
- Datepicker not opening: check for loaded vendor script or fallback modal `#simple-nepali-picker` in DOM.
- If Google Sheets requests fail: verify `config.js` / `NVC.Config.GOOGLE_SHEETS_CONFIG.WEB_APP_URL` is configured.

Optional: automated quick grep for likely errors

- Before running the app, you can run a quick grep for console errors/warns in the repo, or inspect `SMOKE_TEST.md` for this checklist.

If you want, I can now:
- Tweak the app to convert `throw`-based errors into rejected promises (safer for async flows).
- Instrument critical functions with short console banners to ease tracing during smoke tests.

