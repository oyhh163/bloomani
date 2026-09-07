CREATE TABLE "episodes" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"project_id" text NOT NULL,
	"screenplay_id" text,
	"index" integer NOT NULL,
	"title" text NOT NULL,
	"synopsis" text NOT NULL,
	"duration_sec" integer DEFAULT 60 NOT NULL,
	"beats" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"scenes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"shots" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"hook_shots" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "episodes" ADD CONSTRAINT "episodes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "episodes" ADD CONSTRAINT "episodes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;