const scenarios: Record<string, string[]> = {
  en: [
    "A missed train turns a weekend trip into a tiny adventure. Compare two routes and ticket prices, change the meeting time, and decide who will book the replacement tickets.",
    "A neighborhood café is planning a board-game night. Compare snack budgets, fix a double-booked table, and agree on a new start time and booking deadline.",
    "The office plant has mysteriously vanished before an important visit. Compare clues, revise the welcome plan, and agree who will find a replacement before the deadline.",
    "A group is opening a very small pop-up bookstore. Compare rent and transport costs, solve a late delivery, and decide the opening schedule and each task.",
    "A picnic forecast suddenly predicts rain. Compare indoor alternatives and entry prices, change the food order, and settle on a meeting place and final time.",
    "A community talent show has one microphone and too many ideas. Compare equipment costs, rearrange the running order, and assign setup jobs before the rehearsal.",
    "A museum visit includes a surprisingly strict bag policy. Compare ticket options and transport times, change the lunch plan, and agree what everyone should bring.",
    "A cooking workshop has accidentally ordered twice as many lemons. Compare recipe alternatives and supply costs, adjust the class schedule, and make a practical plan for the leftovers.",
  ],
  hi: [
    "ट्रेन छूटने के बाद सप्ताहांत की यात्रा की नई योजना बनाइए। दो रास्तों और टिकट की कीमतों की तुलना करें, मिलने का समय बदलें और नई बुकिंग की जिम्मेदारी तय करें।",
    "पड़ोस के कैफ़े में खेलों की शाम आयोजित की जा रही है। नाश्ते का बजट तय करें, मेज़ की दोहरी बुकिंग सुलझाएँ और नया समय तथा अंतिम तिथि तय करें।",
    "एक महत्वपूर्ण बैठक से पहले दफ़्तर का पौधा गायब हो गया है। सुरागों की तुलना करें, स्वागत की योजना बदलें और समय पर नया पौधा लाने की जिम्मेदारी तय करें।",
    "एक छोटी अस्थायी किताबों की दुकान खोलने की योजना बनाइए। किराए और परिवहन की लागत की तुलना करें, देर से आने वाली खेप का हल निकालें और काम बाँटें।",
    "पिकनिक के दिन बारिश का अनुमान है। छत वाली जगहों और प्रवेश शुल्क की तुलना करें, खाने का ऑर्डर बदलें और मिलने का समय तथा स्थान तय करें।",
    "सामुदायिक प्रतिभा कार्यक्रम में केवल एक माइक्रोफ़ोन है। उपकरण की लागत की तुलना करें, कार्यक्रम का क्रम बदलें और अभ्यास से पहले तैयारी के काम बाँटें।",
    "संग्रहालय में बड़े बैग ले जाने पर रोक है। टिकट और यात्रा के विकल्पों की तुलना करें, दोपहर के भोजन की योजना बदलें और जरूरी सामान तय करें।",
    "खाना बनाने की कार्यशाला में गलती से दुगने नींबू मँगाए गए हैं। व्यंजनों और खर्च की तुलना करें, कक्षा का समय बदलें और बचे नींबुओं के उपयोग की योजना बनाएँ।",
  ],
  te: [
    "రైలు తప్పిపోవడంతో వారాంతపు ప్రయాణానికి కొత్త ప్రణాళిక వేయండి. రెండు మార్గాలు, టికెట్ ధరలు పోల్చి, కలిసే సమయాన్ని మార్చి, కొత్త టికెట్లు ఎవరు బుక్ చేయాలో నిర్ణయించండి.",
    "పక్క వీధిలోని కేఫ్‌లో ఆటల సాయంత్రం నిర్వహించండి. తినుబండారాల బడ్జెట్ పోల్చి, ఒకే టేబుల్‌కు రెండు బుకింగ్‌ల సమస్య పరిష్కరించి, కొత్త సమయం, చివరి తేదీ నిర్ణయించండి.",
    "ముఖ్యమైన సమావేశానికి ముందు ఆఫీసులోని మొక్క కనిపించడం లేదు. ఆధారాలు పోల్చి, స్వాగత ఏర్పాట్లు మార్చి, సమయానికి మరో మొక్క ఎవరు తీసుకురావాలో నిర్ణయించండి.",
    "చిన్న తాత్కాలిక పుస్తకాల దుకాణాన్ని ప్రారంభించండి. అద్దె, రవాణా ఖర్చులు పోల్చి, ఆలస్యమైన సరుకు సమస్య పరిష్కరించి, ప్రారంభ సమయం, పనుల బాధ్యతలు నిర్ణయించండి.",
    "వనభోజనం రోజున వర్షం వచ్చే అవకాశం ఉంది. పైకప్పు ఉన్న ప్రత్యామ్నాయ ప్రదేశాలు, ప్రవేశ ధరలు పోల్చి, భోజనం ఆర్డర్ మార్చి, కలిసే ప్రదేశం, సమయం నిర్ణయించండి.",
    "కాలనీ ప్రతిభా ప్రదర్శనకు ఒకే మైక్ ఉంది. పరికరాల ఖర్చు పోల్చి, కార్యక్రమాల క్రమం మార్చి, సాధనకు ముందు ఏర్పాట్ల పనులు పంచుకోండి.",
    "మ్యూజియంలో పెద్ద సంచులకు అనుమతి లేదు. టికెట్ ఎంపికలు, ప్రయాణ సమయాలు పోల్చి, మధ్యాహ్న భోజన ప్రణాళిక మార్చి, తీసుకురావాల్సిన వస్తువులు నిర్ణయించండి.",
    "వంటల శిక్షణకు పొరపాటున రెట్టింపు నిమ్మకాయలు వచ్చాయి. వంటకాలు, ఖర్చులు పోల్చి, తరగతి సమయం మార్చి, మిగిలిన నిమ్మకాయల ఉపయోగానికి ప్రణాళిక వేయండి.",
  ],
};
export function randomConversationPrompt(
  lang: string,
  speakers: number,
  previousIndex = -1,
  random = Math.random,
) {
  const choices = scenarios[lang] || scenarios.en;
  const available = choices.map((_, i) => i).filter((i) => i !== previousIndex);
  const index =
    available[
      Math.min(
        available.length - 1,
        Math.max(0, Math.floor(random() * available.length)),
      )
    ];
  const intro =
    lang === "te"
      ? `${speakers} మంది పేర్లు ఉన్న పాత్రల మధ్య సహజమైన సంభాషణ రూపొందించండి. `
      : lang === "hi"
        ? `${speakers} नाम वाले पात्रों के बीच स्वाभाविक बातचीत बनाइए। `
        : `Create a natural conversation between ${speakers} named characters. `;
  return { index, text: intro + choices[index] };
}
