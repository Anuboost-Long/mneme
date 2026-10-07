import { ActionOutput, ActionScope } from "@/features/ai-actions/lib/action/types";

import { PackArea, type CatalogPack } from "./types";

const page = ActionScope.Page;
const wholeModule = ActionScope.Module;
const wholeCourse = ActionScope.Course;
const preview = ActionOutput.Preview;
const insert = ActionOutput.InsertBelow;
const newPage = ActionOutput.NewPage;

type Entry = [name: string, prompt: string, scope?: ActionScope, output?: ActionOutput];

function pack(
  key: string,
  name: string,
  area: PackArea,
  icon: string,
  description: string,
  entries: Entry[]
): CatalogPack {
  return {
    key,
    name,
    area,
    icon,
    description,
    actions: entries.map(([name, prompt, scope = page, output = preview]) => ({
      name,
      prompt,
      icon,
      scope,
      output,
      pageTypes: null
    }))
  };
}

export const packCatalog: CatalogPack[] = [
  pack(
    "study-essentials",
    "Study Essentials",
    PackArea.Study,
    "cards",
    "Flashcards, quizzes, study plans and mind maps for any subject.",
    [
      [
        "Create flashcards",
        "Turn this content into question-and-answer flashcards, one fact per card, as a two-column table (Front, Back)."
      ],
      [
        "Create practice quiz",
        "Write 10 multiple-choice questions on this content, mixing recall and understanding, with an answer key and a one-line reason for each answer at the end."
      ],
      [
        "Make a study plan",
        "Make a study plan for this module: split the material into short sessions, put the hardest topics early, and add a review session for each topic two days and a week later.",
        wholeModule,
        newPage
      ],
      [
        "Explain like I'm new",
        "Explain this content to someone with no background in the subject, using an everyday analogy, then restate it once more precisely."
      ],
      [
        "Find gaps in my notes",
        "Read these notes and list what seems missing, unclear or possibly wrong, with a question I could ask or look up for each."
      ],
      [
        "Make a mind map",
        "Turn this content into a mind map as a nested bulleted list: the main idea at the top, then branches and sub-branches.",
        page,
        insert
      ]
    ]
  ),
  pack(
    "lecture",
    "Lecture",
    PackArea.Study,
    "mic",
    "Turn lecture transcripts into notes, definitions and revision sheets.",
    [
      [
        "Create lecture notes",
        "Turn this lecture transcript into structured notes with headings for each topic, key points, examples the lecturer gave, and anything they stressed as important or examinable.",
        page,
        newPage
      ],
      [
        "Extract definitions",
        "List every term this lecture defines or relies on, with a short definition of each in the lecturer's sense."
      ],
      [
        "Find what will be assessed",
        "List everything in this lecture the lecturer mentioned as assessed, important, or likely to come up, with the words they used."
      ],
      [
        "Create revision sheet",
        "Make a one-page revision sheet for these lectures: the key ideas, formulas or dates, definitions, and the links between topics.",
        wholeModule,
        newPage
      ],
      [
        "Questions to ask",
        "List questions a student could ask the lecturer or tutor about this lecture, focusing on the parts that are skipped quickly or left unclear."
      ]
    ]
  ),
  pack(
    "exam-prep",
    "Exam Prep",
    PackArea.Study,
    "checklist",
    "Predict questions, sit mock exams and get your answers marked.",
    [
      [
        "Predict exam questions",
        "From this course content, write the questions most likely to appear in an exam, grouped by topic, and mark which are short-answer and which are essay or long-answer.",
        wholeCourse,
        newPage
      ],
      [
        "Mock exam",
        "Write a mock exam on this module: a mix of short-answer and longer questions with marks for each, and a separate marking guide at the end.",
        wholeModule,
        newPage
      ],
      [
        "Mark my answer",
        "This content contains a question and my answer. Mark my answer as an examiner would: what earns marks, what's missing, and how to improve it. Don't rewrite the answer for me."
      ],
      [
        "Last-minute summary",
        "Write a last-minute review of this course: only the most important ideas, formulas, definitions and common mistakes, in under two pages.",
        wholeCourse,
        newPage
      ],
      [
        "Common mistakes",
        "List the mistakes and misconceptions students commonly have about this topic, and the correct idea for each."
      ]
    ]
  ),
  pack(
    "mathematics",
    "Mathematics",
    PackArea.MathsData,
    "calculator",
    "Work through problems and proofs, and collect formulas.",
    [
      [
        "Solve step by step",
        "Solve this problem step by step, saying which rule or theorem each step uses. Write formulas in plain text."
      ],
      [
        "Explain this proof",
        "Explain this proof line by line: what each step does, why it's allowed, and the overall strategy."
      ],
      [
        "Similar practice problems",
        "Write 5 problems like this one, from easier to harder, with answers at the end."
      ],
      [
        "Check my working",
        "Check my working on this problem. Point to the first line that is wrong, if any, and explain why, without solving the rest for me."
      ],
      [
        "Formula sheet",
        "Collect every formula, theorem and identity in this module into a formula sheet, each with what its symbols mean and when to use it.",
        wholeModule,
        newPage
      ],
      [
        "Explain the intuition",
        "Explain the intuition behind this concept: what it means geometrically or in the real world, before the formal definition."
      ]
    ]
  ),
  pack(
    "statistics",
    "Statistics and Data",
    PackArea.MathsData,
    "chart",
    "Choose methods, read results and spot flawed data.",
    [
      [
        "Which test should I use?",
        "For the data and question described here, say which statistical test or method fits, why, what its assumptions are, and what would change the choice."
      ],
      [
        "Interpret these results",
        "Interpret these statistical results in plain language: what they show, what they don't, and how confident we can be."
      ],
      [
        "Spot the flaws",
        "Look for problems in how this data was collected, analysed or presented: bias, confounders, misleading charts, or conclusions the data doesn't support."
      ],
      [
        "Explain the method",
        "Explain this statistical method: what it does, when to use it, its assumptions, and a small worked example."
      ],
      [
        "Worked example",
        "Make up a small data set and work through this method on it, step by step."
      ]
    ]
  ),
  pack(
    "physics",
    "Physics",
    PackArea.Sciences,
    "sparkle",
    "Solve problems with units, derive equations and explain principles.",
    [
      [
        "Solve with units",
        "Solve this physics problem step by step: list the knowns, choose the principle, carry units through every step, and check the answer's size makes sense."
      ],
      [
        "Explain the principle",
        "Explain the physical principle here, with an everyday example and the equation that describes it."
      ],
      [
        "Derive the equation",
        "Derive this equation from first principles, stating each assumption."
      ],
      [
        "Practice problems",
        "Write 5 physics problems on this topic, from easier to harder, with answers at the end."
      ],
      [
        "Equation sheet",
        "List every equation in this module with its symbols, units, and when it applies.",
        wholeModule,
        newPage
      ]
    ]
  ),
  pack(
    "chemistry",
    "Chemistry",
    PackArea.Sciences,
    "flask",
    "Reactions, stoichiometry, compounds and lab reports.",
    [
      [
        "Explain the reaction",
        "Explain this reaction: reactants, products, type of reaction, mechanism where relevant, and why it happens."
      ],
      [
        "Balance and calculate",
        "Balance the equations here and work through any stoichiometry step by step, with units."
      ],
      [
        "Compare compounds",
        "Compare the compounds or elements mentioned here in a table of properties, structure and uses."
      ],
      [
        "Lab report outline",
        "Turn these lab notes into a lab report outline: aim, method, results, discussion points and safety notes.",
        page,
        newPage
      ],
      [
        "Key reactions list",
        "List every reaction in this module with its equation, conditions and type.",
        wholeModule,
        newPage
      ]
    ]
  ),
  pack(
    "biology",
    "Biology",
    PackArea.Sciences,
    "leaf",
    "Processes, structures and the terms that go with them.",
    [
      [
        "Explain the process",
        "Explain this biological process as numbered stages: what happens, where, and why it matters."
      ],
      [
        "Structure and function",
        "For each structure mentioned here, explain what it is and how its structure suits its function."
      ],
      [
        "Compare and contrast",
        "Compare the organisms, cells or processes here in a table of similarities and differences."
      ],
      [
        "Label-the-diagram quiz",
        "Write a quiz describing the parts of the structures here, asking me to name each one, with answers at the end."
      ],
      [
        "Key terms",
        "List every biological term in this module with a short definition and an example.",
        wholeModule,
        newPage
      ]
    ]
  ),
  pack(
    "earth-environment",
    "Earth and Environment",
    PackArea.Sciences,
    "leaf",
    "Earth systems, case studies, maps and sustainability.",
    [
      [
        "Explain the system",
        "Explain this Earth or environmental system: its parts, the flows between them, and what disturbs it."
      ],
      [
        "Causes and effects",
        "Map the causes and effects in this content as a chain, separating natural and human causes."
      ],
      [
        "Case study summary",
        "Summarise this case study: location, what happened, causes, impacts on people and environment, and responses."
      ],
      [
        "Data and maps",
        "Explain how to read the data, maps or figures described here, and what they show."
      ],
      [
        "Sustainability angles",
        "Discuss the sustainability issues here from environmental, economic and social points of view."
      ]
    ]
  ),
  pack(
    "medicine-nursing",
    "Medicine and Nursing",
    PackArea.Health,
    "heart",
    "Conditions, drugs, anatomy and clinical cases, for study.",
    [
      [
        "Condition summary",
        "Summarise this condition for study: cause, pathophysiology, signs and symptoms, diagnosis, treatment, and complications. Say that current clinical guidelines should be checked."
      ],
      [
        "Drug card",
        "Make a study card for each drug here: class, mechanism, uses, main side effects, contraindications and monitoring. Say that doses must be checked in a current formulary."
      ],
      [
        "Clinical case questions",
        "Write a short clinical case based on this content, with questions on assessment, diagnosis and management, and answers at the end."
      ],
      [
        "Mnemonics",
        "Suggest memorable mnemonics for the lists and sequences in this content, and what each letter stands for."
      ],
      [
        "Anatomy breakdown",
        "Break down this anatomy: location, structure, blood and nerve supply, function, and clinical relevance."
      ]
    ]
  ),
  pack(
    "psychology",
    "Psychology",
    PackArea.Health,
    "idea",
    "Theories, studies and how they apply to everyday life.",
    [
      [
        "Theory summary",
        "Summarise this psychological theory: who proposed it, its main claims, the evidence for it, and its criticisms."
      ],
      [
        "Study evaluation",
        "Evaluate this study: aim, method, sample, findings, strengths, limitations and ethics."
      ],
      ["Apply to real life", "Show how the ideas here apply to three everyday situations."],
      [
        "Compare approaches",
        "Compare the approaches or theories here in a table: assumptions, methods, strengths and weaknesses."
      ],
      [
        "Key studies",
        "List every study in this module with its researcher, year, method and main finding.",
        wholeModule,
        newPage
      ]
    ]
  ),
  pack(
    "programming",
    "Programming",
    PackArea.Engineering,
    "code",
    "Explain code, find bugs and practise with exercises.",
    [
      [
        "Explain code",
        "Explain this code: what it does overall, then each part, and any language features a learner may not know."
      ],
      [
        "Find bugs",
        "Look for bugs, edge cases and mistakes in this code. For each, say where it is, what goes wrong, and how to fix it."
      ],
      [
        "Explain the algorithm",
        "Explain this algorithm: the idea behind it, the steps, its time and space complexity, and when to use it."
      ],
      [
        "Practice exercise",
        "Write a programming exercise that practises the concepts here, with a test case and a hidden solution at the end."
      ],
      [
        "Simplify documentation",
        "Rewrite this documentation simply, with a short example of each feature."
      ]
    ]
  ),
  pack(
    "engineering",
    "Engineering",
    PackArea.Engineering,
    "briefcase",
    "Calculations, design trade-offs and how systems fail.",
    [
      [
        "Worked calculation",
        "Work through this engineering calculation step by step: state assumptions, carry units, and check the result is reasonable."
      ],
      [
        "Design trade-offs",
        "List the design options here and compare them on cost, safety, performance and practicality."
      ],
      [
        "Explain the system",
        "Explain how this system or device works, component by component, and how they interact."
      ],
      [
        "Failure analysis",
        "Discuss how this system could fail, the likely causes, and how designers prevent it."
      ],
      [
        "Standards and units",
        "List the quantities, units, constants and any standards mentioned in this module.",
        wholeModule,
        newPage
      ]
    ]
  ),
  pack(
    "history",
    "History",
    PackArea.Humanities,
    "landmark",
    "Timelines, causes, sources and interpretations.",
    [
      [
        "Timeline",
        "Build a timeline of the events in this content: date, event, and why it matters.",
        wholeModule,
        newPage
      ],
      [
        "Causes and consequences",
        "Explain the causes of this event (long-term and immediate) and its short- and long-term consequences."
      ],
      [
        "Analyse a source",
        "Analyse this historical source: origin, purpose, content, context, value and limitations."
      ],
      [
        "Different interpretations",
        "Describe how historians have interpreted this topic differently, and the evidence each side uses."
      ],
      [
        "Key people",
        "List the key people in this module, who they were, and what they did that matters.",
        wholeModule,
        newPage
      ]
    ]
  ),
  pack(
    "literature",
    "Literature",
    PackArea.Humanities,
    "quote",
    "Close reading, themes, characters and essay plans.",
    [
      [
        "Analyse the passage",
        "Analyse this passage: what it says, the techniques the writer uses, and their effect on the reader, quoting short phrases as evidence."
      ],
      ["Themes", "Identify the themes here and how the text develops each one, with evidence."],
      [
        "Character study",
        "Describe each main character: traits, motivations, how they change, and what they represent."
      ],
      [
        "Context",
        "Explain the historical, social and literary context of this text and how it shapes the meaning."
      ],
      [
        "Essay plan",
        "Make an essay plan answering the question here: a thesis, three or four paragraphs with points and evidence, and a conclusion.",
        page,
        newPage
      ]
    ]
  ),
  pack(
    "philosophy",
    "Philosophy",
    PackArea.Humanities,
    "idea",
    "Map arguments, weigh objections and compare thinkers.",
    [
      [
        "Map the argument",
        "Set out the argument here as numbered premises and a conclusion, then say whether it's valid and which premises are weakest."
      ],
      [
        "Objections and replies",
        "Give the strongest objections to this position and how a defender might reply to each."
      ],
      [
        "Explain the concept",
        "Explain this philosophical concept plainly, with an example and a common misunderstanding."
      ],
      [
        "Compare thinkers",
        "Compare the philosophers or positions here on the main question they disagree about."
      ],
      [
        "Thought experiment",
        "Explain the thought experiment here: the setup, what it's meant to show, and how people have responded."
      ]
    ]
  ),
  pack(
    "religious-studies",
    "Religious Studies",
    PackArea.Humanities,
    "study",
    "Teachings, traditions and ethical questions, described fairly.",
    [
      [
        "Summarise the teaching",
        "Summarise this teaching or text neutrally: its main ideas, where it comes from, and how followers understand it."
      ],
      [
        "Compare traditions",
        "Compare how the traditions here approach this question, respectfully and without ranking them."
      ],
      [
        "Key terms",
        "List the key terms in this module with their meaning within the tradition.",
        wholeModule,
        newPage
      ],
      [
        "Ethical issue",
        "Set out the different religious and non-religious views on the ethical issue here, with their reasons."
      ]
    ]
  ),
  pack(
    "economics",
    "Economics",
    PackArea.SocialSciences,
    "chart",
    "Models, diagrams, policies and practice calculations.",
    [
      [
        "Explain the model",
        "Explain this economic model: its assumptions, how it works, what it predicts, and its limits."
      ],
      [
        "Describe the diagram",
        "Describe the economic diagram here in words: the axes, curves, equilibrium, and what happens when it shifts."
      ],
      [
        "Apply to the news",
        "Show how the ideas here apply to a realistic current situation, and what the model would predict."
      ],
      [
        "Policy evaluation",
        "Evaluate the policy here: aims, likely effects, who gains and loses, and the evidence."
      ],
      [
        "Practice calculations",
        "Write 5 calculation questions on this topic (elasticity, GDP, costs and so on), with answers."
      ]
    ]
  ),
  pack(
    "politics-sociology",
    "Politics and Sociology",
    PackArea.SocialSciences,
    "discussion",
    "Theories, perspectives, debates and case studies.",
    [
      [
        "Explain the theory",
        "Explain this social or political theory: its main ideas, thinkers, and criticisms."
      ],
      [
        "Different perspectives",
        "Present how different perspectives would see this issue, fairly and with their reasons."
      ],
      [
        "Debate prep",
        "Prepare both sides of a debate on this topic: the strongest arguments, evidence and rebuttals."
      ],
      ["Case study", "Summarise this case study and connect it to the concepts in the course."],
      [
        "Key concepts",
        "List the key concepts in this module with definitions and an example of each.",
        wholeModule,
        newPage
      ]
    ]
  ),
  pack(
    "law",
    "Law",
    PackArea.SocialSciences,
    "scales",
    "Case briefs, IRAC and statutes, for study rather than advice.",
    [
      [
        "Case brief",
        "Brief this case: facts, issue, decision, reasoning, and its significance. Say that the law should be checked for the current position in the relevant jurisdiction."
      ],
      [
        "Apply IRAC",
        "Work through this problem question using IRAC: issue, rule, application, conclusion. This is for study, not legal advice."
      ],
      [
        "Explain the statute",
        "Explain this statute or provision in plain language: what it requires, who it applies to, and key exceptions."
      ],
      ["Arguments for both sides", "Set out the strongest arguments for each party on this issue."],
      [
        "Case list",
        "List every case in this module with its principle in one line.",
        wholeModule,
        newPage
      ]
    ]
  ),
  pack(
    "business",
    "Business and Management",
    PackArea.Business,
    "briefcase",
    "Frameworks, case studies and presentations.",
    [
      ["SWOT analysis", "Do a SWOT analysis of the organisation or situation here."],
      [
        "Apply the framework",
        "Apply the business framework from this content (for example Porter's Five Forces or PESTLE) to the case here."
      ],
      [
        "Case study answer plan",
        "Plan an answer to this business case: the problem, analysis, options, recommendation and risks.",
        page,
        newPage
      ],
      [
        "Key concepts",
        "List the key business concepts in this module with definitions and a real company example.",
        wholeModule,
        newPage
      ],
      [
        "Presentation outline",
        "Turn this content into a presentation outline: one slide per main point, with speaker notes.",
        page,
        newPage
      ]
    ]
  ),
  pack(
    "accounting-finance",
    "Accounting and Finance",
    PackArea.Business,
    "calculator",
    "Calculations, statements, ratios and journal entries.",
    [
      [
        "Work the calculation",
        "Work through this accounting or finance calculation step by step, showing each figure."
      ],
      [
        "Explain the statement",
        "Explain this financial statement: what each section shows and what the numbers say about the organisation."
      ],
      [
        "Ratio analysis",
        "Calculate and interpret the relevant financial ratios from the figures here."
      ],
      [
        "Journal entries practice",
        "Write 5 transactions on this topic for me to record, with the correct entries at the end."
      ],
      [
        "Explain the standard",
        "Explain this accounting standard or rule plainly, with an example. Say that the current standard should be checked."
      ]
    ]
  ),
  pack(
    "language-learning",
    "Language Learning",
    PackArea.Languages,
    "translate",
    "Vocabulary, grammar, corrections and practice for any language.",
    [
      [
        "Vocabulary list",
        "List the useful vocabulary in this text: word, meaning, part of speech and an example sentence."
      ],
      [
        "Explain the grammar",
        "Explain the grammar points used in this text with simple rules and more examples."
      ],
      [
        "Correct my writing",
        "Correct this text I wrote in the language I'm learning. Show each correction and briefly explain why."
      ],
      ["Graded reader", "Rewrite this text at a simpler level for a learner, keeping the meaning."],
      [
        "Conversation practice",
        "Write a short dialogue using the vocabulary and grammar here, then questions to answer about it."
      ],
      [
        "Pronunciation guide",
        "Give a pronunciation guide for the difficult words here, with syllable stress and sounds a learner usually gets wrong."
      ]
    ]
  ),
  pack(
    "academic-writing",
    "Academic Writing",
    PackArea.Languages,
    "pencil",
    "Feedback, outlines and clearer wording for essays.",
    [
      [
        "Feedback on my draft",
        "Give feedback on this draft as a tutor would: argument, structure, evidence, clarity and style, with specific suggestions. Don't rewrite it for me."
      ],
      [
        "Strengthen the thesis",
        "Suggest how to make the thesis or main argument here clearer and more arguable, with two alternative wordings."
      ],
      [
        "Outline an essay",
        "Outline an essay on the question here: thesis, paragraph-by-paragraph points, and the evidence each needs.",
        page,
        newPage
      ],
      [
        "Paraphrase practice",
        "Show how to paraphrase the key sentences here in my own words, and explain what changed and why it isn't copying."
      ],
      [
        "Tighten the wording",
        "Point out wordy, vague or repetitive sentences here and suggest tighter versions."
      ]
    ]
  ),
  pack(
    "research",
    "Research",
    PackArea.Languages,
    "question",
    "Summarise papers, weigh evidence and compare sources.",
    [
      [
        "Summarise the paper",
        "Summarise this paper: research question, method, findings, and limitations."
      ],
      ["Extract claims", "List the main claims in this text and the evidence offered for each."],
      [
        "Evaluate the evidence",
        "Evaluate the evidence here: sample, method, possible bias, and how strongly it supports the conclusions."
      ],
      [
        "Compare sources",
        "Compare the sources in this module: where they agree, where they disagree, and why.",
        wholeModule,
        newPage
      ],
      [
        "Literature review outline",
        "Outline a literature review from these sources, grouped by theme, with the gaps they leave.",
        wholeModule,
        newPage
      ],
      [
        "Format references",
        "Format the references here in APA 7, and list anything missing from each one."
      ]
    ]
  ),
  pack("music", "Music", PackArea.Arts, "music", "Theory, analysis, composers and ear training.", [
    [
      "Explain the theory",
      "Explain this music theory concept with notation written in text and a familiar song as an example."
    ],
    [
      "Analyse the piece",
      "Analyse this piece: form, harmony, melody, rhythm, texture and context."
    ],
    [
      "Composer or period",
      "Summarise this composer, performer or period: style, key works and influence."
    ],
    [
      "Ear-training plan",
      "Suggest listening and practice exercises for the skills in this content."
    ],
    ["Terms list", "List every musical term in this module with its meaning.", wholeModule, newPage]
  ]),
  pack(
    "art-design",
    "Art and Design",
    PackArea.Arts,
    "palette",
    "Artwork analysis, movements, critiques and briefs.",
    [
      [
        "Analyse the artwork",
        "Analyse the artwork described here: subject, composition, technique, context and meaning."
      ],
      [
        "Movement summary",
        "Summarise this art or design movement: dates, ideas, key artists and works, and what came after it."
      ],
      [
        "Design critique",
        "Critique the design described here: hierarchy, layout, colour, type and how well it serves its purpose."
      ],
      [
        "Project brief",
        "Turn these notes into a project brief: goal, audience, constraints, references and deliverables.",
        page,
        newPage
      ],
      [
        "Artist statement feedback",
        "Give feedback on this artist or design statement: clarity, specificity and voice."
      ]
    ]
  ),
  pack(
    "teaching",
    "Teaching",
    PackArea.Teaching,
    "discussion",
    "Lesson plans, rubrics and differentiation, for tutors and trainee teachers.",
    [
      [
        "Lesson plan",
        "Turn this content into a lesson plan: objectives, starter, main activities, checks for understanding, and a closing task.",
        page,
        newPage
      ],
      ["Differentiate", "Adapt this material for three levels: support, core and extension."],
      [
        "Discussion questions",
        "Write discussion questions on this content, from recall to open-ended."
      ],
      ["Rubric", "Write a marking rubric for the task here with criteria and four levels."],
      [
        "Explain a misconception",
        "List misconceptions learners have about this topic and an activity to address each."
      ]
    ]
  )
];
