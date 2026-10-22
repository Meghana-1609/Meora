// What the help chat knows about Meora. Plain answers, short steps.
// q = the question, k = extra words people may type (any language), a = the answer.
export type Faq = { q: string; a: string; k: string };
export const FAQ: Faq[] = [
  // ── About the app ──
  { q: "What is Meora?", k: "what is this app meora about use purpose why explain ఏమిటి ఈ యాప్ ఎందుకు क्या है ऐप", a: "Meora is your family’s brain: one safe place where your family keeps the little things that matter, like medicines, important numbers, where things are kept, dates and family stories. You save by speaking, and anyone in the family can ask later and get the answer." },
  { q: "Who can use Meora?", k: "who for elders grandparents old people kids everyone family members ఎవరు పెద్దవాళ్లు कौन बुज़ुर्ग", a: "Anyone in your family, including grandparents. You don’t need a password or email. Just speak or tap big buttons." },
  { q: "Does it cost money?", k: "free cost price money pay paid ads subscription charge ఉచితం డబ్బు पैसे मुफ़्त", a: "No. Meora is free, with no ads." },
  { q: "Do I need an account, email or password?", k: "account email password sign up login register ఖాతా ఈమెయిల్ పాస్వర్డ్ लॉगिन खाता", a: "No. There is no account, email or password. Your phone is your key. You open Meora with your fingerprint, face, or 3 pictures." },
  { q: "Which languages does Meora support?", k: "languages language telugu hindi tamil english spanish french arabic chinese support భాషలు भाषाएँ", a: "The app’s screens come in English, Telugu, Hindi, Tamil, Spanish, French, Arabic and Chinese. You can speak and save in many more languages, and even mix Telugu and English." },
  { q: "How do I put Meora on my home screen?", k: "install home screen icon app download add shortcut play store ఇన్‌స్టాల్ డౌన్‌లోడ్ होम स्क्रीन डाउनलोड", a: "Open Meora in Chrome, tap ⋮ (top right) → Add to Home screen → Install. On iPhone, open it in Safari, tap Share → Add to Home Screen. It then opens like a normal app." },
  { q: "Does Meora work without internet?", k: "offline internet no network wifi data without ఇంటర్నెట్ లేకుండా ऑफ़लाइन इंटरनेट", a: "Yes. You can read and save notes without internet. New notes are sent to your family automatically when you’re back online. Photos and voice clips need internet to save." },

  // ── Joining & family ──
  { q: "Where are the 3 family pictures?", k: "3 three pictures picture icons icon emoji family code where see find show చిత్రాలు బొమ్మలు కోడ్ तस्वीरें कोड", a: "Open the Family tab at the bottom → tap “Invite a family member”. Your family’s 3 pictures and the QR code appear there." },
  { q: "How do I add a family member?", k: "add invite member amma nanna family person someone new people చేర్చు ఆహ్వానించు కుటుంబం जोड़ें परिवार बुलाएँ", a: "Tap Family → Invite a family member. Show them the 3 pictures (or the QR code). On their phone they open Meora, tap “Join my family” and tap the same 3 pictures. Then you tap Allow." },
  { q: "How do I join my family?", k: "join my family joining new phone enter code pictures జాయిన్ చేరడం जुड़ें", a: "Open Meora → tap “Join my family” → type your name → tap the 3 pictures your family shows you (or scan their QR code). Then wait for someone in your family to tap Allow." },
  { q: "How do I scan the QR code?", k: "qr scan camera code scanner క్యూఆర్ స్కాన్ कैमरा स्कैन", a: "Open your phone’s camera and point it at the QR code on your family member’s phone (Family → Invite a family member). Tap the link that appears. Meora opens and you can join." },
  { q: "I want to join, but nobody is allowing me.", k: "waiting allow nobody answer stuck pending join request ఎదురు చూస్తున్నా ఎవరూ इंतज़ार कोई नहीं", a: "Call someone in your family and say: “Open Meora and tap Allow.” They will see “(your name) wants to join” on their Home or Family page." },
  { q: "How do I allow someone who wants to join?", k: "allow approve accept request wants to join అనుమతించు ఒప్పుకో अनुमति स्वीकार", a: "You’ll see “(name) wants to join” on Home and on the Family page. Tap Allow only if you know them. Tap Don’t allow if you don’t." },
  { q: "Who can approve new people?", k: "approve can approve admin permission rights owner అనుమతి ఎవరు मंज़ूरी कौन", a: "People marked “Can approve” on the Family page. The person who started the family can approve, and can give this to others: Family → tap a person → Can approve." },
  { q: "How do I remove someone from the family?", k: "remove member kick delete person tolaginchu తొలగించు హటాయించు हटाएँ निकालें", a: "Family → tap the person → Remove. Their phone stops getting family notes." },
  { q: "How do I change my name?", k: "change name rename my name wrong name spelling పేరు మార్చు नाम बदलें", a: "Family → Settings → Change my name." },
  { q: "Can I be in more than one family?", k: "another family two families second family switch in-laws రెండు కుటుంబాలు दूसरा परिवार", a: "Yes. Family → Start or join another family. You can switch between your families on the Family page." },
  { q: "How do I leave a family?", k: "leave family exit quit వదిలేయి బయటకు छोड़ें", a: "Family → Leave this family. The family’s notes are removed from your phone. The others keep theirs." },

  // ── Saving ──
  { q: "How do I save something?", k: "save add note remember write speak record new సేవ్ రాయి గుర్తు సేవ్ చేయాలి सेव लिखें याद", a: "Tap the round Save button in the middle of the bottom bar and just speak. Check the words, then tap Save. You can also type, add a photo, or record a voice clip." },
  { q: "Can I type instead of speaking?", k: "type typing keyboard write instead టైప్ రాయి टाइप लिखें", a: "Yes. On the Save page, tap Type and write your note." },
  { q: "Can I save a photo?", k: "photo picture image camera document scan ఫోటో చిత్రం फ़ोटो तस्वीर", a: "Yes. On the Save page, tap Photo to take a picture or pick one, for example a prescription or a warranty card. Photos need internet to save." },
  { q: "Can I record a voice clip?", k: "voice clip record audio grandmother story song వాయిస్ రికార్డ్ ఆడియో आवाज़ रिकॉर्ड", a: "Yes. On the Save page, tap Voice to record, up to 2 minutes. It’s great for a grandparent telling a recipe or a story." },
  { q: "What should I save?", k: "what to save ideas examples suggestions start ఏమి సేవ్ ఉదాహరణ क्या सेव", a: "Things your family often asks about: medicines and timings, doctors’ and helpers’ numbers, where documents and keys are kept, birthdays, bill and renewal dates, recipes and family stories. Start with 3 things." },
  { q: "What are topics?", k: "topic topics category folder health contacts where dates recipes bills money kids vehicles stories విభాగాలు टॉपिक श्रेणी", a: "Meora sorts every note into a topic automatically: Medicines & Health, Contacts, Where things are, Important dates, Recipes, Home & Bills, Money, Kids & School, Vehicles, Family stories or Other. You can change it on the Check page." },
  { q: "The topic is wrong. How do I change it?", k: "wrong topic change category move మార్చు విభాగం टॉपिक बदलें", a: "When saving, tap Change next to the topic. For an old note, open it → Edit → Change." },
  { q: "What is “About” when saving?", k: "about person who tag name for whom గురించి किसके बारे", a: "“About” is who the note is for, like Amma or Nanna. It helps Meora find the right answer when you ask “What is Amma’s tablet?”" },
  { q: "Why was my note not saved?", k: "not saved blocked secret pin password otp card aadhaar cvv account number సేవ్ కాలేదు పిన్ పాస్‌వర్డ్ पिन पासवर्ड", a: "To keep you safe, Meora never saves PINs, passwords, OTPs, card, bank account or ID numbers. Save where it is kept instead, like “The ATM card is in Dad’s wallet.”" },
  { q: "How do I undo a save?", k: "undo mistake wrong saved by mistake వెనక్కి తప్పు पूर्ववत गलती", a: "Right after saving, tap Undo. Later, open the note and tap Delete." },
  { q: "How do I edit a note?", k: "edit change update correct note wrong మార్చు సరి చేయి बदलें ठीक करें", a: "Open the note → Edit. Make your change and tap Save. The note keeps a history of what it said before." },
  { q: "How do I delete a note?", k: "delete remove note erase తొలగించు డిలీట్ हटाएँ डिलीट", a: "Open the note → Delete. It is deleted for everyone in the family." },
  { q: "How do I hide a note from someone?", k: "hide private secret only some surprise gift who can see దాచు రహస్యం छिपाएँ", a: "When saving, under “Who can see”, choose “Only some” and pick the people. Only they can open that note." },

  // ── Asking ──
  { q: "How do I ask a question?", k: "ask how to ask question find search answer అడుగు ప్రశ్న వెతుకు पूछें सवाल खोज", a: "Tap Ask in the bottom bar (or the “Ask anything” bar on Home) and speak or type your question, like “Where are the car papers?”. Meora answers from your family’s notes and shows who saved it." },
  { q: "Meora said nobody saved it. What now?", k: "not found nobody saved no answer ask my family దొరకలేదు ఎవరూ సేవ్ नहीं मिला", a: "Tap “Ask my family”. Everyone gets your question, and when someone answers, it’s saved for next time." },
  { q: "Where do I see questions my family asked?", k: "family asked questions answer waiting అడిగిన ప్రశ్నలు पूछे सवाल", a: "They appear on Home under “Family asked”, and in More → Family asked. Tap Answer and speak the answer." },
  { q: "Can Meora read answers out loud?", k: "read aloud listen speak voice hear sound వినండి చదివి सुनें पढ़कर", a: "Yes. Tap Listen on any answer or note. To hear every answer automatically, turn on More → Settings → Read answers aloud." },
  { q: "Can I translate a note?", k: "translate translation other language meaning అనువాదం अनुवाद", a: "Yes. Open the note or answer and tap Translate. It changes to the language you speak in." },
  { q: "Can I call a number from a note?", k: "call phone number dial tap call ఫోన్ చేయి कॉल", a: "Yes. When a note or answer has a phone number, a green Call button appears. Tap it to call." },
  { q: "Can I speak Telugu when the app is in English?", k: "telugu english mixed mix speak other language understand telugulo matladochha matladavachha matladacha తెలుగు ఇంగ్లీష్ కలిపి मिलाकर", a: "Yes. With Smart voice on, speak Telugu, English or both mixed. Meora writes your exact words and also an English version, and finds the note in either language." },

  // ── Reminders & dates ──
  { q: "How do reminders work?", k: "reminder remind alarm medicine time notification రిమైండర్ అలారం గుర్తు रिमाइंडर अलार्म", a: "When saving, choose Remind → Yes, pick how often (once, every day, week, month or year) and the time. Meora shows it on Home under “Today & coming up”." },
  { q: "Will my phone ring for a reminder?", k: "ring alarm sound notification calendar phone alert మోగుతుందా అలారం घंटी अलार्म", a: "For a real phone alarm, open the note and tap “Add to my phone’s calendar” (or tap the bell on Important dates). Your phone’s calendar will then ring." },
  { q: "Where do I see birthdays and dates?", k: "dates birthday anniversary upcoming calendar coming up పుట్టినరోజు తేదీలు जन्मदिन तारीख", a: "On Home under “Today & coming up”, and in More → Dates & reminders." },

  // ── Emergency ──
  { q: "What is the emergency info?", k: "emergency card blood group allergy doctor hospital call 108 911 అత్యవసరం బ్లడ్ आपातकाल", a: "More → Emergency info. Fill in each person’s blood group, allergies, medicines and doctor once. In a hurry anyone in the family can open it and call in one tap." },
  { q: "Can I print the emergency card?", k: "print paper fridge emergency card ప్రింట్ प्रिंट", a: "Yes. More → Emergency info → pick the person → Print. Keep it on the fridge or in a wallet." },
  { q: "Which emergency number does it call?", k: "emergency number 108 112 911 999 ambulance call change నంబర్ अंबुलेंस नंबर", a: "It uses your country’s number automatically. To change it: More → Settings → Emergency number." },

  // ── Privacy & safety ──
  { q: "Is my data safe?", k: "safe private privacy secure encrypt hack read server data సురక్షితం రహస్యం सुरक्षित निजी", a: "Yes. Notes are locked (encrypted) on your phone before they leave it. Only phones your family allowed can open them. Not even the Meora server can read them." },
  { q: "Can strangers join my family?", k: "stranger join hack someone else unknown అపరిచితులు अजनबी", a: "No. Even with the 3 pictures, a new person can’t get in until someone in your family taps Allow. Only allow people you know." },
  { q: "Does Meora use AI or Google?", k: "ai gemini google smart send data artificial ఏఐ గూగుల్ एआई गूगल", a: "Smart voice uses Google Gemini to understand speech in any language and to read answers in a natural voice. Your recording or question is sent to it only for that. Turn it off in More → Settings, and everything stays on your phone." },
  { q: "How do I turn Smart voice off?", k: "smart voice off disable ai turn off privacy ఆపు बंद", a: "More → Settings → Voice & AI → turn off Smart voice. Meora then uses your phone’s own voice and keeps everything on your phone." },

  // ── Lock & recovery ──
  { q: "How do I open the app with my fingerprint?", k: "fingerprint face lock unlock open వేలిముద్ర ముఖం फ़िंगरप्रिंट चेहरा", a: "More → Settings → Lock → Fingerprint. If your phone has no fingerprint, choose Pictures to open with your own 3 pictures." },
  { q: "My fingerprint is not working.", k: "fingerprint not working failed face unlock problem పని చేయడం లేదు काम नहीं", a: "Your phone’s screen lock (PIN or pattern) also works. Or switch to 3 pictures: More → Settings → Lock → Pictures." },
  { q: "How do I lock the app right now?", k: "lock now close hide quickly లాక్ ताला", a: "More → Settings → Lock now." },
  { q: "I lost my phone. What now?", k: "lost phone stolen broken new phone పోయింది దొంగిలించారు खो गया चोरी", a: "Ask someone in your family to open Family → tap your name → Remove. On your new phone, tap Join my family and ask them to Allow you again. All notes come back." },
  { q: "All our phones are lost. Can we get notes back?", k: "recovery pictures all phones lost restore backup 12 రికవరీ अंतिम बैकअप", a: "Yes, with your 12 recovery pictures. On a new phone tap “Lost every phone? Use recovery pictures” and tap the 12 pictures in order." },
  { q: "Where are my recovery pictures?", k: "recovery pictures see where 12 backup forgot రికవరీ చిత్రాలు रिकवरी तस्वीरें", a: "More → Settings → Recovery pictures → See your 12 pictures. Write the words on paper and keep it safe. Don’t share them." },

  // ── Settings & screens ──
  { q: "How do I change the language?", k: "language change telugu hindi english భాష మార్చు भाषा बदलें", a: "Tap the globe button at the top of Home, or More → Settings → Language." },
  { q: "How do I make the text bigger?", k: "text size big bigger small font read eyes అక్షరాలు పెద్దవి बड़ा अक्षर", a: "More → Settings → Text size, and pick the bigger A." },
  { q: "What is Simple mode?", k: "simple mode easy elders grandparents fewer buttons సులభం आसान", a: "Simple mode shows only Save, Ask and Family, which is great for grandparents. Turn it on in More → Settings → Simple mode." },
  { q: "How do I turn on dark mode?", k: "dark mode night black theme screen డార్క్ डार्क", a: "More → Settings → Dark screen." },
  { q: "How do I make the voice slower?", k: "voice speed slow fast talking speed నెమ్మదిగా धीरे", a: "More → Settings → Voice speed → Slow." },
  { q: "Where do I see what others saved?", k: "whats new new notes others saved recent updates కొత్తవి नया", a: "More → What’s new shows notes your family saved recently." },
  { q: "Where are all my notes?", k: "all notes list see everything topics browse అన్నీ नोट्स सब", a: "On Home tap a topic, or More → All topics to see every topic and its notes." },
  { q: "How do I remove Meora from my phone?", k: "delete app uninstall remove meora phone clear తీసేయి अनइंस्टॉल", a: "More → Settings → Remove Meora from this phone. Your family keeps their notes." },
  { q: "How do I see the app tour again?", k: "tour tutorial guide how to use show me how help start పరిచయం टूर", a: "More → Show me how." },

  // ── Problems ──
  { q: "Why does the voice not understand me?", k: "voice not understand mic microphone speak wrong words not working వాయిస్ అర్థం మైక్ आवाज़ माइक", a: "Allow the microphone when asked, speak close to the phone, and pause when you finish. With Smart voice on (More → Settings), Meora understands any language, even Telugu and English mixed. You can always tap Type instead." },
  { q: "The microphone is blocked.", k: "microphone blocked permission denied allow mic మైక్ అనుమతి माइक अनुमति", a: "Tap the lock icon next to the web address → Permissions → Microphone → Allow. Then reload Meora." },
  { q: "My family can’t see my note.", k: "family can't see note not showing sync not updated కనిపించడం లేదు नहीं दिख रहा", a: "Check your internet. Notes are sent when you’re online. Also check “Who can see” on the note: “Only some” notes are only for the people you picked." },
  { q: "The app is slow or not loading.", k: "slow loading stuck blank error not working problem bug నెమ్మదిగా పని చేయట్లేదు धीमा काम नहीं", a: "Check your internet, then close Meora and open it again. If it still doesn’t work, tell the person who shared Meora with you." },
];
