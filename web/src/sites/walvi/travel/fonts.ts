// Travel map display face: Bricolage Grotesque — bold, characterful, poster-like
// numbers and headlines (also drawn onto the exported share image).
import { Bricolage_Grotesque } from "next/font/google";

export const travelFont = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["400", "600", "800"],
  variable: "--tm-font",
  display: "swap",
});
