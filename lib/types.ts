export type TopicId = "health" | "contacts" | "where" | "dates" | "recipes" | "home" | "money" | "kids" | "vehicles" | "stories" | "diary" | "other";
export type Repeat = "once" | "daily" | "weekly" | "monthly" | "yearly";
export type Remind = { repeat: Repeat; date?: string /* YYYY-MM-DD */; time?: string /* HH:MM */ };

/** A photo or voice clip, locked with its own key (the key lives inside the locked note). */
export type BlobRef = { id: string; key: string; mime: string };

export type NoteData = {
  kind: "note";
  text: string;
  /** the same note in English, when it was said in another language */
  en?: string;
  lang: string;
  topic: TopicId;
  about: string[];
  remind?: Remind;
  photo?: BlobRef;
  audio?: BlobRef;
  history: { text: string; by: string; at: number }[];
  confirmedAt: number;
  createdAt: number;
  createdBy: string;
  /** diary: how the day felt */
  mood?: Mood;
  /** the daily question this answers */
  q?: string;
};
export type Mood = "good" | "calm" | "okay" | "low" | "stressed";
/** Who a space is for. Older families have no kind: they are "family". */
export type SpaceKind = "family" | "friends" | "me";
export type QuestionData = { kind: "question"; text: string; lang: string; at: number; by: string; answer?: { noteId: string; by: string; at: number } };
export type ProfileData = {
  kind: "profile"; person: string; age?: string; blood?: string; allergies?: string; conditions?: string; meds?: string;
  hospital?: string; doctor?: string; doctorPhone?: string; contacts: { name: string; phone: string }[];
};
export type Payload = NoteData | QuestionData | ProfileData;
export type ItemKind = Payload["kind"];

export type Sealed = { iv: string; ct: string };
/** What the server stores. It never sees the words inside. */
export type WireItem = {
  id: string; kind: ItemKind; by: string; updated: number; deleted?: boolean;
  vis?: string[] | null;            // null = everyone in the family
  box?: Sealed;                     // the encrypted payload
  keys?: Record<string, Sealed>;    // for "only some": the note key, sealed for each allowed member
};

export type Member = { id: string; name: string; color: string; pub: JsonWebKey; canApprove: boolean; joined: number; removed?: boolean };
export type JoinRequest = { id: string; name: string; created: number; pub: JsonWebKey };
export type PublicFamily = { id: string; created: number; members: Member[]; requests: JoinRequest[]; kind?: SpaceKind };
