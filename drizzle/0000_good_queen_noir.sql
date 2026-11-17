CREATE TYPE "public"."intensity_index" AS ENUM('very low', 'low', 'moderate', 'high', 'very high');--> statement-breakpoint
CREATE TYPE "public"."region_kind" AS ENUM('dno', 'nation', 'gb');--> statement-breakpoint
CREATE TABLE "national_intensity" (
	"period_from" timestamp with time zone PRIMARY KEY NOT NULL,
	"forecast" smallint NOT NULL,
	"actual" smallint,
	"index" "intensity_index" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "readings" (
	"region_id" smallint NOT NULL,
	"period_from" timestamp with time zone NOT NULL,
	"forecast" smallint NOT NULL,
	"index" "intensity_index" NOT NULL,
	"biomass" numeric(4, 1) NOT NULL,
	"coal" numeric(4, 1) NOT NULL,
	"imports" numeric(4, 1) NOT NULL,
	"gas" numeric(4, 1) NOT NULL,
	"nuclear" numeric(4, 1) NOT NULL,
	"other" numeric(4, 1) NOT NULL,
	"hydro" numeric(4, 1) NOT NULL,
	"solar" numeric(4, 1) NOT NULL,
	"wind" numeric(4, 1) NOT NULL,
	CONSTRAINT "readings_region_id_period_from_pk" PRIMARY KEY("region_id","period_from")
);
--> statement-breakpoint
CREATE TABLE "regions" (
	"id" smallint PRIMARY KEY NOT NULL,
	"short_name" text NOT NULL,
	"dno_name" text NOT NULL,
	"kind" "region_kind" NOT NULL
);
--> statement-breakpoint
ALTER TABLE "readings" ADD CONSTRAINT "readings_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "readings_period_from_region_id_idx" ON "readings" USING btree ("period_from","region_id");