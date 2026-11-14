import { ImageResponse } from "next/og";
import { ogFonts } from "@/lib/ogFonts";
import { getSite } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { getFxSnapshot, crossRate, getGold } from "@/lib/gcc";
import { GRAMS_PER_OZ } from "@/sites/gccguide/hub/config";
import { fmt } from "@/sites/gccguide/hub/format";

// Daily share card for WhatsApp / Telegram / X: one stable URL that always shows
// today's numbers, so a link dropped into a family group previews correctly.
//   https://gccguide.com/share/rates.png
export const dynamic = "force-dynamic";

const W = 1200;
const H = 630;

export async function GET() {
  const site = getSite("gccguide");
  const [snap, gold] = await Promise.all([getFxSnapshot(), getGold()]);
  const fonts = await ogFonts().catch(() => []);
  const aed = snap.byCode.AED?.rate ?? 3.6725;
  const g22 = (gold.usdPerOz / GRAMS_PER_OZ) * aed * 0.916;

  const rows = [
    ["AED → INR", crossRate(snap, "AED", "INR")],
    ["SAR → INR", crossRate(snap, "SAR", "INR")],
    ["QAR → INR", crossRate(snap, "QAR", "INR")],
    ["KWD → INR", crossRate(snap, "KWD", "INR")],
    ["AED → PKR", crossRate(snap, "AED", "PKR")],
    ["AED → BDT", crossRate(snap, "AED", "BDT")],
  ] as const;

  const date = new Date(snap.updated).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #0b1020 0%, #14304f 55%, #0f4f4a 100%)",
          color: "#fff",
          fontFamily: "Inter, sans-serif",
          padding: 56,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 22, fontWeight: 800, letterSpacing: 3, color: "#f6c453" }}>GCCGUIDE</div>
            <div style={{ display: "flex", fontSize: 46, fontWeight: 800, marginTop: 6 }}>Today in the Gulf</div>
          </div>
          <div style={{ display: "flex", fontSize: 24, fontWeight: 700, color: "#9fd8d3" }}>{date}</div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", marginTop: 34, width: 1088 }}>
          {rows.map(([label, v]) => (
            <div
              key={label}
              style={{
                display: "flex",
                flexDirection: "column",
                width: 350,
                marginRight: 18,
                marginBottom: 18,
                padding: "18px 22px",
                borderRadius: 18,
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              <div style={{ display: "flex", fontSize: 20, fontWeight: 700, color: "#9fb3c8" }}>{label}</div>
              <div style={{ display: "flex", fontSize: 40, fontWeight: 800, marginTop: 4 }}>{v == null ? "—" : fmt(v, v > 100 ? 2 : 4)}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto" }}>
          <div style={{ display: "flex", fontSize: 28, fontWeight: 800, color: "#f6c453" }}>
            22K gold in Dubai: AED {fmt(g22, 2)}/g
          </div>
          <div style={{ display: "flex", fontSize: 24, fontWeight: 700, color: "#9fd8d3" }}>{site ? siteBaseUrl(site).replace(/^https?:\/\//, "") : "gccguide.com"}</div>
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      fonts,
      headers: {
        // One hour: matches the rate refresh cadence closely enough for a share card.
        "cache-control": "public, max-age=900, s-maxage=900",
        "content-type": "image/png",
      },
    },
  );
}
