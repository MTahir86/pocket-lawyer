import type { LanguageId } from "@/lib/analysis.functions";

export type Strings = {
  brand: string;
  heroTitle: string;
  heroSubtitle: string;
  explainIn: string;
  uploadTitle: string;
  uploadSubtitle: string;
  chooseFiles: string;
  addMore: string;
  formats: string;
  pagesReady: (n: number) => string;
  analyzeAll: string;
  removeFile: (name: string) => string;
  loadingTitle: string;
  loadingSubtitle: string;
  pagesCombined: (n: number) => string;
  newDoc: string;
  disclaimer: string;
  footerName: string;
  summary: string;
  redFlags: string;
  verdict: string;
  chatTitle: string;
  chatSubtitle: string;
  chatPlaceholder: string;
  thinking: string;
  send: string;
  suggestions: string[];
  errUnsupported: string;
  errTooLarge: (name: string) => string;
  errFailed: string;
  errGeneric: string;
};

const english: Strings = {
  brand: "Pocket Lawyer AI",
  heroTitle: "Understand any document in simple language.",
  heroSubtitle:
    "Upload a contract, agreement, or notice. Get the key points, hidden risks, and honest advice — in the language you think in.",
  explainIn: "Explain in",
  uploadTitle: "Upload your document",
  uploadSubtitle: "Contracts, agreements, notices — we'll read the fine print for you.",
  chooseFiles: "Choose files",
  addMore: "Add more pages",
  formats: "PDF, JPG & PNG",
  pagesReady: (n) => `${n} page${n > 1 ? "s" : ""} ready`,
  analyzeAll: "Analyze all pages",
  removeFile: (name) => `Remove ${name}`,
  loadingTitle: "AI is analyzing your document…",
  loadingSubtitle: "Reading every clause so you don't have to.",
  pagesCombined: (n) => `${n} pages combined`,
  newDoc: "New",
  disclaimer: "Pocket Lawyer AI gives general guidance, not formal legal advice.",
  footerName: "Developed by Muhammad Tahir",
  summary: "Summary",
  redFlags: "Red Flags & Risks",
  verdict: "Verdict & Next Steps",
  chatTitle: "Ask a question",
  chatSubtitle: "About this document, in plain words.",
  chatPlaceholder: "Type your question…",
  thinking: "Thinking…",
  send: "Send question",
  suggestions: [
    "Can I cancel this contract early?",
    "What penalties should I worry about?",
    "Is anything unfair to me here?",
  ],
  errUnsupported: "Only PDF, JPG, and PNG files are supported.",
  errTooLarge: (name) => `"${name}" is larger than 12 MB. Please upload a smaller file.`,
  errFailed: "Analysis failed. Please try again.",
  errGeneric: "Something went wrong.",
};

const urdu: Strings = {
  brand: "پاکٹ لائر AI",
  heroTitle: "کسی بھی دستاویز کو آسان زبان میں سمجھیں",
  heroSubtitle:
    "معاہدہ، ایگریمنٹ یا نوٹس اپلوڈ کریں۔ اہم نکات، چھپے ہوئے خطرات اور مخلصانہ مشورہ پائیں — اسی زبان میں جس میں آپ سوچتے ہیں۔",
  explainIn: "وضاحت کی زبان",
  uploadTitle: "اپنی دستاویز اپلوڈ کریں",
  uploadSubtitle: "معاہدے، ایگریمنٹس، نوٹس — ہم آپ کے لیے باریک ترامیم پڑھیں گے۔",
  chooseFiles: "فائل منتخب کریں",
  addMore: "مزید صفحات شامل کریں",
  formats: "پی ڈی ایف، جے پی جی اور پی این جی",
  pagesReady: (n) => `${n} صفحات تیار ہیں`,
  analyzeAll: "تمام صفحات کا تجزیہ کریں",
  removeFile: (name) => `${name} ہٹائیں`,
  loadingTitle: "AI آپ کی دستاویز کا تجزیہ کر رہا ہے…",
  loadingSubtitle: "ہم ہر شق پڑھ رہے ہیں تاکہ آپ کو نہ پڑھنی پڑے۔",
  pagesCombined: (n) => `${n} صفحات یکجا`,
  newDoc: "نئی",
  disclaimer: "پاکٹ لائر AI عام رہنمائی فراہم کرتا ہے، باقاعدہ قانونی مشورہ نہیں۔",
  footerName: "Developed by Muhammad Tahir",
  summary: "خلاصہ",
  redFlags: "خطرات اور سرخ نشان",
  verdict: "فیصلہ اور اگلے اقدامات",
  chatTitle: "سوال پوچھیں",
  chatSubtitle: "اس دستاویز کے بارے میں، آسان الفاظ میں۔",
  chatPlaceholder: "اپنا سوال لکھیں…",
  thinking: "سوچ رہا ہے…",
  send: "سوال بھیجیں",
  suggestions: [
    "کیا میں یہ معاہدہ جلد ختم کر سکتا ہوں؟",
    "مجھے کن جرمانوں سے محتاط رہنا چاہیے؟",
    "کیا اس میں میرے ساتھ کوئی ناانصافی ہے؟",
  ],
  errUnsupported: "صرف پی ڈی ایف، جے پی جی اور پی این جی فائلیں قابلِ قبول ہیں۔",
  errTooLarge: (name) => `"${name}" 12 ایم بی سے بڑی ہے۔ براہِ کرم چھوٹی فائل اپلوڈ کریں۔`,
  errFailed: "تجزیہ ناکام رہا۔ براہِ کرم دوبارہ کوشش کریں۔",
  errGeneric: "کچھ غلط ہو گیا۔",
};

const romanUrdu: Strings = {
  brand: "Pocket Lawyer AI",
  heroTitle: "Kisi bhi document ko aasan zabaan mein samjhein.",
  heroSubtitle:
    "Contract, agreement ya notice upload karein. Ahem points, chupe hue risks aur imaandar mashwara payein — usi zabaan mein jis mein aap sochte hain.",
  explainIn: "Samjhayein is zabaan mein",
  uploadTitle: "Apna document upload karein",
  uploadSubtitle: "Contracts, agreements, notices — hum aap ke liye fine print parhenge.",
  chooseFiles: "File select karein",
  addMore: "Aur pages shamil karein",
  formats: "PDF, JPG aur PNG",
  pagesReady: (n) => `${n} page${n > 1 ? "s" : ""} tayyar`,
  analyzeAll: "Tamam pages ka analysis karein",
  removeFile: (name) => `${name} hataayein`,
  loadingTitle: "AI aap ka document parh raha hai…",
  loadingSubtitle: "Har clause hum parh rahe hain, taake aap ko na parhna paray.",
  pagesCombined: (n) => `${n} pages mila kar`,
  newDoc: "Naya",
  disclaimer: "Pocket Lawyer AI aam rehnumai deta hai, baqaida legal advice nahi.",
  footerName: "Developed by Muhammad Tahir",
  summary: "Khulasa",
  redFlags: "Red Flags aur Risks",
  verdict: "Faisla aur Agle Qadam",
  chatTitle: "Sawal poochein",
  chatSubtitle: "Is document ke baare mein, aasan alfaaz mein.",
  chatPlaceholder: "Apna sawal likhein…",
  thinking: "Soch raha hai…",
  send: "Sawal bhejein",
  suggestions: [
    "Kya main yeh contract jaldi cancel kar sakta hoon?",
    "Mujhe kin penalties se bachna chahiye?",
    "Kya is mein mere saath koi na-insafi hai?",
  ],
  errUnsupported: "Sirf PDF, JPG aur PNG files support hoti hain.",
  errTooLarge: (name) => `"${name}" 12 MB se bari hai. Choti file upload karein.`,
  errFailed: "Analysis nakaam raha. Dobara koshish karein.",
  errGeneric: "Kuch ghalat ho gaya.",
};

export const STRINGS: Record<LanguageId, Strings> = {
  english,
  urdu,
  "roman-urdu": romanUrdu,
};

export function useStrings(language: LanguageId): Strings {
  return STRINGS[language] ?? english;
}
