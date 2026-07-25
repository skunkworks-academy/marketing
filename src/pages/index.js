import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import styles from './index.module.css';

const outcomes=[
  ['Analyse a market','Explain customer needs, demand, competition and value creation.'],
  ['Select a target segment','Use evidence to segment a market and justify a priority audience.'],
  ['Position an offer','Create a defensible positioning statement and message framework.'],
  ['Design a marketing mix','Align product, price, place and promotion decisions.'],
  ['Measure performance','Set SMART objectives, KPIs and an ethical measurement plan.'],
  ['Prove competence','Submit authentic portfolio evidence assessed against a rubric.']
];

export default function Home(){return <Layout title="Marketing Fundamentals" description="Complete self-paced Marketing Fundamentals course">
<header className={styles.hero}><div className="container"><p className={styles.eyebrow}>Foundation · Self-paced · Portfolio assessed</p><h1>Marketing Fundamentals</h1><p className={styles.lead}>Develop practical marketing competence through structured theory, applied activities, a final integrated assessment and a verified Portfolio of Evidence.</p><div className={styles.actions}><Link className="button button--primary button--lg" to="/learn/course-orientation">Start the course</Link><Link className="button button--secondary button--lg" to="/learn/assessment/assessment-overview">View assessment</Link></div><div className={styles.meta}><span>Estimated effort: 18–24 hours</span><span>6 modules</span><span>70% pass requirement</span><span>Portfolio evidence required</span></div></div></header>
<main><section className={styles.section}><div className="container"><p className={styles.eyebrow}>Competence outcomes</p><h2>What successful learners can demonstrate</h2><div className={styles.grid}>{outcomes.map(([title,text])=><article className={styles.card} key={title}><h3>{title}</h3><p>{text}</p></article>)}</div></div></section>
<section className={styles.band}><div className="container"><div className={styles.twoCol}><div><p className={styles.eyebrow}>Learning model</p><h2>Learn, apply, assess and evidence</h2><p>Each module combines theory with an applied workplace-style task. Those tasks become portfolio artefacts. The final assessment integrates the same evidence into a coherent marketing plan.</p></div><ol className={styles.steps}><li><strong>Study</strong><span>Read concise lessons and examples.</span></li><li><strong>Practise</strong><span>Complete guided marketing activities.</span></li><li><strong>Check</strong><span>Use formative knowledge checks.</span></li><li><strong>Submit</strong><span>Provide authentic portfolio evidence.</span></li></ol></div></div></section>
<section className={styles.section}><div className="container"><p className={styles.eyebrow}>Credential pathway</p><h2>Course completion and accreditation</h2><p>This is a Skunkworks Academy competency-based short course. A certificate or digital credential is issued only after the knowledge assessment, integrated practical assessment and Portfolio of Evidence have been successfully verified. The course does not claim external statutory or professional-body accreditation unless a formal approval record is published on the accreditation page.</p><Link className="button button--outline button--lg" to="/learn/accreditation/course-accreditation">Read the accreditation statement</Link></div></section></main>
</Layout>}
