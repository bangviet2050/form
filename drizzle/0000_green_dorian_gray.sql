CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"userid" text NOT NULL,
	"ticketid" text NOT NULL,
	"customername" text NOT NULL,
	"phone" text NOT NULL,
	"receiveddate" timestamp NOT NULL,
	"devicetype" text NOT NULL,
	"devicemodel" text,
	"accessories" text,
	"conditionbefore" text,
	"conditionafter" text,
	"repaircost" numeric(10, 2),
	"notes" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"returneddate" timestamp,
	"createdat" timestamp DEFAULT now() NOT NULL,
	"updatedat" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "customers_ticketid_unique" UNIQUE("ticketid")
);
--> statement-breakpoint
CREATE TABLE "predefined_options" (
	"id" serial PRIMARY KEY NOT NULL,
	"userid" text NOT NULL,
	"category" text NOT NULL,
	"value" text NOT NULL,
	"createdat" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"userid" text NOT NULL,
	"token" text NOT NULL,
	"expiresat" timestamp NOT NULL,
	"createdat" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"createdat" timestamp DEFAULT now() NOT NULL,
	"updatedat" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userid_user_id_fk" FOREIGN KEY ("userid") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;