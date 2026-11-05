export type Role = "teacher" | "student";

export type GroupRef = { id: string; name: string; color: string };

export type User = {
  id: string;
  role: Role;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  username?: string | null;
  coin_balance: number;
  is_active?: boolean;
  group?: GroupRef | null;
  created_at?: string;
  last_login_at?: string | null;
  streak?: number;
};

export type Group = {
  id: string;
  name: string;
  description?: string | null;
  color: string;
  member_count: number;
  created_at?: string;
};

export type GroupDetail = Group & {
  assignment_count: number;
  members: User[];
};

export type Invitation = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  group_id: string;
  group_name: string;
  status: "pending" | "accepted" | "expired" | "revoked";
  expires_at: string;
  accepted_at?: string | null;
  last_sent_at?: string | null;
  email_error?: string | null;
  invite_link?: string | null;
  created_at: string;
  email_sent?: boolean;
};

export type Assignment = {
  id: string;
  title: string;
  description: string;
  group_id?: string | null;
  group_name?: string | null;
  due_at?: string | null;
  attachment?: { name: string; size: number; mime: string; url: string } | null;
  recipient_count?: number;
  viewed_at?: string | null;
  due_status?: "overdue" | "today" | "upcoming" | "none";
  teacher_name?: string;
  created_at: string;
  recipients?: { id: string; full_name: string; viewed_at: string | null }[];
};

export type CoinTransaction = {
  id: string;
  student_id?: string;
  amount: number;
  balance_after: number;
  type: "award" | "deduction" | "reward_spend" | "reward_refund";
  reason: string;
  actor_name?: string | null;
  student_name?: string;
  created_at: string;
};

export type Reward = {
  id: string;
  title: string;
  description: string;
  price: number;
  is_available: boolean;
  is_archived: boolean;
  image_url?: string | null;
  pending_count?: number;
  has_pending_request?: boolean;
  can_request?: boolean;
  created_at: string;
};

export type RewardRequest = {
  id: string;
  status: "pending" | "approved" | "rejected";
  price: number;
  note?: string | null;
  requested_at: string;
  resolved_at?: string | null;
  refunded_at?: string | null;
  student?: { id: string; full_name: string; email: string } | null;
  reward?: { id: string; title: string; image_url?: string | null } | null;
};

export type Book = {
  id: string;
  title: string;
  author: string;
  description: string;
  level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  file_type: "pdf" | "epub";
  file_size: number;
  is_published: boolean;
  cover_url?: string | null;
  file_url: string;
  is_favorite: boolean;
  progress?: {
    current_page: number;
    total_pages: number | null;
    progress_percent: number;
    location: string | null;
    last_read_at: string;
  } | null;
  created_at?: string;
};

export type Bookmark = {
  id: string;
  page: number | null;
  location: string;
  label?: string | null;
  note?: string | null;
  created_at: string;
};

export type Announcement = {
  id: string;
  title: string;
  body: string;
  group_id?: string | null;
  group_name?: string | null;
  is_pinned: boolean;
  created_at: string;
};

export type LeaderboardRow = {
  rank: number;
  student_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  group_id?: string | null;
  group_name?: string | null;
  coins: number;
};

export type Leaderboard = {
  period: "week" | "month" | "all";
  period_start?: string | null;
  today: string;
  top: LeaderboardRow[];
  me: LeaderboardRow | null;
  champion: LeaderboardRow | null;
};

export type SOTD = {
  id: string;
  student_id: string;
  student_name: string;
  group_name?: string | null;
  note?: string | null;
  awarded_on: string;
};

export type Goal = {
  id: string;
  title: string;
  metric: "coins" | "books" | "words";
  target_value: number;
  week_start: string;
  student_id?: string | null;
  group_id?: string | null;
  scope: "student" | "group";
  group_name?: string | null;
  student_name?: string | null;
  progress?: { value: number; target: number; percent: number } | null;
};

export type ActivityItem = {
  id: string;
  type: string;
  title: string;
  meta?: Record<string, unknown>;
  student_name?: string;
  created_at: string;
};

export type TeacherDashboard = {
  stats: {
    students: number;
    groups: number;
    assignments: number;
    coins_given: number;
    pending_reward_requests: number;
    weekly_active_students: number;
  };
  weekly_champion: LeaderboardRow | null;
  student_of_the_day: SOTD | null;
  top_students: LeaderboardRow[];
  recent_activity: ActivityItem[];
  pending_reward_requests: RewardRequest[];
};

export type StudentDashboard = {
  student: User;
  stats: {
    coins: number;
    saved_words: number;
    books_started: number;
    books_finished: number;
    streak: number;
  };
  ranks: Record<"week" | "month" | "all", LeaderboardRow | null>;
  badges: { student_of_the_day: SOTD | null; weekly_champion: LeaderboardRow | null };
  new_assignments_count: number;
  assignments: Assignment[];
  announcements: Announcement[];
  reading: Book[];
  goals: Goal[];
  weekly_activity: { date: string; count: number }[];
  champion: LeaderboardRow | null;
};

export type DictionaryWord = {
  word: string;
  translation: string | null;
  translation_alternatives: string[];
  phonetic: string | null;
  audio_url: string | null;
  part_of_speech: string | null;
  definition: string | null;
  example: string | null;
  example_translation: string | null;
  synonyms: string[];
  source?: string;
  warnings: string[];
  is_saved?: boolean;
  saved_id?: string | null;
};

export type SavedWord = {
  id: string;
  word: string;
  translation: string;
  phonetic?: string | null;
  audio_url?: string | null;
  part_of_speech?: string | null;
  definition?: string | null;
  example?: string | null;
  example_translation?: string | null;
  synonyms: string[];
  note?: string | null;
  created_at: string;
};

export type IrregularVerb = {
  id: string;
  base: string;
  past_simple: string;
  past_participle: string;
  translation_uz: string;
  pronunciation?: string | null;
  base_pron?: string | null;
  past_pron?: string | null;
  participle_pron?: string | null;
  example: string;
  example_uz: string;
  irregular_type?: string | null;
  is_saved: boolean;
  saved_id?: string | null;
};

export type StudentDetail = {
  student: User;
  streak: { current: number; active_today: boolean; days: string[] };
  ranks: Record<"week" | "month" | "all", LeaderboardRow | null>;
  transactions: CoinTransaction[];
  activity: ActivityItem[];
  reading: { book_id: string; title: string; author: string; level: string; progress_percent: number; last_read_at: string }[];
  saved_words_count: number;
  reward_requests: RewardRequest[];
};
