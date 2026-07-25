const lightLogo='https://raw.githubusercontent.com/skunkworks-academy/www/refs/heads/main/images/favicon-black.png';
const darkLogo='https://raw.githubusercontent.com/skunkworks-academy/www/refs/heads/main/images/favicon-white.png';

/** @type {import('@docusaurus/types').Config} */
const config={
  title:'Marketing Fundamentals',
  tagline:'Self-paced theory, practical work, assessment and portfolio evidence',
  favicon:lightLogo,
  url:'https://marketing.skunkworksacademy.com',
  baseUrl:'/courses/marketing-fundamentals/',
  organizationName:'skunkworks-academy',
  projectName:'marketing',
  trailingSlash:true,
  onBrokenLinks:'throw',
  onBrokenMarkdownLinks:'warn',
  i18n:{defaultLocale:'en',locales:['en']},
  presets:[['classic',{
    docs:{routeBasePath:'learn',sidebarPath:require.resolve('./sidebars.js'),showLastUpdateTime:true,showLastUpdateAuthor:true},
    blog:false,
    theme:{customCss:require.resolve('./src/css/custom.css')}
  }]],
  themeConfig:{
    metadata:[{name:'description',content:'Complete self-paced Marketing Fundamentals course with theory, practical assignments, assessment and portfolio of evidence.'}],
    navbar:{
      title:'Skunkworks Academy',
      logo:{alt:'Skunkworks Academy',src:lightLogo,srcDark:darkLogo},
      items:[
        {to:'/',label:'Course Home',position:'left'},
        {to:'/learn/course-orientation',label:'Start Learning',position:'left'},
        {to:'/learn/assessment/assessment-overview',label:'Assessment',position:'left'},
        {to:'/learn/portfolio/portfolio-overview',label:'Portfolio',position:'left'},
        {href:'https://marketing.skunkworksacademy.com/',label:'Marketing Hub',position:'right'},
        {href:'https://portal.skunkworksacademy.com/login/',label:'Sign in',position:'right'}
      ]
    },
    footer:{style:'dark',links:[{title:'Course',items:[{label:'Learning pathway',to:'/learn/course-orientation'},{label:'Assessment',to:'/learn/assessment/assessment-overview'},{label:'Portfolio evidence',to:'/learn/portfolio/portfolio-overview'}]},{title:'Academy',items:[{label:'Marketing Hub',href:'https://marketing.skunkworksacademy.com/'},{label:'Learner Portal',href:'https://portal.skunkworksacademy.com/'},{label:'Catalogue',href:'https://skunkworksacademy.com/catalogue/'}]}],copyright:`© ${new Date().getFullYear()} Skunkworks Academy. Dream. Design. Deliver.`},
    colorMode:{defaultMode:'dark',disableSwitch:false,respectPrefersColorScheme:true},
    prism:{additionalLanguages:['json','bash']}
  }
};
module.exports=config;
