-- Create teams and team_members for first-class team aggregation.

CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "team_members" (
    "team_id" TEXT NOT NULL,
    "host_id" TEXT NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("team_id","host_id")
);

CREATE UNIQUE INDEX "teams_user_id_name_key" ON "teams"("user_id", "name");
CREATE UNIQUE INDEX "teams_user_id_slug_key" ON "teams"("user_id", "slug");
CREATE INDEX "teams_user_id_slug_idx" ON "teams"("user_id", "slug");
CREATE INDEX "team_members_host_id_idx" ON "team_members"("host_id");

ALTER TABLE "teams"
  ADD CONSTRAINT "teams_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "team_members"
  ADD CONSTRAINT "team_members_team_id_fkey"
  FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "team_members"
  ADD CONSTRAINT "team_members_host_id_fkey"
  FOREIGN KEY ("host_id") REFERENCES "hosts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
