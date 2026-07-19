import type { AiAssessment, Priority } from "./types";

const RULES: { category: string; words: string[]; priority: Priority }[] = [
  { category: "fire", priority: "critical", words: ["fire", "smoke", "burning", "blast", "explosion", "flames", "gas leak"] },
  { category: "medical", priority: "critical", words: ["unconscious", "not breathing", "heart attack", "bleeding", "injured", "medical", "ambulance"] },
  { category: "accident", priority: "high", words: ["accident", "crash", "collision", "hit and run", "vehicle overturned"] },
  { category: "crime", priority: "high", words: ["attack", "weapon", "violence", "robbery", "crime", "unsafe", "threat"] },
  { category: "flood", priority: "high", words: ["flood", "waterlogging", "submerged", "heavy rain", "overflowing river"] },
  { category: "electricity", priority: "high", words: ["electric", "live wire", "transformer", "sparking", "power line"] },
  { category: "water", priority: "medium", words: ["water leak", "pipe burst", "no water", "sewage"] },
  { category: "road", priority: "low", words: ["pothole", "road damage", "broken road", "traffic signal"] },
  { category: "sanitation", priority: "low", words: ["garbage", "waste", "sanitation", "trash", "dump"] },
];

const DANGER_WORDS = ["trapped", "child", "school", "hospital", "multiple people", "life threatening", "immediate", "collapsed"];

export function rulesTriage(description: string, selectedCategory?: string): AiAssessment {
  const text = description.toLowerCase();
  const matched = RULES.map((rule) => ({ ...rule, score: rule.words.filter((word) => text.includes(word)).length }))
    .sort((a, b) => b.score - a.score)[0];
  const dangerBoost = DANGER_WORDS.some((word) => text.includes(word));
  const category = matched?.score > 0 ? matched.category : selectedCategory || "other";
  let priority: Priority = matched?.score > 0 ? matched.priority : "medium";
  if (dangerBoost && priority !== "critical") priority = priority === "low" ? "high" : "critical";
  const confidence = matched?.score ? Math.min(0.58 + matched.score * 0.11, 0.91) : 0.45;

  return {
    provider: "rules",
    model: "offline-safety-rules-v1",
    category,
    priority,
    confidence,
    summary: description.trim().slice(0, 180),
    reasoning: [
      matched?.score ? `Matched ${matched.score} safety keyword group${matched.score > 1 ? "s" : ""}.` : "No high-confidence category keywords were found.",
      dangerBoost ? "Urgency increased because vulnerable-person or immediate-danger language was detected." : "No additional danger-language escalation was applied.",
    ],
    requiresHumanReview: confidence < 0.72 || priority === "critical",
    processedAt: new Date().toISOString(),
  };
}
