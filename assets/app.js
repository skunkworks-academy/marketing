const catalogue = [
  {title:'Marketing Fundamentals',slug:'marketing-fundamentals',type:'course',level:'Foundation',duration:'6 hours',icon:'fa-compass',description:'Build a working understanding of markets, customer value, positioning, segmentation and the marketing mix.'},
  {title:'Digital Marketing Strategy',slug:'digital-marketing-strategy',type:'path',level:'Intermediate',duration:'4 weeks',icon:'fa-chess',description:'Translate business objectives into integrated channel, content, campaign and measurement plans.'},
  {title:'Content Marketing & Editorial Planning',slug:'content-marketing-editorial-planning',type:'course',level:'Intermediate',duration:'8 hours',icon:'fa-pen-nib',description:'Design content pillars, editorial calendars, audience journeys and reusable campaign assets.'},
  {title:'SEO Foundations',slug:'seo-foundations',type:'course',level:'Foundation',duration:'7 hours',icon:'fa-magnifying-glass-chart',description:'Use search intent, keyword research, on-page optimisation and technical checks to improve discovery.'},
  {title:'Social Media Campaign Operations',slug:'social-media-campaign-operations',type:'course',level:'Intermediate',duration:'10 hours',icon:'fa-hashtag',description:'Plan, publish, govern and optimise social campaigns across organic and paid channels.'},
  {title:'Email Marketing & Lifecycle Automation',slug:'email-marketing-lifecycle-automation',type:'course',level:'Intermediate',duration:'8 hours',icon:'fa-envelope-open-text',description:'Build permission-based lifecycle journeys, segmentation, nurture sequences and performance reporting.'},
  {title:'Marketing Analytics Workbook',slug:'marketing-analytics-workbook',type:'material',level:'Practical',duration:'Workbook',icon:'fa-table',description:'A guided workbook for campaign KPIs, conversion rates, attribution assumptions and reporting cadence.'},
  {title:'Campaign Planning Toolkit',slug:'campaign-planning-toolkit',type:'material',level:'Practical',duration:'Templates',icon:'fa-toolbox',description:'Reusable briefs, audience profiles, channel plans, content calendars and post-campaign reviews.'},
  {title:'AI for Marketing Productivity',slug:'ai-for-marketing-productivity',type:'path',level:'Intermediate',duration:'3 weeks',icon:'fa-wand-magic-sparkles',description:'Apply generative AI to research, ideation, content operations, personalisation and workflow automation.'},
  {title:'Landing Pages & Conversion Optimisation',slug:'landing-pages-conversion-optimisation',type:'course',level:'Advanced',duration:'9 hours',icon:'fa-window-maximize',description:'Improve offer clarity, page structure, calls to action, experimentation and measurable conversion.'},
  {title:'Marketing Campaign Practitioner',slug:'marketing-campaign-practitioner',type:'badge',level:'Applied',duration:'Evidence based',icon:'fa-certificate',description:'Earn a Skunkworks Academy badge by submitting a campaign brief, assets, measurements and retrospective.'},
  {title:'AI-Enabled Marketing Operations',slug:'ai-enabled-marketing-operations',type:'badge',level:'Advanced',duration:'Evidence based',icon:'fa-robot',description:'Demonstrate responsible AI usage, automation design, governance and measurable marketing outcomes.'}
];

const grid = document.getElementById('catalogueGrid');
const count = document.getElementById('catalogueCount');
const empty = document.getElementById('emptyState');
const search = document.getElementById('catalogueSearch');
const filters = [...document.querySelectorAll('[data-filter]')];
let activeFilter = 'all';

const typeLabels = {course:'Course',path:'Learning path',material:'Material',badge:'Badge pathway'};
const registrationBaseUrl = 'https://portal.skunkworksacademy.com/register/';

function registrationUrl(slug){
  return `${registrationBaseUrl}?course=${encodeURIComponent(slug)}`;
}

function render(){
  const query = search.value.trim().toLowerCase();
  const visible = catalogue.filter(item => {
    const matchesFilter = activeFilter === 'all' || item.type === activeFilter;
    const haystack = `${item.title} ${item.type} ${item.level} ${item.duration} ${item.description}`.toLowerCase();
    return matchesFilter && haystack.includes(query);
  });

  count.textContent = `${visible.length} item${visible.length === 1 ? '' : 's'}`;
  empty.hidden = visible.length !== 0;
  grid.innerHTML = visible.map(item => `
    <article class="catalogue-card">
      <div class="catalogue-card__top">
        <span class="catalogue-card__icon"><i class="fa-solid ${item.icon}"></i></span>
        <span class="catalogue-card__type">${typeLabels[item.type]}</span>
      </div>
      <h3>${item.title}</h3>
      <p>${item.description}</p>
      <div class="catalogue-card__meta"><span>${item.level}</span><span>${item.duration}</span></div>
      <div class="catalogue-card__footer">
        <a class="catalogue-card__lock" href="content/${item.slug}/"><i class="fa-solid fa-circle-info"></i>View overview</a>
        <a class="access-button" href="${registrationUrl(item.slug)}"><i class="fa-solid fa-user-plus"></i>Register</a>
      </div>
    </article>`).join('');
}

filters.forEach(button => button.addEventListener('click', () => {
  activeFilter = button.dataset.filter;
  filters.forEach(item => item.classList.toggle('active', item === button));
  render();
}));
search.addEventListener('input', render);

const navToggle = document.querySelector('.nav-toggle');
const nav = document.getElementById('globalNav');
navToggle.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', String(open));
});
nav.addEventListener('click', event => {
  if(event.target.closest('a')){nav.classList.remove('open');navToggle.setAttribute('aria-expanded','false')}
});

render();
