import type {
  AssessmentLevelDefinition,
  FrameworkDefinition,
  FrameworkStatement,
} from "./framework.ts";

const evidenceStrengthLevels: AssessmentLevelDefinition[] = [
  {
    id: "evidence-to-gather",
    label: "Evidence to gather",
    description:
      "OASIS does not yet have enough direct evidence to describe this learning confidently.",
    order: 1,
  },
  {
    id: "observed-with-support",
    label: "Observed with support",
    description:
      "The learning is visible with adult modelling, prompting or support.",
    order: 2,
  },
  {
    id: "observed-independently",
    label: "Observed independently",
    description:
      "The learner demonstrates the learning independently in the observed context.",
    order: 3,
  },
  {
    id: "observed-across-contexts",
    label: "Observed across contexts",
    description:
      "The learner demonstrates and transfers the learning across more than one context or occasion.",
    order: 4,
  },
];

type EyfsSpec = {
  id: string;
  area: string;
  text: string;
  birthToThree: string;
  threeAndFour: string;
  reception: string;
  source: string;
};

const eyfsSpecs: EyfsSpec[] = [
  {
    id: "eyfs-cl-listening-attention-understanding",
    area: "Communication and Language",
    text: "Listens, attends and responds with growing understanding.",
    birthToThree:
      "Turns toward familiar voices and sounds, shares attention for short periods and responds to simple words or requests in familiar routines.",
    threeAndFour:
      "Listens to longer stories and conversations, understands two-part instructions and responds to a growing range of questions.",
    reception:
      "Sustains attention across activities, responds relevantly and follows instructions involving several ideas or actions.",
    source: "Development Matters: Communication and Language",
  },
  {
    id: "eyfs-cl-speaking",
    area: "Communication and Language",
    text: "Communicates needs, experiences, ideas and feelings through increasingly connected language.",
    birthToThree:
      "Uses gesture, sound, words and emerging phrases to communicate needs, interests and experiences.",
    threeAndFour:
      "Uses longer sentences and a growing vocabulary to explain, recount and join conversations.",
    reception:
      "Uses new vocabulary and connected sentences to express ideas, explain thinking and participate in back-and-forth exchanges.",
    source: "Development Matters: Communication and Language; EYFS ELG Speaking",
  },
  {
    id: "eyfs-pd-gross-motor",
    area: "Physical Development",
    text: "Moves with increasing balance, coordination, strength and spatial awareness.",
    birthToThree:
      "Develops control through rolling, crawling, walking, climbing and other whole-body movement.",
    threeAndFour:
      "Runs, jumps, climbs, rides and uses balls with increasing balance and coordination.",
    reception:
      "Moves energetically, negotiates space and obstacles and combines movements with control in play and games.",
    source: "Development Matters: Physical Development; EYFS ELG Gross Motor Skills",
  },
  {
    id: "eyfs-pd-fine-motor",
    area: "Physical Development",
    text: "Uses hands, fingers and tools with increasing control and precision.",
    birthToThree:
      "Grasps and manipulates objects, begins to use utensils and explores purposeful mark-making.",
    threeAndFour:
      "Uses one-handed tools, scissors and drawing materials with an increasingly controlled grip.",
    reception:
      "Uses an effective pencil grip and a range of small tools with accuracy, care and control.",
    source: "Development Matters: Physical Development; EYFS ELG Fine Motor Skills",
  },
  {
    id: "eyfs-pd-health-self-care",
    area: "Physical Development",
    text: "Develops independence in health, safety and personal-care routines.",
    birthToThree:
      "Participates in familiar care routines and communicates physical needs and preferences.",
    threeAndFour:
      "Manages dressing, toileting, eating and familiar safety routines with increasing independence.",
    reception:
      "Explains and makes healthy choices and manages personal needs with appropriate independence.",
    source: "Development Matters: Physical Development",
  },
  {
    id: "eyfs-psed-self-regulation",
    area: "Personal, Social and Emotional Development",
    text: "Recognises feelings and regulates attention, emotion and behaviour with increasing independence.",
    birthToThree:
      "Seeks familiar adults for co-regulation and begins to express a range of feelings and preferences.",
    threeAndFour:
      "Names familiar feelings, waits for some needs and responds to support for managing strong emotions.",
    reception:
      "Explains feelings, uses developing regulation strategies and sustains attention toward a shared or chosen goal.",
    source: "Development Matters: PSED; EYFS ELG Self-Regulation",
  },
  {
    id: "eyfs-psed-managing-self",
    area: "Personal, Social and Emotional Development",
    text: "Shows confidence, resilience and growing responsibility for choices and routines.",
    birthToThree:
      "Explores from a secure base, expresses preferences and attempts familiar tasks with support.",
    threeAndFour:
      "Selects activities, follows familiar expectations and persists when tasks are manageable.",
    reception:
      "Tries new activities, explains expectations and shows perseverance and confidence when challenge arises.",
    source: "Development Matters: PSED; EYFS ELG Managing Self",
  },
  {
    id: "eyfs-psed-building-relationships",
    area: "Personal, Social and Emotional Development",
    text: "Builds positive relationships and participates cooperatively with others.",
    birthToThree:
      "Forms attachments, notices other children and begins to take part in interactions and parallel play.",
    threeAndFour:
      "Joins play, takes turns with support and begins to understand another person's feelings or viewpoint.",
    reception:
      "Cooperates, negotiates and forms positive relationships while showing sensitivity to others' needs and feelings.",
    source: "Development Matters: PSED; EYFS ELG Building Relationships",
  },
  {
    id: "eyfs-lit-comprehension",
    area: "Literacy",
    text: "Engages with, understands and discusses stories and information.",
    birthToThree:
      "Enjoys songs, rhymes and books, joins repeated language and responds to familiar pictures or events.",
    threeAndFour:
      "Talks about characters and events, recalls parts of familiar stories and learns new vocabulary from texts.",
    reception:
      "Retells and discusses texts, anticipates events and uses vocabulary and knowledge gained through reading.",
    source: "Development Matters: Literacy; EYFS ELG Comprehension",
  },
  {
    id: "eyfs-lit-word-reading",
    area: "Literacy",
    text: "Develops phonological awareness and applies sound knowledge in early reading.",
    birthToThree:
      "Notices and joins environmental sounds, rhythm, rhyme and repeated language.",
    threeAndFour:
      "Recognises rhyme, counts or claps syllables and begins to notice initial sounds and print.",
    reception:
      "Recognises taught sound-letter correspondences, blends sounds and reads familiar words and simple sentences.",
    source: "Development Matters: Literacy; EYFS ELG Word Reading",
  },
  {
    id: "eyfs-lit-writing",
    area: "Literacy",
    text: "Uses marks, symbols and increasingly recognisable writing to communicate meaning.",
    birthToThree:
      "Explores making marks and gives meaning to some marks, movement and drawings.",
    threeAndFour:
      "Uses marks and letter-like forms for a purpose and begins to write some meaningful letters or a name.",
    reception:
      "Represents sounds with letters and writes recognisable words or simple phrases that can be read by others.",
    source: "Development Matters: Literacy; EYFS ELG Writing",
  },
  {
    id: "eyfs-math-number",
    area: "Mathematics",
    text: "Develops understanding of number, quantity, composition and comparison.",
    birthToThree:
      "Notices quantity, joins counting language and explores small groups through everyday play.",
    threeAndFour:
      "Counts objects with increasing accuracy, recognises small quantities and explores how numbers are composed.",
    reception:
      "Understands numbers to 10 through subitising, composition, comparison and recall of key number facts.",
    source: "Development Matters: Mathematics; EYFS ELG Number",
  },
  {
    id: "eyfs-math-numerical-patterns",
    area: "Mathematics",
    text: "Notices, continues and explains numerical and repeating patterns.",
    birthToThree:
      "Joins number sequences and notices repeated actions, sounds and arrangements.",
    threeAndFour:
      "Recites numbers beyond five, compares groups and continues simple patterns with materials or movement.",
    reception:
      "Counts beyond 20, compares quantities and explores patterns including doubles, odd and even numbers and equal groups.",
    source: "Development Matters: Mathematics; EYFS ELG Numerical Patterns",
  },
  {
    id: "eyfs-math-shape-space-measure",
    area: "Mathematics",
    text: "Explores shape, space and measure through practical problems and play.",
    birthToThree:
      "Explores size, shape, capacity, position and movement through handling objects and moving in space.",
    threeAndFour:
      "Talks about and compares shapes, length, weight, capacity, position and routes in meaningful play.",
    reception:
      "Selects, rotates and composes shapes and uses spatial and measuring language to explain practical reasoning.",
    source: "Development Matters: Mathematics (no separate EYFS ELG)",
  },
  {
    id: "eyfs-utw-past-present",
    area: "Understanding the World",
    text: "Develops understanding of personal history and change over time.",
    birthToThree:
      "Recognises familiar people, routines and experiences and responds to photographs or stories about them.",
    threeAndFour:
      "Talks about personal experiences, family events and changes noticed over time.",
    reception:
      "Compares past and present using personal experience, stories, photographs, artefacts and significant events.",
    source: "Development Matters: Understanding the World; EYFS ELG Past and Present",
  },
  {
    id: "eyfs-utw-people-culture-communities",
    area: "Understanding the World",
    text: "Learns about familiar people, places, cultures and communities.",
    birthToThree:
      "Shows interest in familiar people, places and routines and notices differences in the immediate environment.",
    threeAndFour:
      "Talks about family, occupations, community places and some similarities and differences between people.",
    reception:
      "Describes the immediate environment and recognises similarities and differences among communities, beliefs and ways of life.",
    source: "Development Matters: Understanding the World; EYFS ELG People, Culture and Communities",
  },
  {
    id: "eyfs-utw-natural-world",
    area: "Understanding the World",
    text: "Explores and explains living things, materials, environments and natural change.",
    birthToThree:
      "Explores natural materials and living things through sensory investigation and everyday experience.",
    threeAndFour:
      "Observes plants, animals, materials and forces and talks about changes and care for the environment.",
    reception:
      "Describes environments, living things, materials and processes and notices patterns including seasons and change.",
    source: "Development Matters: Understanding the World; EYFS ELG The Natural World",
  },
  {
    id: "eyfs-ead-creating-materials",
    area: "Expressive Arts and Design",
    text: "Explores, selects and combines materials, tools and techniques to express ideas.",
    birthToThree:
      "Explores sensory properties of sound, movement, colour and materials and makes simple choices.",
    threeAndFour:
      "Experiments with materials and techniques and develops ideas through drawing, modelling, music and construction.",
    reception:
      "Safely selects and combines materials and techniques, refines work and explains the creative process.",
    source: "Development Matters: EAD; EYFS ELG Creating with Materials",
  },
  {
    id: "eyfs-ead-imaginative-expressive",
    area: "Expressive Arts and Design",
    text: "Uses imagination and expression through narrative, role play, music and movement.",
    birthToThree:
      "Joins songs and movement, imitates actions and begins to use objects symbolically in play.",
    threeAndFour:
      "Develops pretend play, remembers songs and explores ways to move, perform and tell stories.",
    reception:
      "Invents and adapts narratives and expresses ideas through sustained role play, music, movement and performance.",
    source: "Development Matters: EAD; EYFS ELG Being Imaginative and Expressive",
  },
];

type HeadStartGoal = {
  id: string;
  goal: string;
  p36: string;
  p48: string;
  by60: string;
};

const headStartGoals: readonly HeadStartGoal[] = [
  {
    "id": "P-ATL 1",
    "goal": "Child manages emotions with increasing independence.",
    "p36": "Manages less intense emotions, such as mild frustration, independently.",
    "p48": "Has an expanding range of strategies for managing emotions, both less intense emotions as well as those that cause greater distress.",
    "by60": "Expresses emotions in ways that are appropriate to the situation. Looks for adult assistance when emotions are most intense."
  },
  {
    "id": "P-ATL 2",
    "goal": "Child follows classroom rules and routines with increasing independence.",
    "p36": "Follows simple rules and routines with assistance from adults, such as hanging up their coat or sitting at the table when asked by an adult.",
    "p48": "Usually follows classroom rules and routines with occasional reminders from adults, such as following an endof-lunch routine that includes putting away their plate, washing hands, and lining up at the door to go outside.",
    "by60": "Demonstrates awareness of classroom rules when asked and is able to follow these rules most of the time. Follows most classroom routines, such as putting away backpack when entering the room or sitting on the rug after outside time."
  },
  {
    "id": "P-ATL 3",
    "goal": "Child appropriately handles and takes care of classroom materials.",
    "p36": "Handles classroom materials, such as putting them where they belong, with adult support.",
    "p48": "Usually handles, takes care of, and manages classroom materials, such as using them in appropriate ways and not throwing them from the sensory table onto the floor.",
    "by60": "Appropriately handles materials during activities. Cleans up and puts materials away appropriately, such as places blocks back on correct shelf or places markers in the correct bin."
  },
  {
    "id": "P-ATL 4",
    "goal": "Child manages actions, words, and behavior with increasing independence.",
    "p36": "Manages own actions, words and behavior with frequent support from adults, such as reminders to use gentle touches and friendly words.",
    "p48": "Manages own actions, words, and behavior with occasional support from adults.",
    "by60": "Demonstrates control over actions and words in response to a challenging situation, such as wanting to use the same materials as another child, or frustration over not being able to climb to the top of a structure. May need support from adults."
  },
  {
    "id": "P-ATL 5",
    "goal": "Child demonstrates an increasing ability to control impulses.",
    "p36": "Frequently engages in impulsive behaviors, but inhibits them when directly supported by an adult.",
    "p48": "Sometimes controls impulses independently, while at other times needs support from an adult.",
    "by60": "Stops an engaging activity to transition to another less desirable activity with adult guidance and support. Delays having desires met, such as agreeing to wait turn to start an activity."
  },
  {
    "id": "P-ATL 6",
    "goal": "Child maintains focus and sustains attention with minimal adult support.",
    "p36": "With adult support, focuses attention on tasks and experiences for short periods of time, despite interruptions or distractions.",
    "p48": "With increasing independence, focuses attention on tasks and experiences for longer periods of time, despite interruptions or distractions.",
    "by60": "Maintains focus on activities for extended periods of time, such as 15 minutes or more. Engages in purposeful play for extended periods of time."
  },
  {
    "id": "P-ATL 7",
    "goal": "Child persists in tasks.",
    "p36": "Persists on preferred tasks when presented with small challenges with or without adult support, such as continuing to try to build a tall tower with blocks, even when some pieces fall.",
    "p48": "Frequently persists on preferred tasks.",
    "by60": "Completes tasks that are challenging or less preferred despite frustration, either by persisting independently or seeking help from an adult or other child. Returns with focus to an activity or project after having been away from it."
  },
  {
    "id": "P-ATL 8",
    "goal": "Child holds information in mind and manipulates it to perform tasks.",
    "p36": "Holds small amounts of information in mind, such as two-step directions, to successfully complete simple tasks.",
    "p48": "Holds an increasing amount of information in mind in order to successfully complete tasks.",
    "by60": "Accurately recounts recent experiences in the correct order and includes relevant details. Successfully follows detailed, multi-step directions, sometimes with reminders."
  },
  {
    "id": "P-ATL 9",
    "goal": "Child demonstrates flexibility in thinking and behavior.",
    "p36": "Demonstrates flexibility, or the ability to switch gears, in thinking and behavior when prompted by an adult, such as trying a new way to climb a structure when the first attempt does not work.",
    "p48": "Demonstrates flexibility in thinking and behavior without prompting at times.",
    "by60": "Tries different strategies to complete work or solve problems including with other children. Applies different rules in contexts that require different behaviors, such as using indoor voices or feet instead of outdoor voices or feet."
  },
  {
    "id": "P-ATL 10",
    "goal": "Child demonstrates initiative and independence.",
    "p36": "Regularly shows initiative, particularly in interactions with familiar adults.",
    "p48": "Frequently shows initiative, particularly when engaged in preferred activities.",
    "by60": "Engages in independent activities. Makes choices and communicates these to adults and other children."
  },
  {
    "id": "P-ATL 11",
    "goal": "Child shows interest in and curiosity about the world around them.",
    "p36": "Seeks out new information and explores new play and tasks with adult support.",
    "p48": "Seeks out new information and explores new play and tasks both independently and with adult support.",
    "by60": "Asks questions and seeks new information. Is willing to participate in new activities or experiences even if they are perceived as challenging."
  },
  {
    "id": "P-ATL 12",
    "goal": "Child expresses creativity in thinking and communication.",
    "p36": "Responds to adults’ prompts to express creative ideas in words and/or actions.",
    "p48": "Communicates creative ideas and actions both with and without prompting from adults.",
    "by60": "Asks questions related to tasks or activities that indicate thinking about new ways to accomplish the task or activity. Approaches tasks, activities, and play in ways that show creative problem solving."
  },
  {
    "id": "P-ATL 13",
    "goal": "Child uses imagination in play and interactions with others.",
    "p36": "Consistently uses imagination in play and other creative works.",
    "p48": "Develops more elaborate imaginary play, stories, and other creative works with children and adults.",
    "by60": "Engages in social and pretend play. Uses imagination with materials to create stories or works of art."
  },
  {
    "id": "P-SE 1",
    "goal": "Child engages in and maintains positive relationships and interactions with adults.",
    "p36": "Engages in positive interactions with adults, such as by demonstrating affection or talking about ideas.",
    "p48": "Clearly shows enjoyment in interactions with trusted adults while also demonstrating skill in separating from these adults with minimal distress when in a familiar setting.",
    "by60": "Interacts readily with trusted adults. Engages in some positive interactions with less familiar adults, such as parent volunteers."
  },
  {
    "id": "P-SE 2",
    "goal": "Child engages in prosocial and cooperative behavior with adults.",
    "p36": "Sometimes engages in prosocial behavior with adults, such as greeting the teacher or saying goodbye, and responds to adult requests and directions that may include assistance or prompting.",
    "p48": "Often engages in prosocial behavior with adults and usually responds appropriately to adult requests and directions without significant assistance or prompting.",
    "by60": "Engages in prosocial behaviors with adults, such as using respectful language or greetings. Attends to an adult when asked."
  },
  {
    "id": "P-SE 3",
    "goal": "Child engages in and maintains positive interactions and relationships with other children.",
    "p36": "Sometimes engages in and maintains interactions with other children without support from an adult, or demonstrates skills in doing this when prompted by an adult.",
    "p48": "Sustains interactions with other children more often and for increasing periods of time.",
    "by60": "Engages in and maintains positive interactions with other children. Uses a variety of skills for entering social situations with other children, such as suggesting something to do together, joining an existing activity, or sharing a toy."
  },
  {
    "id": "P-SE 4",
    "goal": "Child engages in cooperative play with other children.",
    "p36": "Often plays cooperatively with other children.",
    "p48": "Cooperatively plays with other children in an increasingly coordinated way.",
    "by60": "Engages in joint play, such as using coordinated goals, planning, roles, and games with rules, with at least one other child at a time. Demonstrates willingness to include others’ ideas during interactions and play."
  },
  {
    "id": "P-SE 5",
    "goal": "Child uses basic problem-solving skills to resolve conflicts with other children.",
    "p36": "Begins to recognize and describe social problems.",
    "p48": "Often recognizes and describes social problems, suggests solutions to conflicts, and compromises when working or playing in a group.",
    "by60": "Recognizes and describes basic social problems in books or pictures, such as both children wanting the same toy, and during interactions with other children, such as “Why do you think your friend might be sad?” Uses basic strategies for dealing with common conflicts, such as sharing, taking turns, and compromising. Expresses feelings, needs, and opinions in conflict situations."
  },
  {
    "id": "P-SE 6",
    "goal": "Child expresses a broad range of emotions and recognizes these emotions in self and others.",
    "p36": "Expresses a broad range of emotions across contexts, such as during play and in interactions with adults.",
    "p48": "Expresses a broad range of emotions and begins to notice more subtle or complex emotions in self and others, such as embarrassed or worried.",
    "by60": "Recognizes and labels basic emotions in books or photographs. Uses words to describe own feelings."
  },
  {
    "id": "P-SE 7",
    "goal": "Child expresses care and concern toward others.",
    "p36": "Often pays attention when others are distressed, but attention and response to this distress may be brief.",
    "p48": "Consistently pays attention when others are distressed and often responds with care, either by seeking out adult support or providing reassurance or support themselves.",
    "by60": "Makes empathetic statements to adults or other children. Offers support to adults or other children who are distressed."
  },
  {
    "id": "P-SE 8",
    "goal": "Child manages emotions with increasing independence.",
    "p36": "Manages less intense emotions, such as mild frustration, independently.",
    "p48": "Has an expanding range of strategies for managing emotions, both less intense emotions and those that cause greater distress.",
    "by60": "Expresses feelings in ways that are appropriate to the situation. Looks for adult assistance when feelings are most intense."
  },
  {
    "id": "P-SE 9",
    "goal": "Child recognizes self as a unique individual having own abilities, characteristics, emotions, and interests.",
    "p36": "Describes own physical characteristics and behaviors and indicates likes and dislikes when asked.",
    "p48": "Describes a larger range of individual characteristics and interests and communicates how these are similar or different from those of other people.",
    "by60": "Describes self using several different characteristics. Demonstrates knowledge of uniqueness of self, such as talents, interests, preferences, or culture."
  },
  {
    "id": "P-SE 10",
    "goal": "Child expresses confidence in own skills and positive feelings about self.",
    "p36": "Expresses enjoyment in accomplishing daily routines and new skills and may draw adult attention to these accomplishments.",
    "p48": "Enjoys accomplishing a greater number of tasks and sharing these accomplishments with other children and adults.",
    "by60": "Shows satisfaction or seeks acknowledgment when completing a task or solving a problem. Expresses own ideas or beliefs in group contexts or in interactions with others."
  },
  {
    "id": "P-SE 11",
    "goal": "Child has sense of belonging to family, community, and other groups.",
    "p36": "Communicates feeling a sense of belonging to family and an emerging sense of connections to other communities through words or other forms of expression, such as drawing a picture of their family or sharing a special object related to their cultural heritage.",
    "p48": "Has a sense of belonging to family and community and communicates details about these connections, such as sharing a story about a family gathering, both spontaneously and when prompted by an adult or other child.",
    "by60": "Identifies self as being a part of different groups, such as family, community, culture, faith, or preschool. Relates personal stories about being a part of different groups."
  },
  {
    "id": "P-LC 1",
    "goal": "Child attends to communication and language from others.",
    "p36": "Shows acknowledgment of comments or questions and is able to attend to conversations, either spoken or signed.",
    "p48": "Shows acknowledgment of complex comments or questions.",
    "by60": "Uses verbal and non-verbal signals appropriately to acknowledge the comments or questions of others. Shows ongoing connection to a conversation, group discussion, or presentation."
  },
  {
    "id": "P-LC 2",
    "goal": "Child understands and responds to increasingly complex communication and language from others.",
    "p36": "Understands and responds (verbally and non-verbally) to increasingly longer sentences, simple questions, and simple stories.",
    "p48": "Shows an understanding of complex statements, questions, and stories containing multiple phrases and ideas, and responds appropriately.",
    "by60": "Shows an ability to recall (in order) multiple step directions. Demonstrates understanding of a variety of question types, such as “Yes/No?” or “Who/What/When/Where?” or “How/ Why?” Shows understanding of a variety of sentence types, such as multi-clause, cause-effect, sequential order, or if-then."
  },
  {
    "id": "P-LC 3",
    "goal": "Child varies the amount of information provided to meet the demands of the situation.",
    "p36": "Uses language, spoken or sign, for different purposes and is sometimes able to provide sufficient detail to get needs met from a variety of adults.",
    "p48": "Uses language, spoken or sign, for a variety of purposes and can typically provide sufficient detail in order to get needs met from a variety of adults.",
    "by60": "Usually provides sufficient detail in order to get needs met, such as explaining a point of difficulty in a task or sharing a request from home with the teacher. Uses language, spoken or sign, to clarify a word or statement when misunderstood."
  },
  {
    "id": "P-LC 4",
    "goal": "Child understands, follows, and uses appropriate social and conversational rules.",
    "p36": "Engages in conversations with adults, other children, or within the group setting lasting 2–3 conversational turns, and, with support, will sometimes use appropriate tone and volume for different situations.",
    "p48": "Maintains multi-turn conversations with adults or other children by being responsive to the conversational partner in a variety of ways, such as by asking a question.",
    "by60": "Maintains multi-turn conversations with adults, other children, and within larger groups by responding in increasingly sophisticated ways, such as asking related questions or expressing agreement. With increasing independence, matches the tone and volume of expression to the content and social situation, such as by using a whisper to tell a secret."
  },
  {
    "id": "P-LC 5",
    "goal": "Child expresses self in increasingly long, detailed, and sophisticated ways.",
    "p36": "Communicates clearly enough to be understood by familiar adults, but may make some pronunciation and grammatical errors.",
    "p48": "Communicates clearly enough to be understood by familiar and unfamiliar adults, but may make some pronunciation errors and some isolated grammatical errors.",
    "by60": "Communicates clearly enough to be understood by adults across a range of situations. Pronunciation errors and grammatical errors are isolated and infrequent."
  },
  {
    "id": "P-LC 6",
    "goal": "Child understands and uses a wide variety of words for a variety of purposes.",
    "p36": "Shows a rapid increase in acquisition of new vocabulary words that describe actions, emotions, things, or ideas that are meaningful within the everyday environment.",
    "p48": "Shows a steady increase in vocabulary through the acquisition of words with increasing specificity and variety.",
    "by60": "Demonstrates the use of multiple (2–3) new words or signs a day during play and other activities. Shows recognition of and/or familiarity with key domain-specific words heard during reading or discussions."
  },
  {
    "id": "P-LC 7",
    "goal": "Child shows understanding of word categories and relationships among words.",
    "p36": "Typically uses known words in the correct context and, with support, shows an emerging understanding of how words are related to broader categories, such as sorting things by color.",
    "p48": "Demonstrates an increasingly sophisticated understanding of words and word categories with support, such as listing multiple examples of a familiar category or identifying a synonym or antonym.",
    "by60": "Categorizes words or objects, such as sorting a hard hat, machines, and tools into the construction group, or giving many examples of farm animals. Discusses new words in relation to known words and word categories, such as “It fell to the bottom when it sank” or “When you hop it’s like jumping on one leg” or “The bear and fox are both wild animals.” Identifies shared characteristics among people, places, things, or actions, such as identifying that both cats and dogs are furry and have four legs."
  },
  {
    "id": "P-LIT 1",
    "goal": "Child demonstrates awareness that spoken language is composed of smaller segments of sound.",
    "p36": "Shows rote imitation and enjoyment of rhyme and alliteration.",
    "p48": "Demonstrates rhyme recognition, such as identifying which words rhyme from a group of three: hat, cat, log.",
    "by60": "Provides one or more words that rhyme with a single given target, such as “What rhymes with log?” Produces the beginning sound in a spoken word, such as “Dog begins with /d/.” Provides a word that fits with a group of words sharing an initial sound, with adult support, such as “Sock, Sara, and song all start with the /s/ sound. What else starts with the /s/ sound?”"
  },
  {
    "id": "P-LIT 2",
    "goal": "Child demonstrates an understanding of how print is used (functions of print) and the rules that govern how print works (conventions of print).",
    "p36": "Distinguishes print from pictures and shows an understanding that print is something meaningful, such as asking an adult “What does this say?” or “Read this.”",
    "p48": "Begins to demonstrate an understanding of the connection between speech and print.",
    "by60": "Understands that print is organized differently for different purposes, such as a note, list, or storybook. Understands that written words are made up of a group of individual letters."
  },
  {
    "id": "P-LIT 3",
    "goal": "Child identifies letters of the alphabet and produces correct sounds associated with letters.",
    "p36": "Shows an awareness of alphabet letters, such as singing the ABC song, recognizing letters from one’s name, or naming some letters that are encountered often.",
    "p48": "Recognizes and names at least half of the letters in the alphabet, including letters in own name (first name and last name), as well as letters encountered often in the environment.",
    "by60": "Names 18 upperand 15 lower-case letters. Knows the sounds associated with several letters."
  },
  {
    "id": "P-LIT 4",
    "goal": "Child demonstrates an understanding of narrative structure through storytelling/re-telling.",
    "p36": "With support, may be able to tell one or two key events from a story or may act out a story with pictures or props.",
    "p48": "Retells 2–3 key events from a wellknown story, typically in the right temporal order and using some simple sequencing terms, such as first … and then.",
    "by60": "Re-tells or acts out a story that was read, putting events in the appropriate sequence, and demonstrating more sophisticated understanding of how events relate, such as cause and effect relationships. Tells fictional or personal stories using a sequence of at least 2–3 connected events."
  },
  {
    "id": "P-LIT 5",
    "goal": "Child asks and answers questions about a book that was read aloud.",
    "p36": "Can answer basic questions about likes or dislikes in a book or story.",
    "p48": "With support, provides basic answers to specific questions about details of a story, such as who, what, when, or where.",
    "by60": "Answers questions about details of a story with increasingly specific information, such as when asked “Who was Mary?” responds “She was the girl who was riding the horse and then got hurt.” Answers increasingly complex inferential questions that require making predictions based on multiple pieces of information from the story; inferring characters’ feelings or intentions; or providing evaluations of judgments that are grounded in the text. Provides a summary of a story, highlighting a number of the key ideas in the story and how they relate."
  },
  {
    "id": "P-LIT 6",
    "goal": "Child writes for a variety of purposes using increasingly sophisticated marks.",
    "p36": "Engages in writing activities that consist largely of drawing and scribbling.",
    "p48": "Progressively uses drawing, scribbling, letter-like forms, and letters to intentionally convey meaning.",
    "by60": "Creates a variety of written products that may or may not phonetically relate to intended messages. Shows an interest in copying simple words posted in the classroom."
  },
  {
    "id": "P-MATH 1",
    "goal": "Child knows number names and the count sequence.",
    "p36": "Says or signs some number words in sequence (up to 10), starting with one.",
    "p48": "Says or signs more number words in sequence.",
    "by60": "Counts verbally or signs to at least 20 by ones."
  },
  {
    "id": "P-MATH 2",
    "goal": "Child recognizes the number of objects in a small set.",
    "p36": "Develops an understanding of what whole numbers mean.",
    "p48": "Quickly recognizes the number of objects in a small set (referred to as “subitizing”).",
    "by60": "Instantly recognizes, without counting, small quantities of up to 5 objects and says or signs the number."
  },
  {
    "id": "P-MATH 3",
    "goal": "Child understands the relationship between numbers and quantities.",
    "p36": "Begins to coordinate verbal counting with objects by pointing to or moving objects for small groups of objects laid in a line (referred to as one-to-one correspondence).",
    "p48": "Understands that number words refer to quantity.",
    "by60": "When counting objects, says or signs the number names in order, pairing one number word that corresponds with one object, up to at least 10. Counts and answers “How many?” questions for approximately 10 objects."
  },
  {
    "id": "P-MATH 4",
    "goal": "Child compares numbers.",
    "p36": "Begins to accurately count and compare objects that are about the same size and are in small groups with adult assistance, such as counts a pile of 2 blocks and a pile of 4, and determines whether the piles have the same or different numbers of blocks.",
    "p48": "Counts to determine and compare number amounts even when the larger group’s objects are smaller in size, such as buttons, compared with the smaller group’s objects that are larger in size, such as markers.",
    "by60": "Identifies whether the number of objects in one group is more than, less than, or the same as objects in another group for up to at least five objects. Identifies and uses numbers related to order or position from first to tenth."
  },
  {
    "id": "P-MATH 5",
    "goal": "Child associates a quantity with written numerals up to 5 and begins to write numbers.",
    "p36": "Begins to understand that a written numeral represents a quantity and may draw objects or use informal symbols to represent numbers.",
    "p48": "Understands that written numbers represent quantities of objects, and uses information symbols, such as a tally, to represent numerals.",
    "by60": "Associates a number of objects with a written numeral 0–5. Recognizes and, with support, writes some numerals up to 10."
  },
  {
    "id": "P-MATH 6",
    "goal": "Child understands addition as adding to and understands subtraction as taking away from.",
    "p36": "Begins to add and subtract very small collections of objects with adult support.",
    "p48": "Solves addition problems by joining objects together and subtraction problems by separating, using manipulatives and fingers to represent objects.",
    "by60": "Represents addition and subtraction in different ways, such as with fingers, objects, and drawings. Solves addition and subtraction word problems."
  },
  {
    "id": "P-MATH 7",
    "goal": "Child understands simple patterns.",
    "p36": "Recognizes a simple pattern, and with adult assistance, fills in the missing element of a pattern, such as boy, girl, boy, girl, ___, girl.",
    "p48": "Creates, identifies, extends, and duplicates simple repeating patterns in different forms, such as with objects, numbers, sounds, and movements.",
    "by60": "Fills in missing elements of simple patterns. Duplicates simple patterns in a different location than demonstrated, such as making the same alternating color pattern with blocks at a table that was demonstrated on the rug."
  },
  {
    "id": "P-MATH 8",
    "goal": "Child measures objects by their various attributes using standard and non-standard measurement. Uses differences in attributes to make comparisons.",
    "p36": "With adult support, begins to understand that attributes can be compared, such as one child can be taller than another child.",
    "p48": "With some adult support, uses measurable attributes to make comparisons, such as identifies objects as the same/different and more/less.",
    "by60": "Measures using the same unit, such as putting together snap cubes to see how tall a book is. Compares or orders up to 5 objects based on their measurable attributes, such as height or weight."
  },
  {
    "id": "P-MATH 9",
    "goal": "Child identifies, describes, compares, and composes shapes.",
    "p36": "Recognizes and names typical circle, square, and sometimes a triangle.",
    "p48": "Recognizes and compares a greater number of shapes of different sizes and orientations.",
    "by60": "Names and describes shapes in terms of length of sides, number of sides, and number of angles. Correctly names basic shapes regardless of size and orientation."
  },
  {
    "id": "P-MATH 10",
    "goal": "Child explores the positions of objects in space.",
    "p36": "Begins to understand spatial vocabulary.",
    "p48": "Increasingly understands spatial vocabulary.",
    "by60": "Understands and uses language related to directionality, order, and the position of objects, including up/down, and in front/behind. Correctly follows directions involving their own position in space, such as “Stand up” and “Move forward.”"
  },
  {
    "id": "P-SCI 1",
    "goal": "Child observes and describes observable phenomena (objects, materials, organisms, and events).",
    "p36": "Uses the five senses to observe objects, materials, organisms, and events.",
    "p48": "Makes increasingly complex observations of objects, materials, organisms, and events.",
    "by60": "Identifies the five senses (smell, touch, sight, sound, taste) and uses them to make observations. Uses observational tools to extend the five senses, such as a magnifying glass, microscope, binoculars, or stethoscope."
  },
  {
    "id": "P-SCI 2",
    "goal": "Child engages in scientific talk.",
    "p36": "Begins to use scientific vocabulary words with modeling and support from an adult.",
    "p48": "Uses a greater number of scientific vocabulary words.",
    "by60": "Uses scientific practice words or signs, such as observe, describe, compare, contrast, question, predict, experiment, reflect, cooperate, or measure. Uses scientific content words when investigating and describing observable phenomena, such as parts of a plant, animal, or object."
  },
  {
    "id": "P-SCI 3",
    "goal": "Child compares and categorizes observable phenomena.",
    "p36": "Sorts objects into groups based on simple attributes, such as color.",
    "p48": "With increasing independence, sorts objects into groups based on more complex attributes, such as weight, sound, or texture.",
    "by60": "Categorizes by sorting observable phenomena into groups based on attributes such as appearance, weight, function, ability, texture, odor, and sound. Uses measurement tools, such as a ruler, balance scale, eye dropper, unit blocks, thermometer, or measuring cup, to quantify similarities and differences of observable phenomena."
  },
  {
    "id": "P-SCI 4",
    "goal": "Child asks a question, gathers information, and makes predictions.",
    "p36": "Asks simple questions.",
    "p48": "Asks more complex questions.",
    "by60": "Asks questions that can be answered through an investigation, such as “What do plants need to grow?” or “What countries do the children in our class come from?”. Gathers information about a question by looking at books or discussing prior knowledge and observations."
  },
  {
    "id": "P-SCI 5",
    "goal": "Child plans and conducts investigations and experiments.",
    "p36": "With adult support, engages in simple investigations and experiments, such as building a “bridge” out of classroom materials and seeing how many dolls it will hold before it collapses.",
    "p48": "With increasing independence, engages in some parts of conducting complex investigations or experiments.",
    "by60": "Articulates steps to be taken and lists materials needed for an investigation or experiment. Implements steps and uses materials to explore testable questions, such as “Do plants need water to grow?” by planting seeds and giving water to some but not to others."
  },
  {
    "id": "P-SCI 6",
    "goal": "Child analyzes results, draws conclusions, and communicates results.",
    "p36": "With adult assistance, analyzes and interprets data.",
    "p48": "With increasing independence, analyzes and interprets data and draws conclusions.",
    "by60": "Analyzes and interprets data and summarizes results of investigation. Draws conclusions, constructs explanations, and verbalizes cause and effect relationships."
  },
  {
    "id": "P-PMP 1",
    "goal": "Child demonstrates control, strength, and coordination of large muscles.",
    "p36": "Balances, such as on one leg or a beam, for short periods with some assistance.",
    "p48": "Balances, such as on one leg or on a beam, for longer periods of time both when standing still and when moving from one position to another.",
    "by60": "Demonstrates balance in large-muscle movement, such as walking on a log without falling or balancing on one leg. Performs activities that combine and coordinate large muscle movements, including swinging on a swing, climbing a ladder, or dancing to music."
  },
  {
    "id": "P-PMP 2",
    "goal": "Child uses perceptual information to guide motions and interactions with objects and other people.",
    "p36": "Somewhat aware of own body, space, and relationship to other objects.",
    "p48": "Shows increasing awareness of body, space, and relationship to other objects in ways that allow for more coordinated movements, actions, and interactions with others.",
    "by60": "Demonstrates awareness of own body and other people’s space during interactions. Moves body in relation to objects to effectively perform tasks, such as moving body in position to kick a ball."
  },
  {
    "id": "P-PMP 3",
    "goal": "Child demonstrates increasing control, strength, and coordination of small muscles.",
    "p36": "Performs simple hand-eye tasks, such as drawing simple shapes like circles and cutting paper with scissors.",
    "p48": "Performs tasks that require more complex hand-eye coordination, such as cutting out shapes and drawing letter-like forms, with moderate levels of precision and control.",
    "by60": "Easily coordinates hand and eye movements to carry out tasks, such as working on puzzles or stringing beads together. Uses a pincer grip to hold and manipulate tools for writing, drawing, and painting."
  },
  {
    "id": "P-PMP 4",
    "goal": "Child demonstrates personal hygiene and self-care skills.",
    "p36": "Shows an awareness of personal hygiene and self-care skills, such as telling an adult it is important to wash hands before eating.",
    "p48": "Begins to take more responsibility for personal hygiene and self-care skills.",
    "by60": "Washes hands with soap and water. Knows to do this before eating, after using the bathroom, or after blowing nose."
  },
  {
    "id": "P-PMP 5",
    "goal": "Child develops knowledge and skills that help promote nutritious food choices and eating habits.",
    "p36": "Demonstrates a basic knowledge of the role of foods and nutrition in healthy development.",
    "p48": "Demonstrates an increasing understanding of the ways in which foods and nutrition help the body grow and be healthy.",
    "by60": "Identifies a variety of healthy and unhealthy foods. Demonstrates basic understanding that eating a variety of foods helps the body grow and be healthy."
  },
  {
    "id": "P-PMP 6",
    "goal": "Child demonstrates knowledge of personal safety practices and routines.",
    "p36": "Shows awareness of a growing number of personal safety practices and routines.",
    "p48": "Exhibits increasing independence in following basic personal safety practices and routines.",
    "by60": "Identifies, avoids, and alerts others to danger, such as keeping a safe distance from swings. Identifies and follows basic safety rules with adult guidance and support, such as transportation and street safety practices."
  }
] as const;

function eyfsPreset(): FrameworkDefinition {
  const areaNames = [
    "Communication and Language",
    "Physical Development",
    "Personal, Social and Emotional Development",
    "Literacy",
    "Mathematics",
    "Understanding the World",
    "Expressive Arts and Design",
  ];

  return {
    key: "eyfs",
    name: "Early Years Foundation Stage (EYFS)",
    version: "England · EYFS 2026 with Development Matters guidance",
    progressionModel: "broad-stages",
    officialSourceUrl:
      "https://www.gov.uk/government/publications/development-matters--2",
    implementationNotes: [
      "Development Matters describes broad pathways and must not be treated as a tick list.",
      "Early Learning Goals are end-of-Reception assessment references, not the curriculum or a starting point for planning.",
      "Teacher observation and professional judgement remain central; depth matters more than moving quickly between bands.",
    ],
    stages: [
      { id: "birth-to-three", label: "Birth to three", order: 1 },
      { id: "three-and-four", label: "Three- and four-year-olds", order: 2 },
      { id: "reception", label: "Children in Reception", order: 3 },
    ],
    assessmentLevels: evidenceStrengthLevels,
    areas: areaNames,
    areaDefinitions: areaNames.map((areaName) => ({
      id: areaName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
      name: areaName,
      statements: eyfsSpecs
        .filter((spec) => spec.area === areaName)
        .map(
          (spec): FrameworkStatement => ({
            id: spec.id,
            text: spec.text,
            guidance:
              "Use the broad stages to interpret a pattern of learning, not to score a single observation. The source ELG reference is for end-of-Reception assessment only.",
            sourceReference: spec.source,
            stageIds: ["birth-to-three", "three-and-four", "reception"],
            progression: [
              { level: 1, label: "Birth to three", descriptors: [spec.birthToThree] },
              { level: 2, label: "Three- and four-year-olds", descriptors: [spec.threeAndFour] },
              { level: 3, label: "Children in Reception", descriptors: [spec.reception] },
            ],
          })
        ),
    })),
  };
}

function eylfPreset(base: FrameworkDefinition): FrameworkDefinition {
  return {
    ...base,
    name: "Belonging, Being and Becoming: EYLF",
    version: "Australia · V2.0 (2022)",
    progressionModel: "non-linear-outcomes",
    officialSourceUrl:
      "https://www.acecqa.gov.au/sites/default/files/2023-01/EYLF-2022-V2.0.pdf",
    implementationNotes: [
      "The five outcomes are broad, integrated and relevant for every child from birth to five.",
      "EYLF progress is not a fixed age ladder; OASIS looks for increasing depth, complexity, agency, independence and transfer over time.",
      "Examples of evidence support local professional judgement and should be adapted with children, families and communities.",
    ],
    assessmentLevels: evidenceStrengthLevels,
    areaDefinitions: base.areaDefinitions.map((area) => ({
      ...area,
      statements: area.statements.map((statement) => ({
        ...statement,
        guidance:
          "Notice how this learning becomes richer, more complex, more independent or transferable across contexts. Do not assign an age level or treat the outcome as a checklist.",
      })),
    })),
  };
}

function headStartSubarea(id: string) {
  const number = Number(id.match(/\d+$/)?.[0] ?? 0);

  if (id.startsWith("P-ATL")) {
    if (number <= 4) return "Emotional and Behavioral Self-Regulation";
    if (number <= 9) return "Cognitive Self-Regulation (Executive Functioning)";
    if (number <= 11) return "Initiative and Curiosity";
    return "Creativity";
  }
  if (id.startsWith("P-SE")) {
    if (number <= 2) return "Relationships with Adults";
    if (number <= 5) return "Relationships with Other Children";
    if (number <= 8) return "Emotional Functioning";
    return "Sense of Identity and Belonging";
  }
  if (id.startsWith("P-LC")) {
    if (number <= 2) return "Attending and Understanding";
    if (number <= 5) return "Communicating and Speaking";
    return "Vocabulary";
  }
  if (id.startsWith("P-LIT")) {
    if (number === 1) return "Phonological Awareness";
    if (number <= 3) return "Print and Alphabet Knowledge";
    if (number <= 5) return "Comprehension and Text Structure";
    return "Writing";
  }
  if (id.startsWith("P-MATH")) {
    if (number <= 5) return "Counting and Cardinality";
    if (number <= 7) return "Operations and Algebraic Thinking";
    if (number === 8) return "Measurement";
    return "Geometry and Spatial Sense";
  }
  if (id.startsWith("P-SCI")) {
    return number <= 3 ? "Scientific Inquiry" : "Reasoning and Problem-Solving";
  }
  if (number === 1) return "Gross Motor";
  if (number === 2) return "Perception";
  if (number === 3) return "Fine Motor";
  return "Health, Safety, and Nutrition";
}

function headStartArea(id: string) {
  if (id.startsWith("P-ATL")) return "Approaches to Learning";
  if (id.startsWith("P-SE")) return "Social and Emotional Development";
  if (id.startsWith("P-LC") || id.startsWith("P-LIT")) return "Language and Literacy";
  if (id.startsWith("P-MATH") || id.startsWith("P-SCI")) return "Cognition";
  return "Perceptual, Motor, and Physical Development";
}

function headStartPreset(): FrameworkDefinition {
  const areaNames = [
    "Approaches to Learning",
    "Social and Emotional Development",
    "Language and Literacy",
    "Cognition",
    "Perceptual, Motor, and Physical Development",
  ];

  return {
    key: "headstart",
    name: "Head Start Early Learning Outcomes Framework",
    version: "United States · Preschool developmental progressions (2015)",
    progressionModel: "developmental-continuum",
    officialSourceUrl:
      "https://headstart.gov/interactive-head-start-early-learning-outcomes-framework-ages-birth-five",
    implementationNotes: [
      "This preschool pack includes the official domains, sub-domains, goals and developmental progressions for 36 to 60 months.",
      "The ELOF guides curriculum and intentional teaching; it is not itself a curriculum, assessment instrument or checklist.",
      "Programs should also align with applicable state, tribal and local early-learning standards.",
    ],
    stages: [
      { id: "36-to-48-months", label: "36 to 48 months", minAgeMonths: 36, maxAgeMonths: 48, order: 1 },
      { id: "48-to-60-months", label: "48 to 60 months", minAgeMonths: 48, maxAgeMonths: 60, order: 2 },
      { id: "by-60-months", label: "Indicators by 60 months", maxAgeMonths: 60, order: 3 },
    ],
    assessmentLevels: evidenceStrengthLevels,
    areas: areaNames,
    areaDefinitions: areaNames.map((areaName) => ({
      id: areaName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
      name: areaName,
      statements: headStartGoals
        .filter((goal) => headStartArea(goal.id) === areaName)
        .map(
          (goal): FrameworkStatement => ({
            id: `elof-${goal.id.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
            text: goal.goal,
            subarea: headStartSubarea(goal.id),
            sourceReference: `Head Start ELOF ${goal.id}`,
            guidance:
              "Use the published progressions to interpret observed learning and plan support. They are not a pass/fail checklist.",
            stageIds: ["36-to-48-months", "48-to-60-months", "by-60-months"],
            progression: [
              { level: 1, label: "36 to 48 months", descriptors: [goal.p36] },
              { level: 2, label: "48 to 60 months", descriptors: [goal.p48] },
              { level: 3, label: "By 60 months", descriptors: [goal.by60] },
            ],
          })
        ),
    })),
  };
}

export function enrichFrameworkPresets(
  base: Record<string, FrameworkDefinition>
) {
  return {
    eyfs: eyfsPreset(),
    eylf: eylfPreset(base.eylf),
    headstart: headStartPreset(),
  } satisfies Record<string, FrameworkDefinition>;
}
