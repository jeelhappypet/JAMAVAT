import type { Lang } from "@/lib/i18n/messages";
import type { Localized } from "@/types";

/**
 * The Jamavat website's own copy, in English and ગુજરાતી.
 *
 * It lives apart from `lib/i18n/messages.ts` (the app's UI strings) because
 * it's long-form marketing text that HQ will edit from the Website content
 * tab, and because the keyword pages below are what Google reads: each one
 * is a real page about one thing someone searches for, with its own title,
 * description and body — not the same page with a different heading.
 */
export const SITE_NAME = "Jamavat";

/** Shown on the site and in the thank-you line of the form. Fill these in before launch. */
export const CONTACT = {
  phone: process.env.NEXT_PUBLIC_SITE_PHONE || "",
  email: process.env.NEXT_PUBLIC_SITE_EMAIL || "",
  /** Digits only, e.g. 919876543210 — makes the "Chat on WhatsApp" link. */
  whatsapp: process.env.NEXT_PUBLIC_SITE_WHATSAPP || "",
  /**
   * Jamavat's Instagram handle. Hardcoded rather than env-only because it is
   * the brand's main public profile: it has to be in the footer and in the
   * Organization schema's `sameAs` on every build, including a preview one
   * where the env is not set. `sameAs` is how Google learns that the account
   * and this site are the same "Jamavat" — without it a search for the handle
   * finds the Instagram page and not the product.
   */
  instagram: "jamavat.india",
  /**
   * Jamavat's other profiles (LinkedIn, Facebook, YouTube, Google Business),
   * comma-separated. Joined with the Instagram URL above into `sameAs`.
   */
  profiles: (process.env.NEXT_PUBLIC_SITE_PROFILES || "")
    .split(",")
    .map((url) => url.trim())
    .filter((url) => url.startsWith("https://")),
};

export const INSTAGRAM_URL = `https://www.instagram.com/${CONTACT.instagram}`;

/** Everywhere Jamavat exists as the same brand, for the Organization schema. */
export function brandProfiles(): string[] {
  return [...new Set([INSTAGRAM_URL, ...CONTACT.profiles])];
}

/** E.164 for `tel:` links and schema.org — the env holds it as typed (e.g. 917984020642 or 98765 43210). */
export function internationalPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 10 ? `+91${digits}` : `+${digits}`;
}

export function pick(text: Localized, lang: Lang): string {
  return (lang === "gu" ? text.gu : text.en) || text.en;
}

const L = (en: string, gu: string): Localized => ({ en, gu });

export const HERO = {
  eyebrow: L("QR ordering · Kitchen screens · Daily reports", "QR ઓર્ડર · કિચન સ્ક્રીન · રોજનો રિપોર્ટ"),
  /** Leads the h1: "Jamavat" is also a Gujarati word, songs and restaurants, so the page must say plainly that it's the brand. */
  brand: L("Jamavat", "જમાવટ"),
  title: L("QR table ordering & kitchen software for restaurants", "રેસ્ટોરન્ટ માટે QR ટેબલ ઓર્ડરિંગ અને કિચન સોફ્ટવેર"),
  body: L(
    "Guests scan, order and track their food from the table. Each kitchen gets only its own dishes. You see the whole day's sales in one place — on any phone or tablet, in English and ગુજરાતી.",
    "ગ્રાહક ટેબલ પરથી જ QR સ્કેન કરી ઓર્ડર આપે અને સ્ટેટસ જુએ. દરેક કિચનને ફક્ત તેની જ વાનગીઓ મળે. આખા દિવસનું વેચાણ એક જ જગ્યાએ — કોઈપણ ફોન કે ટેબ્લેટ પર, English અને ગુજરાતીમાં."
  ),
  /** What Google shows: the brand first (people search "Jamavat"), the description under ~155 characters so it isn't cut. */
  metaTitle: L("Jamavat: QR Ordering & Kitchen Software for Restaurants", "જમાવટ (Jamavat): રેસ્ટોરન્ટ માટે QR ઓર્ડરિંગ અને કિચન સોફ્ટવેર"),
  metaDescription: L(
    "Jamavat is QR table ordering and kitchen display software for restaurants. Guests order by phone, each kitchen sees its dishes, you see daily sales.",
    "જમાવટ રેસ્ટોરન્ટ માટે QR ટેબલ ઓર્ડરિંગ અને કિચન સોફ્ટવેર છે. ગ્રાહક ફોનથી ઓર્ડર આપે, દરેક કિચનને તેની વાનગી મળે, તમને રોજનું વેચાણ દેખાય."
  ),
  /** Alt text for the two screenshots in the hero collage (components/site/HeroArt.tsx). */
  artScreenAlt: L(
    "Jamavat's counter screen with a table's live orders and its bill",
    "ટેબલના લાઇવ ઓર્ડર અને બિલ સાથેની જમાવટની કાઉન્ટર સ્ક્રીન"
  ),
  artPhoneAlt: L(
    "A guest's phone showing the Jamavat menu after scanning a table QR",
    "ટેબલનો QR સ્કેન કર્યા પછી ગ્રાહકના ફોન પર જમાવટનું મેનુ"
  ),
  points: [
    L("No app to install", "કોઈ એપ ડાઉનલોડ નહીં"),
    L("Any phone or tablet", "કોઈપણ ફોન કે ટેબ્લેટ"),
    L("English + ગુજરાતી", "English + ગુજરાતી"),
  ],
};

export const AUDIENCE = {
  label: L("Made for", "કોના માટે"),
  items: [
    L("Thali restaurants", "થાળી રેસ્ટોરન્ટ"),
    L("Multi-cuisine with 2+ kitchens", "બે કે વધુ કિચનવાળી મલ્ટી-ક્યુઝીન"),
    L("Cafes", "કાફે"),
    L("Dhabas", "ઢાબા"),
    L("Food courts", "ફૂડ કોર્ટ"),
  ],
};

/**
 * The carousel on the hero. Screenshots are the seeded "Jamavat Demo"
 * restaurant (scripts/seed-demo.mjs) — published on purpose, exactly so the
 * website never shows a customer's real dishes or sales (see §8d of
 * PROJECT_ARCHITECTURE.md). Re-capture with scripts/capture-hero.mjs after
 * a visual change to the screens below.
 */
export const SLIDES: { tag: Localized; title: Localized; body: Localized; points: Localized[]; shape: "phone" | "screen"; image: string }[] = [
  {
    tag: L("For guests", "ગ્રાહક માટે"),
    title: L("Order from the table", "ટેબલ પરથી જ ઓર્ડર"),
    body: L(
      "Scan the QR on your side of the table, pick dishes, add a cooking note and verify your email once. No app, no waiting for a waiter.",
      "પોતાની બાજુનો QR સ્કેન કરો, વાનગી પસંદ કરો, રસોઈ માટે નોંધ લખો અને એક વાર ઈમેલ વેરિફાય કરો. એપ નહીં, વેઇટરની રાહ નહીં."
    ),
    points: [
      L("Photos, veg marks and prices", "ફોટા, વેજ માર્ક અને ભાવ"),
      L("A cooking note with any dish", "કોઈપણ વાનગી સાથે રસોઈની નોંધ"),
      L("Live status and running total", "લાઇવ સ્ટેટસ અને ચાલુ કુલ રકમ"),
    ],
    shape: "phone",
    image: "/site/hero-guest-menu.png",
  },
  {
    tag: L("For kitchens", "કિચન માટે"),
    title: L("Each kitchen sees only its dishes", "દરેક કિચનને ફક્ત તેની વાનગીઓ"),
    body: L(
      "Gujarati items go to the Gujarati kitchen and Punjabi items to the Punjabi one — even when they're on the same order.",
      "ગુજરાતી વાનગી ગુજરાતી કિચનમાં અને પંજાબી વાનગી પંજાબી કિચનમાં — એક જ ઓર્ડરમાં હોય તો પણ."
    ),
    points: [
      L("One order splits item by item", "એક ઓર્ડર વાનગી પ્રમાણે વહેંચાય"),
      L("A sound for every new ticket", "દરેક નવી ટિકિટ પર અવાજ"),
      L("Sold out in one tap", "એક ટેપમાં સોલ્ડ આઉટ"),
    ],
    shape: "screen",
    image: "/site/hero-kitchen.png",
  },
  {
    tag: L("For the counter", "કાઉન્ટર માટે"),
    title: L("Serve and settle", "સર્વ કરો અને બિલ કરો"),
    body: L(
      "New orders arrive live with a sound. Settle by cash, UPI or card, and the guest gets a thank-you email with the bill.",
      "નવા ઓર્ડર અવાજ સાથે તરત દેખાય. રોકડ, UPI કે કાર્ડથી બિલ કરો — ગ્રાહકને બિલ સાથે આભારનો ઈમેલ જાય."
    ),
    points: [
      L("One bill per sitting", "બેઠક દીઠ એક બિલ"),
      L("Cash, UPI or card", "રોકડ, UPI કે કાર્ડ"),
      L("Table frees itself after settling", "બિલ પછી ટેબલ જાતે ખાલી"),
    ],
    shape: "screen",
    image: "/site/hero-counter.png",
  },
  {
    tag: L("For the owner", "માલિક માટે"),
    title: L("Today's sales, live", "આજનું વેચાણ, લાઇવ"),
    body: L(
      "Orders, sales, top dishes and payment modes for today and the last 7 days.",
      "આજના અને છેલ્લા 7 દિવસના ઓર્ડર, વેચાણ, ટોપ વાનગીઓ અને પેમેન્ટ મોડ."
    ),
    points: [
      L("Today, yesterday, 7 days, month", "આજે, ગઈકાલે, 7 દિવસ, મહિનો"),
      L("Cash / UPI / card split", "રોકડ / UPI / કાર્ડનું વિભાજન"),
      L("Top dishes and parcel vs dine-in", "ટોપ વાનગી અને પાર્સલ સામે ડાઇન-ઇન"),
    ],
    shape: "screen",
    image: "/site/hero-report.png",
  },
];

/**
 * Which drawing `components/site/FeatureIcon` puts on a feature card. The
 * cards used to be numbered 01…08, which made eight equally-grey tiles and
 * implied an order the features don't have.
 */
export type FeatureIcon = "qr" | "route" | "bolt" | "verified" | "live" | "mail" | "report" | "parcel";

export const FEATURES: { icon: FeatureIcon; title: Localized; body: Localized }[] = [
  {
    icon: "qr",
    title: L("A QR for every seat", "દરેક બેઠક માટે QR"),
    body: L(
      "Two QRs on a table (4A, 4B). Each works for one guest at a time, so two orders never get mixed up.",
      "એક ટેબલ પર બે QR (4A, 4B). એક સમયે એક જ ગ્રાહક — એટલે બે ઓર્ડર ભેગા ન થાય."
    ),
  },
  {
    icon: "route",
    title: L("Kitchen-wise routing", "કિચન પ્રમાણે રૂટિંગ"),
    body: L(
      "Assign categories to each kitchen login. One order splits itself item by item.",
      "દરેક કિચન લોગિનને કેટેગરી સોંપો. એક ઓર્ડર વાનગી પ્રમાણે જાતે વહેંચાય."
    ),
  },
  {
    icon: "bolt",
    title: L("Straight to the kitchen", "સીધું કિચનમાં"),
    body: L(
      "A guest's order reaches the kitchen screens at once — no one at the counter has to approve it first.",
      "ગ્રાહકનો ઓર્ડર તરત કિચન સ્ક્રીન પર — કાઉન્ટરથી મંજૂરીની જરૂર નહીં."
    ),
  },
  {
    icon: "verified",
    title: L("Verified guests", "વેરિફાય થયેલા ગ્રાહક"),
    body: L(
      "An email code once per sitting. No prank orders, and a list of real guests for you.",
      "દરેક બેઠક દીઠ એક વાર ઈમેલ કોડ. ખોટા ઓર્ડર નહીં, અને સાચા ગ્રાહકોની યાદી તમારી પાસે."
    ),
  },
  {
    icon: "live",
    title: L("Live, no refresh", "લાઇવ, રિફ્રેશ વગર"),
    body: L(
      "New orders, ready dishes and bills update on every screen by themselves.",
      "નવા ઓર્ડર, તૈયાર વાનગી અને બિલ દરેક સ્ક્રીન પર જાતે અપડેટ થાય."
    ),
  },
  {
    icon: "mail",
    title: L("Thank-you email", "આભારનો ઈમેલ"),
    body: L(
      "After payment the guest gets the bill details and a link to review you on Google.",
      "પેમેન્ટ પછી ગ્રાહકને બિલની વિગત અને Google પર રિવ્યૂની લિંક મળે."
    ),
  },
  {
    icon: "report",
    title: L("Daily report", "રોજનો રિપોર્ટ"),
    body: L(
      "Sales, orders, top dishes and payment modes — today, yesterday, the last 7 days or the month.",
      "વેચાણ, ઓર્ડર, ટોપ વાનગી અને પેમેન્ટ મોડ — આજે, ગઈકાલે, છેલ્લા 7 દિવસ કે આખો મહિનો."
    ),
  },
  {
    icon: "parcel",
    title: L("Parcel orders too", "પાર્સલ ઓર્ડર પણ"),
    body: L(
      "Counter and parcel orders with token numbers — same kitchens, same report.",
      "કાઉન્ટર અને પાર્સલ ઓર્ડર ટોકન નંબર સાથે — એ જ કિચન, એ જ રિપોર્ટ."
    ),
  },
];

export const STEPS: { title: Localized; body: Localized }[] = [
  {
    title: L("Tell us about your restaurant", "તમારી રેસ્ટોરન્ટ વિશે જણાવો"),
    body: L("We set up your menus, categories, kitchens and staff logins.", "અમે તમારા મેનુ, કેટેગરી, કિચન અને સ્ટાફ લોગિન સેટ કરી આપીએ."),
  },
  {
    title: L("Stick the QR codes", "QR સ્ટીકર લગાવો"),
    body: L("Print the A4 QR sheet — one QR for each side of a table.", "A4 શીટ પ્રિન્ટ કરો — ટેબલની દરેક બાજુ માટે એક QR."),
  },
  {
    title: L("Start taking orders", "ઓર્ડર લેવાનું શરૂ"),
    body: L("Staff log in with a PIN on your own link and install it like an app.", "સ્ટાફ તમારી પોતાની લિંક પર PIN થી લોગિન કરે અને એપની જેમ ઇન્સ્ટોલ કરે."),
  },
];

/**
 * The band under the hero. Every line is a fact about the product, checkable
 * on this page — never "trusted by 10,000 restaurants", which Jamavat would
 * have to invent and which Google penalises as a false claim.
 */
export const PROOF: { value: Localized; label: Localized }[] = [
  { value: L("0", "0"), label: L("apps for your guests to install", "ગ્રાહકે ડાઉનલોડ કરવાની એપ") },
  { value: L("2", "2"), label: L("languages — English and ગુજરાતી", "ભાષા — English અને ગુજરાતી") },
  { value: L("1 day", "1 દિવસ"), label: L("from your menu to your first order", "તમારા મેનુથી પહેલા ઓર્ડર સુધી") },
  { value: L("₹0", "₹0"), label: L("hardware — any phone or tablet works", "મશીનનો ખર્ચ — કોઈપણ ફોન કે ટેબ્લેટ ચાલે") },
];

export const FAQS: { q: Localized; a: Localized }[] = [
  {
    q: L("Do guests need to install an app?", "ગ્રાહકે એપ ડાઉનલોડ કરવી પડે?"),
    a: L(
      "No. They scan the QR on the table and the menu opens in their phone's browser.",
      "ના. ટેબલ પરનો QR સ્કેન કરતાં જ ફોનના બ્રાઉઝરમાં મેનુ ખૂલે છે."
    ),
  },
  {
    q: L("Can one restaurant have two kitchens or two cuisines?", "એક રેસ્ટોરન્ટમાં બે કિચન કે બે ક્યુઝીન ચાલે?"),
    a: L(
      "Yes. Make as many menus and categories as you need and choose which kitchen sees what. With a single menu, guests never see menu tabs.",
      "હા. જોઈએ તેટલા મેનુ અને કેટેગરી બનાવો અને કયું કિચન શું જુએ તે નક્કી કરો. એક જ મેનુ હોય તો ગ્રાહકને મેનુ ટેબ દેખાતી જ નથી."
    ),
  },
  {
    q: L("Does it work in Gujarati?", "ગુજરાતીમાં ચાલે છે?"),
    a: L(
      "Yes. Guests and staff can switch between English and ગુજરાતી, and every dish can have a name in both.",
      "હા. ગ્રાહક અને સ્ટાફ English અને ગુજરાતી વચ્ચે બદલી શકે, અને દરેક વાનગીનું નામ બંને ભાષામાં રાખી શકાય."
    ),
  },
  {
    q: L("How do guests pay?", "ગ્રાહક પેમેન્ટ કેવી રીતે કરે?"),
    a: L(
      "At the counter after the meal — cash, UPI or card. The counter marks the payment and the guest gets the bill details by email.",
      "જમ્યા પછી કાઉન્ટર પર — રોકડ, UPI કે કાર્ડ. કાઉન્ટર પેમેન્ટ નોંધે અને ગ્રાહકને ઈમેલમાં બિલ મળે."
    ),
  },
  {
    q: L("Do I need a printer or special hardware?", "પ્રિન્ટર કે ખાસ મશીન જોઈએ?"),
    a: L(
      "No. Any phone, tablet or laptop with a browser works, and staff can install it like an app.",
      "ના. બ્રાઉઝરવાળો કોઈપણ ફોન, ટેબ્લેટ કે લેપટોપ ચાલે, અને સ્ટાફ તેને એપની જેમ ઇન્સ્ટોલ કરી શકે."
    ),
  },
  {
    q: L("Can other restaurants see my data?", "બીજી રેસ્ટોરન્ટ મારો ડેટા જોઈ શકે?"),
    a: L(
      "No. Every restaurant has its own link, its own staff logins and its own data.",
      "ના. દરેક રેસ્ટોરન્ટની પોતાની લિંક, પોતાના સ્ટાફ લોગિન અને પોતાનો ડેટા હોય છે."
    ),
  },
  {
    q: L("Does it handle parcel and counter orders too?", "પાર્સલ અને કાઉન્ટર ઓર્ડર પણ લેવાય?"),
    a: L(
      "Yes. The counter types in a parcel or walk-in order, it gets a token number, and it goes to the same kitchen screens as the table orders. It shows up separately in the daily report.",
      "હા. કાઉન્ટર પાર્સલ કે સીધો આવેલો ઓર્ડર લખે, તેને ટોકન નંબર મળે, અને ટેબલના ઓર્ડરની જેમ જ કિચન સ્ક્રીન પર જાય. રોજના રિપોર્ટમાં તે અલગ દેખાય છે."
    ),
  },
  {
    q: L("How long does it take to start?", "શરૂ કરવામાં કેટલો સમય લાગે?"),
    a: L(
      "Usually a day. We set up your menu, kitchens and QR codes with you, you stick the codes on the tables, and your staff can take orders the same evening.",
      "સામાન્ય રીતે એક દિવસ. તમારી સાથે મળીને અમે મેનુ, કિચન અને QR કોડ સેટ કરીએ, તમે ટેબલ પર સ્ટીકર લગાવો, અને એ જ સાંજે સ્ટાફ ઓર્ડર લેતો થઈ જાય."
    ),
  },
  // Keep last: the pricing page shows this one on its own.
  {
    q: L("What does it cost?", "ભાવ કેટલો?"),
    a: L(
      "Jamavat is a monthly subscription per restaurant, with a free trial to start. Ask for a demo and we'll show you the plan that fits your number of tables.",
      "જમાવટ દરેક રેસ્ટોરન્ટ માટે માસિક સબ્સ્ક્રિપ્શન છે, શરૂઆતમાં મફત ટ્રાયલ સાથે. ડેમો માગો — તમારા ટેબલ પ્રમાણેનો પ્લાન બતાવીશું."
    ),
  },
];

export const INQUIRY = {
  title: L("Book a free demo", "મફત ડેમો બુક કરો"),
  body: L(
    "Tell us a little about your restaurant. We'll call you back, show you Jamavat on your own menu, and set it up for you.",
    "તમારી રેસ્ટોરન્ટ વિશે થોડું જણાવો. અમે સામે ફોન કરીશું, તમારા જ મેનુ પર જમાવટ બતાવીશું અને સેટઅપ કરી આપીશું."
  ),
  fields: {
    name: L("Your name", "તમારું નામ"),
    phone: L("Phone", "ફોન નંબર"),
    restaurant: L("Restaurant name", "રેસ્ટોરન્ટનું નામ"),
    city: L("City", "શહેર"),
    email: L("Email (optional)", "ઈમેલ (મરજિયાત)"),
    tables: L("Number of tables", "ટેબલની સંખ્યા"),
    kitchens: L("Kitchens", "કિચન"),
    message: L("Anything else?", "બીજું કંઈ?"),
    optional: L("(optional)", "(મરજિયાત)"),
  },
  tables: ["1–10", "11–25", "26–50", "50+"],
  kitchens: [L("1", "1"), L("2", "2"), L("3 or more", "3 કે વધુ")],
  submit: L("Send inquiry", "વિનંતી મોકલો"),
  sending: L("Sending…", "મોકલાઈ રહ્યું છે…"),
  done: L("Thank you — we'll call you soon.", "આભાર — અમે જલદી ફોન કરીશું."),
  privacy: L("We only use this to contact you about Jamavat.", "આ વિગત ફક્ત જમાવટ વિશે સંપર્ક કરવા વપરાય છે."),
  whatsapp: L("Chat on WhatsApp", "WhatsApp પર વાત કરો"),
};

export const NAV = {
  features: L("Features", "ફીચર્સ"),
  how: L("How it works", "કેમ ચાલે છે"),
  pricing: L("Pricing", "ભાવ"),
  faq: L("FAQ", "સવાલ-જવાબ"),
  demo: L("Book a free demo", "મફત ડેમો બુક કરો"),
  /** The same button at phone width, where the full label overflows the bar. */
  demoShort: L("Free demo", "મફત ડેમો"),
  contact: L("Talk to us", "અમારો સંપર્ક"),
  openMenu: L("Open menu", "મેનુ ખોલો"),
  closeMenu: L("Close menu", "મેનુ બંધ કરો"),
  seeHow: L("See how it works", "કેમ ચાલે છે તે જુઓ"),
  privacy: L("Privacy policy", "પ્રાઇવસી પોલિસી"),
  terms: L("Terms", "શરતો"),
  staffLogin: L("Restaurant login", "રેસ્ટોરન્ટ લોગિન"),
  solutions: L("Solutions", "સોલ્યુશન"),
  tagline: L("QR ordering & kitchen software for restaurants", "રેસ્ટોરન્ટ માટે QR ઓર્ડરિંગ અને કિચન સોફ્ટવેર"),
};

export const SECTIONS = {
  featuresTitle: L("Everything a busy restaurant needs", "ધમધમતી રેસ્ટોરન્ટને જોઈએ તે બધું"),
  featuresBody: L(
    "From the guest's phone to the kitchen to the owner's report — one system, live on every screen.",
    "ગ્રાહકના ફોનથી કિચન સુધી અને માલિકના રિપોર્ટ સુધી — એક જ સિસ્ટમ, દરેક સ્ક્રીન પર લાઇવ."
  ),
  showcaseEyebrow: L("Real screens", "સાચી સ્ક્રીન"),
  showcaseTitle: L("See it on every screen", "દરેક સ્ક્રીન પર જુઓ"),
  showcaseBody: L(
    "Four screens, one system. These are real screens from the Jamavat demo restaurant — not drawings of what it might look like.",
    "ચાર સ્ક્રીન, એક સિસ્ટમ. આ જમાવટના ડેમો રેસ્ટોરન્ટની સાચી સ્ક્રીન છે — કેવું દેખાશે તેનાં ચિત્રો નહીં."
  ),
  howTitle: L("Live in three steps", "ત્રણ સ્ટેપમાં શરૂ"),
  howBody: L(
    "We do the setting up. You stick the codes on the tables.",
    "સેટઅપ અમે કરીએ. તમારે ટેબલ પર સ્ટીકર લગાવવાના."
  ),
  relatedTitle: L("Read more", "વધુ વાંચો"),
  onThisPage: L("What this page covers", "આ પાના પર શું છે"),
  followTitle: L("Jamavat on Instagram", "Instagram પર જમાવટ"),
  followBody: L(
    "New features, restaurant setups and short how-to clips — in English and ગુજરાતી.",
    "નવા ફીચર્સ, રેસ્ટોરન્ટના સેટઅપ અને ટૂંકી how-to ક્લિપ — English અને ગુજરાતીમાં."
  ),
  follow: L("Follow @jamavat.india", "@jamavat.india ને ફોલો કરો"),
  faqTitle: L("Questions owners ask", "માલિકો જે પૂછે છે"),
  pricingTitle: L("Simple monthly pricing", "સરળ માસિક ભાવ"),
  pricingBody: L(
    "One subscription per restaurant, billed monthly or yearly. Start with a free trial — we set everything up before you pay.",
    "દરેક રેસ્ટોરન્ટ માટે એક સબ્સ્ક્રિપ્શન, માસિક કે વાર્ષિક. મફત ટ્રાયલથી શરૂ કરો — પૈસા પહેલાં અમે બધું સેટ કરી આપીએ."
  ),
  pricingAsk: L("Plans are set per restaurant. Ask for a demo and we'll quote yours.", "પ્લાન દરેક રેસ્ટોરન્ટ પ્રમાણે. ડેમો માગો — તમારો ભાવ જણાવીશું."),
  perMonth: L("/ month", "/ મહિને"),
  perYear: L("/ year", "/ વર્ષે"),
  popular: L("Most popular", "સૌથી વધુ લેવાય છે"),
  talkToUs: L("Talk to us", "અમને પૂછો"),
};

/**
 * One page per thing restaurant owners actually search for. Each has its own
 * title, description and body — Google ranks pages, not keywords, and a page
 * that only repeats the home page's words ranks for nothing.
 */
export interface KeywordPage {
  slug: string;
  /** Short link text for the footer — the words someone searches for. */
  label: Localized;
  title: Localized;
  description: Localized;
  /** The small line above the h1 — says what kind of page this is. */
  eyebrow: Localized;
  /** One line under the link to this page from its sibling pages. */
  teaser: Localized;
  heading: Localized;
  intro: Localized;
  /**
   * The screen this page is about, from the seeded demo restaurant. A page
   * of nothing but paragraphs is the one thing every reader scrolls past:
   * these pages are what someone lands on from a search, so each one has to
   * show the thing it describes.
   */
  image: string;
  imageShape: "phone" | "screen";
  imageAlt: Localized;
  /** Scannable facts beside the screenshot, for the reader who won't read the prose. */
  highlights: Localized[];
  sections: { heading: Localized; body: Localized }[];
}

export const KEYWORD_PAGES: KeywordPage[] = [
  {
    slug: "restaurant-management-software",
    label: L("Restaurant management software", "રેસ્ટોરન્ટ મેનેજમેન્ટ સોફ્ટવેર"),
    title: L("Restaurant management software for Indian restaurants", "ભારતીય રેસ્ટોરન્ટ માટે રેસ્ટોરન્ટ મેનેજમેન્ટ સોફ્ટવેર"),
    description: L(
      "Jamavat is restaurant management software for Indian restaurants: QR table ordering, kitchen screens, billing and daily reports, in English and Gujarati.",
      "જમાવટ ભારતીય રેસ્ટોરન્ટ માટેનું મેનેજમેન્ટ સોફ્ટવેર છે: QR ટેબલ ઓર્ડરિંગ, કિચન સ્ક્રીન, બિલિંગ અને રોજનો રિપોર્ટ — English અને ગુજરાતીમાં."
    ),
    eyebrow: L("Restaurant management software", "રેસ્ટોરન્ટ મેનેજમેન્ટ સોફ્ટવેર"),
    teaser: L("Menus, orders, kitchens, billing and the day’s numbers in one place.", "મેનુ, ઓર્ડર, કિચન, બિલિંગ અને દિવસના આંકડા એક જ જગ્યાએ."),
    heading: L("Restaurant management software that your staff will actually use", "સ્ટાફ ખરેખર વાપરે એવું રેસ્ટોરન્ટ મેનેજમેન્ટ સોફ્ટવેર"),
    intro: L(
      "Most restaurant software asks you to change how your restaurant runs. Jamavat starts from what already happens at your tables: the guest sits down, orders, eats, and pays at the counter on the way out. It takes care of the ordering, the kitchens, the bill and the day's numbers — nothing else to learn.",
      "મોટા ભાગનું રેસ્ટોરન્ટ સોફ્ટવેર તમારી ચાલતી પદ્ધતિ બદલાવે છે. જમાવટ તમારા ટેબલ પર જે થાય છે ત્યાંથી જ શરૂ થાય છે: ગ્રાહક બેસે, ઓર્ડર આપે, જમે અને જતી વખતે કાઉન્ટર પર પેમેન્ટ કરે. ઓર્ડર, કિચન, બિલ અને દિવસના આંકડા — એ બધું આ સંભાળે, શીખવાનું બીજું કંઈ નહીં."
    ),
    image: "/site/hero-report.png",
    imageShape: "screen",
    imageAlt: L("The owner's report: today's sales, orders and top dishes", "માલિકનો રિપોર્ટ: આજનું વેચાણ, ઓર્ડર અને ટોપ વાનગીઓ"),
    highlights: [
      L("Menus, categories and dish photos", "મેનુ, કેટેગરી અને વાનગીના ફોટા"),
      L("QR ordering, one code per seat", "QR ઓર્ડર, બેઠક દીઠ એક કોડ"),
      L("Item-wise kitchen routing", "વાનગી પ્રમાણે કિચન રૂટિંગ"),
      L("Billing, parcel orders and daily reports", "બિલિંગ, પાર્સલ ઓર્ડર અને રોજના રિપોર્ટ"),
    ],
    sections: [
      {
        heading: L("What it covers", "શું શું આવે છે"),
        body: L(
          "Dynamic menus with categories and dish photos, QR ordering per seat, item-wise kitchen routing, sold-out toggles, counter and parcel orders with token numbers, one bill per table with cash/UPI/card, and reports for today, the last 7 days and the month.",
          "કેટેગરી અને ફોટા સાથેના ડાયનેમિક મેનુ, દરેક બેઠક માટે QR ઓર્ડર, વાનગી પ્રમાણે કિચન રૂટિંગ, સોલ્ડ-આઉટ ટૉગલ, ટોકન નંબરવાળા કાઉન્ટર અને પાર્સલ ઓર્ડર, ટેબલ દીઠ એક બિલ (રોકડ/UPI/કાર્ડ), અને આજનો, છેલ્લા 7 દિવસનો તથા મહિનાનો રિપોર્ટ."
        ),
      },
      {
        heading: L("What it deliberately leaves out", "શું જાણીજોઈને નથી રાખ્યું"),
        body: L(
          "No inventory modules nobody fills in, no loyalty points, no hardware to buy. Less to set up means your staff are using it the same evening.",
          "કોઈ ન ભરે એવા ઇન્વેન્ટરી મોડ્યુલ નહીં, લોયલ્ટી પોઈન્ટ નહીં, ખરીદવાનું કોઈ મશીન નહીં. ઓછું સેટઅપ એટલે એ જ સાંજે સ્ટાફ વાપરતો થઈ જાય."
        ),
      },
    ],
  },
  {
    slug: "qr-code-ordering-system",
    label: L("QR code ordering system", "QR કોડ ઓર્ડરિંગ સિસ્ટમ"),
    title: L("QR code ordering system for restaurants", "રેસ્ટોરન્ટ માટે QR કોડ ઓર્ડરિંગ સિસ્ટમ"),
    description: L(
      "A QR code ordering system where every seat has its own code: guests scan, order and track their food, and the kitchen gets it at once. No app needed.",
      "એવી QR ઓર્ડરિંગ સિસ્ટમ જેમાં દરેક બેઠકનો પોતાનો કોડ છે: ગ્રાહક સ્કેન કરી ઓર્ડર આપે અને સ્ટેટસ જુએ, કિચનને તરત મળે. ગ્રાહક માટે કોઈ એપ નહીં."
    ),
    eyebrow: L("QR code ordering system", "QR કોડ ઓર્ડરિંગ સિસ્ટમ"),
    teaser: L("One code per seat, no app, and the kitchen gets the order at once.", "બેઠક દીઠ એક કોડ, એપ નહીં, અને ઓર્ડર તરત કિચનમાં."),
    heading: L("A QR code ordering system built around one guest per code", "દરેક કોડ દીઠ એક ગ્રાહક — એ રીતે બનેલી QR ઓર્ડરિંગ સિસ્ટમ"),
    intro: L(
      "A table-wide QR sounds simpler until two groups share a table, or someone at home scans a photo of it. In Jamavat each side of a table has its own code (4A, 4B), and a code belongs to one guest from their first order until the bill is settled.",
      "આખા ટેબલ માટે એક QR સહેલું લાગે — પણ એક ટેબલ પર બે ગ્રુપ બેસે, કે કોઈ ઘરે બેઠા QR ના ફોટા પરથી સ્કેન કરે ત્યારે નહીં. જમાવટમાં ટેબલની દરેક બાજુનો પોતાનો કોડ છે (4A, 4B), અને એ કોડ પહેલા ઓર્ડરથી બિલ થાય ત્યાં સુધી એક જ ગ્રાહકનો રહે છે."
    ),
    image: "/site/hero-guest-menu.png",
    imageShape: "phone",
    imageAlt: L("The guest menu on a phone after scanning a table QR", "ટેબલનો QR સ્કેન કર્યા પછી ફોન પર ગ્રાહકનું મેનુ"),
    highlights: [
      L("One code per seat — 4A, 4B", "બેઠક દીઠ એક કોડ — 4A, 4B"),
      L("No app for your guests", "ગ્રાહક માટે કોઈ એપ નહીં"),
      L("A random token, never the table number", "રેન્ડમ ટોકન, ટેબલ નંબર નહીં"),
      L("Email verified once per sitting", "બેઠક દીઠ એક વાર ઈમેલ વેરિફાય"),
    ],
    sections: [
      {
        heading: L("How a guest uses it", "ગ્રાહક કેવી રીતે વાપરે"),
        body: L(
          "Scan, browse the menu with photos and veg marks, add a cooking note, and verify an email once for the sitting. After ordering the phone shows what's coming and the running total.",
          "સ્કેન કરો, ફોટા અને વેજ માર્ક સાથેનું મેનુ જુઓ, રસોઈ માટે નોંધ ઉમેરો, અને એ બેઠક માટે એક વાર ઈમેલ વેરિફાય કરો. ઓર્ડર પછી ફોન પર શું આવી રહ્યું છે અને કુલ રકમ દેખાય."
        ),
      },
      {
        heading: L("Why the codes are secret", "કોડ ગુપ્ત કેમ છે"),
        body: L(
          "The QR holds a random token, never the table number, so nobody can guess a link and order for table 4 from outside. Reprinting a code kills the old sticker.",
          "QR માં ટેબલ નંબર નહીં પણ રેન્ડમ ટોકન હોય છે, એટલે બહારથી લિંક ધારીને ટેબલ 4 માટે ઓર્ડર ન થઈ શકે. કોડ ફરી બનાવતાં જૂનું સ્ટીકર બંધ થઈ જાય."
        ),
      },
    ],
  },
  {
    slug: "kitchen-display-system",
    label: L("Kitchen display system", "કિચન ડિસ્પ્લે સિસ્ટમ"),
    title: L("Kitchen display system (KDS) for multi-kitchen restaurants", "બે કે વધુ કિચનવાળી રેસ્ટોરન્ટ માટે કિચન ડિસ્પ્લે સિસ્ટમ (KDS)"),
    description: L(
      "A kitchen display system that splits one order item-wise: each kitchen screen shows only the dishes it cooks, with a sound for every new ticket.",
      "એવી કિચન ડિસ્પ્લે સિસ્ટમ જે એક ઓર્ડરને વાનગી પ્રમાણે વહેંચે: દરેક કિચન સ્ક્રીન પર ફક્ત તેની જ વાનગી, અને દરેક નવા ટિકિટ પર અવાજ."
    ),
    eyebrow: L("Kitchen display system", "કિચન ડિસ્પ્લે સિસ્ટમ"),
    teaser: L("Each kitchen screen shows only the dishes that kitchen cooks.", "દરેક કિચન સ્ક્રીન પર ફક્ત એ જ કિચનની વાનગીઓ."),
    heading: L("A kitchen screen that shows one kitchen its own dishes", "દરેક કિચનને તેની જ વાનગી બતાવતી સ્ક્રીન"),
    intro: L(
      "If your Gujarati and Punjabi kitchens both see every ticket, both have to read past dishes they don't cook. Jamavat routes by category: the admin ticks which categories a kitchen login receives, and one order splits itself between them.",
      "જો ગુજરાતી અને પંજાબી બંને કિચનને દરેક ટિકિટ દેખાય, તો બંનેને પોતાની ન હોય એવી વાનગીઓ વાંચવી પડે. જમાવટ કેટેગરી પ્રમાણે મોકલે છે: એડમિન નક્કી કરે કે કયું કિચન લોગિન કઈ કેટેગરી મેળવે, અને એક ઓર્ડર જાતે બંનેમાં વહેંચાય."
    ),
    image: "/site/hero-kitchen.png",
    imageShape: "screen",
    imageAlt: L("A kitchen screen showing only that kitchen's dishes", "ફક્ત એ જ કિચનની વાનગીઓ બતાવતી કિચન સ્ક્રીન"),
    highlights: [
      L("Each screen sees only its categories", "દરેક સ્ક્રીન ફક્ત તેની કેટેગરી જુએ"),
      L("One order splits between kitchens", "એક ઓર્ડર કિચન વચ્ચે વહેંચાય"),
      L("Ready marked item by item", "વાનગી પ્રમાણે તૈયાર નોંધાય"),
      L("Sold out hides the dish at once", "સોલ્ડ આઉટ કરતાં વાનગી તરત છુપાય"),
    ],
    sections: [
      {
        heading: L("Ready, item by item", "વાનગી પ્રમાણે તૈયાર"),
        body: L(
          "Each kitchen marks only its own items done. The order finishes when the last pending item anywhere is marked ready, so nobody closes a ticket the other kitchen is still cooking.",
          "દરેક કિચન ફક્ત પોતાની વાનગી પૂરી કરે. જ્યારે છેલ્લી બાકી વાનગી તૈયાર થાય ત્યારે જ ઓર્ડર પૂરો ગણાય — એટલે બીજું કિચન રાંધતું હોય ત્યારે કોઈ ટિકિટ બંધ ન કરી શકે."
        ),
      },
      {
        heading: L("Sold out in one tap", "એક ટેપમાં સોલ્ડ આઉટ"),
        body: L(
          "A kitchen can mark its own dish sold out during service; the guest menu hides it at once and an order containing it is refused.",
          "સેવા દરમિયાન કિચન પોતાની વાનગી સોલ્ડ આઉટ કરી શકે; ગ્રાહકના મેનુમાંથી તરત હટી જાય અને એ વાનગીવાળો ઓર્ડર સ્વીકારાય નહીં."
        ),
      },
    ],
  },
  {
    slug: "restaurant-billing-software",
    label: L("Restaurant billing software", "રેસ્ટોરન્ટ બિલિંગ સોફ્ટવેર"),
    title: L("Restaurant billing software with QR orders and daily reports", "QR ઓર્ડર અને રોજના રિપોર્ટ સાથેનું રેસ્ટોરન્ટ બિલિંગ સોફ્ટવેર"),
    description: L(
      "Restaurant billing software where the bill builds itself from the table's orders: one bill per sitting, cash/UPI/card, a thank-you email and sales reports.",
      "એવું બિલિંગ સોફ્ટવેર જેમાં ટેબલના ઓર્ડરમાંથી બિલ જાતે બને છે: બેઠક દીઠ એક બિલ, રોકડ/UPI/કાર્ડ, આભારનો ઈમેલ અને વેચાણના રિપોર્ટ."
    ),
    eyebrow: L("Restaurant billing software", "રેસ્ટોરન્ટ બિલિંગ સોફ્ટવેર"),
    teaser: L("The bill writes itself from the table’s orders — cash, UPI or card.", "ટેબલના ઓર્ડરમાંથી બિલ જાતે બને — રોકડ, UPI કે કાર્ડ."),
    heading: L("The bill is already written by the time they reach the counter", "ગ્રાહક કાઉન્ટર પર પહોંચે ત્યાં સુધીમાં બિલ તૈયાર"),
    intro: L(
      "Everything ordered at a table — by the guest's phone or typed at the counter — lands on one bill for that sitting. The counter adds a discount if you give one, takes cash, UPI or card, and the table frees itself for the next guest.",
      "ટેબલ પર જે કંઈ ઓર્ડર થયું હોય — ગ્રાહકના ફોનથી કે કાઉન્ટર પર લખાયેલું — એ બધું એ બેઠકના એક બિલમાં આવે. કાઉન્ટર ડિસ્કાઉન્ટ આપે, રોકડ/UPI/કાર્ડ લે, અને ટેબલ આપમેળે આગળના ગ્રાહક માટે ખાલી થઈ જાય."
    ),
    image: "/site/hero-counter.png",
    imageShape: "screen",
    imageAlt: L("The counter screen with a table's bill ready to settle", "ટેબલનું બિલ તૈયાર હોય એવી કાઉન્ટર સ્ક્રીન"),
    highlights: [
      L("The bill builds itself from the orders", "ઓર્ડરમાંથી બિલ જાતે બને"),
      L("Discount, then cash, UPI or card", "ડિસ્કાઉન્ટ, પછી રોકડ, UPI કે કાર્ડ"),
      L("Thank-you email with a review link", "રિવ્યૂ લિંક સાથે આભારનો ઈમેલ"),
      L("Sales, payment split and top dishes", "વેચાણ, પેમેન્ટ વિભાજન અને ટોપ વાનગીઓ"),
    ],
    sections: [
      {
        heading: L("What the guest gets", "ગ્રાહકને શું મળે"),
        body: L(
          "A thank-you email with the dishes, the total and how they paid — and a button to review you on Google, if you add the link.",
          "વાનગીઓ, કુલ રકમ અને પેમેન્ટ કેવી રીતે થયું એ સાથેનો આભારનો ઈમેલ — અને તમે લિંક ઉમેરો તો Google રિવ્યૂનું બટન."
        ),
      },
      {
        heading: L("What you get", "તમને શું મળે"),
        body: L(
          "Sales after discounts, dine-in versus parcel, cash/UPI/card split, top dishes and sales per menu — for today, yesterday, the last 7 days or any month.",
          "ડિસ્કાઉન્ટ પછીનું વેચાણ, ડાઇન-ઇન અને પાર્સલ, રોકડ/UPI/કાર્ડનું વિભાજન, ટોપ વાનગીઓ અને મેનુ પ્રમાણે વેચાણ — આજનું, ગઈકાલનું, છેલ્લા 7 દિવસનું કે કોઈપણ મહિનાનું."
        ),
      },
    ],
  },
  {
    slug: "restaurant-bill-format",
    label: L("Restaurant bill format", "રેસ્ટોરન્ટ બિલ ફોર્મેટ"),
    title: L("Restaurant bill format: what a dine-in bill must show", "રેસ્ટોરન્ટ બિલ ફોર્મેટ: ડાઇન-ઇન બિલમાં શું હોવું જોઈએ"),
    description: L(
      "The lines a restaurant bill needs — dishes, quantity, discount, GST and the total — and how Jamavat builds one from the table's own orders.",
      "રેસ્ટોરન્ટના બિલમાં જે લીટીઓ જોઈએ — વાનગી, નંગ, ડિસ્કાઉન્ટ, GST અને કુલ — અને જમાવટ એ બિલ ટેબલના ઓર્ડરમાંથી જાતે કેવી રીતે બનાવે છે."
    ),
    eyebrow: L("Bill format", "બિલ ફોર્મેટ"),
    teaser: L("Every line a dine-in bill needs, and who fills each one in.", "ડાઇન-ઇન બિલની દરેક લીટી, અને એ કોણ ભરે છે."),
    heading: L("A dine-in bill that writes itself from the table's orders", "ટેબલના ઓર્ડરમાંથી જાતે બનતું ડાઇન-ઇન બિલ"),
    intro: L(
      "A restaurant bill is not a form to fill in — it is a record of what that table ate. The fields are always the same: the restaurant's name and address, the bill number, the table, the date and time, then each dish with its quantity and amount, the discount if any, GST if you charge it, and what the guest actually pays. Jamavat fills every one of them from the orders that table already sent to the kitchen.",
      "રેસ્ટોરન્ટનું બિલ ભરવાનું ફોર્મ નથી — એ તો ટેબલે શું જમ્યું તેની નોંધ છે. લીટીઓ હંમેશાં એ જ હોય: રેસ્ટોરન્ટનું નામ અને સરનામું, બિલ નંબર, ટેબલ, તારીખ-સમય, પછી દરેક વાનગી તેના નંગ અને રકમ સાથે, ડિસ્કાઉન્ટ હોય તો એ, GST લેતા હો તો એ, અને ગ્રાહક ખરેખર જેટલું ચૂકવે એ રકમ. જમાવટ આ બધી લીટીઓ એ જ ઓર્ડરમાંથી ભરે છે જે ટેબલે કિચનમાં મોકલ્યા હતા."
    ),
    image: "/site/hero-counter.png",
    imageShape: "screen",
    imageAlt: L("The counter's bill for one table, ready to settle", "એક ટેબલનું બિલ, કાઉન્ટર પર સેટલ કરવા તૈયાર"),
    highlights: [
      L("Dish, quantity and amount per line", "દરેક લીટીમાં વાનગી, નંગ અને રકમ"),
      L("Discount before tax, never after", "ટેક્સ પહેલાં ડિસ્કાઉન્ટ, પછી નહીં"),
      L("Bill numbers run on across days", "બિલ નંબર રોજેરોજ આગળ વધે"),
      L("One bill per sitting, not per order", "એક બેઠકનું એક બિલ, ઓર્ડર દીઠ નહીં"),
    ],
    sections: [
      {
        heading: L("What the bill has to show", "બિલમાં શું હોવું જોઈએ"),
        body: L(
          "Your name, address and phone at the top; the bill number, table and time next to them; then the dishes. Repeat orders of the same dish become one line with the quantity added up, so a table that ordered rotli three times reads as one line, not three.",
          "ઉપર તમારું નામ, સરનામું અને ફોન; તેની સાથે બિલ નંબર, ટેબલ અને સમય; પછી વાનગીઓ. એક જ વાનગી વારંવાર મંગાવી હોય તો એની એક જ લીટી બને અને નંગ ઉમેરાઈ જાય — ત્રણ વાર રોટલી મંગાવી હોય તો એક લીટી, ત્રણ નહીં."
        ),
      },
      {
        heading: L("Discount, then GST, then the total", "ડિસ્કાઉન્ટ, પછી GST, પછી કુલ"),
        body: L(
          "The order matters. The discount comes off the items total, and GST is worked out on what is left — not on the amount before the discount. Jamavat does it in that order and shows all three lines, so the guest can see where the figure came from.",
          "ક્રમ મહત્ત્વનો છે. ડિસ્કાઉન્ટ વાનગીઓના કુલમાંથી બાદ થાય, અને GST બાકી રહેલી રકમ પર ગણાય — ડિસ્કાઉન્ટ પહેલાંની રકમ પર નહીં. જમાવટ આ જ ક્રમમાં ગણે છે અને ત્રણેય લીટી બતાવે છે, જેથી ગ્રાહકને ખબર પડે કે આંકડો ક્યાંથી આવ્યો."
        ),
      },
      {
        heading: L("One bill per sitting", "એક બેઠકનું એક બિલ"),
        body: L(
          "A table that orders four times gets one bill, not four. The bill stays open while they eat and closes when the counter settles it — and two people settling the same table at the same moment still produce one bill, with a number that never repeats.",
          "ચાર વાર ઓર્ડર આપનાર ટેબલનું એક જ બિલ બને, ચાર નહીં. જમતાં હોય ત્યાં સુધી બિલ ખુલ્લું રહે અને કાઉન્ટર સેટલ કરે ત્યારે બંધ થાય — અને બે જણ એકસાથે એ જ ટેબલ સેટલ કરે તોય બિલ એક જ બને, એવા નંબર સાથે જે ફરી ન આવે."
        ),
      },
    ],
  },
  {
    slug: "kot-format",
    label: L("KOT format", "KOT ફોર્મેટ"),
    title: L("KOT format: what a kitchen order ticket should show", "KOT ફોર્મેટ: કિચન ઓર્ડર ટિકિટમાં શું હોવું જોઈએ"),
    description: L(
      "A kitchen order ticket needs the token, the table, the dishes with quantity and the cooking note — on a screen each kitchen can mark ready item by item.",
      "કિચન ઓર્ડર ટિકિટમાં ટોકન, ટેબલ, નંગ સાથે વાનગીઓ અને રસોઈ નોંધ જોઈએ — એવી સ્ક્રીન પર જ્યાં દરેક કિચન વાનગી પ્રમાણે તૈયાર નોંધે."
    ),
    eyebrow: L("KOT format", "KOT ફોર્મેટ"),
    teaser: L("The ticket the kitchen reads, and what belongs on it.", "કિચન જે ટિકિટ વાંચે છે, અને એમાં શું હોવું જોઈએ."),
    heading: L("The kitchen's ticket, on a screen instead of a chit", "ચિઠ્ઠીની જગ્યાએ સ્ક્રીન પર કિચનની ટિકિટ"),
    intro: L(
      "A KOT — kitchen order ticket — is the slip that tells a kitchen what to cook. It needs four things and nothing else: which order it is (the token), where it goes (the table), what to make (dish and quantity) and anything the guest asked for. Everything else on a printed chit is there because paper cannot change once it is torn off.",
      "KOT — કિચન ઓર્ડર ટિકિટ — એ ચિઠ્ઠી છે જે કિચનને કહે છે કે શું રાંધવાનું છે. એમાં ચાર જ વસ્તુ જોઈએ: કયો ઓર્ડર (ટોકન), ક્યાં જવાનો (ટેબલ), શું બનાવવાનું (વાનગી અને નંગ) અને ગ્રાહકે કંઈ કહ્યું હોય તે. છાપેલી ચિઠ્ઠી પરનું બાકીનું બધું એટલા માટે હોય છે કે કાગળ ફાટી ગયા પછી બદલાતો નથી."
    ),
    image: "/site/hero-kitchen.png",
    imageShape: "screen",
    imageAlt: L("Kitchen tickets on a screen, newest first", "સ્ક્રીન પર કિચનની ટિકિટો, નવી પહેલાં"),
    highlights: [
      L("Token and table on every ticket", "દરેક ટિકિટ પર ટોકન અને ટેબલ"),
      L("Only this kitchen's dishes", "ફક્ત આ કિચનની વાનગીઓ"),
      L("The guest's cooking note, as written", "ગ્રાહકની રસોઈ નોંધ, જેમ લખી તેમ"),
      L("A sound when a new one arrives", "નવી આવે ત્યારે અવાજ"),
    ],
    sections: [
      {
        heading: L("Four fields, in this order", "ચાર ખાનાં, આ જ ક્રમમાં"),
        body: L(
          "Token number first — it is what the counter calls out. Then the table, so a runner knows where it goes. Then the dishes with quantities. The cooking note goes last, under the dishes, where a cook reads it after knowing what to make.",
          "પહેલાં ટોકન નંબર — કાઉન્ટર એ જ પોકારે છે. પછી ટેબલ, જેથી લઈ જનારને ખબર પડે ક્યાં જવાનું. પછી નંગ સાથે વાનગીઓ. રસોઈ નોંધ છેલ્લે, વાનગીઓની નીચે — જ્યાં રસોઇયો શું બનાવવાનું એ જાણ્યા પછી વાંચે."
        ),
      },
      {
        heading: L("A chit for each kitchen, from one order", "એક ઓર્ડરમાંથી દરેક કિચનની પોતાની ચિઠ્ઠી"),
        body: L(
          "One table's order usually belongs to more than one kitchen. Jamavat splits it by category, so the Gujarati screen gets a ticket with only the Gujarati dishes on it and the Punjabi screen gets its own — the same order, read twice, with nothing to skip past.",
          "એક ટેબલનો ઓર્ડર મોટે ભાગે એકથી વધુ કિચનનો હોય છે. જમાવટ એને કેટેગરી પ્રમાણે વહેંચે છે — ગુજરાતી સ્ક્રીન પર ફક્ત ગુજરાતી વાનગીવાળી ટિકિટ, પંજાબી સ્ક્રીન પર એની પોતાની. એક જ ઓર્ડર, બે વાર વંચાય, વચ્ચે કશું કૂદવાનું નહીં."
        ),
      },
      {
        heading: L("Why no printer", "પ્રિન્ટર કેમ નહીં"),
        body: L(
          "A printed chit cannot be corrected, cannot say it is twelve minutes old, and cannot be marked ready. The screen does all three: tickets age in front of the cook, a cancelled order disappears, and each kitchen taps its own dishes done.",
          "છાપેલી ચિઠ્ઠી સુધારી શકાતી નથી, પોતે બાર મિનિટ જૂની છે એમ કહી શકતી નથી, અને તૈયાર નોંધી શકાતી નથી. સ્ક્રીન ત્રણેય કરે છે: ટિકિટની ઉંમર રસોઇયા સામે દેખાય, રદ થયેલો ઓર્ડર હટી જાય, અને દરેક કિચન પોતાની વાનગી તૈયાર નોંધે."
        ),
      },
    ],
  },
  {
    slug: "gst-invoice-for-restaurant",
    label: L("GST invoice for restaurants", "રેસ્ટોરન્ટ માટે GST ઇન્વૉઇસ"),
    title: L("GST invoice for a restaurant: CGST, SGST and the bill", "રેસ્ટોરન્ટ માટે GST ઇન્વૉઇસ: CGST, SGST અને બિલ"),
    description: L(
      "How GST sits on a restaurant bill: the rate on the amount after discount, CGST and SGST as half each, your GSTIN on the invoice — worked out at settle.",
      "રેસ્ટોરન્ટના બિલ પર GST કેવી રીતે બેસે: ડિસ્કાઉન્ટ પછીની રકમ પર દર, CGST અને SGST અડધા-અડધા, ઇન્વૉઇસ પર તમારો GSTIN — સેટલ વખતે ગણાઈ જાય."
    ),
    eyebrow: L("GST on the bill", "બિલ પર GST"),
    teaser: L("The rate, the split, and where the GSTIN goes.", "દર, વિભાજન, અને GSTIN ક્યાં આવે."),
    heading: L("GST that is worked out once, at the counter", "કાઉન્ટર પર એક જ વાર ગણાતો GST"),
    intro: L(
      "If you charge GST, the bill has to show it as its own line — not folded into the dish prices. Jamavat asks for the rate once in Settings, and from then on every bill shows the items total, the tax, and what the guest pays. Switch it off and the bill is exactly what it was before: items minus discount.",
      "જો તમે GST લેતા હો, તો બિલમાં એ પોતાની અલગ લીટીમાં દેખાવો જોઈએ — વાનગીના ભાવમાં ભેળવેલો નહીં. જમાવટ સેટિંગમાં એક વાર દર પૂછે છે, અને પછી દરેક બિલમાં વાનગીઓનો કુલ, ટેક્સ અને ગ્રાહક જેટલું ચૂકવે એ દેખાય છે. બંધ કરી દો તો બિલ પહેલાં જેવું જ — વાનગીઓ ઓછું ડિસ્કાઉન્ટ."
    ),
    image: "/site/hero-counter.png",
    imageShape: "screen",
    imageAlt: L("The counter's bill, where the tax is added before settling", "કાઉન્ટરનું બિલ, જ્યાં સેટલ કરતાં પહેલાં ટેક્સ ઉમેરાય છે"),
    highlights: [
      L("One rate, set once in Settings", "એક દર, સેટિંગમાં એક વાર"),
      L("CGST + SGST, or IGST as one line", "CGST + SGST, કે એક લીટીમાં IGST"),
      L("Tax on the amount after discount", "ડિસ્કાઉન્ટ પછીની રકમ પર ટેક્સ"),
      L("GSTIN printed on the emailed invoice", "ઇમેઇલ ઇન્વૉઇસ પર GSTIN"),
    ],
    sections: [
      {
        heading: L("CGST and SGST, half each", "CGST અને SGST, અડધા-અડધા"),
        body: L(
          "A guest from your own state pays the rate as two halves — CGST and SGST — and both belong on the invoice as separate lines. Jamavat rounds each half to the rupee and adds them up, so the two halves and the total always agree. Across states it is IGST instead, as one line at the full rate.",
          "તમારા જ રાજ્યનો ગ્રાહક દર બે ભાગમાં ચૂકવે છે — CGST અને SGST — અને બંને ઇન્વૉઇસ પર અલગ લીટીમાં હોવા જોઈએ. જમાવટ દરેક અડધો ભાગ રૂપિયામાં રાઉન્ડ કરીને સરવાળો કરે છે, એટલે બે ભાગ અને કુલ હંમેશાં મળતા આવે. બીજા રાજ્ય માટે IGST — આખા દરની એક જ લીટી."
        ),
      },
      {
        heading: L("The guest sees it before the counter does", "કાઉન્ટર પહેલાં ગ્રાહકને દેખાય"),
        body: L(
          "The tax is on the guest's own screen while they are still ordering: dishes, GST, and what it comes to. A guest who read ₹400 on their phone and hears ₹420 at the counter argues about ₹20 — and about everything else after that.",
          "ગ્રાહક ઓર્ડર આપતો હોય ત્યારે જ એની સ્ક્રીન પર ટેક્સ દેખાય છે: વાનગીઓ, GST, અને કુલ કેટલું થયું. જે ગ્રાહકે ફોન પર ₹400 વાંચ્યા હોય અને કાઉન્ટર પર ₹420 સાંભળે, એ ₹20 માટે દલીલ કરે — અને પછી બાકીના બધા માટે પણ."
        ),
      },
      {
        heading: L("What Jamavat does not do", "જમાવટ શું નથી કરતું"),
        body: L(
          "It puts GST on the bill and keeps the rate, the split and the amount with that bill, so a rate you change next month never rewrites an invoice already sent. It does not file your returns and it is not your accountant — your CA still files, from figures that now add up.",
          "એ બિલ પર GST મૂકે છે અને દર, વિભાજન તથા રકમ એ જ બિલ સાથે સાચવે છે — એટલે આવતા મહિને તમે દર બદલો તોય મોકલાયેલું ઇન્વૉઇસ બદલાતું નથી. એ તમારું રિટર્ન ભરતું નથી અને તમારો CA નથી — રિટર્ન તો તમારા CA જ ભરશે, પણ હવે મળતા આવતા આંકડા પરથી."
        ),
      },
    ],
  },
  {
    slug: "restaurant-software-surat",
    label: L("Restaurant software in Surat", "સુરતમાં રેસ્ટોરન્ટ સોફ્ટવેર"),
    title: L("Restaurant billing & QR ordering software in Surat", "સુરતમાં રેસ્ટોરન્ટ બિલિંગ અને QR ઓર્ડરિંગ સોફ્ટવેર"),
    description: L(
      "QR table ordering, kitchen screens and billing for Surat restaurants — Gujarati and English, set up at your tables in Adajan, Vesu, Ring Road or Varachha.",
      "સુરતની રેસ્ટોરન્ટ માટે QR ટેબલ ઓર્ડરિંગ, કિચન સ્ક્રીન અને બિલિંગ — ગુજરાતી અને English, અડાજણ, વેસુ, રિંગ રોડ કે વરાછામાં તમારા ટેબલ પર સેટ કરી આપીએ."
    ),
    eyebrow: L("Surat", "સુરત"),
    teaser: L("Set up at your tables, in Gujarati, by someone in Surat.", "તમારા ટેબલ પર, ગુજરાતીમાં, સુરતના જ માણસ દ્વારા સેટ."),
    heading: L("For a Surat restaurant, in the language your guests read", "સુરતની રેસ્ટોરન્ટ માટે, તમારા ગ્રાહકની ભાષામાં"),
    intro: L(
      "Most restaurant software is built for a chain in a metro and translated afterwards, if at all. Jamavat is built in Surat for the restaurants here: a thali hall with two kitchens, a family multi-cuisine place on Ring Road, a dining hall that fills up between one and three. Your guests read the menu in ગુજરાતી or English, whichever they tap, and your staff work the same way they already do.",
      "મોટા ભાગનું રેસ્ટોરન્ટ સોફ્ટવેર મેટ્રોની ચેઇન માટે બને છે અને ભાષાંતર પછી થાય છે — થાય તો. જમાવટ સુરતમાં, અહીંની રેસ્ટોરન્ટ માટે બન્યું છે: બે કિચનવાળો થાળી હૉલ, રિંગ રોડ પરની ફેમિલી મલ્ટિ-ક્વિઝીન જગ્યા, એકથી ત્રણ વાગ્યે ભરાઈ જતો ડાઇનિંગ હૉલ. તમારા ગ્રાહક મેનુ ગુજરાતી કે English — જે દબાવે એમાં વાંચે, અને તમારો સ્ટાફ જેમ કામ કરે છે એમ જ કરે."
    ),
    image: "/site/hero-guest-menu.png",
    imageShape: "phone",
    imageAlt: L("The guest menu on a phone, in Gujarati", "ફોન પર ગુજરાતીમાં ગ્રાહકનું મેનુ"),
    highlights: [
      L("Gujarati and English, dish by dish", "ગુજરાતી અને English, વાનગી પ્રમાણે"),
      L("Thali halls with two kitchens", "બે કિચનવાળા થાળી હૉલ"),
      L("We come and set it up", "અમે આવીને સેટ કરી આપીએ"),
      L("A week on two tables, free", "બે ટેબલ પર એક અઠવાડિયું, મફત"),
    ],
    sections: [
      {
        heading: L("Built for how Surat eats", "સુરત જેમ જમે છે એ પ્રમાણે"),
        body: L(
          "An unlimited thali, a Punjabi counter and a live Chinese counter under one roof is normal here and awkward for software built elsewhere. Jamavat routes each dish to the kitchen that cooks it, and the guest who asks for one more rotli sends it from the phone already in their hand.",
          "અનલિમિટેડ થાળી, પંજાબી કાઉન્ટર અને લાઇવ ચાઇનીઝ કાઉન્ટર — એક જ છત નીચે. અહીં આ સામાન્ય છે, અને બીજે બનેલા સોફ્ટવેર માટે અઘરું. જમાવટ દરેક વાનગી એ જ કિચનમાં મોકલે છે જે એને બનાવે છે, અને વધુ એક રોટલી માગતો ગ્રાહક હાથમાં રહેલા ફોનથી જ એ મોકલે છે."
        ),
      },
      {
        heading: L("Set up at your own tables", "તમારા પોતાના ટેબલ પર સેટ"),
        body: L(
          "We put your real menu in, print the QRs for two tables and stay while the first few orders go through — Adajan, Vesu, Piplod, Ring Road, Varachha, Katargam. Not a form on a website and a login mailed to you.",
          "અમે તમારું સાચું મેનુ નાખીએ, બે ટેબલના QR છાપીએ અને પહેલા થોડા ઓર્ડર પસાર થાય ત્યાં સુધી સાથે રહીએ — અડાજણ, વેસુ, પીપલોદ, રિંગ રોડ, વરાછા, કતારગામ. વેબસાઇટ પરનું ફોર્મ અને ઇમેઇલમાં આવતું લોગિન નહીં."
        ),
      },
      {
        heading: L("Try it on two tables first", "પહેલાં બે ટેબલ પર અજમાવો"),
        body: L(
          "Keep your menu cards and your chits. Put the QR on two tables for a week and see what the guests do with it. If it does not earn its place in that week, nothing changes and nothing is owed.",
          "તમારા મેનુ કાર્ડ અને ચિઠ્ઠીઓ રાખો જ. એક અઠવાડિયા માટે બે ટેબલ પર QR મૂકો અને જુઓ કે ગ્રાહક શું કરે છે. એ અઠવાડિયામાં જો એ પોતાની જગ્યા ન બનાવે, તો કશું બદલવાનું નથી અને કશું ચૂકવવાનું નથી."
        ),
      },
    ],
  },
];

export function keywordPage(slug: string): KeywordPage | undefined {
  return KEYWORD_PAGES.find((page) => page.slug === slug);
}
