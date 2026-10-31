CREATE TABLE "translations" (
	"source_key" text NOT NULL,
	"locale" text NOT NULL,
	"text" text NOT NULL,
	"source_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "translations_source_key_locale_pk" PRIMARY KEY("source_key","locale")
);
