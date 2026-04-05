/**
 * Transcribe a pager tone audio attachment using OpenAI Whisper.
 * Returns the transcript text, or null if transcription fails.
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  mimeType: string,
  filename: string
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    // Whisper API requires multipart/form-data
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType });
    formData.append("file", blob, filename);
    formData.append("model", "whisper-1");
    formData.append("language", "en");
    // Hint Whisper about EMS dispatch context to improve accuracy
    formData.append("prompt", "EMS dispatch. Millstadt Ambulance Service. Medical emergency. Address, nature of call, patient age.");

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    });

    if (!res.ok) {
      console.error("Whisper API error:", res.status, await res.text());
      return null;
    }

    const data = await res.json() as { text: string };
    return data.text?.trim() ?? null;
  } catch (err) {
    console.error("Whisper transcription failed:", err);
    return null;
  }
}

/**
 * Extract ONLY the call nature/type from a Whisper transcript.
 * NEVER returns patient names, ages, addresses, or identifying info.
 * Only the generic call type is used publicly (e.g. "CHEST PAIN", "MVA").
 */
export function extractNatureFromTranscript(transcript: string): string | null {
  const t = transcript.toUpperCase();

  // "for a/an {nature}" — most common dispatcher format
  const forA = transcript.match(/\bfor\s+(?:a|an)\s+(.{4,60}?)(?:\.|,|$)/i);
  if (forA) return forA[1].trim().toUpperCase();

  // "respond to ... {nature}"
  const respond = transcript.match(/respond\s+to\s+.+?\s+(?:for\s+)?(.{4,60}?)(?:\.|,|$)/i);
  if (respond) return respond[1].trim().toUpperCase();

  // Known EMS call types in the transcript
  const CALL_TYPES = [
    "CHEST PAIN", "CARDIAC ARREST", "DIFFICULTY BREATHING", "SHORTNESS OF BREATH",
    "MOTOR VEHICLE ACCIDENT", "MVA", "VEHICLE ACCIDENT", "ACCIDENT WITH INJURIES",
    "FALL", "STROKE", "UNCONSCIOUS", "UNRESPONSIVE", "SEIZURE", "DIABETIC",
    "ALLERGIC REACTION", "OVERDOSE", "TRAUMA", "STABBING", "GUNSHOT", "SHOOTING",
    "FIRE", "STRUCTURE FIRE", "BRUSH FIRE", "MUTUAL AID", "LIFT ASSIST",
    "MEDICAL EMERGENCY", "MEDICAL CALL", "EMS CALL", "FIRST RESPONDER",
    "ABDOMINAL PAIN", "BACK PAIN", "HEMORRHAGE", "BLEEDING",
  ];

  for (const type of CALL_TYPES) {
    if (t.includes(type)) return type;
  }

  // Last resort: take the longest sentence fragment that isn't an address
  const sentences = transcript.split(/[.,]/).map(s => s.trim()).filter(s => s.length > 8);
  const nonAddress = sentences.find(s => !/^\d+\s+\w+\s+(st|street|ave|dr|road|ln|lane|blvd)/i.test(s));
  return nonAddress ? nonAddress.toUpperCase() : null;
}
