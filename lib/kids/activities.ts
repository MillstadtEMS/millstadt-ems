/**
 * Millstadt EMS Kids Club — monthly activity rotation.
 *
 * Two EMS-themed activities per calendar month (24 total), written for
 * Millstadt families.
 *
 * The Kids Club page shows the current month's two activities automatically and
 * lets visitors browse other months. To tweak wording or swap an activity, just
 * edit the entry below — the page picks it up by month index (0 = January).
 *
 * `sheet` is optional: when you add a printable activity PDF to
 * /public/kids-club/activities/, set `sheet` to its filename and a "Print this
 * activity" button appears automatically.
 */

export interface KidsActivity {
  title: string;
  ages: string;
  blurb: string;
  youNeed: string[];
  steps: string[];
  sheet?: string; // filename in /public/kids-club/activities/, e.g. "know-your-address.pdf"
}

/** 12 months, each with exactly two activities. Index 0 = January. */
export const ACTIVITIES_BY_MONTH: KidsActivity[][] = [
  // ── January ──
  [
    {
      title: "Know Your Address Hero",
      ages: "Ages 4–8",
      blurb: "If you ever need to call for help, knowing where you live helps the ambulance find you fast!",
      youNeed: ["Paper", "Crayons or markers", "A grown-up helper"],
      steps: [
        "Practice saying your full home address out loud with a grown-up.",
        "Say your phone number too — slow and clear.",
        "Draw a picture of your house with the address written on the mailbox.",
        "Hang it on the fridge and practice once a week!",
      ],
    },
    {
      title: "911 Practice Call",
      ages: "Ages 5–10",
      blurb: "Learn exactly what to do — and say — if there is a real emergency.",
      youNeed: ["A toy phone or your hand", "A grown-up to play the dispatcher"],
      steps: [
        "Call 911 ONLY for a real emergency (someone hurt, a fire, or danger).",
        "Stay calm and tell them WHAT happened and WHERE you are.",
        "Don't hang up until the helper says it's okay.",
        "Practice with a grown-up so you feel brave and ready.",
      ],
    },
  ],
  // ── February (Heart Month) ──
  [
    {
      title: "Healthy Heart Plate",
      ages: "Ages 4–9",
      blurb: "February is Heart Month! Your heart loves good food and lots of moving around.",
      youNeed: ["Paper plate or paper", "Crayons", "Grocery ads (optional)"],
      steps: [
        "Draw or glue heart-healthy foods onto a plate: fruits, veggies, and water.",
        "Color the foods that make your heart strong.",
        "Pick one new healthy food to try this week.",
        "Do 10 jumping jacks to feel your heart beat faster!",
      ],
    },
    {
      title: "Stayin' Alive Beat",
      ages: "Ages 6–11",
      blurb: "Paramedics push on a person's chest to a special beat. You can practice the rhythm!",
      youNeed: ["A pillow or stuffed animal", "A grown-up"],
      steps: [
        "Ask a grown-up to play the song 'Stayin' Alive' (it's the perfect speed).",
        "Push gently on the pillow to the beat — about 100 pushes a minute.",
        "Learn that REAL CPR is for grown-ups and big kids in a class.",
        "Your job in an emergency: call 911 and get an adult!",
      ],
    },
  ],
  // ── March ──
  [
    {
      title: "Buckle-Up Buddy",
      ages: "Ages 3–8",
      blurb: "Seatbelts and booster seats keep you safe every single ride.",
      youNeed: ["Paper", "Crayons"],
      steps: [
        "Draw your family car with everyone buckled up safely.",
        "Remember: you ride in a booster seat until a seatbelt fits just right.",
        "Make it a rule — the car doesn't move until everyone clicks!",
        "Give a high-five to whoever buckles up first.",
      ],
    },
    {
      title: "Medicine Is Not Candy",
      ages: "Ages 4–9",
      blurb: "Medicine helps us when a grown-up gives it — but it can be dangerous on its own.",
      youNeed: ["Paper", "A red crayon"],
      steps: [
        "Draw a big red STOP sign.",
        "Write: 'Always ask a grown-up before taking any medicine.'",
        "Medicine and vitamins are NOT candy, even if they look like it.",
        "If you find pills, tell an adult right away — don't touch them.",
      ],
    },
  ],
  // ── April ──
  [
    {
      title: "Bike Helmet Champion",
      ages: "Ages 4–10",
      blurb: "A helmet protects the most important part of you — your brain!",
      youNeed: ["Your bike helmet", "Stickers (optional)"],
      steps: [
        "Do the 2-finger test: only two fingers should fit between your eyebrows and the helmet.",
        "Make sure the straps form a 'V' under each ear and buckle snug.",
        "Decorate a paper helmet or add safe stickers to yours.",
        "Helmet ON every time you ride — bike, scooter, or skates!",
      ],
    },
    {
      title: "Allergy Detective",
      ages: "Ages 5–10",
      blurb: "Some people's bodies react to certain foods or bug stings. Good detectives help keep friends safe.",
      youNeed: ["Paper", "Crayons", "A grown-up"],
      steps: [
        "Talk with a grown-up about what an allergy is.",
        "Learn that we never share food unless a grown-up says it's okay.",
        "If a friend feels sick or can't breathe, get an adult FAST.",
        "Draw a poster: 'Be a Good Friend — Ask Before You Share!'",
      ],
    },
  ],
  // ── May ──
  [
    {
      title: "Meet the Ambulance",
      ages: "Ages 3–9",
      blurb: "An ambulance is a hospital on wheels! Let's learn what's inside and out.",
      youNeed: ["Paper", "Crayons"],
      steps: [
        "Draw an ambulance with flashing lights on top.",
        "Label the parts you know: lights, siren, doors, and the big red cross.",
        "The lights and siren mean 'Please move over, we're helping someone!'",
        "Ask us for a tour at our next community event!",
      ],
    },
    {
      title: "Boo-Boo First Aid Kit",
      ages: "Ages 5–10",
      blurb: "Build a mini first-aid kit so you're ready for little scrapes and bumps.",
      youNeed: ["A small box or bag", "Bandages", "A grown-up"],
      steps: [
        "With a grown-up, gather bandages, wipes, and a small ice pack.",
        "Decorate your kit box with a red cross.",
        "Practice cleaning a pretend scrape and putting on a bandage.",
        "Remember: big boo-boos need a grown-up's help!",
      ],
    },
  ],
  // ── June ──
  [
    {
      title: "Sun & Water Safety",
      ages: "Ages 4–10",
      blurb: "Summer fun is the best — let's stay safe in the sun and around water.",
      youNeed: ["Paper", "Crayons", "Sunscreen"],
      steps: [
        "Always swim with a buddy and a watching grown-up — never alone.",
        "Put on sunscreen before you go outside, and again after swimming.",
        "Drink water even when you're not thirsty.",
        "Draw yourself at the pool wearing sunscreen and a smile!",
      ],
    },
    {
      title: "Never-Hot-Car Promise",
      ages: "Ages 4–9",
      blurb: "Cars get dangerously hot fast. People AND pets should never wait inside.",
      youNeed: ["Paper", "Crayons"],
      steps: [
        "Learn that a parked car heats up super fast, even with a window cracked.",
        "If you're ever stuck in a car, honk the horn to get help.",
        "Make a poster reminding grown-ups: 'Look Before You Lock!'",
        "Tell a grown-up if you ever see a kid or pet alone in a car.",
      ],
    },
  ],
  // ── July ──
  [
    {
      title: "Sparkler Smarts",
      ages: "Ages 5–11",
      blurb: "Fireworks are beautiful — and best enjoyed safely from a distance.",
      youNeed: ["Paper", "Glitter or crayons", "A grown-up"],
      steps: [
        "Watch big fireworks from far away with your family.",
        "Sparklers get VERY hot — only with a grown-up, and drop them in water when done.",
        "Never pick up a firework that didn't go off — tell an adult.",
        "Make a glittery firework picture instead of touching real ones!",
      ],
    },
    {
      title: "Hydration Station",
      ages: "Ages 4–10",
      blurb: "On hot days your body needs lots of water to stay cool and strong.",
      youNeed: ["Paper", "A marker", "A water cup"],
      steps: [
        "Draw a water-cup chart with a box for each cup you drink today.",
        "Color in a box every time you finish a cup of water.",
        "Try to fill all your boxes by bedtime!",
        "Feeling dizzy or super tired in the heat? Rest in the shade and tell a grown-up.",
      ],
    },
  ],
  // ── August (Back to School) ──
  [
    {
      title: "Safe Walk to School",
      ages: "Ages 5–10",
      blurb: "Walking or biking to school? Let's practice being seen and safe.",
      youNeed: ["Paper", "Crayons"],
      steps: [
        "Always cross at the corner or crosswalk — look left, right, then left again.",
        "Make eye contact with drivers before you cross.",
        "Wear bright colors so cars can see you.",
        "Draw a map of your safe route with a grown-up.",
      ],
    },
    {
      title: "Backpack Emergency Card",
      ages: "Ages 6–11",
      blurb: "A little card in your backpack helps grown-ups reach your family if you ever need help.",
      youNeed: ["Index card", "Marker", "A grown-up"],
      steps: [
        "Write your name and a parent's phone number on a card.",
        "Add any allergies a helper should know about.",
        "Slip it into a backpack pocket — and tell your teacher where it is.",
        "Decorate the card so it's easy to spot!",
      ],
    },
  ],
  // ── September ──
  [
    {
      title: "Family Go-Bag Builder",
      ages: "Ages 5–11",
      blurb: "Emergencies can happen anytime. A ready-to-go bag helps your whole family.",
      youNeed: ["A backpack or bag", "A grown-up"],
      steps: [
        "With a grown-up, gather water, snacks, a flashlight, and a phone charger.",
        "Add a family photo and a list of important phone numbers.",
        "Pick one safe spot to keep the bag.",
        "Draw a checklist and check off each item you packed!",
      ],
    },
    {
      title: "Choking Rescue Helper",
      ages: "Ages 6–11",
      blurb: "If someone is choking, kids can be a big help by getting an adult fast.",
      youNeed: ["A grown-up to talk with"],
      steps: [
        "Learn the sign for choking: hands at the throat and can't talk.",
        "Your #1 job: YELL for a grown-up and call 911 if no adult is near.",
        "Big kids can learn back-blows in a real safety class.",
        "Practice calmly saying, 'Help! Someone is choking!'",
      ],
    },
  ],
  // ── October ──
  [
    {
      title: "Be-Seen Costume",
      ages: "Ages 3–10",
      blurb: "Trick-or-treating is more fun when cars can see you in the dark.",
      youNeed: ["Reflective tape or stickers", "A flashlight or glow stick"],
      steps: [
        "Add reflective tape or bright stickers to your costume and bag.",
        "Carry a flashlight or glow stick when it gets dark.",
        "Only cross at corners and walk with a grown-up.",
        "Draw your glow-in-the-dark costume idea!",
      ],
    },
    {
      title: "Safe-Hands Pumpkin",
      ages: "Ages 4–9",
      blurb: "Kids design, grown-ups carve — that's the safe-hands rule for sharp tools.",
      youNeed: ["Paper", "Crayons", "A pumpkin (optional)"],
      steps: [
        "Draw the silly or spooky pumpkin face you want.",
        "Let a grown-up do the cutting with the sharp tools.",
        "Use a glow stick instead of a candle so nothing gets too hot.",
        "Show off your pumpkin design!",
      ],
    },
  ],
  // ── November ──
  [
    {
      title: "Thank-You Card for Helpers",
      ages: "Ages 3–10",
      blurb: "Paramedics, EMTs, nurses, and dispatchers help our town. Let's say thanks!",
      youNeed: ["Paper", "Crayons", "Markers"],
      steps: [
        "Fold a piece of paper to make a card.",
        "Draw an ambulance or a helper on the front.",
        "Write a thank-you message inside.",
        "Bring it to the station — we love to hang them up!",
      ],
    },
    {
      title: "Kitchen Safety Sidekick",
      ages: "Ages 4–9",
      blurb: "The kitchen is busy during the holidays. Smart kids know how to stay safe.",
      youNeed: ["Paper", "Crayons"],
      steps: [
        "Stay an arm's length back from the hot stove and oven.",
        "Turn pot handles inward so nothing gets bumped (a grown-up's job).",
        "Wash your hands before helping with food.",
        "Draw the 'kid-safe zone' in your kitchen.",
      ],
    },
  ],
  // ── December ──
  [
    {
      title: "Winter Warm-Up",
      ages: "Ages 3–10",
      blurb: "Cold weather is here! Dressing right keeps your body warm and healthy.",
      youNeed: ["Paper", "Crayons"],
      steps: [
        "Dress in layers — like a cozy sandwich of clothes!",
        "Cover your ears, hands, and head when it's freezing.",
        "Come inside if your fingers or toes start to hurt or feel numb.",
        "Draw yourself bundled up for a snowy day.",
      ],
    },
    {
      title: "Holiday Helper",
      ages: "Ages 4–10",
      blurb: "Help keep your home safe and bright through the holidays.",
      youNeed: ["Paper", "Crayons", "A grown-up"],
      steps: [
        "Keep walkways and doors clear so helpers can get through if needed.",
        "Remind grown-ups to turn off holiday lights at bedtime.",
        "Know two ways out of your home in case of an emergency.",
        "Draw your family's safe meeting spot outside.",
      ],
    },
  ],
];

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export interface ColoringPage {
  slug: string;        // file basename in /public/kids-club/coloring/ (.png thumb + .pdf print)
  title: string;
  orientation: "portrait" | "landscape";
}

/**
 * Coloring pages drawn for the Millstadt EMS Kids Club. Each has a web preview
 * (<slug>.png) and a print-ready letter-size PDF (<slug>.pdf) in
 * /public/kids-club/coloring/. To add more: drop the files in that folder and
 * add a line here.
 */
export const COLORING_PAGES: ColoringPage[] = [
  { slug: "ems-crest",             title: "Millstadt EMS Crest",        orientation: "portrait" },
  { slug: "kids-club-logo",        title: "Millstadt EMS Kids Club",    orientation: "landscape" },
  { slug: "our-station",           title: "Oversized Water Tower",      orientation: "landscape" },
  { slug: "whole-fleet",           title: "The Whole Crew",             orientation: "landscape" },
  { slug: "air-care-fleet",        title: "Air-Care & the Fleet",       orientation: "landscape" },
  { slug: "ready-to-roll",         title: "Ready to Roll",              orientation: "landscape" },
  { slug: "full-crew",             title: "Full Response Crew",         orientation: "landscape" },
  { slug: "air-care-landing",      title: "Air-Care Landing",           orientation: "portrait" },
  { slug: "at-the-hospital",       title: "At the Hospital",            orientation: "portrait" },
  { slug: "emergency-team",        title: "Emergency Team Lineup",      orientation: "landscape" },
  { slug: "station-lineup",        title: "Station Lineup",             orientation: "landscape" },
  { slug: "three-ambulances",      title: "Three Ambulances",           orientation: "landscape" },
  { slug: "ambulance-water-tower", title: "Ambulance & Water Tower",    orientation: "landscape" },
  { slug: "ballpark",              title: "Millstadt Splash Pad",       orientation: "landscape" },
  { slug: "ambulance-duo",         title: "Ambulance Duo",              orientation: "landscape" },
  { slug: "ambulance-back",        title: "Back of the Ambulance",      orientation: "landscape" },
];

/** Safety links shown on the Kids Club page. */
export const PARTNER_LINKS = [
  {
    name: "Sparky.org Games & Activities",
    href: "https://sparky.org/activities",
    desc: "Fire-safety games, videos, and printable activities from Sparky.org.",
  },
  {
    name: "Sesame Street Fire Safety",
    href: "https://www.sesamestreet.org/topicsandactivities",
    desc: "Safety activities and videos from Sesame Street.",
  },
];
