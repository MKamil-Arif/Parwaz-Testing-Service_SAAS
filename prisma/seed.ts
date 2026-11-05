/**
 * Idempotent seed: safe to run repeatedly. Creates reference data, the initial competition,
 * a clearly-labelled practice round with SAMPLE questions, and two demo accounts whose
 * credentials come from .env (SEED_ADMIN_* / SEED_STUDENT_*). No registrations, payments,
 * results, winners or marketing figures are invented.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

const db = new PrismaClient();
const pkt = (s: string) => new Date(`${s}+05:00`);

const ROLES = [
  ["STUDENT", "Student account"],
  ["SUPER_ADMIN", "Full access including staff and role management"],
  ["ADMIN", "Operations: competitions, students, payments, results, prizes"],
  ["FINANCE", "Payments and financial reports"],
  ["CONTENT", "Website content, marketing, notifications, ceremonies"],
  ["EXAMINER", "Question bank, examinations and result review"],
] as const;

const CLASSES = ["CLASS_9", "CLASS_10", "CLASS_11", "CLASS_12", "INTERMEDIATE"];

const TIE_BREAK = `Students are ranked by total score (highest first). If two or more students have the same score, the tie is broken in this order:

1. **Fewer incorrect answers** ranks higher (rewards accuracy over guessing).
2. **Less time taken** to complete the examination ranks higher.
3. **Earlier final submission time** ranks higher.
4. **Earlier competition registration** ranks higher.

Only results verified by the Parwaz Testing Service team are ranked. Withheld or disqualified results are excluded. Final merit lists are approved by an administrator before publication.`;

const RULES = `## Before the examination
- One registration per student. Your registration is confirmed only after your PKR 500 payment is verified.
- Your name, date of birth, class and school must be accurate. Prize winners must prove these details.
- Students under 18 need a parent or guardian's consent.

## During the examination
- Start any time inside the examination window. Once started, the server-controlled timer runs for the full duration and does not pause.
- Attempt the examination alone, without books, notes, other people, websites or AI tools.
- Use one device. Opening the exam on another device, switching tabs and copy attempts are recorded for review.
- Answers save automatically. When time ends, your answers are submitted automatically.

## After the examination
- Results are verified by our team before publication. Irregular attempts may be withheld or disqualified after review.
- The merit list follows the published tie-breaking rules.
- Ranks 1–10 are eligible for a laptop and ranks 11–30 for a Chromebook, subject to identity and eligibility verification.
- You may raise a result dispute within 7 days of publication from your result page.
- Parwaz Testing Service's decision after reviewing a dispute is final.`;

type Q = [string, string, [string, string, string, string], number];
const QUESTIONS: Record<string, Q[]> = {
  Mathematics: [
    ["EASY", "What is 15% of 240?", ["32", "36", "40", "48"], 1],
    ["EASY", "If 3x + 7 = 22, what is the value of x?", ["3", "4", "5", "6"], 2],
    ["MEDIUM", "The sum of the interior angles of a hexagon is:", ["540°", "720°", "900°", "1080°"], 1],
    ["EASY", "What is the value of √169?", ["11", "12", "13", "14"], 2],
    ["MEDIUM", "The slope of the line y = 4x − 9 is:", ["−9", "4", "9", "−4"], 1],
    ["HARD", "If log₁₀(x) = 3, then x equals:", ["30", "100", "300", "1000"], 3],
  ],
  Physics: [
    ["EASY", "The SI unit of force is the:", ["Joule", "Watt", "Newton", "Pascal"], 2],
    ["EASY", "The acceleration due to gravity near the Earth's surface is approximately:", ["9.8 m/s²", "98 m/s²", "0.98 m/s²", "8.9 m/s²"], 0],
    ["MEDIUM", "Which of the following is a vector quantity?", ["Mass", "Speed", "Displacement", "Temperature"], 2],
    ["MEDIUM", "According to Ohm's law, potential difference V equals:", ["I / R", "I × R", "R / I", "I² × R"], 1],
    ["EASY", "The speed of light in a vacuum is approximately:", ["3 × 10⁸ m/s", "3 × 10⁶ m/s", "3 × 10⁵ m/s", "3 × 10¹⁰ m/s"], 0],
    ["MEDIUM", "The kinetic energy of a body of mass m moving with speed v is:", ["mv", "½mv²", "mgh", "½mv"], 1],
  ],
  Chemistry: [
    ["EASY", "The chemical symbol for sodium is:", ["So", "S", "Na", "Sd"], 2],
    ["EASY", "The pH of a neutral solution at 25 °C is:", ["0", "7", "10", "14"], 1],
    ["MEDIUM", "Which gas is produced when zinc reacts with dilute hydrochloric acid?", ["Oxygen", "Chlorine", "Hydrogen", "Carbon dioxide"], 2],
    ["EASY", "The atomic number of carbon is:", ["6", "8", "12", "14"], 0],
    ["EASY", "Which of the following is a noble gas?", ["Nitrogen", "Argon", "Oxygen", "Hydrogen"], 1],
    ["HARD", "Avogadro's number is approximately:", ["6.02 × 10²³", "6.02 × 10²²", "3.01 × 10²³", "1.66 × 10⁻²⁴"], 0],
  ],
  Biology: [
    ["EASY", "Which organelle is known as the powerhouse of the cell?", ["Nucleus", "Ribosome", "Mitochondrion", "Golgi apparatus"], 2],
    ["EASY", "Photosynthesis takes place mainly in the:", ["Chloroplast", "Mitochondrion", "Nucleus", "Vacuole"], 0],
    ["EASY", "How many chambers does the human heart have?", ["2", "3", "4", "5"], 2],
    ["MEDIUM", "Which blood cells mainly help the body fight infection?", ["Red blood cells", "White blood cells", "Platelets", "Plasma"], 1],
    ["MEDIUM", "DNA stands for:", ["Deoxyribonucleic acid", "Dinitrogen acid", "Deoxyribose nitrate", "Dual nucleic acid"], 0],
    ["MEDIUM", "Insulin is produced by the:", ["Liver", "Pancreas", "Kidney", "Stomach"], 1],
  ],
  English: [
    ["EASY", 'Choose the word closest in meaning to "abundant":', ["Scarce", "Plentiful", "Narrow", "Fragile"], 1],
    ["EASY", 'Choose the word opposite in meaning to "ancient":', ["Old", "Modern", "Historic", "Antique"], 1],
    ["MEDIUM", "Which sentence is grammatically correct?", ["She don't like tea.", "She doesn't likes tea.", "She doesn't like tea.", "She not like tea."], 2],
    ["MEDIUM", 'Fill in the blank: "He has been studying ___ two hours."', ["since", "for", "from", "by"], 1],
    ["EASY", 'The plural of "child" is:', ["Childs", "Childes", "Children", "Childrens"], 2],
    ["EASY", 'Which word in this sentence is a noun? "Honesty is the best policy."', ["is", "best", "Honesty", "the"], 2],
  ],
  "General Knowledge": [
    ["EASY", "The capital of Pakistan is:", ["Karachi", "Lahore", "Islamabad", "Peshawar"], 2],
    ["EASY", "The provincial capital of Sindh is:", ["Hyderabad", "Karachi", "Sukkur", "Larkana"], 1],
    ["EASY", "The national language of Pakistan is:", ["Urdu", "Sindhi", "Punjabi", "English"], 0],
    ["EASY", "Pakistan came into being on:", ["14 August 1947", "23 March 1940", "25 December 1947", "14 August 1948"], 0],
    ["MEDIUM", "The longest river in Pakistan is the:", ["Jhelum", "Chenab", "Indus", "Ravi"], 2],
    ["MEDIUM", "Who is known as the national poet of Pakistan?", ["Faiz Ahmed Faiz", "Allama Muhammad Iqbal", "Shah Abdul Latif Bhittai", "Hafeez Jalandhari"], 1],
  ],
};

const PAGES: Record<string, [string, string]> = {
  "privacy-policy": [
    "Privacy Policy",
    `> Draft policy — have it reviewed by a qualified legal adviser before launch.

## What we collect
- Account details: name, email, mobile number, password (stored only as a secure hash).
- Student details: city, district, school or college, class, date of birth, and parent/guardian details for students under 18.
- Competition records: registrations, payments (transaction references only — never card numbers or PINs), examination answers, results and integrity logs.

## Why we use it
To run competitions, verify eligibility and identity, process payments, deliver examinations, publish results and prizes, and contact you about your account. We send marketing emails only if you subscribe, and you can unsubscribe at any time.

## Public information
Leaderboards show your first name and last initial unless you choose your full name. Winners' full names, schools and photos are published only with consent (and a guardian's consent for students under 18).

## Sharing
We do not sell personal data. We share data only with service providers needed to run the platform (such as payment gateways and email delivery) or when required by law.

## Retention & security
Records are kept as long as needed for competition integrity, accounting and legal obligations. Access is restricted by role and every administrative change is logged.

## Your rights
Contact us to access or correct your data, or to ask for your account to be closed.`,
  ],
  terms: [
    "Terms and Conditions",
    `> Draft terms — have them reviewed by a qualified legal adviser before launch.

## About the service
Parwaz Testing Service runs paid online academic competitions. Prizes are awarded for academic performance according to each competition's published rules; participation is not a lottery or a game of chance.

## Accounts
You must provide accurate information and keep your password private. Students under 18 need a parent or guardian's consent. We may suspend accounts that break these terms.

## Registration and fees
A registration is confirmed only after payment is verified. Fees are subject to the Refund Policy.

## Examinations and integrity
You must attempt examinations yourself without assistance. We may withhold or disqualify results after reviewing irregular activity.

## Results and prizes
Results are published after verification. Prize allocation is subject to the competition rules, eligibility checks and identity verification. Prize values are estimates and devices may vary by model.

## Liability
We work to keep the platform available but cannot guarantee uninterrupted service. Where a verified technical failure on our side prevents an attempt, we may allow a re-attempt.

## Changes
We may update these terms; material changes will be announced on the website.`,
  ],
  "refund-policy": [
    "Refund Policy",
    `> Draft policy — review before launch.

- **Before the examination window opens:** request a refund through Help & Support. Approved refunds are returned to the original payment account, less any non-refundable transaction charges.
- **After you start the examination:** registration fees are not refundable.
- **If we cancel a competition:** all confirmed registrations are refunded in full.
- **Duplicate or incorrect payments:** refunded in full once verified.
- **Payments received after a registration was cancelled:** refunded in full.

Refunds are usually processed within 10 working days of approval. Your refund status is shown under **My payments**.`,
  ],
  "competition-rules": ["Competition Rules", RULES],
};

const FAQS: [string, string, string][] = [
  ["GENERAL", "What is Parwaz Testing Service?", "An online academic testing platform for students across Sindh. You register for a competition, sit a timed online exam, and the highest-ranked students receive laptops and Chromebooks after verification."],
  ["GENERAL", "Who can take part?", "Students of Class 9, 10, 11, 12 and Intermediate studying in Sindh, unless a competition states otherwise. Students under 18 need a parent or guardian's consent."],
  ["REGISTRATION", "How much does it cost?", "The first competition's registration fee is PKR 500. Each competition shows its fee before you register."],
  ["PAYMENT", "How can I pay?", "By JazzCash, Easypaisa or bank transfer — submit your transaction ID and our team verifies it, usually within 24 hours. Online card/wallet checkout will be added once our payment gateway is activated."],
  ["EXAM", "Can I take the exam on my phone?", "Yes. The exam works on Android phones and computers with a modern browser. A stable connection helps, but answers are saved automatically and sync after a connection drop."],
  ["EXAM", "What happens if my internet disconnects?", "Keep answering — your answers are stored on your device and sent when you reconnect. The timer is controlled by our server and keeps running, and the exam submits automatically at the end."],
  ["RESULTS", "How are ties decided?", "By the published tie-breaking rules: fewer incorrect answers, then less time taken, then earlier submission, then earlier registration."],
  ["RESULTS", "When will results be published?", "After every submission has been verified and the merit list approved by our team. You'll be notified in your dashboard and by email."],
  ["PRIZES", "How are prizes allocated?", "In the first competition, ranks 1–10 are eligible for a laptop and ranks 11–30 for a Chromebook. Winners must complete identity and eligibility verification before prizes are confirmed."],
  ["PRIZES", "Where are prizes given?", "At award ceremonies in major cities of Sindh, or by secure delivery where attending is not possible."],
];

async function main() {
  for (const [name, description] of ROLES) {
    await db.role.upsert({ where: { name }, create: { name, description }, update: { description } });
  }
  const role = async (name: string) => (await db.role.findUniqueOrThrow({ where: { name } })).id;

  // ── Demo accounts (credentials from .env; never printed) ──
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    const existing = await db.user.findUnique({ where: { email: adminEmail } });
    if (!existing) {
      await db.user.create({
        data: {
          email: adminEmail,
          fullName: "Demo Administrator",
          phone: "03000000000",
          passwordHash: await bcrypt.hash(adminPassword, 12),
          emailVerifiedAt: new Date(),
          mustChangePassword: true,
          isDemo: true,
          referralCode: `ADM${randomBytes(3).toString("hex").toUpperCase()}`,
          roles: { create: [{ roleId: await role("SUPER_ADMIN") }] },
        },
      });
      console.log(`✓ Super admin created (${adminEmail}) — password is SEED_ADMIN_PASSWORD in .env; you'll be asked to change it.`);
    }
  } else console.warn("! SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set — no admin account created.");

  const studentEmail = process.env.SEED_STUDENT_EMAIL;
  const studentPassword = process.env.SEED_STUDENT_PASSWORD;
  if (studentEmail && studentPassword && !(await db.user.findUnique({ where: { email: studentEmail } }))) {
    await db.user.create({
      data: {
        email: studentEmail,
        fullName: "Demo Student",
        phone: "03000000001",
        passwordHash: await bcrypt.hash(studentPassword, 12),
        emailVerifiedAt: new Date(),
        isDemo: true,
        referralCode: `DEMO${randomBytes(2).toString("hex").toUpperCase()}`,
        roles: { create: [{ roleId: await role("STUDENT") }] },
        profile: {
          create: {
            city: "Hyderabad",
            district: "Hyderabad",
            institution: "Demo Higher Secondary School",
            classLevel: "CLASS_10",
            dateOfBirth: new Date("2009-03-10T00:00:00Z"),
            guardianName: "Demo Guardian",
            guardianPhone: "03000000002",
            guardianRelation: "Father",
            guardianConsentAt: new Date(),
            termsAcceptedAt: new Date(),
          },
        },
      },
    });
    console.log(`✓ Demo student created (${studentEmail}) — password is SEED_STUDENT_PASSWORD in .env.`);
  }

  // ── Question bank (sample questions, flagged isDemo) ──
  const questionIds: number[] = [];
  for (const [category, items] of Object.entries(QUESTIONS)) {
    const cat = await db.questionCategory.upsert({ where: { name: category }, create: { name: category }, update: {} });
    for (const [difficulty, text, options, correct] of items) {
      const existing = await db.question.findFirst({ where: { text, categoryId: cat.id } });
      const q =
        existing ??
        (await db.question.create({
          data: {
            categoryId: cat.id,
            type: "MCQ",
            text,
            difficulty,
            marks: 1,
            isDemo: true,
            options: { create: options.map((o, i) => ({ text: o, isCorrect: i === correct, sortOrder: i })) },
          },
        }));
      questionIds.push(q.id);
    }
  }
  const english = await db.questionCategory.findUniqueOrThrow({ where: { name: "English" } });
  const essay = "In 3–4 sentences, explain why reading regularly helps a student learn. (Sample manual-review question)";
  if (!(await db.question.findFirst({ where: { text: essay } }))) {
    await db.question.create({
      data: { categoryId: english.id, type: "SHORT_ANSWER", text: essay, explanation: "Award up to 2 marks for a clear, relevant explanation.", difficulty: "MEDIUM", marks: 2, isDemo: true },
    });
  }

  // ── Initial competition (real configuration; question pool to be filled with reviewed questions) ──
  const mainSlug = "sindh-academic-talent-challenge-2027";
  let main = await db.competition.findUnique({ where: { slug: mainSlug } });
  if (!main) {
    main = await db.competition.create({
      data: {
        slug: mainSlug,
        title: "Sindh Academic Talent Challenge 2027",
        summary: "Our first province-wide online competition for Class 9–12 students in Sindh. Top 10 win laptops; the next 20 win Chromebooks.",
        description: `The **Sindh Academic Talent Challenge** is Parwaz Testing Service's first academic competition, open to secondary and higher-secondary students across all districts of Sindh.

Students sit one timed, online multiple-choice examination covering Mathematics, Physics, Chemistry, Biology, English and General Knowledge, pitched at Matric and Intermediate level.

- **Entry fee:** PKR 500
- **Format:** 100 multiple-choice questions in 90 minutes, taken online during the examination window
- **Prizes:** 10 laptops (ranks 1–10) and 20 Chromebooks (ranks 11–30)
- **Recognition:** award ceremonies in major cities of Sindh

We aim for 1,500 registrations for this first competition — a target, not a guarantee.`,
        subjects: "Mathematics, Physics, Chemistry, Biology, English, General Knowledge",
        eligibilityText: `- Currently enrolled in **Class 9, 10, 11 or 12**, or an **Intermediate** student (including private candidates).
- Studying or living in **Sindh**.
- Students under 18 must have a parent or guardian's consent.
- One registration per student. Staff of Parwaz Testing Service and their immediate families may take part but are not eligible for prizes.`,
        rules: RULES,
        tieBreakPolicy: TIE_BREAK,
        eligibleProvince: "Sindh",
        registrationFee: 500,
        targetRegistrations: 1500,
        registrationOpensAt: pkt("2026-11-01T00:00:00"),
        registrationClosesAt: pkt("2027-01-15T23:59:00"),
        examStartsAt: pkt("2027-01-24T10:00:00"),
        examEndsAt: pkt("2027-01-24T22:00:00"),
        durationMinutes: 90,
        questionCount: 100,
        marksPerQuestion: 1,
        totalMarks: 100,
        negativeMarking: 0,
        randomizeQuestions: true,
        randomizeOptions: true,
        status: "PUBLISHED",
        eligibleClasses: { create: CLASSES.map((classLevel) => ({ classLevel })) },
        prizes: {
          create: [
            { title: "Laptop", category: "LAPTOP", description: "A laptop suitable for study and coursework", rankFrom: 1, rankTo: 10, quantity: 10, estimatedUnitValue: 30000, sortOrder: 0 },
            { title: "Chromebook", category: "CHROMEBOOK", description: "A Chromebook for online learning", rankFrom: 11, rankTo: 30, quantity: 20, estimatedUnitValue: 10000, sortOrder: 1 },
          ],
        },
      },
    });
    console.log("✓ Initial competition created (add 100+ reviewed questions to its pool before the exam).");
  }

  // ── Practice round (DEMO) using the sample questions ──
  const practiceSlug = "practice-round-demo";
  if (!(await db.competition.findUnique({ where: { slug: practiceSlug } }))) {
    await db.competition.create({
      data: {
        slug: practiceSlug,
        title: "Practice Round (Demo)",
        summary: "A free 10-question practice test using sample questions — try the exam interface before the real competition. Not ranked, no prizes.",
        description: "This **demo practice round** lets you experience the examination interface: the server timer, autosave, question palette and mark-for-review. Questions are samples. Your score is shown immediately and is **not** ranked.",
        subjects: "Mathematics, Physics, Chemistry, Biology, English, General Knowledge",
        eligibilityText: "Open to every registered student. Free of charge.",
        rules: "Practice only. Results are not ranked and no prizes are awarded. Integrity logging works exactly as in real competitions.",
        tieBreakPolicy: TIE_BREAK,
        registrationFee: 0,
        registrationOpensAt: pkt("2026-11-01T00:00:00"),
        registrationClosesAt: pkt("2027-12-31T23:59:00"),
        examStartsAt: pkt("2026-11-01T00:00:00"),
        examEndsAt: pkt("2027-12-31T23:59:00"),
        durationMinutes: 15,
        questionCount: 10,
        marksPerQuestion: 1,
        totalMarks: 10,
        negativeMarking: 0,
        maxAttempts: 3,
        randomizeQuestions: true,
        randomizeOptions: true,
        showInstantResults: true,
        isDemo: true,
        status: "PUBLISHED",
        eligibleClasses: { create: CLASSES.map((classLevel) => ({ classLevel })) },
        questions: { create: questionIds.map((questionId) => ({ questionId })) },
      },
    });
    console.log("✓ Practice round (demo) created with sample questions.");
  }

  // ── Website content ──
  for (const [slug, [title, body]] of Object.entries(PAGES)) {
    await db.contentPage.upsert({ where: { slug }, create: { slug, title, body }, update: {} });
  }
  if ((await db.faqItem.count()) === 0) {
    await db.faqItem.createMany({ data: FAQS.map(([category, question, answer], i) => ({ category, question, answer, sortOrder: i })) });
  }
  if ((await db.testimonial.count()) === 0) {
    await db.testimonial.createMany({
      data: [
        { name: "Sample student A", role: "Class 10 student, Hyderabad (illustrative)", quote: "Practising under a real timer showed me exactly where I lose time. I feel much more prepared for my board exams.", isSample: true, isPublished: true, sortOrder: 0 },
        { name: "Sample parent", role: "Parent, Larkana (illustrative)", quote: "The rules and prizes were clear before we paid, and I could see my daughter's registration and receipt online.", isSample: true, isPublished: true, sortOrder: 1 },
        { name: "Sample student B", role: "First-year student, Mirpurkhas (illustrative)", quote: "I took the practice round on my phone and my answers saved even when the internet dropped.", isSample: true, isPublished: true, sortOrder: 2 },
      ],
    });
  }

  // ── Preliminary financial model (projections only) ──
  if ((await db.financialProjection.count()) === 0) {
    await db.financialProjection.createMany({
      data: [
        { competitionId: main.id, type: "REVENUE", category: "REGISTRATION_FEES", label: "Registration revenue (1,500 × PKR 500)", amount: 750000, sortOrder: 0 },
        { competitionId: main.id, type: "EXPENSE", category: "PRIZE_PURCHASE", label: "Prize expenditure (10 laptops + 20 Chromebooks)", amount: 500000, sortOrder: 1 },
        { competitionId: main.id, type: "EXPENSE", category: "PLATFORM_TECH", label: "Platform and technical setup", amount: 50000, sortOrder: 2 },
        { competitionId: main.id, type: "EXPENSE", category: "MARKETING", label: "Marketing and promotion", amount: 60000, sortOrder: 3 },
        { competitionId: main.id, type: "EXPENSE", category: "ADMINISTRATION", label: "Administration and testing", amount: 40000, sortOrder: 4 },
        { competitionId: main.id, type: "EXPENSE", category: "PAYMENT_PROCESSING", label: "Payment processing and support", amount: 25000, sortOrder: 5 },
        { competitionId: main.id, type: "EXPENSE", category: "CONTINGENCY", label: "Contingency", amount: 25000, sortOrder: 6 },
      ],
    });
  }

  if ((await db.announcement.count()) === 0) {
    await db.announcement.create({
      data: {
        type: "BANNER",
        title: "Registration is open for the Sindh Academic Talent Challenge 2027 — PKR 500 entry, laptops & Chromebooks for the top 30.",
        body: "",
        linkUrl: `/competitions/${mainSlug}`,
        linkLabel: "Register now",
        isPublished: true,
        competitionId: main.id,
      },
    });
  }
  console.log("✓ Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
