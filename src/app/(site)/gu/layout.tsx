import type { ReactNode } from "react";
import { DISPLAY_GUJARATI_VARIABLE } from "@/lib/fonts/displayGujarati";

/**
 * The ગુજરાતી half of the website. It exists for one reason: to declare the
 * Gujarati display serif here instead of in the layout above, so the English
 * pages — the ones search engines land on — don't preload 115KB of a font
 * only these pages draw.
 *
 * `display: contents` so this wrapper passes the custom property down
 * without becoming a box: the pages below lay themselves out against the
 * site layout's flex column, and an ordinary div between them would break
 * the full-height main and the footer sitting at the bottom.
 */
export default function GujaratiSiteLayout({ children }: { children: ReactNode }) {
  return <div className={`${DISPLAY_GUJARATI_VARIABLE} contents`}>{children}</div>;
}
