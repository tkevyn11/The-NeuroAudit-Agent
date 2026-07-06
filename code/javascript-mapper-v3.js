// ===============================
// NeuroAudit – JavaScript Mapper
// ===============================

// 1. Get AI output
const aiOutput = $input.item.json.output;

// 2. Helper normalizers (MATCH Google Sheet dropdowns exactly)
function normalizeAgeGroup(v) {
  const s = String(v ?? "").trim().toLowerCase();
  if (["adult", "adults"].includes(s)) return "Adult";
  if (["paediatric", "pediatric", "paeds", "peds", "child", "children"].includes(s)) {
    return "Paediatric";
  }
  return "Adult"; // safe fallback
}

function normalizeUrgency(v) {
  const s = String(v ?? "").trim().toLowerCase();
  if (["emergency", "emer", "urgent", "trauma", "stat"].includes(s)) return "Emergency";
  if (["elective", "routine", "planned", "semi-elective", "semielective"].includes(s))
    return "Elective";
  return "Emergency"; // safe fallback
}

// 2b. Category normalizer (trust CATEGORY first, infer from DX/OP only if needed)
function normalizeCategory(category, diagnosis = "", operation = "") {
  const catRaw = String(category ?? "").trim();
  const cat = catRaw.toLowerCase();

  const dx = String(diagnosis ?? "").toLowerCase();
  const op = String(operation ?? "").toLowerCase();
  const text = `${cat} ${dx} ${op}`;

  // ---------- 1) Trust provided CATEGORY first (snap variants) ----------
  // Cranioplasty (autologous, titanium mesh, PEEK)
  if (cat.includes("cranioplasty")) return "Cranioplasty";

  // CSF diversion temporary/permanent (accept hyphen variants)
  if (cat.includes("csf") && (cat.includes("temp") || cat.includes("temporary")))
    return "CSF diversion – temporary";
  if (cat.includes("csf") && (cat.includes("perm") || cat.includes("permanent")))
    return "CSF diversion – permanent";

  // Trauma (accept spacing variants)
  if (cat.includes("trauma") && (cat.includes("craniotomy") || cat.includes("craniectomy")))
    return "Trauma (Craniotomy / Craniectomy)";

  // Brain tumor
  if (cat.includes("brain tumor") || cat.includes("brain tumour"))
    return "Brain tumor (Primary / Secondary)";

  // Infection (cranio)
  if (cat.includes("infection")) return "Infection (cranio)";

  // Others
  if (cat === "others" || cat.includes("other")) return "Others";

  // Aneurysm / AVM
  if (cat.includes("aneurysm")) return "Aneurysm";
  if (cat.includes("avm") || cat.includes("bypass")) return "AVM / Bypass";

  // Functional / Epilepsy
  if (cat.includes("functional")) return "Functional neurosurgery";
  if (cat.includes("epilepsy")) return "Epilepsy surgery";

  // Spine categories
  if (cat.includes("spine trauma")) return "Spine trauma";
  if (cat.includes("spine tumor")) return "Spine tumor";
  if (cat.includes("spine degenerative")) return "Spine degenerative";
  if (cat.includes("spine dysraphism")) return "Spine dysraphism";
  if (cat.includes("spine")) return "Spine – Other";

  // ICB / Infarction
  if (cat.includes("icb") || cat.includes("ich") || cat.includes("infarct") || cat.includes("stroke"))
    return "ICB / Infarction";

  // Tracheostomy / Burr hole / Wound debridement
  if (cat.includes("tracheostomy")) return "Tracheostomy";
  if (cat.includes("burr")) return "Burr hole (CSDH)";
  if (cat.includes("debrid")) return "Wound debridement";

  // ---------- 2) If CATEGORY is missing/unclear, infer from DX/OP ----------
  // Cranioplasty inference
  if (
    dx.includes("skull defect") ||
    op.includes("cranioplasty") ||
    op.includes("peek") ||
    op.includes("titanium mesh")
  ) {
    return "Cranioplasty";
  }

  // CSF diversion inference (temporary)
  if (
    op.includes("evd") ||
    op.includes("external ventricular") ||
    op.includes("icp") ||
    op.includes("bolt") ||
    op.includes("probe") ||
    op.includes("monitor")
  ) {
    return "CSF diversion – temporary";
  }

  // CSF diversion inference (permanent)
  if (
    op.includes("vp shunt") ||
    op.includes("vps") ||
    op.includes("ventriculoperitoneal") ||
    op.includes("lps")
  ) {
    return "CSF diversion – permanent";
  }

  // Burr hole inference
  if (dx.includes("csdh") || dx.includes("chronic subdural") || op.includes("burr hole")) {
    return "Burr hole (CSDH)";
  }

  // Others inference (scalp lesions etc.)
  if (
    dx.includes("scalp") ||
    dx.includes("sebaceous") ||
    dx.includes("lipoma") ||
    op.includes("scalp")
  ) {
    return "Others";
  }

  // ICB / infarction inference
  if (
    dx.includes("ich") ||
    dx.includes("intracerebral") ||
    dx.includes("icb") ||
    dx.includes("infarct") ||
    dx.includes("infarction") ||
    dx.includes("mca infarct") ||
    dx.includes("stroke")
  ) {
    return "ICB / Infarction";
  }

  // Trauma inference (only if clear trauma keywords)
  if (
    dx.includes("tbi") ||
    dx.includes("sdh") ||
    dx.includes("edh") ||
    op.includes("decompressive craniectomy") ||
    op.includes("eoc")
  ) {
    return "Trauma (Craniotomy / Craniectomy)";
  }

  // Brain tumor inference
  if (dx.includes("meningioma") || dx.includes("glioma") || dx.includes("tumor") || dx.includes("tumour"))
    return "Brain tumor (Primary / Secondary)";

  // Infection inference
  if (dx.includes("empyema") || dx.includes("abscess")) return "Infection (cranio)";

  // Tracheostomy inference
  if (op.includes("tracheostomy")) return "Tracheostomy";

  // ---------- 3) Final fallback ----------
  return "Others";
}

// 3. Parse JSON safely
let data;
try {
  const cleanedJson = String(aiOutput ?? "")
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();
  data = JSON.parse(cleanedJson);
} catch (error) {
  return [
    {
      json: {
        error: "Failed to parse AI output",
        raw: aiOutput,
      },
    },
  ];
}

// 4. If no surgeries → stop
if (!data?.surgeries || data.surgeries.length === 0) {
  return [];
}

// 5. Telegram metadata
const telegramData = $("Telegram Trigger").item.json;
const messageId = telegramData.message.message_id;
const messageDate = new Date(telegramData.message.date * 1000).toISOString().split("T")[0];
const reportedTimestamp = new Date(telegramData.message.date * 1000)
  .toISOString()
  .replace("T", " ")
  .slice(0, 19);

// 6. ROW MAPPING (THIS is what feeds Google Sheets)
const rows = data.surgeries.map((surgery) => ({
  surgery_date: surgery.surgery_date || messageDate,
  reported_ts: reportedTimestamp,
  reporter_name: data.reporter_name || "Unknown",
  telegram_message_id: messageId,
  patient_name: surgery.patient_name || "Unknown",
  patient_ic_mrn: surgery.patient_ic_mrn || surgery.patient_ic || "Unknown",
  age_group: normalizeAgeGroup(surgery.age_group),
  urgency: normalizeUrgency(surgery.urgency),
  surgery_category: normalizeCategory(
    surgery.surgery_category,
    surgery.diagnosis,
    surgery.operation
  ),
  diagnosis: surgery.diagnosis || "",
  operation: surgery.operation || "",
}));

// 7. Output to next node
return rows.map((row) => ({ json: row }));
