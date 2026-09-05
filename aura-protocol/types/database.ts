export type RankTitle =
  | "👑 FINAL BOSS"
  | "🥶 OG"
  | "💀 IM TRYING BLUD"
  | "👶 TRY HARD KIDS";

export type FlagStatus = "pending" | "approved" | "rejected";

export interface Profile {
  id: string;
  email: string;
  display_name: string;
  role_tag: string;
  timezone_offset: string;
  current_streak: number;
  longest_streak: number;
  total_aura: number;
  rank_title: RankTitle;
  rest_tokens_remaining: number;
  rest_tokens_reset_at: string;
  flag_accuracy_score: number;
  stake_paid: boolean;
  contract_signed_at: string | null;
  movement_label: string;
  grind_label: string;
  calorie_goal: number | null;
  created_at: string;
}

export type SeasonStatus = "active" | "settled";
export type StakeStatus = "created" | "paid" | "refunded" | "forfeited" | "won";

export interface Season {
  id: string;
  starts_on: string;
  ends_on: string;
  entry_stake_inr: number;
  status: SeasonStatus;
  pool_amount_inr: number;
  created_at: string;
}

export interface Stake {
  id: string;
  user_id: string;
  season_id: string;
  amount_inr: number;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  status: StakeStatus;
  paid_at: string | null;
  settled_at: string | null;
  payout_amount_inr: number;
  consistency_pct: number | null;
  created_at: string;
}

export interface DailyLog {
  id: string;
  user_id: string;
  log_date: string;
  timezone_offset: string;
  breakfast_img: string | null;
  lunch_img: string | null;
  pre_workout_img: string | null;
  post_workout_img: string | null;
  dinner_img: string | null;
  movement_img: string | null;
  grind_img: string | null;
  calories_logged: number | null;
  calorie_goal_met: boolean;
  daily_aura_earned: number;
  is_perfect_day: boolean;
  is_rest_token_used: boolean;
  gesture_of_the_day: string | null;
  gesture_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface Flag {
  id: string;
  daily_log_id: string;
  flagged_by_user_id: string;
  reason: string | null;
  status: FlagStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & Pick<Profile, "id" | "email" | "display_name">;
        Update: Partial<Profile>;
      };
      daily_logs: {
        Row: DailyLog;
        Insert: Partial<DailyLog> & Pick<DailyLog, "user_id" | "log_date">;
        Update: Partial<DailyLog>;
      };
      flags: {
        Row: Flag;
        Insert: Partial<Flag> & Pick<Flag, "daily_log_id" | "flagged_by_user_id">;
        Update: Partial<Flag>;
      };
      seasons: {
        Row: Season;
        Insert: Partial<Season>;
        Update: Partial<Season>;
      };
      stakes: {
        Row: Stake;
        Insert: Partial<Stake> & Pick<Stake, "user_id" | "season_id" | "amount_inr">;
        Update: Partial<Stake>;
      };
    };
  };
}
