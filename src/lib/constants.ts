// Allowed values for every status/type column (SQL Server has no enums).
// Labels shown in the UI live in STATUS_LABELS below.

export const ROLES = {
  STUDENT: "STUDENT",
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  FINANCE: "FINANCE",
  CONTENT: "CONTENT",
  EXAMINER: "EXAMINER",
} as const;
export type RoleName = (typeof ROLES)[keyof typeof ROLES];
export const STAFF_ROLES: RoleName[] = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.FINANCE, ROLES.CONTENT, ROLES.EXAMINER];

export const USER_STATUS = { ACTIVE: "ACTIVE", SUSPENDED: "SUSPENDED" } as const;

export const TOKEN_TYPE = { EMAIL_VERIFICATION: "EMAIL_VERIFICATION", PASSWORD_RESET: "PASSWORD_RESET" } as const;

export const CLASS_LEVELS = [
  { value: "CLASS_9", label: "Class 9 (Matric Part I)" },
  { value: "CLASS_10", label: "Class 10 (Matric Part II)" },
  { value: "CLASS_11", label: "Class 11 (HSC Part I / First Year)" },
  { value: "CLASS_12", label: "Class 12 (HSC Part II / Second Year)" },
  { value: "INTERMEDIATE", label: "Intermediate (other / private candidate)" },
] as const;
export const CLASS_LEVEL_VALUES = CLASS_LEVELS.map((c) => c.value) as [string, ...string[]];

export const SINDH_DISTRICTS = [
  "Badin", "Dadu", "Ghotki", "Hyderabad", "Jacobabad", "Jamshoro", "Kambar Shahdadkot", "Karachi Central",
  "Karachi East", "Karachi South", "Karachi West", "Kashmore", "Keamari", "Khairpur", "Korangi", "Larkana",
  "Malir", "Matiari", "Mirpurkhas", "Naushahro Feroze", "Sanghar", "Shaheed Benazirabad", "Shikarpur",
  "Sujawal", "Sukkur", "Tando Allahyar", "Tando Muhammad Khan", "Tharparkar", "Thatta", "Umerkot",
] as const;
export const OUTSIDE_SINDH = "Outside Sindh";
export const DISTRICT_OPTIONS = [...SINDH_DISTRICTS, OUTSIDE_SINDH] as [string, ...string[]];

export const GUARDIAN_RELATIONS = ["Father", "Mother", "Brother", "Sister", "Uncle", "Aunt", "Grandparent", "Legal guardian"] as const;
export const LEADERBOARD_NAME_MODES = ["INITIALS", "FULL"] as const;

export const COMPETITION_STATUS = { DRAFT: "DRAFT", PUBLISHED: "PUBLISHED", ARCHIVED: "ARCHIVED" } as const;
export const RESULTS_STATUS = { PENDING: "PENDING", DRAFT: "DRAFT", APPROVED: "APPROVED", PUBLISHED: "PUBLISHED" } as const;

export const REGISTRATION_STATUS = {
  PENDING_PAYMENT: "PENDING_PAYMENT",
  CONFIRMED: "CONFIRMED",
  CANCELLED: "CANCELLED",
  REFUNDED: "REFUNDED",
} as const;

export const PAYMENT_STATUS = {
  INITIATED: "INITIATED",
  PENDING_VERIFICATION: "PENDING_VERIFICATION",
  SUCCEEDED: "SUCCEEDED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
  EXPIRED: "EXPIRED",
  REFUNDED: "REFUNDED",
} as const;
export const OPEN_PAYMENT_STATUSES: string[] = [PAYMENT_STATUS.INITIATED, PAYMENT_STATUS.PENDING_VERIFICATION, PAYMENT_STATUS.SUCCEEDED];

export const REFUND_STATUS = { REQUESTED: "REQUESTED", REFUNDED: "REFUNDED", REJECTED: "REJECTED" } as const;

export const PAYMENT_METHOD = {
  SANDBOX: "SANDBOX",
  MANUAL_TRANSFER: "MANUAL_TRANSFER",
  JAZZCASH: "JAZZCASH",
  EASYPAISA: "EASYPAISA",
} as const;

export const ATTEMPT_STATUS = {
  IN_PROGRESS: "IN_PROGRESS",
  SUBMITTED: "SUBMITTED",
  AUTO_SUBMITTED: "AUTO_SUBMITTED",
  VOIDED: "VOIDED",
} as const;
export const SUBMISSION_TYPE = { MANUAL: "MANUAL", AUTO_TIMEOUT: "AUTO_TIMEOUT", ADMIN_FORCED: "ADMIN_FORCED" } as const;

export const RESULT_STATUS = {
  PROVISIONAL: "PROVISIONAL",
  PENDING_REVIEW: "PENDING_REVIEW",
  VERIFIED: "VERIFIED",
  WITHHELD: "WITHHELD",
  DISQUALIFIED: "DISQUALIFIED",
} as const;

export const ALLOCATION_STATUS = {
  PENDING_VERIFICATION: "PENDING_VERIFICATION",
  VERIFIED: "VERIFIED",
  REJECTED: "REJECTED",
  FORFEITED: "FORFEITED",
} as const;
export const DISTRIBUTION_STATUS = { PENDING: "PENDING", SCHEDULED: "SCHEDULED", DISPATCHED: "DISPATCHED", DELIVERED: "DELIVERED" } as const;
export const DISTRIBUTION_METHOD = { CEREMONY: "CEREMONY", COURIER: "COURIER", IN_PERSON: "IN_PERSON" } as const;

export const PRIZE_CATEGORY = { LAPTOP: "LAPTOP", CHROMEBOOK: "CHROMEBOOK", TABLET: "TABLET", OTHER: "OTHER" } as const;

export const QUESTION_TYPE = { MCQ: "MCQ", SHORT_ANSWER: "SHORT_ANSWER" } as const;
export const DIFFICULTY = { EASY: "EASY", MEDIUM: "MEDIUM", HARD: "HARD" } as const;
export const QUESTION_STATUS = { ACTIVE: "ACTIVE", ARCHIVED: "ARCHIVED" } as const;

export const EXAM_ACTIVITY = {
  TAB_HIDDEN: "TAB_HIDDEN",
  WINDOW_BLUR: "WINDOW_BLUR",
  COPY_ATTEMPT: "COPY_ATTEMPT",
  PASTE_ATTEMPT: "PASTE_ATTEMPT",
  CONTEXT_MENU: "CONTEXT_MENU",
  FULLSCREEN_EXIT: "FULLSCREEN_EXIT",
  OFFLINE: "OFFLINE",
  RECONNECTED: "RECONNECTED",
  OTHER_SESSION: "OTHER_SESSION",
  LATE_SAVE_REJECTED: "LATE_SAVE_REJECTED",
} as const;
// Events that count towards an attempt's flag total (shown to reviewers, never auto-disqualifies).
export const FLAGGED_ACTIVITY: string[] = [
  EXAM_ACTIVITY.TAB_HIDDEN,
  EXAM_ACTIVITY.COPY_ATTEMPT,
  EXAM_ACTIVITY.PASTE_ATTEMPT,
  EXAM_ACTIVITY.FULLSCREEN_EXIT,
  EXAM_ACTIVITY.OTHER_SESSION,
];

export const TICKET_CATEGORY = {
  GENERAL: "GENERAL",
  REGISTRATION: "REGISTRATION",
  PAYMENT: "PAYMENT",
  EXAM: "EXAM",
  RESULT_DISPUTE: "RESULT_DISPUTE",
  TECHNICAL: "TECHNICAL",
  COMPLAINT: "COMPLAINT",
  PARTNERSHIP: "PARTNERSHIP",
} as const;
export const TICKET_STATUS = { OPEN: "OPEN", IN_PROGRESS: "IN_PROGRESS", RESOLVED: "RESOLVED", CLOSED: "CLOSED" } as const;
export const TICKET_PRIORITY = { LOW: "LOW", NORMAL: "NORMAL", HIGH: "HIGH" } as const;

export const CAMPAIGN_CHANNEL = {
  FACEBOOK: "FACEBOOK",
  INSTAGRAM: "INSTAGRAM",
  TIKTOK: "TIKTOK",
  WHATSAPP: "WHATSAPP",
  AMBASSADOR: "AMBASSADOR",
  SCHOOL_PARTNERSHIP: "SCHOOL_PARTNERSHIP",
  EMAIL: "EMAIL",
  OTHER: "OTHER",
} as const;
export const CAMPAIGN_STATUS = { PLANNED: "PLANNED", ACTIVE: "ACTIVE", PAUSED: "PAUSED", COMPLETED: "COMPLETED" } as const;
export const REFERRAL_STATUS = { SIGNED_UP: "SIGNED_UP", CONVERTED: "CONVERTED" } as const;

export const ANNOUNCEMENT_TYPE = { NEWS: "NEWS", BANNER: "BANNER" } as const;
export const CEREMONY_STATUS = { DRAFT: "DRAFT", PUBLISHED: "PUBLISHED" } as const;
export const MEDIA_TYPE = { IMAGE: "IMAGE", VIDEO: "VIDEO" } as const;

export const EXPENSE_CATEGORY = {
  PRIZE_PURCHASE: "PRIZE_PURCHASE",
  PLATFORM_TECH: "PLATFORM_TECH",
  MARKETING: "MARKETING",
  ADMINISTRATION: "ADMINISTRATION",
  PAYMENT_PROCESSING: "PAYMENT_PROCESSING",
  CONTINGENCY: "CONTINGENCY",
  OTHER: "OTHER",
} as const;
export const PROJECTION_TYPE = { REVENUE: "REVENUE", EXPENSE: "EXPENSE" } as const;

export const FAQ_CATEGORY = {
  GENERAL: "GENERAL",
  REGISTRATION: "REGISTRATION",
  PAYMENT: "PAYMENT",
  EXAM: "EXAM",
  RESULTS: "RESULTS",
  PRIZES: "PRIZES",
} as const;

export const NOTIFICATION_TYPE = {
  REGISTRATION: "REGISTRATION",
  PAYMENT: "PAYMENT",
  EXAM_REMINDER: "EXAM_REMINDER",
  EXAM: "EXAM",
  RESULT: "RESULT",
  PRIZE: "PRIZE",
  CEREMONY: "CEREMONY",
  COMPETITION: "COMPETITION",
  SUPPORT: "SUPPORT",
  ACCOUNT: "ACCOUNT",
  ANNOUNCEMENT: "ANNOUNCEMENT",
} as const;

export const BROADCAST_AUDIENCE = {
  ALL_STUDENTS: "ALL_STUDENTS",
  COMPETITION_ALL: "COMPETITION_ALL",
  COMPETITION_CONFIRMED: "COMPETITION_CONFIRMED",
  COMPETITION_PENDING_PAYMENT: "COMPETITION_PENDING_PAYMENT",
} as const;

export const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
  DRAFT: "Draft",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
  PENDING: "Pending",
  APPROVED: "Approved",
  PENDING_PAYMENT: "Awaiting payment",
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
  INITIATED: "Initiated",
  PENDING_VERIFICATION: "Pending verification",
  SUCCEEDED: "Paid",
  FAILED: "Failed",
  EXPIRED: "Expired",
  REQUESTED: "Refund requested",
  REJECTED: "Rejected",
  SANDBOX: "Sandbox (demo)",
  MANUAL_TRANSFER: "Manual transfer",
  JAZZCASH: "JazzCash",
  EASYPAISA: "Easypaisa",
  IN_PROGRESS: "In progress",
  SUBMITTED: "Submitted",
  AUTO_SUBMITTED: "Auto-submitted",
  VOIDED: "Voided",
  PROVISIONAL: "Provisional",
  PENDING_REVIEW: "Needs review",
  VERIFIED: "Verified",
  WITHHELD: "Withheld",
  DISQUALIFIED: "Disqualified",
  FORFEITED: "Forfeited",
  SCHEDULED: "Scheduled",
  DISPATCHED: "Dispatched",
  DELIVERED: "Delivered",
  CEREMONY: "Award ceremony",
  COURIER: "Courier",
  IN_PERSON: "In person",
  LAPTOP: "Laptop",
  CHROMEBOOK: "Chromebook",
  TABLET: "Tablet",
  OTHER: "Other",
  MCQ: "Multiple choice",
  SHORT_ANSWER: "Short answer (manual)",
  EASY: "Easy",
  MEDIUM: "Medium",
  HARD: "Hard",
  OPEN: "Open",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
  LOW: "Low",
  NORMAL: "Normal",
  HIGH: "High",
  GENERAL: "General",
  REGISTRATION: "Registration",
  PAYMENT: "Payment",
  EXAM: "Examination",
  RESULT_DISPUTE: "Result dispute",
  TECHNICAL: "Technical",
  COMPLAINT: "Complaint",
  PARTNERSHIP: "School partnership",
  RESULTS: "Results",
  PRIZES: "Prizes",
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
  WHATSAPP: "WhatsApp",
  AMBASSADOR: "Student ambassadors",
  SCHOOL_PARTNERSHIP: "School partnership",
  EMAIL: "Email",
  PLANNED: "Planned",
  PAUSED: "Paused",
  COMPLETED: "Completed",
  SIGNED_UP: "Signed up",
  CONVERTED: "Registered & paid",
  NEWS: "News",
  BANNER: "Site banner",
  PRIZE_PURCHASE: "Prize purchases",
  PLATFORM_TECH: "Platform & technical",
  MARKETING: "Marketing & promotion",
  ADMINISTRATION: "Administration & testing",
  PAYMENT_PROCESSING: "Payment processing & support",
  CONTINGENCY: "Contingency",
  REVENUE: "Revenue",
  EXPENSE: "Expense",
  STUDENT: "Student",
  SUPER_ADMIN: "Super admin",
  ADMIN: "Administrator",
  FINANCE: "Finance officer",
  CONTENT: "Content & marketing",
  EXAMINER: "Examiner",
  INITIALS: "First name + initial",
  FULL: "Full name",
  LOGGED: "Logged (no SMTP)",
  SENT: "Sent",
  IMAGE: "Photo",
  VIDEO: "Video",
  MANUAL: "Submitted by student",
  AUTO_TIMEOUT: "Auto-submitted (time up)",
  ADMIN_FORCED: "Force-submitted by admin",
  ALL_STUDENTS: "All students",
  COMPETITION_ALL: "All registrants of a competition",
  COMPETITION_CONFIRMED: "Confirmed registrants of a competition",
  COMPETITION_PENDING_PAYMENT: "Registrants with pending payment",
};

export function label(value: string | null | undefined): string {
  if (!value) return "—";
  return STATUS_LABELS[value] ?? value.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

export function classLabel(value: string | null | undefined): string {
  return CLASS_LEVELS.find((c) => c.value === value)?.label ?? value ?? "—";
}

export const PKT_TIMEZONE = "Asia/Karachi";
