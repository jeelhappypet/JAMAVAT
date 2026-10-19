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
};

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
export const SLIDES: { tag: Localized; title: Localized; body: Localized; shape: "phone" | "screen"; image: string }[] = [
  {
    tag: L("For guests", "ગ્રાહક માટે"),
    title: L("Order from the table", "ટેબલ પરથી જ ઓર્ડર"),
    body: L(
      "Scan the QR on your side of the table, pick dishes, add a cooking note and verify your email once. No app, no waiting for a waiter.",
      "પોતાની બાજુનો QR સ્કેન કરો, વાનગી પસંદ કરો, રસોઈ માટે નોંધ લખો અને એક વાર ઈમેલ વેરિફાય કરો. એપ નહીં, વેઇટરની રાહ નહીં."
    ),
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
    shape: "screen",
    image: "/site/hero-report.png",
  },
];

export const FEATURES: { title: Localized; body: Localized }[] = [
  {
    title: L("A QR for every seat", "દરેક બેઠક માટે QR"),
    body: L(
      "Two QRs on a table (4A, 4B). Each works for one guest at a time, so two orders never get mixed up.",
      "એક ટેબલ પર બે QR (4A, 4B). એક સમયે એક જ ગ્રાહક — એટલે બે ઓર્ડર ભેગા ન થાય."
    ),
  },
  {
    title: L("Kitchen-wise routing", "કિચન પ્રમાણે રૂટિંગ"),
    body: L(
      "Assign categories to each kitchen login. One order splits itself item by item.",
      "દરેક કિચન લોગિનને કેટેગરી સોંપો. એક ઓર્ડર વાનગી પ્રમાણે જાતે વહેંચાય."
    ),
  },
  {
    title: L("Straight to the kitchen", "સીધું કિચનમાં"),
    body: L(
      "A guest's order reaches the kitchen screens at once — no one at the counter has to approve it first.",
      "ગ્રાહકનો ઓર્ડર તરત કિચન સ્ક્રીન પર — કાઉન્ટરથી મંજૂરીની જરૂર નહીં."
    ),
  },
  {
    title: L("Verified guests", "વેરિફાય થયેલા ગ્રાહક"),
    body: L(
      "An email code once per sitting. No prank orders, and a list of real guests for you.",
      "દરેક બેઠક દીઠ એક વાર ઈમેલ કોડ. ખોટા ઓર્ડર નહીં, અને સાચા ગ્રાહકોની યાદી તમારી પાસે."
    ),
  },
  {
    title: L("Live, no refresh", "લાઇવ, રિફ્રેશ વગર"),
    body: L(
      "New orders, ready dishes and bills update on every screen by themselves.",
      "નવા ઓર્ડર, તૈયાર વાનગી અને બિલ દરેક સ્ક્રીન પર જાતે અપડેટ થાય."
    ),
  },
  {
    title: L("Thank-you email", "આભારનો ઈમેલ"),
    body: L(
      "After payment the guest gets the bill details and a link to review you on Google.",
      "પેમેન્ટ પછી ગ્રાહકને બિલની વિગત અને Google પર રિવ્યૂની લિંક મળે."
    ),
  },
  {
    title: L("Daily report", "રોજનો રિપોર્ટ"),
    body: L(
      "Sales, orders, top dishes and payment modes — today, yesterday, the last 7 days or the month.",
      "વેચાણ, ઓર્ડર, ટોપ વાનગી અને પેમેન્ટ મોડ — આજે, ગઈકાલે, છેલ્લા 7 દિવસ કે આખો મહિનો."
    ),
  },
  {
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
  howTitle: L("Live in three steps", "ત્રણ સ્ટેપમાં શરૂ"),
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
  heading: Localized;
  intro: Localized;
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
    heading: L("Restaurant management software that your staff will actually use", "સ્ટાફ ખરેખર વાપરે એવું રેસ્ટોરન્ટ મેનેજમેન્ટ સોફ્ટવેર"),
    intro: L(
      "Most restaurant software asks you to change how your restaurant runs. Jamavat starts from what already happens at your tables: the guest sits down, orders, eats, and pays at the counter on the way out. It takes care of the ordering, the kitchens, the bill and the day's numbers — nothing else to learn.",
      "મોટા ભાગનું રેસ્ટોરન્ટ સોફ્ટવેર તમારી ચાલતી પદ્ધતિ બદલાવે છે. જમાવટ તમારા ટેબલ પર જે થાય છે ત્યાંથી જ શરૂ થાય છે: ગ્રાહક બેસે, ઓર્ડર આપે, જમે અને જતી વખતે કાઉન્ટર પર પેમેન્ટ કરે. ઓર્ડર, કિચન, બિલ અને દિવસના આંકડા — એ બધું આ સંભાળે, શીખવાનું બીજું કંઈ નહીં."
    ),
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
    heading: L("A QR code ordering system built around one guest per code", "દરેક કોડ દીઠ એક ગ્રાહક — એ રીતે બનેલી QR ઓર્ડરિંગ સિસ્ટમ"),
    intro: L(
      "A table-wide QR sounds simpler until two groups share a table, or someone at home scans a photo of it. In Jamavat each side of a table has its own code (4A, 4B), and a code belongs to one guest from their first order until the bill is settled.",
      "આખા ટેબલ માટે એક QR સહેલું લાગે — પણ એક ટેબલ પર બે ગ્રુપ બેસે, કે કોઈ ઘરે બેઠા QR ના ફોટા પરથી સ્કેન કરે ત્યારે નહીં. જમાવટમાં ટેબલની દરેક બાજુનો પોતાનો કોડ છે (4A, 4B), અને એ કોડ પહેલા ઓર્ડરથી બિલ થાય ત્યાં સુધી એક જ ગ્રાહકનો રહે છે."
    ),
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
    heading: L("A kitchen screen that shows one kitchen its own dishes", "દરેક કિચનને તેની જ વાનગી બતાવતી સ્ક્રીન"),
    intro: L(
      "If your Gujarati and Punjabi kitchens both see every ticket, both have to read past dishes they don't cook. Jamavat routes by category: the admin ticks which categories a kitchen login receives, and one order splits itself between them.",
      "જો ગુજરાતી અને પંજાબી બંને કિચનને દરેક ટિકિટ દેખાય, તો બંનેને પોતાની ન હોય એવી વાનગીઓ વાંચવી પડે. જમાવટ કેટેગરી પ્રમાણે મોકલે છે: એડમિન નક્કી કરે કે કયું કિચન લોગિન કઈ કેટેગરી મેળવે, અને એક ઓર્ડર જાતે બંનેમાં વહેંચાય."
    ),
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
    heading: L("The bill is already written by the time they reach the counter", "ગ્રાહક કાઉન્ટર પર પહોંચે ત્યાં સુધીમાં બિલ તૈયાર"),
    intro: L(
      "Everything ordered at a table — by the guest's phone or typed at the counter — lands on one bill for that sitting. The counter adds a discount if you give one, takes cash, UPI or card, and the table frees itself for the next guest.",
      "ટેબલ પર જે કંઈ ઓર્ડર થયું હોય — ગ્રાહકના ફોનથી કે કાઉન્ટર પર લખાયેલું — એ બધું એ બેઠકના એક બિલમાં આવે. કાઉન્ટર ડિસ્કાઉન્ટ આપે, રોકડ/UPI/કાર્ડ લે, અને ટેબલ આપમેળે આગળના ગ્રાહક માટે ખાલી થઈ જાય."
    ),
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
];

export function keywordPage(slug: string): KeywordPage | undefined {
  return KEYWORD_PAGES.find((page) => page.slug === slug);
}
