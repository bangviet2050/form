CREATE TABLE "activity_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"userid" text,
	"username" text,
	"action" text NOT NULL,
	"target" text,
	"details" text,
	"createdat" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customers" ALTER COLUMN "userid" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "receivedby" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "repairedby" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "statushistory" text;--> statement-breakpoint
ALTER TABLE "predefined_options" ADD COLUMN "parentvalue" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "role" text DEFAULT 'staff' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "canaddoptions" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "permissions" text;--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_userid_user_id_fk" FOREIGN KEY ("userid") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_log_createdAt_idx" ON "activity_log" USING btree ("createdat");--> statement-breakpoint
CREATE INDEX "activity_log_action_idx" ON "activity_log" USING btree ("action");--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_userid_user_id_fk" FOREIGN KEY ("userid") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predefined_options" ADD CONSTRAINT "predefined_options_userid_user_id_fk" FOREIGN KEY ("userid") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customers_userId_idx" ON "customers" USING btree ("userid");--> statement-breakpoint
CREATE INDEX "customers_status_idx" ON "customers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "customers_createdAt_idx" ON "customers" USING btree ("createdat");