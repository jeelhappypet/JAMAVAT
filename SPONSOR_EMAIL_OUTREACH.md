# Sponsor outreach — the email, the list, and how to send it

Read `SALES_SPONSORS.md` first — it has who to approach and why. This file
is only the sending: the format, the list you build, and the CC/BCC rules
that decide whether the mail lands in the inbox or in spam.

---

## 0. Read this before you send one email

**Do not send these from the account in `SMTP_USER`.**

`src/lib/mail.ts` uses one Gmail account for everything the product sends:
the guest's bill, the guest's OTP, and the HQ login link. If that account
starts sending 40 cold marketing emails a day, two things happen:

1. Gmail flags it. Guest bills and OTPs start landing in spam — the OTP is
   how a guest places an order, so **ordering silently breaks** for every
   restaurant.
2. Enough spam reports and Google suspends the account. Then nothing sends
   at all.

So: **a separate address for outreach.** `partner@jamavat.in` on the real
domain once you have it, or a plain separate Gmail until then. Never
`SMTP_USER`, and never automate it from the app — these go out by hand from
a normal inbox, one at a time.

## 1. CC and BCC — the rules

### Never CC

Fifty businesses in CC means every one of them sees the other forty-nine
addresses. Three things break at once:

- The gym in Adajan sees you emailed four other gyms. You promised
  **category exclusivity** (`SALES_SPONSORS.md` §4). That promise is now
  visibly worthless and the deal is dead.
- Every recipient knows they got a bulk mail. Nobody replies to bulk mail.
- You have published forty-nine businesses' email addresses to each other.
  That is a real privacy problem, not a technicality.

### Do not BCC either

BCC hides the addresses, so it feels safe. It is not:

- Gmail sees one identical body going to fifty people and files it in
  **Promotions or Spam**. You will never know — it just looks like nobody
  replied.
- Zero personalisation. No name, no area, no numbers for *their* catchment.
  The entire pitch is "9,000 people in **your** area" — a BCC blast cannot
  say that.
- One spam report poisons the sending address for all future mail.

### The only way that works

**One email. One recipient in the To field. Their name in the first line.**

Twenty to twenty-five a day, typed or pasted individually. It is slower and
it is the reason it works — a sponsor pays ₹3,000 a month, so an email that
takes two minutes to personalise is worth it.

### When CC and BCC are correct

| Field | Use it for |
|---|---|
| **To** | Exactly one business. Always. |
| **CC** | A reply came from a receptionist or manager and you are looping in the owner — only after the thread has started, and only people who should see each other. Also the restaurant owner when you send the signed sponsor agreement, so both sides see the same terms. |
| **BCC** | One address only — your own `sponsors@` or a label address — so every outreach mail is filed in one place. Never a second business. |
| **Reply-To** | Set it to the WhatsApp-linked number's email if you check that one. A reply you miss is a lost sponsor. |

### Daily limits

A fresh Gmail that suddenly sends 100 mails gets throttled on day one.

| Days | Per day |
|---|---|
| 1–3 | 10 |
| 4–7 | 20 |
| Week 2 onward | 30–40 |
| Hard ceiling (free Gmail) | 100–150 |

Send 10:30–12:00 or 16:00–18:00, Tuesday to Friday. Monday morning and
Saturday get deleted unread.

## 2. The list

**Build it yourself, this week.** There is no file of verified Surat
business emails to hand you — a scraped address is usually a dead
`info@` nobody opens, and emailing it burns your sending reputation for
nothing.

`sponsor-outreach.csv` in this repo is the tracker, already filled with
category, area, and the Google Maps search to run. Thirty rows across the
five areas where you will have restaurants first. Fill the blank columns.

**How to get a real address (about 25 minutes per area):**

1. Maps → run the `maps_search` string from the row.
2. Open each result with 4.0+ and 50+ reviews.
3. Click **Website**. The email is on the Contact page or the footer.
   `drsharma@clinic.com` is worth ten times `info@clinic.com`.
4. No website? Open their **Instagram** — the bio often has an email, and
   the "Email" button on a business profile reveals it.
5. Still nothing? Mark `email_source = none` and move it to the WhatsApp
   list instead. Do not guess an address.
6. Fill in `business`, `email`, `phone`, `instagram`, and
   `sessions_in_area` — that last one is **the number you put in the
   email**, and it must be true: restaurants live in that area × 1,800.

**Order of work:** gyms, dentists, salons, labs, coaching classes first
(Tier 1 in `SALES_SPONSORS.md` §2) — then the rest.

**Only the business's own published address.** Never a personal mobile or
personal email taken from a WhatsApp group or a directory's "owner" field.

## 3. The email

Short. Nobody reads paragraph four. Three subject lines — use one, keep
using it until the reply rate tells you to switch.

```
અડાજણના ~9,000 ગેસ્ટ — મહિને ₹3,000
[વિસ્તાર] ના રેસ્ટોરન્ટમાં તમારું બેનર
એક વિસ્તારમાં એક જ જીમ — જમાવટ
```

Fill every `[…]`. If you cannot fill one, you have not done the research
for that row, and that email should not go out.

**ગુજરાતી — the default. Send this one.**

> નમસ્તે **[માલિકનું નામ]**,
>
> હું **[તમારું નામ]**, જમાવટ માંથી. અમે સુરતના રેસ્ટોરન્ટમાં QR ઓર્ડરિંગ
> ચલાવીએ છીએ — ગેસ્ટ ટેબલ પર બેસીને પોતાના ફોનથી ઓર્ડર આપે છે.
>
> ઓર્ડર આપ્યા પછી જમવાનું આવે ત્યાં સુધી એ **૧૦–૧૫ મિનિટ** એક જ સ્ક્રીન પર
> બેસે છે. **[વિસ્તાર]** માં અમારા **[N]** રેસ્ટોરન્ટ છે — મહિને આશરે
> **[X,000]** ગેસ્ટ એ સ્ક્રીન ખોલે છે.
>
> એ સ્ક્રીન પર **[બિઝનેસનું નામ]** નું બેનર મૂકી શકાય. ગેસ્ટ ક્લિક કરે તો
> સીધો તમારો WhatsApp ખુલે.
>
> • મહિને **₹3,000** — એક વિસ્તાર
> • **એક વિસ્તારમાં એક જ [કેટેગરી]** — તમારા પછી બીજું કોઈ નહીં
> • દર મહિને રિપોર્ટ — કેટલાએ જોયું, કેટલાએ ક્લિક કર્યું
> • કોઈ કોન્ટ્રાક્ટ નહીં. ન ગમે તો બીજા મહિને બંધ.
>
> સ્ક્રીનનો ફોટો સાથે જોડ્યો છે — તમારું બેનર કેવું દેખાશે એ બતાવ્યું છે.
>
> બે મિનિટ માટે ફોન કરું? **[ફોન]**
>
> **[તમારું નામ]** · જમાવટ · [ફોન] · [વેબસાઇટ]

**English — only for clinics, builders, and offices that replied in English.**

> Dear **[Name]**,
>
> I'm **[Your name]** from Jamavat. We run QR ordering in Surat
> restaurants — guests order from their own phone at the table.
>
> After ordering, they sit on one screen for **10–15 minutes** waiting for
> the food. We're in **[N]** restaurants in **[Area]** — about **[X,000]**
> guests open that screen every month.
>
> Your banner goes on that screen. A tap opens your WhatsApp directly.
>
> • **₹3,000/month** for one area
> • **One [category] per area** — no competitor after you
> • Monthly report: views and clicks
> • No contract, month to month
>
> A screenshot is attached showing how your banner would look.
>
> Can I call you for two minutes? **[Phone]**
>
> **[Your name]** · Jamavat · [Phone] · [Website]

### The attachment does the selling

One PNG. The real guest waiting screen, **with their banner mocked into
it** — their shop name, their logo. Make it before you send.

A generic screenshot gets a 2% reply rate. A screenshot with their own
shop on it gets four in ten. If you only have time to do one thing well,
do this.

Under 1 MB, PNG, named `jamavat-[businessname].png`. No PDF brochure — it
does not get opened and it drags the mail into Promotions.

### Never put in the email

A number of customers or sales, a guaranteed outcome, a discount before
they ask, the words "limited offer", or more than one link. Promise
impressions and a monthly report — that is what you can actually deliver,
and `SALES_SPONSORS.md` §5 explains what one broken promise costs you in a
market where they all know each other.

## 4. The follow-up sequence

Two emails maximum. After that you are a nuisance and the address is burnt.

| Day | What | Where |
|---|---|---|
| 0 | The email above | Email |
| 3 | WhatsApp, the `SALES_SPONSORS.md` §6 message, same screenshot | WhatsApp |
| 7 | One-line reply on your own thread | Email |
| 14 | Walk in. The screenshot on your phone. | In person |
| 21 | Nothing. Mark `dead`, come back in three months. | — |

**Day 7, reply on the same thread — do not start a new one:**

> નમસ્તે [નામ], ઉપરનો મેઇલ જોયો હશે. [વિસ્તાર] માં [કેટેગરી] ની જગ્યા હજી
> ખાલી છે. રસ ન હોય તો એક લીટીમાં "ના" લખી દેશો — ફરી નહીં લખું. 🙏

That last line is not politeness. It gets you a clean no instead of
silence, and a clean no is worth more than a maybe you chase for a month.

**Log every send in the CSV the same day.** `sent_on`, `status`,
`next_action_on`. A follow-up you forgot is the same as never sending the
first mail.

## 5. The bot

`/api/cron/outreach` runs every weekday morning at 10:30 IST (Tue–Fri, set in
`vercel.json`). One run:

- sends the **email** steps itself, newest due first, inside the day's cap
- puts the **WhatsApp** and **visit** steps in a digest mail to HQ, the
  WhatsApp ones as `wa.me` links with the message already written
- moves every lead it touched to its next step
- stops a lead the moment it replies

**WhatsApp goes out as an approved template.** A business that has never
messaged Jamavat is outside the 24-hour window, so a plain text message comes
back as error 131047 — the only thing Meta delivers is a marketing template.
`lib/outreach/whatsapp.ts` sends one. Until the template is approved **and** a
separate outreach number is set, the step falls back to a `wa.me` link in the
digest for you to tap.

Both conditions matter. Marketing templates to people who never opted in are
what drops a number's quality rating, and a restricted number takes the
restaurants' own chats down with it. `WHATSAPP_OUTREACH_PHONE_NUMBER_ID` keeps
that blast radius off the support number, and the bot refuses to send
WhatsApp at all until it is set.

**What it stops itself for:**

| | |
|---|---|
| `OUTREACH_SMTP_USER` is the same as `SMTP_USER` | Refuses outright and says so at the top of the digest — see §0 |
| An area with fewer than 1,000 guest sessions | The pitch's one number would be a lie. Retries tomorrow. |
| Daily cap reached | Retries tomorrow rather than spending next week's quota |
| No approved template, or no separate WhatsApp number | Won't WhatsApp at all — falls back to a tap link |
| A manual step nobody did for 3 days | Skips it and moves to the next |
| Two emails already sent | Closes the lead. There is no third. |

**Replies stop the sequence.** An inbound WhatsApp from a lead's number is
matched in `api/whatsapp/webhook` and closes it automatically. An email reply
has to be marked in HQ — nothing reads your inbox, and a follow-up landing on
top of someone who already answered is the one failure this whole file exists
to avoid.

### What HQ shows

**HQ → Outreach** is the screen: today's counts against both caps, the
pipeline by status, and a thread per lead showing every message as it went
out, with what happened to it.

| Channel | Indicator | How true it is |
|---|---|---|
| WhatsApp | ✓ Sent · ✓✓ Delivered · ✓✓ Read | **Exact.** Meta reports both from the webhook. |
| Email | Sent · Opened *(approx)* | **A guess.** A 1×1 image in the mail was fetched. Gmail and Apple Mail fetch images through their own proxies, often before anyone reads it, and a client with images off never fires at all. |
| Email reply | — | Nothing sees it. Mark it yourself. |

From a lead's panel you can mark **Won**, **They replied**, **Dead**, reopen
one, mark a manual step done, and keep notes.

### Setting up the Meta template

This part is in your Meta account, not in the code. Once:

1. **business.facebook.com → WhatsApp Manager → Message templates → Create.**
2. Category **Marketing**, language **Gujarati**, name it `sponsor_pitch`
   (whatever you use goes in `WHATSAPP_OUTREACH_TEMPLATE`).
3. Paste the body **exactly** as `TEMPLATE_BODY` in
   `src/lib/outreach/whatsapp.ts`. The placeholders are, in order:
   `{{1}}` owner or business name · `{{2}}` area · `{{3}}` guests a month ·
   `{{4}}` category. Meta rejects a send whose parameters do not match the
   approved body, so if you edit the wording in Meta, edit it in that file too.
4. Approval usually takes minutes to a day. A template Meta later pauses for
   poor quality comes back here as a `template` failure on the lead's thread.
5. **A second phone number** for outreach, with its id in
   `WHATSAPP_OUTREACH_PHONE_NUMBER_ID`, is what keeps a quality-rating
   problem away from the number your restaurants message.

### What is actually set up today

| | |
|---|---|
| Business portfolio | **Developer for hotel** (`1109465405348101`) — *not* "For Devloper", which cannot issue a token because it does not own the app |
| System user | Employee `61594956222127`, token never expires |
| WABA | "jamavat" `3345318119008115` |
| Number | **+91 97145 89772** (`1334079909791512`), quality GREEN, `code_verification_status: EXPIRED` — re-verify it in WhatsApp Manager |
| Test WABA | "Test WhatsApp Business Account" `1099565912796572`, number +1 555-658-3799 (`1395313130326621`) — reaches 5 pre-registered numbers only |
| `sponsor_pitch` | Submitted to Meta on both WABAs, PENDING review |

**Outreach and support share one number, by the owner's decision** — there is
no second SIM on the account yet. `WHATSAPP_OUTREACH_ALLOW_SHARED_NUMBER=true`
is what records that choice; without it the bot refuses to send, which is the
default for a reason. The thing to watch is the number's **quality rating** in
WhatsApp Manager: it is GREEN today, and at YELLOW stop outreach and get the
second number, because the next step down takes the restaurants' own chats
with it.

To rehearse the whole flow without touching that number, point
`WHATSAPP_OUTREACH_PHONE_NUMBER_ID` at the test number `1395313130326621`,
add your own phone to its allowed recipients in the app's WhatsApp → API
Setup, and run the bot against one lead.

Running it twice is safe: it counts what the account already sent today
before spending any cap, and each step moves on a conditional update.

### Settings

| Variable | What |
|---|---|
| `OUTREACH_SMTP_USER` / `_PASS` | The separate sending account. **Not `SMTP_USER`.** |
| `OUTREACH_SMTP_HOST` / `_PORT` | Default `smtp.gmail.com:465` |
| `OUTREACH_MAIL_FROM` | The visible From, if different |
| `OUTREACH_SENDER_NAME` / `_PHONE` | Signs the pitch; the number a sponsor calls back |
| `OUTREACH_DAILY_CAP` | Ceiling once warmed up (default 30) |
| `OUTREACH_STARTED_ON` | `YYYY-MM-DD` the account started. Days 1–3 cap at 10, 4–7 at 20. Unset means 10 forever. |
| `OUTREACH_BCC` | One address for your own file. Only ever one. |
| `OUTREACH_DIGEST_TO` | Where the morning digest goes (defaults to the first `HQ_EMAILS`) |
| `OUTREACH_TRACKING_SECRET` | Signs the open-tracking pixel. Unset (and no `CRON_SECRET`) turns open tracking off entirely. |
| `WHATSAPP_OUTREACH_TEMPLATE` | The approved template's name |
| `WHATSAPP_OUTREACH_TEMPLATE_LANG` | Its language code (default `gu`) |
| `WHATSAPP_OUTREACH_PHONE_NUMBER_ID` | The number outreach sends from. Unset means the bot sends no WhatsApp at all. |
| `WHATSAPP_OUTREACH_ALLOW_SHARED_NUMBER` | `true` only when that is deliberately the support number too |
| `WHATSAPP_OUTREACH_DAILY_CAP` | WhatsApp's own cap (default 20) |
| `CRON_SECRET` | What Vercel's scheduler authenticates with |

### Loading the list

Fill `sponsor-outreach.csv`, then:

```
node scripts/import-sponsors.mjs            # dry run
node scripts/import-sponsors.mjs --write
```

Re-runnable. A row already in the sequence keeps its step and its history —
re-importing the sheet cannot mail anyone twice. A row with no email and no
phone comes in as `TODO` and the bot leaves it alone until you research it.

## 6. Still not ready to send

The bot is built, but `SALES_SPONSORS.md` §8 still applies. Before the first
mail goes out:

1. The ad slot has to exist on the guest screen — **no code for it is
   written yet.** You cannot screenshot a banner that does not render.
2. Five restaurants live in one area, all five owners told about the 50/50
   share and all five having said yes.

Until then this file is preparation, not a task: build the CSV, get the
separate sending address, and go ask ten of them in person what they pay
for a hoarding today.
