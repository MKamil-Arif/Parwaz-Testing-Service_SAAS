BEGIN TRY

BEGIN TRAN;

-- CreateSchema
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = N'dbo') EXEC sp_executesql N'CREATE SCHEMA [dbo];';

-- CreateTable
CREATE TABLE [dbo].[User] (
    [id] INT NOT NULL IDENTITY(1,1),
    [email] NVARCHAR(256) NOT NULL,
    [fullName] NVARCHAR(150) NOT NULL,
    [phone] NVARCHAR(20) NOT NULL,
    [passwordHash] NVARCHAR(100) NOT NULL,
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [User_status_df] DEFAULT 'ACTIVE',
    [emailVerifiedAt] DATETIME2,
    [mustChangePassword] BIT NOT NULL CONSTRAINT [User_mustChangePassword_df] DEFAULT 0,
    [failedLoginCount] INT NOT NULL CONSTRAINT [User_failedLoginCount_df] DEFAULT 0,
    [lockedUntil] DATETIME2,
    [lastLoginAt] DATETIME2,
    [referralCode] NVARCHAR(16) NOT NULL,
    [signupCampaignId] INT,
    [isDemo] BIT NOT NULL CONSTRAINT [User_isDemo_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [User_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [User_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [User_email_key] UNIQUE NONCLUSTERED ([email]),
    CONSTRAINT [User_referralCode_key] UNIQUE NONCLUSTERED ([referralCode])
);

-- CreateTable
CREATE TABLE [dbo].[Role] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(50) NOT NULL,
    [description] NVARCHAR(255),
    CONSTRAINT [Role_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Role_name_key] UNIQUE NONCLUSTERED ([name])
);

-- CreateTable
CREATE TABLE [dbo].[UserRole] (
    [userId] INT NOT NULL,
    [roleId] INT NOT NULL,
    [assignedAt] DATETIME2 NOT NULL CONSTRAINT [UserRole_assignedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [UserRole_pkey] PRIMARY KEY CLUSTERED ([userId],[roleId])
);

-- CreateTable
CREATE TABLE [dbo].[Session] (
    [id] INT NOT NULL IDENTITY(1,1),
    [userId] INT NOT NULL,
    [tokenHash] VARCHAR(64) NOT NULL,
    [expiresAt] DATETIME2 NOT NULL,
    [ipAddress] NVARCHAR(64),
    [userAgent] NVARCHAR(400),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Session_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [lastSeenAt] DATETIME2 NOT NULL CONSTRAINT [Session_lastSeenAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Session_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Session_tokenHash_key] UNIQUE NONCLUSTERED ([tokenHash])
);

-- CreateTable
CREATE TABLE [dbo].[AuthToken] (
    [id] INT NOT NULL IDENTITY(1,1),
    [userId] INT NOT NULL,
    [type] NVARCHAR(30) NOT NULL,
    [tokenHash] VARCHAR(64) NOT NULL,
    [expiresAt] DATETIME2 NOT NULL,
    [usedAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AuthToken_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [AuthToken_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [AuthToken_tokenHash_key] UNIQUE NONCLUSTERED ([tokenHash])
);

-- CreateTable
CREATE TABLE [dbo].[StudentProfile] (
    [id] INT NOT NULL IDENTITY(1,1),
    [userId] INT NOT NULL,
    [city] NVARCHAR(100) NOT NULL,
    [district] NVARCHAR(100) NOT NULL,
    [institution] NVARCHAR(200) NOT NULL,
    [classLevel] NVARCHAR(20) NOT NULL,
    [dateOfBirth] DATE NOT NULL,
    [guardianName] NVARCHAR(150),
    [guardianPhone] NVARCHAR(20),
    [guardianRelation] NVARCHAR(50),
    [guardianConsentAt] DATETIME2,
    [guardianConsentVerified] BIT NOT NULL CONSTRAINT [StudentProfile_guardianConsentVerified_df] DEFAULT 0,
    [leaderboardNameMode] NVARCHAR(20) NOT NULL CONSTRAINT [StudentProfile_leaderboardNameMode_df] DEFAULT 'INITIALS',
    [mediaConsent] BIT NOT NULL CONSTRAINT [StudentProfile_mediaConsent_df] DEFAULT 0,
    [termsAcceptedAt] DATETIME2 NOT NULL,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [StudentProfile_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [StudentProfile_userId_key] UNIQUE NONCLUSTERED ([userId])
);

-- CreateTable
CREATE TABLE [dbo].[Competition] (
    [id] INT NOT NULL IDENTITY(1,1),
    [slug] NVARCHAR(120) NOT NULL,
    [title] NVARCHAR(200) NOT NULL,
    [summary] NVARCHAR(500) NOT NULL,
    [description] NVARCHAR(max) NOT NULL,
    [subjects] NVARCHAR(300) NOT NULL,
    [eligibilityText] NVARCHAR(max) NOT NULL,
    [rules] NVARCHAR(max) NOT NULL,
    [tieBreakPolicy] NVARCHAR(max) NOT NULL,
    [eligibleProvince] NVARCHAR(50),
    [minAge] INT,
    [maxAge] INT,
    [registrationFee] DECIMAL(12,2) NOT NULL,
    [targetRegistrations] INT,
    [maxRegistrations] INT,
    [registrationOpensAt] DATETIME2 NOT NULL,
    [registrationClosesAt] DATETIME2 NOT NULL,
    [examStartsAt] DATETIME2 NOT NULL,
    [examEndsAt] DATETIME2 NOT NULL,
    [durationMinutes] INT NOT NULL,
    [questionCount] INT NOT NULL,
    [marksPerQuestion] FLOAT(53),
    [totalMarks] FLOAT(53) NOT NULL,
    [negativeMarking] FLOAT(53) NOT NULL CONSTRAINT [Competition_negativeMarking_df] DEFAULT 0,
    [maxAttempts] INT NOT NULL CONSTRAINT [Competition_maxAttempts_df] DEFAULT 1,
    [randomizeQuestions] BIT NOT NULL CONSTRAINT [Competition_randomizeQuestions_df] DEFAULT 1,
    [randomizeOptions] BIT NOT NULL CONSTRAINT [Competition_randomizeOptions_df] DEFAULT 1,
    [showInstantResults] BIT NOT NULL CONSTRAINT [Competition_showInstantResults_df] DEFAULT 0,
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [Competition_status_df] DEFAULT 'DRAFT',
    [resultsStatus] NVARCHAR(20) NOT NULL CONSTRAINT [Competition_resultsStatus_df] DEFAULT 'PENDING',
    [meritGeneratedAt] DATETIME2,
    [resultsApprovedAt] DATETIME2,
    [resultsApprovedById] INT,
    [resultsPublishedAt] DATETIME2,
    [resultsPublishedById] INT,
    [isDemo] BIT NOT NULL CONSTRAINT [Competition_isDemo_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Competition_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Competition_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Competition_slug_key] UNIQUE NONCLUSTERED ([slug])
);

-- CreateTable
CREATE TABLE [dbo].[CompetitionEligibleClass] (
    [competitionId] INT NOT NULL,
    [classLevel] NVARCHAR(20) NOT NULL,
    CONSTRAINT [CompetitionEligibleClass_pkey] PRIMARY KEY CLUSTERED ([competitionId],[classLevel])
);

-- CreateTable
CREATE TABLE [dbo].[Prize] (
    [id] INT NOT NULL IDENTITY(1,1),
    [competitionId] INT NOT NULL,
    [title] NVARCHAR(150) NOT NULL,
    [category] NVARCHAR(30) NOT NULL,
    [description] NVARCHAR(1000),
    [rankFrom] INT NOT NULL,
    [rankTo] INT NOT NULL,
    [quantity] INT NOT NULL,
    [estimatedUnitValue] DECIMAL(12,2) NOT NULL,
    [sortOrder] INT NOT NULL CONSTRAINT [Prize_sortOrder_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Prize_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Prize_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[CompetitionRegistration] (
    [id] INT NOT NULL IDENTITY(1,1),
    [registrationNumber] NVARCHAR(30) NOT NULL,
    [userId] INT NOT NULL,
    [competitionId] INT NOT NULL,
    [status] NVARCHAR(30) NOT NULL,
    [eligibilityConfirmedAt] DATETIME2 NOT NULL,
    [rulesAcceptedAt] DATETIME2 NOT NULL,
    [confirmedAt] DATETIME2,
    [cancelledAt] DATETIME2,
    [cancellationReason] NVARCHAR(500),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [CompetitionRegistration_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [CompetitionRegistration_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [CompetitionRegistration_registrationNumber_key] UNIQUE NONCLUSTERED ([registrationNumber]),
    CONSTRAINT [CompetitionRegistration_userId_competitionId_key] UNIQUE NONCLUSTERED ([userId],[competitionId])
);

-- CreateTable
CREATE TABLE [dbo].[Payment] (
    [id] INT NOT NULL IDENTITY(1,1),
    [reference] NVARCHAR(40) NOT NULL,
    [registrationId] INT NOT NULL,
    [amount] DECIMAL(12,2) NOT NULL,
    [currency] NVARCHAR(3) NOT NULL CONSTRAINT [Payment_currency_df] DEFAULT 'PKR',
    [method] NVARCHAR(30) NOT NULL,
    [status] NVARCHAR(30) NOT NULL,
    [isSandbox] BIT NOT NULL CONSTRAINT [Payment_isSandbox_df] DEFAULT 0,
    [gatewayTransactionId] NVARCHAR(100),
    [payerReference] NVARCHAR(100),
    [payerAccount] NVARCHAR(100),
    [payerNote] NVARCHAR(500),
    [failureReason] NVARCHAR(500),
    [paidAt] DATETIME2,
    [verifiedAt] DATETIME2,
    [verifiedById] INT,
    [refundStatus] NVARCHAR(30),
    [refundAmount] DECIMAL(12,2),
    [refundReason] NVARCHAR(500),
    [refundedAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Payment_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Payment_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Payment_reference_key] UNIQUE NONCLUSTERED ([reference])
);

-- CreateTable
CREATE TABLE [dbo].[PaymentEvent] (
    [id] INT NOT NULL IDENTITY(1,1),
    [paymentId] INT,
    [provider] NVARCHAR(30) NOT NULL,
    [eventType] NVARCHAR(50) NOT NULL,
    [payload] NVARCHAR(max) NOT NULL,
    [signatureValid] BIT NOT NULL,
    [outcome] NVARCHAR(200) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [PaymentEvent_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PaymentEvent_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[QuestionCategory] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(100) NOT NULL,
    [description] NVARCHAR(500),
    CONSTRAINT [QuestionCategory_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [QuestionCategory_name_key] UNIQUE NONCLUSTERED ([name])
);

-- CreateTable
CREATE TABLE [dbo].[Question] (
    [id] INT NOT NULL IDENTITY(1,1),
    [categoryId] INT NOT NULL,
    [type] NVARCHAR(20) NOT NULL CONSTRAINT [Question_type_df] DEFAULT 'MCQ',
    [text] NVARCHAR(max) NOT NULL,
    [explanation] NVARCHAR(max),
    [difficulty] NVARCHAR(10) NOT NULL CONSTRAINT [Question_difficulty_df] DEFAULT 'MEDIUM',
    [marks] FLOAT(53) NOT NULL CONSTRAINT [Question_marks_df] DEFAULT 1,
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [Question_status_df] DEFAULT 'ACTIVE',
    [isDemo] BIT NOT NULL CONSTRAINT [Question_isDemo_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Question_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Question_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[AnswerOption] (
    [id] INT NOT NULL IDENTITY(1,1),
    [questionId] INT NOT NULL,
    [text] NVARCHAR(1000) NOT NULL,
    [isCorrect] BIT NOT NULL CONSTRAINT [AnswerOption_isCorrect_df] DEFAULT 0,
    [sortOrder] INT NOT NULL,
    CONSTRAINT [AnswerOption_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[CompetitionQuestion] (
    [competitionId] INT NOT NULL,
    [questionId] INT NOT NULL,
    [addedAt] DATETIME2 NOT NULL CONSTRAINT [CompetitionQuestion_addedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [CompetitionQuestion_pkey] PRIMARY KEY CLUSTERED ([competitionId],[questionId])
);

-- CreateTable
CREATE TABLE [dbo].[ExamAttempt] (
    [id] INT NOT NULL IDENTITY(1,1),
    [publicId] VARCHAR(32) NOT NULL,
    [registrationId] INT NOT NULL,
    [attemptNumber] INT NOT NULL,
    [status] NVARCHAR(20) NOT NULL,
    [startedAt] DATETIME2 NOT NULL,
    [expiresAt] DATETIME2 NOT NULL,
    [submittedAt] DATETIME2,
    [submissionType] NVARCHAR(20),
    [identityConfirmedAt] DATETIME2 NOT NULL,
    [sessionId] INT,
    [ipAddress] NVARCHAR(64),
    [userAgent] NVARCHAR(400),
    [lastSavedAt] DATETIME2,
    [flagCount] INT NOT NULL CONSTRAINT [ExamAttempt_flagCount_df] DEFAULT 0,
    [voidReason] NVARCHAR(500),
    CONSTRAINT [ExamAttempt_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ExamAttempt_publicId_key] UNIQUE NONCLUSTERED ([publicId]),
    CONSTRAINT [ExamAttempt_registrationId_attemptNumber_key] UNIQUE NONCLUSTERED ([registrationId],[attemptNumber])
);

-- CreateTable
CREATE TABLE [dbo].[StudentAnswer] (
    [id] INT NOT NULL IDENTITY(1,1),
    [attemptId] INT NOT NULL,
    [questionId] INT NOT NULL,
    [position] INT NOT NULL,
    [optionOrder] VARCHAR(200) NOT NULL,
    [selectedOptionId] INT,
    [textAnswer] NVARCHAR(max),
    [markedForReview] BIT NOT NULL CONSTRAINT [StudentAnswer_markedForReview_df] DEFAULT 0,
    [answeredAt] DATETIME2,
    [isCorrect] BIT,
    [marksAwarded] FLOAT(53),
    [reviewedById] INT,
    [reviewedAt] DATETIME2,
    [reviewNote] NVARCHAR(500),
    CONSTRAINT [StudentAnswer_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [StudentAnswer_attemptId_questionId_key] UNIQUE NONCLUSTERED ([attemptId],[questionId]),
    CONSTRAINT [StudentAnswer_attemptId_position_key] UNIQUE NONCLUSTERED ([attemptId],[position])
);

-- CreateTable
CREATE TABLE [dbo].[ExamActivityLog] (
    [id] INT NOT NULL IDENTITY(1,1),
    [attemptId] INT NOT NULL,
    [eventType] NVARCHAR(40) NOT NULL,
    [details] NVARCHAR(500),
    [ipAddress] NVARCHAR(64),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ExamActivityLog_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [ExamActivityLog_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ExamResult] (
    [id] INT NOT NULL IDENTITY(1,1),
    [attemptId] INT NOT NULL,
    [totalQuestions] INT NOT NULL,
    [correctCount] INT NOT NULL,
    [incorrectCount] INT NOT NULL,
    [unansweredCount] INT NOT NULL,
    [pendingReviewCount] INT NOT NULL CONSTRAINT [ExamResult_pendingReviewCount_df] DEFAULT 0,
    [score] FLOAT(53) NOT NULL,
    [maxScore] FLOAT(53) NOT NULL,
    [percentage] FLOAT(53) NOT NULL,
    [timeTakenSeconds] INT NOT NULL,
    [status] NVARCHAR(20) NOT NULL,
    [meritRank] INT,
    [verifiedById] INT,
    [verifiedAt] DATETIME2,
    [notes] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ExamResult_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [ExamResult_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ExamResult_attemptId_key] UNIQUE NONCLUSTERED ([attemptId])
);

-- CreateTable
CREATE TABLE [dbo].[ResultChangeLog] (
    [id] INT NOT NULL IDENTITY(1,1),
    [resultId] INT NOT NULL,
    [changedById] INT,
    [field] NVARCHAR(50) NOT NULL,
    [oldValue] NVARCHAR(200),
    [newValue] NVARCHAR(200),
    [reason] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ResultChangeLog_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [ResultChangeLog_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[PrizeAllocation] (
    [id] INT NOT NULL IDENTITY(1,1),
    [prizeId] INT NOT NULL,
    [resultId] INT NOT NULL,
    [rank] INT NOT NULL,
    [status] NVARCHAR(30) NOT NULL,
    [verificationNotes] NVARCHAR(1000),
    [verifiedById] INT,
    [verifiedAt] DATETIME2,
    [publicApproved] BIT NOT NULL CONSTRAINT [PrizeAllocation_publicApproved_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [PrizeAllocation_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [PrizeAllocation_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [PrizeAllocation_resultId_key] UNIQUE NONCLUSTERED ([resultId])
);

-- CreateTable
CREATE TABLE [dbo].[PrizeDistribution] (
    [id] INT NOT NULL IDENTITY(1,1),
    [allocationId] INT NOT NULL,
    [status] NVARCHAR(30) NOT NULL,
    [method] NVARCHAR(30) NOT NULL,
    [ceremonyId] INT,
    [scheduledDate] DATETIME2,
    [deliveredAt] DATETIME2,
    [deliveryAddress] NVARCHAR(500),
    [trackingReference] NVARCHAR(100),
    [deviceSerialNumber] NVARCHAR(100),
    [receivedBy] NVARCHAR(150),
    [notes] NVARCHAR(1000),
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [PrizeDistribution_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [PrizeDistribution_allocationId_key] UNIQUE NONCLUSTERED ([allocationId])
);

-- CreateTable
CREATE TABLE [dbo].[AwardCeremony] (
    [id] INT NOT NULL IDENTITY(1,1),
    [slug] NVARCHAR(120) NOT NULL,
    [title] NVARCHAR(200) NOT NULL,
    [city] NVARCHAR(100) NOT NULL,
    [venue] NVARCHAR(300) NOT NULL,
    [eventDate] DATETIME2 NOT NULL,
    [description] NVARCHAR(max) NOT NULL,
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [AwardCeremony_status_df] DEFAULT 'DRAFT',
    [competitionId] INT,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AwardCeremony_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [AwardCeremony_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [AwardCeremony_slug_key] UNIQUE NONCLUSTERED ([slug])
);

-- CreateTable
CREATE TABLE [dbo].[CeremonyMedia] (
    [id] INT NOT NULL IDENTITY(1,1),
    [ceremonyId] INT NOT NULL,
    [type] NVARCHAR(10) NOT NULL,
    [url] NVARCHAR(500) NOT NULL,
    [caption] NVARCHAR(300),
    [consentConfirmed] BIT NOT NULL CONSTRAINT [CeremonyMedia_consentConfirmed_df] DEFAULT 0,
    [isPublished] BIT NOT NULL CONSTRAINT [CeremonyMedia_isPublished_df] DEFAULT 0,
    [sortOrder] INT NOT NULL CONSTRAINT [CeremonyMedia_sortOrder_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [CeremonyMedia_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [CeremonyMedia_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Notification] (
    [id] INT NOT NULL IDENTITY(1,1),
    [userId] INT NOT NULL,
    [type] NVARCHAR(40) NOT NULL,
    [title] NVARCHAR(200) NOT NULL,
    [body] NVARCHAR(2000) NOT NULL,
    [link] NVARCHAR(300),
    [readAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Notification_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Notification_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[NotificationBroadcast] (
    [id] INT NOT NULL IDENTITY(1,1),
    [title] NVARCHAR(200) NOT NULL,
    [body] NVARCHAR(2000) NOT NULL,
    [link] NVARCHAR(300),
    [audience] NVARCHAR(40) NOT NULL,
    [competitionId] INT,
    [channels] NVARCHAR(50) NOT NULL,
    [recipientCount] INT NOT NULL,
    [sentById] INT,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [NotificationBroadcast_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [NotificationBroadcast_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[EmailOutbox] (
    [id] INT NOT NULL IDENTITY(1,1),
    [toEmail] NVARCHAR(256) NOT NULL,
    [subject] NVARCHAR(300) NOT NULL,
    [body] NVARCHAR(max) NOT NULL,
    [status] NVARCHAR(20) NOT NULL,
    [error] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [EmailOutbox_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [sentAt] DATETIME2,
    CONSTRAINT [EmailOutbox_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[SupportTicket] (
    [id] INT NOT NULL IDENTITY(1,1),
    [ticketNumber] NVARCHAR(30) NOT NULL,
    [userId] INT,
    [name] NVARCHAR(150) NOT NULL,
    [email] NVARCHAR(256) NOT NULL,
    [phone] NVARCHAR(20),
    [subject] NVARCHAR(200) NOT NULL,
    [category] NVARCHAR(30) NOT NULL,
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [SupportTicket_status_df] DEFAULT 'OPEN',
    [priority] NVARCHAR(10) NOT NULL CONSTRAINT [SupportTicket_priority_df] DEFAULT 'NORMAL',
    [competitionId] INT,
    [resultId] INT,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [SupportTicket_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [SupportTicket_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [SupportTicket_ticketNumber_key] UNIQUE NONCLUSTERED ([ticketNumber])
);

-- CreateTable
CREATE TABLE [dbo].[SupportMessage] (
    [id] INT NOT NULL IDENTITY(1,1),
    [ticketId] INT NOT NULL,
    [authorId] INT,
    [isStaff] BIT NOT NULL CONSTRAINT [SupportMessage_isStaff_df] DEFAULT 0,
    [body] NVARCHAR(max) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [SupportMessage_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [SupportMessage_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[MarketingCampaign] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(150) NOT NULL,
    [slug] NVARCHAR(80) NOT NULL,
    [channel] NVARCHAR(30) NOT NULL,
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [MarketingCampaign_status_df] DEFAULT 'PLANNED',
    [startDate] DATE NOT NULL,
    [endDate] DATE,
    [budget] DECIMAL(12,2),
    [notes] NVARCHAR(2000),
    [visitCount] INT NOT NULL CONSTRAINT [MarketingCampaign_visitCount_df] DEFAULT 0,
    [landingEnabled] BIT NOT NULL CONSTRAINT [MarketingCampaign_landingEnabled_df] DEFAULT 0,
    [landingHeadline] NVARCHAR(200),
    [landingBody] NVARCHAR(max),
    [landingCompetitionId] INT,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [MarketingCampaign_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [MarketingCampaign_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [MarketingCampaign_slug_key] UNIQUE NONCLUSTERED ([slug])
);

-- CreateTable
CREATE TABLE [dbo].[Referral] (
    [id] INT NOT NULL IDENTITY(1,1),
    [referrerId] INT NOT NULL,
    [referredUserId] INT NOT NULL,
    [status] NVARCHAR(20) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Referral_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [convertedAt] DATETIME2,
    CONSTRAINT [Referral_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Referral_referredUserId_key] UNIQUE NONCLUSTERED ([referredUserId])
);

-- CreateTable
CREATE TABLE [dbo].[NewsletterSubscriber] (
    [id] INT NOT NULL IDENTITY(1,1),
    [email] NVARCHAR(256) NOT NULL,
    [source] NVARCHAR(80),
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [NewsletterSubscriber_status_df] DEFAULT 'SUBSCRIBED',
    [unsubscribeToken] VARCHAR(64) NOT NULL,
    [consentAt] DATETIME2 NOT NULL CONSTRAINT [NewsletterSubscriber_consentAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [NewsletterSubscriber_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [NewsletterSubscriber_email_key] UNIQUE NONCLUSTERED ([email]),
    CONSTRAINT [NewsletterSubscriber_unsubscribeToken_key] UNIQUE NONCLUSTERED ([unsubscribeToken])
);

-- CreateTable
CREATE TABLE [dbo].[Announcement] (
    [id] INT NOT NULL IDENTITY(1,1),
    [type] NVARCHAR(20) NOT NULL,
    [title] NVARCHAR(200) NOT NULL,
    [body] NVARCHAR(max) NOT NULL,
    [linkUrl] NVARCHAR(300),
    [linkLabel] NVARCHAR(60),
    [isPublished] BIT NOT NULL CONSTRAINT [Announcement_isPublished_df] DEFAULT 0,
    [startsAt] DATETIME2,
    [endsAt] DATETIME2,
    [competitionId] INT,
    [ceremonyId] INT,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Announcement_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Announcement_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[BusinessExpense] (
    [id] INT NOT NULL IDENTITY(1,1),
    [category] NVARCHAR(30) NOT NULL,
    [description] NVARCHAR(300) NOT NULL,
    [amount] DECIMAL(12,2) NOT NULL,
    [expenseDate] DATE NOT NULL,
    [vendor] NVARCHAR(150),
    [receiptReference] NVARCHAR(100),
    [quantity] INT,
    [prizeId] INT,
    [campaignId] INT,
    [competitionId] INT,
    [recordedById] INT,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [BusinessExpense_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [BusinessExpense_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[FinancialProjection] (
    [id] INT NOT NULL IDENTITY(1,1),
    [competitionId] INT,
    [type] NVARCHAR(10) NOT NULL,
    [category] NVARCHAR(30) NOT NULL,
    [label] NVARCHAR(150) NOT NULL,
    [amount] DECIMAL(12,2) NOT NULL,
    [sortOrder] INT NOT NULL CONSTRAINT [FinancialProjection_sortOrder_df] DEFAULT 0,
    [notes] NVARCHAR(500),
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [FinancialProjection_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[SiteSetting] (
    [key] NVARCHAR(100) NOT NULL,
    [value] NVARCHAR(max) NOT NULL,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [SiteSetting_pkey] PRIMARY KEY CLUSTERED ([key])
);

-- CreateTable
CREATE TABLE [dbo].[ContentPage] (
    [id] INT NOT NULL IDENTITY(1,1),
    [slug] NVARCHAR(80) NOT NULL,
    [title] NVARCHAR(200) NOT NULL,
    [body] NVARCHAR(max) NOT NULL,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [ContentPage_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ContentPage_slug_key] UNIQUE NONCLUSTERED ([slug])
);

-- CreateTable
CREATE TABLE [dbo].[FaqItem] (
    [id] INT NOT NULL IDENTITY(1,1),
    [category] NVARCHAR(30) NOT NULL,
    [question] NVARCHAR(400) NOT NULL,
    [answer] NVARCHAR(max) NOT NULL,
    [sortOrder] INT NOT NULL CONSTRAINT [FaqItem_sortOrder_df] DEFAULT 0,
    [isPublished] BIT NOT NULL CONSTRAINT [FaqItem_isPublished_df] DEFAULT 1,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [FaqItem_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Testimonial] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(150) NOT NULL,
    [role] NVARCHAR(150) NOT NULL,
    [quote] NVARCHAR(1000) NOT NULL,
    [isSample] BIT NOT NULL CONSTRAINT [Testimonial_isSample_df] DEFAULT 0,
    [consentObtained] BIT NOT NULL CONSTRAINT [Testimonial_consentObtained_df] DEFAULT 0,
    [isPublished] BIT NOT NULL CONSTRAINT [Testimonial_isPublished_df] DEFAULT 0,
    [sortOrder] INT NOT NULL CONSTRAINT [Testimonial_sortOrder_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Testimonial_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Testimonial_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[AuditLog] (
    [id] INT NOT NULL IDENTITY(1,1),
    [actorId] INT,
    [actorEmail] NVARCHAR(256),
    [action] NVARCHAR(100) NOT NULL,
    [entityType] NVARCHAR(50) NOT NULL,
    [entityId] NVARCHAR(50),
    [details] NVARCHAR(max),
    [ipAddress] NVARCHAR(64),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AuditLog_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [AuditLog_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [User_status_idx] ON [dbo].[User]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [User_createdAt_idx] ON [dbo].[User]([createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [User_signupCampaignId_idx] ON [dbo].[User]([signupCampaignId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [UserRole_roleId_idx] ON [dbo].[UserRole]([roleId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Session_userId_idx] ON [dbo].[Session]([userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Session_expiresAt_idx] ON [dbo].[Session]([expiresAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuthToken_userId_type_idx] ON [dbo].[AuthToken]([userId], [type]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [StudentProfile_district_idx] ON [dbo].[StudentProfile]([district]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [StudentProfile_classLevel_idx] ON [dbo].[StudentProfile]([classLevel]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Competition_status_examStartsAt_idx] ON [dbo].[Competition]([status], [examStartsAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Prize_competitionId_idx] ON [dbo].[Prize]([competitionId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [CompetitionRegistration_competitionId_status_idx] ON [dbo].[CompetitionRegistration]([competitionId], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [CompetitionRegistration_createdAt_idx] ON [dbo].[CompetitionRegistration]([createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Payment_registrationId_idx] ON [dbo].[Payment]([registrationId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Payment_status_idx] ON [dbo].[Payment]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Payment_createdAt_idx] ON [dbo].[Payment]([createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PaymentEvent_paymentId_idx] ON [dbo].[PaymentEvent]([paymentId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Question_categoryId_status_idx] ON [dbo].[Question]([categoryId], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AnswerOption_questionId_idx] ON [dbo].[AnswerOption]([questionId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [CompetitionQuestion_questionId_idx] ON [dbo].[CompetitionQuestion]([questionId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ExamAttempt_status_expiresAt_idx] ON [dbo].[ExamAttempt]([status], [expiresAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [StudentAnswer_questionId_idx] ON [dbo].[StudentAnswer]([questionId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ExamActivityLog_attemptId_idx] ON [dbo].[ExamActivityLog]([attemptId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ExamResult_status_idx] ON [dbo].[ExamResult]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ExamResult_meritRank_idx] ON [dbo].[ExamResult]([meritRank]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ResultChangeLog_resultId_idx] ON [dbo].[ResultChangeLog]([resultId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PrizeAllocation_prizeId_idx] ON [dbo].[PrizeAllocation]([prizeId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PrizeAllocation_status_idx] ON [dbo].[PrizeAllocation]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PrizeDistribution_ceremonyId_idx] ON [dbo].[PrizeDistribution]([ceremonyId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AwardCeremony_status_eventDate_idx] ON [dbo].[AwardCeremony]([status], [eventDate]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [CeremonyMedia_ceremonyId_idx] ON [dbo].[CeremonyMedia]([ceremonyId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Notification_userId_readAt_idx] ON [dbo].[Notification]([userId], [readAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Notification_createdAt_idx] ON [dbo].[Notification]([createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [EmailOutbox_createdAt_idx] ON [dbo].[EmailOutbox]([createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [SupportTicket_status_category_idx] ON [dbo].[SupportTicket]([status], [category]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [SupportTicket_userId_idx] ON [dbo].[SupportTicket]([userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [SupportMessage_ticketId_idx] ON [dbo].[SupportMessage]([ticketId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [MarketingCampaign_status_idx] ON [dbo].[MarketingCampaign]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Referral_referrerId_idx] ON [dbo].[Referral]([referrerId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Announcement_type_isPublished_idx] ON [dbo].[Announcement]([type], [isPublished]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [BusinessExpense_category_idx] ON [dbo].[BusinessExpense]([category]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [BusinessExpense_expenseDate_idx] ON [dbo].[BusinessExpense]([expenseDate]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditLog_entityType_entityId_idx] ON [dbo].[AuditLog]([entityType], [entityId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditLog_actorId_idx] ON [dbo].[AuditLog]([actorId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditLog_createdAt_idx] ON [dbo].[AuditLog]([createdAt]);

-- AddForeignKey
ALTER TABLE [dbo].[User] ADD CONSTRAINT [User_signupCampaignId_fkey] FOREIGN KEY ([signupCampaignId]) REFERENCES [dbo].[MarketingCampaign]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[UserRole] ADD CONSTRAINT [UserRole_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[UserRole] ADD CONSTRAINT [UserRole_roleId_fkey] FOREIGN KEY ([roleId]) REFERENCES [dbo].[Role]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Session] ADD CONSTRAINT [Session_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AuthToken] ADD CONSTRAINT [AuthToken_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[StudentProfile] ADD CONSTRAINT [StudentProfile_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[CompetitionEligibleClass] ADD CONSTRAINT [CompetitionEligibleClass_competitionId_fkey] FOREIGN KEY ([competitionId]) REFERENCES [dbo].[Competition]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Prize] ADD CONSTRAINT [Prize_competitionId_fkey] FOREIGN KEY ([competitionId]) REFERENCES [dbo].[Competition]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[CompetitionRegistration] ADD CONSTRAINT [CompetitionRegistration_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[CompetitionRegistration] ADD CONSTRAINT [CompetitionRegistration_competitionId_fkey] FOREIGN KEY ([competitionId]) REFERENCES [dbo].[Competition]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Payment] ADD CONSTRAINT [Payment_registrationId_fkey] FOREIGN KEY ([registrationId]) REFERENCES [dbo].[CompetitionRegistration]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[PaymentEvent] ADD CONSTRAINT [PaymentEvent_paymentId_fkey] FOREIGN KEY ([paymentId]) REFERENCES [dbo].[Payment]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Question] ADD CONSTRAINT [Question_categoryId_fkey] FOREIGN KEY ([categoryId]) REFERENCES [dbo].[QuestionCategory]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AnswerOption] ADD CONSTRAINT [AnswerOption_questionId_fkey] FOREIGN KEY ([questionId]) REFERENCES [dbo].[Question]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[CompetitionQuestion] ADD CONSTRAINT [CompetitionQuestion_competitionId_fkey] FOREIGN KEY ([competitionId]) REFERENCES [dbo].[Competition]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[CompetitionQuestion] ADD CONSTRAINT [CompetitionQuestion_questionId_fkey] FOREIGN KEY ([questionId]) REFERENCES [dbo].[Question]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ExamAttempt] ADD CONSTRAINT [ExamAttempt_registrationId_fkey] FOREIGN KEY ([registrationId]) REFERENCES [dbo].[CompetitionRegistration]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[StudentAnswer] ADD CONSTRAINT [StudentAnswer_attemptId_fkey] FOREIGN KEY ([attemptId]) REFERENCES [dbo].[ExamAttempt]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[StudentAnswer] ADD CONSTRAINT [StudentAnswer_questionId_fkey] FOREIGN KEY ([questionId]) REFERENCES [dbo].[Question]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[StudentAnswer] ADD CONSTRAINT [StudentAnswer_selectedOptionId_fkey] FOREIGN KEY ([selectedOptionId]) REFERENCES [dbo].[AnswerOption]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ExamActivityLog] ADD CONSTRAINT [ExamActivityLog_attemptId_fkey] FOREIGN KEY ([attemptId]) REFERENCES [dbo].[ExamAttempt]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ExamResult] ADD CONSTRAINT [ExamResult_attemptId_fkey] FOREIGN KEY ([attemptId]) REFERENCES [dbo].[ExamAttempt]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ResultChangeLog] ADD CONSTRAINT [ResultChangeLog_resultId_fkey] FOREIGN KEY ([resultId]) REFERENCES [dbo].[ExamResult]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[PrizeAllocation] ADD CONSTRAINT [PrizeAllocation_prizeId_fkey] FOREIGN KEY ([prizeId]) REFERENCES [dbo].[Prize]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[PrizeAllocation] ADD CONSTRAINT [PrizeAllocation_resultId_fkey] FOREIGN KEY ([resultId]) REFERENCES [dbo].[ExamResult]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[PrizeDistribution] ADD CONSTRAINT [PrizeDistribution_allocationId_fkey] FOREIGN KEY ([allocationId]) REFERENCES [dbo].[PrizeAllocation]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[PrizeDistribution] ADD CONSTRAINT [PrizeDistribution_ceremonyId_fkey] FOREIGN KEY ([ceremonyId]) REFERENCES [dbo].[AwardCeremony]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AwardCeremony] ADD CONSTRAINT [AwardCeremony_competitionId_fkey] FOREIGN KEY ([competitionId]) REFERENCES [dbo].[Competition]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[CeremonyMedia] ADD CONSTRAINT [CeremonyMedia_ceremonyId_fkey] FOREIGN KEY ([ceremonyId]) REFERENCES [dbo].[AwardCeremony]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Notification] ADD CONSTRAINT [Notification_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SupportTicket] ADD CONSTRAINT [SupportTicket_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SupportTicket] ADD CONSTRAINT [SupportTicket_competitionId_fkey] FOREIGN KEY ([competitionId]) REFERENCES [dbo].[Competition]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SupportTicket] ADD CONSTRAINT [SupportTicket_resultId_fkey] FOREIGN KEY ([resultId]) REFERENCES [dbo].[ExamResult]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SupportMessage] ADD CONSTRAINT [SupportMessage_ticketId_fkey] FOREIGN KEY ([ticketId]) REFERENCES [dbo].[SupportTicket]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[MarketingCampaign] ADD CONSTRAINT [MarketingCampaign_landingCompetitionId_fkey] FOREIGN KEY ([landingCompetitionId]) REFERENCES [dbo].[Competition]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Referral] ADD CONSTRAINT [Referral_referrerId_fkey] FOREIGN KEY ([referrerId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Referral] ADD CONSTRAINT [Referral_referredUserId_fkey] FOREIGN KEY ([referredUserId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Announcement] ADD CONSTRAINT [Announcement_competitionId_fkey] FOREIGN KEY ([competitionId]) REFERENCES [dbo].[Competition]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Announcement] ADD CONSTRAINT [Announcement_ceremonyId_fkey] FOREIGN KEY ([ceremonyId]) REFERENCES [dbo].[AwardCeremony]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[BusinessExpense] ADD CONSTRAINT [BusinessExpense_prizeId_fkey] FOREIGN KEY ([prizeId]) REFERENCES [dbo].[Prize]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[BusinessExpense] ADD CONSTRAINT [BusinessExpense_campaignId_fkey] FOREIGN KEY ([campaignId]) REFERENCES [dbo].[MarketingCampaign]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[BusinessExpense] ADD CONSTRAINT [BusinessExpense_competitionId_fkey] FOREIGN KEY ([competitionId]) REFERENCES [dbo].[Competition]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[FinancialProjection] ADD CONSTRAINT [FinancialProjection_competitionId_fkey] FOREIGN KEY ([competitionId]) REFERENCES [dbo].[Competition]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

