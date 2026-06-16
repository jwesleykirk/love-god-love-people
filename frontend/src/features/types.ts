export type LifeStage = "student" | "single" | "married" | "adult";
export type TargetFrequency = "daily" | "weekly" | "monthly";
export type BuildStatus = "pending" | "building" | "ready" | "failed";

export type Child = {
  id?: number;
  name: string;
  birthdate?: string | null;
  birth_year?: number | null;
  age_display?: string | null;
};

export type Person = {
  id: number;
  name: string;
  life_stage: LifeStage;
  career?: string;
  school?: string;
  major?: string;
  partner_name?: string;
  notes?: string;
  children?: Child[];
  created_at?: string;
  updated_at?: string;
};

export type GroupMembership = {
  id: number;
  person: Pick<Person, "id" | "name" | "life_stage">;
};

export type Group = {
  id: number;
  name: string;
  notes?: string;
  memberships?: GroupMembership[];
  member_ids?: number[];
  member_count?: number;
  created_at?: string;
};

export type PrayerTopic = {
  id: number;
  person?: Pick<Person, "id" | "name"> | null;
  group?: Pick<Group, "id" | "name"> | null;
  person_id?: number | null;
  group_id?: number | null;
  topic_text: string;
  narration_text: string;
  narration_generated: boolean;
  target_frequency: TargetFrequency;
  next_scheduled_date?: string | null;
  answered_date?: string | null;
  answer_note?: string;
  created_at?: string;
};

export type PrayerLog = {
  id: number;
  topic_id: number;
  topic_narration: string;
  prayed_on: string;
  answered: boolean;
  answer_note: string;
};

export type PrayerSession = {
  id?: number;
  session_date: string;
  completed_at?: string | null;
  audio_url?: string | null;
  build_status: BuildStatus | string;
  build_log?: string;
  logs?: PrayerLog[];
  detail?: string;
  topic_count?: number;
  answered_count?: number;
};

export type GuideSettings = {
  build_time_hour: number;
  elevenlabs_voice_id: string;
  elevenlabs_model: string;
  tts_available: boolean;
  openrouter_available: boolean;
};
