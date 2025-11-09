const DEFAULT_MODEL = "gpt-3.5-turbo"; 

const MODE_PRESETS = {
  general: `Write a few probing, respectful questions that:
- Clarify assumptions/definitions/scope
- Pressure-test evidence, metrics, and tradeoffs
- Identify risks/unknowns/stakeholders
- Drive next steps and accountability
Keep each under 18 words. Limit to 5 questions at most.`,
};

function cWindows(transcriptWords, windowSec = 20, maxChars = 500) {
  if (!Array.isArray(transcriptWords) || transcriptWords.length === 0) return [];
  const windows = [];
  let curStart = transcriptWords[0].startTime ?? 0;
  let curEnd = curStart + windowSec;
  let buf = [];

  const flush = () => {
    if (!buf.length) return;
    const text = buf.join(" ").slice(0, maxChars);
    windows.push({ start: curStart, end: curEnd, text });
    buf = [];
  };

  for (const w of transcriptWords) {
    const s = Number(w.startTime || 0);
    if (s < curEnd) buf.push(String(w.word || ""));
    else {
      flush();
      curStart = s;
      curEnd = curStart + windowSec;
      buf.push(String(w.word || ""));
    }
  }
  flush();
  return windows;
}

function exJson(maybe) {
  if (!maybe) return null;
  
  const cleaned = String(maybe).replace(/```json|```/g, "").trim();
  try { return JSON.parse(cleaned); } catch { return null; }
}

async function cOpenAI({ ak, model, messages, temperature = 0.4, max_tokens = 800 }) {
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${ak}` },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens,
      response_format: { type: "json_object" }, 
    }),
  });
  if (!resp.ok) throw new Error(`OpenAI error: ${resp.status} ${resp.statusText}`);
  return resp.json();
}

/**
 * Generate follow-up questions.
 * @param {Array<{word:string,startTime:number,endTime:number}>|string} transcript
 * @param {{ak:string, analysisType?:'general'|'teaching'|'interview', total?:number, model?:string}} opts
 * @returns {Promise<{questions:string[], rich:Array, windows:Array}>}
 */
async function gFollowups(transcript, opts) {
  const { ak, analysisType = "general", total = 6, model = DEFAULT_MODEL } = opts || {};
  if (!ak) throw new Error("OpenAI API key required");

  let windows = [];
  if (Array.isArray(transcript)) {
    windows = cWindows(transcript, 20, 500).slice(0, 60);
  } else if (typeof transcript === "string" && transcript.trim()) {
    
    windows = [{ start: 0, end: Math.max(20, Math.ceil(transcript.split(/\s+/).length / 2)), text: transcript.slice(0, 4000) }];
  } else {
    return { questions: [], rich: [], windows: [] };
  }

  const preset = MODE_PRESETS[analysisType] || MODE_PRESETS.general;

  const system = `You are an expert presentation coach. `;
  const schemaReminder = `Return ONLY JSON:
{
  "questions": [
    {
      "text": "string (the question)",
      "category": "clarify|evidence|scope|risk|next-steps|tradeoff|example",
      "difficulty": "easy|medium|hard",
      "why": "short rationale (optional)",
      "anchor": { "windowIndex": number, "start": number, "end": number }
    }, ...
  ]
}`;

  const prompt =
`You will receive the transcript in time windows.
Mode: "${analysisType}"
Target: ${total} questions.

Guidelines:
${preset}

Rules:
- Vary categories (include clarify, evidence, scope, risk, next-steps at minimum).
- Be specific; reference the claim/metric/decision you're probing.
- No generic filler or compliments.
- Keep each question under ~18 words.
- ${schemaReminder}

Windows (index, start→end seconds, text):
${windows.map((w, i) => `[${i}] ${w.start.toFixed(1)}→${w.end.toFixed(1)}s: ${w.text}`).join("\n")}
`;

  try {
    const data = await cOpenAI({
      ak,
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    });

    const raw = data.choices?.[0]?.message?.content || "";
    const parsed = exJson(raw) || { questions: [] };
    const rich = Array.isArray(parsed.questions) ? parsed.questions : [];
    const questions = rich.map(q => q.text).filter(Boolean).slice(0, total);

    
    const seen = new Set();
    const deduped = questions.filter(q => (q = q.trim()) && !seen.has(q.toLowerCase()) && seen.add(q.toLowerCase()));

    return { questions: deduped, rich, windows };
  } catch (err) {
    console.error("LLM follow-ups failed:", err);
    
    const fallback = [
      "What key assumption underlies your approach?",
      "Which risks could derail this plan?",
      "What evidence supports your main claim?",
      "How would this scale or fail at 10×?",
      "Whose perspective is missing here?",
      "What are your next measurable steps?"
    ].slice(0, total);
    return { questions: fallback, rich: [], windows };
  }
}

module.exports = { gFollowups };