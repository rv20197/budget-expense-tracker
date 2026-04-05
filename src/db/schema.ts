import {
  boolean,
  check,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const categoryTypeEnum = pgEnum("category_type", ["income", "expense"]);
export const recurringFrequencyEnum = pgEnum("recurring_frequency", [
  "monthly",
  "yearly",
]);
export const debtDirectionEnum = pgEnum("debt_direction", ["DEBT", "LOAN"]);
export const debtInterestTypeEnum = pgEnum("debt_interest_type", [
  "NONE",
  "SIMPLE",
  "COMPOUND",
]);
export const debtStatusEnum = pgEnum("debt_status", [
  "ACTIVE",
  "PAID",
  "CANCELLED",
]);
export const recordScopeEnum = pgEnum("record_scope", ["household", "personal"]);
export const householdRoleEnum = pgEnum("household_role", ["admin", "member"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => new Date()),
};

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex("users_email_unique").on(table.email)],
);

export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("refresh_tokens_token_hash_unique").on(table.tokenHash),
    index("refresh_tokens_user_id_idx").on(table.userId),
  ],
);

export const households = pgTable(
  "households",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    inviteCode: varchar("invite_code", { length: 12 }).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("households_invite_code_unique").on(table.inviteCode),
  ],
);

export const householdMembers = pgTable(
  "household_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: householdRoleEnum("role").default("member").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("household_members_user_id_unique").on(table.userId),
    uniqueIndex("household_members_household_user_unique").on(
      table.householdId,
      table.userId,
    ),
    index("household_members_household_id_idx").on(table.householdId),
  ],
);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    scope: recordScopeEnum("scope").default("household").notNull(),
    name: text("name").notNull(),
    type: categoryTypeEnum("type").notNull(),
    color: text("color").default("#64748b").notNull(),
    isDefault: boolean("is_default").default(false).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("categories_household_name_type_unique")
      .on(table.householdId, table.name, table.type)
      .where(sql`${table.scope} = 'household'`),
    uniqueIndex("categories_personal_creator_name_type_unique")
      .on(table.householdId, table.createdBy, table.name, table.type)
      .where(sql`${table.scope} = 'personal'`),
    index("categories_household_id_idx").on(table.householdId),
    index("categories_created_by_idx").on(table.createdBy),
  ],
);

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    type: categoryTypeEnum("type").notNull(),
    description: text("description").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    transactionDate: date("transaction_date", { mode: "date" }).notNull(),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [
    index("transactions_household_id_idx").on(table.householdId),
    index("transactions_created_by_idx").on(table.createdBy),
    index("transactions_category_id_idx").on(table.categoryId),
    index("transactions_transaction_date_idx").on(table.transactionDate),
  ],
);

export const budgets = pgTable(
  "budgets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    scope: recordScopeEnum("scope").default("household").notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    month: integer("month").notNull(),
    year: integer("year").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    ...timestamps,
  },
  (table) => [
    check("budgets_month_check", sql`${table.month} between 1 and 12`),
    index("budgets_household_id_idx").on(table.householdId),
    index("budgets_created_by_idx").on(table.createdBy),
    index("budgets_category_id_idx").on(table.categoryId),
  ],
);

export const recurringTransactions = pgTable(
  "recurring_transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    type: categoryTypeEnum("type").notNull(),
    description: text("description").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    frequency: recurringFrequencyEnum("frequency").notNull(),
    startDate: date("start_date", { mode: "date" }).notNull(),
    nextDueDate: date("next_due_date", { mode: "date" }).notNull(),
    lastProcessedAt: timestamp("last_processed_at", { withTimezone: true }),
    isActive: boolean("is_active").default(true).notNull(),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [
    index("recurring_transactions_user_id_idx").on(table.userId),
    index("recurring_transactions_next_due_date_idx").on(table.nextDueDate),
    index("recurring_transactions_active_idx").on(table.isActive),
  ],
);

export const debts = pgTable(
  "debts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    direction: debtDirectionEnum("direction").notNull(),
    counterparty: text("counterparty").notNull(),
    principal: numeric("principal", { precision: 12, scale: 2 }).notNull(),
    remainingBalance: numeric("remaining_balance", {
      precision: 12,
      scale: 2,
    }).notNull(),
    interestRate: numeric("interest_rate", {
      precision: 5,
      scale: 2,
    })
      .default("0")
      .notNull(),
    interestType: debtInterestTypeEnum("interest_type")
      .default("NONE")
      .notNull(),
    dueDate: date("due_date", { mode: "date" }),
    nextPaymentDate: date("next_payment_date", { mode: "date" }),
    installmentAmount: numeric("installment_amount", {
      precision: 12,
      scale: 2,
    }),
    status: debtStatusEnum("status").default("ACTIVE").notNull(),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [
    index("debts_household_id_idx").on(table.householdId),
    index("debts_created_by_idx").on(table.createdBy),
    index("debts_status_idx").on(table.status),
    index("debts_direction_idx").on(table.direction),
  ],
);

export const debtPayments = pgTable(
  "debt_payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    debtId: uuid("debt_id")
      .notNull()
      .references(() => debts.id, { onDelete: "cascade" }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    paidOn: date("paid_on", { mode: "date" }).notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("debt_payments_debt_id_idx").on(table.debtId),
    index("debt_payments_created_by_idx").on(table.createdBy),
    index("debt_payments_paid_on_idx").on(table.paidOn),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Household = typeof households.$inferSelect;
export type HouseholdMember = typeof householdMembers.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Budget = typeof budgets.$inferSelect;
export type RecurringTransaction = typeof recurringTransactions.$inferSelect;
export type Debt = typeof debts.$inferSelect;
export type DebtPayment = typeof debtPayments.$inferSelect;
