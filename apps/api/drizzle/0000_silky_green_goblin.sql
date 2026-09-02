CREATE TABLE "character_sheets" (
	"id" text PRIMARY KEY NOT NULL,
	"character_id" text NOT NULL,
	"view" text NOT NULL,
	"expression" text,
	"url" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "characters" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"bio" text,
	"personality" text,
	"library_scoped" boolean DEFAULT true NOT NULL,
	"project_id" text,
	"style_id" text,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"visual_lock" jsonb NOT NULL,
	"identity_memory" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "screenplays" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"project_id" text,
	"logline" text NOT NULL,
	"synopsis" text NOT NULL,
	"target_duration_sec" integer DEFAULT 45 NOT NULL,
	"beats" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"scenes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"shots" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"raw_script" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "story_drafts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"source" text DEFAULT 'write' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "character_sheets" ADD CONSTRAINT "character_sheets_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "screenplays" ADD CONSTRAINT "screenplays_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_drafts" ADD CONSTRAINT "story_drafts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;