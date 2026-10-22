# Meora
**Your family's brain.**

Families forget things: which tablet Amma takes, where the insurance papers are, the plumber's number, Nanna's birthday, Ammamma's rasam recipe.
The answers live in one person's head, or are lost in a WhatsApp chat.

Meora is one shared memory for the family. **Speak to save. Speak to ask.** It answers only from what your family saved, and never guesses.
It works in any language, and it is easy enough for grandparents. It's free, with no ads and no passwords.

## Pages
Bottom tabs on every page: **Home · Ask · Save (big mic) · Family · More**.
Home (ask bar, save, today & coming up, recently saved, topics) · Ask · Save → Check → Saved · Topic lists · Note · Important dates ·
Emergency info · Family (invite with 3 pictures/QR, allow, members) · More · All topics · Family questions · What's new · Settings ·
Language · Recovery pictures · Privacy · Help tour · plus start-up pages (language, welcome, join, waiting, lock, recovery).
Every page has its own address (e.g. `/ask`, `/family`, `/topic/health`) and the phone's Back button works.

## What it does
- **Save by speaking** in any language. You can also type, add a photo, or record a voice clip (like a grandmother telling a recipe).
  Meora guesses the topic, who the note is about, and a reminder, and you check before saving.
- **Ask by speaking.** You get one clear answer from your family's notes, with who saved it and when, and Listen and Translate buttons. Phone numbers become Call buttons.
- **Ask my family:** if nobody saved it yet, the question goes to everyone. The answer is saved for next time.
- **11 topics:** medicines and health, contacts, where things are, important dates, recipes, home and bills, money (safe), kids and school, vehicles, family stories, other.
- **Reminders and dates:** "Coming up" on the home screen, plus one tap to add a date to the phone's own calendar, so the phone rings a real alarm.
- **Emergency card** for each person: blood group, allergies, medicines, doctor, and big Call buttons. It can be printed for the fridge.
- **"Is this still right?"** checks for medicines and contacts after 3 months. Every note keeps its edit history.
- **Who can see:** everyone, only some people, or hidden from someone (for surprise gifts).
- **Language and ease of use:**
  - App words in English, Telugu, Hindi, Tamil, Spanish, French, Arabic (right to left) and Chinese.
  - Speaking works in 50+ languages.
  - Big text options, read-aloud, slow voice, simple mode, and a dark screen.
  - It works offline and installs on the home screen.

## Safety, built in
1. **End-to-end locked.** Notes are encrypted on the phone (AES-256-GCM) before they leave. The server only stores boxes it can't open.
2. **No PINs to remember.**
   - Joining: someone joins with a **3-picture code or a QR code**, and a family member must tap **Allow**.
   - Allowing: the family key is passed phone-to-phone with ECDH (P-256), so the server never sees it.
   - Opening the app: **fingerprint or face** (WebAuthn), or 3 pictures.
3. **Secrets are blocked.**
   - Blocked: PINs, passwords, OTPs, card numbers (with a checksum check), bank account numbers, Aadhaar, SSN and PAN numbers are refused in many languages.
   - Still allowed: normal things like phone numbers, prices or a postal "PIN code 500032".
4. **"Only some" notes** get their own key, sealed separately for each chosen person.
5. **Lost phone:** anyone who can approve removes it. **Every phone lost:** 12 recovery pictures bring the family back.
6. **Plain search runs on the phone.** It is free, unlimited and works offline. "Smart answers" (Google Gemini, free tier) are **off** unless the family turns them on.

## Owner's admin page
Open `/admin` and type your `ADMIN_KEY` (set in Vercel). It shows people, families, notes, active phones, a 30-day chart,
what people do (questions answered vs not found, secrets blocked, languages, phones), recent activity and errors.
It shows **counts only**. Notes are locked, so they can't be read there. Without the key the page shows nothing.

## Run it on your computer
Needs Node.js 20+.
```bash
npm install
npm run dev     # open http://localhost:3000
npm test        # 96 checks: secret blocking, search answers, topics, dates, encryption, recovery
npx tsx scripts/pgtest.ts   # every server action against a real Postgres
```

## Put it online free
1. **GitHub:** push this folder.
2. **Neon:** a free Postgres database. Copy the connection string.
3. **Vercel:** import the repo and add `DATABASE_URL`. Optionally add `GEMINI_API_KEY`, then deploy.

The tables are created automatically.

## How it's built
Next.js 16 (App Router, route handlers) · React 19 · TypeScript · Tailwind CSS v4 · Web Crypto · WebAuthn · Web Speech API · IndexedDB · PWA · Neon Postgres.
```
lib/crypto.ts        locking on the phone: family key, phone keys, recovery pictures
lib/secret.ts        blocks PINs, passwords, card and ID numbers (many languages)
lib/search.ts        answers questions on the phone, with synonyms across languages
lib/topics.ts        guesses topic and who a note is about
lib/dates.ts         finds dates and times in speech, next reminder, phone-calendar files
lib/server/family.ts join with pictures, approve, members, locked notes, recovery
components/store.ts  the app's brain on the phone: keys, sync, offline outbox
components/screens/  every page
scripts/test.ts      the tests
```
