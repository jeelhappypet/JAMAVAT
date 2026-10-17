import type { Localized } from "@/types";

const L = (en: string, gu: string): Localized => ({ en, gu });

/** Last time the wording below changed. Shown on the page. */
export const TERMS_UPDATED = "18 October 2026";

export const TERMS_TITLE = L("Terms of service", "સેવાની શરતો");

export const TERMS_INTRO = L(
  "These terms cover the Jamavat software: a restaurant subscribes to it, its staff use it to take and settle orders, and its guests order from their table. They are written plainly on purpose — if anything here doesn't match what you were told, what you were told in writing wins.",
  "આ શરતો જમાવટ સોફ્ટવેર માટે છે: રેસ્ટોરન્ટ સબ્સ્ક્રિપ્શન લે, તેનો સ્ટાફ ઓર્ડર લે અને બિલ કરે, અને ગ્રાહક ટેબલ પરથી ઓર્ડર આપે. આ સાદી ભાષામાં લખી છે — જો અહીં લખેલું તમને લેખિતમાં કહેવાયેલાથી અલગ હોય, તો લેખિતમાં કહેવાયેલું માન્ય ગણાશે."
);

export const TERMS_SECTIONS: { heading: Localized; body: Localized[] }[] = [
  {
    heading: L("The subscription", "સબ્સ્ક્રિપ્શન"),
    body: [
      L(
        "A restaurant pays per month or per year. A trial is free and ends on the date agreed. When a period ends we keep the account working for a short grace period; after that new orders stop, but you can still settle tables that are already open and read your reports.",
        "રેસ્ટોરન્ટ માસિક કે વાર્ષિક ચૂકવે છે. ટ્રાયલ મફત છે અને નક્કી કરેલી તારીખે પૂરી થાય. મુદત પૂરી થયા પછી થોડા દિવસની છૂટ મળે; ત્યાર બાદ નવા ઓર્ડર બંધ થાય, પણ ચાલુ ટેબલનું બિલ અને રિપોર્ટ ચાલુ રહે."
      ),
      L(
        "You can stop at any time; we don't lock you into a year. Payments already made for a period aren't refunded part-way through it.",
        "તમે ગમે ત્યારે બંધ કરી શકો; વર્ષ માટે બાંધી રાખતા નથી. ચાલુ મુદત માટે ચૂકવાયેલી રકમ વચ્ચેથી પાછી મળતી નથી."
      ),
    ],
  },
  {
    heading: L("Your data is yours", "ડેટા તમારો છે"),
    body: [
      L(
        "Your menus, orders, bills and guest emails belong to your restaurant. No other restaurant on Jamavat can see them. Ask us and we'll export everything, or delete it.",
        "તમારા મેનુ, ઓર્ડર, બિલ અને ગ્રાહકના ઈમેલ તમારી રેસ્ટોરન્ટના છે. જમાવટ પરની બીજી કોઈ રેસ્ટોરન્ટ એ જોઈ શકતી નથી. કહો તો બધું એક્સપોર્ટ કરી આપીએ કે ડિલીટ કરી આપીએ."
      ),
      L("What we collect and why is in the privacy policy.", "અમે શું અને શા માટે રાખીએ છીએ તે પ્રાઇવસી પોલિસીમાં છે."),
    ],
  },
  {
    heading: L("Using it properly", "યોગ્ય ઉપયોગ"),
    body: [
      L(
        "Staff logins are personal — a PIN is not shared. Don't use Jamavat to send guests anything they didn't ask for, and don't try to reach another restaurant's data.",
        "સ્ટાફ લોગિન વ્યક્તિગત છે — PIN કોઈને આપવો નહીં. ગ્રાહકોએ ન માગ્યું હોય એવું કંઈ જમાવટથી મોકલવું નહીં, અને બીજી રેસ્ટોરન્ટના ડેટા સુધી પહોંચવાનો પ્રયાસ કરવો નહીં."
      ),
    ],
  },
  {
    heading: L("What we promise, and what we don't", "અમે શું વચન આપીએ છીએ અને શું નહીં"),
    body: [
      L(
        "We keep Jamavat running and fix what breaks as fast as we can. We can't promise it will never be down: it needs the internet, and it runs on services we don't own. Keep taking orders on paper if the internet at your restaurant goes.",
        "અમે જમાવટ ચાલુ રાખીએ અને જે બગડે તે બને તેટલું જલદી ઠીક કરીએ. ક્યારેય બંધ નહીં થાય એવું વચન ન આપી શકીએ: તેને ઇન્ટરનેટ જોઈએ, અને તે અમારી માલિકીની ન હોય એવી સેવાઓ પર ચાલે છે. રેસ્ટોરન્ટનું ઇન્ટરનેટ જાય તો કાગળ પર ઓર્ડર લેતા રહેજો."
      ),
      L(
        "We're not responsible for a wrong price typed into a menu, a dish served to the wrong table, or money taken at your counter. Those stay the restaurant's own responsibility.",
        "મેનુમાં ખોટો ભાવ લખાય, વાનગી ખોટા ટેબલે જાય, કે કાઉન્ટર પર લેવાયેલા પૈસા — એની જવાબદારી અમારી નથી; એ રેસ્ટોરન્ટની પોતાની રહે છે."
      ),
    ],
  },
  {
    heading: L("Changes", "ફેરફાર"),
    body: [
      L(
        "If these terms change in a way that affects you, we'll tell the restaurant's admin by email before it takes effect.",
        "જો આ શરતોમાં તમને અસર કરે એવો ફેરફાર થાય, તો અમલમાં આવે તે પહેલાં રેસ્ટોરન્ટના એડમિનને ઈમેલથી જણાવીશું."
      ),
    ],
  },
];
