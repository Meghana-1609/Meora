// Stops PINs, passwords, OTPs, card numbers and ID numbers from ever being saved.
// It is careful not to block normal things like phone numbers, dates, prices or postal PIN codes.
export type SecretKind = "card" | "id" | "pin" | "password" | "otp" | "account";

const luhn = (d: string) => {
  let s = 0, alt = false;
  for (let i = d.length - 1; i >= 0; i--) { let n = +d[i]; if (alt) { n *= 2; if (n > 9) n -= 9; } s += n; alt = !alt; }
  return s % 10 === 0;
};

const W = {
  password: ["password", "passwd", "pwd", "passcode", "pass code", "contraseña", "contrasena", "mot de passe", "passwort", "senha", "पासवर्ड", "पासवर्ड", "పాస్‌వర్డ్", "పాస్వర్డ్", "పాస్ వర్డ్", "கடவுச்சொல்", "பாஸ்வேர்டு", "كلمة المرور", "كلمة السر", "密码", "密碼", "パスワード", "비밀번호"],
  pin: ["pin", "pin number", "atm pin", "upi pin", "mpin", "पिन", "పిన్", "பின்", "رمز", "código pin", "code pin"],
  otp: ["otp", "one time password", "verification code", "security code", "cvv", "cvc", "ओटीपी", "ఓటీపీ", "ஓடிபி", "验证码", "رمز التحقق"],
  account: ["account number", "account no", "a/c", "acct", "acc no", "bank account", "खाता संख्या", "अकाउंट नंबर", "అకౌంట్ నంబర్", "ఖాతా నంబర్", "கணக்கு எண்", "número de cuenta", "numéro de compte", "رقم الحساب", "账号", "iban"],
  id: ["aadhaar", "aadhar", "adhar", "आधार", "ఆధార్", "ஆதார்", "ssn", "social security", "pan number", "pan card number", "passport number", "पैन", "పాన్"],
};
// words that mean "it is kept somewhere", which is fine to save
const PLACE = /^(in|inside|on|under|with|at|near|behind|kept|written|stored|saved|known|same|the|a|an|my|our|his|her|their|only|also|not|no|in\s|లో|మీద|దగ్గర|में|पर|के|पास|இல்|en|dans|avec|chez|في|在)$/i;

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
const re = (words: string[]) => new RegExp(`(?:^|[^\\p{L}\\p{N}])(${words.map(esc).join("|")})(?![\\p{L}])`, "giu");

export function findSecret(raw: string): SecretKind | null {
  const text = raw.normalize("NFC");
  const low = text.toLowerCase();

  // 1. card numbers (13-19 digits that pass the bank checksum)
  for (const m of low.matchAll(/(?<![\d])(?:\d[ -]?){12,18}\d(?![\d])/g)) {
    const d = m[0].replace(/\D/g, "");
    if (d.length >= 13 && d.length <= 19 && luhn(d) && !/^(\d)\1+$/.test(d)) return "card";
  }
  // 2. Aadhaar written as 4-4-4, and US SSN 3-2-4
  if (/(?<!\d)[2-9]\d{3}[ -]\d{4}[ -]\d{4}(?!\d)/.test(low)) return "id";
  if (/(?<!\d)\d{3}-\d{2}-\d{4}(?!\d)/.test(low)) return "id";
  // Indian PAN card (ABCDE1234F) and IBAN
  if (/\b[A-Z]{5}\d{4}[A-Z]\b/.test(text)) return "id";
  if (/\b[A-Z]{2}\d{2}(?: ?[A-Z0-9]{4}){3,7}\b/.test(text) && /\d{6,}/.test(text.replace(/\s/g, ""))) return "account";

  const after = (m: RegExpMatchArray, n = 40) => low.slice((m.index ?? 0) + m[0].length, (m.index ?? 0) + m[0].length + n);
  const digitsSoon = (s: string, min: number) => { const x = s.match(/^[\s:=\-–is\p{L}]{0,14}?((?:\d[\s-]?){3,})/u); return !!x && x[1].replace(/\D/g, "").length >= min; };

  // 3. ID words followed by a long number
  for (const m of low.matchAll(re(W.id))) if (digitsSoon(after(m), 6) || /^\s*(?:number|no\.?|num)?\s*(?:is|:|=)?\s*[a-z]{5}\d{4}[a-z]/i.test(after(m))) return "id";
  // 4. account number words followed by 6+ digits
  for (const m of low.matchAll(re(W.account))) if (digitsSoon(after(m), 6)) return "account";
  // 5. OTP / CVV followed by digits
  for (const m of low.matchAll(re(W.otp))) if (digitsSoon(after(m), 3)) return "otp";
  // 6. PIN followed by 3-8 digits, but a postal "PIN code 500032" is an address, not a secret
  for (const m of low.matchAll(re(W.pin))) {
    const rest = after(m);
    if (/^\s*-?\s*code\b|^code\b/.test(rest) && /^\s*-?\s*code\s*(?:is|:)?\s*\d{6}\b/.test(rest)) continue;
    if (/^\s*code\b/.test(rest) && !/\d/.test(rest.slice(0, 20))) continue;
    if (digitsSoon(rest, 3)) return "pin";
  }
  // 7. password followed by the actual password (not by where it is kept)
  for (const m of low.matchAll(re(W.password))) {
    const rest = text.slice((m.index ?? 0) + m[0].length, (m.index ?? 0) + m[0].length + 60);
    const x = rest.match(/^\s*(?:(?:is|was|=|:|-|–|for\s+\S+\s+is|ki|hai|है|हैं|ఇది|ఏంటంటే|ఉంది)\s*)+["'“]?([^\s"'”,]+)/iu);
    if (x) {
      const word = x[1].replace(/[.!?]+$/, "");
      if (word && !PLACE.test(word)) return "password";
    }
    // "password: hunter2" or "password hunter2!" with digits or symbols
    const y = rest.match(/^\s*[:=]?\s*([^\s]{4,})/u);
    if (y && /\d/.test(y[1]) && /\p{L}/u.test(y[1])) return "password";
  }
  return null;
}
