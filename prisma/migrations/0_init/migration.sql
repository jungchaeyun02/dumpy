-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerUserId" TEXT NOT NULL,
    "agreedAt" TIMESTAMP(3) NOT NULL,
    "ageConfirmedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memos" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "classifiedBy" TEXT NOT NULL,
    "autoCategory" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hasDeadline" BOOLEAN NOT NULL DEFAULT false,
    "isDone" BOOLEAN NOT NULL DEFAULT false,
    "doneAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "memos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_provider_providerUserId_key" ON "users"("provider", "providerUserId");

-- CreateIndex
CREATE INDEX "memos_userId_idx" ON "memos"("userId");

-- CreateIndex
CREATE INDEX "memos_userId_category_idx" ON "memos"("userId", "category");

-- CreateIndex
CREATE INDEX "memos_userId_deletedAt_idx" ON "memos"("userId", "deletedAt");

-- AddForeignKey
ALTER TABLE "memos" ADD CONSTRAINT "memos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

