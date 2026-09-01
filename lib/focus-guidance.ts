export type FocusGuidanceRequest = {
  id: string;
  kind: "Observe" | "Support" | "Stretch";
  area: string;
  frameworkStatement: string;
  progressionLabel: string | null;
  descriptor: string;
  savedNextStep: string | null;
};

export type FocusTeachingSuggestion = {
  title: string;
  setup: string;
  notice: string;
  questions: string[];
};

export type FocusGuidance = {
  id: string;
  friendlyGoal: string;
  suggestions: [FocusTeachingSuggestion, FocusTeachingSuggestion];
};

type GuidanceTemplate = Omit<FocusGuidance, "id">;

const templates: Array<{
  matches: RegExp;
  guidance: GuidanceTemplate;
}> = [
  {
    matches: /count|number|numeral|quantity|amount|set of objects|one-to-one|same size/i,
    guidance: {
      friendlyGoal:
        "Choose one small number idea to explore, rather than trying to check every number skill at once.",
      suggestions: [
        {
          title: "Count something useful",
          setup:
            "Invite the child to collect or share a small number of everyday objects during play or a routine.",
          notice:
            "Whether they give each object one number word and know when the count is finished.",
          questions: [
            "How many do we need?",
            "How could we check that together?",
          ],
        },
        {
          title: "Make and compare two groups",
          setup:
            "Place two small groups of objects nearby and let the child match, change or label them.",
          notice:
            "Whether they recognise the amount, connect it to a numeral, or explain which groups are the same.",
          questions: [
            "Can you make another group like this one?",
            "Which number could show how many there are?",
          ],
        },
      ],
    },
  },
  {
    matches: /letter|writing|write|name|mark.?making|symbol|print/i,
    guidance: {
      friendlyGoal:
        "Create a real reason to write and notice the meaning the child gives to their marks and letters.",
      suggestions: [
        {
          title: "Add writing to play",
          setup:
            "Offer a small notepad or labels for a familiar role-play purpose such as an order, sign, ticket or list.",
          notice:
            "Whether the child uses letter-like forms, strings of letters or recognisable letters to carry a message.",
          questions: [
            "What does your message say?",
            "Which sound or letter would you like to start with?",
          ],
        },
        {
          title: "Make something that needs a name",
          setup:
            "Invite the child to label a model, picture, place or piece of work so somebody else knows it is theirs.",
          notice:
            "Which letters they choose independently and whether they can explain or read back what they wrote.",
          questions: [
            "How will people know this belongs to you?",
            "Can you show me where your name starts?",
          ],
        },
      ],
    },
  },
  {
    matches: /record|information|source|data|chart|tally|photograph|draw|observ/i,
    guidance: {
      friendlyGoal:
        "Give the child something genuine to investigate, then notice how they capture and explain what they found.",
      suggestions: [
        {
          title: "Record a small discovery",
          setup:
            "Notice something that changes or can be compared, then offer drawing, tallying, photography or marks as ways to record it.",
          notice:
            "Which recording method the child chooses and whether their record communicates the important information.",
          questions: [
            "How could we remember what we found?",
            "What should someone notice when they look at your record?",
          ],
        },
        {
          title: "Find out and explain",
          setup:
            "Use a book, picture, object or knowledgeable person to help answer one question that arises in play.",
          notice:
            "Whether the child can say where the information came from and connect it to what they already observed.",
          questions: [
            "How could we find out?",
            "What helped you know that?",
          ],
        },
      ],
    },
  },
  {
    matches: /pattern|relationship|connection|cycle|predict|compare|sort/i,
    guidance: {
      friendlyGoal:
        "Help the child notice one relationship or repeating idea and explain it in their own words.",
      suggestions: [
        {
          title: "Spot what goes together",
          setup:
            "Offer familiar objects, images or natural materials that can be paired, sorted or connected in more than one way.",
          notice:
            "The relationship the child notices and the reason they give for their choice.",
          questions: [
            "What do you notice about these?",
            "Why do you think those belong together?",
          ],
        },
        {
          title: "What might happen next?",
          setup:
            "Pause during a familiar sequence, story, pattern or investigation and invite a prediction.",
          notice:
            "Whether the child uses a pattern or previous experience to explain what they think will happen.",
          questions: [
            "What do you think comes next?",
            "What makes you think that?",
          ],
        },
      ],
    },
  },
  {
    matches: /listen|speak|conversation|communicat|language|exchange|question/i,
    guidance: {
      friendlyGoal:
        "Look for a natural back-and-forth moment where the child can listen, respond and add an idea.",
      suggestions: [
        {
          title: "Follow their conversation",
          setup:
            "Join the child’s play briefly, comment on what they are doing and leave space for them to respond.",
          notice:
            "Whether they respond to the idea, stay with the topic and add information of their own.",
          questions: [
            "Tell me what is happening here.",
            "What do you think we should do next?",
          ],
        },
        {
          title: "Explain it to someone",
          setup:
            "Invite the child to show a friend or adult how something works, what they made or what they discovered.",
          notice:
            "How clearly they organise their message and adjust it when the listener needs more information.",
          questions: [
            "What does your listener need to know first?",
            "Can you show or tell them one more detail?",
          ],
        },
      ],
    },
  },
  {
    matches: /balance|coordination|gross motor|physical|movement|throw|catch|climb/i,
    guidance: {
      friendlyGoal:
        "Create an inviting movement challenge and notice how the child controls and adjusts their body.",
      suggestions: [
        {
          title: "Build a short movement route",
          setup:
            "Use available spaces or safe objects for stepping, travelling, balancing and changing direction.",
          notice:
            "How the child balances, coordinates movements and adapts when the route becomes more difficult.",
          questions: [
            "How could you move through this part?",
            "What could help you keep your balance?",
          ],
        },
        {
          title: "Move an object with control",
          setup:
            "Offer a ball, beanbag or other familiar object to roll, carry, throw or catch with a partner or target.",
          notice:
            "How the child judges force, direction and body position, and whether control improves across attempts.",
          questions: [
            "What could you change on your next try?",
            "How did you make it go where you wanted?",
          ],
        },
      ],
    },
  },
  {
    matches: /organi[sz]|self.?management|manage|plan|sequence|independent|routine/i,
    guidance: {
      friendlyGoal:
        "Notice how the child plans, keeps track of what they need and responds when something changes.",
      suggestions: [
        {
          title: "Plan before beginning",
          setup:
            "Before a familiar task or play idea, pause and invite the child to decide what they need and what they will do first.",
          notice:
            "Whether they gather useful resources, describe a simple sequence and begin without repeated adult direction.",
          questions: [
            "What will you need?",
            "What are you going to do first?",
          ],
        },
        {
          title: "Pause and reorganise",
          setup:
            "When a genuine small problem arises, give the child time to adjust their plan rather than solving it immediately.",
          notice:
            "Whether they identify the problem, change their approach and return materials or ideas to a workable order.",
          questions: [
            "What is getting in the way?",
            "What could you change so your plan can work?",
          ],
        },
      ],
    },
  },
  {
    matches: /creativ|imagin|pretend|invent|design|express/i,
    guidance: {
      friendlyGoal:
        "Offer an open possibility and notice how the child develops, changes and communicates an original idea.",
      suggestions: [
        {
          title: "Add one open-ended invitation",
          setup:
            "Place a few flexible materials near existing play and let the child decide what they could become.",
          notice:
            "How the child gives materials a purpose, combines ideas and changes the plan as play develops.",
          questions: [
            "What could this become?",
            "What might happen next in your idea?",
          ],
        },
        {
          title: "Solve it in a different way",
          setup:
            "Offer a familiar making or play problem and invite more than one possible response.",
          notice:
            "Whether the child experiments, explains a choice and tries another approach when needed.",
          questions: [
            "Is there another way you could try?",
            "What made you choose that idea?",
          ],
        },
      ],
    },
  },
  {
    matches: /social|collabor|friend|share|relationship|interpersonal|turn/i,
    guidance: {
      friendlyGoal:
        "Look for a genuine shared moment where the child can communicate an idea and respond to someone else.",
      suggestions: [
        {
          title: "Create a shared purpose",
          setup:
            "Offer a task that naturally benefits from two contributions, while allowing the children to choose how to work together.",
          notice:
            "Whether the child shares an idea, listens to another view and helps the shared play continue.",
          questions: [
            "What are you trying to make happen together?",
            "How could both ideas be included?",
          ],
        },
        {
          title: "Repair a small social moment",
          setup:
            "If a minor disagreement appears, pause before stepping in and support the child to explain what they need.",
          notice:
            "Whether they recognise the other person’s perspective and suggest a workable next step.",
          questions: [
            "What would you like them to understand?",
            "What could help both of you continue?",
          ],
        },
      ],
    },
  },
];

const defaultTemplate: GuidanceTemplate = {
  friendlyGoal:
    "Choose one relaxed moment to make this learning visible through what the child does, says or explains.",
  suggestions: [
    {
      title: "Use an everyday moment",
      setup:
        "Look for this learning during familiar play or a routine, and offer one small invitation without turning it into a test.",
      notice:
        "What the child initiates independently, how they explain their thinking and where a light prompt helps.",
      questions: [
        "What are you noticing or trying to do?",
        "Can you show me how you worked that out?",
      ],
    },
    {
      title: "Offer a small variation",
      setup:
        "Add one new resource, choice or gentle challenge to an activity the child already understands.",
      notice:
        "Whether the child transfers the learning, adjusts their approach and can describe what changed.",
      questions: [
        "What is different this time?",
        "What could you try next?",
      ],
    },
  ],
};

function cloneTemplate(id: string, template: GuidanceTemplate): FocusGuidance {
  return {
    id,
    friendlyGoal: template.friendlyGoal,
    suggestions: template.suggestions.map((suggestion) => ({
      ...suggestion,
      questions: [...suggestion.questions],
    })) as [FocusTeachingSuggestion, FocusTeachingSuggestion],
  };
}

export function createFallbackFocusGuidance(
  input: FocusGuidanceRequest
): FocusGuidance {
  const descriptorContext = [
    input.descriptor,
    input.savedNextStep ?? "",
  ].join(" ");
  const fullContext = [
    input.area,
    input.frameworkStatement,
    descriptorContext,
  ].join(" ");
  const match =
    templates.find((template) => template.matches.test(descriptorContext)) ??
    templates.find((template) => template.matches.test(fullContext));

  return cloneTemplate(input.id, match?.guidance ?? defaultTemplate);
}
