const menu = document.getElementById('menu');
const action = document.getElementById('action');

if (menu && action) {
  menu.addEventListener('click', () => {
    const isOpen = action.classList.toggle('is-active');
    menu.classList.toggle('is-active', isOpen);
    menu.setAttribute('aria-expanded', String(isOpen));
  });

  action.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      action.classList.remove('is-active');
      menu.classList.remove('is-active');
      menu.setAttribute('aria-expanded', 'false');
    });
  });
}

const translations = {
  'Selected work': 'أعمال مختارة',
  'Services': 'الخدمات',
  'About': 'من أنا',
  "Let's talk": 'لنتحدث',
  'AVAILABLE FOR SELECT PROJECTS': 'متاح لمشاريع مختارة',
  'WEB DEVELOPER': 'مطور ويب',
  'DIGITAL BUILDER': 'صانع تجارب رقمية',
  'I build digital': 'أبني تجارب رقمية',
  'experiences with': 'ذات هدف واضح',
  'purpose.': 'ومعنى.',
  'I help businesses turn ideas into clear, modern websites designed to earn trust, showcase their value, and make it easier for customers to take action.': 'أساعد الأنشطة التجارية على تحويل أفكارها إلى مواقع حديثة وواضحة، تعزز الثقة وتُبرز قيمة النشاط وتسهّل على العملاء اتخاذ القرار.',
  'Explore my work': 'اكتشف أعمالي',
  'Start a project': 'ابدأ مشروعًا',
  'Thoughtful design. Useful technology. Business-first thinking.': 'تصميم مدروس. تقنية مفيدة. وتركيز على أهداف العمل.',
  'IDEAS → DIGITAL': 'من الفكرة إلى الرقمي',
  'Clean build': 'برمجة منظّمة',
  'Designed to scale': 'قابل للتطوير',
  'Intentional design': 'تصميم هادف',
  'Made for people': 'مصمم للناس',
  'INDEPENDENT DEVELOPER': 'مطور مستقل',
  'SCROLL TO EXPLORE': 'مرّر لاستكشاف الموقع',
  '01 / SELECTED WORK': '01 / أعمال مختارة',
  'Built with': 'صُنعت',
  'intention.': 'بهدف.',
  'A growing collection of digital projects, experiments, and practical solutions.': 'مجموعة متنامية من المشاريع الرقمية والتجارب والحلول العملية.',
  'FRESH · FAST · MADE WITH CARE': 'طازج · سريع · مُعدّ بعناية',
  'MENU': 'القائمة',
  'ORDER NOW ↗': 'اطلب الآن ↗',
  '01 — RESTAURANT WEBSITE': '01 — موقع مطعم',
  'A restaurant website built to present the brand and make its menu and key information easy for customers to explore.': 'موقع لمطعم يعرّف بالعلامة التجارية ويتيح للعملاء استكشاف القائمة والمعلومات الأساسية بسهولة.',
  'Web development': 'تطوير ويب',
  'Restaurant': 'مطعم',
  'Live project': 'مشروع مباشر',
  'View live project': 'عرض الموقع المباشر',
  'Request something similar': 'اطلب موقعًا مشابهًا',
  'FRESH · FAST · FLAVORFUL': 'طازج · سريع · غني بالنكهة',
  'GOOD FOOD. GOOD MOOD.': 'طعام لذيذ. مزاج أفضل.',
  '02 — FOOD & HOSPITALITY': '02 — الطعام والضيافة',
  'A live food-business website designed to give the brand a clear, modern online presence.': 'موقع مباشر لنشاط في مجال الطعام، صُمم لمنح العلامة حضورًا رقميًا واضحًا وعصريًا.',
  'Web design': 'تصميم مواقع',
  'Responsive website': 'موقع متجاوب',
  'Made for': 'صُنع من أجل',
  'good taste.': 'ذوق رفيع.',
  'IN DEVELOPMENT': 'قيد التطوير',
  '03 — RESTAURANT WEBSITE · IN PROGRESS': '03 — موقع مطعم · قيد التنفيذ',
  'A restaurant website concept focused on atmosphere, menu discovery, and easy customer contact. Currently in development.': 'تصوّر لموقع مطعم يركّز على الأجواء واستكشاف قائمة الطعام وسهولة تواصل العملاء. المشروع قيد التطوير حاليًا.',
  'Responsive UI': 'واجهة متجاوبة',
  'In development': 'قيد التطوير',
  'Project previews are visual concepts for this first portfolio version. Live project links and final case-study details will be added after verification.': 'معاينات المشاريع هنا تصوّرات بصرية للنسخة الأولى من معرض الأعمال. أُضيفت روابط مباشرة لمشروعي Family Food وHot Box، بينما لا يزال Staifi Grill قيد التطوير.',
  '02 / WHAT I DO': '02 / خدماتي',
  'From idea to': 'من الفكرة إلى',
  'online.': 'الإنترنت.',
  'Focused digital services that help businesses present themselves clearly and professionally.': 'خدمات رقمية تساعد الأنشطة التجارية على تقديم نفسها بوضوح واحترافية.',
  'Business websites': 'مواقع الأنشطة التجارية',
  'Modern, responsive websites that explain your offer and make it easy for customers to reach you.': 'مواقع حديثة ومتجاوبة توضّح خدماتك وتسهّل على العملاء التواصل معك.',
  'Landing pages': 'صفحات الهبوط',
  'Focused pages for a product, campaign, or service, built around one clear action.': 'صفحات مخصصة لمنتج أو حملة أو خدمة، تتمحور حول إجراء واضح واحد.',
  'Website improvements': 'تحسين المواقع',
  'Practical updates to layout, usability, responsiveness, and the overall customer experience.': 'تحسينات عملية للتخطيط وسهولة الاستخدام والتوافق مع الأجهزة وتجربة العميل عمومًا.',
  '03 / A LITTLE ABOUT ME': '03 / نبذة عني',
  'Good work starts': 'العمل الجيد يبدأ',
  'with': 'بـ',
  'good questions.': 'الأسئلة الصحيحة.',
  "I'm Abdullah, a web and mobile development student building practical digital experiences. I care about the details behind a useful product: the people using it, the problem it solves, and how clearly it communicates.": 'أنا عبد الله، طالب تطوير ويب ومحمول أعمل على بناء تجارب رقمية عملية. أهتم بالتفاصيل التي تصنع منتجًا مفيدًا: من سيستخدمه، والمشكلة التي يحلها، ومدى وضوحه في إيصال فكرته.',
  'My approach is simple: understand the goal, build with intention, test the experience, and keep improving.': 'منهجي بسيط: أفهم الهدف، وأبني بعناية، وأختبر التجربة، ثم أواصل التحسين.',
  'Clear communication': 'تواصل واضح',
  'Responsive by design': 'متجاوب من البداية',
  'Focused on real needs': 'تركيز على الاحتياجات الفعلية',
  '04 / HAVE A PROJECT IN MIND?': '04 / هل لديك مشروع؟',
  "Let's make something": 'لنبنِ شيئًا',
  'worth clicking.': 'يستحق الاستكشاف.',
  "Tell me what you're building, what you need, or which project caught your eye. We'll take it from there.": 'أخبرني عمّا تريد بناءه، أو ما تحتاج إليه، أو المشروع الذي لفت انتباهك، وسنبدأ من هناك.',
  'Email me about a project': 'راسلني بشأن مشروع',
  'Message on WhatsApp': 'تواصل عبر واتساب',
  'Replies as soon as possible': 'أردّ في أقرب وقت ممكن',
  'Building useful things for the digital world.': 'أبني حلولًا مفيدة للعالم الرقمي.',
  'LONG-TERM PROJECT · IN DEVELOPMENT': 'مشروع طويل الأجل · قيد التخطيط والتطوير',
  'A planned fashion-commerce platform exploring realistic virtual clothing try-on, personalized shopping, and a dedicated AI system.': 'منصة مخططة لتجارة الأزياء تستكشف تجربة الملابس افتراضيًا بصورة واقعية، والتسوق الشخصي، وتطوير نظام ذكاء اصطناعي متخصص.',
  'Fashion technology': 'تقنيات الأزياء',
  'Computer vision': 'الرؤية الحاسوبية',
  'AI research': 'بحث الذكاء الاصطناعي',
  'Explore the project': 'اكتشف المشروع',
  'AI model research': 'بحث نموذج الذكاء الاصطناعي',
  '04 — AI FASHION TECHNOLOGY': '04 — تقنيات الأزياء والذكاء الاصطناعي',
  'This portfolio includes live projects and work in progress. The fashion and AI concept is a future project currently at the planning and research stage; it is not yet a finished product or a trained model.': 'يضم هذا المعرض مشروعات مباشرة وأخرى قيد التطوير. أما فكرة الأزياء والذكاء الاصطناعي فهي مشروع مستقبلي في مرحلة التخطيط والبحث، وليست منتجًا مكتملًا أو نموذجًا مدرّبًا حاليًا.' 
};

const languageButton = document.getElementById('language-toggle');
let currentLanguage = 'en';
const originalTextNodes = [];
const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
while (walker.nextNode()) {
  const node = walker.currentNode;
  const original = node.nodeValue.trim();
  if (original && translations[original]) {
    originalTextNodes.push({ node, original, leading: node.nodeValue.match(/^\s*/)[0], trailing: node.nodeValue.match(/\s*$/)[0] });
  }
}

function setLanguage(language) {
  currentLanguage = language;
  const isArabic = language === 'ar';
  document.documentElement.lang = isArabic ? 'ar' : 'en';
  document.documentElement.dir = isArabic ? 'rtl' : 'ltr';
  document.body.classList.toggle('lang-ar', isArabic);
  originalTextNodes.forEach(({ node, original, leading, trailing }) => {
    const value = isArabic ? translations[original] : original;
    node.nodeValue = `${leading}${value}${trailing}`;
  });
  if (languageButton) {
    languageButton.textContent = isArabic ? 'English' : 'العربية';
    languageButton.setAttribute('aria-label', isArabic ? 'Switch language to English' : 'Switch language to Arabic');
    languageButton.lang = isArabic ? 'en' : 'ar';
  }
  document.title = isArabic ? 'عبد الله قطيطوت — مطور ويب وبانٍ للحلول الرقمية' : 'Abdullah Ghettout — Developer & Digital Builder';
  const description = document.querySelector('meta[name="description"]');
  if (description) description.content = isArabic ? 'عبد الله، مطور ويب ومحمول، يصمم تجارب رقمية احترافية للأعمال.' : 'Abdullah Ghettout — web and mobile developer creating polished digital experiences for businesses.';
}

if (languageButton) {
  languageButton.addEventListener('click', () => setLanguage(currentLanguage === 'en' ? 'ar' : 'en'));
}

// Project buttons open an email draft with the selected project in the subject and message.
document.querySelectorAll('[data-project]').forEach((button) => {
  button.addEventListener('click', () => {
    const project = button.dataset.project;
    const subject = encodeURIComponent(`Project inquiry: a website similar to ${project}`);
    const body = encodeURIComponent(`Hello Abdullah,\n\nI'm interested in a website similar to: ${project}.\n\nMy business and requirements:\n`);
    window.location.href = `mailto:abdoughet@gmail.com?subject=${subject}&body=${body}`;
  });
});

const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();
