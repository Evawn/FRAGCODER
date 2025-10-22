-- CreateEnum
CREATE TYPE "public"."CompilationStatus" AS ENUM ('SUCCESS', 'ERROR', 'WARNING', 'PENDING');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "googleId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Shader" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "tabs" TEXT NOT NULL,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "compilationStatus" "public"."CompilationStatus" NOT NULL DEFAULT 'PENDING',
    "compilationErrors" TEXT,
    "thumbnail" TEXT,
    "userId" TEXT NOT NULL,
    "forkedFrom" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSavedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Shader_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "public"."User"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "public"."User"("username");

-- CreateIndex
CREATE INDEX "User_googleId_idx" ON "public"."User"("googleId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Shader_slug_key" ON "public"."Shader"("slug");

-- CreateIndex
CREATE INDEX "Shader_userId_idx" ON "public"."Shader"("userId");

-- CreateIndex
CREATE INDEX "Shader_isPublic_idx" ON "public"."Shader"("isPublic");

-- CreateIndex
CREATE INDEX "Shader_slug_idx" ON "public"."Shader"("slug");

-- AddForeignKey
ALTER TABLE "public"."Shader" ADD CONSTRAINT "Shader_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
