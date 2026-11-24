"""v18 agency extra data: see generator/data/pbd (gate_v18.json). Gate flags v/x are added after the offline render gate."""
"""Build pbd_ag_extra (area stats, nearby, BAIRA membership, batch flags) from the RAIMS snapshot + BAIRA member list.
Gate flags (noindex) are filled later by gate.php output."""
import json, re, datetime as dt, sys, collections
from difflib import SequenceMatcher
B = sys.argv[1] if len(sys.argv) > 1 else "."  # folder holding code-samples/sources (RAIMS snapshot) and rollout/baira (BAIRA list)
SNAP = dt.date(2026, 11, 25)
MON = {m: i for i, m in enumerate("Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(), 1)}
def iso(s):
    d, m, y = s.split("/"); return dt.date(int(y), MON[m], int(d)).isoformat()
recs = json.load(open(f"{B}/code-samples/sources/raims-parsed-2026-11-25.json"))
baira = {int(k): v for k, v in json.load(open(f"{B}/rollout/baira/baira_members.json")).items()}
JUNK = {"davidhar", "unknown", "dhaka", ""}
NORM = {"nayapaltan": "Paltan", "naya paltan": "Paltan", "purana paltan": "Paltan"}
def thana(r):
    t = r["thana"].strip(); k = t.lower()
    if k in JUNK: return ""
    return NORM.get(k, t)
STOP = {"m/s", "ms", "ltd", "limited", "ltd.", "the", "co", "company", "and", "&", "pvt", "private", "int'l"}
def toks(n):
    n = re.sub(r"[^a-z0-9 ]", " ", n.lower().replace("m/s", " "))
    return {w for w in n.split() if w not in STOP and len(w) > 1}
def same_name(a, b):
    A, Bt = toks(a), toks(b)
    if not A or not Bt: return False
    j = len(A & Bt) / len(A | Bt)
    return j >= 0.5 or SequenceMatcher(None, " ".join(sorted(A)), " ".join(sorted(Bt))).ratio() >= 0.85
rows = {}
for r in [r for r in recs if r["rl"] > 0]:
    rows[r["rl"]] = dict(n=" ".join(r["name"].split()), t=thana(r), s=r["status"], e=iso(r["valid"]) if r["valid"] else "")
bm = 0
for rl, x in rows.items():
    b = baira.get(rl); x["b"] = 1 if (b and same_name(x["n"], b["name"])) else 0; bm += x["b"]
by_t = collections.defaultdict(list)
for rl, x in rows.items():
    if x["t"]: by_t[x["t"]].append(rl)
active = [rl for rl, x in rows.items() if x["s"] == "Active"]
for rl, x in rows.items():
    grp = by_t[x["t"]] if x["t"] else []
    ga = [g for g in grp if rows[g]["s"] == "Active"]
    x["tt"], x["ta"] = len(grp), len(ga)
    pool = ga if x["t"] else active
    if x["s"] == "Active" and x["e"]:
        x["l"] = sum(1 for g in pool if g != rl and rows[g]["e"] > x["e"])
    else:
        x["l"] = -1
    nb = sorted((g for g in ga if g != rl), key=lambda g: (abs(g - rl), g))[:5]
    x["nb"] = nb
out = {"upd": SNAP.isoformat(), "baira_upd": SNAP.isoformat(), "total": len(rows), "active": len(active), "a": {str(k): v for k, v in sorted(rows.items())}}
json.dump(out, open("extra_base.json", "w"), ensure_ascii=False, separators=(",", ":"))
print("rows", len(rows), "baira matched", bm, "of", len(baira), "thana-known", sum(1 for x in rows.values() if x["t"]))
# BAIRA RL present but name mismatch (not used)
print("baira rl present but name differs:", sum(1 for rl in rows if rl in baira and not rows[rl]["b"]))
