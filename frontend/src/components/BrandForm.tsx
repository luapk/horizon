import { useState } from "react";
import type { BrandConfig } from "@horizon/shared";
import { T, FONT, eyebrow, inputStyle, primaryButton } from "../theme.js";
import { api } from "../api.js";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ ...eyebrow(T.textSecondary), display: "block", marginBottom: 7 }}>{label}</label>
      {children}
      {hint && <div style={{ fontSize: 10.5, color: T.textMuted, marginTop: 5, lineHeight: 1.5 }}>{hint}</div>}
    </div>
  );
}

export function BrandForm({ onCreated }: { onCreated: (brand: BrandConfig) => void }) {
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [description, setDescription] = useState("");
  const [businessUnits, setBusinessUnits] = useState("");
  const [competitors, setCompetitors] = useState("");
  const [geographies, setGeographies] = useState("US, Western Europe, Japan, South Korea");
  const [curatedSources, setCuratedSources] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const split = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const brand = await api.createBrand({
        name, industry, description,
        businessUnits: split(businessUnits),
        competitors: split(competitors),
        geographies: split(geographies),
        curatedSources: split(curatedSources),
      });
      onCreated(brand);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", animation: "fadeUp 400ms ease" }}>
      <div style={{ ...eyebrow(T.violet), marginBottom: 10 }}>SCAN TARGET</div>
      <h1 style={{ fontFamily: FONT.display, fontSize: 34, fontWeight: 400, color: T.textHeading, margin: "0 0 8px" }}>New brand</h1>
      <p style={{ fontSize: 13, color: T.textSecondary, margin: "0 0 28px", lineHeight: 1.6 }}>
        Everything the pipeline knows about a brand comes from this configuration — queries, business
        units in the strategy matrix, and which sources count as trusted.
      </p>

      <div className="glass" style={{ padding: 32, display: "grid", gap: 22 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <Field label="Brand name">
            <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Corp" />
          </Field>
          <Field label="Industry">
            <input style={inputStyle} value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="pet care, aerospace, fintech…" />
          </Field>
        </div>
        <Field label="Description">
          <textarea style={{ ...inputStyle, minHeight: 64, resize: "vertical" }} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="One or two sentences on what the brand does and where it plays." />
        </Field>
        <Field label="Business units" hint="Comma-separated — these become the rows of the strategic impact matrix.">
          <input style={inputStyle} value={businessUnits} onChange={(e) => setBusinessUnits(e.target.value)} placeholder="Nutrition, Diagnostics, Insurance" />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <Field label="Competitors" hint="Comma-separated.">
            <input style={inputStyle} value={competitors} onChange={(e) => setCompetitors(e.target.value)} placeholder="Rival Inc, OtherCo" />
          </Field>
          <Field label="Geographies" hint="Comma-separated — plotted on the signal globe.">
            <input style={inputStyle} value={geographies} onChange={(e) => setGeographies(e.target.value)} placeholder="US, EU, Japan, South Korea" />
          </Field>
        </div>
        <Field label="Curated source domains" hint="Optional. Trade press, regulators, journals. Most queries are restricted to these; a smaller open-web sweep still runs for surprises.">
          <input style={inputStyle} value={curatedSources} onChange={(e) => setCuratedSources(e.target.value)} placeholder="petfoodindustry.com, fda.gov, nature.com" />
        </Field>

        {error && <div style={{ color: T.coral, fontSize: 12, lineHeight: 1.5 }}>{error}</div>}

        <button className="btn-primary" onClick={submit} disabled={busy || !name || !industry} style={{ ...primaryButton, opacity: busy || !name || !industry ? 0.45 : 1, justifySelf: "start" }}>
          {busy ? "CREATING…" : "CREATE BRAND"}
        </button>
      </div>
    </div>
  );
}
