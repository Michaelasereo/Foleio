-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "CreatorTier" AS ENUM ('TIER_1', 'TIER_2', 'TIER_3');

-- CreateEnum
CREATE TYPE "SubaccountStatus" AS ENUM ('INACTIVE', 'PENDING_CREATION', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "PayoutMethod" AS ENUM ('SCHEDULED_BULK', 'INSTANT', 'DIRECT_SUBACCOUNT');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'REVERSED');

-- CreateEnum
CREATE TYPE "PayoutFrequency" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'MANUAL');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('DIRECT_SUBACCOUNT', 'PLATFORM_HELD');

-- CreateEnum
CREATE TYPE "UploadStatus" AS ENUM ('PENDING', 'UPLOADING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "UsageType" AS ENUM ('UPLOAD', 'STORAGE', 'BANDWIDTH', 'TRANSCODING');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "full_name" TEXT,
    "avatar_url" TEXT,
    "phone_number" TEXT,
    "country_code" TEXT NOT NULL DEFAULT 'NG',
    "is_creator" BOOLEAN NOT NULL DEFAULT false,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creators" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "bio" TEXT,
    "category" TEXT NOT NULL DEFAULT 'makeup',
    "avatar_url" TEXT,
    "banner_url" TEXT,
    "instagram_handle" TEXT,
    "tiktok_handle" TEXT,
    "intro_video_id" TEXT,
    "platform_plan" TEXT DEFAULT 'starter',
    "platform_subscription_active" BOOLEAN NOT NULL DEFAULT false,
    "platform_subscription_ends_at" TIMESTAMP(3),
    "balance" BIGINT NOT NULL DEFAULT 0,
    "pending_balance" BIGINT NOT NULL DEFAULT 0,
    "bank_details" JSONB,
    "paystack_subaccount_code" TEXT,
    "subaccount_status" "SubaccountStatus" NOT NULL DEFAULT 'INACTIVE',
    "paystack_recipient_code" TEXT,
    "tier" "CreatorTier" NOT NULL DEFAULT 'TIER_1',
    "tier_updated_at" TIMESTAMP(3),
    "total_earnings" BIGINT NOT NULL DEFAULT 0,
    "monthly_earnings" JSONB NOT NULL DEFAULT '{}',
    "trust_score" INTEGER NOT NULL DEFAULT 50,
    "chargeback_rate" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "payout_method" "PayoutMethod" NOT NULL DEFAULT 'SCHEDULED_BULK',
    "payout_threshold" BIGINT NOT NULL DEFAULT 250000,
    "bank_code" TEXT,
    "account_number" TEXT,
    "account_name" TEXT,
    "bvn_verified" BOOLEAN NOT NULL DEFAULT false,
    "identity_verified_at" TIMESTAMP(3),
    "available_balance" INTEGER NOT NULL DEFAULT 0,
    "total_earned" INTEGER NOT NULL DEFAULT 0,
    "current_balance" BIGINT NOT NULL DEFAULT 0,
    "subscriber_count" INTEGER NOT NULL DEFAULT 0,
    "content_count" INTEGER NOT NULL DEFAULT 0,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "is_banned" BOOLEAN NOT NULL DEFAULT false,
    "banned_at" TIMESTAMP(3),
    "ban_reason" TEXT,
    "journal_bio" TEXT,
    "content_guidelines_accepted" BOOLEAN NOT NULL DEFAULT false,
    "content_guidelines_accepted_at" TIMESTAMP(3),
    "has_seen_welcome" BOOLEAN NOT NULL DEFAULT false,
    "has_completed_onboarding" BOOLEAN NOT NULL DEFAULT false,
    "has_completed_tour" BOOLEAN NOT NULL DEFAULT false,
    "subscription_enabled" BOOLEAN NOT NULL DEFAULT false,
    "monthly_price" INTEGER NOT NULL DEFAULT 0,
    "subscription_perks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "bank_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "creators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entries" (
    "id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "cover_image" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "read_time" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(3),
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creator_plans" (
    "id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "features" JSONB NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "creator_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fan_subscriptions" (
    "id" TEXT NOT NULL,
    "fan_id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "plan_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "current_period_start" TIMESTAMP(3),
    "current_period_end" TIMESTAMP(3),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "paystack_subscription_id" TEXT,
    "paystack_authorization_code" TEXT,
    "last_payment_date" TIMESTAMP(3),
    "next_payment_date" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fan_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content" (
    "id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "upload_id" TEXT,
    "mux_asset_id" TEXT,
    "mux_playback_id" TEXT,
    "duration_seconds" INTEGER,
    "file_size_bytes" BIGINT,
    "access_type" TEXT NOT NULL DEFAULT 'subscription',
    "required_plan_id" TEXT,
    "content_category" TEXT NOT NULL DEFAULT 'content',
    "tutorial_price" INTEGER,
    "collection_id" TEXT,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(3),
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "flagged_for_review" BOOLEAN NOT NULL DEFAULT false,
    "flagged_reason" TEXT,
    "flagged_at" TIMESTAMP(3),
    "moderation_status" TEXT NOT NULL DEFAULT 'pending',
    "moderation_score" DOUBLE PRECISION,
    "content_guidelines_accepted" BOOLEAN NOT NULL DEFAULT false,
    "is_standalone" BOOLEAN NOT NULL DEFAULT false,
    "section_id" TEXT,
    "section_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_reports" (
    "id" TEXT NOT NULL,
    "content_id" TEXT,
    "reporter_email" TEXT,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by" TEXT,

    CONSTRAINT "content_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collections" (
    "id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "thumbnail_url" TEXT,
    "access_type" TEXT NOT NULL DEFAULT 'subscription',
    "required_plan_id" TEXT,
    "price" INTEGER,
    "subscription_price" INTEGER,
    "subscription_type" TEXT DEFAULT 'one_time',
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "enrolled_count" INTEGER NOT NULL DEFAULT 0,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(3),
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sections" (
    "id" TEXT NOT NULL,
    "collection_id" TEXT NOT NULL,
    "parent_section_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "section_contents" (
    "id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "content_id" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "section_contents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "user_id" TEXT,
    "creator_id" TEXT,
    "amount" BIGINT NOT NULL,
    "creator_earnings" BIGINT,
    "platform_fee" BIGINT,
    "fee_amount" BIGINT NOT NULL DEFAULT 0,
    "net_amount" BIGINT NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "payment_method" TEXT,
    "payment_type" "PaymentMethod",
    "gateway" TEXT NOT NULL DEFAULT 'paystack',
    "gateway_response" JSONB NOT NULL DEFAULT '{}',
    "funds_released" BOOLEAN NOT NULL DEFAULT false,
    "funds_released_at" TIMESTAMP(3),
    "holding_days" INTEGER NOT NULL DEFAULT 0,
    "type" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payouts" (
    "id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paystack_transfer_code" TEXT,
    "paystack_reference" TEXT,
    "reason" TEXT,
    "failure_reason" TEXT,
    "scheduled_for" TIMESTAMP(3),
    "transaction_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "is_manual" BOOLEAN NOT NULL DEFAULT false,
    "manual_note" TEXT,
    "manual_paid_at" TIMESTAMP(3),
    "manual_paid_by" TEXT,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_accounts" (
    "id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "bank_code" TEXT NOT NULL,
    "bank_name" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "account_name" TEXT NOT NULL,
    "recipient_code" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "bvn_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payout_schedules" (
    "id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "next_payout_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payout_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_subscriptions" (
    "id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "current_period_start" TIMESTAMP(3),
    "current_period_end" TIMESTAMP(3),
    "trial_ends_at" TIMESTAMP(3),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "paystack_subscription_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creator_links" (
    "id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "link_type" TEXT NOT NULL DEFAULT 'custom',
    "icon" TEXT,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "creator_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_list_items" (
    "id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "service_type" TEXT NOT NULL DEFAULT 'general',
    "category" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "session_description" TEXT,
    "calendly_link" TEXT,
    "price" INTEGER NOT NULL,
    "duration_minutes" INTEGER,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "category_order_index" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_list_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "weight" DOUBLE PRECISION,
    "type" TEXT NOT NULL DEFAULT 'physical',
    "image_url" TEXT,
    "digital_file_url" TEXT,
    "stock" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "options" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_tiers" (
    "id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "flat_rate" INTEGER NOT NULL,
    "estimated_days" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "fan_id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "delivery_tier_id" TEXT,
    "delivery_address" JSONB NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "delivery_fee" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paystack_reference" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "variant_selected" JSONB,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creator_availability" (
    "id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "max_bookings" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "creator_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "price_list_item_id" TEXT NOT NULL,
    "customer_email" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "customer_phone" TEXT NOT NULL,
    "customer_address" TEXT NOT NULL,
    "booking_date" DATE NOT NULL,
    "notes" TEXT,
    "total_amount" INTEGER NOT NULL,
    "first_payout_amount" INTEGER NOT NULL,
    "second_payout_amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "payment_reference" TEXT,
    "tracking_token" TEXT NOT NULL,
    "first_payout_transaction_id" TEXT,
    "second_payout_transaction_id" TEXT,
    "dispute_reason" TEXT,
    "dispute_status" TEXT,
    "refund_transaction_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_subscriptions" (
    "id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "unsubscribe_token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "premium_access_codes" (
    "id" TEXT NOT NULL,
    "content_id" TEXT,
    "collection_id" TEXT,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "premium_access_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_subscriptions" (
    "id" TEXT NOT NULL,
    "collection_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subscription_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "payment_reference" TEXT,
    "transaction_id" TEXT,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collection_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tutorial_purchases" (
    "id" TEXT NOT NULL,
    "content_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "payment_reference" TEXT,
    "transaction_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tutorial_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uploads" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" BIGINT NOT NULL,
    "status" "UploadStatus" NOT NULL DEFAULT 'PENDING',
    "mux_upload_id" TEXT,
    "mux_asset_id" TEXT,
    "mux_playback_id" TEXT,
    "url" TEXT,
    "error" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),

    CONSTRAINT "uploads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_records" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "UsageType" NOT NULL,
    "provider" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waitlist_entries" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fan_otp_codes" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fan_otp_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nudge_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "nudge_type" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nudge_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milestone_logs" (
    "id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "milestone" TEXT NOT NULL,
    "achieved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seen_at" TIMESTAMP(3),

    CONSTRAINT "milestone_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "creators_user_id_key" ON "creators"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "creators_username_key" ON "creators"("username");

-- CreateIndex
CREATE INDEX "creators_user_id_idx" ON "creators"("user_id");

-- CreateIndex
CREATE INDEX "creators_username_idx" ON "creators"("username");

-- CreateIndex
CREATE INDEX "journal_entries_creator_id_idx" ON "journal_entries"("creator_id");

-- CreateIndex
CREATE INDEX "journal_entries_is_published_idx" ON "journal_entries"("is_published");

-- CreateIndex
CREATE INDEX "journal_entries_published_at_idx" ON "journal_entries"("published_at");

-- CreateIndex
CREATE UNIQUE INDEX "journal_entries_creator_id_slug_key" ON "journal_entries"("creator_id", "slug");

-- CreateIndex
CREATE INDEX "creator_plans_creator_id_idx" ON "creator_plans"("creator_id");

-- CreateIndex
CREATE INDEX "fan_subscriptions_fan_id_idx" ON "fan_subscriptions"("fan_id");

-- CreateIndex
CREATE INDEX "fan_subscriptions_creator_id_idx" ON "fan_subscriptions"("creator_id");

-- CreateIndex
CREATE UNIQUE INDEX "unique_fan_creator_active" ON "fan_subscriptions"("fan_id", "creator_id");

-- CreateIndex
CREATE UNIQUE INDEX "content_upload_id_key" ON "content"("upload_id");

-- CreateIndex
CREATE INDEX "content_creator_id_idx" ON "content"("creator_id");

-- CreateIndex
CREATE INDEX "content_is_published_idx" ON "content"("is_published");

-- CreateIndex
CREATE INDEX "content_content_category_idx" ON "content"("content_category");

-- CreateIndex
CREATE INDEX "content_collection_id_idx" ON "content"("collection_id");

-- CreateIndex
CREATE INDEX "content_reports_content_id_idx" ON "content_reports"("content_id");

-- CreateIndex
CREATE INDEX "content_reports_status_idx" ON "content_reports"("status");

-- CreateIndex
CREATE INDEX "content_reports_reason_idx" ON "content_reports"("reason");

-- CreateIndex
CREATE INDEX "collections_creator_id_idx" ON "collections"("creator_id");

-- CreateIndex
CREATE INDEX "collections_is_published_idx" ON "collections"("is_published");

-- CreateIndex
CREATE INDEX "sections_collection_id_idx" ON "sections"("collection_id");

-- CreateIndex
CREATE INDEX "sections_parent_section_id_idx" ON "sections"("parent_section_id");

-- CreateIndex
CREATE INDEX "section_contents_section_id_idx" ON "section_contents"("section_id");

-- CreateIndex
CREATE INDEX "section_contents_content_id_idx" ON "section_contents"("content_id");

-- CreateIndex
CREATE UNIQUE INDEX "section_contents_section_id_content_id_key" ON "section_contents"("section_id", "content_id");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_reference_key" ON "transactions"("reference");

-- CreateIndex
CREATE INDEX "transactions_reference_idx" ON "transactions"("reference");

-- CreateIndex
CREATE INDEX "transactions_user_id_idx" ON "transactions"("user_id");

-- CreateIndex
CREATE INDEX "transactions_creator_id_idx" ON "transactions"("creator_id");

-- CreateIndex
CREATE UNIQUE INDEX "payouts_paystack_reference_key" ON "payouts"("paystack_reference");

-- CreateIndex
CREATE INDEX "payouts_creator_id_idx" ON "payouts"("creator_id");

-- CreateIndex
CREATE UNIQUE INDEX "bank_accounts_creator_id_key" ON "bank_accounts"("creator_id");

-- CreateIndex
CREATE UNIQUE INDEX "payout_schedules_creator_id_key" ON "payout_schedules"("creator_id");

-- CreateIndex
CREATE UNIQUE INDEX "platform_subscriptions_creator_id_key" ON "platform_subscriptions"("creator_id");

-- CreateIndex
CREATE INDEX "platform_subscriptions_creator_id_idx" ON "platform_subscriptions"("creator_id");

-- CreateIndex
CREATE INDEX "creator_links_creator_id_idx" ON "creator_links"("creator_id");

-- CreateIndex
CREATE INDEX "creator_links_order_index_idx" ON "creator_links"("order_index");

-- CreateIndex
CREATE INDEX "price_list_items_creator_id_idx" ON "price_list_items"("creator_id");

-- CreateIndex
CREATE INDEX "price_list_items_category_idx" ON "price_list_items"("category");

-- CreateIndex
CREATE INDEX "price_list_items_order_index_idx" ON "price_list_items"("order_index");

-- CreateIndex
CREATE INDEX "price_list_items_is_active_idx" ON "price_list_items"("is_active");

-- CreateIndex
CREATE INDEX "products_creator_id_idx" ON "products"("creator_id");

-- CreateIndex
CREATE INDEX "products_status_idx" ON "products"("status");

-- CreateIndex
CREATE INDEX "product_variants_product_id_idx" ON "product_variants"("product_id");

-- CreateIndex
CREATE INDEX "delivery_tiers_creator_id_idx" ON "delivery_tiers"("creator_id");

-- CreateIndex
CREATE INDEX "orders_fan_id_idx" ON "orders"("fan_id");

-- CreateIndex
CREATE INDEX "orders_creator_id_idx" ON "orders"("creator_id");

-- CreateIndex
CREATE INDEX "orders_delivery_tier_id_idx" ON "orders"("delivery_tier_id");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "order_items_product_id_idx" ON "order_items"("product_id");

-- CreateIndex
CREATE INDEX "creator_availability_creator_id_idx" ON "creator_availability"("creator_id");

-- CreateIndex
CREATE INDEX "creator_availability_date_idx" ON "creator_availability"("date");

-- CreateIndex
CREATE UNIQUE INDEX "creator_availability_creator_id_date_key" ON "creator_availability"("creator_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_tracking_token_key" ON "bookings"("tracking_token");

-- CreateIndex
CREATE INDEX "bookings_creator_id_idx" ON "bookings"("creator_id");

-- CreateIndex
CREATE INDEX "bookings_customer_email_idx" ON "bookings"("customer_email");

-- CreateIndex
CREATE INDEX "bookings_booking_date_idx" ON "bookings"("booking_date");

-- CreateIndex
CREATE INDEX "bookings_status_idx" ON "bookings"("status");

-- CreateIndex
CREATE UNIQUE INDEX "email_subscriptions_unsubscribe_token_key" ON "email_subscriptions"("unsubscribe_token");

-- CreateIndex
CREATE INDEX "email_subscriptions_creator_id_idx" ON "email_subscriptions"("creator_id");

-- CreateIndex
CREATE INDEX "email_subscriptions_email_idx" ON "email_subscriptions"("email");

-- CreateIndex
CREATE UNIQUE INDEX "email_subscriptions_creator_id_email_key" ON "email_subscriptions"("creator_id", "email");

-- CreateIndex
CREATE INDEX "premium_access_codes_content_id_idx" ON "premium_access_codes"("content_id");

-- CreateIndex
CREATE INDEX "premium_access_codes_collection_id_idx" ON "premium_access_codes"("collection_id");

-- CreateIndex
CREATE INDEX "premium_access_codes_email_idx" ON "premium_access_codes"("email");

-- CreateIndex
CREATE INDEX "premium_access_codes_expires_at_idx" ON "premium_access_codes"("expires_at");

-- CreateIndex
CREATE INDEX "collection_subscriptions_collection_id_idx" ON "collection_subscriptions"("collection_id");

-- CreateIndex
CREATE INDEX "collection_subscriptions_email_idx" ON "collection_subscriptions"("email");

-- CreateIndex
CREATE INDEX "collection_subscriptions_status_idx" ON "collection_subscriptions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "collection_subscriptions_collection_id_email_key" ON "collection_subscriptions"("collection_id", "email");

-- CreateIndex
CREATE INDEX "tutorial_purchases_content_id_idx" ON "tutorial_purchases"("content_id");

-- CreateIndex
CREATE INDEX "tutorial_purchases_email_idx" ON "tutorial_purchases"("email");

-- CreateIndex
CREATE UNIQUE INDEX "tutorial_purchases_content_id_email_key" ON "tutorial_purchases"("content_id", "email");

-- CreateIndex
CREATE INDEX "uploads_user_id_status_idx" ON "uploads"("user_id", "status");

-- CreateIndex
CREATE INDEX "uploads_creator_id_idx" ON "uploads"("creator_id");

-- CreateIndex
CREATE INDEX "uploads_status_created_at_idx" ON "uploads"("status", "created_at");

-- CreateIndex
CREATE INDEX "usage_records_user_id_type_created_at_idx" ON "usage_records"("user_id", "type", "created_at");

-- CreateIndex
CREATE INDEX "usage_records_created_at_idx" ON "usage_records"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_entries_email_key" ON "waitlist_entries"("email");

-- CreateIndex
CREATE INDEX "fan_otp_codes_email_code_used_idx" ON "fan_otp_codes"("email", "code", "used");

-- CreateIndex
CREATE INDEX "fan_otp_codes_expires_at_idx" ON "fan_otp_codes"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "nudge_logs_user_id_nudge_type_key" ON "nudge_logs"("user_id", "nudge_type");

-- CreateIndex
CREATE UNIQUE INDEX "milestone_logs_creator_id_milestone_key" ON "milestone_logs"("creator_id", "milestone");

-- AddForeignKey
ALTER TABLE "creators" ADD CONSTRAINT "creators_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creators" ADD CONSTRAINT "creators_intro_video_id_fkey" FOREIGN KEY ("intro_video_id") REFERENCES "content"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_plans" ADD CONSTRAINT "creator_plans_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fan_subscriptions" ADD CONSTRAINT "fan_subscriptions_fan_id_fkey" FOREIGN KEY ("fan_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fan_subscriptions" ADD CONSTRAINT "fan_subscriptions_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fan_subscriptions" ADD CONSTRAINT "fan_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "creator_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content" ADD CONSTRAINT "content_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content" ADD CONSTRAINT "content_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content" ADD CONSTRAINT "content_upload_id_fkey" FOREIGN KEY ("upload_id") REFERENCES "uploads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collections" ADD CONSTRAINT "collections_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sections" ADD CONSTRAINT "sections_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sections" ADD CONSTRAINT "sections_parent_section_id_fkey" FOREIGN KEY ("parent_section_id") REFERENCES "sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "section_contents" ADD CONSTRAINT "section_contents_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "section_contents" ADD CONSTRAINT "section_contents_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creators"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_schedules" ADD CONSTRAINT "payout_schedules_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_subscriptions" ADD CONSTRAINT "platform_subscriptions_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_links" ADD CONSTRAINT "creator_links_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_list_items" ADD CONSTRAINT "price_list_items_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_tiers" ADD CONSTRAINT "delivery_tiers_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_delivery_tier_id_fkey" FOREIGN KEY ("delivery_tier_id") REFERENCES "delivery_tiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_availability" ADD CONSTRAINT "creator_availability_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_price_list_item_id_fkey" FOREIGN KEY ("price_list_item_id") REFERENCES "price_list_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_subscriptions" ADD CONSTRAINT "email_subscriptions_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "premium_access_codes" ADD CONSTRAINT "premium_access_codes_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "premium_access_codes" ADD CONSTRAINT "premium_access_codes_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_subscriptions" ADD CONSTRAINT "collection_subscriptions_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutorial_purchases" ADD CONSTRAINT "tutorial_purchases_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nudge_logs" ADD CONSTRAINT "nudge_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestone_logs" ADD CONSTRAINT "milestone_logs_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

