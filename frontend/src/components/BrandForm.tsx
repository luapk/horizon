import { useState } from "react";
import type { BrandConfig } from "@horizon/shared";
import { T } from "../theme.js";
import { api } from "../api.js";

const inputStyle: React.CSSProperties = {
  background: T.bgCard,
  border: `1px solid ${T.glassBorder}`,
  borderRadius: 4,
  padding: "10px 12px",
  color: T.textPrimary,
  fontSize: 13,
  width: "100%",
};

const labelStyle: React.CSSProperties = { fontSize: 11, color: T.textSecondary, marginBottom: 6, display: "block" };

export function BrandForm({ onCreated }: { onCreated: (brand: BrandConfig) => void }) {
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [description, setDescription] = useState("");
  const [businessUnits, setBusinessUnits] = useState("");
  const [competitors, setCompetitors] = useState("");
  const [geographies, setGeographies] = useState("US");
  const [curatedSources, setCuratedSources] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const brand = await api.createBrand({
        name,
        industry,
        description,
        businessUnits: businessUnits.split(",").map((s) => s.trim()).filter(Boolean),
        competitors: competitors.split(",").map((s) => s.trim()).filter(Boolean),
        geographies: geographies.split(",").map((s) => s.trim()).filter(Boolean),
        curatedSources: curatedSources.split(",").map((s) => s.trim()).filter(Boolean),
      });
      onCreated(brand);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 560, background: T.bgCard, border: `1px solid ${T.glassBorder}`, borderRadius: 6, padding: 32 }}>
      <h2 style={{ color: T.textHeading, margin: "0 0 24px", fontWeight: 400 }}>New Brand Scan Target</h2>
      <div style={{ display: "grid", gap: 16 }}>
        <div>
          <label style={labelStyle}>Brand name</label>
          <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Corp" />
        </div>
        <div>
          <label style={labelStyle}>Industry</label>
          <input style={inputStyle} value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="pet care, aerospace, fintech..." />
        </div>
        <div>
          <label style={labelStyle}>Description</label>
          <textarea style={{ ...inputStyle, minHeight: 60 }} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Business units (comma-separated -- becomes the strategic matrix rows)</label>
          <input style={inputStyle} value={businessUnits} onChange={(e) => setBusinessUnits(e.target.value)} placeholder="Nutrition, Diagnostics, Insurance" />
        </div>
        <div>
          <label style={labelStyle}>Competitors (comma-separated)</label>
          <input style={inputStyle} value={competitors} onChange={(e) => setCompetitors(e.target.value)} placeholder="Rival Inc, OtherCo" />
        </div>
        <div>
          <label style={labelStyle}>Geographies (comma-separated)</label>
          <input style={inputStyle} value={geographies} onChange={(e) => setGeographies(e.target.value)} placeholder="US, EU, South Korea" />
        </div>
        <div>
          <label style={labelStyle}>Curated source domains (comma-separated, optional -- trade press, regulators, journals; most searches are restricted to these, with a smaller open-web sweep for surprises)</label>
          <input style={inputStyle} value={curatedSources} onChange={(e) => setCuratedSources(e.target.value)} placeholder="petfoodindustry.com, fda.gov, nature.com" />
        </div>
        {error && <div style={{ color: T.red, fontSize: 12 }}>{error}</div>}
        <button
          onClick={submit}
          disabled={busy || !name || !industry}
          style={{ background: T.gold + "20", border: `1px solid ${T.gold}40`, borderRadius: 4, padding: "10px 16px", color: T.gold, cursor: "pointer" }}
        >
          {busy ? "Creating..." : "Create brand"}
        </button>
      </div>
    </div>
  );
}
