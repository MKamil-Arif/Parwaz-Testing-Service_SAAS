-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(256) NOT NULL,
    "fullName" VARCHAR(150) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "passwordHash" VARCHAR(100) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "emailVerifiedAt" TIMESTAMP(3),
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "referralCode" VARCHAR(16) NOT NULL,
    "signupCampaignId" INTEGER,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" VARCHAR(255),

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "userId" INTEGER NOT NULL,
    "roleId" INTEGER NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "tokenHash" VARCHAR(64) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" VARCHAR(64),
    "userAgent" VARCHAR(400),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthToken" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" VARCHAR(30) NOT NULL,
    "tokenHash" VARCHAR(64) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentProfile" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "district" VARCHAR(100) NOT NULL,
    "institution" VARCHAR(200) NOT NULL,
    "classLevel" VARCHAR(20) NOT NULL,
    "dateOfBirth" DATE NOT NULL,
    "guardianName" VARCHAR(150),
    "guardianPhone" VARCHAR(20),
    "guardianRelation" VARCHAR(50),
    "guardianConsentAt" TIMESTAMP(3),
    "guardianConsentVerified" BOOLEAN NOT NULL DEFAULT false,
    "leaderboardNameMode" VARCHAR(20) NOT NULL DEFAULT 'INITIALS',
    "mediaConsent" BOOLEAN NOT NULL DEFAULT false,
    "termsAcceptedAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Competition" (
    "id" SERIAL NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "summary" VARCHAR(500) NOT NULL,
    "description" TEXT NOT NULL,
    "subjects" VARCHAR(300) NOT NULL,
    "eligibilityText" TEXT NOT NULL,
    "rules" TEXT NOT NULL,
    "tieBreakPolicy" TEXT NOT NULL,
    "eligibleProvince" VARCHAR(50),
    "minAge" INTEGER,
    "maxAge" INTEGER,
    "registrationFee" DECIMAL(12,2) NOT NULL,
    "targetRegistrations" INTEGER,
    "maxRegistrations" INTEGER,
    "registrationOpensAt" TIMESTAMP(3) NOT NULL,
    "registrationClosesAt" TIMESTAMP(3) NOT NULL,
    "examStartsAt" TIMESTAMP(3) NOT NULL,
    "examEndsAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "questionCount" INTEGER NOT NULL,
    "marksPerQuestion" DOUBLE PRECISION,
    "totalMarks" DOUBLE PRECISION NOT NULL,
    "negativeMarking" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 1,
    "randomizeQuestions" BOOLEAN NOT NULL DEFAULT true,
    "randomizeOptions" BOOLEAN NOT NULL DEFAULT true,
    "showInstantResults" BOOLEAN NOT NULL DEFAULT false,
    "status" VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    "resultsStatus" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "meritGeneratedAt" TIMESTAMP(3),
    "resultsApprovedAt" TIMESTAMP(3),
    "resultsApprovedById" INTEGER,
    "resultsPublishedAt" TIMESTAMP(3),
    "resultsPublishedById" INTEGER,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Competition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitionEligibleClass" (
    "competitionId" INTEGER NOT NULL,
    "classLevel" VARCHAR(20) NOT NULL,

    CONSTRAINT "CompetitionEligibleClass_pkey" PRIMARY KEY ("competitionId","classLevel")
);

-- CreateTable
CREATE TABLE "Prize" (
    "id" SERIAL NOT NULL,
    "competitionId" INTEGER NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "category" VARCHAR(30) NOT NULL,
    "description" VARCHAR(1000),
    "rankFrom" INTEGER NOT NULL,
    "rankTo" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "estimatedUnitValue" DECIMAL(12,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prize_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitionRegistration" (
    "id" SERIAL NOT NULL,
    "registrationNumber" VARCHAR(30) NOT NULL,
    "userId" INTEGER NOT NULL,
    "competitionId" INTEGER NOT NULL,
    "status" VARCHAR(30) NOT NULL,
    "eligibilityConfirmedAt" TIMESTAMP(3) NOT NULL,
    "rulesAcceptedAt" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetitionRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" SERIAL NOT NULL,
    "reference" VARCHAR(40) NOT NULL,
    "registrationId" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'PKR',
    "method" VARCHAR(30) NOT NULL,
    "status" VARCHAR(30) NOT NULL,
    "isSandbox" BOOLEAN NOT NULL DEFAULT false,
    "gatewayTransactionId" VARCHAR(100),
    "payerReference" VARCHAR(100),
    "payerAccount" VARCHAR(100),
    "payerNote" VARCHAR(500),
    "failureReason" VARCHAR(500),
    "paidAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" INTEGER,
    "refundStatus" VARCHAR(30),
    "refundAmount" DECIMAL(12,2),
    "refundReason" VARCHAR(500),
    "refundedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentEvent" (
    "id" SERIAL NOT NULL,
    "paymentId" INTEGER,
    "provider" VARCHAR(30) NOT NULL,
    "eventType" VARCHAR(50) NOT NULL,
    "payload" TEXT NOT NULL,
    "signatureValid" BOOLEAN NOT NULL,
    "outcome" VARCHAR(200) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionCategory" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),

    CONSTRAINT "QuestionCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" SERIAL NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "type" VARCHAR(20) NOT NULL DEFAULT 'MCQ',
    "text" TEXT NOT NULL,
    "explanation" TEXT,
    "difficulty" VARCHAR(10) NOT NULL DEFAULT 'MEDIUM',
    "marks" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnswerOption" (
    "id" SERIAL NOT NULL,
    "questionId" INTEGER NOT NULL,
    "text" VARCHAR(1000) NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "AnswerOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitionQuestion" (
    "competitionId" INTEGER NOT NULL,
    "questionId" INTEGER NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompetitionQuestion_pkey" PRIMARY KEY ("competitionId","questionId")
);

-- CreateTable
CREATE TABLE "ExamAttempt" (
    "id" SERIAL NOT NULL,
    "publicId" VARCHAR(32) NOT NULL,
    "registrationId" INTEGER NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "submissionType" VARCHAR(20),
    "identityConfirmedAt" TIMESTAMP(3) NOT NULL,
    "sessionId" INTEGER,
    "ipAddress" VARCHAR(64),
    "userAgent" VARCHAR(400),
    "lastSavedAt" TIMESTAMP(3),
    "flagCount" INTEGER NOT NULL DEFAULT 0,
    "voidReason" VARCHAR(500),

    CONSTRAINT "ExamAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentAnswer" (
    "id" SERIAL NOT NULL,
    "attemptId" INTEGER NOT NULL,
    "questionId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "optionOrder" VARCHAR(200) NOT NULL,
    "selectedOptionId" INTEGER,
    "textAnswer" TEXT,
    "markedForReview" BOOLEAN NOT NULL DEFAULT false,
    "answeredAt" TIMESTAMP(3),
    "isCorrect" BOOLEAN,
    "marksAwarded" DOUBLE PRECISION,
    "reviewedById" INTEGER,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" VARCHAR(500),

    CONSTRAINT "StudentAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamActivityLog" (
    "id" SERIAL NOT NULL,
    "attemptId" INTEGER NOT NULL,
    "eventType" VARCHAR(40) NOT NULL,
    "details" VARCHAR(500),
    "ipAddress" VARCHAR(64),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamResult" (
    "id" SERIAL NOT NULL,
    "attemptId" INTEGER NOT NULL,
    "totalQuestions" INTEGER NOT NULL,
    "correctCount" INTEGER NOT NULL,
    "incorrectCount" INTEGER NOT NULL,
    "unansweredCount" INTEGER NOT NULL,
    "pendingReviewCount" INTEGER NOT NULL DEFAULT 0,
    "score" DOUBLE PRECISION NOT NULL,
    "maxScore" DOUBLE PRECISION NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "timeTakenSeconds" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "meritRank" INTEGER,
    "verifiedById" INTEGER,
    "verifiedAt" TIMESTAMP(3),
    "notes" VARCHAR(1000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResultChangeLog" (
    "id" SERIAL NOT NULL,
    "resultId" INTEGER NOT NULL,
    "changedById" INTEGER,
    "field" VARCHAR(50) NOT NULL,
    "oldValue" VARCHAR(200),
    "newValue" VARCHAR(200),
    "reason" VARCHAR(1000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResultChangeLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrizeAllocation" (
    "id" SERIAL NOT NULL,
    "prizeId" INTEGER NOT NULL,
    "resultId" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL,
    "status" VARCHAR(30) NOT NULL,
    "verificationNotes" VARCHAR(1000),
    "verifiedById" INTEGER,
    "verifiedAt" TIMESTAMP(3),
    "publicApproved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrizeAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrizeDistribution" (
    "id" SERIAL NOT NULL,
    "allocationId" INTEGER NOT NULL,
    "status" VARCHAR(30) NOT NULL,
    "method" VARCHAR(30) NOT NULL,
    "ceremonyId" INTEGER,
    "scheduledDate" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "deliveryAddress" VARCHAR(500),
    "trackingReference" VARCHAR(100),
    "deviceSerialNumber" VARCHAR(100),
    "receivedBy" VARCHAR(150),
    "notes" VARCHAR(1000),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrizeDistribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AwardCeremony" (
    "id" SERIAL NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "venue" VARCHAR(300) NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    "competitionId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AwardCeremony_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CeremonyMedia" (
    "id" SERIAL NOT NULL,
    "ceremonyId" INTEGER NOT NULL,
    "type" VARCHAR(10) NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "caption" VARCHAR(300),
    "consentConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CeremonyMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaFile" (
    "id" SERIAL NOT NULL,
    "publicId" VARCHAR(32) NOT NULL,
    "contentType" VARCHAR(50) NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" VARCHAR(40) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "body" VARCHAR(2000) NOT NULL,
    "link" VARCHAR(300),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationBroadcast" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "body" VARCHAR(2000) NOT NULL,
    "link" VARCHAR(300),
    "audience" VARCHAR(40) NOT NULL,
    "competitionId" INTEGER,
    "channels" VARCHAR(50) NOT NULL,
    "recipientCount" INTEGER NOT NULL,
    "sentById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationBroadcast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailOutbox" (
    "id" SERIAL NOT NULL,
    "toEmail" VARCHAR(256) NOT NULL,
    "subject" VARCHAR(300) NOT NULL,
    "body" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "error" VARCHAR(1000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "EmailOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" SERIAL NOT NULL,
    "ticketNumber" VARCHAR(30) NOT NULL,
    "userId" INTEGER,
    "name" VARCHAR(150) NOT NULL,
    "email" VARCHAR(256) NOT NULL,
    "phone" VARCHAR(20),
    "subject" VARCHAR(200) NOT NULL,
    "category" VARCHAR(30) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    "priority" VARCHAR(10) NOT NULL DEFAULT 'NORMAL',
    "competitionId" INTEGER,
    "resultId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportMessage" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "authorId" INTEGER,
    "isStaff" BOOLEAN NOT NULL DEFAULT false,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingCampaign" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "channel" VARCHAR(30) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PLANNED',
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "budget" DECIMAL(12,2),
    "notes" VARCHAR(2000),
    "visitCount" INTEGER NOT NULL DEFAULT 0,
    "landingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "landingHeadline" VARCHAR(200),
    "landingBody" TEXT,
    "landingCompetitionId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" SERIAL NOT NULL,
    "referrerId" INTEGER NOT NULL,
    "referredUserId" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "convertedAt" TIMESTAMP(3),

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterSubscriber" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(256) NOT NULL,
    "source" VARCHAR(80),
    "status" VARCHAR(20) NOT NULL DEFAULT 'SUBSCRIBED',
    "unsubscribeToken" VARCHAR(64) NOT NULL,
    "consentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" SERIAL NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "body" TEXT NOT NULL,
    "linkUrl" VARCHAR(300),
    "linkLabel" VARCHAR(60),
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "competitionId" INTEGER,
    "ceremonyId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessExpense" (
    "id" SERIAL NOT NULL,
    "category" VARCHAR(30) NOT NULL,
    "description" VARCHAR(300) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "expenseDate" DATE NOT NULL,
    "vendor" VARCHAR(150),
    "receiptReference" VARCHAR(100),
    "quantity" INTEGER,
    "prizeId" INTEGER,
    "campaignId" INTEGER,
    "competitionId" INTEGER,
    "recordedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialProjection" (
    "id" SERIAL NOT NULL,
    "competitionId" INTEGER,
    "type" VARCHAR(10) NOT NULL,
    "category" VARCHAR(30) NOT NULL,
    "label" VARCHAR(150) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "notes" VARCHAR(500),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialProjection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSetting" (
    "key" VARCHAR(100) NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "ContentPage" (
    "id" SERIAL NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "body" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaqItem" (
    "id" SERIAL NOT NULL,
    "category" VARCHAR(30) NOT NULL,
    "question" VARCHAR(400) NOT NULL,
    "answer" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FaqItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Testimonial" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "role" VARCHAR(150) NOT NULL,
    "quote" VARCHAR(1000) NOT NULL,
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "consentObtained" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Testimonial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "actorId" INTEGER,
    "actorEmail" VARCHAR(256),
    "action" VARCHAR(100) NOT NULL,
    "entityType" VARCHAR(50) NOT NULL,
    "entityId" VARCHAR(50),
    "details" TEXT,
    "ipAddress" VARCHAR(64),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE INDEX "User_signupCampaignId_idx" ON "User"("signupCampaignId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE INDEX "UserRole_roleId_idx" ON "UserRole"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "AuthToken_tokenHash_key" ON "AuthToken"("tokenHash");

-- CreateIndex
CREATE INDEX "AuthToken_userId_type_idx" ON "AuthToken"("userId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_userId_key" ON "StudentProfile"("userId");

-- CreateIndex
CREATE INDEX "StudentProfile_district_idx" ON "StudentProfile"("district");

-- CreateIndex
CREATE INDEX "StudentProfile_classLevel_idx" ON "StudentProfile"("classLevel");

-- CreateIndex
CREATE UNIQUE INDEX "Competition_slug_key" ON "Competition"("slug");

-- CreateIndex
CREATE INDEX "Competition_status_examStartsAt_idx" ON "Competition"("status", "examStartsAt");

-- CreateIndex
CREATE INDEX "Prize_competitionId_idx" ON "Prize"("competitionId");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionRegistration_registrationNumber_key" ON "CompetitionRegistration"("registrationNumber");

-- CreateIndex
CREATE INDEX "CompetitionRegistration_competitionId_status_idx" ON "CompetitionRegistration"("competitionId", "status");

-- CreateIndex
CREATE INDEX "CompetitionRegistration_createdAt_idx" ON "CompetitionRegistration"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionRegistration_userId_competitionId_key" ON "CompetitionRegistration"("userId", "competitionId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_reference_key" ON "Payment"("reference");

-- CreateIndex
CREATE INDEX "Payment_registrationId_idx" ON "Payment"("registrationId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_createdAt_idx" ON "Payment"("createdAt");

-- CreateIndex
CREATE INDEX "PaymentEvent_paymentId_idx" ON "PaymentEvent"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionCategory_name_key" ON "QuestionCategory"("name");

-- CreateIndex
CREATE INDEX "Question_categoryId_status_idx" ON "Question"("categoryId", "status");

-- CreateIndex
CREATE INDEX "AnswerOption_questionId_idx" ON "AnswerOption"("questionId");

-- CreateIndex
CREATE INDEX "CompetitionQuestion_questionId_idx" ON "CompetitionQuestion"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamAttempt_publicId_key" ON "ExamAttempt"("publicId");

-- CreateIndex
CREATE INDEX "ExamAttempt_status_expiresAt_idx" ON "ExamAttempt"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExamAttempt_registrationId_attemptNumber_key" ON "ExamAttempt"("registrationId", "attemptNumber");

-- CreateIndex
CREATE INDEX "StudentAnswer_questionId_idx" ON "StudentAnswer"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentAnswer_attemptId_questionId_key" ON "StudentAnswer"("attemptId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentAnswer_attemptId_position_key" ON "StudentAnswer"("attemptId", "position");

-- CreateIndex
CREATE INDEX "ExamActivityLog_attemptId_idx" ON "ExamActivityLog"("attemptId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamResult_attemptId_key" ON "ExamResult"("attemptId");

-- CreateIndex
CREATE INDEX "ExamResult_status_idx" ON "ExamResult"("status");

-- CreateIndex
CREATE INDEX "ExamResult_meritRank_idx" ON "ExamResult"("meritRank");

-- CreateIndex
CREATE INDEX "ResultChangeLog_resultId_idx" ON "ResultChangeLog"("resultId");

-- CreateIndex
CREATE UNIQUE INDEX "PrizeAllocation_resultId_key" ON "PrizeAllocation"("resultId");

-- CreateIndex
CREATE INDEX "PrizeAllocation_prizeId_idx" ON "PrizeAllocation"("prizeId");

-- CreateIndex
CREATE INDEX "PrizeAllocation_status_idx" ON "PrizeAllocation"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PrizeDistribution_allocationId_key" ON "PrizeDistribution"("allocationId");

-- CreateIndex
CREATE INDEX "PrizeDistribution_ceremonyId_idx" ON "PrizeDistribution"("ceremonyId");

-- CreateIndex
CREATE UNIQUE INDEX "AwardCeremony_slug_key" ON "AwardCeremony"("slug");

-- CreateIndex
CREATE INDEX "AwardCeremony_status_eventDate_idx" ON "AwardCeremony"("status", "eventDate");

-- CreateIndex
CREATE INDEX "CeremonyMedia_ceremonyId_idx" ON "CeremonyMedia"("ceremonyId");

-- CreateIndex
CREATE UNIQUE INDEX "MediaFile_publicId_key" ON "MediaFile"("publicId");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "EmailOutbox_createdAt_idx" ON "EmailOutbox"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SupportTicket_ticketNumber_key" ON "SupportTicket"("ticketNumber");

-- CreateIndex
CREATE INDEX "SupportTicket_status_category_idx" ON "SupportTicket"("status", "category");

-- CreateIndex
CREATE INDEX "SupportTicket_userId_idx" ON "SupportTicket"("userId");

-- CreateIndex
CREATE INDEX "SupportMessage_ticketId_idx" ON "SupportMessage"("ticketId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketingCampaign_slug_key" ON "MarketingCampaign"("slug");

-- CreateIndex
CREATE INDEX "MarketingCampaign_status_idx" ON "MarketingCampaign"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_referredUserId_key" ON "Referral"("referredUserId");

-- CreateIndex
CREATE INDEX "Referral_referrerId_idx" ON "Referral"("referrerId");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON "NewsletterSubscriber"("email");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_unsubscribeToken_key" ON "NewsletterSubscriber"("unsubscribeToken");

-- CreateIndex
CREATE INDEX "Announcement_type_isPublished_idx" ON "Announcement"("type", "isPublished");

-- CreateIndex
CREATE INDEX "BusinessExpense_category_idx" ON "BusinessExpense"("category");

-- CreateIndex
CREATE INDEX "BusinessExpense_expenseDate_idx" ON "BusinessExpense"("expenseDate");

-- CreateIndex
CREATE UNIQUE INDEX "ContentPage_slug_key" ON "ContentPage"("slug");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_signupCampaignId_fkey" FOREIGN KEY ("signupCampaignId") REFERENCES "MarketingCampaign"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "AuthToken" ADD CONSTRAINT "AuthToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CompetitionEligibleClass" ADD CONSTRAINT "CompetitionEligibleClass_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Prize" ADD CONSTRAINT "Prize_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CompetitionRegistration" ADD CONSTRAINT "CompetitionRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CompetitionRegistration" ADD CONSTRAINT "CompetitionRegistration_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "CompetitionRegistration"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "QuestionCategory"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "AnswerOption" ADD CONSTRAINT "AnswerOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CompetitionQuestion" ADD CONSTRAINT "CompetitionQuestion_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CompetitionQuestion" ADD CONSTRAINT "CompetitionQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ExamAttempt" ADD CONSTRAINT "ExamAttempt_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "CompetitionRegistration"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "StudentAnswer" ADD CONSTRAINT "StudentAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "ExamAttempt"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "StudentAnswer" ADD CONSTRAINT "StudentAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "StudentAnswer" ADD CONSTRAINT "StudentAnswer_selectedOptionId_fkey" FOREIGN KEY ("selectedOptionId") REFERENCES "AnswerOption"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ExamActivityLog" ADD CONSTRAINT "ExamActivityLog_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "ExamAttempt"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ExamResult" ADD CONSTRAINT "ExamResult_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "ExamAttempt"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ResultChangeLog" ADD CONSTRAINT "ResultChangeLog_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "ExamResult"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PrizeAllocation" ADD CONSTRAINT "PrizeAllocation_prizeId_fkey" FOREIGN KEY ("prizeId") REFERENCES "Prize"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PrizeAllocation" ADD CONSTRAINT "PrizeAllocation_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "ExamResult"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PrizeDistribution" ADD CONSTRAINT "PrizeDistribution_allocationId_fkey" FOREIGN KEY ("allocationId") REFERENCES "PrizeAllocation"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PrizeDistribution" ADD CONSTRAINT "PrizeDistribution_ceremonyId_fkey" FOREIGN KEY ("ceremonyId") REFERENCES "AwardCeremony"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "AwardCeremony" ADD CONSTRAINT "AwardCeremony_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CeremonyMedia" ADD CONSTRAINT "CeremonyMedia_ceremonyId_fkey" FOREIGN KEY ("ceremonyId") REFERENCES "AwardCeremony"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "ExamResult"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "MarketingCampaign" ADD CONSTRAINT "MarketingCampaign_landingCompetitionId_fkey" FOREIGN KEY ("landingCompetitionId") REFERENCES "Competition"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referredUserId_fkey" FOREIGN KEY ("referredUserId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_ceremonyId_fkey" FOREIGN KEY ("ceremonyId") REFERENCES "AwardCeremony"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "BusinessExpense" ADD CONSTRAINT "BusinessExpense_prizeId_fkey" FOREIGN KEY ("prizeId") REFERENCES "Prize"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "BusinessExpense" ADD CONSTRAINT "BusinessExpense_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "MarketingCampaign"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "BusinessExpense" ADD CONSTRAINT "BusinessExpense_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "FinancialProjection" ADD CONSTRAINT "FinancialProjection_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

