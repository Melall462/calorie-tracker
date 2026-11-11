// The privacy policy, as data, so the same words are shown in the app and checked by tests (tests/legal.test.mjs).
//
// This describes how Nutrily actually works today. If the app starts doing something new with people's information
// (a new service, a new kind of data, analytics), this text has to change in the same commit. The test fails if the
// code starts contacting a company the policy does not mention.
export const PRIVACY_UPDATED = '12 November 2026';

// Block types: a paragraph (string), a list ({ list: [...] }), or the contact details ({ contact: true }).
export function buildPrivacyPolicy({ operator = '', email = '' } = {}) {
  const who = operator || 'the person who runs Nutrily';
  return {
    title: 'Privacy policy',
    updated: PRIVACY_UPDATED,
    intro: `This explains what Nutrily does with your information. It is written in plain English and describes how the app actually works today. Nutrily is a small app run by ${who} in New Zealand.`,
    sections: [
      {
        id: 'short-version',
        title: 'The short version',
        blocks: [
          {
            list: [
              'Nutrily works without an account. Without one, your food diary and everything else stay on your own device.',
              'If you create an account, a copy of your data is stored in the cloud so you can use Nutrily on other devices.',
              'Nutrily has no ads, no analytics and no tracking, and we never sell your information.',
              'AI meal planning sends your calorie targets, diet, allergies and food preferences to an AI service. It does not send your email address.',
              'You can delete your account yourself at any time, and download a copy of your data first.',
            ],
          },
        ],
      },
      {
        id: 'what-we-handle',
        title: 'What information Nutrily handles',
        blocks: [
          'Some of this is health-related, so we treat all of it carefully. Everything here is information you choose to enter.',
          {
            list: [
              'Your food diary: the foods you log, amounts, calories, protein, carbs, fat and which meal they were.',
              'Water and weight you record.',
              'Your targets, and body details if you enter them (such as age, sex, height, weight, activity level and goal).',
              'Your food preferences: eating style, allergies and intolerances, and foods you like or want to avoid.',
              'Your recipes, meal plans, and My foods (products you scanned or added yourself, including their barcodes).',
            ],
          },
          'If you create an account we also hold your email address and your password. The password is only ever stored as a one-way scrambled version (a hash), so nobody, including us, can read it. We also keep a count of how many AI planning requests you make each day, to apply a daily limit.',
          'We do not ask for your name, phone number, address, payment details or location. When you scan a barcode with the camera, the image is processed on your device and is not uploaded or stored.',
        ],
      },
      {
        id: 'where-stored',
        title: 'Where it is stored',
        blocks: [
          {
            list: [
              'On your device: in your browser\'s local storage. Clearing your browser data, or using "Sign out and clear this device" in Account, removes it.',
              'In the cloud, only if you create an account: with Supabase (our login and database provider), on servers in Singapore. Each person\'s records are protected by access rules, so a signed-in person can only reach their own.',
            ],
          },
          'Your cloud data is not end-to-end encrypted. The person who runs Nutrily can technically see it as the database administrator. We only look at it when needed to keep the app working or to help with a problem you have raised.',
        ],
      },
      {
        id: 'others',
        title: 'Who else handles your information',
        blocks: [
          'We use these services to run Nutrily. Each has its own privacy policy, and what they do with information is governed by their terms. We do not sell your information or share it with advertisers or data brokers.',
          {
            list: [
              'Supabase: your login, the cloud database (account only), and the small programs that write AI meal plans and delete accounts. Supabase also sends the emails for confirming your address and resetting your password.',
              'Vercel: hosts the website. Like any web host it sees technical details of each visit, such as your IP address and browser. It does not see your account data.',
              'Anthropic (AI meal planning, account only): when you ask for an AI plan, our server sends a request to Anthropic. It contains your calorie and macro targets, eating style, allergies, liked and disliked foods, cuisines, budget, and the names and calories of meals already planned for that day. It does not contain your email address, name, food diary, weight or body measurements. Your device never contacts Anthropic directly. Anthropic says it does not train its models on content sent through its API and keeps it only for a limited time. Your request may be processed outside New Zealand, including in the United States.',
              'Open Food Facts: when you scan or type a barcode, the number is sent from your device to Open Food Facts, a community food database, to look up the product. They also receive your IP address and browser details. Nothing from your account is sent.',
              'Google Fonts: the app\'s font is loaded from Google when Nutrily opens, so Google receives your IP address and browser details.',
            ],
          },
          'We may also disclose information if the law requires it.',
        ],
      },
      {
        id: 'uses',
        title: 'What we use it for',
        blocks: [
          {
            list: [
              'To run the app: showing your diary, working out totals, and keeping your devices in sync.',
              'To write AI meal plans when you ask for one.',
              'To sign you in, and to email you a link if you forget your password.',
              'To apply a daily limit on AI requests, which keeps costs and abuse in check.',
              'To fix problems. The servers keep technical logs, such as error messages and the number of AI tokens a request used. When something goes wrong a log can include part of an AI reply (a meal name or two), but not your email address.',
            ],
          },
          'We do not use your information for advertising, and we do not build profiles of you.',
        ],
      },
      {
        id: 'cookies',
        title: 'Cookies and local storage',
        blocks: [
          'Nutrily uses your browser\'s local storage to keep your data on your device and to keep you signed in. It does not use tracking cookies or analytics. The services listed above may log technical details when your browser contacts them.',
        ],
      },
      {
        id: 'keeping',
        title: 'How long we keep it',
        blocks: [
          {
            list: [
              'On your device: until you clear it.',
              'Your account and cloud data: until you delete your account. Deleting it removes your login and everything stored for it straight away, including your AI usage counts. If the hosting provider keeps backups, deleted data may remain in them until they expire.',
              'Technical logs: kept by Supabase for a short time.',
              'Anthropic: for the limited time its own terms describe.',
            ],
          },
        ],
      },
      {
        id: 'your-choices',
        title: 'Your choices and rights',
        blocks: [
          {
            list: [
              'Use Nutrily without an account. Everything works on your device.',
              'Download a copy of your data: Account, then Delete my account, then "Download a copy of my data first". You do not have to go through with the deletion.',
              'Delete your account: Account, then Delete my account. It removes your login and your cloud data. The data on your device stays unless you choose to clear it too.',
              'Change anything: you can edit or remove entries, recipes and preferences in the app at any time.',
              'Ask us: you can ask to see or correct the information we hold about you. In New Zealand the Privacy Act 2020 gives you the right to do this. If you are not happy with how we handle your information you can complain to the Office of the Privacy Commissioner (privacy.org.nz). If you live somewhere else, your local laws may give you more rights, and we will try to help.',
            ],
          },
        ],
      },
      {
        id: 'security',
        title: 'Security',
        blocks: [
          'Information is encrypted while it travels between your device and our services. Passwords are stored as hashes, and the database has access rules so people can only reach their own records. No system is perfectly secure, so please choose a password you do not use elsewhere. If a breach affecting you happens, we will tell you and anyone else the law requires us to tell.',
        ],
      },
      {
        id: 'children',
        title: 'Children',
        blocks: ['Nutrily is for people aged 18 and over. It is not designed for children, and we do not knowingly collect information from them.'],
      },
      {
        id: 'safely',
        title: 'Using Nutrily safely',
        blocks: [
          'Nutrily gives general information, not medical or dietary advice. Calorie targets, AI-written meals and nutrition numbers are estimates and can be wrong. If you have an allergy or intolerance, always read the label and check the ingredients yourself. If you have a medical condition, are pregnant, or have ever had difficulty with eating, talk to a doctor or dietitian before changing how you eat.',
        ],
      },
      {
        id: 'changes',
        title: 'Changes to this policy',
        blocks: ['If this policy changes, the date at the top changes too, and for anything that matters we will say what changed.'],
      },
      {
        id: 'contact',
        title: 'Contact',
        blocks: [{ contact: true }],
      },
    ],
    contact: email
      ? `Questions, requests to see or correct your information, or help with deleting your account: email ${email}.`
      : "Contact details haven't been added to this copy of Nutrily yet.",
    contactEmail: email,
  };
}

// All the words of the policy as one string, for tests.
export function policyText(policy) {
  const parts = [policy.title, policy.updated, policy.intro];
  for (const s of policy.sections) {
    parts.push(s.title);
    for (const b of s.blocks) parts.push(typeof b === 'string' ? b : b.list ? b.list.join(' ') : policy.contact);
  }
  return parts.join('\n');
}
