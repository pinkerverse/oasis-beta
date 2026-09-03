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

type GuidanceTemplate = Omit<FocusGuidance, "id" | "suggestions"> & {
  suggestions: FocusTeachingSuggestion[];
};

const foundationObjectiveTemplates: Array<{
  matches: RegExp;
  guidance: GuidanceTemplate;
}> = [
  {
    matches: /^organisation$/i,
    guidance: {
      friendlyGoal:
        "Use one familiar, single-step responsibility and find out how little adult signalling the child needs to act on it.",
      suggestions: [
        {
          title: "Fade the gesture",
          setup:
            "During a familiar transition, give one simple request with a gesture. Later, repeat a comparable request in words only and allow quiet processing time.",
          notice:
            "Whether the child attends, begins the requested action and completes it when the visual or gestural cue is reduced.",
          questions: [
            "What is your one job right now?",
            "Can you show me when it is finished?",
          ],
        },
        {
          title: "Own one classroom job",
          setup:
            "Give the child one concrete job with a visible end point, such as taking a named item to its usual place. Show the destination only if needed.",
          notice:
            "Whether they connect the words to the object and action, stay with the job and need a gesture, repetition or no further support.",
          questions: [
            "What do you need to take care of?",
            "Where does it belong?",
          ],
        },
      ],
    },
  },
  {
    matches: /^symbolic expression and exploration$/i,
    guidance: {
      friendlyGoal:
        "Focus on the first link between a real idea and something that stands for it: recognising, making and naming one representation.",
      suggestions: [
        {
          title: "Match a picture to the real thing",
          setup:
            "Photograph three familiar classroom objects or places. Give the child one photo at a time and ask them to find or place it beside what it represents.",
          notice:
            "Whether they recognise the pictured subject, use a meaningful detail to match it and name or indicate the connection.",
          questions: [
            "What do you see that gives you a clue?",
            "Where can we find the real one?",
          ],
        },
        {
          title: "Make it, then tell what it is",
          setup:
            "Offer a small amount of clay, blocks or drawing material and ask the child to make one familiar person, place or object of their choosing.",
          notice:
            "Whether the child gives the representation a stable identity and points to a feature or action that carries that meaning.",
          questions: [
            "Tell me what you made.",
            "Which part helps me know what it is?",
          ],
        },
      ],
    },
  },
  {
    matches: /^reading behaviours and comprehension$/i,
    guidance: {
      friendlyGoal:
        "Use a very familiar book to notice how the child treats pictures, pages and spoken language as sources of story meaning.",
      suggestions: [
        {
          title: "Let the child lead a picture walk",
          setup:
            "Choose a short, familiar book and hand it to the child. Ask them to show you the story using the cover and three selected pages.",
          notice:
            "Whether they orient and turn pages purposefully, identify pictured content and connect talk to what is visible on each page.",
          questions: [
            "What is happening on this page?",
            "What in the picture helped you know?",
          ],
        },
        {
          title: "Find a known moment",
          setup:
            "Name a memorable character, object or event from a recently shared book and ask the child to locate and talk about that page.",
          notice:
            "Whether they use page turning and pictures intentionally, recognise the event and add remembered language or action.",
          questions: [
            "Can you find the part where that happened?",
            "What do you remember about this part?",
          ],
        },
      ],
    },
  },
  {
    matches: /^demonstrates phonological awareness$/i,
    guidance: {
      friendlyGoal:
        "Use a short, highly familiar rhyme so the child can anticipate and join a repeated sound pattern.",
      suggestions: [
        {
          title: "Pause at the repeated part",
          setup:
            "Sing or recite a well-known rhyme twice. On the second turn, pause immediately before the repeated or rhyming word and look expectantly to the child.",
          notice:
            "Whether they anticipate the missing word or sound, preserve the rhythm and join without the adult supplying the answer.",
          questions: [
            "What comes next in our rhyme?",
            "Which part sounded the same again?",
          ],
        },
        {
          title: "Echo a sound pattern",
          setup:
            "Create a playful two- or three-word chant with the same starting sound, using familiar names or objects, and invite the child to echo and add one item.",
          notice:
            "Whether they reproduce the repeated sound, notice when a word does not fit and contribute another sound match.",
          questions: [
            "Can you hear the sound we keep repeating?",
            "What else could we add to our chant?",
          ],
        },
      ],
    },
  },
  {
    matches: /^measurement$/i,
    guidance: {
      friendlyGoal:
        "Create a reason to compare just two objects on one obvious attribute and show how the child decides.",
      suggestions: [
        {
          title: "Choose the one that will work",
          setup:
            "Offer two clearly different objects for a real need, such as choosing the longer ribbon for a parcel or the larger container for a collection.",
          notice:
            "Whether the child attends to the relevant attribute, uses a comparison word and verifies the choice by aligning, lifting or filling.",
          questions: [
            "Which one will work for this job?",
            "How could we put them together to check?",
          ],
        },
        {
          title: "Find a matching comparison",
          setup:
            "Show one reference object and ask the child to find something clearly longer, shorter, heavier, lighter, fuller or emptier from a small selection.",
          notice:
            "Whether they keep the chosen attribute in mind and make a direct, sensible comparison rather than choosing by preference.",
          questions: [
            "What are we comparing this time?",
            "What did you do to decide?",
          ],
        },
      ],
    },
  },
  {
    matches: /^classification & sorting$/i,
    guidance: {
      friendlyGoal:
        "Ask the child to find and justify one clear match before expecting them to invent or switch sorting rules.",
      suggestions: [
        {
          title: "Find each object’s partner",
          setup:
            "Place three visibly different objects in a row and mix in one matching partner for each. Ask the child to make the three pairs.",
          notice:
            "Whether they compare features systematically, match all pairs consistently and can indicate what makes each pair alike.",
          questions: [
            "Which one belongs with this object?",
            "What is the same about this pair?",
          ],
        },
        {
          title: "Return items to matching homes",
          setup:
            "Prepare two or three labelled containers using a real object or clear photo on each, then give the child a small mixed collection to put away.",
          notice:
            "Whether they use the model on each container, correct an obvious mismatch and repeat the matching rule across the collection.",
          questions: [
            "What clue tells you where this belongs?",
            "Can you check whether every item found its match?",
          ],
        },
      ],
    },
  },
  {
    matches: /^number sense$/i,
    guidance: {
      friendlyGoal:
        "Strengthen the stable spoken counting sequence first; accuracy with objects and written numerals can come later.",
      suggestions: [
        {
          title: "Count one repeated action",
          setup:
            "Choose a brief movement the child enjoys, such as jumps, drum taps or pushes, and agree on a small stopping number. Perform one action for each spoken number.",
          notice:
            "How much of the counting sequence is stable, where words are skipped or repeated and whether the child knows when the agreed count is reached.",
          questions: [
            "What number will we stop on?",
            "Which number comes next?",
          ],
        },
        {
          title: "Complete the counting run",
          setup:
            "Begin a familiar count slowly, pause at different points and invite the child to supply the next one or two number words before continuing together.",
          notice:
            "Whether the child anticipates the next number, resumes after a pause and maintains the sequence without relying on visible objects.",
          questions: [
            "I stopped at three—what comes next?",
            "Can you take the count from here?",
          ],
        },
      ],
    },
  },
  {
    matches: /^understands shapes$/i,
    guidance: {
      friendlyGoal:
        "Begin with exact visual matching and ask the child to show which details make two shapes the same.",
      suggestions: [
        {
          title: "Find the exact shape partner",
          setup:
            "Give the child three clear shape cards and a small set containing one identical match for each. Rotate one matching card to make looking necessary.",
          notice:
            "Whether they match the whole shape rather than colour or size and recognise an identical shape after it has been turned.",
          questions: [
            "Which one is exactly the same shape?",
            "What stayed the same when I turned it?",
          ],
        },
        {
          title: "Post shapes through their homes",
          setup:
            "Create two or three clearly shaped openings or outlines and ask the child to choose, turn and place each matching piece.",
          notice:
            "Whether they visually compare before trying, rotate deliberately and correct a mismatch using the shape’s features.",
          questions: [
            "Which home matches this piece?",
            "What could you change if it does not fit yet?",
          ],
        },
      ],
    },
  },
  {
    matches: /^information literacy data$/i,
    guidance: {
      friendlyGoal:
        "Give the child one interesting source and ask for one relevant noticing before expecting them to gather or record information independently.",
      suggestions: [
        {
          title: "Find one useful clue",
          setup:
            "Pose one simple question about a real object, then look together at a close-up photo, short book page or magnified view that contains a visible clue.",
          notice:
            "Whether the child attends to the source, points out a relevant detail and connects that detail to the original question.",
          questions: [
            "What do you notice here that might help us?",
            "What does that clue tell us?",
          ],
        },
        {
          title: "Notice what a second source adds",
          setup:
            "Let the child inspect a familiar object, then show one photograph or illustration of the same subject with a new visible detail.",
          notice:
            "Whether they notice information in each source and can identify one thing the picture reveals or confirms.",
          questions: [
            "What did the real object show us?",
            "What new thing can we notice in the picture?",
          ],
        },
      ],
    },
  },
  {
    matches: /^observing and evaluating making connections$/i,
    guidance: {
      friendlyGoal:
        "Place two concrete examples together and focus on one visible similarity and one visible difference.",
      suggestions: [
        {
          title: "Compare two real examples",
          setup:
            "Choose two related natural objects, tools, constructions or images with an obvious shared feature and difference. Let the child handle or inspect both.",
          notice:
            "Whether they attend to both examples, identify a genuine similarity and difference, and point to evidence for the comparison.",
          questions: [
            "What is the same about these two?",
            "What can you see or feel that is different?",
          ],
        },
        {
          title: "Match an example to its partner",
          setup:
            "Offer one reference example and three possible partners. Ask the child to choose the one most closely connected and explain the visible link.",
          notice:
            "Whether the connection is based on an observable feature and whether the child reconsiders after comparing the alternatives.",
          questions: [
            "Which one is most connected to this, and why?",
            "What do the other choices show differently?",
          ],
        },
      ],
    },
  },
];

// These match the named objective before the broader keyword fallbacks below.
// The activities are intentionally short teaching episodes: the adult creates a
// useful problem, then looks for evidence that separates independent learning
// from learning that only appears after a prompt.
const objectiveTemplates: Array<{
  matches: RegExp;
  guidance: GuidanceTemplate;
}> = [
  {
    matches: /^organisation$/i,
    guidance: {
      friendlyGoal:
        "Set up one small responsibility with a clear finish, then see how much of the plan the child can hold and complete independently.",
      suggestions: [
        {
          title: "Give a two-part classroom job",
          setup:
            "Ask the child to collect two named resources, take them to a specific place and tell you when the job is finished. Give the direction once, without gestures.",
          notice:
            "Whether they remember both items and the destination, begin without another reminder and check that the whole job is complete.",
          questions: [
            "What are the two things you need to remember?",
            "How will you know the job is finished?",
          ],
        },
        {
          title: "Plan, use and reset an area",
          setup:
            "Before entering a familiar area, ask the child to name what they need and what they will do first. At the end, ask them to restore the space for the next person.",
          notice:
            "Whether their chosen resources match the plan, they follow a simple sequence and they can reorganise after an interruption or change.",
          questions: [
            "What will you need first?",
            "What needs to happen so the next person can use this space?",
          ],
        },
      ],
    },
  },
  {
    matches: /^social and emotional intelligence$/i,
    guidance: {
      friendlyGoal:
        "Use one real or pictured social problem to make feelings, impact and a possible repair visible.",
      suggestions: [
        {
          title: "Read the moment from two sides",
          setup:
            "Use two figures or a photo to show a familiar conflict, such as both children wanting the same resource. Ask the child to speak for each person.",
          notice:
            "Whether they name each person’s feeling, connect it to what happened and suggest a response that considers both people.",
          questions: [
            "How might each person be feeling?",
            "What could happen next that would help both of them?",
          ],
        },
        {
          title: "Pause for a real repair",
          setup:
            "When a small social difficulty occurs, pause the action and help the child describe what happened before proposing a repair.",
          notice:
            "Whether they recognise their own impact, listen to the other view and choose a workable way to continue together.",
          questions: [
            "What happened from your point of view?",
            "What could you do now to repair it?",
          ],
        },
      ],
    },
  },
  {
    matches: /^self regulation$/i,
    guidance: {
      friendlyGoal:
        "Plan for one manageable frustration and notice which calming or waiting strategy the child can choose and use.",
      suggestions: [
        {
          title: "Choose a strategy before waiting",
          setup:
            "Before a short, genuine wait, offer two familiar strategies such as choosing another job or using a timer. Let the child choose and carry it through.",
          notice:
            "Whether they accept the limit, use the chosen strategy and return to the original plan without repeated adult regulation.",
          questions: [
            "Which plan will help while you wait?",
            "How will you know it is time to return?",
          ],
        },
        {
          title: "Recover from a just-right setback",
          setup:
            "Offer a familiar task with one solvable difficulty, then pause before helping. If needed, prompt the child to choose a known calming or problem-solving strategy.",
          notice:
            "How they show frustration, whether they can pause and whether they return to the task independently or after one prompt.",
          questions: [
            "What could help your body feel ready to try again?",
            "Which part could you try first?",
          ],
        },
      ],
    },
  },
  {
    matches: /^symbolic expression and exploration$/i,
    guidance: {
      friendlyGoal:
        "Ask the child to carry one idea from a plan into a representation, so you can see how meaning is held and communicated.",
      suggestions: [
        {
          title: "Plan it, make it, explain it",
          setup:
            "Invite the child to say or sketch what they intend to make, provide a small choice of materials, then revisit the plan with the finished work.",
          notice:
            "Which planned features appear, what changes deliberately during making and whether the child can explain what each part represents.",
          questions: [
            "What will someone need to notice in your idea?",
            "What changed between your plan and what you made?",
          ],
        },
        {
          title: "Show the same idea another way",
          setup:
            "After familiar play, ask the child to represent one important part through a drawing, model, movement or short dramatization.",
          notice:
            "Whether the important people, objects or actions transfer into the new form and remain understandable to another person.",
          questions: [
            "Which part of your play are you showing?",
            "How could someone who was not there understand it?",
          ],
        },
        {
          title: "Explain a hidden model",
          setup:
            "Let the child make a small arrangement behind a screen, then ask them to describe it so you or a peer can recreate it without looking.",
          notice:
            "Whether they select defining features, communicate relationships between parts and revise the representation when the listener’s model differs.",
          questions: [
            "Which detail does your listener need first?",
            "What could you explain differently so the models match?",
          ],
        },
        {
          title: "Represent three moments",
          setup:
            "Choose a recent shared event and ask the child to show its beginning, middle and end with three drawings, objects, movements or photographs.",
          notice:
            "Whether each representation carries a distinct part of the event, the sequence is meaningful and the child can connect the parts into a coherent account.",
          questions: [
            "Which moment is important enough to show first?",
            "How will we know these three parts belong together?",
          ],
        },
      ],
    },
  },
  {
    matches: /^reading behaviours and comprehension$/i,
    guidance: {
      friendlyGoal:
        "Use one familiar text for a short meaning-making conversation with a clear retelling, prediction or evidence point.",
      suggestions: [
        {
          title: "Rebuild a familiar story",
          setup:
            "After rereading a known book, give the child three or four key picture cards to place in order and use for a retelling.",
          notice:
            "Whether they preserve the important sequence, include characters and events, and use the pictures rather than adult wording to continue.",
          questions: [
            "Which part has to come first?",
            "What happened that made the next part possible?",
          ],
        },
        {
          title: "Make and check a prediction",
          setup:
            "Pause before a meaningful page, record the child’s prediction in a few words, then read on and compare it with the text and pictures.",
          notice:
            "Whether the prediction draws on a picture or earlier event and whether the child can revise it when new information appears.",
          questions: [
            "What in the book makes you think that?",
            "What would you change now that we know more?",
          ],
        },
      ],
    },
  },
  {
    matches: /^demonstrates emergent writing skills$/i,
    guidance: {
      friendlyGoal:
        "Create a real recipient and purpose for one short message, then notice what the child can write and read back without copying.",
      suggestions: [
        {
          title: "Write a message someone will use",
          setup:
            "Ask the child to make a short sign, label, order or note for a real classroom purpose. Keep an alphabet strip or name card available but do not prescribe what to copy.",
          notice:
            "Whether marks, letter-like forms or known letters carry meaning; which letters are produced independently; and whether the child reads the message back consistently.",
          questions: [
            "Who needs this message and what must it tell them?",
            "Which part can you write without looking?",
          ],
        },
        {
          title: "Make the work identifiable",
          setup:
            "Give the child a finished drawing, model or plan that needs a creator’s name and one identifying label before it is displayed or shared.",
          notice:
            "How accurately they form or sequence the letters in their name and whether they attempt another meaningful word using sounds or known print.",
          questions: [
            "How will visitors know who made this?",
            "What other word would help them understand it?",
          ],
        },
      ],
    },
  },
  {
    matches: /^demonstrates phonological awareness$/i,
    guidance: {
      friendlyGoal:
        "Run one playful sound comparison where the child has to hear, choose and explain a matching sound.",
      suggestions: [
        {
          title: "Sort a tiny sound collection",
          setup:
            "Choose four familiar objects or pictures: three that rhyme or share an initial sound and one that does not. Ask the child to find the odd one out.",
          notice:
            "Whether they attend to sound rather than meaning, identify the shared part and can generate another possible match.",
          questions: [
            "Which words sound the same at the beginning or end?",
            "What else could join this group?",
          ],
        },
        {
          title: "Change one sound in a name",
          setup:
            "Use the child’s name or a familiar word in a playful chant, then replace its first sound and invite the child to continue the game with another word.",
          notice:
            "Whether they isolate the target sound, notice the change and intentionally reproduce or change it themselves.",
          questions: [
            "What sound can you hear first?",
            "What happens if we swap it for this sound?",
          ],
        },
      ],
    },
  },
  {
    matches: /^measurement$/i,
    guidance: {
      friendlyGoal:
        "Give measurement a real purpose: compare one attribute, choose a way to check it and use the result to make a decision.",
      suggestions: [
        {
          title: "Find the one that fits",
          setup:
            "Create a genuine need for an object of the right length, height or capacity, then offer three plausible choices and a repeated non-standard unit for checking.",
          notice:
            "Whether the child compares the same attribute, aligns or repeats the unit consistently and uses the result rather than guessing.",
          questions: [
            "What exactly do we need to measure?",
            "How can we use the same unit to check each choice?",
          ],
        },
        {
          title: "Order three, then prove it",
          setup:
            "Ask the child to arrange three similar objects by one attribute such as length or weight, then provide a tool or direct comparison to test the order.",
          notice:
            "Whether they keep the comparison rule consistent, use appropriate measurement words and revise the order when evidence disagrees.",
          questions: [
            "Where should this one go, and why?",
            "What could we do to prove the order?",
          ],
        },
      ],
    },
  },
  {
    matches: /^classification & sorting$/i,
    guidance: {
      friendlyGoal:
        "Ask the child to create and then change a sorting rule, making the reason for each group visible.",
      suggestions: [
        {
          title: "Sort a mixed-use basket",
          setup:
            "Offer six to ten familiar objects that can be grouped in at least two sensible ways. Ask the child to organise them for a purpose and label the groups.",
          notice:
            "Whether one rule is applied consistently, borderline objects are justified and the child can say what belongs in each group.",
          questions: [
            "What rule are you using for these groups?",
            "Where does this tricky one belong?",
          ],
        },
        {
          title: "Change the rule",
          setup:
            "Start with an existing sort, introduce a new need such as packing by size instead of type, and ask the child to regroup the same objects.",
          notice:
            "Whether they release the first rule, establish a new one and explain what changed without adult placement of the objects.",
          questions: [
            "How could we group the same things differently?",
            "What is the new rule now?",
          ],
        },
      ],
    },
  },
  {
    matches: /^spatial & positional sense$/i,
    guidance: {
      friendlyGoal:
        "Use a small construction or location problem that requires the child to act on and communicate precise positional information.",
      suggestions: [
        {
          title: "Build from spoken directions",
          setup:
            "With three or four familiar objects, describe a simple arrangement using positional words and ask the child to build it without seeing a model.",
          notice:
            "Which positional words they act on accurately, whether relationships are preserved and where one clarification is needed.",
          questions: [
            "Where did you place it in relation to the other object?",
            "How would you tell a friend to copy yours?",
          ],
        },
        {
          title: "Make a route someone can follow",
          setup:
            "Hide or place an object nearby and ask the child to direct you or a peer to it using a simple sketch, model or spoken route.",
          notice:
            "Whether the directions use useful landmarks and positional words, stay in sequence and are revised when the traveller becomes unsure.",
          questions: [
            "What should I pass or stand beside first?",
            "Which direction needs to be clearer?",
          ],
        },
      ],
    },
  },
  {
    matches: /^number sense$/i,
    guidance: {
      friendlyGoal:
        "Choose one number relationship and use it to solve a small practical problem; do not test the whole progression at once.",
      suggestions: [
        {
          title: "Prepare an exact amount",
          setup:
            "Give the child a real job requiring a small stated quantity, such as preparing one item for each of four places. Keep extra objects available so selection matters.",
          notice:
            "Whether they use one number word per object, stop at the requested amount and check by matching or recounting without being told the answer.",
          questions: [
            "How many do we need altogether?",
            "How can you prove there is exactly one for each place?",
          ],
        },
        {
          title: "Change a collection",
          setup:
            "Start with a visible collection of up to five or ten objects, add or remove one or two under a cloth, then reveal it and ask what changed.",
          notice:
            "Whether the child predicts the new amount, represents the change with objects or fingers and explains the relationship between the two quantities.",
          questions: [
            "What do you think the amount is now?",
            "Can you show what changed without starting again?",
          ],
        },
        {
          title: "Match a numeral to a job",
          setup:
            "Place three numeral cards beside a practical classroom job, then ask the child to choose the card that matches the quantity needed and prepare that amount.",
          notice:
            "Whether they connect the written numeral to the spoken number and quantity, stop at the target and correct a mismatch independently.",
          questions: [
            "Which numeral tells us how many to prepare?",
            "How can we check the card and collection match?",
          ],
        },
        {
          title: "Compare without starting over",
          setup:
            "Make two small collections that differ by one or are equal. Ask which has more, less or the same, then move one object and ask what changed.",
          notice:
            "Whether the child uses matching, counting or immediate recognition and can update the comparison after one object moves.",
          questions: [
            "How do you know without me telling you?",
            "What changed when this object moved?",
          ],
        },
      ],
    },
  },
  {
    matches: /^understands shapes$/i,
    guidance: {
      friendlyGoal:
        "Turn shape knowledge into a construction problem where properties—not memorised orientation—help the child decide.",
      suggestions: [
        {
          title: "Choose a shape for a job",
          setup:
            "Offer several two- or three-dimensional shapes for a simple building need, such as a roof, wheel or stable base, including tempting alternatives.",
          notice:
            "Whether the child refers to sides, corners, curves or faces and recognises the shape when it is turned or used in an unfamiliar position.",
          questions: [
            "What about this shape makes it useful here?",
            "Is it still the same shape when I turn it?",
          ],
        },
        {
          title: "Make the target shape another way",
          setup:
            "Give the child smaller shapes, sticks or loose parts and challenge them to compose one target shape in two different ways.",
          notice:
            "Whether they combine and rotate parts deliberately, preserve the target properties and can describe how the two solutions differ.",
          questions: [
            "Which pieces could combine to make it?",
            "What could you move without changing the final shape?",
          ],
        },
      ],
    },
  },
  {
    matches: /^information literacy data$/i,
    guidance: {
      friendlyGoal:
        "Investigate one answerable classroom question and produce one record that another person can actually use.",
      suggestions: [
        {
          title: "Answer a question with a record",
          setup:
            "Agree on one small question, such as which surface makes a car travel furthest. Test three cases and let the child choose drawing, marks, photos or a simple tally to preserve the result.",
          notice:
            "Whether the record corresponds to each observation, keeps the important difference visible and supports an answer to the original question.",
          questions: [
            "What must we record each time so we can compare?",
            "What does your record tell us now?",
          ],
        },
        {
          title: "Consult two useful sources",
          setup:
            "Start with a genuine question from current play, then help the child consult two accessible sources such as an object plus a book, photo or knowledgeable person.",
          notice:
            "Whether they gather relevant information, remember which source contributed each idea and combine the information into a response.",
          questions: [
            "What did this source help us discover?",
            "Did the other source add or change anything?",
          ],
        },
      ],
    },
  },
  {
    matches: /^observing and evaluating making connections$/i,
    guidance: {
      friendlyGoal:
        "Put two related examples side by side and ask the child to identify a meaningful connection, not just name what they see.",
      suggestions: [
        {
          title: "Compare two connected examples",
          setup:
            "Choose two real objects, observations, images or short texts linked to current learning. Ask the child to find one similarity, one difference and a possible reason.",
          notice:
            "Whether they refer to visible evidence, identify a relationship beyond surface appearance and adjust the connection when questioned.",
          questions: [
            "What connects these two examples?",
            "What can you point to that supports your idea?",
          ],
        },
        {
          title: "Connect today with an earlier experience",
          setup:
            "Bring back one photo, object or record from an earlier experience alongside today’s related event and invite the child to explain what is the same or changed.",
          notice:
            "Whether they retrieve relevant prior knowledge, use both sources and describe a relationship such as cause, sequence, growth or change.",
          questions: [
            "What does this remind you of?",
            "What changed, and what might have caused that?",
          ],
        },
      ],
    },
  },
  {
    matches: /^synthesizing and interpreting/i,
    guidance: {
      friendlyGoal:
        "Ask the child to read one simple piece of information and transform its meaning into a different form.",
      suggestions: [
        {
          title: "Read and act on a simple display",
          setup:
            "Use a small class tally, picture graph, photo sequence or poll with a genuine decision attached, such as which resource to prepare more of.",
          notice:
            "Whether the child identifies what the display represents, compares relevant parts and uses the information to justify the decision.",
          questions: [
            "What is this display telling us?",
            "What should we do because of that information?",
          ],
        },
        {
          title: "Change the form, keep the meaning",
          setup:
            "Give one short source such as a photo sequence, audio explanation or picture graph and ask the child to show its main information with objects, a drawing or a spoken explanation.",
          notice:
            "Whether the new representation preserves the main message and whether the child can connect each chosen feature to the source.",
          questions: [
            "What is the most important information to keep?",
            "How does this part show what the source told you?",
          ],
        },
      ],
    },
  },
  {
    matches: /^creative thinking$/i,
    guidance: {
      friendlyGoal:
        "Offer a clear design purpose with room for original choices, then see how the child develops and improves an idea.",
      suggestions: [
        {
          title: "Solve a small design brief",
          setup:
            "Introduce a concrete need in current play—for example, make a bridge for one toy across a gap—and offer a limited set of contrasting materials.",
          notice:
            "Whether the child forms an idea, gives materials an intentional role, tests the result and changes something in response to what happens.",
          questions: [
            "What does your design need to be able to do?",
            "What will you change after that test?",
          ],
        },
        {
          title: "Transform a familiar idea",
          setup:
            "Begin with a familiar model, story or play setup and add one meaningful constraint, such as making it work for two characters or without a usual material.",
          notice:
            "Whether the child moves beyond imitation, combines ideas in a new way and can explain how the change serves the new purpose.",
          questions: [
            "What needs to be different for this new purpose?",
            "Which part of your idea is new today?",
          ],
        },
        {
          title: "Design for someone else",
          setup:
            "Choose a real user—a classmate, puppet or classroom animal—and ask the child to create something that meets one clearly stated need for that user.",
          notice:
            "Whether the child considers the user, makes an original choice for a reason and changes the design after the user tries or comments on it.",
          questions: [
            "What does your user need this to do?",
            "What did you learn when they tried it?",
          ],
        },
        {
          title: "Improve an earlier idea",
          setup:
            "Return a photo or piece from earlier play and introduce one new goal, such as making it stronger, easier to use or able to include another person.",
          notice:
            "Whether the child recalls the original intention, identifies what needs changing and develops the idea rather than simply starting over.",
          questions: [
            "Which part should stay and which part needs changing?",
            "How will the new version work better?",
          ],
        },
      ],
    },
  },
  {
    matches: /^reflection & metacognition$/i,
    guidance: {
      friendlyGoal:
        "Make one before-and-after comparison so the child can name a success, a change and a useful next attempt.",
      suggestions: [
        {
          title: "Compare the first and latest attempt",
          setup:
            "Keep or photograph an early attempt during a familiar task, then place it beside the child’s later attempt for a two-minute reflection.",
          notice:
            "Whether they identify a specific difference, explain what helped and choose a realistic improvement rather than only saying they liked it.",
          questions: [
            "What works better in this attempt?",
            "What did you do that made the difference?",
          ],
        },
        {
          title: "Leave a plan for tomorrow",
          setup:
            "Before stopping an unfinished investigation or construction, ask the child to record one success and one next action with a photo, mark or dictated note.",
          notice:
            "Whether they can return to the idea, use the record to remember their intention and revise the next step when needed.",
          questions: [
            "What should tomorrow-you remember?",
            "What is the first thing you will try next time?",
          ],
        },
      ],
    },
  },
  {
    matches: /^critical thinking & problem solving & information transfer$/i,
    guidance: {
      friendlyGoal:
        "Create a solvable problem with a visible test, so the child can predict, try, inspect evidence and revise.",
      suggestions: [
        {
          title: "Predict, test and revise",
          setup:
            "Choose a familiar cause-and-effect problem, such as moving an object down a ramp or keeping a structure stable. Record the child’s prediction, then test it twice.",
          notice:
            "Whether the prediction is testable, the child attends to what actually happened and the second attempt changes for an evidence-based reason.",
          questions: [
            "What do you predict will happen, and why?",
            "What did the test tell you to change?",
          ],
        },
        {
          title: "Transfer a known strategy",
          setup:
            "Present a new problem that shares one useful feature with a problem the child solved before, but change the materials or context.",
          notice:
            "Whether they recognise the connection, deliberately reuse or adapt the earlier strategy and explain when it does or does not work.",
          questions: [
            "What have you done before that might help here?",
            "What needs changing for this new problem?",
          ],
        },
      ],
    },
  },
  {
    matches: /^positive mindset$/i,
    guidance: {
      friendlyGoal:
        "Use one achievable challenge to observe how the child chooses a strategy, persists and names what helped.",
      suggestions: [
        {
          title: "Choose a challenge strategy",
          setup:
            "Offer a familiar task one step beyond easy and agree on three possible responses before starting: try another way, ask for a clue or pause and return.",
          notice:
            "Whether the child recognises difficulty, selects a strategy instead of abandoning the task and returns after an unsuccessful attempt.",
          questions: [
            "Which strategy will you choose when it gets tricky?",
            "What helped you keep going that time?",
          ],
        },
        {
          title: "Set one reachable improvement",
          setup:
            "After a first attempt, help the child choose one small feature to improve and give enough time for a second attempt immediately.",
          notice:
            "Whether the goal is specific, the second attempt responds to it and the child can describe progress without needing perfect success.",
          questions: [
            "What is one part you want to improve?",
            "What will you try differently this time?",
          ],
        },
      ],
    },
  },
];

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
        "Give the child a clear creative purpose with more than one possible solution, then notice how the idea develops through testing and change.",
      suggestions: [
        {
          title: "Set a small design need",
          setup:
            "Add a concrete need to current play, such as making shelter for a figure or carrying something safely, and offer a limited choice of flexible materials.",
          notice:
            "Whether the child forms a purposeful idea, tests it and changes a material or arrangement because of what happens.",
          questions: [
            "What does your idea need to do?",
            "What will you change after testing it?",
          ],
        },
        {
          title: "Adapt a familiar creation",
          setup:
            "Return to a familiar construction, story or role-play idea and introduce one new user, purpose or constraint that requires a deliberate change.",
          notice:
            "Whether the child retains useful parts, develops something new for the changed purpose and explains the reason for the adaptation.",
          questions: [
            "What can stay the same, and what needs to change?",
            "How does your new version fit the new purpose?",
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
    "Create one short, purposeful teaching moment with a clear problem, then distinguish what the child does independently from what appears after support.",
  suggestions: [
    {
      title: "Model once, then hand it over",
      setup:
        "Choose familiar materials that fit this learning. Briefly model one example, change one feature, then ask the child to complete a comparable example in their own way.",
      notice:
        "Whether the child identifies the relevant feature, transfers the model rather than merely copying it and explains the choice they made.",
      questions: [
        "What from my example might help you?",
        "What did you decide to do differently?",
      ],
    },
    {
      title: "Create a useful problem",
      setup:
        "Set a five-minute classroom or play problem where this learning is needed to reach a visible result. Offer one prompt only after the child has formed a plan.",
      notice:
        "The child’s first plan, the effect of the single prompt and whether they check or improve the result without being told what to do next.",
      questions: [
        "What does your solution need to achieve?",
        "How will you check whether it worked?",
      ],
    },
  ],
};

function cloneTemplate(id: string, template: GuidanceTemplate): FocusGuidance {
  let hash = 2166136261;

  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  const firstSuggestionIndex =
    (hash >>> 0) % template.suggestions.length;
  const secondSuggestionIndex =
    (firstSuggestionIndex + 1) % template.suggestions.length;
  const selectedSuggestions = [
    template.suggestions[firstSuggestionIndex],
    template.suggestions[secondSuggestionIndex],
  ];

  return {
    id,
    friendlyGoal: template.friendlyGoal,
    suggestions: selectedSuggestions.map((suggestion) => ({
      ...suggestion,
      questions: [...suggestion.questions],
    })) as [FocusTeachingSuggestion, FocusTeachingSuggestion],
  };
}

export function createFallbackFocusGuidance(
  input: FocusGuidanceRequest
): FocusGuidance {
  const progressionLevelMatch =
    input.progressionLabel?.match(/level\s+(\d+)/i);
  const progressionLevel = progressionLevelMatch
    ? Number(progressionLevelMatch[1])
    : null;
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
    (progressionLevel === 1
      ? foundationObjectiveTemplates.find((template) =>
          template.matches.test(input.frameworkStatement.trim())
        )
      : undefined) ??
    objectiveTemplates.find((template) =>
      template.matches.test(input.frameworkStatement.trim())
    ) ??
    templates.find((template) =>
      template.matches.test(
        `${input.area} ${input.frameworkStatement}`
      )
    ) ??
    templates.find((template) => template.matches.test(descriptorContext)) ??
    templates.find((template) => template.matches.test(fullContext));

  return cloneTemplate(input.id, match?.guidance ?? defaultTemplate);
}
