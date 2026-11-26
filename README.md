# Rebotech Engineering CRM demo

Demo CRM for Rebotech Engineering, an engineering and fabrication workshop in Kempton Park. Everything in it is sample data.

## Show it
Double click `Start demo.bat`. It opens in the browser.

## Change it
```
npm install
npm run dev      # edit with live reload
npm run build    # writes the static site to out/
npm run demo     # serves out/ locally
```
`out/` is a plain static site, so it can be hosted on Vercel, Netlify or any web server.

## Where things are
- `src/lib/data.ts` customers, opportunities, operations, invoices and calendar
- `src/lib/outreach.ts` email templates, audiences, pre-send check
- `src/views/` one file per page
- `src/app/globals.css` all styling
- `TASTE.md` design brief and guardrails

## Good to know
- Dates move with today and the demo reseeds each day. The reset button in the left rail does it on demand.
- Changes are saved in the browser only. There is no backend and no login.
- Calls, WhatsApp, email and reminders are logged in the demo and never sent.
